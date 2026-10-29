# 软件物料清单 / SBOM

本产品主程序为**单个 Windows 可执行文件**（火山视窗编译），随包提供 CEF/SQLite 运行库；关键第三方如下。

| 组件 | 版本（实测来源） | 用途 | 许可提示 |
|---|---|---|---|
| 小刀 AI 浏览器 MCP Server | 3.3.6（ping 返回 version） | 主程序 | 专有（见 LICENSE） |
| Chromium Embedded Framework (CEF) | `135.0.7049.115`（chrome_elf.dll VersionInfo）／`135.0.21+gd008a99+chromium-135.0.7049.115`（libcef.dll VersionInfo） | 浏览器内核 | BSD-3-Clause（Chromium/CEF 各自条款） |
| FBrowser 火山模块（CEFLib 封装） | 随成品包提供（x64/x86 两套运行库） | 火山工程与 CEF 的桥接 | 第三方类库，按作者授权 |
| SQLite | `sqlite3dllmt.dll`（随包，w_sqlite3 封装） | 缓存库/异步结果 | Public Domain |
| Chromium 运行时资源 | `chrome_100_percent.pak` 等（随包） | 内核资源 | 随 Chromium |
| 独立组件：无 | —— | 不依赖 .NET/Java/Python/Node | —— |

**说明**
- 上表版本号均为从发布包**实际文件**读取，未做推测；升级内核后请以新包内的版本信息为准。
- 未捆绑任何遥测或第三方统计组件；日志仅落本地程序目录。
- 发布包内**不含产品工程源码或生成的 C++**；仅含离线文档所需的静态资源 `docs/assets/docs.js` 与
  `workflows/*.json` 示例。工程源码与生成 C++ 在私密仓维护。
