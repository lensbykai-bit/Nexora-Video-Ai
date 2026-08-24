// Nexora Video AI Personal v1.8
(() => {
  let latestScript = '';
  const nativeFetch = window.fetch.bind(window);

  const getScriptText = () => {
    const editor = document.getElementById('scriptEditor');
    return (editor?.value || latestScript || '').trim();
  };

  const setScriptStatus = (message, ok = false) => {
    const status = document.getElementById('scriptStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('muted', !ok);
    status.style.color = ok ? '#5be5cf' : '';
  };

  const fillScript = (text) => {
    if (!text) return;
    latestScript = text.trim();
    const editor = document.getElementById('scriptEditor');
    if (editor) editor.value = latestScript;
    setScriptStatus(`Script ready · ${latestScript.length} characters`, true);
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
    return nativeFetch(input, nextInit);
  };

  window.addEventListener('DOMContentLoaded', () => {
    const generate = document.getElementById('generateScriptBtn');
    const clear = document.getElementById('clearScriptBtn');
    const editor = document.getElementById('scriptEditor');

    generate?.addEventListener('click', async () => {
      const videoUrl = (document.getElementById('videoLink')?.value || '').trim();
      if (!videoUrl) return setScriptStatus('Upload a video first.');
      generate.disabled = true;
      setScriptStatus('AI is analyzing your video and writing narration…');
      try {
        const targetLanguage = document.getElementById('targetLanguage')?.value || 'English';
        const response = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl, language: targetLanguage, style: 'natural spoken narration' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to generate script from video.');
        fillScript(data.script);
      } catch (error) {
        setScriptStatus(error.message || 'Video script generation failed.');
      } finally {
        generate.disabled = false;
      }
    });

    clear?.addEventListener('click', () => {
      if (editor) editor.value = '';
      latestScript = '';
      setScriptStatus('Script cleared.');
    });

    editor?.addEventListener('input', () => {
      latestScript = editor.value;
      setScriptStatus(`Edited script · ${editor.value.length} characters`, true);
    });
  });
})();
