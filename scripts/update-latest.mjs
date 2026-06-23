#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const releaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultBundleDir = path.resolve(releaseRoot, '../aido/src-tauri/target/release/bundle');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function usage() {
  console.error(`Usage:
  node scripts/update-latest.mjs --version <version> [--notes <text>] [--bundle-dir <path>] [--base-url <url>]

Examples:
  node scripts/update-latest.mjs --version 4.0.4 --notes "Fix updater"
  node scripts/update-latest.mjs --version 4.0.4 --notes-file CHANGELOG.md --base-url "https://github.com/HUHAGE/aido-release/releases/download/v4.0.4"`);
}

function walk(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    return stats.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function currentMacPlatform() {
  return os.arch() === 'arm64' ? 'darwin-aarch64' : 'darwin-x86_64';
}

function inferPlatform(filePath) {
  const name = path.basename(filePath);

  if (name.endsWith('.app.tar.gz')) {
    return process.env.MACOS_PLATFORM || currentMacPlatform();
  }

  if (name.endsWith('-setup.exe') || name.endsWith('.msi')) {
    if (name.includes('_arm64') || name.includes('-arm64')) {
      return 'windows-aarch64';
    }
    if (name.includes('_x86') || name.includes('-x86')) {
      return 'windows-i686';
    }
    return 'windows-x86_64';
  }

  if (name.endsWith('.AppImage.tar.gz')) {
    if (name.includes('aarch64') || name.includes('arm64')) {
      return 'linux-aarch64';
    }
    return 'linux-x86_64';
  }

  return undefined;
}

function readNotes() {
  const notes = arg('--notes');
  const notesFile = arg('--notes-file');

  if (notes && notesFile) {
    throw new Error('Use either --notes or --notes-file, not both.');
  }

  if (notesFile) {
    return readFileSync(path.resolve(notesFile), 'utf8').trim();
  }

  return notes || `AiDo ${version}`;
}

const version = arg('--version') || process.env.RELEASE_VERSION;

if (!version) {
  usage();
  process.exit(1);
}

const bundleDir = path.resolve(arg('--bundle-dir') || process.env.BUNDLE_DIR || defaultBundleDir);
const releaseDir = path.join(releaseRoot, 'releases', `v${version}`);
const baseUrl = (arg('--base-url') || process.env.RELEASE_BASE_URL || `https://raw.githubusercontent.com/HUHAGE/aido-release/master/releases/v${version}`).replace(/\/$/, '');
const pubDate = arg('--pub-date') || new Date().toISOString();
const notes = readNotes();

const signedArtifacts = walk(bundleDir)
  .filter((filePath) => filePath.endsWith('.sig'))
  .map((signaturePath) => {
    const artifactPath = signaturePath.slice(0, -4);
    return { artifactPath, signaturePath, platform: inferPlatform(artifactPath) };
  })
  .filter(({ artifactPath, platform }) => existsSync(artifactPath) && platform);

if (signedArtifacts.length === 0) {
  console.error(`No signed updater artifacts found in ${bundleDir}`);
  console.error('Build with createUpdaterArtifacts enabled and the Tauri signing key configured first.');
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });

const platforms = {};

for (const { artifactPath, signaturePath, platform } of signedArtifacts) {
  const artifactName = path.basename(artifactPath);
  const destination = path.join(releaseDir, artifactName);
  const signature = readFileSync(signaturePath, 'utf8').trim();

  if (!signature) {
    throw new Error(`Empty signature file: ${signaturePath}`);
  }

  copyFileSync(artifactPath, destination);
  copyFileSync(signaturePath, `${destination}.sig`);

  platforms[platform] = {
    signature,
    url: `${baseUrl}/${encodeURIComponent(artifactName)}`,
  };
}

const manifest = {
  version,
  notes,
  pub_date: pubDate,
  platforms,
};

writeFileSync(path.join(releaseRoot, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wrote ${path.join(releaseRoot, 'latest.json')}`);
console.log(`Copied ${signedArtifacts.length} artifact(s) to ${releaseDir}`);
