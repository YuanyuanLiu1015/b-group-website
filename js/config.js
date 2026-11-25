/* V8 Supabase 联调：真实写入数据库；暂不连接Qualtrics。正式调查前须调整为正式版本。 */
window.BGROUP_CONFIG = {
  demoMode: false,
  testMode: true,
  apiUrl: 'https://lrwgtvwbcwrhyytivrqk.supabase.co/functions/v1/bgroup-ingest',
  surveyReturnUrl: '',
  minViewSeconds: 1,
  requireBottomScroll: false,
  requestTimeoutMs: 15000
};
