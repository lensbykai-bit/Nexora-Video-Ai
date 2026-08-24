(() => {
  let capturedTranscript = '';
  const nativeFetch = window.fetch.bind(window);

  const getScriptText = () => {
    const editor = document.getElementById('scriptEditor');
    return (editor?.value || capturedTranscript || '').trim();
  };

  const fillScript = (text, auto = false) => {
    if (!text) return;
    capturedTranscript = text.trim();
    const editor = document.getElementById('scriptEditor');
    if (editor && (auto || !editor.value.trim())) editor.value = capturedTranscript;
    const status = document.getElementById('scriptStatus');
    if (status) {
      status.textContent = `Script ready · ${capturedTranscript.length} characters`;
      status.classList.remove('muted');
      status.style.color = '#5be5cf';
    }
  };

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    let nextInit = init;

    if ((url.includes('/api/voice') || url.includes('/api/render')) && typeof init.body === 'string') {
      const script = getScriptText();
      if (script) {
        try {
          const body = JSON.parse(init.body);
          if (url.includes('/api/voice')) body.text = script.slice(0, 4000);
          if (url.includes('/api/render')) body.subtitles = script;
          nextInit = { ...init, body: JSON.stringify(body) };
        } catch {}
      }
    }

    const response = await nativeFetch(input, nextInit);

    if (url.includes('/api/transcript-status')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        const transcript = data?.transcript;
        if (transcript?.status === 'completed' && transcript?.text) fillScript(transcript.text, true);
      } catch {}
    }

    if (url.includes('/api/translate')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data?.translatedText) fillScript(data.translatedText, true);
      } catch {}
    }

    return response;
  };

  window.addEventListener('DOMContentLoaded', () => {
    const generate = document.getElementById('generateScriptBtn');
    const clear = document.getElementById('clearScriptBtn');
    const editor = document.getElementById('scriptEditor');

    generate?.addEventListener('click', () => {
      if (capturedTranscript) fillScript(capturedTranscript, true);
      else {
        const status = document.getElementById('scriptStatus');
        if (status) status.textContent = 'Create subtitles first. Script will generate automatically.';
      }
    });

    clear?.addEventListener('click', () => {
      if (editor) editor.value = '';
      const status = document.getElementById('scriptStatus');
      if (status) {
        status.textContent = 'Script cleared. Tap Auto Generate Script to restore the latest transcript.';
        status.classList.add('muted');
        status.style.color = '';
      }
    });

    editor?.addEventListener('input', () => {
      const status = document.getElementById('scriptStatus');
      if (status) status.textContent = `Edited script · ${editor.value.length} characters`;
    });
  });
})();
