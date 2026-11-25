# CHANGELOG v3.3.9（2026-11-25）

本版聚焦 **CDP 假故障与多浏览器可用性**：修掉「空闲即判死」「一次超时放大成十分钟失败」
「切换附着后通道永久坏」「截图大载荷永远无法降级」等根因，并补齐 stdio 多实例缓存隔离。

## CDP 健康判定

- `取CDP通道健康()` 只在 `state=2`（探测失败后的 5s 冷却）返回假；空闲超过 60s 不再判死。
  修复闲置一分钟后第一次 `browser_evaluate` 直接 0ms 报「CDP 通道当前不可用」。
- 空闲时不再把调用方预算压到 4s/8s 探测预算；尊重调用方预算（上限 30s）。
- 卡死标记窗口由 10 分钟缩到 1 分钟，预算下限由 2s 提到 5s，避免一次偶发长任务放大成持续失败。
- `cdp_cooldown_remaining_ms` 统一按实际 5s 冷却计算（原按 30s 上报，口径不一致）。

## 多浏览器 CDP

- 改用原始 `开发者消息_发送消息`，由服务端自行写入 `{"id":<自有ID>,...}`。
  实测类库的 `执行方法` 会忽略调用方 ID、自行顺序分配；切换附着后计数器归零会导致映射整体错位。
- 允许 `browser_id` 变化时安全切换附着：`CDP切换锁` 串行化「注销旧观察者 → 注册新观察者」。
- x64 实测：`browser_id` 1↔2 连续 3 轮 `Browser.getVersion` 全成功；双浏览器截图均成功；
  12 路并发交替 1/2 全成功。

## 截图与载荷上限

- 400K CDP 封顶前移到 `处理CDP原始响应`，避免结果先被 512K 异步存储上限整体拒收，
  使上层无法按「超过安全上限」触发降级。
- 截图增加第二级降级：`jpeg60/1280×720` → `jpeg40/960×540/scale=1`。
  噪声页 1280×720 实测自动降到 jpeg40/960×540，226K 成功返回。
- 截图/类库回调在 base64 超过 480K 时自动落盘到 `shots/auto_shot_*.png`。

## 超时副作用与参数

- 非 JS 命令（截图、网络、DOM、输入等）超时不再发送 `Runtime.terminateExecution`，
  避免误杀页面脚本；仅 `Runtime.evaluate` / `Runtime.callFunctionOn` 超时才终止。
- `browser_evaluate` schema 补 `async_only`：长脚本可提交后立即拿 task_id，
  用 `mcp_result` / `tasks/result` 取结果。实测提交 `1+1` 后取回 `2`。

## 多实例

- stdio 模式仍允许多开，但默认 CEF 缓存目录被占用时，后启动实例自动改用
  `CacheData\GlobalData_Stdio_<pid>`，不再共用 profile/LOCK。
- 实测同一目录双进程：A `1+1=2`、B `2+2=4`、A `3+3=6`，缓存目录分别为
  `GlobalData_Stdio` 与 `GlobalData_Stdio_<pid>`，日志无 LOCK/profile 错误。

## 回归

- `cdp` 套件：4/4。
- `frames` 套件：10/10。
- `sweep`：351/351 有回执，`defect=0 / bad-json=0 / no-reply=0`。
- 空闲 65s 后 `browser_evaluate 1+1` → `2`；8 路并发 8/8。

## 构建

| 架构 | 字节 | MD5 | SHA256 |
|---|---|---|---|
| x64 | 10,509,824 | `8EFA43A354B13D42480D7BD4B053CE47` | `2E7BE609AC2131A88215CDF8AD9B9C24FC45B830CD01E30EC001D649F08FD90B` |
| x86 | 8,677,888 | `912CAA80DEB9A3F7AAA08493B179786C` | `46EE0E36AD7E834B5382BC5E6E3E1CFB1EDB4A411620985CBE04624CDF3A6B0F` |

两者均 0 警告 0 错误；x86 完整运行库包已实测 `sweep` 351/351、`cdp` 4/4 通过。

## 升级注意

- 直接替换 `AI-Fbowser-Mcp.exe` 即可；若同时升级类库，需整套替换
  `libcef.dll / FBrowserCEF3lib.dll / FBrowserVIP.dll / FBroSubprocess.exe`。
- `mcp_cache.db` 兼容旧版；多实例共享该库，任务 ID 含时间戳+随机盐+计数器。
- `via=library` 截图仍会让本会话 CDP 通道失效，不建议使用；默认 `via=cdp` 已支持大图自动降级。
