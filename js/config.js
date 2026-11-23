/* LaunchPage runtime config.
   Leave blank to run in LOCAL MODE (everything stays in this browser/device).
   Fill in to enable Supabase (cross-device data, real auth, secure submissions).
   The anon key is safe to ship to the browser — it is protected by Row-Level Security.
   NEVER put the service_role key or any AI API key in this file. */
window.LP_CONFIG = {
  supabaseUrl: '',        // e.g. https://abcd1234.supabase.co
  supabaseAnonKey: '',    // Project Settings → API → anon public key
  storeName: 'Hunnyhive',
  storeUrl: 'https://hunnyhive.app'
};
