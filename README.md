# dsh-loadout · 配置码

把当前 DSH 的**插件清单与调校**打包成一段文本（`LOAD1.…`），发给别人；对方粘贴后能逐项看清改了
什么，缺的插件一键装、装完的调校一键写入，也能一键撤回。

![设置 → 配置码](icon.svg)

## 两个框

- **生成**：列出本机装的应用插件 + 每个 Loader 条目相对默认值被改过的叶子字段（外观、聊天呈现、
  默认模型、默认预设…），点生成得到一段码。每条都带一句人话注释——说的是「这个改动让你得到什么」，
  例如「界面主题设为「深色」，字号设为「15」」，而不是字段路径。
- **导入**：粘贴别人的码解析成清单，逐项标「已安装 / 未安装」「会改动 / 已一致」。勾选后：
  - 应用选中的调校 —— 把勾中的字段写进本机配置；
  - 安装选中插件 —— 按码里的版本逐个 `pnpm add`，装完自动变回「已安装」；
  - 卸载选中插件 —— 把本机已装的这些包卸掉；
  - 还原选中调校 —— 只把「当前值恰好等于码里写的值」的字段退回默认，不碰你自己的其他设置。

  卸载与还原按钮点一次进入待确认态，再点一次才执行。生成出码后点「在导入框里验证」即可自测
  （本机应全为「已一致」）。

## 码格式

```
LOAD1.<base64url(deflateRaw(JSON))>.<sha256 前 8 位>
```

载荷是纯数据（无 `!!js` 表达式），解码即清单；校验位不符整码拒收。一份完整配置约 3K 字符。

## 隐私边界

导出时只取「与本机默认值不同」的叶子字段，再逐字段过滤：

- 路径/键名命中 `apiKey / token / secret / password / credential / baseURL / endpoint / proxy /
  license / phone` 的整条跳过，并在界面上显示剥离数量；
- 值是绝对路径（`C:\…`、`/home/…`）或邮箱的一律跳过；
- `null`（等于没设）与一次性界面状态（`step`、`welcomeNoticeVersion`、`last*At`）不进码；
- 会话、附件、凭证文件、工作区路径从不读取；
- 码只在你和收码人之间传递，插件不发任何网络请求（`pnpm add` 除外，那是装包本身的下载）。

安装插件时只接受码里出现的包名，并拒绝：官方核心包（`@deepseek-ai/*`）、自己这个插件、不合法的
包名。

## 带不走的东西

- 作者本机的 `link:` / `file:` 自研插件（只在作者磁盘上存在），码里会标「作者本机的自研插件，
  无法自动安装」；
- 不能写成配置字段的改动：自定义预设正文、钩子脚本、写在磁盘上的样式文件。这些只体现在码的
  调校项说明里，收码人需要自己照着做。

## 安装

从 npm（发布后）：

```bash
dsh plugin install dsh-loadout
```

从本地目录（开发时）：`plugin_manager` / `dsh plugin install` 指向本仓库目录即可，`dsh.bundle.patch`
会把它接进 profile。装好后 设置 面板里多出「配置码」一页（在「预设」与「插件市场」之间）。

## Host API

`/loadout/api` 下六个端点，均只读写本机 profile，不联网：

| 路径 | 作用 |
| --- | --- |
| `GET /loadout/api/preview` | 本机可打包的清单（含本地对比状态） |
| `POST /loadout/api/encode` | 生成码 |
| `POST /loadout/api/decode` | 解析码，返回带本地差异的清单 |
| `POST /loadout/api/apply` | 按 id 写入选中的调校项（`configEditor.edit`） |
| `POST /loadout/api/install` | 按 `{name, version}` 列表安装插件（`pluginManager.installBundle`） |
| `POST /loadout/api/remove` | 按包名列表卸载插件（`pluginManager.removeBundle`） |
| `POST /loadout/api/revert` | 撤回码写入过的字段（回落到继承值） |

## 结构

- `cordis.patch.yml`：bundle 层，插入一条 Host 行
- `index.js`：Host 半边——读 profile 包列表、经 `configEditor` 读写配置、调 `pluginManager` 装卸包、
  注册 `/loadout/api`
- `client.js`：Client 半边——`settings.section` 里的一页，文案与主题 token 都在这里
- `icon.svg`：插件图标
