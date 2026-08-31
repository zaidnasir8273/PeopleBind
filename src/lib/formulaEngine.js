// A small hand-rolled recursive-descent tokenizer/parser/evaluator for
// calculated-metric formulas -- e.g. "expense_total / payroll_gross * 100".
// Ported from PetroBind's cdParseFormula/cdEvalFormula (js/dashboard-engine.js):
// no `eval`, matching that codebase's own security-conscious choice and
// this app's general avoidance of dynamic code execution.
//
// Grammar:
//   expr   := term (('+' | '-') term)*
//   term   := factor (('*' | '/') factor)*
//   factor := number | ident | '(' expr ')' | '-' factor
// `ident` tokens are metric keys (e.g. "expense_total"), resolved against
// DASHBOARD_METRICS by the caller (see evaluateCalculatedMetric in
// dashboardMetrics.js) -- this module knows nothing about metrics itself,
// just expression syntax.

function tokenize(formula) {
  const tokens = []
  let i = 0
  while (i < formula.length) {
    const c = formula[i]
    if (/\s/.test(c)) { i++; continue }
    if ('+-*/()'.includes(c)) { tokens.push({ type: c, value: c }); i++; continue }
    if (/[0-9.]/.test(c)) {
      let j = i
      while (j < formula.length && /[0-9.]/.test(formula[j])) j++
      tokens.push({ type: 'number', value: parseFloat(formula.slice(i, j)) })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i
      while (j < formula.length && /[a-zA-Z0-9_]/.test(formula[j])) j++
      tokens.push({ type: 'ident', value: formula.slice(i, j) })
      i = j
      continue
    }
    throw new Error(`Unexpected character "${c}" at position ${i + 1}`)
  }
  return tokens
}

export function parseFormula(formula) {
  if (!formula || !formula.trim()) throw new Error('Formula is empty')
  const tokens = tokenize(formula)
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  function expectType(type) {
    const t = next()
    if (!t || t.type !== type) throw new Error(`Expected "${type}"${t ? ` but got "${t.value}"` : ' but reached end of formula'}`)
    return t
  }

  function parseExpr() {
    let node = parseTerm()
    while (peek() && (peek().type === '+' || peek().type === '-')) {
      const op = next().type
      node = { type: 'binary', op, left: node, right: parseTerm() }
    }
    return node
  }
  function parseTerm() {
    let node = parseFactor()
    while (peek() && (peek().type === '*' || peek().type === '/')) {
      const op = next().type
      node = { type: 'binary', op, left: node, right: parseFactor() }
    }
    return node
  }
  function parseFactor() {
    const t = peek()
    if (!t) throw new Error('Unexpected end of formula')
    if (t.type === '-') { next(); return { type: 'negate', value: parseFactor() } }
    if (t.type === 'number') { next(); return { type: 'number', value: t.value } }
    if (t.type === 'ident') { next(); return { type: 'ident', value: t.value } }
    if (t.type === '(') {
      next()
      const node = parseExpr()
      expectType(')')
      return node
    }
    throw new Error(`Unexpected token "${t.value}"`)
  }

  const ast = parseExpr()
  if (pos < tokens.length) throw new Error(`Unexpected token "${peek().value}" after end of expression`)
  return ast
}

export function evalFormula(ast, values) {
  switch (ast.type) {
    case 'number': return ast.value
    case 'negate': return -evalFormula(ast.value, values)
    case 'ident':
      if (!(ast.value in values)) throw new Error(`Unknown metric "${ast.value}"`)
      return values[ast.value]
    case 'binary': {
      const l = evalFormula(ast.left, values)
      const r = evalFormula(ast.right, values)
      if (ast.op === '+') return l + r
      if (ast.op === '-') return l - r
      if (ast.op === '*') return l * r
      if (ast.op === '/') return r === 0 ? NaN : l / r
      throw new Error(`Unknown operator "${ast.op}"`)
    }
    default:
      throw new Error('Invalid formula')
  }
}

// All metric-key identifiers a formula references -- lets the caller
// fetch only the metrics actually used, not every metric in the registry.
export function referencedMetrics(ast, out = new Set()) {
  if (ast.type === 'ident') out.add(ast.value)
  else if (ast.type === 'negate') referencedMetrics(ast.value, out)
  else if (ast.type === 'binary') { referencedMetrics(ast.left, out); referencedMetrics(ast.right, out) }
  return out
}
