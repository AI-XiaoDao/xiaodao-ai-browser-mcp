# AI Browser MCP — Quick Start (English)

> **Windows local browser automation MCP server** — 351 tools for Cursor, Claude Desktop, Cline, or any MCP client.

## What is this?

**AI Browser MCP Server** (AI浏览器 MCP) exposes a real **Google Chromium (CEF)** browser on Windows via the **Model Context Protocol (MCP)**. Instead of writing **Playwright** or **Puppeteer** scripts, your AI agent calls **351 ready-made MCP tools** (334 named `browser_*`, the rest are `mcp_*` / `workflow_*` / `ping` / `batch` / `schedule` / `aliases` helpers) over **stdio**.

**One instruction → auto-run:** web scraping · reverse POST fields · locate sign algorithms with the CDP debugger · form automation.

> ⚠️ This is **not** a double-click-and-use app. It is an MCP server **launched by your AI client**.
> Double-clicking only shows the copyright notice and a ready-to-copy client config. It **listens on no ports**.
> 🪟 **The browser window is hidden by default and takes up no desktop space** (since v3.3.2) — not seeing a
> window is expected behaviour, not a broken install. To keep it visible, launch with `--visible`
> (alias `--show-window`) or set `"start_hidden": false`; to peek at it at runtime call
> `browser_show_window {visible:true}`. Clicking the window's X only **hides** the window by default and the
> MCP keeps running (set `"exit_on_window_close": true` to make X quit the whole process).
> **This release is free — no license key, no machine code, no activation step.**

## 3-step setup

**1) Unzip** — extract the package. **Do not copy the exe alone** — the `.dll` / `.pak` / `locales/` files next to it are the browser engine.

**2) (Optional) Double-click `AI-Fbowser-Mcp.exe`** — it prints the copyright notice plus a **ready-to-copy client config JSON** with your local exe path filled in.
(Equivalent: run `AI-Fbowser-Mcp.exe --print-config` — prints the config and exits; it does **not** start the server, create a browser, or occupy the desktop. Redirect it with `> mcp.json` if you like.)

**3) Connect your AI client** — Cursor → Settings → MCP → Add server, pasting **the whole JSON printed in step 2**:

```json
{
  "mcpServers": {
    "ai-browser": {
      "command": "<your real exe path — filled in automatically by double-click / --print-config>",
      "args": ["--mcp-stdio"]
    }
  }
}
```

> ⚠️ The angle brackets are **placeholders for explanation**, not a usable path — do **not** hand-write
> paths like `D:/your/path/...`; always paste what the program printed.

Fully restart Cursor. You should see `browser_navigate`, `browser_snapshot`, etc.

> ✅ That's all — **no port, no bridge script, no environment variables.**

## Example prompts (copy to Cursor)

```
Scroll the product list and scrape title + price into a JSON array.

Open https://example.com and scan XHR/fetch POST requests for suspected encrypted fields.

Set a breakpoint on form submit and locate the JS function that computes sign; show source snippet.

Log in with user test / pass 124356, go to order list, export first 20 rows as a table.
```

## vs Playwright / Puppeteer

| | Playwright DIY | AI Browser MCP |
|--|----------------|----------------|
| Setup | Node + drivers + scripts | Download exe + 3-step setup |
| AI | Agent writes code each time | **351 MCP tools** pre-built |
| Reverse / debug | Manual Hook + DevTools | Built-in inject + **CDP debugger** |
| Privacy | Varies | **Fully local, opens no ports** |

## Docs

| Doc | Link |
|-----|------|
| Full README | [README.md](README.md) |
| Tool reference | [index.html](./index.html) |
