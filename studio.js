const qs=id=>document.getElementById(id);
let videoUrl='', voiceUrl='', objectUrl='';
const setStatus=(text,ok=false)=>{const el=qs('statusLine');el.textContent=text;el.style.color=ok?'#70e6bf':'';};
const base=()=>{const saved=(localStorage.getItem('nexoraBackendUrl')||'').replace(/\/+$/,'');if(saved)return saved;if(location.protocol.startsWith('http')&&location.hostname!=='localhost')return location.origin;return '';};
const api=path=>`${base()}${path}`;

async function ensureBackend(){
  if(base()) return true;
  const entered=prompt('Enter your Nexora backend URL (https://...vercel.app)');
  if(!entered)return false;
  try{const u=new URL(entered);if(!/^https?:$/.test(u.protocol))throw new Error();localStorage.setItem('nexoraBackendUrl',entered.replace(/\/+$/,''));return true;}catch{alert('Invalid backend URL');return false;}
}

async function uploadVideo(file){
  if(!await ensureBackend())throw new Error('Backend is required.');
  const {upload}=await import('https://esm.sh/@vercel/blob@2/client');
  const name=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  return (await upload(`personal/${Date.now()}-${name}`,file,{access:'public',handleUploadUrl:api('/api/upload'),multipart:true,contentType:file.type||'video/mp4',onUploadProgress:({percentage})=>setStatus(`Uploading video… ${Math.round(percentage)}%`)})).url;
}

async function analyze(style='natural spoken narration'){
  if(!videoUrl)throw new Error('Choose a video first.');
  if(!await ensureBackend())throw new Error('Backend is required.');
  const r=await fetch(api('/api/analyze-video'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoUrl,language:qs('targetLanguage').value,style})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'AI could not analyze the video.');
  qs('scriptEditor').value=d.script||'';return d.script||'';
}

async function makeVoice(){
  const text=qs('scriptEditor').value.trim();if(!text)throw new Error('Generate a script first.');
  if(!await ensureBackend())throw new Error('Backend is required.');
  const r=await fetch(api('/api/voice'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,4000),voice:'Adam — English · Deep / Firm',persist:true})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Adam voice generation failed.');voiceUrl=d.audioUrl;return voiceUrl;
}

async function render(){
  if(!videoUrl)throw new Error('Choose a video first.');if(!voiceUrl)throw new Error('Generate Adam voice first.');
  const script=qs('scriptEditor').value.trim();
  const r=await fetch(api('/api/render'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoUrl,voiceUrl,subtitles:qs('subtitleMode').value==='on'?script:'',quality:'1080p',keepMusic:true,separateTracks:true})});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Export failed.');
  const out=d.render?.outputUrl||d.render?.url||d.render?.downloadUrl;if(out){window.open(out,'_blank','noopener');return;}
  const id=d.render?.id||d.render?.jobId;if(!id)throw new Error('Render started but no job id was returned.');
  for(let i=0;i<90;i++){
    setStatus(`Rendering final MP4… ${i+1}`);
    await new Promise(r=>setTimeout(r,4000));
    const s=await fetch(api(`/api/render-status?id=${encodeURIComponent(id)}`));const sd=await s.json();if(!s.ok)continue;
    const rr=sd.render||{};const url=rr.outputUrl||rr.url||rr.downloadUrl;if(url){window.open(url,'_blank','noopener');return;}
    if(['failed','error','cancelled'].includes(String(rr.status||rr.state||'').toLowerCase()))throw new Error(rr.error||'Render failed.');
  }
  throw new Error('Render is still processing.');
}

qs('videoFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);
  qs('viewer').innerHTML=`<video src="${objectUrl}" controls playsinline></video>`;
  qs('analyzeBtn').disabled=true;qs('voiceBtn').disabled=true;qs('exportBtn').disabled=true;voiceUrl='';
  try{videoUrl=await uploadVideo(file);setStatus('Video ready. Tap Analyze Video.',true);qs('analyzeBtn').disabled=false;}catch(err){setStatus(err.message);}
});

qs('analyzeBtn').addEventListener('click',async()=>{
  qs('analyzeBtn').disabled=true;setStatus('AI is watching your video and writing narration…');
  try{await analyze();setStatus('Narration ready. Edit it or generate Adam voice.',true);qs('rewriteBtn').disabled=false;qs('voiceBtn').disabled=false;}catch(err){setStatus(err.message);}finally{qs('analyzeBtn').disabled=false;}
});

qs('rewriteBtn').addEventListener('click',async()=>{
  qs('rewriteBtn').disabled=true;setStatus('Writing a fresh version…');
  try{await analyze('fresh concise engaging narration, different wording');setStatus('New narration ready.',true);}catch(err){setStatus(err.message);}finally{qs('rewriteBtn').disabled=false;}
});

qs('voiceBtn').addEventListener('click',async()=>{
  qs('voiceBtn').disabled=true;setStatus('Generating Adam voice…');
  try{await makeVoice();setStatus('Adam voice ready. Export when you are happy with the script.',true);qs('exportBtn').disabled=false;}catch(err){setStatus(err.message);}finally{qs('voiceBtn').disabled=false;}
});

qs('exportBtn').addEventListener('click',async()=>{
  qs('exportBtn').disabled=true;setStatus('Preparing final MP4…');
  try{await render();setStatus('Export complete.',true);}catch(err){setStatus(err.message);}finally{qs('exportBtn').disabled=false;}
});

qs('targetLanguage').addEventListener('change',()=>{voiceUrl='';qs('exportBtn').disabled=true;if(videoUrl)setStatus('Language changed. Analyze again for a new narration.');});
