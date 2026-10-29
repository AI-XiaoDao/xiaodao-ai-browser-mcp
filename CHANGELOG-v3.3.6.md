# CHANGELOG v3.3.6（2026-10-28）

> 基线：v3.3.5（FBrowser 5.41.57 / x64）。本版聚焦扩展插件、DOM property、调用契约、
> 工作流/定时任务记忆、标准 Tasks 协议与首页版本漂移。

## 扩展插件

1. `browser_vip_load_extension` 提交前校验目录存在、`manifest.json` 存在且为合法 JSON、
   `manifest_version` 为 2/3、`name`/`version` 非空；CRX 校验文件存在与 `.crx` 扩展名。
2. 加载默认等待 `app_extension_loaded`/`create_failed` 事件（`wait_ms` 默认 3000，0=只提交），
   成功回包带 `extension_id/url/loaded`，超时回 `pending=true` 并给下一步。
3. 同一路径重复 load 默认返回 `already_loaded=true` 与已有 ID；`force:true` 才重新提交。
4. `browser_vip_unload_extension` 校验 ID 存在；进程内登记已卸载 ID，二次卸载/查询明确失败。
5. `browser_vip_extension_info` 增加 `found`，不存在/已卸载返回 isError；类库 `GetExtensionPath`
   卸载后仍返回缓存路径的限制已在回执说明。

## DOM / 表单 / 交互

6. `browser_dom_query` 支持 DOM property（`textContent/innerText/value/outerHTML/outerText/
   selectedIndex/checked/disabled/className`），空串用哨兵避免被 CDP 回退成 `"null"`，
   不存在的 property 明确报错。
7. `browser_dom_select` 提交前校验 `options.length`，越界索引不再回“已执行”。
8. `browser_fill_form` 区分“非法 JSON”和“空数组”，空数组明确要求至少 1 个字段。
9. `browser_element_action` 解析内层 `ok:false`，索引失效返回 isError。
10. `browser_find` 改用主框架文本节点统计，返回 `found/match_count`；程序化查找不触发
    `find_result` 回调的限制已写入描述。
11. `browser_get_frames`/`browser_frame_names` 不再把 CEF 内部 `framePath` 当 `name`，
    原值保留在 `frame_path`。

## 工作流 / 定时任务 / 任务协议

12. workflow `on_error=stop` 提前停止时，剩余步骤补 `skipped` 条目，`skipped_count` 与
    `total_steps` 对齐，并返回 `stop_reason=step_failed`。
13. `schedule list` 返回 `browser_id/target_alive/last_result`，关闭目标浏览器后可看出任务失效。
14. `schedule remove/enable/disable/run` 支持唯一 `name` 兜底；同名多条明确要求用 `job_...` id。
15. `tasks/list` 按 `Task.ttl=90000` 过滤旧任务；`tasks/result` 对 working 任务返回 -32002 错误，
    不再把 `_waiting` 占位标成 `resultType=complete`。

## 调用契约 / 文档

16. 新增 `browser_vip_extension_list`（本进程已加载扩展清单）；305 个依赖浏览器的工具统一声明可选
    `browser_id`（已有该参数的工具不重复），多浏览器场景 AI 可直接点名目标；静态校验 350 个工具 0 required/type 异常。
17. 欢迎页版本改为 `取欢迎页地址` 追加 `?v=3.3.6`，页面脚本覆盖 `#versionTag`、关于卡片、页脚；
    静态文本同步到 3.3.6（此前写死 3.3.4/3.3.1）。
18. `browser_navigate` 新增 `force_reload:true`（主框架已在目标 URL 时仍强制再载入）；
    `browser_scroll_by` 返回 `requested_*/actual_*/moved_*/effective`，不再把请求值当实际滚动量。
19. 空值/类型闸门：`workflow_run {steps:null}` 不再无回执退出；`browser_navigate`/`browser_create`/
    `browser_create_url_request` 对 `url` 数字/数组/对象/null 快速拒绝；`browser_fingerprint_check`
    的空主框架链式访问加守卫。

## fix43（2026-10-28）

20. **首页版本自证**：欢迎页 URL 追加 `&b=<exe 最后写入时间>`（进程内稳定），替换 exe 后缓存键必变；
    首页 JS 将 build 写入页脚与窗口标题；`browser_meta` 新增 `build`/`welcome_static_version`/
    `welcome_version_match`。实测 `...?v=3.3.6&b=20261028-111349`，`#versionTag=3.3.6`。
21. **并发 create 工作线程饥饿**：原 3 路并发 create 会 2 个 `<no reply>`、1 个握手覆盖，随后
    `browser_list` 无回执。改为 `创建进行中` 非阻塞串行标志：1 个成功，其余立即返回明确 busy
    （未排队/未创建/未覆盖握手）；实测 `browser_list` 正常、ping 14–22ms、3 路 batch 全成功。
22. **旧进程/旧缓存可区分**：`mcp_console.log` 中旧启动是 `v3.3.4` 且 URL 无 `?v=`；fix43 起日志/首页
    都带构建标识，用户可直接判断“是不是还在跑旧进程”。桌面目录更名为
    `AI-Browser-MCP-x64-v3.3.6-optimized`，旧路径保留 junction。

## fix45（2026-10-28）

23. **`browser_create_tab` 持锁等待**：原实现等待创建时一直占着 MCP执行锁，实测首个 `ping` 被拖到
    351ms；若 CEF 创建卡住会把 `ping`/`browser_list` 挡到 10s。改为等待期间释放/重取执行锁，
    实测 `ping` 31–43ms，tab 正常返回 `new_browser_id`。
24. **创建事件晚到导致 ID 串台/丢 ID**：`待创建新ID` 是共享握手字段，前一个后台浏览器的晚到事件会
    污染下一个 create/tab。已加 `ID > 建前最大ID`、`URL == 本次目标`、最多 1.5s 的有界等待；
    batch/workflow 嵌套 create 实测直接返回 id=3/5，batch 内 tab 返回 id=4 且 list 立即可见。
25. **下载终态 `saved_path` 空**：按 download_id 记住 `download_start.save_path`，终态空值时回填，
    并返回 `saved_path_source=download_start`；实测 download_complete 带完整落盘路径。

## fix46（2026-10-28）

26. **定时任务里 create 触发全服务无回执**：定时任务线程直接调 `执行浏览器命令` 却没持 `协议锁`；
    create 等待时“让出协议锁”对未持有的递归锁解锁，破坏所有权。实测 schedule add(browser_create)
    到点后 `schedule list`/`browser_list` 全部 `<no reply>`。已在定时任务与 task_runner 的任务线程
    外层补 `协议锁`；实测 `last_result` 带 `browser_id=3` 且 browser_list 可见。
27. **`schedule remove {name:...}` 被拒**：schema 暴露 name，但实现只读 id/task_id。已把 name 作为
    第三候选；唯一 name 删除成功，同名多条仍明确拒绝。

## fix47（2026-10-28）

28. **同 URL 连续 create 假成功/丢实例**：batch 内连续两次 `browser_create` 同一 URL，旧实现两次都回
    success 但只产生一个实例。已加两层兜底：URL 匹配失败但数量增加时取“最大新 ID”；1.5s 内既无新 ID、
    数量也未增加则明确 isError。实测两次 create 返回 id=3/4，list 两个实例都在。

## fix48（2026-10-28）

29. **扩展作用域澄清**：真实 MV3（content_scripts + background service_worker）实测——全局加载后
    主浏览器 `ext=loaded/sw=yes`，独立 profile 浏览器 `null`；给 profile 的 `browser_id` 加载后
    仅 profile 生效、主浏览器 `null`；卸载+reload 后 marker 消失。结论：扩展按目标请求环境加载，
    不是进程全局。`browser_vip_load_extension` 回包新增 `scope/scope_note/target_browser_id`，
    工具描述与 `extension_list` note 同步。

## fix49（2026-10-28）

30. **`browser_file_dialog` 路径文案纠偏**：实测运行目录内文件成功、`C:\Windows\win.ini` 也可选、
    含 `..` 路径拒绝、缺失文件拒绝。该工具用于上传文件，允许任意本地存在文件属产品边界；
    旧错误提示误称“仅运行目录内”，已改为如实说明“仅拒绝 ../ / ..\\，允许任意本地存在文件”，
    工具描述同步。O-13 由“待加白名单”改为“已澄清的产品边界”。

## fix51（2026-10-28）

31. **`browser_file_dialog` 真正上传**：CEF `浏览器_即将打开对话框` 本机实测不触发（真实 OS 点击
    file input 也无事件），原工具只返回路径、不写文件。新增 `selector` 参数，走标准 CDP
    `DOM.getDocument → DOM.querySelector → DOM.setFileInputFiles` 直接写入 `<input type=file>`。
    实测主浏览器 `selector=#f` 返回 `applied=true,node_id=6`，页面 `input.files[0].name=upload_target.txt`、
    `files.length=1`，无原生对话框/不阻塞。限制：CDP 只附着当前浏览器（通常主浏览器），
    新 `browser_id` 会 8s 超时并回明确提示。

## fix52（2026-10-28）

32. **CRX 安装 100% 误拒**：CRX 分支用 `是否以(小写(path), ".crx")` 做前缀判断，任何盘符路径
    都不以 `.crx` 开头，条件恒真，所有 CRX 都被拒绝。改为 `取文本右边(path,4) == ".crx"`。
    用 crx3 打包真实 MV3 CRX3 后实测：load 返回 extension_id，reload 后
    `ext=loaded/sw=yes`，unload+reload 后 `ext=null/sw=null`。

## fix53（2026-10-28）

33. **`task_runner_post` 包 create 的误导回执**：post create 虽能创建实例，但 UI 线程同步执行
    导致拿不到事件回填的 `browser_id`。已在 post 入口直接拒绝 `browser_create`/`browser_create_tab`，
    并回“请直接调用”的明确指引；直连 create 返回 id=2，post ping 仍正常。

## fix54（2026-10-28）

34. **多浏览器默认目标（make_current）**：`browser_create` / `browser_create_tab` 新增
    `make_current:true`，把本次新建实例设为默认目标，此后不传 `browser_id` 的工具都作用于它。
    不传/false 保持历史行为（主浏览器）；关闭该实例时自动归零并回退主浏览器。
    实测：B(make_current)=example.com → 不传 id 的 `browser_get_url` 返回 B；再建 C 不覆盖；
    关 B 后回退欢迎页；`browser_create_tab` 设默认后返回 example.org，关闭后同样回退。
35. **刚创建即取 URL 为空**：后台浏览器创建后 t+0 的 `browser_get_url` 曾返回空串（t+1s 才正常）。
    改为对空地址做最多 1 秒有界轮询；实测 t+0 即返回 `https://example.com/`，已加载页面零额外开销。

## fix55（2026-10-28）

36. **长会话 ID>64：create 假失败与实例泄漏**：`取当前最大浏览器ID` / `取最新浏览器ID按URL` /
    `取最大新浏览器ID` / create 的 `建前最大ID` 原先只扫 ID 1..64。CEF ID 单调递增，创建/关闭累计
    超过 64 次后新实例扫不到 → create 报「未登记新实例」（实例其实已建）、create_tab 丢 ID。
    改为遍历 `FBrowser_浏览器_取ID清单()`，保留 1..64 兜底。旧 exe 第 63 次 create 即复现
    （报失败但 list 出现 id=65/66）；新 exe 72 轮全成功，最终 id=74、tab=75。

## fix56（2026-10-28）

37. **资源型表无上限**：`browser_kernel_reactor` 规则表无上限（每个页面事件全量复制+解析，O(n)
    退化且内存增长）→ 200 条并锁内判满；`browser_kernel_watch` 100 条；`schedule` 1000 条
    （add 前 COUNT）。实测 reactor 第 201 条明确拒绝。

## fix57（2026-10-28）

38. **watch 自动 key 冲突**：原用「当前任务数」拼 `watch_N`，删除中间任务后再 start 会与现有 key
    冲突并覆盖已有监控。改单调递增序号。实测 watch_1/2/3 → stop watch_2 → 新任务 watch_4，
    list 中 watch_1/3/4 全在。

## fix58（2026-10-28）

39. **schedule once 时间基准**：once 的 Unix epoch 原样写入内部 OLE 墙钟字段，与
    `取现行时间毫秒()` 比较永远「已过期」→ 立即触发；list 又把 OLE 毫秒当 epoch 返回。
    现内部 OLE、输入加 `OLE偏移 + 本地时区偏置`、输出减同值，旧 once 值一次性迁移。
    实测 6s 任务：尚需等待 5948ms、实际触发 6378ms、next_at/last_at 为 UTC；interval 的 next_at 同样 UTC。

## fix60（2026-10-28）

40. **URL 请求卡死回收**：CEF 的 `读取结束` / `即将完成` 都不来时，旧实现没有兜底，单条请求的
    并发槽永久占用（32 条卡死 → 所有新请求被拒）。新增在途表（任务ID|开始毫秒）+ 180s 超时清理
    （定期维护、每次创建前、槽满重试三处触发），超时释放槽并写失败终态；回调侧按超时表忽略
    晚到结果、避免重复释放。5s 测试版实测：hang 请求 8s 后返回「URL请求超时…已回收并发槽」，
    随后正常请求成功；180s 最终版正常 URL 请求回归通过。
41. **MV2 background 消息确认**：加载 `testext_mv2b` 后导航测试页，content script 标记
    `ext=loaded`、background 消息回执 `sw=yes`，O-14 主要缺口闭环。

## fix61（2026-10-28）

42. **`allow_unverified` schema 可发现性**：该参数此前只在 `前置存在校验` 的报错文案里出现，
    7 个填表工具 schema 未声明，AI 无法从 tools/list 发现。已补入
    `browser_fill_set_value/click/focus/scroll/attr_set/trigger/select`；required 列表不变。
43. **`browser_list` URL 槽**：原对每个实例调用 `取主框架()`（极慢页面单实例可等 8s）。新增按 ID 的
    URL 事件槽（`地址被改变`/`载入结束`/`载入错误` 写侧 + 关闭清理），list 优先读槽、缺失才回退。
    实测 list 正确返回 example.com；导航 example.org 后立即更新；关闭后该 ID 不再出现。

## fix62（2026-10-28）

44. **扩展清单跨重启**：面板原为纯进程内表，重启即丢。新增缓存库 `extension_registry`
    （path 主键 / extension_id / loaded_at UTC / scope / target_browser_id），load 成功写入、
    unload 删除、上限 100；`extension_list` 合并内存项（`loaded_in_this_process=true`）与历史项
    （`last_known=true`、`state=last_loaded(需 reload 验证)`）。
45. **历史项可清理**：仅历史项也允许 `browser_vip_unload_extension` 清除，回执明确
    “本进程未加载、未执行 CEF 卸载”。实测 P1 load → P2 重启历史可见 → unload 历史成功且 list=0
    → P3 再重启仍为 0；正常 MV2 load/nav/unload 回归 `ext=loaded/sw=yes`。

## fix63（2026-10-28）

46. **多浏览器文件上传**：CDP 通道是单附着设计（`执行CDP命令_带参数` 明确拒绝切换浏览器），
    非附着 `browser_id` 的 `file_dialog selector` 原先只能失败。新增 JS 回退：文件 ≤512KB 时
    读取字节→Base64→在目标页执行 `DataTransfer/File` 写入 `input.files` 并派发 input/change；
    返回 `via=js_datatransfer`，超限明确提示改用主浏览器 CDP。实测主浏览器 CDP `node_id=6`、
    新浏览器 `applied=true/via=js_datatransfer`，两路径均 `files.length=1`、文件名正确。

## fix64（2026-10-28）

47. **`browser_batch` 并行 `results` 双重编码**：并行分支用 `加入文本成员` 写 `results`，
    实际是 JSON 字符串（AI 直接 `results[0]` 只拿到字符）；`submit_errors` 同样。已改为真正的
    MCPJson 数组。实测 8 路 parallel：`results` 为数组、8/8 结果归属各自 `?p=i`、
    `speedup=8.00`（elapsed 125ms / sequential 1000ms）。
48. **多实例隔离压测**：8 个后台浏览器 URL/标题 8/8 正确；关闭一半后剩余 4 个仍正确；
    全部关闭后 list 只剩主浏览器。

## fix65（2026-10-28）

49. **`tool_profile` 体积实测与建议**：实测 `tools/list` 原始 UTF-8 回包：`all`=350 工具 /
    177,064 字节；`core`=97 工具 / 51,936 字节（-70.7%）。`mcp_doctor` 建议文案已写实测值，
    `mcp_config.README.md` 同步 core/all 的工具数与体积；默认仍保持 `all`（避免隐藏
    reverse/debug 工具，破坏可发现性）。

## fix66（2026-10-28）

50. **可选 launcher（O-09）**：新增 `AI-Browser-MCP-Launcher.exe`（7,168 字节，C#/.NET
    Framework）。启动前检查 `AI-Fbowser-Mcp.exe` / `libcef.dll` / `FBrowserCEF3lib.dll` /
    `FBrowserVIP.dll` / `FBroSubprocess.exe` / `icudtl.dat` / `resources.pak` /
    `chrome_100_percent.pak` + `locales`；缺失回 9009 并打印可读错误；齐全时 UTF-8 逐行透明
    转发 stdio。实测完整目录 `ping` 正常、缺文件目录 RC=9009。默认 exe 仍未延迟加载。

## fix69（2026-10-28）

51. **代理测试误判更正 + 三路径实测**：此前用 `127.0.0.1:8765` 测代理，VIP 三种地址格式均
    0 命中，误判为假成功；实际是 Chromium 默认 bypass `localhost/127.0.0.1`。改用本机 LAN IP
    （独立 `0.0.0.0:8767` 静态服务）复测：
    `proxy_mode:"vip"`、`proxy_mode:"browser"`、`browser_proxy_pool assign` 三条路径均返回
    `PROXY_HIT` 且代理日志含主文档 GET。回执已提示 localhost bypass；`proxy_mode` 与
    `startup_switches.proxy-server` 白名单保留。

## fix70（2026-10-28）

52. **扩展边界验证（无代码改动）**：100 条 content_scripts / 201 文件扩展加载成功（174ms），
    1.1MB manifest 15ms 拒绝并提示“超过 1MB”，212 字符嵌套路径加载成功（176ms），每步后
    `ping` 正常。x86 构建未执行：`.vsln`/`.vprj` 无平台切换配置，且需 x86 三件套 DLL。

## fix71（2026-10-28）

53. **调试失败收口**：`browser_debugger_flow` 失败返回原只做 `Debugger.resume`（3×8000ms），
    最坏 24s 超过 MCP 客户端 15s ⇒ 客户端先放弃（NO-REPLY），且调试器仍启用把 CDP 健康度打到 2。
    现 resume 预算 8000→2500ms，失败路径追加 `Debugger.disable`（2500ms 封顶），整段收口 ≤10s。
54. **`browser_reverse_call_fn` 假成功**：JS 异常原被包成 `success:true` +
    `cdp_result(exceptionDetails/subtype=error)`，AI 会误判函数已执行。现解析信封 `data.cdp_result`，
    命中异常即返回 isError 并带 `exception.description`/`text`；未改共用出口
    `执行V8CDP命令`（`awaitPromise` 约定“Promise 被拒返回 exceptionDetails，不是工具失败”）。
55. **CDP 预算与客户端超时打平**：`执行V8CDP命令`、`browser_kernel_reverse_functions`、
    `browser_kernel_reverse_sources` 的 15000ms 预算与客户端 15s 完全相等，先 NO-REPLY 再降健康度。
    统一收到 8000ms，超时返回可行动错误（提示用 filter/index 缩小范围）。

## fix72（2026-10-28）

56. **`browser_vip_execute_js_context` 坏 `context_id` 打死 CDP 通道**：实测传
    `context_id=999999` 会真正调进 VIP 类库，提交一个永不回执的 JS 任务；之后同页
    `browser_kernel_reverse_sources` 由 48ms 变成 8265ms，`browser_network body` 报
    “CDP通道当前不可用(健康度=2)”并持续 5 分钟。现提交前用 `高级_取当前环境ID清单` 校验，
    不存在直接拒绝并列出可用 id / 给替代路径；**不再把坏 ID 交给类库**。
    对照：`frame_id` 传不存在值实测 16ms 且不毒化，无需额外闸门；缺省 `context_id` 在清单为空时
    本来就会被早退拒绝（22ms），只有“显式坏 ID”会触发。
57. **边界矩阵复测**：20 用例全部 ≤820ms（此前 `kernel_reverse_sources` 8194ms、
    `browser_network body`/`query_objects` 因健康度=2 失败）；现 `kernel_reverse_sources` 16ms、
    `browser_network body` 16ms 如实报 `No resource with given identifier found`、
    `query_objects` 30ms 成功；`ping` 正常、进程存活。
58. **同型扩展矩阵**：6 个 VIP 坏 ID 用例（dom_node_edit 的 selector/node_id、extension_info、
    unload_extension、dom_search、execute_js_context target=main）**0/6 毒化**（after−base ≤10ms），
    确认该缺陷只存在于 `execute_js_context` 的显式 `context_id` 路径，其余入口已有校验或无副作用。

## fix73（2026-10-28）

59. **`browser_json` 把“深度超限”误报成语法错误**：实测类库解析器 **199 层合法 / 200 层失败**，
    原实现一律归因于“尾逗号/单引号/截断”。新增 `JSON最大嵌套深度`（字符串感知，跳过引号内与转义
    字符）；validate 在 ≥200 层时回 `reason=depth_exceeded` + `input_depth`/`max_depth=200`，
    normalize 也返回明确的深度超限错误，不再误导 AI 改格式。
60. **协议层深嵌套请求直接杀进程（P1 崩溃）**：实测 800 层正常，**1000 层**让
    `MCP_Stdio.wsv:680 解析.创建自文本` 栈溢出，进程消失（客户端只看到 no reply，浏览器状态全丢）。
    现在主循环在**任何解析之前**扫描请求文本嵌套深度，≥256 层直接回 JSON-RPC `-32600`
    （含实测深度与原因），不再进入解析器；`<512` 字符的请求跳过扫描。
61. **验证**：199 层 `valid:true`；200 层 `depth_exceeded`（input_depth=200）；1000 层请求
    **1 秒内收到 -32600**、进程存活、随后 ping 正常；字符串内 5000 个 `{` 不被误杀（深度按 1 计）。
    扫描成本实测：300KB 请求额外约 10–15ms。

## fix74（2026-10-28）

62. **`db_stats.async_results` 口径误导**：`async_results` 表同时存两类行 —— ①异步任务结果
    （`task_id` 形如 `task_…`）②每个 `tools/call` 响应按 JSON-RPC id 的副本（供 `mcp_result` 按 id 兜底）。
    实测 150 次 `browser_reverse_instrument` 后该表 +301 行，旧字段被读成“堆积了 301 个未取任务”。
    现 `mcp_status.db_stats` 增加 `async_task_results` / `async_waiting` / `async_response_stubs`
    （总数 `async_results` 保留兼容）；`mcp_result` 的未找到提示改为指向 `async_task_results`。
63. **验证**：3 个异步任务 → `async_task_results=3 / async_waiting=0 / async_response_stubs=6`；
    `consume:true` 消费 1 条后任务数 3→2（确实删除），总量随 `mcp_status`/`mcp_result` 自身调用
    各 +1 行（符合“每请求一份响应副本”的设计）；150 次提交 RSS 仅 +3MB，task_id 150/150 唯一，
    进程启动时清空旧的 `is_waiting=0` 行（会话级缓存语义）。

## fix75（2026-10-28）

64. **batch 嵌套无上限（执行次数指数放大）**：`batch` 只有单层 200 条上限，没有嵌套闸门。
    实测每层 2 个子 batch 时：depth 8 = 256 次 ping / 162ms，depth 10 = 1024 次 / 609ms，
    推算 depth 16 ≈ 6.5 万次 / 40s —— 单个请求可长期占满工作线程（3 个即拖垮整个服务）。
    现在顺序与并行入口都按**线程局部执行锁深度**限制：允许“顶层 + 一层嵌套”（深度 ≤2），
    `≥3` 立即回明确错误（含实测深度），并建议改用 `workflow_run` 串行步骤或平铺成一层。
65. **验证**：顶层 batch / 一层嵌套均成功；两层嵌套 `isError=true`，错误原文含
    “batch 嵌套过深(执行锁深度=3, 上限 2=顶层+一层嵌套)”；8 路 parallel 回归 8/8、
    speedup 8.00；`ping` 正常。

## fix76（2026-10-28）

66. **JSON 自检的空数组守卫**：`MCP_Server_Utils.wsv` 的 `[JSON自检]` 回读在 `items` 丢失时会直接
    `取成员(0)`。现先判 `取成员数() > 0`，让自检在序列化/解析回归时**如实报失败**而不是访问空数组
    （防御性修复，正常路径行为不变）。
    同轮维度扫描结论：100 轮生命周期 soak 句柄 1229→1257 后平台化（与 40 轮同值）、RSS 158MB 平台、
    线程 -2、子进程 0；11 处 `取成员(0)` 全部有长度守卫；非数字文本进入 `文本到整数` 的 4 组实测
    均明确拒绝、无崩溃。

## fix77（2026-10-28）

67. **多实例共用缓存库时互相清空（跨实例数据丢失）**：实测 A、B 两实例共用同一
    `mcp_cache.db`，B 启动时执行 `DELETE FROM async_results WHERE is_waiting=0` +
    `DELETE FROM event_log` + `DELETE FROM response_cache`，A 已完成但未 `consume` 的结果立刻
    查不到（A 的网络/事件日志也被清空）。现启动阶段**不再全表清空**，只回收超过 5 分钟的
    滞留等待行；已完成结果按 24h TTL、日志/响应缓存按 14d TTL + 每表上限清理。
68. **隔离重建后 busy_timeout 丢失**：首次打开设了 `PRAGMA busy_timeout=5000`，但缓存库损坏被隔离、
    第二次 `打开()` 是新连接，未重设 ⇒ 并发写退回默认 0，可能立刻报 `database is locked`。
    现统一在打开成功后的公共分支补一次（幂等）。
    验证：A 的结果在 B 启动后仍可取回；进程被杀后重启，已完成结果仍可 `mcp_result` 取回；
    双实例 160 次交替异步提交 0 错误、双 ping 正常；`ping`/schema（350/305/0）无回归。

## fix78（2026-10-28）

69. **反应器对 12 个事件永不触发（假成功）**：`browser_kernel_reactor` 的 `add` 会成功并回
    “规则已添加”，但只有 `记录监控事件` 里的 `检查反应器` 钩子会真正执行规则；而
    `load_end`/`crash` 走 `记录加载事件`，`title_changed`/`load_start`/`load_error`/`js_dialog`/
    `frame_created`/`frame_detached`/`main_frame_changed`/`download_request`/`focus_lost`/`focus_gained`
    直接走 `记录浏览器事件` —— 全部绕过钩子，规则**永不触发且无任何提示**。
    修复：`load_end`/`crash` 在 `记录加载事件` 内补 `检查反应器`；其余 10 条直写路径统一改走
    `记录监控事件 (真, …)`（记录 + 钩子一次完成）。
70. **验证**：`title_changed` 规则触发一次（计数器 1）；`clear` 后再次改标题保持 1（不再触发）；
    `browser_created` 规则 +1（无重复触发）；`load_end` 规则在 reload 后的新文档里为 1
    （修复前三个路径均为 0）；`ping` 正常、schema 350/305/0。

## fix79（2026-10-28）

71. **工具描述与实测行为不一致（两处）**：
    - `batch include_results:false` 实测**仍返回 `results` 数组**，只是每条只保留 name/success 等摘要、
      不含 `result` 正文；旧描述“只回摘要”容易被理解为整个数组被省略。
    - `browser_batch parallel` 对非异步子命令，除了 `submit_errors` 之外还存在
      `settled_by_load_wait` 退化路径（实测 `browser_get_text` 3.0s 后拿到页面文本，
      回包有 `settled_by_load_wait`/`settle_ms` 计数）；旧描述称“不支持的会在 submit_errors 里列出”，
      与实测不完全一致。
    两处描述已按实测行为改写，避免 AI 依错误预期解析回包。
    同轮验证：watch 500ms 记录两次标题变更；schedule interval=1s 在 3.5s 内 run_count=2、
    fail_count=0、remove 正常；`browser_wait` selector/text 218–219ms 命中、timeout 300ms 到达、
    load_end 满足；`browser_scrape` 1.5s / `browser_navigate` 3s 均按 max_ms 返回；
    create 带黑洞 URL 412ms 返回且后续 create 正常。

## fix80（2026-10-28）

72. **截图尺寸上限可被 scale 放大成 OOM 崩溃（P1）**：宽/高各有 7680 钳制、scale 有 4 钳制，
    但三者**相乘**可达 7680×7680×4² = **9.4 亿像素**。实测该组合 90s 无回执、进程直接 OOM 退出
    （客户端只看到 no reply）。现按 `宽×高×scale²` 设 **6400 万像素**硬顶，超限立即回明确错误
    （含实际像素数与缩放建议），CDP 与 library 两条路线都覆盖。
    验证：7680×7680×scale=4 **13ms 拒绝**、进程存活、无文件产生；4000×4000×scale=1 正常出图
    （97KB jpeg）；320×240 正常（28KB png）。
    同轮其它维度：cron 非法表达式明确拒绝、`* * * * *` 下一整分真实执行（run_count 0→1、
    fail_count=0、next_at +60s、页面计数器=1）；watch 20 个任务 CPU 2.1%→7.3%，clear 后回落 0.0%；
    截图/PDF 落盘头正确、PDF 无 overwrite 拒绝且 overwrite:true 成功；2MB 返回值安全拒收、不崩。

## fix81（2026-10-28）

73. **下载 save_dir 用正斜杠 ⇒ 目录建了但文件不落盘（假成功）**：`save_dir:"Downloads/sub_probe"`
    时目录被创建、`download_complete` 也报 `saved_path=…\Downloads/sub_probe\savedir.bin`，
    但该文件实际不存在（CEF 对“正斜杠目录 + 反斜杠文件名”的混合路径静默不写）。
    对照：`save_dir:"Downloads\\sub_probe2"` 正常落盘。现入口统一把 `/` 归一为 `\`
    （逐字符归一，规避本文件里 `子文本替换` 的编译兼容问题）；越界路径仍被拒绝。
    验证：正斜杠 save_dir → 文件落盘且 SHA256 一致；`../outside` 仍明确拒绝。
    注：曾尝试在 `download_complete` 加 `saved_path_exists` 复核，但事件触发瞬间文件尚未对 Win32
    可见（正常下载也会 false），会制造假告警，已移除；根因由入口归一化解决。

## fix82（2026-10-28）

74. **并发两路下载时 save_dir 互相错位**：实测连续发起 A→`Downloads/parA`、B→`Downloads/parB`，
    结果 `par_a.bin` 落进 **parB**、`par_b.bin` 落进默认目录，而两个回执各自声称自己的目录。
    根因：save_dir 覆盖是**进程级单槽**，后一次调用覆盖前一次，事件侧只能盲取。
    修复：新增按 URL 的覆盖表（`记录下载目录覆盖` / `取下载目录覆盖按URL`，同一把叶子锁），
    事件侧按 `下载.取地址()` 精确消费；取不到再走旧单槽兜底（保留兼容）。
    验证：并发两路下载后 `parA3/par_a3.bin` 与 `parB3/par_b3.bin` 均在各自目录、SHA256 一致；
    单路下载与越界拒绝不受影响。

## fix83（2026-10-28）

75. **`browser_download_image` 与描述不符：从不落盘**：工具描述写“下载图片到 Downloads 目录/取保存路径”，
    实际只返回 `data:image/png;base64`，磁盘无文件。现新增可选 `save_to`（运行目录内，父目录自动创建）：
    传了就把解码后的 PNG 写入文件，`mcp_result` 返回 `saved_path/bytes/尺寸`（不含 base64）；
    不传则保持原行为（data URI）。描述与 schema 同步更新。
    验证：`save_to:"Downloads/dot_img3.png"` → 文件 69B、`89504e47` PNG 头；结果原文为
    `{"saved_path":...,"bytes":69,"url":...,"width":1,"height":1}`；ping 正常。
    同轮 D59/D60：10 亿级 limit 在 snapshot/event/network 均被钳制（59/64/25ms）；
    代理池非法格式明确拒绝、rotate 缺 browser_id 明确拒绝、全局代理可清除。

## 验证摘要

- 扩展：非法目录/文件/CRX 48ms 内拒绝；合法加载返回 ID；reload 后 content_scripts 生效；
  卸载后 reload 标记消失、info isError；重复 load 不新增 created 事件。
- DOM：property 矩阵 13 项通过；select 越界拒绝、合法 index=1 回读 `b`。
- 工作流：3 步部分失败 → success=1/failure=1/skipped=1、steps=3、stopped=true。
- 调度：list 显示 target_alive；关闭目标后 false；同名 remove 明确拒绝。
- Tasks：working 的 `tasks/result` 返回 -32002；cancel 后 result 返回 cancelled；旧任务按 TTL 消失。
- 隔离：独立 profile cookie 互不可见、重开保留；后台浏览器 URL/title/get_text 正常。
- 首页：URL `...index.html?v=3.3.6&b=20261028-111349`，`#versionTag`/关于/页脚均 3.3.6。
- 资源：15 轮 create/close 句柄 1223→1240、线程 83→84、GDI 44 不变；60 导航/20 截图/20 下载/10 扩展/
  20 调度/20 CDP 后句柄/线程/GDI/RSS 平台；shutdown 2.0s，0 子进程残留。
- 空值：72 个 null/缺键/错类型用例 0 no-reply/0 空回执/0 慢；`workflow_run steps:null` 不再退出；
  `url:0/[]` 15ms 拒绝；fingerprint_check 26/26 通过。
- 长会话：72 轮 create/close 全成功，最终 id=74/75；失效 ID 26/26 明确失败、0 串台、0 no-reply。
- 参数/注入：`browser_id` 9 组类型 0 串台；4 组 JS 注入构造全部未执行（`__INJ*`=undefined）。
- 资源上限：reactor 第 201 条拒绝；watch key 唯一；90s soak 79 轮 handles 1278→1325、
  threads 84→87、GDI 47 不变、RSS 158→172MB、`leftover=[]`。
- URL 请求：5s 测试版 hang 8s 后返回超时并回收槽；随后正常请求成功；三条 `urlreq_start` 齐全。
- 扩展 MV2：`ext=loaded`、`sw=yes`。
- schema：7/7 填表工具含 `allow_unverified`；350/305/0 issue。
- list：导航后 URL 立即更新；关闭后 ID 及 URL 槽消失。
- 扩展持久化：P1 load → P2 重启历史可见 → unload 历史成功 → P3 重启不出现。
- 上传：主浏览器 CDP `node_id=6`；新浏览器 JS `via=js_datatransfer`；两路径 `files.length=1`。
- 多实例：8 实例 URL/标题 8/8；关闭一半后剩余 4 个正确；最终只剩主浏览器。
- parallel：`results` 为数组；8/8 归属正确；elapsed 125ms / sequential 1000ms / speedup 8.00。
- profile：all 350/177,064B；core 97/51,936B；`mcp_doctor` 建议含 `177KB`/`52KB`/`core`。
- launcher：完整目录 `ping` 正常；缺文件目录 RC=9009 + 明确缺失文件名。
- 代理：LAN 目标下 VIP/browser/代理池均 `PROXY_HIT` + 主文档 GET；localhost 被 Chromium 默认 bypass。
- 扩展边界：100 脚本/201 文件 174ms；1.1MB manifest 15ms 拒绝；212 字符路径 176ms。
- 逆向边界（fix71）：20 个空值/越界/超时用例 20/20 有回执、0 NO-REPLY、进程存活；干净会话
  `kernel_reverse_sources index=999999` 50ms 明确失败、`kernel_reverse_functions max=-1` 35ms 成功；
  `call_fn function_name=no.such` isError=True（TypeError）、`parseInt args=42` 返回 42。
- VIP 坏 context（fix72）：`context_id=999999` 16ms 拒绝且 CDP 无损（48→24ms）；全矩阵 20/20 ≤820ms，
  健康度不再降级；`frame_id=no.such` 16ms 无毒性。
- 深嵌套 JSON（fix73）：199 层合法 / 200 层 `depth_exceeded`；1000 层协议请求 -32600 且进程存活；
  字符串内 5000 个花括号不误杀；`probe_reverse_bounds.py` 20/20 仍全部 ≤820ms。
- 异步任务（fix74）：150 次提交 task_id 150/150 唯一、RSS +3MB；3 任务时 `async_task_results=3`，
  consume 后 3→2；总行数增长来自每请求响应副本（设计行为），24h TTL + 5 万条上限 + 每次落库修剪。
- batch 嵌套（fix75）：一层嵌套放行；两层回“嵌套过深(深度=3)”；8 路 parallel 8/8、speedup 8.00。
- 长时 soak（fix76 同轮）：100 轮 create/navigate/JS/CDP/异步/close 全成功，handles 1229→1257 后平台化、
  RSS 158MB、threads -2、children 0；空数组/文本转整数边界 15 组均明确失败、进程存活。
- 多实例缓存库（fix77）：A 已完成结果在 B 启动后仍可取回；重启后结果保留；双实例 160 次交替提交
  0 错误、双 ping 正常。
- 反应器事件覆盖（fix78）：title_changed=1、clear 后保持 1、browser_created=+1、load_end=1；
  修复前 title_changed/load_end 均为 0。
- 触发链路与超时（fix79）：watch/schedule 真执行；wait 四类条件命中；scrape/navigate 按 max_ms 返回；
  create 黑洞 URL 不阻塞后续创建；batch 失败计数与 parallel 退化路径已按实测写入描述。
- 截图 OOM 闸门（fix80）：9.4 亿像素 13ms 拒绝且存活；4000×4000 正常；cron 真执行；watch clear 后 CPU 归零。
- 下载 save_dir（fix81）：正斜杠路径归一后文件真实落盘、SHA256 一致；越界路径拒绝。
- 并发下载（fix82）：两路不同 save_dir 各自落盘、SHA256 一致（修复前互相错位）。
- download_image（fix83）：save_to 落盘 69B/PNG 头正确，mcp_result 回 saved_path/bytes；
  不传 save_to 仍回 data URI。
- download_image 边界（fix83 追加复核）：27MB 图 save_to 落盘成功；不传 save_to 明确报超 5MB；
  save_to 指向目录 → 明确“写文件失败”；`../outside` → 入口拒绝。
- 代理池（fix83 追加复核）：两浏览器分别走 8890/8891 两个本地出口（各自日志命中）；
  rotate 0→1 地址变 8891；按浏览器 clear 保留池、全清同时清池与分配。
- 大文件/优先级（fix83 追加复核）：60MB 下载完整且 SHA256 一致；池分配覆盖全局代理
  （A→8891、B→8890）。
- 取消/启动代理（fix83 追加复核）：限速下载 cancel 后无残留、事件正确；
  `startup_switches.proxy-server` 启动期生效且测试后配置已恢复。
- 追加复核（无代码改动）：本地 HTTP 下载 200KB 落盘且 SHA256 一致；可见窗口 3 轮 create/close 后
  GDI 44→47→44、USER 57→63→57；batch 200 条 115ms 全成功 / 201 条明确拒绝；
  `browser_evaluate file` 目录外与不存在均拒绝，相对/绝对合法路径均返回 42。
- 追加复核 2（无代码改动）：3 轮 × 3 标签 create_tab/close 句柄平台化（1232→1316→1237）；
  workflow 3000 步线性 15s；嵌套 workflow 第 1 层即被“已有工作流正在运行”拒绝。
- 追加复核 3（无代码改动）：schedule 任务 id/enabled/next_at 跨重启一致、禁用不回弹；
  events_all 默认 6/28 → enable 28/28（+57 条/3 reload）→ disable 28/28（+0/2 reload）。
- 追加复核 4（无代码改动）：schedule `run` 立即执行且 next_at 不变；任务满 1000 条时新增被拒绝
  （未写入），994 条增/删各约 15.6s。
- 源码载入（fix84）：`MCP_BrowserEvents.wsv` 报“第 2489 行无效成员位置”的段落经两轮编译均为
  0 错误 0 警告，确认括号结构合法；根因是 IDE 侧旧缓存内容（比磁盘多 9 行）。同时把
  `浏览器_JS即将打开对话框` 的 `禁止消息可设` 参数名对齐基类文档 `禁止消息`，并修正
  `js_dialog` 记录行缩进；88 个虚方法参数名与 FB 5.41.57 事件文档全量核对。
- 死循环脚本恢复指引（fix85）：实测 `browser_execute_js {code:"while(true){}"}` 会把该页渲染器
  永久占满（同页后续 JS 无响应，navigate/reload 均无效，但协议层不阻塞、ping 仍 0.1s 返回；
  新建标签并显式传 `browser_id` 可用）。据此给超时回执（两处同步等待出口）追加“JS 类超时 →
  渲染器被占满”的正确逃生指引，并给 `browser_navigate` 同址捷径补“未真正发起加载”的说明，
  避免模型把假成功当成恢复成功而继续重试。
- 配置损坏可见化（fix86）：`mcp_config.json` 为空或 JSON 解析失败时，原先只打控制台、不写
  `配置校验告警`，导致 `mcp_doctor.config_warnings` 空串、用户以为配置已生效。现两条失败路径
  都会写入明确告警（“全部配置项未生效，请用 JSON 校验器修正后重启”），并进入 doctor 的建议列表。
- 驼峰参数名兜底（fix87）：实测 `browser_get_title {browserId:2}` / `{browserID:2}` 被静默忽略
  并落到主浏览器（返回 MAIN 而非标签页 2 的 TAB2）。入口现对 `browserId`/`browserID` 做别名解析，
  与标准键共用同一套非法值校验与存在性闸门；`取同步等待毫秒` 同时对 `maxMs` 做兜底
  （`maxMs:1` 实测 31ms 即超时，证明生效）。
- 帮助补全（fix88）：`browser_execute_js` 的 `async_only` 实测可用（返回 `_async` + task_id），
  但 schema 与 `mcp_help` 描述均未声明，模型不知道可异步提交。现补入 schema 属性与参数说明，
  `mcp_help {tool:"browser_execute_js"}` 已包含该参数。
- 截断提示补全（fix89）：`browser_get_text` 的全文分支（无 selector）此前只截断、不提示，
  与 selector 分支和 `get_source` 不一致，模型会误以为拿到完整文本。现补
  `[MCP: 文本已截断, 原始长度=N, 截断至=M]`（实测 22893 → 5000 已带提示）。
- 异步回执查询指引（fix90）：各 handler 传自定义消息时会覆盖默认的“通过 mcp_result 查询”，
  模型拿到 task_id 却不知道下一步。现 `命令成功_异步` 出口统一补
  “取结果: mcp_result {request_id:\"<task_id>\"} 或标准 tasks/result”（已带指引时不重复）。
- 定时任务工具名校验（fix91，已回退）：曾按命令注册表提示“工具名不在注册表”，实测注册表只覆盖
  部分工具（`browser_fingerprint_*` 等合法工具被误报），故在 fix92 中整段撤回，避免误报。
- UA-CH 指纹自洽（fix92）：CEF 默认不实现 `navigator.userAgentData`（实测 undefined），
  导致 UA 自称 Chrome 135 而 UA-CH 维度全空，`browser_fingerprint_check` 报 5 条矛盾、
  verdict=contradictory（21/26）。新增 `browser_fingerprint_uach`：从当前 UA 同源生成
  brands（GREASE+Chromium+Chrome）与 `getHighEntropyValues`，注入后自检实测
  **26/26 consistent**。JS 刻意回避正则（火山字符串会吞 `\/`，实测 SyntaxError）。
- 指纹假成功与下一步指引（fix93）：`browser_fingerprint_apply` 回执原写“含UA-CH”，但页面
  `navigator.userAgentData` 仍为 null（CEF API 层设置不会暴露给页面）。现回执如实标注
  “CEF 层数据 + 页面侧必须再调 browser_fingerprint_uach”；`fingerprint_check` 在
  contradictory 时新增 `next_step`（brands=null → 先注入 UA-CH，再重检）。
- UA-CH 注入收敛 / 自动注入回退（fix94）：把 UA-CH JS 收敛为公共方法 `注入UACH`，uach 工具
  改为调用它。曾尝试在 `浏览器_载入结束` 事件里自动注入以实现“零操作自洽”，实测**死锁**
  （CEF 载入回调内同步调用 CDP，`execute_js` 无回复、服务卡住），已整段回退；自动注入不做，
  保留手动工具 + 诊断建议的路径。
- full 预设版本对齐（fix95）：`browser_antidetect_presets {preset:"full"}` 原写死 UA Chrome 143，
  而内核为 135，导致补齐 UA-CH 后仍有 2 条硬矛盾（`页面自称UA=143 内核真实=135`、
  `UA-CH版本=143 内核真实=135`，自检 24/26）。现改用 `取内核文件版本主号()` 动态对齐，
  实测 full 预设 + `browser_fingerprint_uach` → **26/26 consistent**。
- UA 二次设置假成功（fix96）：`browser_fingerprint_ua` 第二次起仅 93ms 返回，回执却写
  “已即时生效、无需刷新”，而页面仍是旧 UA（实测 E1MARK→设置 E2MARK 后页面不变，
  `browser_reload` 后才变 E2MARK）；同段“切勿 reload”警告也与实测不符（reload 未崩溃、未回落）。
  现按“回读值 == 目标 UA”分流：一致才说已生效；不一致明确提示“需 reload 才生效”并给出复核方式。
- resources/read 缺 contents（fix97）：`browser://current/{source,text,screenshot}` 原先只回
  `{uri,message}`、没有规范要求的 `contents` 数组，客户端实测读到 `contents=0`（等同“资源为空”），
  指引完全不可见。现补 `contents:[{uri,mimeType,text}]`，复测三个资源均 `contents=1`（196 字符指引）。
- 批量填表部分失败未置 isError（fix98）：`browser_fill_form` 在 2 成功 / 1 失败时返回
  `success:false, filled:2, failed:1`，但外层 `isError` 缺失（只读 isError 的客户端当成全成功）。
  现把 `ff失败 == 0` 作为“是否成功”传入，复测 `isError:true` 且保留逐字段明细。
- 内核输入工具的“必须重启”误报（fix99）：实测 `browser_vip_key_type` 与
  `browser_vip_mouse_click` 调用后，紧接着的 `execute_js` 约 8.2s 才返回，但一次
  `browser_navigate` 即恢复 35ms，**无需重启进程**。原先 10 处描述写“必须重启
  AI-Fbowser-Mcp.exe 才能恢复”，会让用户误以为工具不可用；现统一改为
  “通常 browser_navigate 一次即可恢复，不必重启”。同时把 3 处错误文案里指向
  **不存在的** `browser_cdp_status` 改为 `mcp_status 的 cdp_channel_alive`。
- 翻页响应补字段（fix100）：`browser_vip_dom_search` 用 `search_id + from_index/to_index`
  翻页时直接透传 CDP 载荷，缺 `searchId/resultCount`（实测 resultCount=None），与 query
  模式返回结构不一致。现补齐这两个字段（nodeIds 原样），复测翻页 0–5/40–50/95–200
  分别返回 5/10/5 个且 resultCount=100（越界自动收敛）。
- Canvas/WebGL/Audio 随机化假成功（fix101）：实测 `min=1,max=2` 这类过小范围时，类库
  `指纹_虚拟Canvas_随机` 返回空串、页面指纹完全不变，但工具仍回“已设置”（hash 与默认一致）。
  `min=10,max=20` 才真实生效，且 seed 1/2/3 产出三个不同 hash（seed 本身有效）。现三个工具
  在随机值为空时返回 `isError:true` 并明确“min 过小、本次未改变指纹、请 min>=5 且 max>min”。
- VIP 内核键盘的事件不完整（fix102）：`browser_vip_key_click {key_code:13}` 只产生
  `keydown/keyup` 且 `e.key=""`、`e.code=""`（仅 keyCode=13），现代页面用 `e.key==='Enter'`
  判定会失效；且调用后 `execute_js` 需 6–10s 才恢复。而 `browser_key_event`（CDP 派发）
  实测 15ms、`key=Enter/code=Enter` 完整、不破坏 CDP。已在三个 VIP 键盘工具的完整描述里
  置顶推荐 `browser_key_event` 并说明内核版的局限。
- DOM 节点编辑删除文本节点假成功（fix103）：`browser_vip_dom_search` 的 nodeIds **包含文本节点**
  （实测 `EDITME` 命中的 nodeId=6 是文本节点）。对文本节点执行 `remove_node` 会删掉文本，
  却回 `verified:true, readback:"node-gone"`，而目标 `<div>` 仍在。现执行前用 `DOM.describeNode`
  校验类型：属性/删除类只允许 Element(1)，`set_node_value` 只允许文本(3)/注释(8)；不符时明确
  报错并指引用 `selector` 参数。复测：文本节点被拒且元素保留，`selector:"#target"` 删除后元素真正消失。
- set_attr 假失败（fix104）：`set_attr` 实际生效（页面回读 42），却回“回读未确认（属性列表结构化
  比对与预期不符）”。根因是 `取文本值` 对字符串节点返回带引号的 JSON 文本，原比较恒不相等；
  `remove_attr` 反因“属性名仍在=假”碰巧判成功。现改为直接对 `getAttributes` 载荷做
  `"name","value"` 相邻片段匹配（兼容带/不带引号），复测 set_attr/remove_attr/set_outer_html
  三者 `verified:true` 且页面值正确。
- 自定义 scheme 不可用（fix105）：`browser_kernel_scheme register` 成功、初始化期也已声明
  `mcp` scheme，但实测 `browser_navigate mcp://d130/` 5s 超时、`browser_create` 后 `browser_list`
  显示 url/title 为空（空白页）。现 register 回执与 `mcp_help` 完整描述均如实标注该局限，
  并给替代路径：`browser_intercept` / 本地 HTTP 服务 / `data:` 图片。
- **资源拦截 replace_data 完全不可用（fix106/fix107，已修复）**：本地 HTTP 页面实测——
  设置 `replace_data` 并 reload 后，页面变成 `<html><head></head><body></body></html>`
  （title 变成 URL、`#h` 不存在、`window.__mark` undefined）。两个根因：
  ①`类_MCP_篡改过滤器.初始化过滤器` 在 CEF 回调里执行 `待输出文本 = ""`，把挂载方刚写入的
  替换内容清空；②handler 只读 `replace_text`（schema 参数名），未兼容 `body`。
  现：初始化只复位累积状态（行号/计数/尾部），保留 `待输出文本`；handler 优先 `body`、回退
  `replace_text`。复测 replace_data 后 **title=NEW-TITLE、#h=REPLACED、__mark=NEW**。
- 拦截动作复核 + 认证局限标注（fix108）：`block` 显示“资源已屏蔽”、`line_replace` 按 1-based
  行号替换、`replace_file` 运行目录内成功/目录外明确拒绝（安全边界正确）；`kernel_reactor`
  add 后 navigate 实际触发（`__reactorHit=1`）。`browser_kernel_auth` 实测 HTTP Basic 401
  未触发自动重试（服务器只收到一次无认证请求，页面停在 401），CEF 的 GetAuthCredentials
  主要面向代理认证——已在 set 回执中如实标注并给站点登录替代路径。
- 代理失败时 navigate 假成功标注（fix109）：实测代理指向 `127.0.0.1:1`（不可用）时，
  `browser_navigate` 仍回“等待条件满足: load_end”（2.2s），而 `location.href` 实为
  `chrome-error://chromewebdata/`、页面显示“未连接到互联网/代理服务器出现问题”。
  完成回执构造在等待任务线程（无 browser 上下文，强改会引入多实例误判），故在
  `browser_navigate` 描述中明确该行为，并指引用 `browser_get_url` 检查 `chrome-error://`
  或读 body 文本确认。
- WebSocket 拦截假启用（fix110）：本地 `websockets 13.1` 回显服务实测——`intercept ws_hook`
  / `vip_websocket_intercept` 均回“WebSocket拦截已启用”，但页面连接仍成功
  （收到 `ECHO:D143`，服务端 `OPEN`/`RECV`），`browser_reverse_hook_logs` 的
  `__MCP_WS_LOG__` 计数保持 0，`browser_event` 也无 WS 事件。现 `intercept ws_hook` 回执
  如实标注该局限，并指引用 `browser_reverse_websocket`（CDP）或
  `browser_kernel_cdp_monitor` 订阅 `Network.*`。
- VIP WebSocket 拦截同样假启用（fix111）：`browser_vip_websocket_intercept {enable:true}`
  实测页面连接仍成功（`ECHO:D144`、服务端 `OPEN`/`RECV`）、`__MCP_WS_LOG__` 仍为 0；且
  `enable:false` 明确回“不支持单独禁用，请用 browser_intercept action=clear”。已在 VIP 回执
  补齐同样的局限说明与替代路径。
- js_env 退化清单校准（fix112）：实测 `browser_vip_enable_js_env` 启用前后（同一页面）：
  `execute_js` 25ms→8121ms、`browser_screenshot` 30ms→693ms 且报“CDP通道不可用”、
  `browser_cdp_call` 64ms→10s 超时；而 `browser_dom_query` 15→63ms、`browser_get_text`
  16→78ms 退回原生但仍返回**正确值**（未返回 null，旧警告过于悲观）。回执已改为这份实测清单。
- 帮助同步退化数据（fix113）：`mcp_help {tool:"browser_vip_enable_js_env"}` 的简短/完整描述
  仍写着旧数值（`execute_js 30.07s、dom_query 10.10s`），现同步为实测清单
  （`25ms→8121ms` / `screenshot 报 CDP 不可用` / `cdp_call 10s 超时` / `dom_query/get_text 63/78ms 仍正确`）。
- **get_text 带 selector 在真实站点返回垃圾内容（fix114，已修复）**：实测
  `browser_get_text {selector:"body"}` 在 example.com 返回 `svg{display:block...}` 等 CSS 文本、
  在 baidu.com 返回 `if (navigator.userAgent.indexOf('Edge')...)` 等 JS 源码片段；而无 selector
  的全文路径正确。根因：selector 路径用 `textContent`（包含 `<style>`/`<script>` 文本）。
  现改为优先 `innerText`、回退 `textContent`。复测两站点 `get_text {selector:"body"}` 与
  `execute_js document.body.innerText` 完全一致（纯可见正文）。
- network_idle 恒判空闲（fix115）：本地页面每 300ms `fetch('/api/N')` 持续 2 秒，实测
  `browser_wait {what:"network_idle"}` 的**首次轮询即返回“网络已空闲”**（此时页面 N=1，
  请求仍在进行）；先 `browser_network enable` 后复测仍相同，说明活动请求计数未被跟踪。
  已在回执标注该实测事实，并指引用 `what:'text'/'selector'` 等页面条件可靠等待，
  或用 `browser_network list` 自查。
- **network_idle 改用最近请求时间戳判定（fix116，已修复）**：根因是原实现依赖
  `活动URL请求数`/`最后URL请求槽释放时间`，实测恒为 0/0 → 无条件判空闲。
  现改为查 `查询网络日志(1)` 的 `timestamp`：`距上次 >= idle_ms` 才判空闲，否则继续等待；
  网络日志为空时明确返回失败（“无法判定，请改用 text/selector”）。复测同一持续-fetch 页面：
  poll0–6 全部「等待中（最近请求 47–1719ms 前）」，fetch 停止后 poll7「网络已空闲（2235ms 前 ≥ idle_ms=2000）」。
- idle_ms 参数透传（fix117）：`browser_wait` 的 schema 没有 `idle_ms`，等待上下文也未写入它，
  导致传 600 仍按默认 2000 判定（实测回执显示 `idle_ms=2000`）。现补 schema 属性并在
  `等待存储` 写入 `idle_ms`；复测传 600 回执显示 `idle_ms=600`，且 poll4（703ms 前 ≥ 600）
  即判空闲（与 fix116 的 2235ms 形成正确差异）。
- network_idle 文档同步（fix118）：`browser_wait` 描述仍写“活动请求数=0”，与 fix116 的
  时间戳判定不符。现改为“按最近请求时间戳判定，距上次>=idle_ms；必须把 idle_ms 设得大于
  页面心跳/轮询间隔，否则心跳间隙会判空闲；网络日志为空时明确报错，需先 browser_network enable”。
- **get_text 在真实站点立即取值的假失败（fix119，已修复）**：navigate 返回后立刻
  `get_text {selector:"body"}`，在豆瓣/知乎/微博一律报“元素不存在”；等 0.6s 后同一
  selector 全部正常（豆瓣 4355 字、知乎登录页文本）。根因是 `load_end` 后 DOM 尚未就绪。
  现对 selector 未命中做有界重试（2 次 × 150ms）：复测豆瓣 **立即取值 208ms 成功**、知乎 15ms 正常。
- **browser_snapshot 截断语义外显（fix120，已修复）**：原返回只有
  `{"success":true,"snapshot_json":"..."}`，count/total 埋在内层字符串里，模型必须二次解析
  才能知道结果被截断，容易把 5000 个元素的前 200 个当成全部。现顶层直接返回
  `count` / `total` / `truncated`；截断时附 `next_action`（提高 max_items(≤500) 或改用
  browser_find / browser_dom_search 精确定位）。实测 5000 链接页：max_items=100 →
  count=100/total=5000/truncated=true（45ms）；500 → 500/5000（84ms）；小页面 2/2、
  truncated=false 且无 next_action。同轮短测确认 iframe `get_text{frame_id}` 与
  `browser_scrape` 端到端正常（见 AUDIT_MEMORY D165）。
- **指纹工具缺参写入空值/0（fix121–fix124，已修复）**：336 工具无参扫描发现 100 个
  “缺参仍回成功”，其中指纹类为真实破坏：`screen {}` 把 `screen.width/height/avail` 写成 0，
  `timezone {}` 把 `timeZone` 写成 undefined，`hardware {}` 写成 `cores=0/mem=0`，
  `pixel_ratio {}` 写成 `dpr=0`；且回执仍称“已设置”。进一步实测确认这些接口是**全量覆盖**：
  只传 `width/height` 会把 `availW/H` 清零，只传 `concurrency` 会把 `memory` 清零。
  - fix121：screen / hardware / pixel_ratio / timezone / webgl|canvas|audio fixed / rect
    增加必填校验；screen 的 avail/depth 与 hardware 的 memory 提供安全默认并回执“生效值”。
  - fix122：plugins / touch_enable / screen_xy / ssl / font / product / battery 增加必填校验。
  - fix123：disable_debugger / cookie_enabled / java_enabled / webrtc /
    touch_emulation（CDP 与 VIP 两条路径）/ is_trusted 要求显式布尔键。
  - fix124：10 个高频指纹工具的 schema 参数描述补“必填/缺省/全量覆盖”，模型调用前可见后果。
  - 回归：21 个无参用例全部 `isError`；有效参数全部成功（screen 1280x720→avail 1280x720/
    depth 24、hardware→mem 8、dpr 1.5、tz Asia/Shanghai、plugins/touch/font/product/battery/
    ssl/cookie/java/webrtc/is_trusted 正常）。见 AUDIT_MEMORY D166–D171。
- **browser_menu_probe 无参打开模态菜单（fix125，已修复）**：无参原默认 `action=arm` 并
  自动右键，实测真实页面耗时 1.9s 且打开**模态**原生菜单（菜单开着时后续右键被吞，
  CDP Esc 无法关闭）。现 `action` 改为必填，无参 61ms 明确拒绝并给出三种用法示例；
  `action=get` 无快照仍按 `wait_ms` 等待，`arm`/`clear` 行为不变。schema 同步“必填/无参拒绝”。
  注：`view_source`/`debugger_enable` 复测 15–62ms，非阻塞，sweep 的 5s 超时为菜单模态偶发。
- **mcp_result 二次读取误导（fix126，已修复）**：结果被 `consume=true` 消费后再次读取，
  原错误只列“仍在执行 / 拼写 / 过期”，AI 会按第一条白等 2–5s 反复重试。现新增
  “③若此前用 consume=true 读过 —— 结果已被删除(重复读取必然找不到), 首读请用 consume=false”。
  实测：`consume=false` 连读 2 次内容一致，`consume=true` 首读有结果，二次读取明确命中新提示。
- **browser_permission_spoof 权限面隐式放大（fix127，已修复）**：无参原默认把
  geolocation/notifications/camera/microphone/midi/clipboard-read/clipboard-write 共 7 项
  一次性设为 `granted`（页面可直接认为定位/摄像头/麦克风已授权）。现 `permissions` 必填，
  无参明确拒绝；确需全部须显式传 `all`。实测：`geolocation` 单权限只伪装 geolocation，
  `all` 展开 7 项，`action=reset` 不受影响；schema 同步“必填/all”。
- **create_tab 双 ID 歧义（fix128，已修复）**：回执同时含 `parent_browser_id` 与
  `new_browser_id`，按“browser_id”模糊匹配会拿到**父 ID** —— 实测会导致每次都在关主窗口
  （被 confirm 拒绝），标签持续累积、RSS 线性上涨，极易误判为泄漏。现 note 明确
  “关闭/操作请用 browser_id=new_browser_id；parent_browser_id 只是父浏览器，不要拿它去关闭”，
  schema 同步标注。实测用 new id 关闭成功、`browser_list` 回到 1；20 轮 churn 无残留。
- **vip_new_tab 回执缺关闭路径（fix129，已修复）**：原回执只说“新标签会出现在 browser_list，
  之后任何工具传 browser_id 即可操作”，未说明如何关闭，AI 容易只开不关。现补
  “关闭它用 browser_close{browser_id:该ID}”。实测新建 id=2 → close 回读确认移除 → 列表回到 [1]。
  同轮验证 snapshot 索引：跨导航后 `element_action 0` 明确 `index_not_found`，元素移除后同样明确失败，
  不存在的索引不会误点其它元素（见 AUDIT_MEMORY D183）。
- **并发 consume 竞态（fix130，已修复）**：两个客户端同时 `mcp_result{consume:true}` 同一
  task_id 时，原实现“先 `查询异步结果` 再 `删除异步结果`”非原子 —— 5 轮中 **1 轮（20%）两个
  客户端都拿到同一结果**。现新增 `消费异步结果`：同一锁内 `DELETE` + 同连接 `SELECT changes()`，
  只有真正删到行才返回结果；另一个明确收到“结果已被其它客户端消费(并发 consume)”。
  复测 **10/10 轮恰好 1 个赢家、both_ok=0**；单客户端首读有值、二次读消失的行为不变。
- **batch 内嵌 shutdown 会自杀（fix131，已修复）**：`browser_batch{commands:[{name:"browser_shutdown",
  arguments:{confirm:true}}]}` 实测执行后**整个 MCP 服务退出**，后续 ping 无回包、所有客户端调用失败。
  现顺序与 parallel 两条批量入口都拦截 `browser_shutdown`，子命令返回 `success:false` +
  「batch 内禁止…请作为顶层调用单独执行」。复测：failure_count=1、ping 存活、普通 batch 正常、
  并行 batch 也拦截、顶层 shutdown 仍可正常关闭。三客户端并发 consume 另测 8/8 轮恰好 1 赢家（D185）。
- **workflow / schedule 内嵌 shutdown 同样自杀（fix132，已修复）**：`workflow_run{steps:[{name:
  "browser_shutdown",arguments:{confirm:true}}]}` 实测执行后服务退出、ping 无回包；定时任务执行
  走同一派发口，同样可自杀。现 workflow steps 与 schedule 执行两处都拦截：workflow 返回
  `success:false/stopped:true/step_failed`，schedule 记 `fail_count=1` + `last_result 失败`，
  服务保持存活；batch 拦截回归仍 PASS。至此 batch（顺序/并行）、workflow、schedule 四入口全部封住。
- **edit_cut / edit_delete 假成功（fix133，已修复）**：无焦点时两者回“删除/剪切成功”但内容未变
  （输入框 ABCDE 不变）；光标无选区时 `delete` 也回成功但未删除。现新增 `取可编辑焦点快照`
  （activeElement 是否 INPUT/TEXTAREA/contenteditable + value），执行前检查、执行后回读比对：
  - 无焦点 → `未检测到可编辑焦点元素(NOT_EDITABLE:BODY)`，并提示先聚焦或改用 set_value
  - 有选区 delete → `INPUT|ABCDE -> INPUT|ADE`；cut → `INPUT|ADE -> INPUT|DE`
  - 光标无选区 → `删除命令已发送但内容未变化` 明确失败
  有选区时的正常行为不变。另测：编排内 `browser_close{confirm:true}` 只关浏览器、服务存活、
  可 `browser_create` 恢复，故不做自杀级拦截（D188）。
- **retry / task_runner_post 绕过 shutdown 拦截（fix134，已修复）**：`browser_retry{tool:
  "browser_shutdown",arguments:{confirm:true}}` 实测直接执行 shutdown、服务退出；`browser_task_runner_post`
  投递同名工具同样危险。现两处派发前都拦截，返回 `success:false` + 「禁止…请作为顶层调用单独执行」。
  复测：retry 3 次尝试全被拒、ping 存活；task_runner_post 投递后服务存活；正常 `retry ping` 仍成功。
  至此 **batch（顺序/并行）、workflow、schedule、retry、task_runner_post 五个包装入口全部封住**。
- **task_runner_post 回执误导 + 描述缺失（fix135，已修复）**：fix134 只在执行回调里拦截，
  `action=post` 仍回“已投递…”，调用方容易误以为 shutdown 已执行成功。现解析出工具名后**入口即拒**
  （`isError` + “不投递”），不再产生异步任务；同时给 batch / workflow_run / schedule /
  browser_retry / browser_task_runner_post 五个工具描述加前缀「编排入口禁止 browser_shutdown」，
  让模型在调用前就知道。复测：post shutdown 入口即拒、post ping 正常投递、retry 仍拒、
  5 个描述全 PASS、ping 存活。
- **edit_copy / edit_paste 假成功（fix136，已修复）**：无焦点时两者回“复制/粘贴成功”，但剪贴板
  与内容均未变化（ABCDE 保持）；有焦点时链路正常（copy 1..3 → paste → ABCDEBC → undo → ABCDE）。
  现 copy/paste 都先检查可编辑焦点；新增 `取编辑选区长度`，复制回执带“已复制 N 个字符”，
  无选区时明确提示“剪贴板可能为空”；粘贴执行后回读值并报 `before -> after`，值未变则失败。
  复测：无焦点两者拒绝、有选区 copy=2 字符、paste=ABCDEBC、无选区 copy 带提示。
- **undo/redo 回执无验证（fix137，已修复）**：原“撤销成功 / 恢复成功”无任何回读。现改为
  “已发送撤销/恢复命令(浏览器原生撤销/重做, 未回读验证) | 需要确认请用 browser_evaluate 检查目标值”。
  实测 delete 0..2 后 value=CDE → undo → ABCDE 仍生效。另测二级嵌套：
  `batch[task_runner_post{shutdown}]` 被入口拒绝（“不投递”）、服务存活；`batch[post ping]` 正常。
- **mcp_help 详述未同步（fix138，已修复）**：`tools/list` 用短描述、`mcp_help{tool}` 用“详述”字段；
  fix135 只改了短描述，导致 `mcp_help` 查这 5 个工具时看不到「编排入口禁止 browser_shutdown」。
  现两处都加同一前缀。复测：5 个工具 `list=True / help=True` 全通过；无参帮助仍为 3,208 字符、
  含【系统】区，不受影响。
- **详述缺口（fix139/140，已修复）**：351 工具全量双源扫描 **0 缺失**（303 可对齐、48 措辞差异、
  7 个极简工具正常）。关键词对账（必填/禁止/假成功/未回读/全量覆盖）发现 4 处短描述有、详述无：
  - `browser_navigate`：缺“代理不可用/DNS 失败时 CEF 显示错误页，但仍可能回 load_end（假成功），
    请用 get_url 检查 chrome-error:// 或读 body”
  - `browser_fill_set_value` / `browser_fill_click`：详述只有 frame_id 说明，缺“selector 未命中
    直接报错（不假成功）”
  - `browser_vip_unload_extension`：已有等价表述，补“(不假成功)”字样
  修复后复测关键词对账 **inconsistent=0**；fix138 双源回归 PASS。
- **11 个工具详述只有参数说明（fix141，已修复）**：抽检 48 个“短描述/详述开头不一致”发现，
  `browser_back` / `browser_forward` / `browser_reload` / `browser_get_text` /
  `browser_dom_query` / `browser_dom_click` / `browser_dom_get_html` / `browser_dom_rect` /
  `browser_dom_inner_html` / `browser_dom_set_html` / `browser_dom_set_value` 的
  `mcp_help` 详述只含「【参数 xxx】…」，没有工具主描述。现统一前置主描述；复测 **11/11 PASS**、
  `mcp_help` 缺失 **0**。
  注：`no_key` 仅 48→47 是判据对 `|` 与 `;` 敏感（标点不同即视为不匹配），其余 47 个抽检
  为开头措辞差异（create/close/find/window 系列），无 A/B 语义冲突。
- **get_source 截断标注未文档化（fix142，已修复）**：360KB 页面异步取源码返回 262,189 字符，
  末尾含 `[MCP: 源码已截断, 原始大小=373878 字节, 截断至=262144]` —— **功能正确**，但工具描述
  未提该标注，AI 可能把它当页面正文。现详述与 `max_chars` 参数均注明“超限截断并追加标注”。
  同轮确认：`set_preference{}` 明确「缺少参数: name」、成功回执含“无读取接口/字体类无页面效果”
  诚实边界；全库无 upload 工具（此前测试名有误，非缺陷）。
  过程中两处探针误判已修正：正则先匹配占位符 `task_id`、截断标注在尾部而判据只看头部。
- **browser_extract 静默截断（fix143，已修复）**：200 链接页面 `limit=5` 只回 5 条、
  **无 total/truncated**，AI 会误以为页面只有 5 个链接；默认 limit=100 同样静默截断。
  现 links 在截断时返回 `{items, count, total, truncated:true, next_action}`，
  未截断仍返回数组以保持兼容；`mcp_help` 详述与 `limit` 参数同步说明。
  实测：limit=5 → 5/200 对象；limit=500 → 200 条数组；默认 → 100/200 对象。
  注：images/tables 同族，下一批处理。
- **extract images/tables 静默截断（fix144，已修复）**：两分支与 links 同族，原先也静默截断。
  现同样在截断时返回 `{items, count, total, truncated:true, next_action}`，未截断保持数组。
  实测：images `limit=5` → 5/200 对象、`limit=500` → 200 条数组；tables `limit=1` → 1/3 对象、
  `limit=10` → 3 条数组。三个分支语义完全一致。
- **network list 静默截断（fix145，已修复）**：600 资源页面实测总 **1204** 条网络日志，
  但 `limit=100` 只回 100 条、回执仅有 `network_logs`，无 total/truncated。现新增
  `取网络日志总数` 并在回执补 `count/total/truncated`。复测：limit=100 → 100/1204/true；
  limit=1000 → 1000/1204/true。
  同轮确认无缺陷项：`find` 只回 `match_count`（无 limit 参数，与文档一致）；`get_text` 超 300KB
  末尾有 `[MCP: 文本已截断, 原始长度=329999, 截断至=262144]`；`vip_dom_search` 有
  `resultCount/returned` 分页字段（200/100，`to_index` 可翻页）。
- **browser_event 时间线静默截断（fix146，已修复）**：时间线 `limit` 默认 50、上限 500，
  但回执只有 `success/limit/timeline_json`，无 total。30 次导航后实测总 **13,790** 条事件，
  `limit=50` 只回 50 条却看不出还有多少。现新增 `取事件日志总数`（与 `查询事件日志` 同 WHERE，
  含 `browser_id=0` 的全局事件），回执补 `count/total/truncated`。
  复测：limit=50 → 50/13790/true；limit=500 → 500/13790/true；`count` 与 `timeline_json`
  实际条数一致。
- **console_get 静默截断（fix147，已修复）**：200 条 console 日志时 `limit=10` 只回 10 条、
  无 total；`limit=300` 回 200 条。现截断时返回
  `{console_logs, count, total, truncated:true, next_action}`，未截断保持原数组。
  复测：limit=10 → 10/200/true；limit=300 → 200 条数组。
  同轮确认 `get_cookies{limit:10}`（60 个 cookie）也只回 10 个、无 total —— 同族，下一批修。
- **get_cookies 回执丢 total（fix148，已修复）**：Cookie 收集回调里**本来就有**
  `total/truncated/truncated_to`，但 `命令成功_异步` 在同步命中时只回 `message`（数组），
  元信息被丢弃。现先 `同步等待异步任务(300ms)`，有结果就直接返回完整对象。
  复测 60 个 cookie：limit=10 → `total=60/truncated=true/truncated_to=10`；
  limit=500 → `total=60` 且无 `truncated`。
- **get_forms 外层无规模字段（fix149，已修复）**：120 字段表单的内层
  `forms_json` 完整（`count=1/forms=1/fields=120`），但外层只有 `success+forms_json`
  （双层编码），AI 需二次解析才知道规模。现外层补 `count` 与 `total_fields`
  （解析内层汇总）。复测：`count=1, total_fields=120`，内层仍 120 字段。
  同轮确认无缺陷项：`mcp_status / browser_resources / browser_list` 三源浏览器计数一致
  （1/1/1 → 新建后 2/2/2），`db_stats` 自洽（4972=1309+3663），`tool_count=351`；
  `get_frames` 在 40 iframe 页面返回 **41** 条，完整无截断。

- **reverse 三工具外层无规模字段（fix150，已修复）**：`browser_reverse_scan_crypto`、
  `browser_reverse_detect_obfuscator`、`browser_reverse_hook_logs` 此前外层只有
  `success` + `scan_json/detect_json/logs_json`（与 fix149 `get_forms` 同族的双层编码问题），
  AI 必须先反序列化内层 JSON 才知道命中了几条、日志被取回几条。现外层直接补规模字段：
  `scan_crypto` → `count`；`detect_obfuscator` → `detected`；
  `hook_logs` → `count` / `returned`（并保留原有 `hint`）。
  复测（`_dl/verify_fix150.py`）：三者键分别为
  `success,scan_json,count` / `success,detect_json,detected` / `success,logs_json,count,returned,hint`，
  **3/3 PASS**。内层 payload 结构未改动，旧客户端解析不受影响。

- **工具数口径全网不一致（fix151，已修复）**：`mcp_status` 与 `tools/list` 实测均为 **351**
  （`browser_*` 336 / `mcp_*` 6 / `workflow_*` 4 / `ping,batch,license_status,schedule,aliases` 5），
  但产品文档仍写 350，`_testrun/docs` 甚至残留 348/349；`QUICKSTART_ZH` 还把 `browser_*` 写成 335。
  AI 读到「350 工具」会按旧清单推断能力，属于**记忆型误导**。
  现统一为 351、`browser_*` 336、「另 15 个管理工具」（新增 `license_status`）：
  覆盖 `src/docs/*.md`、`src/docs/index.html`、`src/src/index.html`、`_release` 包内
  `index.html/docs/UPGRADE.txt/升级说明.txt`、桌面成品目录与 `_testrun`。
  历史 `CHANGELOG-v3.3.4/6.md` 与 `audit/*` 保留原值（当时实测确为 350/349，不改写历史）。
  复测：改后 dry-run 残留 **0 文件 0 行**；包内 `docs/index.html` 三处均为 351。

- **mcp_help 搜不到动作名（fix152，已修复）**：`browser_collect` 明确支持
  `action=console_get`，但 `mcp_help {query:"console_get"}` 命中 **0**，只有搜中文「控制台」
  才能找到——AI 按英文 action 名检索时会误判「没有取 console 日志的工具」。
  根因：`取简述文本` 在首个 `。` / `|` / `（` / 换行处截断，`|` 之后的
  `console_get / network_* / event_*_enable` 永远进不了搜索索引。
  现移除 `|` 切点、摘要上限 60→110 字符（保留 `。`/`（`/换行 截断，正文仍是摘要）。
  复测：`console_get` 0→**1**（命中 `browser_collect`）、`console` 2→**4**；
  常用词未爆噪音：get=15 / list=8 / network=5 / 截图=5 / hook=6 / cookie=11。

- **browser_extract 静默忽略 frame_id（fix153，已修复）**：`get_text` / `dom_query` /
  `dom_get_html` 都支持 `frame_id` 且实测生效，但 `browser_extract` 的 schema 没有该参数，
  传入被**静默忽略**，永远返回主框架数据。实测 iframe 内 200 条链接时
  `extract{type:"links", limit:5, frame_id:"<child>"}` 返回的是主框架的 5 条
  （first=`m0.html`），AI 会误判「iframe 里只有 5 条」。
  现 links/images/tables 三个分支统一改走 `CDP执行JS按框架 (browser, 参数JSON, js, 超时)`，
  schema 补 `frame_id`，描述注明与 `get_text` 同语义；指定子框架且 CDP 失败时**明确报错、
  不回退主框架**（与 get_text 的「回退链路不看 frame_id」约束一致）。
  复测：iframe 内 `limit=5` → `count=5, total=200, truncated=true`（first=`c0.html`）；
  `limit=500` → 200 条数组；子框架 `tables` → `K/V1`；坏 `frame_id` →
  明确「未找到框架」且**不回退**（输出 0 条主框架数据）。

- **snapshot / element_action 静默忽略 frame_id（fix154，已修复）**：两者原先都只在主框架
  执行 JS。实测 iframe 内两个按钮时，`browser_snapshot {frame_id:"<child>"}` 返回的是主框架
  的 `MAIN_X`（count=1），子框架元素完全不可见；`browser_element_action` 同理，
  按快照索引点击也落到主框架——AI 会以为「iframe 里只有一个按钮」并点错对象。
  现两者均在 `frame_id` 非空时走 `CDP执行JS按框架`，schema 补 `frame_id`；
  子框架失败明确报错、**不回退主框架**。
  复测：子框架快照只含 `CHILD_A`（不含 `MAIN_X`）；帧内点击后 `CHILD_A`→`CLICKED_A`
  且主框架按钮未被点击；坏 `frame_id` → 明确「未找到框架」；两者 schema 均含 `frame_id`。

- **click_text 不支持 frame_id / find schema 缺失（fix155，已修复）**：`click_text` 只读
  text/selector/index/exact，传 `frame_id` 被**静默忽略**并在主框架查找——子框架文本永远
  返回 `not_found_text`；`find` 的实现其实已走 `CDP执行JS按框架`，但 schema 没声明
  `frame_id`，AI 无从得知，且 `note` 固定写「iframe 内文本不计入」。
  现 `click_text` 支持 `frame_id`（走 `CDP执行JS按框架`，失败明确报错、不回退主框架）；
  `find` 补 schema，`scope`/`note` 按是否传 frame 动态
  （`frame_text_nodes` / `main_frame_text_nodes`）。
  复测：`click_text{frame_id}` → `CHILD_TARGET` 变 `CLICKED_CHILD` 且主框架不受影响；
  `find{frame_id}` → `match_count=1, scope=frame_text_nodes`；
  `find{主框架}` → `scope=main_frame_text_nodes`。

- **坐标参数类型错被静默当 0（fix156，已修复）**：`browser_mouse_click {x:"abc", y:1}`
  实测 `MCPJson取整数` 把 `"abc"` 变成 0，工具**真的在 (0,1) 点击**（回执「点击 (0,1)」）；
  `browser_scroll_by {y:"abc"}` 则静默滚 0 且仍回 `success`。AI 传错类型时会误点页面
  左上角，或误判「已滚动」。
  现两工具对 `x`/`y` 做严格校验：**字符串且转回文本与整数不一致 → 明确 `isError` 拒绝**；
  纯数字字符串（`"100"`）仍兼容（与 `browser_id` 的类型兼容策略一致）。
  复测：`x:"abc"` / `y:"abc"` → `isError=true` 且不回执点击；
  `x:100,y:100` 与 `x:"100",y:"200"` 正常；`scroll_by{y:100}` 正常（`requested_y=100`）。

- **10 个坐标类工具静默把字符串坐标当 0（fix157，已修复）**：继 fix156 修
  `mouse_click` / `scroll_by` 后，实测 `mouse_move{x:"abc"}` → 移动到 (0,1)、
  `touch_press/move/release` → (0,1)、`mouse_wheel` → 在 (0,1) 滚动、
  `vip_mouse_click/move/press/release/wheel` 同样把 `"abc"` 当 0 并真实注入；
  **全部回 `isError=None`**。AI 传错类型会在页面左上角误操作且毫无提示。
  现统一在每个 handler 的「x/y 键存在」检查之后插入严格校验：字符串且转回文本与整数
  不一致 → `isError` 拒绝；纯数字字符串仍兼容；`mouse_wheel` / `vip_mouse_wheel` 的
  `delta_x`/`delta_y` 一并校验。
  复测：9 项非法坐标全部 `isError=true`；`mouse_move`/`mouse_wheel`、`touch_press`/
  `touch_release`、`vip_mouse_move` 的合法坐标全部成功。
  未测：`vip_mouse_wheel`（调用即毒化本会话 CDP，校验代码同源）。

- **`browser_create` 回执是纯文本（fix158，已修复）**：成功时只回
  `浏览器已创建: about:blank | browser_id=2 | ...` 文本，AI 必须写正则才能拿到 ID；
  实测探针第一次就因 `json.loads` 失败而漏掉第二浏览器。
  现成功回执改为 JSON：`{success, browser_id, url, message}`，其中 `message` **保留原文**
  （`browser_id=2` 仍在），旧正则/旧客户端零改动即可继续用。
  复测：`browser_create` → `{"success":true,"browser_id":2,"url":"about:blank",
  "message":"... browser_id=2 ..."}`；随后 `browser_close{browser_id:2}` 回读确认已移除。

- **`fill_select` 反向泄漏到主框架（fix159，已修复）**：传 `frame_id` 时，
  主路径硬编码 `browser.取主框架()` 执行设置脚本，`frame_id` 只参与前置存在校验。
  实测 iframe 内 `<select>`：设置后**子框架仍 O0、主框架被改成 O1**——AI 明确指定了子框架，
  却改错了页面，且回执是成功。
  现改走 `CDP执行JS按框架 (browser, 参数JSON, js, 5000)`，JS 返回值判定
  （`not_found` → 明确 isError，不再静默成功）。
  复测：`fill_select{frame_id, value:"O1"}` → 子框架 O1 / 主框架 O0；
  `#nope` → isError + 「框架内匹配到 0 个元素」。

- **`vip_execute_js_context{frame_id}` 提交成功但永远失败（fix160，已修复）**：
  实测提交回 `task_id`，随后 `mcp_result` 连续 10 次均为
  「VIP操作失败或返回空数据」——该分支走 `高级_执行JS_框架ID`，依赖 VIP JS 执行环境，
  而门闩只覆盖 `target=main/all_frames/frame_index`，`frame_id` 路径未被检查，
  于是「提交成功、结果永久失败」，AI 无从得知原因。
  现 `frame_id` 分支改走 `CDP执行JS按框架`（不依赖 VIP 环境），**同步返回**
  `{success, frame_id, result, via:"cdp_frame"}`；失败明确 isError。
  复测：iframe 内 `CHILD_TOKEN_13` 正确返回、无主框架泄漏。

- **`batch parallel` 的 settle 条目缺 `ok` 字段（fix161，已修复）**：8 条命令中
  3 条真异步（`ok:true`+`join_ms`），5 条退化为 `settled_by_load_wait`
  （`settle_ms≈3031`，完整结果在 `submit_reply`），但**没有 `ok` 字段** ——
  AI 只看 `ok` 会把 5/8 误判为失败。
  现 settle 条目补 `ok:true` + `settled_by_load_wait:true`（顶层计数原已存在）。
  复测：`total=8, ok=8, settled=5`，且与顶层 `settled_by_load_wait=5` 一致。

- **`scrape` 对 404/DNS 失败假成功（fix163，已修复）**：404 返回错误页文本
  （`Error response ... 404`）、DNS 失败返回 `无法访问此网站 ...`，均 `isError=false`，
  AI 会把错误页当数据源。根因是 scrape 只在 Phase 0 判「加载结束」，不看 HTTP 状态。
  现 Phase 0→1（`mcp_result` 轮询路径，非 `load_end` 回调，CDP 安全）加导航闸门：
  `responseStatus>=400` 或 `href` 以 `chrome-error://` 开头 → `success:false` + `error`。
  复测：404 → `导航失败: HTTP 404`；DNS → `导航失败: HTTP 502 | chrome-error://...`；
  正常页 → `OK163`。
  注：`browser_navigate` 的同类问题**未修**——其完成点在 `load_end` 回调内，
  同步 CDP 会死锁（D100），需另走同步路径或调用方自查。

- **`dom_get_html` 元素不存在时报「无法序列化的值」（fix164，已修复）**：`dom_get_html
  {selector:"#nope"}` 原先落入通用序列化错误（「①JS返回了DOM对象/函数…②原生API目标元素不存在」），
  AI 无法判断到底是选择器错还是类型错。
  现加 `前置存在校验`，不存在时直接回「选择器在当前页面匹配到 0 个元素 -> #nope」+
  snapshot/get_forms/frame_id 建议；存在元素时仍正常返回 outerHTML。
  复测：`#nope` → isError + 0 元素提示；`#exists` → `<div id="exists">DGH_OK</div>`。

- **`snapshot` 的 `truncated` 语义错误（fix165，已修复）**：页面上 1 个 `display:none`
  按钮时，快照回 `count=0,total=1,truncated:true` + 「提高 max_items」——但元素是被
  **可见性过滤**（rect<2px）掉的，提高 `max_items` 完全无效，AI 会陷入无效重试。
  现区分两种情形：
  - `count >= max_items` 且 `count < total` → `truncated:true` + 「已按 max_items 截断」
  - `count < max_items` 且 `count < total` → `truncated:false` +
    「有 N 个元素因不可见/尺寸过小被过滤(不是 max_items 截断, 提高 max_items 无效);
    如需读取它们请用 browser_dom_query / browser_execute_js」
  主框架与 `frame_id` 两个分支同步修改。
  复测：隐藏按钮页 → `0/1, truncated=false` + 过滤说明；600 按钮页 → `200/600, truncated=true`
  + max_items 说明。

- **`snapshot` 把 `include_links` 排除误报为不可见（fix166，已修复）**：页面 3 链接 + 2 按钮，
  `include_links:false` 回 `count=2,total=5`，fix165 的文案却说「3 个元素因不可见被过滤」——
  实际是**主动排除链接**，AI 会改用 `dom_query` 白找。
  现快照 JS 增加 `links_skipped` 计数，外层分流：
  - 有链接排除 → 「已按 include_links:false 排除 N 个链接」（若还有不可见元素，附「另有 M 个…」）
  - 无链接排除 → 维持「有 N 个元素因不可见…」
  主框架与 `frame_id` 分支同步修改。
  复测：`all` 5/5 无提示；`no_links` 2/5 + 「排除 3 个链接」；隐藏按钮页 0/1 + 「不可见」。

- **`extract` 在错误页回 `[]`（fix167，已修复）**：导航到 DNS 失败页后，页面变成
  `chrome-error://chromewebdata/`，`browser_extract{type:"links"}` 回 `[]`——
  AI 会误判「页面没有链接」，而实际是**页面加载失败**。
  现 `extract` 入口先读 `location.href`，命中 `chrome-error://` → `isError` +
  「当前页面是浏览器错误页…请先 navigate 到有效 URL; 如需读取错误文本请用 get_text」。
  复测：错误页 → isError；正常页 → 2 条链接数组（无回归）。

- **`snapshot` 的 `max_items` 超上限回退 200（fix168，已修复）**：`max_items:99999`
  实测 `count=200`——AI 想拿更多反而**更少**，且与 `extract` 的「超限钳制」策略不一致。
  现改为钳制：
  - `max_items <= 0` → 默认 200
  - `max_items > 500` → **500**（原为 200）
  - `text_length > 500` → **500**（原为 80）
  复测：99999→500、0→200、500→500、300→300。

- **`wait{what:"navigate"}` 用前缀匹配导致永远超时（fix169，已修复）**：checkCode 用
  `h.indexOf(t)===0`（必须以目标为**前缀**）——AI 传 `"wa.html"` 这类部分 URL 时，
  完整地址 `http://127.0.0.1:PORT/wa.html` 不以它开头，永远不命中，只能等超时。
  现改为**包含匹配** `h.indexOf(t)!==-1`（与 `url_contains` 一致）。
  复测：`partial="nav169.html"` → 297ms 命中；`full=<完整 URL>` → 282ms 命中；
  `bad="NOPE_XYZ"` → 仍按 1200ms 超时（不误判）。

- **`schedule add` 允许创建 `browser_shutdown`（fix170，已修复）**：实测
  `schedule{action:"add", kind:"interval", spec:"3600", tool:"browser_shutdown"}`
  **创建成功**——执行侧虽已拦截（到点回「定时任务内禁止 browser_shutdown」），但任务会
  永久失败并被 500ms 节拍反复扫描，制造噪音；`_testrun` 中已发现 4 条历史遗留。
  现创建时即拒绝（与 `workflow` 一致），并提示「连通性测试请用 ping」。
  复测：shutdown → `isError` + 禁止提示；ping → 正常创建并删除；list 中无 shutdown 任务。

- **`network_idle` 在页面 fetch 进行中提前返回（fix171，已修复口径）**：实现只用
  「最近一条网络日志的时间」近似空闲，**不检查活动请求**；实测页面发起 2s fetch 后，
  `wait{what:"network_idle", idle_ms:500}` 在 **561ms** 就回「网络已空闲」。
  且该判定依赖网络日志已捕获该请求（未 enable 或 XHR 未入日志时同样提前返回）。
  本轮修复**口径与回执**：成功消息追加「口径边界：仅按网络日志最近一条的时间近似，
  且该请求须已被网络日志捕获(必要时先 browser_network {action:"enable"})；
  页面内 fetch/XHR 若未进日志则不会等待 —— 等 AJAX 建议改用 selector/text 轮询或 execute_js」。
  真正的活动请求计数需接 Network 域事件，改动大，留作后续。

- **scrape 的 wait_selector 超时消息缺上下文（fix172，已修复）**：实测
  `scrape{wait_selector:"#never", max_ms:2500}` → 「等待超时(2500ms): scrape=」，
  等号后为空——AI 不知道是哪个 selector 没出现、在哪个 URL 上。
  现补上下文：「等待超时(2500ms): scrape 未等到 wait_selector=#never | url=http://…」；
  无 wait_selector 时显示 `load_end`。

- **`network_idle` 不等页面 fetch（fix173，已实现真实判定）**：原实现只看「最近一条
  网络日志的时间」，2s fetch 期间 561ms 就回「网络已空闲」。
  现增加**活动请求判定**：查最近 50 条网络日志，统计最近 **5s 窗口**内
  `type:"req"` 与 `type:"res"` 数量，若 `req > res`（有未完成请求）则继续等待，
  即使「距上次请求」已超过 `idle_ms`。
  复测：页面发起 2s fetch 后，`wait{network_idle, idle_ms:500}` 等到 **2691ms**
  （fetch 完成 + 500ms 空闲）才返回；不再提前。

- **`network_idle` 文案与新实现不一致（fix174，已修复）**：fix173 把判定改为
  「最近 50 条日志的 req/res 配对（5s 窗口）」后，成功消息仍写「仅按最近一条近似」。
  现统一为「判定口径: 最近 50 条日志的 req/res 配对(5s 窗口), req>res 视为有活动请求」，
  并保留「需网络日志已捕获该请求（可先 browser_network enable）」边界。

- **`network_idle` 超时消息缺上下文（fix175，已修复）**：持续轮询页面实测
  `等待超时(3000ms): network_idle=`（等号后为空）。
  现补：「network_idle 未达成 —— 最近 5s 内仍有未完成请求(req>res)，或最近请求距今
  < idle_ms=<n> | 页面持续轮询时建议改用 selector/text 等待目标内容」。
  同轮确认两端：无请求页面 46ms 返回「已空闲」；持续轮询页面 3316ms 正确超时。

- **异步回执输出占位符 task_id（fix176，已修复）**：`browser_vip_execute_js_context`
  等异步命令的回执写着 `mcp_result {request_id:"<task_id>"}` —— 字面占位符，调用方
  照抄必然查不到结果。现回执直接拼接真实任务 ID；实测
  `enable → get_js_env_ids → execute_js_context{context_id} → mcp_result` 取回
  `{"type":"number","value":2}`。

- **`vip_get_js_env_ids` enable 后首次返回空清单（fix177，已修复）**：新增执行上下文
  是异步创建的，实测 enable 后立即取清单 `count=0`，约 0.5~1s 后才有值，调用方会
  误判"没有可执行环境"。现自动短重试 **5×200ms**（合计约 1s），仍空才如实返回空；
  复测 enable 后首次调用即 `count=1`。

- **`wait` 组合参数被静默忽略（fix178，已修复）**：实测
  `browser_wait{what:"network_idle", selector:"#never"}` 63ms 就回「等网络」——
  selector 完全不生效，调用方误以为元素已出现；`what:"selector"` 带 `idle_ms:5000`
  时 idle_ms 同样被丢弃、1.5s 直接超时。现在误用直接报错并给两步方案：
  先 `network_idle` 再 `selector`（或一站式 `scrape{wait_selector}`）。
  复测：两种误用均 `isError=true` 且文案含「分两步」；正常调用仍提交成功。

- **`get_forms` 的 `form_index` 负值静默当“全部表单”（fix179，已修复）**：实测
  `form_index:-1` 返回 `success:true` 且枚举全部表单 —— 调用方若本意是“最后一个表单”
  会被误导；`form_index:99` 的越界文案只有「不足 100 个」，不含请求值与实际数量。
  现在负值明确 `isError`（“负数不会表示最后一个表单；省略才是全部”），越界回显
  `form_index=99 越界: 该页面只有 1 个表单(合法 0..0)`。复测省略/0 仍正常返回 `count:1`。

- **`navigate` 到 DNS/连接失败页仍报成功（fix180，已修复）**：实测
  `http://not-exist.invalid/` 返回 `isError` 空、消息「等待条件满足: load_end」，
  正文却是「该网页无法正常运作 / HTTP ERROR 502」——AI 会把错误页当目标内容继续抓取。
  现三处完成点（同步等待返回 / mcp_result JSON 完成 / `wait{load_end}` 轮询完成）统一调用
  `检测浏览器错误页`（ERR_ 码、Chrome 内置错误页文案、代理 5xx，且正文 <900 字），
  命中即判失败并给 DNS/网络/代理排查建议。复测：`.invalid` 判错，
  example.com / 本地 200 长文 / about:blank 均无误报。

- **`reload/back/forward` 同步完成同样会假成功（fix181，已修复）**：fix180 只接了
  `navigate`；三个导航控制工具在同步等待返回时若落在浏览器错误页（刷新后服务器 5xx /
  历史页已失效）仍回成功。现三处补同一闸门。复测：首次 200 → `reload{ignore_cache:true}`
  遇 503 判错并含「上游返回 5xx」；正常页刷新无误报。

- **崩溃重建后导航假成功 / 重定向超时（fix182–184，已修复）**：kill 渲染进程后浏览器
  自动重建为欢迎页，此时 `navigate` 的完成判据只比时间戳或只看「地址已变」——
  CEF 在**导航提交瞬间**就更新地址，于是把欢迎页/空白判成完成，回执成功但 `get_text`
  取不到目标元素；而严格地址比较又会把 302 重定向判成超时（实测 `/redir → /final`
  8s 超时，页面其实已到）。
  现抽出 `等待URL可接受`：地址相符，或实际为 http(s) 重定向落点**且本轮 load_end 已落下**；
  明确排除 `file://` 欢迎页、`about:`、`chrome-error`。三处调用统一：事件完成、等待自愈、
  注册补查。复测：`/redir` 回执给 `/final`；`about:blank` 回执不错位；崩溃重建后
  example.com 正文正确；正常页无误报。

- **崩溃重建后无任何可观测信号（fix185，已修复）**：kill 渲染进程后浏览器自动重建，
  `browser_list` 只剩新 id，AI 只看到「旧 id 突然不存在」，无法判断发生了什么。
  现崩溃回调记录摘要，`mcp_status` 新增 `last_crash`（浏览器ID / 状态 / 错误 / 时间）。
  复测：启动时无该字段；kill 渲染进程后出现「状态=被杀死」。

- **普通站点 4xx/5xx 页被当正常页面（fix186，已修复）**：`http://…/e404` 返回自定义
  「Not Found」页（无 Chrome 错误页文案）→ navigate 报成功，AI 会把 404 内容当数据。
  现 `浏览器_载入结束` 的主框架状态码按浏览器 ID 缓存（关闭/崩溃时清理），
  `检测浏览器错误页` 优先判 `>=400` 并回具体码；navigate/reload/back/forward/wait 四处
  完成点自动覆盖。复测：404/403/500 判错；200、302→200、example.com 无误报；
  DNS 仍走 Chrome 错误页判据。network 日志 res 条目同时补 `status`。

- **`click_text{index}` 点到隐藏元素无提示（fix187，已修复）**：页面两个「确定」，
  第二个 `display:none`；`click_text{text:"确定", index:1}` 会触发隐藏元素的 click
  并回成功，回执只有 tag/text。现在回执补 `visible:true/false`，false 时附
  「元素不可见(display:none/尺寸为0)…请改用 selector 或 snapshot」。
  复测：默认点击 `visible:true`；index=1 `visible:false` + 提示；不存在仍报错。

- **`clear_cache` 空参误清所有源（fix188，已修复）**：全工具空参冒烟发现
  `browser_clear_cache{}` 返回成功，`origin=` 空、对象/类型掩码均为 `4294967295`（含
  cookies/localStorage 等登录态位）—— 任何漏参调用都会清光所有站点数据。
  现在无任何限定（origin/targets/storage_types 全空）时，必须显式 `confirm:true`；
  否则 `isError` 并提示先缩小范围。复测：`{}` 拒绝；`confirm:true`、`origin`、
  `targets` 三种限定均正常提交。

- **`create_url_request` 连接失败假成功（fix189/190，已修复）**：实测
  `browser_create_url_request{url:"http://127.0.0.1:1/"}` 返回「请求完成(无响应体)」，
  `success:true` —— DNS/连接/TLS 失败全被当成成功。
  现在 `即将完成` 按 `取请求错误码()` 判 `success`；非 0 时附
  「URL请求失败: error_code=-312…请检查目标地址与网络」。
  另在 `获取到数据` 提前捕获响应状态（环境自适应）；本机 CEF 的 URL 请求回调不暴露
  响应对象，成功用例 `status_code` 仍不可得，provisional 回包已注明该边界。
  复测：200 正常返回 OK；连接失败明确判错。

- **HAR 导出字段不合规（fix191，已修复）**：`browser_network_export{format:"har"}` 实测
  `startedDateTime:"56073171"`（启动毫秒）、`time:"0"`（字符串）、`request.method:""`、
  `response.content_size`（非标准）—— 与「兼容 DevTools 导入」声明不符。
  现 `startedDateTime` 为 ISO（导出时刻；事件时间戳是运行时钟，无法与墙钟同基准换算，
  `log.comment` 已如实说明）、`time` 为数字、`method` 空时兜底 GET、
  `response.content.{size,mimeType}` + `bodySize` 齐备。复测 10 条全部合规。

- **`compile_script` 语法错误假成功（fix192，已修复）**：实测
  `browser_reverse_compile_script{source:"var bad_b=;"}` 返回 `success:true`，
  语法错误藏在 `cdp_result.exceptionDetails` 里 —— AI 会误以为源码可热补丁。
  现在 `Runtime.compileScript` 结果含 `exceptionDetails` 即判 `isError`，回
  「编译失败(语法错误)」并带 lineNumber/columnNumber/SyntaxError 原文。
  复测：合法源码 success；非法源码 isError；`evaluate_silent("1+1")` 仍正常返回 2。

- **`evaluate_silent` 把不可序列化对象显示成 `{}`（fix193，已修复）**：实测
  `browser_reverse_evaluate_silent{expression:"document.body"}` 只回
  `{"result":{"type":"object","value":{}}}` —— AI 会误判“对象为空”。
  现在这类塌缩结果补 `warning`：「通常表示 DOM 节点/循环引用/不可序列化对象，
  **不代表它真是空对象**；请只返回具体字段或改用 dom_resolve / execute_js」。
  正常数值结果不加 warning；`compile_script` 断言错误仍判失败。

- **`reverse_patch{dry_run:true}` 对 CompileError 假成功（fix194，已修复）**：实测
  `browser_reverse_patch{source:"var drybad=;", dry_run:true}` 回 `success:true`，
  `cdp_result.status:"CompileError"` 只藏在文本里 —— dry_run 等于白验，AI 会继续热补丁。
  现在 `Debugger.setScriptSource` 结果含 `status:CompileError` 即判 `isError`，回
  「热补丁编译失败(CompileError)」+ SyntaxError 原文。复测：合法源码 dry_run 通过；
  非法源码判错；`compile_script` 断言错误仍判失败。

- **`intercept{action:clear,url}` 静默忽略 url（fix195，已修复）**：实测
  `browser_intercept{action:"clear", url:"pic.png"}` 清空**全部**规则，回执只写
  「所有拦截规则已清除」，未说明 url 被忽略 —— 调用方会以为只清了单条。
  现在有 url 时回执追加：「你传了 url=…，但 clear 的语义是**清全部规则**，该参数被忽略」。
  复测：`clear{url}` 有提示、`clear{}` 无提示、`block` 后图片 `naturalWidth=0` 无回归。

- **`kernel_auth` 空凭据假成功 + clear 残留（fix196，已修复）**：实测
  `browser_kernel_auth{action:"set", host:"example.com", port:443}`（无 username/password）
  回 `success:true`，list 显示 `username:""` —— 既不能认证又占用 host:port 匹配项；
  且 `clear{host,port}` 只删第一条匹配，`host:port:realm` 变体残留。
  现在 `set` 要求 username/password 都非空；`clear` 删除 `host:port` 与所有
  `host:port:realm` 变体，回执含「删除 N 条」。复测：空凭据拒绝 → 两条凭据 → clear 删 2 条 → list 空。

- **崩溃重建后 CDP 观察者记账未重置（fix197，已修复记账；恢复受 CEF 限制）**：实测
  kill 渲染进程后 `mcp_status` 仍 `cdp_observer_registered:true`，但
  `cdp_channel_alive:false`，`browser_cdp_call` 10s 超时。根因：崩溃时旧实例已从数组移除，
  `注销CDP观察者` 走「附着浏览器不存在→保留注册状态」，重建浏览器因此跳过注册。
  现崩溃路径调用不依赖浏览器句柄的 `强制重置CDP观察者状态`（清标志/附着实例/健康度/世代）。
  复测：重置生效、重建会重新尝试注册；但本机 CEF 的 DevTools 会话在崩溃后仍无法恢复
  （注册返回真、通道不通）——属类库限制，`cdp_channel_alive=false` 已如实暴露，需重启进程。

- **`navigate_redirect` 把相对路径当主机名（fix198，已修复）**：实测
  `browser_intercept{action:"navigate_redirect", url:"/old", target:"/new"}` 回 success，
  随后导航 `/old` 被送到 **`http://new`**（DNS 错误页）—— 相对 target 被 CEF 当作主机名。
  现在 target 必须以 `http://` 或 `https://` 开头，否则明确拒绝并给出绝对 URL 示例。
  复测：相对 target 拒绝；绝对 target 使 `/old` 落到 `/new`（NEW_PAGE）；
  `modify` 文本替换（window.A=777）无回归。

- **orientation angle 被忽略 / viewport 作用域不明（fix199，已如实标注）**：
  `vip_orientation{type:0, angle:90}` 刷新后页面 `angle` 仍为 0（type 变为
  landscape-primary，组合反而自洽性可疑）；回执原先只说「屏幕方向已设置」。
  现在回执回显 type/angle 并标注「angle 恒为 0（类库忽略）；需要自洽的风控建议 type=1
  （portrait-primary 与 angle 0 一致）」。
  `vip_fingerprint_viewport` 回执补实测作用域：只改 `window.visualViewport.width/height`，
  `innerWidth/innerHeight/screen.*` 不变。复测：viewport 800×600 生效、innerWidth 仍 984。

- **`fingerprint_plugins` 自定义项未注入且静默清空（fix200，已如实警告）**：实测
  `{type:2, json:[{name:"Probe Plugin",…}]}`（含/不含 mimeTypes 均试）刷新后
  `navigator.plugins.length` 变为 **0**（默认 5 个 PDF 插件也没了），回执只说「已设置」。
  类库限制：无法回读、未注入自定义项。现在 type=1/2 回执强警告「空列表比默认更异常，
  建议 type=0 恢复或自行刷新验证」；type=0 回执说明恢复默认。复测 type=0 后 n=5。

- **`set_web_version` 设置后 UA 无变化（fix201，已如实标注）**：实测
  `{version:"120"}` 回 success，刷新后 `navigator.userAgent` 与 `userAgentData.brands`
  仍为 `Chrome/135`（未变）；`"120.0.0.0"` 会被正确拒绝（只收 116–135 纯数字）。
  现在回执明确「实测无页面差异，可能只影响内核内部版本上报；要伪装 UA 请用
  browser_fingerprint_ua」，并保留格式错误提示。

- **css/v8 版本设置回执缺少边界（fix202，已修复）**：`set_css_version{120}` 与
  `set_v8_version{120}` 均回 success，但页面无对应回读 API，原文只说「已设置」；
  且 `set_v8_version{12.0}` 会被拒（要求 116–135 内核版本号），schema 只写「版本号」。
  现在回执分别标注「页面无 CSS 版本回读 API」「version 是 Chrome 内核版本号、不是 V8 12.x」，
  schema 描述同步改为「内核版本号(116-135 纯数字; 不是 V8 12.x)」。

## 产物

- `AI-Fbowser-Mcp.exe`：9,756,672 字节（fix202）
- SHA256：`8196739DF937DFFD5724C2C6AD7C5B3D84D58966670B5A1FB437E1F9521B8002`
- 补丁包：`_release/AI-Browser-MCP-v3.3.6-patch.zip`
  （116,558,042 字节，SHA256 `0156B81D790E7698CEB49FC67E96E40AAF66FC9135C5D28763B30F631F76E71F`；
  含 fix202 exe / 351 工具口径的 index 与 docs / 三件套 DLL / launcher；
  旧包保留为 `.69/71/.../201.zip`）
- 编译：火山视窗 x64，0 错误 0 警告


## 版本自证与安装目录（fix203，2026-10-29）

> 本节不含 exe / 源码改动，未重新打包；只修安装目录 + 新增发布门禁。

1. 「启动首页仍显示 3.3.4」根因：开始菜单指向的安装目录
   `AppData\Local\Programs\XiaodaoMCP-3.3.2\AI-Browser-MCP-x64-v3.3.2-optimized`
   内仍是旧 exe（FileVersion 3.3.4）与旧 index.html；该旧首页三处版本号还互相矛盾
   （3.3.4 / 3.3.1 / 3.3.1）。源码、_testrun、_release 均为 3.3.6。
2. 已原地升级该目录：先备份到 `_backup_3.3.4_<时间戳>`，再同步 6 个文件并逐个 SHA 校验；
   exe 现为 3.3.6 / 9756672 字节 / SHA256 8196739DF937DFFD5724C2C6AD7C5B3D84D58966670B5A1FB437E1F9521B8002。
3. 新增 `_dl/verify_fix203.py` 版本自证门禁 8 项，修正脚本自身两处缺陷后 8/8 PASS。
4. 30 分钟长跑改为 90 秒短跑：144 轮 0 错误、进程数恒定 6、RSS -2.4%、句柄 -338，PASS。
5. 纠正两条误判：example.com 已改版无 h1（非假成功）；服务器中文原始字节为标准 UTF-8。


## 并发导航回执归属（fix204，2026-10-29）

1. 缺陷：同一浏览器上两个并发 `browser_navigate` 时，先发起的请求会认领后一次导航的
   `load_end`，回执写成后者的 URL（实测 3/3 复现）；页面最终状态正确，但回执与请求不符，
   AI 会对错误页面继续抓取。
2. 根因：`等待URL可接受` 对"任意 http(s) 且本轮已完成"直接放行（fix184 为 302 重定向引入），
   没有区分"本次导航被重定向"与"页面被另一次导航接管"；事件路径与自愈补查路径都存在。
3. 修复：新增按浏览器 ID 的"最近一次导航目标"槽（navigate 载入前登记）；事件解析与自愈补查
   在判定前先比对——目标不一致即视为已被接管，不认领这次 `load_end`。
4. 结果：顺序导航不受影响；并发时先发起者明确超时，后发起者正常完成且 URL 正确。
5. UX：两处超时回包追加"并发 navigate 会接管页面，请串行或各分配独立浏览器"的可行动提示。
6. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；`_dl/probe_nav_race.py`、
   `_dl/probe_timeout_hint.py` 验证通过。


产物（fix204）：

- exe `9,765,376` 字节 / SHA256 `9553352C6785BEE043627881B80979CF0E4CF06C54B2FFD621AB4ED774D56BC1`
- zip `116,560,111` 字节 / SHA256 `C20E9019CDC1592977FDC24F82DEC37177AB7D9018AB3547DA75ED79952E5F9E`
- 已同步：`_release\v3.3.6-patch`、桌面成品、安装目录
- 包校验 `verify_fix152_pkg.py`：5/5 PASS


## 句柄失效与慢客户端背压（fix205，2026-10-29）

1. 维度：失效对象句柄（D24 延伸）—— 页面跳转后继续用旧 objectId。
   实测 `getProperties` / `callFunctionOn` / `queryObjects` 三者均明确报
   `Cannot find context with specified id`，进程存活、无串台（原有行为正确）。
2. 改进：在 CDP 错误统一出口 `取CDP同步结果错误` 增加映射——命中
   `Cannot find context` / `Execution context was destroyed` / `Cannot find execution context`
   时追加"重新 `browser_reverse_dom_resolve` 取新句柄、不要复用旧 object_id"。
3. 维度：慢客户端背压（新）。不读 stdout 时连续发 5 / 40 个 `tools/list`(约 177KB)：
   无假死、无丢响应（6/6、41/41）、RSS 131→145MB（5 与 40 个请求相同）——
   属同步写 + 有界背压，不是无界队列；恢复读取后 ping 3.0s 到手。
4. 结论：背压维度 PASS，无需改动。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 并行结果可判性与异步异常（fix206，2026-10-29）

1. 缺陷：`browser_batch{parallel:true}` 的 `results[].ok` 恒为 true —— 它只表示"拿到了结果正文"，
   `ping` 到不存在的 `browser_id=9999`、JS 抛异常也都是 `ok:true`，AI 会漏判失败。
2. 修复：新增 `command_success`（从 `result` / `submit_reply` 的 success/error 判定）。
   实测 5 条结果：`true / false(throw) / true / true(navigate) / false(9999)`，归属与 `seq` 全部正确。
3. 缺陷：`result` 被硬编码截断到 1200 字符且无标注，与 schema 承诺的 4000 不符。
   修复：上限提到 4000，超长时标注 `result_truncated` 与 `result_chars`。
4. 缺陷：`async_only` / `parallel` 路径走 CEF 原生回调，**结构上拿不到 JS 异常文本**，
   `throw new Error(...)` 被报成"无法序列化的值"。同步 `execute_js` 与 `browser_evaluate` 均能返回
   `JS异常:Error: ... @line/col`（已实测）。修复：原生兜底文案明确指向"改用同步 execute_js 或 browser_evaluate"。
5. 维度补充：跨浏览器 objectId 复用 —— B2 用 B1 的句柄被明确拒绝（"CDP 通道附着在 ID=1,
   切换会永久破坏通道"），同句柄放回 B1 仍可用；进程存活。
6. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## SOCKS5 代理可发现性（fix207，2026-10-29）

1. 实测链路（`_dl/probe_s5_proxy.py`，本地 SOCKS5 服务器记录 CONNECT）：
   `browser_set_s5_proxy{127.0.0.1:11080}` → 导航 LAN 目标时服务器收到 2 条 CONNECT（代理确实生效）；
   `browser_clear_proxy` → 再次导航变 `ERR_CONNECTION_REFUSED` 且**无新 CONNECT**（已恢复直连）；
   指向无人监听端口的代理 → `ERR_PROXY_CONNECTION_FAILED` 明确失败，不是假成功。
2. 缺陷（可发现性）：工具名不对称 —— 有 `browser_set_s5_proxy`，清除却只有
   `browser_clear_proxy` / `browser_vip_clear_s5_proxy`，没有 `browser_clear_s5_proxy`。
   按名字对称猜测会得到 `工具不存在`（本轮首次探针即复现）。
3. 修复：`browser_set_s5_proxy` 成功回执直接给出清除入口，并明说没有 `browser_clear_s5_proxy`。
4. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## SOCKS5 协议修正（fix208，2026-10-29）

1. 实测取证（`_dl/probe_s5_auth.py`，自建 SOCKS5/HTTP 双识别服务器）：
   `browser_set_s5_proxy{address:"127.0.0.1:11082"}` 后导航，服务器收到的是
   `GET http://host/path HTTP/1.1`（http 目标）/ `CONNECT host:443`（https 目标）——
   **裸 host:port 实际被当成 HTTP 代理**，与工具名/描述"SOCKS5"不符。
2. 只有 `address:"socks5://127.0.0.1:11082"` 才发真正的 `0x05` 握手，随后 RFC1929
   `auth u1 p1` 认证成功。即类库支持 SOCKS5，但**要求显式 scheme**。
3. 修复：`browser_set_s5_proxy` 对不含 `://` 的地址自动补 `socks5://`；显式 `http://`
   保持原样（允许故意用 HTTP 代理）；回执回显实际生效地址。
4. 复测：A 正确账号 → `socks5_methods [0,2]` + `auth u1 p1`；B 错误密码 → `auth u1 WRONG`
   被拒；C 不传账号 → 仅 `[0]`（no-auth）被拒；D 显式前缀 → 与 A 一致。
5. 影响面：此前按 host:port 配置 SOCKS5 的用户，流量实际走 HTTP 代理（多数 SOCKS5 服务器
   会直接断开），表现为"代理已设置但全部导航失败"。
6. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 内核级输入破坏 CDP 的止血（fix209，2026-10-29）

1. 实测：`browser_vip_mouse_click{x:10,y:10}` 之后，`browser_execute_js` **连续两次 20s 无回执**；
   同一时刻 `browser_get_url`（缓存）与 `ping` 正常，`mcp_status.cdp_ready` 仍为 true。
   即内核级输入会永久破坏本会话 CDP 通道，旧回执完全没有警告。
2. 影响：AI 点一次 VIP 坐标后，后续所有 CDP 族工具（execute_js/evaluate/debugger/reverse）
   每次都要白等 20~30s 才失败，且看不出原因。
3. 修复（止血，不改变类库行为）：
   - `browser_vip_mouse_click` 回执明确警告"本会话 CDP 已失效，需重启；日常点击请用
     `browser_mouse_click`（CDP 路径）"；
   - 会话级标志 `内核输入已破坏CDP`：置位后 `执行CDP并同步等待` **立即返回空串**，
     上层直接回退原生路径 —— 实测同一调用从 **20.0s → 0.0s**。
4. 坐标语义顺带验证：`browser_mouse_click` 传 `dom_rect` 中心 (200,150) 命中，
   页面记录 `clientX=200, clientY=150`，与 rect 完全一致（`dpr=1, innerWidth=984`）。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 内核输入全覆盖 + VIP 坐标语义（fix210，2026-10-29）

1. 实测：`browser_vip_mouse_press` 与 `browser_vip_mouse_click` 一样会破坏本会话 CDP
   （press 后 execute_js 20.0s 无回执）；`vip_mouse_release` / `vip_key_click` 本身仍能执行
   （0.1s），但 CDP 不会恢复。故整族内核输入都需要警告。
2. 覆盖：12 个 `browser_vip_mouse_*` / `browser_vip_key_*` 工具的 schema 描述统一追加
   "内核级输入会使本会话 CDP 通道失效(实测 execute_js 随后 20s 无回执, 需重启恢复);
   日常操作请优先用 CDP 路径"。
3. 代码：`browser_vip_mouse_press` / `mouse_release` / `key_click` 也置会话标志
   （与 mouse_click 一致），后续 CDP 调用立即原生回退，不再 20s 超时。
4. **VIP 坐标语义修正**：用 `document.title` 回读（绕开 CDP/JS 回调）实测——
   `browser_vip_mouse_click{x:200,y:150}` 命中 rect(100,120,200,60) 的按钮，title 变
   `CLICK:200,150`；改传归一化值 (6660,6972) 无反应。结论：**VIP 也是页面 CSS 像素**，
   与 `browser_dom_rect` 同坐标系。原描述"x,y为页面坐标(0~32767)"易被误读为归一化刻度，
   已改为"CSS 像素；0~32767 只是类库上限，不是归一化刻度"。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 内核输入族全覆盖（fix211，2026-10-29）

1. 方法：`_dl/probe_vip_family.py` —— 每个工具**独立进程**测试（避免前一工具污染），
   调用后立刻 execute_js（10s 预算）判断 CDP 是否仍可用。
2. 结果（修复前）：`mouse_move` / `mouse_wheel` / `key_press` / `key_release` /
   `key_input` / `key_type` / `touch_cancel` 全部 **10.0s CDP_BROKEN**；
   仅 `touch_emulation` 为 **0.0s CDP_OK**（不破坏）。
3. 修复：上述 7 个工具补置会话标志 + 回执警告（与 fix209/210 同款）。
4. 复测：8/8 全部 **0.0s CDP_OK**（破坏 CDP 的 7 个走原生回退，不再 10s 超时；
   touch_emulation 本来就不破坏）。
5. 至此内核输入族 11 个破坏项已全部处置（mouse_click/press/release/move/wheel、
   key_click/press/release/input/type、touch_cancel）；touch_emulation 明确不置标志。
6. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## MV3 SW 唤醒 + parallel 混排（fix212，2026-10-29）

1. MV3 service worker：`_dl/probe_mv3_sw.py` 自建 MV3 扩展（SW 仅响应消息），
   页面空闲 35s 后由 content script 的 DOM 事件触发消息，SW 回复
   `{alive:true, upMs:0}` —— `upMs=0` 说明 SW 确实被挂起后**重新启动**并正常响应。
2. 该维度 PASS，无需改代码（D298 留下的 MV3 缺口已闭环，见 D300）。
3. parallel 跨浏览器 + 导航混排：`_dl/probe_parallel_nav_mix.py`，4 台浏览器 ×
   (navigate + execute_js) × 3 轮 = 24 条结果，`url_after` 全部归属正确、
   `command_success` 全 true、speedup 4.00~5.55。
4. 发现的解析坑：`results` 按**完成顺序**输出（实测 `0#1` 排在 `0#0` 前面），
   不是 `seq` 顺序；AI 若按数组下标对应 tasks 会张冠李戴。
   修复：回执 `说明` 明确"请按 seq 字段还原原始顺序，不要按数组下标对应 tasks"。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## create_url_request 超时边界可见（fix213，2026-10-29）

1. 实测：本地黑洞服务器（accept 后永不响应）下，`browser_create_url_request` 提交 0.04s 返回 task_id，
   但 `mcp_result` 到 **40 秒仍是 `_waiting`**；两次黑洞各占一条连接，正常请求仍 0.0s 成功。
2. 查证：并非卡死 —— `URL请求超时毫秒 = 180000`（设计上限 3 分钟），`URL请求最大并发 = 32`，
   超时后由维护逻辑释放槽。D11 曾记录的"8s 超时"是连接阶段，读阶段按 180s。
3. 缺陷（可发现性）：提交回执只说"已提交, 通过 mcp_result 查询结果"，AI 会把
   "3 分钟执行中"误判为工具挂死并反复重试，把并发槽越占越多。
4. 修复：回执明确写出"单条请求最长 180s 后超时并释放并发槽（黑洞期间执行中属正常）；
   并发上限 32，满了会明确报 'URL请求并发已满'"。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## URL 请求超时的落库时机（fix214，2026-10-29）

1. 实测（`_dl/probe_urlreq_release.py`，3 分钟窗口）：黑洞请求提交后 185s 查
   `mcp_result` 得到 **"未找到任务结果"**，并附带一堆与事实不符的排查建议
   （仍在执行 / 拼写错误 / consume 过 / 过期清理）。
2. 随后新建一次 `browser_create_url_request`（到正常本地服务器），同一 task_id 再查变成
   `URL请求超时: 超过 180000ms 未收到任何完成/失败回调 | 已回收并发槽; CEF 侧原请求可能仍挂着,
   其晚到结果将被忽略`。⇒ 超时结果**由下一次创建触发落库**，不是定时器。
3. 另一组实测（`_dl/probe_urlreq_timeout180.py`）：230s 内不新建 → 一直 `_waiting`；
   连续提交 33 个 → 第 33 个被明确拒绝 `URL请求并发已满(32)`。
4. 修复（可发现性，两处文案）：
   - 提交回执：写明"180s 判定超时；超时结果需下一次 create_url_request 触发清理才落库"；
   - "未找到任务结果"：新增第 ⑤ 条成因，直接指向该行为与触发方法。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## AI 参数别名导致的假成功（fix215，2026-10-29）

1. 实测 `browser_screenshot{path:"_dl/alias.png"}`：回执 `success:true` + base64，
   但 `_testrun/_dl/alias.png` 与 `_dl/alias.png` **都不存在** —— 参数被静默忽略，
   AI 会以为截图已落盘。落盘参数实际是 `save_to`。
2. 实测 `browser_dom_query{attr:"value"}`：回 `""`（按无属性退化成 textContent），
   同样是静默错答案。属性参数实际是 `attribute`。
3. 修复：两者命中常见别名（`path/file/filename`、`attr/prop`）且主参数缺失时
   **明确拒绝并给出正确写法**，不再静默成功。
4. 其余误写本就明确：`fill_set_value{target}` → `selector 不能为空`；
   `click_text{txt}` → `text 参数不能为空`；`navigate{URL}` → `参数 url 不能为空`；
   不存在的工具（`browser_goto` / `browser_click`）→ JSON-RPC -32602 `工具不存在`。
5. 唯一仍宽容的是 `browser_get_text{sel:"body"}` → 按"未指定 selector"返回全文；
   返回了真实内容，不构成假成功，暂不改（避免破坏"省略 selector 取全文"的既有用法）。
6. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 异步异常可见（fix216，2026-10-29）

1. 缺陷：`browser_execute_js{async_only:true}` 走 CEF 原生回调，结构上拿不到 JS 异常，
   `throw` 只能得到 `[无法序列化的值]`（fix206 只是加了提示）。
2. 修复：`async_only` 分支改为**优先 CDP 异步求值**（`Runtime.evaluate` + returnByValue），
   CDP 不可用（非主浏览器/通道坏/内核输入后）再回退原生。回执说明随之更新。
3. 实测（`_dl/probe_async_raw.py`）：`tasks/result` 返回
   `{"success":true,"method":"Runtime.evaluate","result":"{...exceptionDetails...}"}`，
   其中 `exception.description = "Error: boom-raw\n at <anonymous>:1:13"`、
   `lineNumber=0, columnNumber=6` —— 异常文本与行列号完整可见。
4. 连带修复：`parallel` 的 `command_success` 之前把 CDP 外层 `success:true` 误判为成功，
   现识别 `exceptionDetails` 判为失败（`子成功判定` 新增该判据）。
5. **已知遗留（重要）**：兼容层 `mcp_result` 对这类回执只返回文本 `"success"`（丢正文）。
   标准 `tasks/result` 完全正确。下轮修 `mcp_result`；在此之前请用 `tasks/result`。
6. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## mcp_result 兼容层丢正文（fix217，2026-10-29）

1. 现象：fix216 后 `tasks/result` 已能返回完整 `exceptionDetails`，但同一 task_id 用
   `mcp_result` 只得到 `{"content":[{"text":"success"}]}` —— 正文整段丢失。
2. 根因（`MCP_Server_Core.wsv`）：`message` 为空时**写死** `msg = "success"`；
   且 `是否成功` 只看 CDP 外层 `success:true`，不认 `exceptionDetails`；
   封装层又只把 `message` 作为 `content.text` 展示，`data` 不展示。
3. 修复三处：
   - `message` 缺失时回落 `result`（CDP 正文所在）；
   - `exceptionDetails` 命中即判 `是否成功=假`（匹配不带引号，因内层键被转义为 `\"exceptionDetails\"`）；
   - 失败时把 `result` 正文附进 `message`（否则封装层仍看不到）。
4. 复测：`mcp_result` 返回 `isError=true`，text 含
   `[任务task_...] JS异常(exceptionDetails, 完整文本与行列号见 result 字段): 页面脚本抛出了异常 | result={...}`，
   `result` 内为完整 `exceptionDetails`（`Error: boom-raw @line 0 col 6`）。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 非主浏览器异常提示纠偏（fix218，2026-10-29）

1. 实测：在 `browser_create` 出来的 2 号浏览器上执行 `throw`，**同步** `browser_execute_js`
   同样只回 `[无法序列化的值]`（CDP 只附着主浏览器，同步/异步都走原生）。
2. 旧文案（fix206 引入）却写"改用同步的 browser_execute_js"—— 在非主浏览器场景**无效**，
   属误导性指引。
3. 修复：文案改为按浏览器角色分流 ——
   主浏览器：改同步 `execute_js` / `browser_evaluate` 可拿到 `JS异常:Error...`；
   非主浏览器：本会话 CDP 只附着主浏览器，需改到主浏览器执行。
4. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## kernel 工具的 browser_id 语义可见（fix219，2026-10-29）

1. 实测 10 个 `browser_kernel_*`（cert/auth/download/scheme/menu/watch/
   reverse_functions/trace/algo/probe）：「不传」与「传 `browser_id=2`」回执**完全一致**
   （长度与内容均相同），`browser_id` 被静默忽略。
2. 结论：这组工具是**全局作用于进程 / 主浏览器**的，不按浏览器寻址 ⇒
   schema 不声明 `browser_id` 是正确的；但 AI 传了会误以为生效。
3. 修复：16 个 `browser_kernel_*` 工具的 schema 描述统一追加
   "内核层工具: **不接受 browser_id**(传了会被静默忽略); 作用于进程或主浏览器"。
4. 验证：`tools/list` 中该文案出现 16 次（`probe_schema_browserid.py` 复跑仍为 306/45，
   说明没有误加 `browser_id` 属性）。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 空参破坏性副作用（fix220，2026-10-29）

1. 全量 336 工具空参扫描里有 74 个「成功」，逐类核对后 71 个为幂等/查询
   （`resume` 未暂停、`stop_find` 未在找、`workflow_stop` 无运行中等，均显式说明）。
2. **真问题**：`browser_fingerprint_apply{}` 空参会真的下发指纹 ——
   回执 `dry_run:false, applied:["ua_set(CEF层UA/UA-CH数据): ..."]`。
   schema 虽把 `dry_run` 列为 required，但**服务端不校验 required**，空参照样执行。
   指纹是风控关键参数，误改比报错更糟。
3. 修复：缺失 `dry_run` 直接拒绝，并说明 `true=只预览 / false=真正下发`。
   复测：空参 → 明确拒绝；`dry_run:true` → `success:true, dry_run:true, derived:...`。
4. 另两个有副作用的空参（不改）：
   - `browser_clear_cache_browser{}` → 只清 `file://`（欢迎页缓存，不碰登录态），可接受；
   - `browser_vip_new_tab{}` → 建一个标签（可用 `browser_close` 关掉），可接受。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## execute_js 的 max_ms 硬顶（fix221，2026-10-29）

1. 实测：页面主线程忙等 10s 时，`browser_execute_js{max_ms:3000}` **实际 9.0s 才成功返回**
   —— `max_ms` 在最需要它的场景（卡死页面）失效。
2. 根因链：`取JS执行等待毫秒` 确实读 `max_ms`；但 CDP 用满预算后走
   `子框架原生回退(..., 回退预算毫秒, ...)`，而**原生是同步 CEF 调用**，会一直等到主线程空闲，
   "200ms 保底"对它没有任何约束力。
3. 修复：预算耗尽（`最大等待毫秒 - 已用 <= 0`）时**直接返回超时**，不再进入原生回退。
   回执明确：`JS执行超时: CDP 已用满 Nms, 页面主线程可能被长任务/死循环占用 | 已跳过原生回退`
   + 现有超时后缀（"死循环/长任务 → browser_create_tab / browser_close"）。
4. 复测：同一场景 **9.0s → 6.4s**，返回 `⏱ 操作超时(3s)` 而非"成功"。
   仍超出 3s 预算约 3.4s，来自 CDP 层"插桩自救"（900ms 分段 + resume 续等），未进一步优化。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## browser_get_text 的 max_ms 硬顶（fix222，2026-10-29）

1. 实测：忙等 15s 的页面里，`browser_get_text{selector:"body", max_ms:3000}` **14.0s 后成功返回**
   （isError=false）。
2. 两处根因：
   - selector 路径的 CDP 调用**硬编码 10000ms**（`CDP执行JS按框架(..., 10000)`），完全不读 max_ms；
   - 即使 CDP 超时，返回的是 `{"error":"JS执行超时..."}`（非空），旧逻辑继续走"原生回退"再等 10s。
3. 修复：
   - `max_ms` 显式时覆盖 JS 预算（缺省仍 10000，零行为变化），重试路径同预算；
   - 识别 `JS执行超时` 错误串即终局，直接返回，不再进入原生回退。
4. 复测：**14.0s 成功 → 3.3s `isError=true`**，文案含
   `取文本超时 | ...已跳过原生回退... | ①browser_stop 或 browser_close ②去掉 max_ms ③确认没有 while(true)`。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## CDP 按框架求值的 max_ms 统一（fix223，2026-10-29）

1. 排查：全项目 `CDP执行JS按框架(...)` 共 **26 处调用**，预算各自硬编码
   （3000/5000/8000/10000），导致多数工具的 `max_ms` 形同虚设。
2. 修复：在 `CDP执行JS按框架` 内部统一——`参数JSON.max_ms > 0` 时覆盖调用点默认预算
   （上限 300000，缺省行为完全不变）。一处改动覆盖全部 26 个调用点。
3. 复测：`browser_dom_get_html{selector:"#d", max_ms:3000}` 在忙页面 **3.2s 明确失败**，
   文案为"获取HTML未执行: 无法确认元素是否存在 —— CDP 探测没有给出结论(原始返回: JS执行超时...) |
   这是保守拒绝"，不再是长时间等待。
4. `browser_get_text` 仍为 3.2s（fix222 未被破坏）。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 全局 CDP 域不被暂停态误拦（fix224，2026-10-29）

1. 现象：`browser_debugger_resume` 回执"已恢复执行"之后，`browser_cdp_call{ServiceWorker.stopAllWorkers}`
   仍被"页面当前处于 Debugger.paused"拒绝 —— 暂停快照没有随 resume 刷新，导致无法强制终止 SW。
2. 修复：暂停态预检放行**不依赖页面 JS 运行**的全局域 ——
   `ServiceWorker.` / `Target.` / `Browser.` / `Profiler.` / `HeapProfiler.` / `Tracing.` /
   `SystemInfo.` / `Schema.`；页面相关域仍保留暂停保护（避免拖垮 CDP 健康度）。
3. 复测：`stopAllWorkers` 从"被拦"变为真实 CDP 错误 `-32000 ServiceWorker domain not enabled`；
   补 `ServiceWorker.enable` 后 `stopAllWorkers` 返回 `{}`。
4. 连带闭环 D331：SW 被终止后，70 秒内 `chrome.alarms` 重新唤醒 SW，
   storage 计数 `n: 4 → 5`（`lastAt` 更新）——**MV3 SW 强制终止后 alarm 恢复通过**。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 下载完整性提示（fix225，2026-10-29）

1. 实测：服务器声明 `Content-Length: 10MB`，只发 5MB 后断连；下载目录留下
   `abort10.bin` **5,242,880 字节** —— 与完整文件**同名同扩展名**，没有 `.crdownload` 临时后缀。
2. 原因：CEF 的下载直接写目标路径，不使用临时文件 + 完成重命名（Chrome 浏览器自己的做法）。
   故中断后无法从文件名区分半截与完整。
3. 修复（可发现性）：`browser_start_download` 回执明确——
   "中途断流会留下与目标同名同扩展名的半截文件（无 .crdownload），
   请用 download_complete 事件或对比文件大小/Content-Length 确认完整后再使用"。
4. 未修根因（CEF 行为，改造成本高且风险大）；`browser_kernel_download list` 只回控制队列，
   不提供逐文件进度（回执已提示用 `browser_event` 查 `download_progress`）。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 下载断流语义纠正（fix226/fix227，2026-10-29）

1. 新发现：`Content-Length=10MB` 只收 5MB 后断连，等 **20 秒仍只有 `download_progress`**
   （`speed=0`、`percent=50`），**CEF 不触发 `download_complete`/`download_canceled`**。
   fix225 的文案让 AI"用 download_complete 确认"——在该场景会永远等不到。
2. fix226（终态字段收紧）：`completed` 从"已结束 或 收满"改为"已结束 **且**(总大小未知 或 收满)"，
   并新增 `incomplete=true`（收满=false 且 total>0）。对"有终态但没收满"的情况给出正确标记。
3. fix227（文案纠正）：`browser_start_download` 回执明确——
   "断流时 CEF 不触发 complete/canceled，只剩 progress 且 speed=0、percent<100；
   判定完成请以 `received_bytes==total_bytes`（或 `percent==100`）为准，不要死等 complete"。
4. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 下载断流补 `download_stalled` 事件（fix228，2026-10-29）

1. 背景：D336 证实 CEF 对"对端断流"不触发 `download_complete`/`download_canceled`，
   只有 `speed=0` 的 `download_progress`，AI 无从收口。
2. 修复：在下载进度回调里按 `download_id` 累计"`speed==0` 且 `received<total`"的次数，
   **连续 5 次**写一条 `download_stalled` 事件（同一 download_id 只报一次）：
   `{download_id, received_bytes, total_bytes, percent, stalled:true, incomplete:true, note}`。
3. 实测：断流后 `browser_event{event_type:"download_stalled"}` 返回
   `{"download_id":19,"received_bytes":5242880,"total_bytes":10485760,"percent":50,
   "stalled":true,"incomplete":true,"note":"...文件是半截, 不要当完整使用..."}`。
4. 状态变量放在 `浏览器容器`（`下载停滞ID/计数/已报ID`），正常下载（speed>0 或收满）会把计数清零。
5. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 下载断流的恢复路径（fix229，2026-10-29）

1. 实测：断流后对**同一 URL** 再次 `browser_start_download` —— 服务器**收不到新请求**
   （`reqs` 仍只有 1 条），文件停在 5MB；加 `?retry=1` 也无效。
2. 可行路径：先 `browser_kernel_download{action:"cancel", url}`（回执"已排队，将在下次进度回调执行"），
   再 `browser_start_download` 同一 URL ⇒ 服务器收到新请求，文件恢复为**完整 10,485,760**。
3. fix229：`download_stalled` 事件的 `note` 写明该恢复路径
   （直接重试会被忽略；先 cancel 再 start_download）。
4. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## iframe 坐标语义标注（fix230，2026-10-29）

1. 实测（outer 页内嵌 inner iframe，按钮在 iframe 内 100,60）：
   - `browser_get_frames` 正确返回 inner 的 `id/url/parent_id/is_main`；
   - `browser_dom_rect{selector:"#ibtn", frame_id:inner}` 返回 **iframe 内局部坐标**（x=100,y=60）；
   - 不传 `frame_id` 时明确报"元素不存在"（不会误读主框架）；
   - `browser_click_text{text:"INNER-BTN", frame_id:inner}` 正确命中，iframe 内
     `document.title` 变为 `CLICKED:180,85`（= 按钮中心，iframe 局部坐标）。
2. 风险：`browser_mouse_click` 需要**页面坐标**；AI 若直接把 `dom_rect`（iframe 局部）
   喂给 `mouse_click`，会点偏 iframe 偏移量（本例 50,80）。
3. 修复：`dom_rect` 在 `frame_id` 非 main 时追加
   `coordinate_space:"iframe"` 与 `coordinate_note`（说明需加偏移、跨域无法自动换算，
   建议改用 `browser_click_text{frame_id}` 或 `browser_element_action`）。
4. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 嵌套 iframe 自动累计偏移（fix231，2026-10-29）

1. 需求：`dom_rect` 在 iframe 内只给局部坐标，多层嵌套时 AI 无法手工累加。
2. 实现：`dom_rect` 的 JS 在元素所在上下文里逐层读 `window.frameElement.getBoundingClientRect()`
   并把 `left/top` 累加；跨域链在访问 `frameElement` 时抛错，用 `offset_resolved=false` 标记。
   返回新增：`page_x / page_y / offset_x / offset_y / offset_resolved`（原 `x/y` 仍是局部坐标）。
3. 实测（outer → A(50,80) → B(20,30) → 按钮(10,10,100×40)）：
   `offset_x=70, offset_y=110`、`page_x=80, page_y=120`、`offset_resolved=true`；
   用 `page` 中心 `(130,140)` 调 `browser_mouse_click` **精确命中**，
   B 内 `document.title` 变为 `NCLICK:60,30`（= 按钮中心）。
4. 回归：fix149 / fix150 / fix202 / fix203 全 PASS；包校验 5/5 PASS。


## 跨域 iframe 与"假暂停"（fix232 / fix233，2026-10-29）

1. **假暂停（fix232）**：`Debugger.paused` 快照存在 `async_results` 持久表里，强杀进程后
   新会话会继承上一条暂停记录 → `browser_cdp_call` / 触摸等被永久判为"暂停态"而拒绝执行。
   现在启动首次打开缓存库时只清 `Debugger.paused` / `Debugger.resumed` 两个键（不动其它事件历史）；
   同时暂停态放行只读命令：`Page.getFrameTree` / `Page.getLayoutMetrics` / `Page.getNavigationHistory`
   / `Page.captureScreenshot` / `DOM.*` / `Network.*` / `Emulation.*`。
2. **只读查询不再改状态（fix233）**：`browser_debugger_last_paused` 原本在"没有暂停"时会
   **自动制造暂停**，一次"看一眼"就把页面停住，后续工具全被暂停守卫拦下。
   现默认只读返回 `{"paused":false,...}`；要旧行为请显式传 `auto_pause:true`。
3. **跨域 iframe 不再静默跑主框架（fix232）**：`解析框架执行上下文` 在"名字/地址都取不到"时
   按两侧条数 + 序号兜底；而 CEF 清单顺序 `[子帧, 主帧]` 与 CDP 框架树 `[主帧, 子帧]` 相反，
   序号 0 直接落到主框架 → `browser_execute_js{frame_id=跨域子帧}` 静默返回**外层**内容。
   现改为"先按已知地址认领 CDP 帧，再在未认领集合里按序配对"，并在兜底匹配上追加自证
   （隔离世界里 `window===window.top` 为真即判失败），宁可如实报错也不返回错误框架的答案。
4. **offset_resolved 误报（fix233）**：跨域父帧下 `window.frameElement` 返回 **null**（不是抛错），
   旧 JS 正常退出循环 → `offset_resolved=true` 且偏移 0，`page_x/page_y` 被当成页面坐标是错的。
   现改为 `while(w.parent && w.parent!==w)` + `frameElement` 为空即 `ok=false`。
5. 实测：
   - 真跨域（127.0.0.1:18116 嵌 127.0.0.1:18117）：`rect` 返回
     `offset_resolved=false, page_x=40, page_y=30`，`execute_js{frame_id}` 返回
     `XI|http://127.0.0.1:18117/inner`，`click_text{frame_id}` 命中并触发 `XCLICK:110,55`。
   - 同源嵌套回归：`page_x=80, page_y=120, offset_resolved=true`，点击 `(130,140)` → `NCLICK:60,30`。
   - `last_paused` 连续 5 次调用均返回 `paused:false`，期间 `get_text` / `execute_js` 正常。
6. 教训：`localhost` 在本机解析到 IPv6，而测具只监听 `127.0.0.1` → iframe 根本没加载，
   之前"跨域内容为空"的结论是**测具错误**；构造跨域请用同主机不同端口，并核对服务端命中日志。

## 定时任务的跨进程身份绑定（fix234，2026-10-29）

1. 实测缺陷：scheduled_tasks 只存裸 browser_id，而实例 id 在重启后会被复用。上一进程的 interval 任务(browser_id=1)在新进程启动后立刻执行，把新会话的主浏览器导航到了旧任务的 URL —— browser_list 直接显示 index.html 被替换成上一轮的 /b。
2. 修复：任务表新增 session_tag（进程唯一：毫秒+随机），老库用 PRAGMA table_info 检测后 ALTER TABLE 补列。节拍检查每轮先把「browser_id>0 且 session_tag 不是本进程」的 enabled=1 任务停用，并把原因写进 last_result（不执行，因此不会碰新浏览器）。schedule{action:'enable'} 会同时把 session_tag 改写为当前会话。
3. 死目标处理：执行前先查目标实例；不存在/已关闭 → 一次失败即停用并写明原因。否则 1 秒周期任务每天会写 8.6 万次 fail_count/last_result。
4. 可观测：schedule list 新增 session_tag 与 cross_session（空标签=老版本创建，同样判 true）。
5. 实测（两进程）：A 建 browser(2)+interval 任务并退出；B 中该任务 enabled=false / cross_session=true / target_alive=false，主浏览器仍在 index.html；enable 后 session_tag 变为 B 的，下一次节拍判死目标停用，fail_count 1→2。

## 内核监视的事件时间口径（fix235，2026-10-29）

1. 实测缺陷：新进程调用 browser_kernel_watch{action:list}，返回的 changes_json 里含上一进程遗留的 t1/d137b 变更，AI 会误以为这些是当前正在发生的监视事件；列表也没有"当前是否真的在求值"的字段。
2. 修复：查询事件日志 新增可选参数 起始毫秒（SQL: AND created_at>=?，0=不限）；watch list 传 服务器启动时间戳；返回新增 evaluating / changes_since_ms / changes_scope。
3. 实测（修复后）：list 只回本进程的 w1 变更；changes_since_ms 等于进程启动时间；evaluating=true；关闭非主浏览器后 evaluating 仍为 true（kernel_watch 按契约作用于主浏览器，已在描述声明）。
4. 回归：browser_event（空参/按类型）、browser_kernel_cdp_monitor list、schedule list、browser_cdp_event 均正常，ping 正常。
5. 工具链坑（重要）：火山的方法**参数列表与 `{` 之间不能写注释** —— 会导致整个类解析失败，日志不在该文件上报错，只表现为其它文件上千条"找不到 MCP命令服务器"的级联错误（本次 2372 条）。注释必须放进方法体。

## 浏览器目标解析加固（fix236 / fix237，2026-10-29）

1. 先纠正一个误判：browser_id 由路由层写入 取目标浏览器ID()，取主浏览器() 在该值>0 时返回目标实例。因此 browser_start_download / browser_event 原本就按目标浏览器工作（实测传 browser_id=2 时下载事件 browser_id=2）。本轮静态扫描"115 个分派块未出现 browser_id 字面量"绝大多数是该机制下的误报，不能当缺陷。
2. 加固内容（行为增强，不是修 bug）：
   - browser_start_download：显式解析 browser_id + 实例存在校验；目标已关闭时明确报"目标浏览器不存在或已关闭(browser_id=N)，不会回退"，回执新增"目标浏览器=browser_id=N"。
   - browser_event：同上；失效目标不再回泛化的"无浏览器"。
3. 实测：默认→主浏览器 main2.bin（事件 browser_id=1）；browser_id=2→b2.bin（事件 browser_id=2），不带 browser_id 查不到 2 的事件（符合过滤语义）；browser_id=999→明确失败未回退；ping 正常、两浏览器存活。
4. 维度：D19 调用契约 / D18 记忆一致性 —— 机制核实，无新增缺陷。

## JS 合成点击与弹窗静默拦截（fix238，2026-10-29）

1. 实测缺陷：browser_click_text 用 JS 合成事件(isTrusted=false) 触发点击，不构成用户手势。点击 window.open / target=_blank 元素时，浏览器**静默拦截**：不创建弹窗、不产生 popup/popup_failed 事件、回执仍是 success（AI 会以为点成功了）。
2. 对照证据：
   - JS 合成点击(click_text)：无弹窗、无事件、无错误；
   - CDP Input 点击(browser_mouse_click)：弹窗创建成功(browser_list 出现新实例)，并记录 popup 事件；
   - 内核级点击(browser_vip_mouse_click)：同样创建成功。
3. 修复（低风险，不改点击方式）：click_text 的探测 JS 增加 popupish/href；点击后若浏览器数量未增加，回执追加 popup_blocked=true、popup_href、popup_hint（建议 browser_create_tab 或 browser_mouse_click，内核级会破坏 CDP 会话）。
4. 实测：OPENPOP 按钮 → popupish=true / popup_blocked=true / 提示完整；PLAINBTN → popupish=false、无告警、title 正常变 PLAINOK；浏览器数保持 1。
5. 残留：onclick 里动态拼接的 URL 无法静态取出(href 为空)，此时按 hint 用 browser_mouse_click 在元素中心点击即可触发真实弹窗。

## 快照索引点击的弹窗告警（fix239，2026-10-29）

1. 与 fix238 同族：browser_element_action（snapshot 的 index 闭环）也用 JS 合成点击，点 target=_blank / window.open 元素时同样被静默拦截。
2. 修复：探测 popupish/href；click 后浏览器数未增则回 popup_blocked=true + popup_href + popup_hint（create_tab / browser_mouse_click / 内核点击三选一）。
3. 实测：index=0(OPENPOP) → popupish=true / popup_blocked=true / 提示完整；index=1(PLAINBTN) → popupish=false、无告警、title 变 EAOK；浏览器数保持 1。
4. 同时核实 browser_dom_click（原生 DOM click）也不触发弹窗（回"已点击(原生)"但无弹窗、无事件）。已在工具描述中明确标注该限制与替代路径（CDP Input / 内核点击）。
5. 结论：三条 JS/DOM 合成点击路径的弹窗语义现已一致：能检测的给告警（click_text / element_action），不能改行为的给文档（dom_click）。

## 堆快照的订阅顺序与可轮询误导（fix240，2026-10-29）

1. 实测缺陷：browser_reverse_heap{action:snapshot} 的 note 要求"先订阅 HeapProfiler.* 再触发采集"，但本工具**就是触发器** —— 按文档顺序不可能做到，分片必然全部丢失；返回的 snapshot_task_id 又让人以为能 mcp_result 轮询（实测永远"未找到任务结果"）。
2. 修复：提交 takeHeapSnapshot 前自动(幂等)订阅 HeapProfiler.*（max=5000，自动 HeapProfiler.enable）；返回新增 auto_subscribed / subscribe_result / poll_hint，note 改写为"无需也无法先订阅再触发"。
3. 实测（10 万对象页面）：auto_subscribed=true；subscribe_result 显示 "CDP监控已添加: HeapProfiler.* (max=5000) + HeapProfiler.enable"；随后 browser_kernel_cdp_monitor list 的 patterns 含 HeapProfiler.* 且 events_json 已出现真实 addHeapSnapshotChunk 分片；ping 正常。
4. 残留：分片体积大时仍受 event_log 单条截断与 max=5000 上限约束，需分批读取。

## CDP 监控的 max 上限与清空回收（fix241，2026-10-29）

1. 实测缺陷一：browser_kernel_cdp_monitor{action:add, max:100} 的 max 只写在回执里 —— 写入侧完全不限量，list 又写死读 200 条。实测 Network.* 订阅下 200 条事件全量入库(4.8MB)，与 max 无关。
2. 实测缺陷二：action=clear 删除行后 SQLite 文件不缩小（WAL 仍 4.14MB）。
3. 修复：写入侧每 50 条按当前 max 修剪最旧行（DELETE ... ORDER BY id DESC LIMIT -1 OFFSET max）；list 按 max 读取（上限 1000）；clear 末尾执行 PRAGMA wal_checkpoint(TRUNCATE)。
4. 实测（max=20，120 张图片页）：events_json=20 条；db 36,220,928 不变；WAL 436KB → 4,140,632 → clear 后 20,632 字节（回收 4.1MB）；ping 正常。
5. 备注：分片/事件单条仍受 event_log 单行截断约束；max 上限 5000，list 单次最多 1000 条。

## CDP 通道失效后快速失败（fix242，2026-10-29）

1. 实测缺陷（UX）：关闭附着浏览器后新建实例，browser_cdp_call **干等 10s** 才回泛化的"操作超时"，用户无法判断是页面慢还是 CDP 已死；同一时刻 execute_js 走原生仍正常。
2. 修复：新增 CDP通道失效 标志（附着浏览器关闭时置真）；新实例注册成功后在**锁外**做一次 2.5s Page.getFrameTree 探活，成功才清除标志；标志为真时 browser_cdp_call 立即返回可行动错误（不再等 10s）。
3. 实测：关闭前 cdp_call 0.04s 成功；关闭主浏览器并新建实例后 cdp_call **0.03s** 返回
   "CDP 通道已失效…新实例复探也未恢复(CEF 限制, 需重启进程)…改用原生路径"；execute_js 仍返回页面标题；ping 正常。
4. 结论：CEF 的 CDP 会话不随浏览器重建而恢复（与历史结论一致）；本轮把"沉默 10s"改成"明确 0.03s 失败 + 替代路径"。

## WebSocket 拦截的无浏览器语义（fix243，2026-10-29）

1. 实测缺陷（UX）：关闭主浏览器后调 browser_vip_websocket_intercept{enable:false}，返回"没有可用的浏览器 | 请启动AI浏览器GUI窗口" —— 但该工具本身**不支持单独禁用**（应提示用 browser_intercept clear），且 stdio 模式没有 GUI 窗口，提示不可执行。
2. 修复：把与浏览器无关的两个判定（缺 enable / enable=false 不支持）前置；无浏览器时只有 enable=true 才回"需先 browser_create"，并注明 stdio 不自动开 GUI。
3. 实测：无浏览器时 enable:false → "不支持单独禁用(与浏览器无关)"；缺参 → "enable 不能省略"；enable:true → "需先 browser_create"；创建实例后 enable:true 正常成功。

## UI 审计：截图默认视口 + 工具数文案（fix244，2026-10-29）

1. 商业 UI 审计发现：browser_screenshot 缺省宽高写死 1920×1080，CDP 按该尺寸裁剪、视口外补白 —— 1400 窗口下截图右侧/底部大片白边，视觉上像"页面只有 976 宽"。像素扫描证明暗色区实际到 x≈1372、底部 y≈805（等于真实视口），页面布局本身正常，误导来自截图工具。
2. 修复：缺省尺寸改为实时读取 window.innerWidth/innerHeight（CDP 不可用时回退 1920×1080）。
3. 实测：1400×900 窗口、不传宽高 → 截图 1384×805（原 1920×1080），暗色铺满整图（last_nonwhite_x=1372，仅滚动条区域）。
4. UI 文案：标题/meta 写 351 工具，徽章与统计卡写 350 —— 实测 tool_count=351，已统一为 351（回读 badge/stat 均 351），并同步 src/_testrun/_release/桌面/安装目录/构建输出。

## UI 窄屏统计卡布局（fix245，2026-10-29）

1. 实测：560×900 窗口（innerWidth 544）下无横向溢出，但 .stats-row 的 auto-fit/minmax(130px) 把 4 张统计卡排成 3+1，"自动"单卡独占一行，视觉不均衡。
2. 修复：@media(max-width:600px) 增加 .stats-row{grid-template-columns:repeat(2,1fr)}，窄屏固定 2×2。
3. 实测：560 宽下 2×2（351/stdio、0/自动），scrollWidth 536 < innerWidth 544，无横向滚动；900/640/560 三档均无溢出。

## 链接点击 activation 与命中优先级（fix246 / fix247，2026-10-29）

1. 实测缺陷一：browser_click_text / element_action 用 dispatchEvent 合成点击，`<a href>` **不触发默认导航**（需要 trusted activation）。点欢迎页"完整文档"后 URL 不变、无错误；同一坐标用 CDP 真实点击可正常跳到 docs/index.html。
2. 修复：对 `<a href>` 改用 `el.click()` 触发 activation；其他元素仍走合成事件。回执新增 `activation`（anchor.click / synthetic）。
3. 实测缺陷二：click_text 的文本匹配先命中包裹链接的 div（innerText 同样含目标文字），实际点了外层容器。未显式给 index 时改为「语义可点击优先(a/button/input) + 文本更短优先」排序；显式 index 语义不变。
4. 实测：click_text "完整文档" → tag=a / activation=anchor.click / URL=docs/index.html（标题为文档页）；element_action(index=2) 同样跳转成功。

## click_text 候选元素覆盖（fix248，2026-10-29）

1. 实测缺陷：click_text 的候选选择器只含 button/a/span/div/li/label/td/input[submit|button]/[role=button] —— 点 `<summary>` 文本 "SM" 直接回"未找到可点击元素"（页面上明明存在且可见）。
2. 修复：候选与相似建议两组选择器都补上 summary 与常用 ARIA 角色（[role=link]/[role=option]/[role=tab]/[role=menuitem]/[role=switch]）。
3. 实测：click_text "SM" → tag=summary、details.open=true；同页 label → checkbox 仍为 true（无回归）。
4. 边界（本轮已核）：`<button type=submit>` 合成点击能提交表单（URL /submitted?q=hello）；browser_dom_click 原生点击链接可导航。

## contenteditable 与 shadow DOM 覆盖（fix249 / fix250，2026-10-29）

1. 实测缺陷一（假成功）：fill_set_value 走原生 置元素内容，对 contenteditable 元素无效 —— 回执"已设置: #ce"，但 innerText 仍是 init。
   修复：写入后 JS 兜底（isContentEditable → focus + innerText + input 事件）并回读确认；不一致则明确失败。
   实测：CE_TEXT=NEWTEXT、回执"已设置(contenteditable 回读确认)"；input 路径仍返回"已设置"且值 NEWVAL。
2. 实测缺陷二（覆盖缺口）：click_text 的候选选择器不穿透 shadow DOM —— Web Component 内的 SHADOWBTN 报 not_found_text。
   修复：递归收集 open shadow root 后统一查询候选。
   实测：点中 shadow 内按钮（tag=button），页面 title 变 SHADOWOK。
3. 边界：closed shadow root 仍不可达（浏览器限制）；建议列表仍只扫 document（提示性差异）。

## snapshot / element_action 穿透 shadow DOM（fix251，2026-10-29）

1. 实测缺口：browser_snapshot 用 document.querySelectorAll，open shadow root 内的按钮完全不出现在快照里（HAS_SHADOW=False）；element_action 也只查 document，索引闭环在 shadow 场景断开。
2. 修复：snapshot 递归收集 open shadow root 后统一取候选；element_action 按 shadow 树查找 data-mcp-id。
3. 过程中自伤并修复：第一版 element_action 用内嵌引号拼 `[data-mcp-id='m0']`，生成 JS 转义出错 —— 实测普通按钮也全部报"无法序列化的值"（回归）。改为 querySelectorAll('[data-mcp-id]') + getAttribute 比较，彻底规避转义。
4. 实测（同一页面同时有普通/ shadow 按钮）：snapshot 列出 NBTN=0、SBTN=1；element_action 点 NBTN → title=NORMALOK；点 SBTN → title=SHADOWOK。
5. 边界：closed shadow root 不可达（浏览器限制）。

## 批量填表的 contenteditable 假成功（fix252，2026-10-29）

1. 实测缺陷：browser_fill_form 对 [input, contenteditable] 回 filled=2 / failed=0 / 两项 ok:true，但 contenteditable 的 innerText 仍是 init —— 判定只看"元素存在"，不看写入结果。
2. 修复：存在性预检改为三态 ok/ce/no；ce 字段改用 JS 写 innerText + 派发 input 事件，并回读比对；不一致则该字段 ok:false / contenteditable_write_failed（计数同步修正）。
3. 正向实测：input=AAA、contenteditable=BBB，filled=2 failed=0。
4. 负向实测（页面脚本把值强制改回 locked）：返回"全部字段填写失败: 1 个"，明细 {"selector":"#ce","ok":false,"error":"contenteditable_write_failed"}。
5. 覆盖缺口（未修，已记录）：browser_get_forms 只枚举 input/select/textarea，不含 contenteditable，也不穿透 shadow DOM。

## get_forms 枚举 contenteditable（fix253，2026-10-29）

1. 实测缺口：browser_get_forms 只枚举 input/select/textarea，富文本编辑器（contenteditable div）完全不可见 —— AI 依赖该工具生成 selector 时会漏字段。
2. 修复：表单字段选择器加入 [contenteditable]；类型标为 contenteditable，value 取 innerText（截断 200），selector 优先 #id / name / [contenteditable]。
3. 实测：同一表单返回两条字段 #q(text) 与 #ce(contenteditable, value=init)；随后 fill_form 两字段均 ok，CE 写入 BBB。
4. 仍存在边界（已记录）：get_forms 不穿透 shadow DOM；contenteditable 不在 form 内时也不会列出。

## JS 对话框阻塞与 stdio 默认自动关闭（fix254，2026-10-29）

1. 实测缺陷：默认配置下点击 alert() 后渲染进程被模态框阻塞 —— browser_mouse_click 报"CDP 通道不可用"、execute_js 12s 无回执、js_dialog 事件也没有（监控默认关）；ping（原生通道）仍正常，但页面已无法自动化。
2. 修复：stdio（无人值守）模式下，若配置**没有**显式写 auto_dismiss_js_dialog，则默认开启自动关闭 alert/confirm/prompt，并同时开启对话框监控；配置显式写 false 时尊重用户选择（不覆盖）。
3. 实测：移除配置键后点 ALERT → 点击 0.0s 返回、execute_js 0.1s 返回 2、js_dialog 事件记录 {type:alert,message:hi,url:...}；恢复 auto_dismiss_js_dialog:false 后保持原行为。
4. 过程事故（已修复）：新变量插在"是否监控对话框"多行声明的第一行之后，把它的续行 @输出名 顶开，IDE 报 3642/3643 解析错误。已恢复为两行声明并把新变量放到声明之后。

## JS 对话框自动应答语义（fix255，2026-10-29）

1. 背景：fix254 让 stdio 默认自动关闭对话框后，原实现对 alert/confirm/prompt 一律 `继续(真, 默认文本)` —— confirm 会被自动**确认**，可能触发删除/支付等破坏性操作；prompt 会被自动填入默认值。
2. 修复（对齐 Playwright/Puppeteer 的默认 dismiss 语义）：alert → 确认；confirm → 取消(假)；prompt → 取消(假，页面拿到 null)。
3. 实测（移除配置键）：confirm 按钮 → title=CANCELLED；prompt 按钮 → title=P:null；两条 js_dialog 事件均入库（type/message/url 完整）。
4. 配置显式 auto_dismiss_js_dialog=false 时仍保持人工处理（不覆盖用户选择）。

## beforeunload 阻塞导航（fix256，2026-10-29）

1. 实测缺陷：页面注册 window.onbeforeunload 后（需先有一次点击激活），browser_navigate 到新地址 → 8.2s 超时、URL 仍停在原页、title 不变（ping 正常）。
2. 修复：自动模式(是否自动关闭JS对话框)下，在 浏览器_JS即将打开离开对话框 中主动调用 回调.继续(真) 并返回 真，放行离开；未开启时保持原行为。
3. 实测（移除配置键）：点击激活 → navigate /next 0.1s 完成，URL=/next，title=NEXT2，ping 正常。
4. 配置显式 auto_dismiss_js_dialog=false 时 beforeunload 仍会阻塞（尊重人工处理配置）。

## get_scroll 在怪异模式下 max_y 恒 0（fix257，2026-10-29）

1. 实测缺陷：无 <!DOCTYPE> 的页面（quirks 模式）里，document.documentElement.clientHeight 返回内容高度而非视口高度（实测 3000），于是 browser_get_scroll 的 max_y = scrollHeight - clientHeight = 0；AI 会误判"页面不能滚动/已到底"。
2. 修复：视口高度改用 window.innerHeight；scrollHeight/scrollWidth 取 document.body 与 documentElement 的较大值；结果 clamp >= 0。
3. 实测：quirks 页（3000px 内容）→ max_y=2295（修复前 0）；标准模式页（同内容）→ 2295（无回归）。

