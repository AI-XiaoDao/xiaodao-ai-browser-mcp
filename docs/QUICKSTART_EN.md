# Quick Start (English)

## 1. Get the build
Download `xiaodao-ai-browser-mcp-v3.3.3-x64.zip` (64-bit Windows) or `-x86-` from [Releases](../../releases) and unzip it anywhere.

## 2. Generate the client config
In that folder run:

```bat
AI-Fbowser-Mcp.exe --print-config
```

It prints a ready-to-paste `mcpServers` JSON block whose `command` already points at the real local path.

## 3. Paste into your MCP client
Merge the JSON into your client config (Claude Desktop / Cursor / Trae / DSH share the same shape) and restart the client.

## 4. Verify
Call the `ping` tool: it should return `{"pong":…,"version":"3.3.3"}`. `tools/list` should report **348** tools.

## Optional: UTF-8 logs
On non-Chinese Windows, or if you want uniform UTF-8 logs, add an env var to this server entry:

```json
"env": { "AI_BROWSER_MCP_STDERR_UTF8": "1" }
```

Default (unset) is 936/GBK, matching Chinese Windows consoles.