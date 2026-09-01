(() => {
  // Keep the APK UI inside the Capacitor shell. The backend URL is used only for API calls.
  const saved = (localStorage.getItem('nexoraBackendUrl') || '').trim().replace(/\/+$/, '');
  if (!saved) return;
  try {
    const url = new URL(saved);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') localStorage.removeItem('nexoraBackendUrl');
  } catch {
    localStorage.removeItem('nexoraBackendUrl');
  }
})();
