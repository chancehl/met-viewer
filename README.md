# Met Viewer

Electron + Vite + React app for exploring The Met collection and downloading images.

## Install (macOS + Windows)

1. Go to the GitHub Releases page for this repo.
2. Download the installer for your system and open it to install the app.

If you see a security warning, follow the on-screen prompts to allow the app to open.

## Build it yourself (one-time, macOS + Windows)

This builds a standalone app. You do not need to keep Node running after the build.

### macOS

```sh
git clone https://github.com/chancehl/met-viewer
cd met-viewer
npm ci
npm run make
```

Open the app at `out/make/**/met-viewer.app` (drag to Applications if you want).

### Windows

```bat
git clone https://github.com/chancehl/met-viewer
cd met-viewer
npm ci
npm run make
```

Run the installer from `out\\make\\**\\*.exe`.

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
