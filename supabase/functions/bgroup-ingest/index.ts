import { createClient } from 'npm:@supabase/supabase-js@2';

/* Public endpoint: enforces shape, origin and resource bounds, NOT respondent identity.
   For stronger provenance, use server-issued signed one-time survey tokens. */
const allowedOrigin = (Deno.env.get('ALLOWED_ORIGIN') ?? '').replace(/\/$/, '');
const headers = (origin: string) => ({
  'Access-Control-Allow-Origin': allowedOrigin && origin === allowedOrigin ? origin : 'null',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
  'Vary': 'Origin',
  'Cache-Control': 'no-store',
});
const reply = (body: unknown, status: number, origin: string) => new Response(JSON.stringify(body), { status, headers:headers(origin) });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ridRE = /^[A-Za-z0-9_-]{6,100}$/;
const acceptable = new Set(['home_open','search','click','view_start','view_end','experiment_complete']);

Deno.serve(async (req) => {
  const origin=req.headers.get('origin') ?? '';
  if (!allowedOrigin || origin !== allowedOrigin) return reply({error:'Origin not permitted'},403,origin);
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=='POST') return reply({error:'Method not allowed'},405,origin);
  const declaredLength=Number(req.headers.get('content-length')||'0');
  if(declaredLength>65000) return reply({error:'Payload too large'},413,origin);
  let data: any;
  try { const raw=await req.text();if(raw.length>65000)return reply({error:'Payload too large'},413,origin);data=JSON.parse(raw); }
  catch {return reply({error:'Invalid JSON'},400,origin);}
  const {rid,visit_id,events,finalize,settings}=data||{};
  if(typeof rid!=='string'||!ridRE.test(rid)||typeof visit_id!=='string'||!uuid.test(visit_id)||!Array.isArray(events)||events.length>250||typeof finalize!=='boolean')
    return reply({error:'Invalid session'},400,origin);
  // Study criteria are defined SERVER-side, not by the participant's browser.
  const minSeconds=Number(Deno.env.get('B_GROUP_MIN_SECONDS') ?? '15');
  const requireBottom=(Deno.env.get('B_GROUP_REQUIRE_BOTTOM') ?? 'false')==='true';
  if(settings?.minViewSeconds!==minSeconds || settings?.requireBottomScroll!==requireBottom)
    return reply({error:'Study criteria mismatch'},409,origin);
  const rows=[];
  for(const e of events){
    if(!e||typeof e.event_id!=='string'||!uuid.test(e.event_id)||!acceptable.has(e.type)||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at)))return reply({error:'Invalid event'},400,origin);
    const info=e.info===undefined?null:e.info;
    if(info!==null&&info!=='info1'&&info!=='info2')return reply({error:'Invalid info type'},400,origin);
    if(['click','view_start','view_end'].includes(e.type)&&!info)return reply({error:'Missing info'},400,origin);
    const duration=e.type==='view_end'?e.duration_seconds:null;
    if(duration!==null&&(!Number.isInteger(duration)||duration<0||duration>3600))return reply({error:'Invalid duration'},400,origin);
    const searchQuery=e.type==='search'?e.query:null;
    const searchSource=e.type==='search'?e.source:null;
    if(e.type==='search' && (!info || typeof searchQuery!=='string' || searchQuery.length<1 || searchQuery.length>200 || !['home_search'].includes(searchSource)))return reply({error:'Invalid search event'},400,origin);
    rows.push({event_id:e.event_id,rid,visit_id,event_type:e.type,info,event_at:e.at,duration_seconds:duration,bottom:e.type==='view_end'?e.bottom===true:null,max_scroll:e.type==='view_end'?Math.max(0,Math.min(1,Number(e.max_scroll)||0)):null,search_query:searchQuery,search_source:searchSource});
  }
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!secret)return reply({error:'Server not configured'},503,origin);
  const db=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    if(rows.length){
      const {error}=await db.from('bgroup_events').upsert(rows,{onConflict:'event_id',ignoreDuplicates:true});
      if(error)throw error;
    }
    if(!finalize)return reply({ok:true,event_count:rows.length},200,origin);
    const {data:stored,error}=await db.from('bgroup_events').select('event_type,info,duration_seconds,bottom').eq('rid',rid).eq('visit_id',visit_id).limit(2000);
    if(error)throw error;
    const sum:any={rid,visit_id,info1_clicked:false,info2_clicked:false,info1_duration:0,info2_duration:0,info1_bottom:false,info2_bottom:false};
    for(const e of stored||[]){
      if(e.event_type==='click' && (e.info==='info1'||e.info==='info2'))sum[e.info+'_clicked']=true;
      if(e.event_type==='view_end' && (e.info==='info1'||e.info==='info2')){
        sum[e.info+'_duration']+=e.duration_seconds||0;sum[e.info+'_bottom'] ||= e.bottom===true;
      }
    }
    for(const name of ['info1','info2'])sum[name+'_viewed']=sum[name+'_duration']>=minSeconds && (!requireBottom||sum[name+'_bottom']);
    sum.group_type=sum.info1_viewed?(sum.info2_viewed?'B1':'B2'):(sum.info2_viewed?'B3':'B4');
    const {error:writeError}=await db.from('bgroup_sessions').upsert({...sum,min_view_seconds:minSeconds,require_bottom_scroll:requireBottom,finalized_at:new Date().toISOString()},{onConflict:'rid,visit_id'});
    if(writeError)throw writeError;
    return reply(sum,200,origin);
  }catch(err){console.error(err);return reply({error:'Database operation failed'},500,origin);}
});
