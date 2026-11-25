/* 本地预览默认开启演示模式。正式部署时，按 README 配置 API 与 Qualtrics 第二份问卷链接。 */
window.BGROUP_CONFIG = {
  demoMode: true,
  apiUrl: '',
  surveyReturnUrl: '',
  minViewSeconds: 1,       // 有效查看的暂定阈值：可见页面累计停留不少于15秒
  requireBottomScroll: false, // 不强制滚动到页面底部
  requestTimeoutMs: 15000
};
