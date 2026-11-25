/* B-group study tracking. No personal identifying information is intentionally collected. */
(function () {
  'use strict';
  const C = window.BGROUP_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const RID = params.get('rid');
  const RID_OK = typeof RID === 'string' && /^[A-Za-z0-9_-]{6,100}$/.test(RID);
  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });
  }
  const demoId = 'DEMO_' + uid().replace(/-/g, '').slice(0,16);
  const rid = RID_OK ? RID : (C.demoMode ? demoId : null);
  const STORAGE_KEY = 'bgroup-v3:' + (rid || 'invalid');
  let busy = false;

  function storageRead() { try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { return null; } }
  function storageSave(s) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  function fresh() { return { rid, visit_id: uid(), started_at: new Date().toISOString(), events: [], completed: false, result: null }; }
  let state = storageRead();
  if (!state || state.rid !== rid) { state = fresh(); storageSave(state); }
  function add(type, details = {}) {
    state.events.push({ event_id: uid(), type, at: new Date().toISOString(), ...details });
    storageSave(state);
  }
  function derive() {
    const d = {info1_clicked:false,info2_clicked:false,info1_duration:0,info2_duration:0,info1_bottom:false,info2_bottom:false};
    for (const ev of state.events) {
      if (ev.type === 'click' && ev.info in { info1:1, info2:1 }) d[ev.info+'_clicked'] = true;
      if (ev.type === 'view_end' && ev.info in { info1:1, info2:1 }) {
        d[ev.info+'_duration'] += Math.max(0,Math.min(3600,Number(ev.duration_seconds)||0));
        d[ev.info+'_bottom'] ||= ev.bottom === true;
      }
    }
    for (const name of ['info1','info2']) d[name+'_viewed'] = d[name+'_duration'] >= (C.minViewSeconds ?? 15) && (!C.requireBottomScroll || d[name+'_bottom']);
    d.group_type = d.info1_viewed ? (d.info2_viewed ? 'B1':'B2') : (d.info2_viewed ? 'B3':'B4');
    return d;
  }
  function validateSetup() {
    if (!rid) throw new Error('缺少有效的受访者编号 rid。请从Qualtrics专用链接进入。');
    if (!C.demoMode) {
      if (!/^https:\/\/[A-Za-z0-9.-]+\.supabase\.co\/functions\/v1\/bgroup-ingest$/.test(C.apiUrl || '')) throw new Error('未配置正确的Supabase Edge Function地址。');
      if (!C.testMode && !/^https:\/\/[A-Za-z0-9.-]+\.qualtrics\.com\/jfe\/form\/SV_[A-Za-z0-9]+/.test(C.surveyReturnUrl||'')) throw new Error('请配置Qualtrics第二份问卷的正式链接。');
    }
  }
  async function sync(finalize = false, silent = false) {
    if (C.demoMode) {
      if (finalize) { const d=derive(); state.completed=true; state.result={rid:state.rid,...d,visit_id:state.visit_id}; storageSave(state); }
      return state.result;
    }
    validateSetup();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), C.requestTimeoutMs || 15000);
    try {
      const res = await fetch(C.apiUrl, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({rid:state.rid,visit_id:state.visit_id,events:state.events,finalize,
          settings:{minViewSeconds:C.minViewSeconds ?? 15,requireBottomScroll:C.requireBottomScroll !== false}}),
        signal: controller.signal, keepalive: JSON.stringify(state.events).length < 50000
      });
      if (!res.ok) throw new Error('服务器保存失败（HTTP '+res.status+'）');
      const data = await res.json();
      if (finalize) { state.completed=true;state.result=data;storageSave(state); }
      return data;
    } catch (e) { if (!silent) throw e; return null; }
    finally { clearTimeout(timeout); }
  }
  function errorBox(message) {
    const target=document.getElementById('status-message');
    if(target){target.textContent=message;target.hidden=false;target.setAttribute('role','alert');}
    else alert(message);
  }
  function appendRidToInternalLinks() {
    // RID stays in address bar when linking between pages, including on refresh.
    if (!rid) return;
    for(const a of document.querySelectorAll('a[href]')){
      const u=new URL(a.getAttribute('href'),location.href);
      if(u.origin===location.origin && u.pathname.endsWith('.html')){
        u.searchParams.set('rid',rid);a.href=u.toString();
      }
    }
  }
  function init() {
    try { validateSetup(); } catch(e) { errorBox(e.message); }
    appendRidToInternalLinks();
    add('home_open'); sync(false,true);
  }
  function logClick(which) { if(which !== 'info1' && which !== 'info2') return;add('click',{info:which});sync(false,true); }
  function logSearch(query, category, source) { if(typeof query !== 'string' || !['info1','info2'].includes(category)) return; add('search',{info:category,query:query.slice(0,200),source:source||'unknown'}); add('click',{info:category}); sync(false,true); }
  function startView(which) {
    if(which!=='info1'&&which!=='info2')return;
    appendRidToInternalLinks();
    let start=0,active=false, bottom=false, maxScroll=0;
    function captureScroll(){
      const denom=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      const pct=denom===0?1:Math.min(1,Math.max(0,window.scrollY/denom));
      maxScroll=Math.max(maxScroll,pct);
      if(pct>=0.9)bottom=true;
    }
    function begin(){if(active||state.completed)return;active=true;start=performance.now();add('view_start',{info:which});captureScroll();}
    function end(){if(!active)return;captureScroll();active=false;
      add('view_end',{info:which,duration_seconds:Math.max(0,Math.round((performance.now()-start)/1000)),bottom,max_scroll:maxScroll});
      sync(false,true);
    }
    window.addEventListener('scroll',captureScroll,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)end();else begin();});
    window.addEventListener('pagehide',end);
    // Explicit navigation is finalized before leaving, rather than relying solely on pagehide.
    document.querySelectorAll('a[href]').forEach(a=>a.addEventListener('click',()=>end(),{capture:true}));
    if(!document.hidden)begin();
  }
  async function complete() {
    const button=document.getElementById('continue');
    if(!button)return;
    button.disabled=true;
    button.textContent='正在保存访问记录…';
    const demo=document.getElementById('demo-note');
    if(demo && C.demoMode)demo.textContent='演示模式：记录仅存于本浏览器，不会上传研究数据库。';
    if(demo && C.testMode)demo.textContent='联调模式：本次测试数据会真实保存到 Supabase。请勿使用真实受访者信息。';
    async function finalize() {
      if(busy)return;busy=true;button.disabled=true;button.textContent='正在保存访问记录…';
      try {
        validateSetup();
        if(!state.completed || !state.result) {add('experiment_complete');await sync(true);}
        button.disabled=false;button.textContent=C.testMode?'查看数据库保存结果':(C.demoMode?'查看演示结果':'继续Qualtrics问卷 →');
      }catch(e){button.disabled=false;button.textContent='重新尝试保存';errorBox('未能保存访问记录，请检查网络后重试。'+e.message);}
      finally{busy=false;}
    }
    button.addEventListener('click',async()=>{
      if(!state.completed){await finalize();return;}
      if(C.demoMode || C.testMode){alert((C.testMode?'Supabase 已保存结果：':'演示结果：')+JSON.stringify(state.result,null,2));return;}
      const u=new URL(C.surveyReturnUrl);
      const r=state.result;
      const values={rid:r.rid,bgroup:r.group_type,info1_viewed:String(Number(r.info1_viewed)),info2_viewed:String(Number(r.info2_viewed)),info1_seconds:String(r.info1_duration),info2_seconds:String(r.info2_duration),bgroup_status:'complete'};
      for(const [k,v] of Object.entries(values))u.searchParams.set(k,v);
      location.assign(u.toString());
    });
    await finalize();
  }
  window.BGroup={init,startView,logClick,logSearch,complete,derive};
})();
