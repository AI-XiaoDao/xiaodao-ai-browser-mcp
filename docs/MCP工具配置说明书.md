# AI浏览器 MCP Server v3.3.6 — 配置说明书

> Windows 平台 · 内置 Google Chromium（CEF）浏览器 · 提供 **351 个工具**（其中 336 个 `browser_*`，另 15 个是 `mcp_*` / `workflow_*` / `ping` / `batch` / `schedule` / `aliases` 等管理工具）
> **仅 stdio 通道**：程序不监听任何端口，**没有在线文档与健康检查接口**（不存在 HTTP / WebSocket 端点、不存在 `/health`），启动时控制台会打印「仅 stdio 通道, 不监听任何端口」。（exe 同目录的 `index.html` 是随包的**本地离线**欢迎页，由程序用 `file://` 直接打开，不经网络提供、也不对外提供任何接口）
> **浏览器窗口默认隐藏、不占桌面**（v3.3.2 起）：由 MCP 客户端拉起后主窗口创建完即隐藏；需要时用 `browser_show_window {visible:true}` 显示，或加命令行开关 `--visible`。
> 本程序由 MCP 客户端自动拉起，**不是双击就用的桌面程序**；双击只用来查看版权信息与按本机路径生成的客户端配置（本版**免费发布，无需激活**）。

---

## 一、接入（三步）

### ① 解压到位

本版**免费发布，无需激活**（没有卡密、机器码，也没有 `license.json`）。解压后直接做第 ② 步即可。

### ② 写入 MCP 客户端配置

**不用手填路径。** 先让程序自己生成 —— 任选一种：

- **双击 `AI-Fbowser-Mcp.exe`**：打印版权信息后紧跟一段**按本机路径生成好**的客户端配置 JSON，复制走即可；
- 或在 cmd / PowerShell 里运行（等义开关 `--dump-config`，可重定向落盘）：

```
AI-Fbowser-Mcp.exe --print-config
AI-Fbowser-Mcp.exe --print-config > mcp.json
```

`--print-config` 是**一次性模式**：把 JSON 写到 stdout 后立即退出，**不启动 MCP 服务、不建浏览器、不占桌面**。

把打印出来的整段 JSON 写进客户端的 MCP 配置文件（Cursor、Claude Desktop 及任何 MCP 客户端通用，各客户端设置里都有对应的 MCP 配置入口）。内容形如：

```json
{
  "mcpServers": {
    "ai-browser": {
      "command": "<本机 exe 真实完整路径，由 --print-config 自动填好>",
      "args": ["--mcp-stdio"]
    }
  }
}
```

> ⚠️ 上面 `command` 里的尖括号内容是**说明**，不是可用的路径 —— 请务必用 `--print-config` / 双击打印出来的那一份，不要手写 `D:/你的解压路径` 这类占位符（路径含空格时用正斜杠 `/` 或双反斜杠 `\\`）。

不需要 node，不需要端口，不需要环境变量。

### ③ 重启客户端并确认

重启 MCP 客户端后，让 AI 调用 `mcp_help`（不带参数），能看到 351 个工具的清单即为接入成功。
（`mcp_tools_list` 列的是 `mcp-tools\` 扩展目录里的**外部**工具，与这 351 个内置工具无关，别拿它做接入验证。）

---

## 二、授权说明（免费版）

**本版免费发布，无需任何激活步骤。** 程序启动没有任何授权前置条件：不存在卡密、机器码绑定与
`license.json`，也没有 `--activate-card` / `--check-card` / `--license-status` 这些命令行开关，
环境变量 `AIB_CARD_CODE` 与 stdio 首行 `AIB-AUTH` 握手同样已移除。

| 命令 | 作用 |
|------|------|
| `AI-Fbowser-Mcp.exe`（双击，不带参数） | 打印版权信息 + 按本机路径生成的客户端配置 JSON，按任意键退出 |
| `AI-Fbowser-Mcp.exe --mcp-stdio` | 正常服务模式，由 MCP 客户端拉起 |
| `AI-Fbowser-Mcp.exe --print-config` | **一次性打印客户端配置 JSON 后退出**：把**本机真实 exe 绝对路径**填好，输出到 stdout。**不启动服务、不建浏览器、不占桌面**。可 `> mcp.json` 落盘 |
| `AI-Fbowser-Mcp.exe --dump-config` | `--print-config` 的等义开关，行为完全相同 |
| `AI-Fbowser-Mcp.exe --visible` | 主窗口**保持可见**（不隐藏），覆盖 `start_hidden` |
| `AI-Fbowser-Mcp.exe --show-window` | `--visible` 的等义开关，行为完全相同 |
| `AI-Fbowser-Mcp.exe --hidden` | 强制隐藏主窗口，覆盖 `start_hidden: false` |

> 窗口开关的优先级：**命令行 > `mcp_config.json` > 内置默认（隐藏）**。
> 三种窗口开关都只在启动时判定一次，运行期改用工具 `browser_show_window {visible:true|false}`。

> 程序内部仍保留一项**第三方**授权：FBrowser(CEF) 类库自己的 VIP 注册码（作者已购买永久版，内置在 exe 常量里）。
> 那是上游类库的授权凭证，与本产品的卡密无关；用户既不需要也无法配置它。

版权与联系方式：Copyright (C) 2026 小刀(Xiaodao) · 作者 QQ 212577526 · VX XSMZAS1 · QQ 群 280742938
打个广告：更多定制功能请联系 QQ 212577526 / VX XSMZAS1

---

## 三、随包文件（exe 同目录）

| 文件 | 说明 |
|------|------|
| `AI-Fbowser-Mcp.exe` | 主程序，由 MCP 客户端以 `--mcp-stdio` 拉起 |
| `index.html` | 本地欢迎页 / HTML 版文档。**浏览器窗口被显示时**载入它 —— 窗口默认隐藏，所以启动时看不到；用 `browser_show_window {visible:true}` 显示窗口即能看到 |
| `mcp_config.json` | 运行配置，字段见第四节 |
| `mcp_config.README.md` | 配置文件说明 |
| `workflows/` | 工作流 JSON，由 `workflow_*` 工具读取 |
| `docs/` | 本说明书及客户手册等文档 |
| `*.dll`、`*.pak`、`locales/`、`FBroSubprocess.exe` | CEF 运行库，勿删、勿改名、勿与 exe 分离 |

---

## 四、mcp_config.json

用记事本等文本编辑器修改 exe 同目录的 `mcp_config.json`。**改完不会自动生效**：让 AI 调用 `browser_shutdown` 结束进程，再由 MCP 客户端重连（重启客户端）即按新配置启动。

现行版本读取的字段：

```json
{
  "enable_network_log": true,
  "enable_console_log": false,
  "enable_response_cache": false,
  "network_log_max_bytes": 262144,
  "auto_download_save": true,
  "auto_dismiss_js_dialog": false,
  "window_topmost": true,
  "start_hidden": true,
  "exit_on_window_close": false,
  "enable_media_stream": false,
  "enable_speech_input": false,
  "enable_autoplay": false,
  "disable_gpu": false,
  "disable_gpu_cache": false,
  "ignore_gpu_blocklist": false,
  "enable_cross_frame": false,
  "disable_proxy": false,
  "startup_switches": {}
}
```

### 4.1 运行期字段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enable_network_log` | bool | `true` | 启动即记录网络请求/响应（URL / method / status / headers）。逆向分析建议开启 |
| `enable_console_log` | bool | `false` | 采集页面控制台消息 |
| `enable_response_cache` | bool | `false` | SQLite 响应缓存，配合 `browser_intercept` 的 cache 动作 |
| `network_log_max_bytes` | int | `262144` | 单条 `network_detail` JSON 的最大字符数 |
| `auto_download_save` | bool | `true` | 下载是否自动保存 |
| `auto_dismiss_js_dialog` | bool | `false` | 是否自动关闭 alert / confirm 等 JS 对话框 |
| `window_topmost` | bool | `true` | 浏览器窗口是否置顶 |
| `start_hidden` | bool | **`true`** | **主浏览器窗口是否隐藏**（v3.3.2 新增）。默认 `true` = 窗口创建后**立即隐藏、不占桌面**（用户在后台照常干活）；**写 `false` 才保持可见**（桌面上会常驻一个窗口）。被销毁后自动重建的窗口同样隐藏；自愈路径临时显示的窗口闲置 8 秒后自动收起。运行期可用 `browser_show_window {visible:true}` 随时显示。命令行 `--visible` / `--show-window` 强制可见、`--hidden` 强制隐藏，优先级高于本键 |
| `exit_on_window_close` | bool | **`false`** | **点窗口右上角 X 时的语义**（v3.3.2 新增）。默认 `false` = 只**隐藏窗口**，MCP 服务继续可用（桌面立刻干净、工具不断线）；**写 `true` 才随 X 整体优雅退出**（与 `browser_shutdown` 同一路径）。启动读取一次，改动后需重连 |

网络日志记录 URL / method / status / headers；`network_detail` 对 POST / PUT / PATCH 还会写入请求体 `post_body` 与 `post_body_size`，**上限 64KB（65536 字节）**，超限按字节安全截断并在末尾加 `...[截断]`。

### 4.2 启动期字段（**仅在进程启动时读取一次，改动后必须 `browser_shutdown` 后重连**）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enable_media_stream` | bool | `false` | 放开摄像头 / 麦克风媒体流采集 |
| `enable_speech_input` | bool | `false` | 放开语音输入 / 麦克风采集 |
| `enable_autoplay` | bool | `false` | 放开带声自动播放 |
| `disable_gpu` | bool | `false` | GPU 异常时的排障开关（渲染 / 截图可能变慢） |
| `disable_gpu_cache` | bool | `false` | 绕开 GPU 着色器缓存损坏 |
| `ignore_gpu_blocklist` | bool | `false` | 强制启用被内核拉黑的 GPU |
| `enable_cross_frame` | bool | `false` | 解除「框架之间不能直接操作」的内核限制（**不改同源策略**）。类库自述此模式存在不安全性，建议按需短开、用完改回 `false` |
| `disable_proxy` | bool | `false` | 关闭代理，**连 Windows 系统自动检测代理一起关掉**（`browser_clear_proxy` 做不到这一点）。用于代理设坏导致全站打不开时的排障 |
| `startup_switches` | object | `{}` | 受控的「名 → 值」白名单表，见下 |
| `dpi_aware` | bool | `false` | 进程级 DPI 感知（按显示器感知 V2）：HiDPI 屏上窗口不再被位图拉伸。副作用：窗口尺寸按**物理像素**解释，CSS 视口变小，坐标类工具的观测值随之变化 |
| `v8_max_stack_mb` | int | `0` | >0 时设定渲染进程 V8 堆上限（校验 1~4096；32 位构建 ≤4000）。注意它是**设定值**而非"只放宽"：本机 x64 默认已约 4GB，写 1024 会把它压到约 1GB；`0` = 内核默认 |

`startup_switches` **只接受 4 个写死的名字**：

| 名 | 值要求 |
|----|--------|
| `lang` | 语言标签，≤32 字符 |
| `force-device-scale-factor` | 0.5 ~ 4 之间 |
| `disable-blink-features` | 只允许字母 / 数字 / 下划线 / 连字符 / 逗号 |
| `disable-features` | 同上 |

白名单内的名但值非法的条目不生效，并会如实记入回执 `rejected_switches`；不在白名单里的名一律忽略。

```json
{
  "enable_cross_frame": false,
  "startup_switches": { "lang": "zh-CN", "force-device-scale-factor": "1.25" }
}
```

启动结果自查：调用 `browser_startup_args`，回执含 `applied_switches`（实际生效的开关）、`command_line_raw`（内核命令行原文）、`name_value_switches`（通过校验的名值对）、`rejected_switches`（被拒条目）。

### 4.3 限流字段（**仍然生效**）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `rate_limit_per_minute` | int | `0` | 每分钟请求上限。`0` = 不限速（随包默认，本地桌面无需限速）；`>0` 时超限请求会被拒，返回错误码 `-32000`「请求过于频繁」并附 `Retry-After` 秒数。**它不是历史遗留键，改动确实生效** |
| `tool_profile` | string | `"all"` | **v3.3.4 新增**：控制 `tools/list` 暴露面，直接降低每次会话的上下文 token。`all` = 全部工具（兼容旧行为）；`core` = 日常浏览器自动化（约 100 个）；`reverse` = 核心 + 逆向/指纹/网络；`debug` = 核心 + 调试/内核/逆向。只裁剪列表，隐藏工具仍可被显式调用。改后需重启进程 |
| `allow_cloud_metadata_endpoints` | bool | `false` | **v3.3.4 新增**：默认拒绝云元数据端点（`169.254.169.254` / `metadata.google.internal` / `metadata.azure.com`），降低 SSRF 读取实例凭据的风险；本地/内网其它地址仍放行。确需访问时显式设 `true`。改后需重启进程 |

### 4.4 早期 HTTP 模式的遗留字段（读取但**不产生任何实际作用**）

`mcp_config.json` 里可能还留着下面这些键，来自早期 HTTP 服务模式的端口与鉴权配置。现行版本没有 HTTP 端点，**保留或删除都不影响功能**：

| 字段 | 现状 |
|------|------|
| `port` | 仍被读取，但程序不监听任何端口，无对象可绑 |
| `bind_address` | 仍被读取；填了非空值会打印一条「未启用 API 认证」的安全警告（只是提示，不改变行为） |
| `api_key` | 仍被读取；认证闸门已整体停用（`是否启用认证` 写死为假），设置了只会在启动时打印「已忽略配置中的 api_key」 |
| `disable_auth` | 同上，随认证闸门一并停用 |

---

## 五、工作流

| 路径 | 说明 |
|------|------|
| `workflows/*.json` | 工作流定义文件，随包提供，可自行增加 |
| `AI_BROWSER_WORKFLOWS_DIR` | 环境变量，覆盖工作流目录 |
| `workflow_list` / `workflow_get` / `workflow_run` / `workflow_stop` | 工作流工具 |

---

## 六、工具调用通用参数

所有 `browser_*` 工具的 `arguments` 由入口统一处理，均支持：

| 参数 | 说明 |
|------|------|
| `async_only: true` | 强制异步。**跳过等待型**命令（`browser_navigate` / `back` / `forward` / `reload`）只立即回执成功、**不返回 `task_id`**（没有 id 可查）；其余命令返回 `task_id` |
| `sync_wait: true` | 强制同步等待结果 |
| `max_ms: N` | 同步等待 / 异步轮询超时（毫秒） |
| `browser_id` | 多浏览器时指定目标浏览器 |

- 工具名双路由：`browser_navigate` ≡ `browser.navigate`。
- 工具总数为 **351**（336 个 `browser_*` + 15 个管理类）。查清单用 `mcp_help`；`mcp_tools_list` / `mcp_tools_set` 管的是 `mcp-tools\` 扩展目录里的外部工具，不是这 351 个。
- 超大内容（整段二进制、大请求体）不要塞进 `arguments`，改用文件类参数，例如 `browser_create_url_request {body_file:"D:\\path\\big.bin"}`。

---

## 七、常见问题

| 现象 | 处理 |
|------|------|
| 双击 exe 一闪而过 / 没反应 | **这不是正常现象**。正常双击会打印版权信息 + 按本机路径生成的客户端配置 JSON，然后停在「按任意键退出…」等你按键（见第二节）。一闪而过多半是同目录缺 `*.dll` / `*.pak` / `locales\` 等内核文件，或被安全软件拦截 |
| 客户端里工具为空 | 确认配置里的 `command` 指向 `AI-Fbowser-Mcp.exe`、`args` 为 `["--mcp-stdio"]`；路径含空格或中文时用正斜杠或双反斜杠 |
| 工具调用报未授权 | 本版**免费发布、没有任何激活流程**，不存在"未授权"这类错误，也没有 `--license-status` 开关。若回执确实提到授权，那是指第三方 FBrowser(CEF) 类库的 VIP 注册码（已内置在 exe 常量里，用户无需也无法配置） |
| 连不上、报 `ECONNREFUSED` | `mcp_bridge.js` 与端口接入方式均已废弃（程序不监听任何端口）。改用第一节的 stdio 配置 |
| 改了 `mcp_config.json` 不生效 | 让 AI 调用 `browser_shutdown`，然后重连（重启客户端） |
| `browsers: 0` | 等待 GUI 创建主浏览器，或用 `browser_list` 查看存活清单 |
| 网络列表为空 | 需要 `enable_network_log: true`，或先 enable 再导航 |
| 高级功能（CDP / 指纹 / 逆向等）报错 | 按回执原因排查：多为**目标页未加载**、**CDP 通道未就绪**或**改了启动期配置未重启进程**。先用 `browser_status`、`browser_get_url` 确认现场，再重试；CDP 类工具报错时可用 `browser_cdp_call` 探一下通道是否存活 |
| `mouse_move` 变慢 | 正常：**窗口默认就是隐藏的**（见 4.1 `start_hidden`），窗口不可见时渲染器被浏览器后台化节流。调用 `browser_show_window {visible:true}` 显示窗口即恢复 |
| `mouse_wheel` / `touch_*` 立即失败 | **默认隐藏窗口时**这两类事件不会返回，程序按设计快速失败（不是通道故障）。显示窗口后重试即可；要长期免打扰可在配置里写 `"start_hidden": false` 或启动时加 `--visible` |

---

## 八、相关文档

- [客户使用手册.md](./客户使用手册.md) — 面向终端客户的安装与使用
- [小白使用指南.md](./小白使用指南.md) — 零基础入门
- [智能体开发指南.md](./智能体开发指南.md) — 智能体侧接入与开发
- [index.html](./index.html) — HTML 版文档
