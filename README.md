# 小刀AI智能体定制版 · AI浏览器 MCP Server

> 内置 AI 智能体 + **347 个浏览器自动化工具**，纯本地 stdio
> **免费发布 · 无需卡密 · 解压即用**

**⬇️ [下载最新版](../../releases/latest)**

---

## 这是什么

一个 Windows 本地的 **AI 浏览器自动化 MCP 服务器**：内嵌 FBrowser（CEF）真实浏览器内核，通过标准 **MCP 协议（JSON-RPC 2.0 over stdio）** 对外提供 **347 个 `browser_*` 工具**。

任何支持 MCP 的客户端（Cursor / Claude Desktop / Cline / Windsurf / Codex）使用**同一套配置**即可接入，没有客户端专属步骤。

```
你的智能体（AI 大脑）
      │   MCP 协议（JSON-RPC 2.0，仅 stdio 通道）
      ▼
AI-Fbowser-Mcp.exe  ←── FBrowser CEF 内核 + 347 个工具
      │
      ▼
真实浏览器窗口 / 网页 / 网络请求
```

### 关键特性

| 项 | 值 |
|---|---|
| 平台 | Windows 10 / 11 x64 |
| 内核 | FBrowser（CEF / Chromium）——**真实浏览器**，非无头模拟 |
| 传输 | **仅 stdio**：不监听任何端口，无 HTTP / WebSocket 端点 |
| 工具数 | **347 个 `browser_*` 工具** |
| 授权 | **免费发布**：无卡密、无机器码、无任何激活步骤 |
| 隐私 | 网页数据 / Cookie / 缓存全部留在本机 `CacheData` 目录，可随时删除 |

### 能力覆盖

| 领域 | 代表工具 | 用途 |
|---|---|---|
| 导航 / 页面 | `browser_navigate` `browser_reload` | 打开网页、取状态 |
| 内容提取 | `browser_get_text` `browser_extract` `browser_scrape` | 正文 / 链接 / 表格 / 一步爬虫 |
| JS / DOM / 填表 | `browser_execute_js` `browser_fill_form` `browser_snapshot` | 页面级自动化、RPA 填表 |
| 输入模拟 | `browser_mouse_click` `browser_key_event` `browser_touch_*` | 鼠标 / 键盘 / 触摸 |
| 网络 | `browser_network` `browser_intercept` `browser_network_body` | 抓包、拦截、改包 |
| JS 逆向 | `browser_reverse_hook` `browser_debugger_*` | Hook 加密函数、断点、找算法 |
| 指纹反检测 | `browser_fingerprint` `browser_antidetect_presets` | Canvas / WebGL / UA / 时区 / WebRTC |
| 工作流 | `workflow_run` `workflow_list` | 用 JSON 编排多步操作 |
| 系统 | `browser_screenshot` `browser_print_to_pdf` `ping` | 截图、PDF、连通检查 |

> 💡 **347 个工具不要通读。** 让 AI 用 `mcp_help {query:"关键词"}` 搜索，再用 `mcp_help {tool:"名字"}` 取完整说明。

---

## 安装包内容

| 文件 | 说明 |
|---|---|
| `DSH安装器.exe` | 一键安装向导 |
| `AI-Browser-MCP-x64-v3.2.0.zip` | 浏览器 MCP 服务端（64 位） |
| `AI-Browser-MCP-x86-v3.2.0.zip` | 浏览器 MCP 服务端（32 位） |
| `DSH离线包-dsh0.1.5-rc.1-x64.zip` | 智能体运行时（离线可用） |
| `node-v22.23.2-win-x86.zip` · `node-v24.21.0-win-x64.zip` | 自带 Node 运行时——**不需要你装 Node.js** |
| `单独发启动器/` | `DSH启动器.exe` + `mcp_catalog.json` |
| `使用说明.txt` | 上手说明 |

> ⚠️ **解压后请不要把 exe 单独拷出来**：同目录的 `dll` / `pak` / `locales` 是浏览器内核，缺一不可。

---

## 三步上手

1. 从 [Releases](../../releases/latest) 下载安装包，**完整解压**到任意目录
2. 双击 `启动AI智能体.bat`（或运行 `DSH安装器.exe`）
3. 在界面左下角「**设置 → 模型**」填入你自己的 DeepSeek API Key
   （申请地址：<https://platform.deepseek.com/api_keys>）

之后就可以直接说人话指挥它干活：

- 「打开百度首页，把热搜标题整理成表格」
- 「登录这个后台，把订单列表前 20 行导出」
- 「扫描这个页面的 XHR 请求，标出疑似加密的字段」

---

## 接入到自己的 MCP 客户端

```json
{
  "mcpServers": {
    "ai-browser": {
      "command": "D:/你的解压路径/AI-Fbowser-Mcp.exe",
      "args": ["--mcp-stdio"]
    }
  }
}
```

✅ **不需要 node、不需要端口、不需要桥接脚本、不需要环境变量。**
重启客户端后，MCP 工具列表里出现 `ai-browser` 的 347 个工具即为接入成功。

### 自己写 Agent 骨架

用 `spawn` 拉起进程，走 stdin/stdout 收发 JSON-RPC 2.0（每行一帧）：

```js
const { spawn } = require('child_process');
const p = spawn('C:/你的路径/AI-Fbowser-Mcp.exe', ['--mcp-stdio']);
const send = o => p.stdin.write(JSON.stringify(o) + '\n');

send({ jsonrpc: '2.0', id: 1, method: 'initialize',
       params: { protocolVersion: '2025-06-18', capabilities: {},
                 clientInfo: { name: 'myagent', version: '1' } } });
send({ jsonrpc: '2.0', method: 'notifications/initialized' });
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
send({ jsonrpc: '2.0', id: 3, method: 'tools/call',
       params: { name: 'browser_navigate', arguments: { url: 'https://example.com' } } });
```

---

## 常见问题

| 现象 | 处理 |
|---|---|
| 双击 exe 一闪而过 / 没反应 | **正常现象**。程序由 MCP 客户端以 `--mcp-stdio` 拉起；双击只用于查看版权信息与客户端配置 |
| 客户端里工具为空 | 确认 `command` 指向 `AI-Fbowser-Mcp.exe`、`args` 为 `["--mcp-stdio"]`；路径含空格或中文时用正斜杠 `/` 或双反斜杠 `\\` |
| 改了 `mcp_config.json` 不生效 | 让 AI 调 `browser_shutdown` 结束进程，再由客户端重连（启动期字段只在进程启动时读一次） |
| 看不到 POST 请求体 | 默认网络日志只记 URL / method / status / headers，**不含 POST body**；用 Hook 注入或 `browser_network detail_enable` |
| 连不上、报 `ECONNREFUSED` | 你看的是旧文档：`mcp_bridge.js` 与端口接入方式**均已废弃**，现行版本不监听任何端口 |
| 窗口隐藏后 `mouse_move` 变慢 | 正常：窗口不可见时渲染器被后台化节流，`browser_show_window {visible:true}` 即恢复 |

---

## 版权与联系

Copyright (C) 2026 小刀(Xiaodao). 保留所有权利。
内置的 FBrowser CEF 类库授权归其厂商所有。

- 作者 QQ：**212577526**
- 微信：**XSMZAS1**
- 交流 QQ 群：**280742938**

> 打个广告：更多定制功能请联系 QQ 212577526 / VX XSMZAS1
