# B组：网页信息自主获取实验（预览版）

本项目用于光伏羊肉DCE研究的B组信息自主获取环节。当前版本是**可本地预览的静态网页原型**，默认启用演示模式；不会把演示行为上传到研究数据库。

## 1. 页面结构

- `index.html`：信息自主选择首页。受访者可以选择查看信息1、信息2，或直接继续问卷。
- `info1.html`：羊肉养殖方式介绍（舍饲圈养、传统草地放牧、光伏场区放牧）。
- `info2.html`：绿色食品标志及A级、AA级说明。
- `finish.html`：完成信息了解环节，演示模式下可查看本次浏览记录摘要。
- `css/style.css`：页面样式。
- `js/tracking.js`：浏览行为记录与B1—B4分组逻辑。
- `js/config.js`：演示/正式模式配置入口。

## 2. 如何在自己的电脑预览

### 方法A：直接打开

1. 下载并解压本项目ZIP。
2. 打开解压后的 `B-group-website` 文件夹。
3. 双击 `index.html`，使用Chrome或Edge打开。
4. 点击两张信息卡片，查看详情页；可以返回首页、查看另一类信息，也可以直接继续。

若浏览器限制本地文件的脚本或会话存储，使用方法B。

### 方法B：启动本地网页服务器（推荐）

1. 安装Python（若电脑已有Python可跳过）。
2. 在项目文件夹地址栏输入 `cmd`（Windows），打开命令提示符。
3. 输入：

   ```bash
   python -m http.server 8000
   ```

4. 在浏览器打开 `http://localhost:8000`。
5. 预览结束后，在命令提示符按 `Ctrl + C` 停止服务。

## 3. 有效阅读时间与B1—B4分组（当前原型规则）

- 点击信息卡片：记录点击事件。
- 进入详情页：开始计时。
- 页面处于前台且可见时累计有效停留时间；切换到其他标签页或离开页面时暂停计时。
- 当前暂定“有效查看”标准：单类信息累计可见停留时间不少于 **15秒**。
- 不要求滚动到页面底部；不设置强制阅读倒计时，受访者可随时返回或继续问卷。
- `info1_viewed=1` 且 `info2_viewed=1`：B1。
- 仅 `info1_viewed=1`：B2。
- 仅 `info2_viewed=1`：B3。
- 两类均未达到有效查看标准：B4。

**重要：15秒是用于预测试的暂定操作性阈值，不是强制阅读要求。**建议先做小样本预测试，检查不同页面的阅读时长分布，再决定是否调整。分析时请同时保留连续停留时间和点击变量，不要只保留B1—B4分组。

## 4. 图片说明

当前网页使用可公开访问的真实场景照片链接：

- 光伏场区放牧：Pexels，Vincent Delsuc，照片页面：<https://www.pexels.com/photo/a-flock-of-sheep-in-a-solar-farm-9684128/>
- 圈舍羊只：Unsplash，照片页面：<https://unsplash.com/photos/a-sheep-eating-hay-in-a-barn-TaKDcWlTcUg/>
- 草地羊群：Unsplash，照片页面：<https://unsplash.com/photos/a-flock-of-sheep-grazing-in-a-green-pasture-uGGQrsXORNc>

上线前请再次核对图片授权条款、图片可访问性和图片与文字的对应关系。绿色食品页面中的绿色图形是**网页示意图，不是官方标志图样**；若要展示官方标志，应使用经核实、获准使用的官方素材。

## 5. 从零开始正式部署：先注册账号

正式发布需要以下三个服务。你不需要现在就全部注册，可以按顺序逐项完成。

### 第一步：注册GitHub（托管网页）

1. 打开 <https://github.com/>。
2. 点击 Sign up，使用邮箱注册并完成验证。
3. 登录后点击右上角 `+` → `New repository`。
4. Repository name 可填写 `b-group-info`。
5. 选择 `Public`，勾选 `Add a README file`，点击 `Create repository`。
6. 进入仓库后点击 `Add file` → `Upload files`，上传本项目文件夹中的所有文件和子文件夹（不要只上传ZIP）。
7. 点击 `Commit changes` 保存。
8. 打开仓库 `Settings` → `Pages`，在 Build and deployment 中选择 `Deploy from a branch`；Branch 选择 `main`，文件夹选择 `/(root)`，点击 Save。
9. 等待GitHub Pages发布，页面会显示以 `https://你的用户名.github.io/b-group-info/` 开头的网址。

首次部署后先用浏览器打开网页，确认首页、两类详情页、照片和页面跳转正常。不要先发给正式受访者。

### 第二步：注册Supabase（保存正式实验行为数据）

1. 打开 <https://supabase.com/>。
2. 点击 Start your project，可使用GitHub账号登录或邮箱注册。
3. 创建 Organization（如系统要求），再创建 New project。
4. 选择项目名称、设置数据库密码并选择离你较近的数据区域；数据库密码自行保管，不要发到聊天中。
5. 项目创建完成后，在 Project Settings / API 中找到 Project URL 和 anon/publishable key。正式部署还需要配置服务端函数及其环境变量。
6. 当前项目的 `sql/schema.sql` 用于建立数据表，`supabase/functions/bgroup-ingest/index.ts` 是接收事件并在服务端计算分组的Edge Function代码。不要把 `service_role` 或其他 Secret Key 写入网页文件，也不要公开分享。

### 第三步：配置Qualtrics（问卷衔接）

推荐采用两份问卷：

- Qualtrics问卷1：知情同意、筛选题和前测；
- B组网页：受访者自主查看信息；
- Qualtrics问卷2：接收同一受访者编号和B组结果，继续DCE选择题。

在问卷1中生成唯一、非身份识别的受访者编号（例如嵌入数据字段 `rid`），通过结束/跳转链接将 `rid` 传到GitHub Pages网页。网页完成后，将 `rid`、`bgroup`、两类信息是否有效查看及停留秒数传到问卷2的Embedded Data字段。

正式使用前必须在Qualtrics预览环境完成一次端到端测试，检查编号是否一致、分组字段是否正确、是否能继续DCE。具体URL和Embedded Data设置需等你创建问卷后，根据实际Survey ID配置，不能提前猜测。

## 6. 当前版本与正式实验的区别

- 当前 `js/config.js` 中 `demoMode: true`，数据仅保存在当前浏览器的会话存储中，用于页面预览。
- 当前版本没有向真实Supabase数据库写入，也没有连接真实Qualtrics问卷。
- 不要在 `config.js` 中放置Supabase `service_role` key。
- 正式上线前，需要部署服务端事件接收接口、设置数据库访问策略、配置Qualtrics问卷2地址，并完成测试数据核验。
- 受访者编号建议使用随机研究编号，不要使用姓名、手机号、邮箱等直接身份信息。

## 7. 建议预测试检查清单

- [ ] 桌面Chrome/Edge显示正常
- [ ] 手机浏览器显示正常
- [ ] 两个信息模块可独立打开
- [ ] 可返回首页并查看另一类信息
- [ ] 直接继续问卷不受时间限制
- [ ] 切换浏览器标签页时有效停留计时暂停
- [ ] 刷新页面、返回页面时不重复累加错误
- [ ] 15秒阈值是否适合真实文本长度
- [ ] Qualtrics传入的rid与回传rid一致
- [ ] B1—B4与原始点击、停留时间记录一致
