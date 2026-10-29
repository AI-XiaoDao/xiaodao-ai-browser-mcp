# AI浏览器 MCP — 中文快速上手

> **Windows 本地浏览器自动化 MCP 服务器** — 351 个工具，支持 Cursor、Claude Desktop、Cline 及任意 MCP 客户端。
>
> 零基础用户请看：[快速使用指南](快速使用指南.md)（3 分钟上手）

## 这是什么？

**AI浏览器 MCP Server** 在 Windows 上运行真实 **Google Chromium（CEF）** 浏览器，通过 **Model Context Protocol（MCP）** 对外提供 **351 个工具**（其中 336 个 `browser_*`）。

无需手写 **Playwright / Puppeteer** 脚本 — 在 Cursor 里用**一条指令**完成：**网页数据采集**、**POST 逆向 Hook**、**CDP 断点定位 sign 算法**、**自动填表 RPA**。

> ⚠️ 它不是"双击就能用"的软件，而是**由 AI 客户端拉起的 MCP 服务器**。
> 双击只用来查看版权信息与客户端配置；它**不监听任何端口**。
> 🪟 **浏览器窗口默认隐藏、不占桌面**（v3.3.2 起）—— 找不到窗口是正常的，不是装坏了。
> 想常显：启动加 `--visible`（等义 `--show-window`）或配置写 `"start_hidden": false`；临时看一眼：`browser_show_window {visible:true}`。
> 手动点窗口 X 默认只**隐藏窗口**、服务继续跑（要"点 X 就退出"写 `"exit_on_window_close": true`）。
> **本版免费发布：解压即用，没有卡密、没有机器码、没有任何激活步骤。**

## 三步上手

**1) 解压** — 解压下载的压缩包。**别只把 exe 单独拷出来** —— 同目录的 `.dll` / `.pak` / `locales/` 是浏览器内核。

**2) 看一眼版权与配置（可选）** — 双击 `AI-Fbowser-Mcp.exe`，窗口打印版权信息 + **按你电脑路径生成好的客户端配置 JSON**，复制走即可。（等价做法：命令行 `AI-Fbowser-Mcp.exe --print-config` —— 只打印配置就退出，不启动服务、不占桌面，可 `> mcp.json` 落盘。）

**3) 配置 Cursor** — Cursor 设置 → MCP → 添加服务器，**粘贴上一步打印出来的整段 JSON**：

```json
{
  "mcpServers": {
    "ai-browser": {
      "command": "<你本机 exe 的真实路径 —— 由双击 / --print-config 自动填好>",
      "args": ["--mcp-stdio"]
    }
  }
}
```

> ⚠️ 尖括号里是**说明文字**，不是可用路径 —— 别手写 `D:/你的路径` 这类占位符，用程序打印的那一份。

保存后**完全重启 Cursor**。看到 `browser_navigate`、`browser_snapshot` 等工具就是成功了。

> ✅ 就这三行 —— **不需要端口、不需要桥接脚本、不需要环境变量。**

## 示例指令（复制到 Cursor）

```
滚动商品列表，把标题和价格采成 JSON 数组。

扫描 XHR/fetch 的 POST，标出疑似加密的字段并说明依据。

在登录提交时下断点，定位计算 sign 的 JS 函数，给源码片段。

用账号 test / 密码 124356 登录后台，导出订单表前 20 行。
```

## 与 Playwright 对比

| | 自建 Playwright | AI浏览器 MCP |
|--|----------------|--------------|
| 上手 | 写脚本、装环境 | 下载 exe + 三步接入 |
| AI | Agent 现写代码 | **351 个预封装 MCP 工具** |
| 逆向 | 手动 Hook | `browser_inject` + 场景脚本 |
| 隐私 | 视部署 | **纯本地，不开任何端口** |

## 相关文档

- [完整 README](README.md)
- [工具参考](./index.html)
