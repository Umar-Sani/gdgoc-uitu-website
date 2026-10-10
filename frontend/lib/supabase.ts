import { createClient } from '@supabase/supabase-js'
import { supabaseCookieStorage } from '@/lib/supabaseCookieStorage'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// The session is persisted in a cookie (not localStorage) so proxy.ts can verify it on the
// server before serving protected routes — see lib/supabaseCookieStorage.ts (TODO-004).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { storage: supabaseCookieStorage },
})
