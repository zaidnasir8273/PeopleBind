import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Fails loudly at build/runtime rather than silently hitting a wrong
  // backend -- easier to debug than a mysterious blank screen.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env (local) or Netlify environment variables (deployed).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
