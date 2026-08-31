// Tracks whether this browser has ever opened PeopleBind AI (either the
// topbar popover or the dedicated /app/ai page) so the "New" badge on the
// topbar icon shows until someone's actually explored the feature, then
// disappears for good -- the standard new-feature-badge pattern (Slack,
// Linear, Notion, etc.), not a recurring nag.
const KEY = 'pb_ai_explored'
const EVENT = 'peoplebind:ai-explored'

export function hasExploredAi() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

// Idempotent and cheap to call from every entry point (popover open, the
// full page's own mount) -- only writes/dispatches once, the first time.
export function markAiExplored() {
  if (hasExploredAi()) return
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // ignore storage failures (e.g. private browsing) -- the badge just
    // won't remember being dismissed for this session, not a big deal
  }
  // AiAssistant.tsx's badge and this page can both trigger "explored" --
  // a same-tab custom event (unlike the native `storage` event, which
  // only fires in *other* tabs) is what lets whichever one is currently
  // mounted hide its badge immediately, not just after a reload.
  window.dispatchEvent(new Event(EVENT))
}

export function onAiExplored(handler) {
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
