import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,       // guarda sesión en localStorage
      autoRefreshToken: true,     // refresca token automáticamente
      detectSessionInUrl: true,   // necesario para OAuth (Google redirect)
      flowType: "pkce",           // recomendado para OAuth en SPA
    },
  }
);
