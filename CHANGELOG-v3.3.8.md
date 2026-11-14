# CHANGELOG v3.3.8（2026-11-14）

本版基于 v3.3.7，聚焦 **AI 调用可用性**：修掉参数闸门的两类误拒，并给失败调用补上可检索的运行日志。

## 参数闸门误拒（round 153）

- `browser_evaluate` 新增 `frame_id`：可在指定 iframe 内求值（CDP 隔离世界）。
  此前 schema 未声明、实现也写死主框架上下文，导致合法调用被拒且子框架取不到内容。
- `browser_kernel_cdp_monitor` 新增 `limit`：
  `add` 时无 `max` 则作为缓存上限；`list` 时作为每页条数（1–1000 钳制）。
- 未知参数白名单补充跨工具高频键：`frame_id / frameId / limit / offset / before_id / world`。
- 真拼写错误（`URL`、`Url`、`script`、`command` 等）仍按原样拒绝。

## 工具失败日志（round 154）

- tools/call 返回 `success=false` 时写一条 `[TOOLFAIL]` 到 `mcp_console.log`（同时输出 stderr）：

  ```
  [TOOLFAIL] {"ts":"4003808596504","tool":"browser_evaluate","ms":47,"browser_id":0,"args":"code","error":"JS异常:..."}
  ```

- 只记录参数**键名**，不记录值；错误文本截断 400 字符。
- 覆盖：参数闸门拒绝、工具执行失败、JS 脚本异常；成功调用不写。
- `mcp_console.log` 滚动从“进程启动时检查”改为**每次写入前检查**：
  超过 8 MB 自动滚为 `mcp_console.log.1`（仅保留一代，总占用约 ≤16 MB），长驻进程也不会无限增长。

## 构建与验证

| 项 | x64 | x86 |
|---|---|---|
| 编译 | 0 警告 0 错误 | 0 警告 0 错误 |
| exe 字节 | 10,504,192 | 8,673,280 |
| exe MD5 | `534AEF4CE157216626BC322FBC23FF10` | `4300CCC5F28E84739E374307DCBD3597` |
| exe SHA256 | `2BEE728F2BC4AEC7B186770C51B6F0269190FB996EEDF1BC07A848BB1C93DA5A` | `0EA47AF91B5BBB1D1574C64A0597D2B6791108041012686E55E0B8C872616329` |

测试：

- 参数回归 5/5：`cdp_monitor+limit`（list/add）通过、`evaluate+frame_id` 返回 `2`、
  缺失框架明确报错、`navigate {URL}` 仍被拒。
- iframe 实测：`evaluate {frame_id}` 返回 `INNER_TITLE` / `INNER_BODY`，与 `execute_js` 一致。
- 失败日志实测：未知参数与 JS 异常各落一条 `[TOOLFAIL]`；成功调用不落。
- 滚动实测：日志 9,437,184 B 时自动滚为 `.1`，新日志 3,477 B。
- `mcp-suite --suite sweep`：351/351 回执、schema `BAD=0`、defect 0。

## 发布包

| 架构 | 文件 | 字节 | SHA256 |
|---|---|---|---|
| x64 | `xiaodao-ai-browser-mcp-v3.3.8-x64.zip` | 167,954,765 | `2EF7D3AD4C98E871E03BE44845F62B8E0729FED57A4519F020113899F4A79CC6` |
| x86 | `xiaodao-ai-browser-mcp-v3.3.8-x86.zip` | 145,898,523 | `CA23DEF99B41A0A6F9E267173472E586456AD693E54BEF834B17539E72A9FFBE` |

## 升级说明

- 直接替换 `AI-Fbowser-Mcp.exe` 即可；不要与旧版 CEF 运行库混用位数。
- `mcp_cache.db` 兼容旧版；如需干净重采，删除后重启。
- 查看失败日志：`Select-String -Path mcp_console.log -Pattern '\[TOOLFAIL\]' -Encoding Default`。
