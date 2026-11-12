(() => {
  const cfg = window.SIGMA_SUPABASE_CONFIG || {};
  const valid = cfg.url && cfg.anonKey && !cfg.url.includes('PEGA_AQUI') && !cfg.anonKey.includes('PEGA_AQUI');
  window.sigmaSupabaseReady = Boolean(valid && window.supabase?.createClient);
  window.sigmaSupabase = window.sigmaSupabaseReady ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
})();
