# AiDo release repository

[English](README.md) | [简体中文](README.zh-CN.md)

This repository hosts the Tauri updater manifest for AiDo.

The application reads:

```text
https://raw.githubusercontent.com/HUHAGE/aido-release/master/latest.json
```

## Release flow

1. Bump the app version in:

   - `../aido/package.json`
   - `../aido/src-tauri/tauri.conf.json`
   - `../aido/src-tauri/Cargo.toml`

2. Build signed updater artifacts from `../aido`:

   ```bash
   export TAURI_SIGNING_PRIVATE_KEY_PATH="$PWD/src-tauri/aido-updater.key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   npm run tauri:build
   ```

3. Generate `latest.json` from this repository:

   ```bash
   node scripts/update-latest.mjs --version 4.0.4 --notes "Release notes"
   ```

4. Commit and push this repository.

## Artifact URLs

By default, the script writes artifacts under `releases/v<version>/` and points
`latest.json` at raw GitHub URLs in this repository.

For GitHub Release assets or another CDN, pass a direct-download base URL:

```bash
node scripts/update-latest.mjs \
  --version 4.0.4 \
  --notes "Release notes" \
  --base-url "https://github.com/HUHAGE/aido-release/releases/download/v4.0.4"
```

The base URL must download files directly. Do not use a web landing page.
