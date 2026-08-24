(() => {
  const isAndroidShell = location.hostname === 'localhost';
  if (!isAndroidShell) return;
  const base = (localStorage.getItem('nexoraBackendUrl') || '').trim().replace(/\/+$/, '');
  if (!base) return;
  try {
    const url = new URL(base);
    if (url.protocol === 'https:' || url.protocol === 'http:') location.replace(url.href);
  } catch {}
})();
