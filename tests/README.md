# tests/ · 回归套件

单一入口（推荐）：

```powershell
.\run-tests.ps1 -Exe "C:\path\to\AI-Fbowser-Mcp.exe"            # 全套
.\run-tests.ps1 -Exe "..." -Suite pool                          # 只跑某一套
.\run-tests.ps1 -Exe "..." -Suite all -PerCall 30000
```

或直接调 node：

```powershell
node tests\mcp-suite.mjs --exe <exe> --suite all --large-wait 25000
```

退出码：`0` 全部通过；`1` 有失败项；`2` 参数/exe 问题。

## 套件
| 套件 | 覆盖 |
|---|---|
| `sweep` | `tools/list` 工具数 + 逐工具空参调用：回执/协议错/非法 JSON/无回包 分类统计，失败即写 `sweep-<ts>.json` |
| `frames` | 帧族 P1–P8：CL ×3、帧体含空白、裸行 ×3、参数含字面量 `Content-Length:`、管线化两条 CL、裸行含 NUL → `-32700` 后仍可服务、CL 偏大/偏小 → 显式 `-32700` + 优雅退出 |
| `transport` | 基线三连发；CL 声明**小于**/**大于**实际 两向均不永久挂起 |
| `pool` | 工作池饱和：3 条长工具占满后，`tools/list` 读线程快答（<1000ms）、`ping` 快答、第 4 条 `tools/call` 不被静默排队 |
| `cdp` | CDP 层诚实性：不可序列化值**如实回报**且注明"不会回退重跑"，紧随的正常表达式仍走 CDP（通道未被判死） |
| `matrix` | 客户端兼容矩阵：CL(CRLF) / CL(仅 LF) / 裸行 三种帧风格 × 协议版本(2024-11-05 / 2025-06-18 / 伪造版本) × 丰富握手(capabilities/roots/sampling)，每种都要求握手 + tools/list(348) + 真实工具调用成功 |
| `soak` | 浸泡 + 资源曲线（`--minutes`，默认 5）：6 种作业轮转 + 每 15s 采样工作集/私有字节/句柄/线程，断言无明显单调增长、无回包为 0、结束仍存活 |

## 三个必须知道的坑（都是踩过的）
1. **请在副本上跑**：套件启动前会清理 exe 同目录的 `mcp_cache.db*`；直接对着正在服务的运行目录跑会扰动线上。
   制作副本时可忽略 `CacheData` 下 3 个被占用文件（浏览器 Cookie/Session），不影响测试。
2. **CL 声明大于实际的判定窗口约 19 秒**：`--large-wait`（默认 25000ms）就是为它准备的。
   用 2.5 秒等待会把"正常等待窗口"误判成"永久挂起"——这是测试自身的 bug，不是产品缺陷。
3. **stderr 是 GBK(CP936)**：断言中文必须 `new TextDecoder('gbk')`，否则全是替换符；CL 模式的回包**无尾随换行**，
   必须按 `Content-Length` 解析而不是按行切。

## 浸泡（soak）说明
- 采样走 `powershell.exe Get-Process`（`tests/mcp-suite.mjs` 内 `sampleProc`），**需要 PowerShell 可用**；采样失败会退化为"采样点不足"失败项。
- 阈值是**冒烟级**：工作集增长 <150MB、句柄增长 <200。它只能发现"明显单调增长"，**不能证明无泄漏**。
- 判读经验：本机实测 6 分钟 2512 次作业 → 工作集约 128MB 起、**前 2 分钟抬升到 ~152MB 后走平**，句柄在 1208–1220 震荡 ⇒ 属**预热/缓存分配**，非泄漏趋势。