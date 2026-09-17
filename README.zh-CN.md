# AiDo 发布仓库

[English](README.md) | [简体中文](README.zh-CN.md)

这个仓库用于托管 AiDo 的 Tauri 更新器 manifest。

应用读取：

```text
https://raw.githubusercontent.com/HUHAGE/aido-release/master/latest.json
```

## 发布流程（每次发版必须执行）

每次收到发版请求，都必须先新增一个版本号（当前版本号加一个补丁版本），再同时发布 macOS 和 Windows 版本，并发布两者的 Tauri 更新器产物。不能只发布单个平台，也不能复用旧版本目录或旧版本清单。

1. 在以下文件中同步更新新版本号：

   - `../aido/package.json`
   - `../aido/package-lock.json`
   - `../aido/src-tauri/tauri.conf.json`
   - `../aido/src-tauri/Cargo.toml`
   - `../aido/src-tauri/Cargo.lock`

2. 从 `../aido` 构建已签名的 macOS 和 Windows 更新器产物。Windows 必须使用 NSIS 安装器，并保留安装路径选择：

   ```bash
   export TAURI_SIGNING_PRIVATE_KEY="$PWD/src-tauri/aido-updater.key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<updater-key-password>"
   npm run tauri:build -- --target aarch64-apple-darwin
   npm run tauri:build -- --target x86_64-pc-windows-msvc --runner cargo-xwin
   ```

   Windows 包是在 macOS 上用 `cargo-xwin` 交叉编译的，必须带 `--runner cargo-xwin`。
   不要传 `--bundles nsis`：`--bundles` 在 macOS 上只接受宿主原生的取值，传 `nsis`
   会被拒绝；`bundle.targets` 为 `all` 时 Windows 目标会自动选中 NSIS。

   构建结果必须同时包含：

   - macOS：`AiDo.app.tar.gz` 和 `.sig`
   - Windows：`AiDo_<version>_x64-setup.exe` 和 `.sig`

3. 只从本次构建产物生成 `latest.json`，并确认其中同时有 `darwin-aarch64` 和 `windows-x86_64`：

   ```bash
   node scripts/update-latest.mjs --version <version> --notes "Release notes" --bundle-dir <本次构建产物目录>
   ```

   脚本只会拷贝带 `.sig` 的产物，因此没有更新签名的 macOS `.dmg` 不会被自动拷贝，
   需要手动放进去，保证发布目录完整：

   ```bash
   cp <本次构建产物目录>/AiDo_<version>_aarch64.dmg releases/v<version>/
   ```

4. 推送前先做校验：

   - 每个签名都必须与 `../aido/src-tauri/tauri.conf.json` 中配置的公钥匹配，
     否则所有客户端的更新都会卡在签名校验：

   ```bash
   node ../aido/scripts/verify-updater-signature.mjs releases/v<version>/AiDo.app.tar.gz
   node ../aido/scripts/verify-updater-signature.mjs releases/v<version>/AiDo_<version>_x64-setup.exe
   ```

   - 确认 `latest.json` 里是新版本号且同时含 `darwin-aarch64`、`windows-x86_64`，
     并且每个 `url` 都能指向刚提交的文件。
   - 确认 `releases/v<version>/` 里没有混入旧版本的文件。

   检查通过后，提交并推送当前仓库；同时提交并推送 `../aido` 中的版本号变更。

## 产物 URL

默认情况下，脚本会把产物写入 `releases/v<version>/`，并让 `latest.json`
指向当前仓库中的 raw GitHub URL。

如果要使用 GitHub Release assets 或其他 CDN，请传入直接下载的 base URL：

```bash
node scripts/update-latest.mjs \
  --version 4.0.4 \
  --notes "Release notes" \
  --base-url "https://github.com/HUHAGE/aido-release/releases/download/v4.0.4"
```

base URL 必须能直接下载文件。不要使用网页落地页。
