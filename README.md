# Met Viewer

Electron + Vite + React app for exploring The Met collection and downloading images.

## Install (macOS + Windows)

1. Go to the GitHub Releases page for this repo.
2. Download the installer for your system and open it to install the app.

If you see a security warning, follow the on-screen prompts to allow the app to open.

## Requirements (for developers)

- Node.js 20+
- npm

## Local development

- Install deps: `npm ci`
- Start app: `npm run start`

## Release (maintainers)

This repo uses GitHub Actions to build macOS + Windows installers and attach them to a GitHub Release.

1. Create a version tag (for example `v1.0.1`) and push it.
2. GitHub Actions will build and publish a Release with installers under `out/make/**`.
