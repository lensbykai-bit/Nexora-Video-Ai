(() => {
  const normalize = (value = '') => value.trim().replace(/\/+$/, '');
  const isLocalShell = ['localhost', '127.0.0.1'].includes(location.hostname);
  const savedBackend = normalize(localStorage.getItem('nexoraBackendUrl') || '');

  if (isLocalShell && savedBackend) {
    try {
      const url = new URL(savedBackend);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        location.replace(url.toString());
        return;
      }
    } catch {}
  }

  const saveButton = document.getElementById('saveBackendBtn');
  const input = document.getElementById('backendUrl');
  if (!saveButton || !input || !isLocalShell) return;

  saveButton.addEventListener('click', (event) => {
    const value = normalize(input.value);
    if (!value) return;

    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      localStorage.setItem('nexoraBackendUrl', value);
      location.replace(url.toString());
    } catch {}
  }, true);
})();
