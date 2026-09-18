# 代码签名指南 / Code signing

**现状：发布包未签名** ⇒ Windows SmartScreen 会提示"未知发布者"，企业环境可能拦截。本文件给出**可执行的签名流程**，
供持有代码签名证书的主体自行执行（本仓库不托管任何证书或私钥）。

## 你需要
- 代码签名证书：OV（组织校验，需累积信誉）或 **EV**（硬件令牌/云 HSM，SmartScreen 即时可信）
- 时间戳服务（推荐，保证证书过期后签名仍有效），例如 RFC 3161 的公共 TSA

## 签名步骤（signtool，需 Windows SDK）
```bat
:: 1) 先签 exe（成品包内 AI-Fbowser-Mcp.exe），再打包成 zip
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a "AI-Fbowser-Mcp.exe"

:: 2) 校验签名与时间戳
signtool verify /pa /v "AI-Fbowser-Mcp.exe"

:: 3) 若用 EV 云签名（Azure Trusted Signing / DigiCert KeyLocker 等），走其 CLI/服务端签名即可，
::    产物仍是同一 exe，随后照常执行第 2 步校验。
```

## 与发布流程的衔接
1. **先签名 exe → 再压缩成成品包**（签名会改变文件字节，签名后再打包才能保证包内 exe 已签）
2. 重新生成 `00-checksums-sha256-md5.csv`（签名后 MD5 必然变化）
3. 发布说明中记录：证书主体（Subject）、指纹（Thumbprint）、时间戳服务
4. 若希望 CI 自动签名：把证书以加密 Secret 形式注入（EV/云签名优先），在 `verify-release` 之前插一个 `sign` 作业；
   **私钥绝不入库**

## 未签名时的缓解措施（部署方）
- 在受控环境用组策略/Intune 把该 exe 的哈希加入 AppLocker/WDAC 例外
- 首次运行前对发布包做完整性校验（本仓库 Release 提供 MD5+SHA256 清单，且有 CI 门禁按清单重算）