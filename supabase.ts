// supabase.ts
import { createClient } from '@supabase/supabase-js';

// Access variables with VITE_ prefix as required by Vite for client-side exposure
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string | undefined): boolean => {
  return !!url && url.startsWith('http') && url !== 'your-supabase-url';
};

// Only initialize if we have valid credentials
export const supabase = isValidUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl!, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn("Supabase functionality is disabled: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided in environment variables.");
}
