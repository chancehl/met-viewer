## Project Summary
- Electron + Vite + React app for exploring The Met collection and downloading images.
- Core flow: search → batch load objects (with API TPS limits) → preload images → render grid → view details → save image via IPC.

## Stack & Runtime
- Electron Forge with Vite (main/preload/renderer).
- React 18 in renderer; IPC via `window.metViewer.saveImage`.
- TypeScript; styles in `src/index.css`.

## Key Architecture
- Main process: `src/main.ts` handles window setup + IPC save/download.
- Preload: `src/preload.ts` exposes `window.metViewer`.
- Renderer: `src/App.tsx` orchestrates UI.
- Data hook: `src/hooks/useMetSearch.ts` handles search, throttling, caching, and details fetch.
- UI components: `src/components/*.tsx`.
- Shared types/helpers: `src/types/met.ts`, `src/lib/met.ts`.

## API Constraints & Behavior
- Met API rate limit: 80 TPS; app uses concurrency + delay.
- Only 50 results per query (`MET_PAGE_SIZE`).
- Partial failures are swallowed; error only when all object requests fail.
- Images are preloaded before rendering results.

## Edit Guide
- UI changes: `src/components/*.tsx` + `src/index.css`.
- Search/data behavior: `src/hooks/useMetSearch.ts`.
- Download behavior: `src/main.ts` + `src/preload.ts` + `src/App.tsx`.

## Conventions
- Keep state in `App` or hooks; components are mostly presentational.
- Use ASCII in files; add concise comments only when needed.
