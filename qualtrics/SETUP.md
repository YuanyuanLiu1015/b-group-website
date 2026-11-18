# Qualtrics 两份问卷衔接配置（B组）

## 为什么要分两份？
Qualtrics `End of Survey -> Redirect to URL` 会结束当前答卷。后续从网页回到同一个公开问卷链接通常会产生另一份答卷，不能假设原答卷可以继续。所以使用：

Survey 1（同意/筛选/前测）→ B组网页 → Survey 2（DCE及后测）。两个数据集以 `rid` 合并。

## Survey 1（第一份问卷）
1. Survey Flow 中，在末端创建一个 B组专用分支（A组可另行进入自己的实验流程）。
2. 在 B组分支下添加 End of Survey 元素，选择 Customize / Redirect to a URL：
   `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO/index.html?rid=${e://Field/ResponseID}`
3. **必须用正式发放方式做至少3轮完整端到端测试**，确认 ResponseID 管道文本被 Qualtrics 正确替换成真实值，而不是字面 `${e://Field/ResponseID}`。
4. 注意 Survey 1 的 End of Survey 会导致它成为一条已结束的回答，不是“暂停”状态。

## Survey 2（第二份问卷）
1. 建立新问卷，其第一部分为后续羊肉DCE题目。
2. 在 Survey Flow 最前面新增 Embedded Data 元素，字段名逐字完全一致，留空以接收URL参数：
   `rid`, `bgroup`, `info1_viewed`, `info2_viewed`, `info1_seconds`, `info2_seconds`, `bgroup_status`。
3. 确保该Embedded Data元素位于后续DCE block之前。不要创建覆盖这些字段的默认值。
4. 发布并复制Survey 2正式匿名链接，例如：`https://YOUR_BRAND.qualtrics.com/jfe/form/SV_XXXXXXXXXXXXXXX`。
5. 把这个链接填入网站 `js/config.js` 的 `surveyReturnUrl`。不需要手工在URL后拼字段；网页会自动添加。
6. 测试完成后，从Qualtrics导出两份数据，用 Survey 1 的 ResponseID 对上 Survey 2 的 rid；再以 rid + visit_id 与Supabase日志核对。

## 重要安全/识别边界
- Survey 2的 `bgroup` 和其他URL参数可以由有链接的人修改，所以论文最终分析请以Supabase服务端原始访问日志重新计算分组并对账，Qualtrics字段只用于便捷数据匹配。
- 当前 public Edge Function 限制CORS、输入格式和数据权限，但 **CORS不构成身份验证**；不能阻止伪造HTTP请求。正式大样本如需强来源验证，应给每个受访者预先签发不可猜测的随机token或服务端签名token，并校验一次性使用。
- 两份问卷都不要在跳转URL放姓名、电话、邮箱或其他个人数据。
- 更稳妥的字段名为 `rid`，不要在问卷中另设同名但用途不同的变量。

## 示例（假设数据）
Survey 1 产生 ResponseID `R_abcdef123456`，跳转：
`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO/index.html?rid=R_abcdef123456`

Survey 2 收到：
`https://YOUR_BRAND.qualtrics.com/jfe/form/SV_XXXXXXXXXXXXXXX?rid=R_abcdef123456&bgroup=B2&info1_viewed=1&info2_viewed=0&info1_seconds=36&info2_seconds=0&bgroup_status=complete`
