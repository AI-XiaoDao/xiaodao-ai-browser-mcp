# 成品二进制 / Prebuilt binaries

本目录放 **exe 本体与校验文件**，便于直接核对构建产物。  
完整可运行包（含 `libcef.dll`、`locales/`、`docs/`、`assets/`、`workflows/`）在 **GitHub Releases v3.3.6**：

- `xiaodao-ai-browser-mcp-v3.3.6-x64.zip`（Windows 10/11 x64）
- `xiaodao-ai-browser-mcp-v3.3.6-x86.zip`（Windows 10/11 x86）

> `libcef.dll` 单文件超过 GitHub Git 树的 100MB 限制，因此完整运行库不进入 Git 历史，走 Release 资产分发。

## 校验
见各子目录 `VERSION.txt` 与 Release 的 `00-checksums-sha256-md5.csv`。
