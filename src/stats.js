const url='https://fjziqejykykafzcimqmc.supabase.co/rest/v1/rpc/';
const key='sb_publishable_qfpWy_UaTC7VznnrRHUfsA_uStG6egb';
const get=id=>document.getElementById(id);
const formats=new Set('mp3 m4a wav mov mp4 webm flac aac ogg opus wma mkv 3gp'.split(' '));
async function rpc(method,body={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch(url+method,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw new Error('Statistics service HTTP '+response.status);
    if(method==='scribe_get_usage')return await response.json();
  } finally {clearTimeout(timer)}
}
const number=n=>Math.max(0,Number(n)||0);
const fmt=n=>number(n).toLocaleString('en-AU');
export async function refreshStats(){
  if(!get('usage-status'))return;
  try {
    const s=await rpc('scribe_get_usage');
    const count=number(s.completed), seconds=number(s.seconds);
    get('usage-total').textContent=fmt(count);
    get('usage-hours').textContent=(seconds/3600).toFixed(1)+' h';
    get('usage-average').textContent=count?(seconds/count/60).toFixed(1)+' min':'—';
    for(const model of ['tiny','base','small']){
      const n=number(s.models?.[model]), p=count?100*n/count:0;
      get('usage-'+model).textContent=fmt(n)+' ('+Math.round(p)+'%)';
    }
    const popular=Object.entries(s.formats||{}).sort((a,b)=>number(b[1])-number(a[1]));
    get('usage-format').textContent=popular.length?popular.map(([k,v])=>k.toUpperCase()+' '+fmt(v)).join(' · '):'No completed recordings yet';
    get('usage-status').textContent='Shared totals · updated just now';
  } catch(e){get('usage-status').textContent='Statistics temporarily unavailable. Transcription still works.';console.warn('SCRIBE-ME statistics:',e.message)}
}
export function captureUsage(file,model){
  // Only pass a whitelisted extension; never transmit the filename or its contents.
  const ext=(file?.name||'').split('.').pop().toLowerCase();
  const format=formats.has(ext)?ext:'other';
  return {model,format,enabled:!!get('usage-opt-in')?.checked};
}
export async function recordUsage(event,success,seconds){
  if(!event?.enabled)return;
  try{
    await rpc('scribe_record_usage',{p_model:event.model,p_format:event.format,p_success:success,p_seconds:success?Math.min(86400,Math.max(0,Math.round(number(seconds)))):0});
    await refreshStats();
  }catch(e){console.warn('SCRIBE-ME usage event not counted:',e.message);if(get('usage-status'))get('usage-status').textContent='Statistics could not update. Your transcript is unaffected.'}
}
