# Manga-v3 — Local OCR Reader (browser-first)

This project includes a browser-run OCR integration using `onnxruntime-web` and local ONNX models. The app expects model and WASM assets to be served from the project root (e.g. `public/` in Next.js or root for static hosting).

Required model files (English-only):
- `ch_PP-OCRv4_det_infer.onnx` (detection)
- `en_PP-OCRv4_rec_infer.onnx` (recognition)

Place models in `/public/models/` (or `/models/` when serving static files). The code in `ocrInit.ts` uses these URLs by default:

- `/models/ch_PP-OCRv4_det_infer.onnx`
- `/models/en_PP-OCRv4_rec_infer.onnx`

ONNX Runtime WASM runtime files
- Place WASM runtime files (from `onnxruntime-web` build) under `/onnx/` and ensure `ort-wasm.wasm` is reachable at `/onnx/ort-wasm.wasm`.

Quick instructions
1. Download the two ONNX models from the original repo or your preferred mirror and put them into `public/models/`.
2. Ensure your dev server serves the `/onnx/` path with the WebAssembly runtime file used by `onnxruntime-web` (or set `wasmPaths` in `initModels` to your hosted path).
3. Run the app (example):

```bash
npm install
npm run dev
```

Notes
- The provided `ocrInit.ts` includes simplified preprocessing/postprocessing and a placeholder recognition decoder. For accurate English text output you should add the PP-OCR decoding table / lexicon mapping from the original repo and more robust box postprocessing (NMS, polygon handling).
 - The provided `ocrInit.ts` includes preprocessing, a simple NMS postprocessing and a basic CTC-style greedy recognition decoder suitable for English. It's a simplified implementation that works without external APIs but may need tuning for production accuracy (vocabulary, lexicon, and beam-search decoding improve results).
- `OCRReader.tsx` implements: upload, scan button, canvas overlay boxes, click-to-copy and a side panel. Tweak model URLs in `OCRReader.tsx` or in `ocrInit.ts` if you host assets at different paths.

If you want, I can:
- Add a small script to download models into `public/models/` automatically.
- Improve postprocessing and add the correct recognition charset/decoder.
