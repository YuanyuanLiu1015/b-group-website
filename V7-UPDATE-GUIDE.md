# B组网页 V7：按老师意见修改的完整更新包

## 本次设计决定
第二类信息确认为“绿色食品认证”。首页只突出两类研究信息，不再提供其他主题的推荐关键词：
1. 羊肉养殖方式
2. 绿色食品认证

两类提示词放在搜索输入框上方。受访者可以点击提示词填入问题，也可以自行输入与其中一类有关的问题。搜索后直接跳转到对应详情页，不经过中间搜索结果页。若输入内容同时涉及两类或不属于两类，网页显示提示，不展示无关内容。

首页增加“暂不查看，直接进入下一步”，可跳转到完成/问卷回传页面。受访者可以只看一类、两类都看，或两类都不看。

## 文件更新清单
请按原目录将以下文件上传并替换：
- `index.html`
- `css/style.css`
- `js/tracking.js`
- `supabase/functions/bgroup-ingest/index.ts`
- `sql/schema.sql`

`info1.html`、`info2.html`、`finish.html`、`js/config.js`、`qualtrics/SETUP.md` 等其他文件均保留在项目中。

## 图片
`images/` 中五张图片原样保留：三张养殖方式图片、A级绿色食品标志、AA级绿色食品标志。图片文件没有重新绘制、替换或压缩处理。

## 搜索与跳转
- 养殖方式相关问题 -> `info1.html`
- 绿色食品认证相关问题 -> `info2.html`
- 同时涉及两类 -> 提示先选择一类；可返回首页再查看另一类
- 无关问题 -> 提示围绕两类研究信息重新输入
- 不想查看 -> `finish.html`

## 行为记录
`js/tracking.js` 将搜索行为写入 `search` 事件，并记录类别、原始搜索问题及来源；进入详情页后记录 view_start/view_end 与停留秒数。点击搜索时同步产生类别 click 事件，原有B1-B4阅读时长判定逻辑保留。

## Supabase数据库升级
如果尚未创建表，运行完整的 `sql/schema.sql`。
如果已经部署过V6数据库，至少在 Supabase SQL Editor 执行：
```sql
alter table public.bgroup_events add column if not exists search_query text;
alter table public.bgroup_events add column if not exists search_source text;
```
随后重新部署 `supabase/functions/bgroup-ingest` Edge Function，使其接受并保存 `search` 事件。

## 正式部署提醒
- `js/config.js` 当前仍为 `demoMode: true`。正式收集前需填写 Supabase Edge Function URL 和 Qualtrics 第二份问卷 URL，并改为 `false`。
- Supabase Edge Function 需要与网页配置一致的 `B_GROUP_MIN_SECONDS`（默认15）和 `B_GROUP_REQUIRE_BOTTOM`（默认false），以及 `ALLOWED_ORIGIN`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。
- “跳过查看”也会进入 `finish.html`，保存完成后才显示继续Qualtrics问卷的按钮。
- 搜索与点击不等于已查看。B1-B4仍按详情页累计有效停留时间是否达到阈值判定。
- 正式上线前请至少用Qualtrics正式分发链接完成端到端测试，并核对原始事件与分组汇总。
