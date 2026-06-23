# AiDo 发布仓库

[English](README.md) | [简体中文](README.zh-CN.md)

这个仓库用于托管 AiDo 的 Tauri 更新器 manifest。

应用读取：

```text
https://raw.githubusercontent.com/HUHAGE/aido-release/master/latest.json
```

## 发布流程

1. 在以下文件中更新应用版本号：

   - `../aido/package.json`
   - `../aido/src-tauri/tauri.conf.json`
   - `../aido/src-tauri/Cargo.toml`

2. 从 `../aido` 构建已签名的更新器产物：

   ```bash
   export TAURI_SIGNING_PRIVATE_KEY_PATH="$PWD/src-tauri/aido-updater.key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   npm run tauri:build
   ```

3. 从当前仓库生成 `latest.json`：

   ```bash
   node scripts/update-latest.mjs --version 4.0.4 --notes "Release notes"
   ```

4. 提交并推送当前仓库。

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
