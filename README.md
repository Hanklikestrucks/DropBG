# DropBG

Batch background remover that runs entirely in the browser. Drop a folder of product photos and get clean cutouts with marketplace presets (Shopify 2048, eBay 1600, Etsy 2000, Amazon 2000). Nothing is uploaded, and there's no backend.

- **Stack:** Vite + React + TypeScript + Tailwind v4. Background removal uses [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) (ISNet fp16 ONNX on onnxruntime-web, WebGPU with WASM fallback). `jszip` builds the ZIP export.
- **Hosting:** static files on Cloudflare Pages (free plan).
- **Payments:** Lemon Squeezy license keys, checked from the browser through their public License API.

## Develop

```bash
npm install
npm run dev        # also downloads the model files into public/bg-assets (~118 MB, once)
npm test           # unit tests (geometry, gating, naming)
npm run build      # → dist/
npm run preview    # serve dist/ with the production headers
```

Append `?device=cpu` to the URL to force the WASM path. In dev builds only, the license key `DEV-UNLOCK` unlocks Pro without calling Lemon Squeezy.

## Configuration

Set these at build time, in `.env.production` or under Cloudflare Pages → Settings → Environment variables. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `VITE_LS_CHECKOUT_URL` | Lemon Squeezy checkout link for the $19 product. If it's unset, the unlock dialog says checkout isn't configured. |
| `VITE_LS_PRODUCT_ID` | Optional but recommended. Without it, a license key from **any** Lemon Squeezy product would unlock Pro. |
| `VITE_SOURCE_URL` | Optional link to the public source code. It shows in the footer (see Licensing below). |

### Lemon Squeezy setup

1. Create a product priced at $19 as a single payment, and turn on **Generate license keys**. An activation limit of about 3 lets a buyer use a few browsers.
2. Put the product's checkout link in `VITE_LS_CHECKOUT_URL` and its product ID in `VITE_LS_PRODUCT_ID`.
3. Buyers get the key by email and paste it into **Unlock Pro**. The app calls `/v1/licenses/activate`, stores the key in `localStorage`, and on every later page load re-validates it with `/v1/licenses/validate`, so a refunded or disabled key stops working. Network errors keep the unlock in place. **Remove license from this browser** in the footer deactivates the key, which frees the activation slot.

The gating is client-side and soft by design. The rules live in `src/lib/presets.ts`: `FREE_BATCH_LIMIT` and `isPresetAllowed`.

## Deploy (Cloudflare Pages)

**Option A: Git integration (recommended).** Push this repo to GitHub, then in Cloudflare go to Workers & Pages → Create → Pages → Connect to Git.
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: the `VITE_*` values above. Node 22 is pinned in `.node-version`.

**Option B: direct upload from a machine that has credentials.**

```bash
export CLOUDFLARE_API_TOKEN=…   # token with "Cloudflare Pages: Edit"
export CLOUDFLARE_ACCOUNT_ID=…
npx wrangler pages project create dropbg --production-branch main   # first time only
npm run deploy
```

`public/_headers` sets `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`. Those headers make the page cross-origin isolated, which gives `SharedArrayBuffer` and therefore multi-threaded WASM inference (roughly 3–4× faster on CPU). The same headers also mean any third-party iframe or script must send CORP/CORS headers. That's why the Lemon Squeezy checkout opens in a new tab instead of their overlay.

## How it works

- `scripts/fetch-bg-assets.mjs` downloads only the files the app uses: the fp16 model plus the WASM and WebGPU runtimes, about 118 MB as content-addressed 4 MB chunks. They go into `public/bg-assets/` and are served from your own domain with immutable caching, so at runtime nothing depends on IMG.LY's CDN. A browser downloads them once, on first use.
- `src/lib/bg.worker.ts` runs decoding, inference, alpha cleanup, bounding-box detection and a preview downscale in a Web Worker, so the page never freezes. It tries WebGPU first and falls back to WASM if WebGPU throws or returns an empty mask.
- `src/lib/geometry.ts` holds the crop and resize math. Previews and exports share the same `drawComposite` path, so what you see is what you download.
- Photos are processed one at a time. Only the full-resolution cutout PNG and a 768px preview are kept in memory per photo.

## Licensing — read before charging money

`@imgly/background-removal` is licensed **AGPL-3.0**. This app ships that library to every visitor's browser, which counts as distributing it. In practice you must do one of the following:

- **Release this app under the AGPL** and link to its source (`VITE_SOURCE_URL`). Charging $19 is allowed. The trade-off is that anyone could fork the app and remove the license gate. Since the gate is client-side anyway, the practical loss is small.
- **Buy a commercial license from IMG.LY** (support@img.ly) and keep the code closed.
- **Swap the model** to one under a permissive license. The engine is isolated in `src/lib/bg.worker.ts`, so this is a single-file change. Check the model's license too: popular RMBG-1.4 and RMBG-2.0 are non-commercial.
