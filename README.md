# AiDo release repository

[English](README.md) | [简体中文](README.zh-CN.md)

This repository hosts the Tauri updater manifest for AiDo.

The application reads:

```text
https://raw.githubusercontent.com/HUHAGE/aido-release/master/latest.json
```

## Release flow (required for every release)

For every release request, first create a new version (increment the current patch version), then publish both macOS and Windows builds and both signed Tauri updater artifacts. Do not publish only one platform or reuse an older release directory or manifest.

1. Bump the new version consistently in:

   - `../aido/package.json`
   - `../aido/package-lock.json`
   - `../aido/src-tauri/tauri.conf.json`
   - `../aido/src-tauri/Cargo.toml`
   - `../aido/src-tauri/Cargo.lock`

2. Build signed macOS and Windows updater artifacts from `../aido`. Windows must use the NSIS installer and keep the install-path selection enabled:

   ```bash
   export TAURI_SIGNING_PRIVATE_KEY="$PWD/src-tauri/aido-updater.key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<updater-key-password>"
   npm run tauri:build -- --target aarch64-apple-darwin
   npm run tauri:build -- --target x86_64-pc-windows-msvc --runner cargo-xwin
   ```

   The Windows build cross-compiles from macOS with `cargo-xwin`, so it must pass
   `--runner cargo-xwin`. Do not pass `--bundles nsis`: `--bundles` only accepts
   host-native values on macOS and would reject it. With `bundle.targets` set to
   `all`, NSIS is selected automatically for the Windows target.

   The build must produce both:

   - macOS: `AiDo.app.tar.gz` and `.sig`
   - Windows: `AiDo_<version>_x64-setup.exe` and `.sig`

3. Generate `latest.json` using only artifacts from this build, and verify that it contains both `darwin-aarch64` and `windows-x86_64`:

   ```bash
   node scripts/update-latest.mjs --version <version> --notes "Release notes" --bundle-dir <this-build-artifacts>
   ```

   The script only copies artifacts that have a matching `.sig`, so the macOS
   `.dmg` (which has no updater signature) is not copied automatically. Copy it in
   by hand so the release directory stays complete:

   ```bash
   cp <this-build-artifacts>/AiDo_<version>_aarch64.dmg releases/v<version>/
   ```

4. Verify the release before pushing:

   - Every signature must match the public key configured in
     `../aido/src-tauri/tauri.conf.json`, otherwise all clients fail the update
     signature check:

   ```bash
   node ../aido/scripts/verify-updater-signature.mjs releases/v<version>/AiDo.app.tar.gz
   node ../aido/scripts/verify-updater-signature.mjs releases/v<version>/AiDo_<version>_x64-setup.exe
   ```

   - Check that `latest.json` has the new version plus both `darwin-aarch64` and
     `windows-x86_64`, and that each `url` resolves to the file just committed.
   - Confirm no file from a previous version leaked into `releases/v<version>/`.

   Then commit and push this repository; also commit and push the version bump in `../aido`.

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
