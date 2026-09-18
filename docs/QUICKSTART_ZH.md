# 快速上手（中文）

## 1. 取得成品
到 [Releases](../../releases) 下载 `xiaodao-ai-browser-mcp-v3.3.3-x64.zip`（64 位 Windows）或 `-x86-`（32 位），解压到任意目录。

## 2. 生成客户端配置
在该目录打开命令行执行：

```bat
AI-Fbowser-Mcp.exe --print-config
```

会输出一段**可直接粘贴**的 `mcpServers` JSON，`command` 已自动填成**本机真实路径**（无需手改路径）。

## 3. 粘贴到你的 MCP 客户端
把输出的 JSON 合并进客户端配置（Claude Desktop / Cursor / Trae / DSH 等均用同一形状），重启客户端。

## 4. 验证
在客户端里调用 `ping` 工具，应返回 `{"pong":…,"version":"3.3.3"}`；`tools/list` 应有 **348** 个工具。

## 可选：日志改 UTF-8
非中文 Windows 或希望日志统一 UTF-8 时，在客户端配置的本服务条目里加环境变量：

```json
"env": { "AI_BROWSER_MCP_STDERR_UTF8": "1" }
```

默认（不设）为 936/GBK，与中文 Windows 控制台一致。