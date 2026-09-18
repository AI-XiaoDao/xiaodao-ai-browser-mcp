# 能力清单 / Capabilities

> 工具总数 **348**（	ools/list 实测计数）。下表按域归类，工具名均取自工程自带的《MCP工具配置说明书》。

## 浏览器核心（导航 / 读取 / 交互）
rowser_navigate · rowser_get_url · rowser_get_title · rowser_get_text · rowser_get_html · rowser_extract · rowser_snapshot
rowser_click · rowser_click_text · rowser_fill_form · rowser_dom_*（query/click/set_value/rect/inner_html/get_html/select/selected/checked） · rowser_find · rowser_scroll_by · rowser_get_scroll
rowser_back / rowser_forward / rowser_reload / rowser_stop / rowser_set_zoom / rowser_set_focus / rowser_set_mute / rowser_print / rowser_print_to_pdf / rowser_screenshot

## 标签页与浏览器实例
rowser_create · rowser_create_tab · rowser_list · rowser_by_id · rowser_by_index · rowser_close / rowser_close_try · rowser_count · rowser_status · rowser_window_info · rowser_show_window · rowser_move_window

## 输入仿真（真实事件）
rowser_mouse_click / rowser_mouse_move / rowser_mouse_wheel · rowser_key_event / rowser_key_press / rowser_key_release / rowser_key_type / rowser_key_click · rowser_touch_press / rowser_touch_move / rowser_touch_release / rowser_touch_cancel · rowser_element_action（按快照索引操作）

## JS 执行与 CDP
rowser_execute_js / rowser_evaluate · rowser_cdp / rowser_cdp_call / rowser_cdp_event · rowser_console_eval · rowser_reverse_runtime（properties/evaluate/global） · rowser_reverse_call_fn · rowser_reverse_await_promise

## 网络与抓取（含逆向）
rowser_network（list/enable/clear/**body**） · rowser_network_export(HAR/JSON) · rowser_network_body · rowser_collect（network/console/事件族开关） · rowser_reverse_initiator（请求 JS 调用栈） · rowser_reverse_string_refs / rowser_reverse_search / rowser_reverse_search_script / rowser_reverse_sources / rowser_reverse_extract

## 调试与逆向（Debugger / V8）
rowser_debugger_enable / disable / pause / esume / step_* / stack / evaluate / set_breakpoint / list_breakpoints / clear_breakpoints / wait_paused / last_paused / script_source / eturn_value / set_variable / uto
rowser_reverse_hook（无侵入函数 Hook） · rowser_reverse_hook_logs / _multi · rowser_reverse_instrument / _script · rowser_reverse_precise_coverage（精确覆盖率） · rowser_reverse_detect_obfuscator / _traps · rowser_reverse_patch（热补丁） · rowser_reverse_cookie_sources · rowser_reverse_listeners · rowser_reverse_heap / _query_objects / _dom_breakpoint / _async_stack / _breakpoints_active

## 反检测 / 指纹（VIP）
rowser_antidetect_presets · rowser_fingerprint_*（UA / 平台 / 语言 / 屏幕 / 像素比 / WebGL / Canvas / Audio / 时区 / 地理位置 / 电池 / 硬件 / 媒体设备 / SSL / WebRTC / 触摸 / Event.isTrusted / V8 与 Web 内核版本等） · rowser_fingerprint_check（自洽性检测） · rowser_permission_spoof · rowser_canvas_noise · rowser_font_randomize · rowser_proxy_pool / rowser_set_proxy / rowser_set_s5_proxy

## 内核层（CEF/Chromium 事件与协议）
rowser_kernel_*（cert / download / menu / reactor / watch / scheme / auth / cdp_monitor / ipc_queue / events_all）

## 文件、下载、截图与编码工具
rowser_start_download / rowser_download_image · rowser_save_to? 见说明书 · rowser_base64_encode / _decode · rowser_uri_encode / _decode · rowser_codec（hex/UTF-8/GBK） · rowser_hash（MD5/XXH128/CRC32） · rowser_json · rowser_data_uri

## 会话、标签、批量与工作流
rowser_get_cookies / rowser_set_cookie / rowser_delete_cookie(s) / rowser_clear_cache* · rowser_user_tags / rowser_find_by_tag · rowser_workflow_*（工作流执行/停止） · rowser_schedule（定时任务） · 	asks/get / 	asks/result（标准 Tasks 扩展） · mcp_help（按需取工具详述，控制会话固定开销）

> 上表为**域级导航**而非逐条清单；完整逐条描述在客户端里由 	ools/list 提供，或调用 mcp_help {tool:"<名字>"} 取详述。