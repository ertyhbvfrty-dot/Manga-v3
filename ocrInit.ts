import * as ort from 'onnxruntime-web';

export type OCRBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  score?: number;
};

let detSession: ort.InferenceSession | null = null;
let recSession: ort.InferenceSession | null = null;

export async function initModels(options: {
  wasmPaths?: string;
  detModelUrl?: string;
  recModelUrl?: string;
} = {}) {
  const {detModelUrl, recModelUrl} = options;
  
  // Configure WASM paths to use BASE_URL for GitHub Pages compatibility
  const baseUrl = import.meta.env.BASE_URL || '/';
  const wasmPath = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}onnx/`;
  
  console.log('Initializing OCR models with BASE_URL:', baseUrl);
  console.log('WASM path:', wasmPath);
  
  // Set WASM path configuration before creating sessions
  try {
    ort.env.wasm.wasmPaths = {
      'ort-wasm-simd-threaded.wasm': `${wasmPath}ort-wasm-simd-threaded.wasm`,
      'ort-wasm-simd-threaded.jspi.wasm': `${wasmPath}ort-wasm-simd-threaded.jspi.wasm`,
      'ort-wasm-simd-threaded.asyncify.wasm': `${wasmPath}ort-wasm-simd-threaded.asyncify.wasm`,
      'ort-wasm-simd-threaded.jsep.wasm': `${wasmPath}ort-wasm-simd-threaded.jsep.wasm`,
    };
    console.log('WASM paths configured successfully');
  } catch (e) {
    // wasmPaths may not be writable on all environments; fallback to default behavior
    console.warn('Could not set wasmPaths:', e);
  }
  
  if (!detSession && detModelUrl) {
    console.log('Loading detection model from:', detModelUrl);
    try {
      detSession = await ort.InferenceSession.create(detModelUrl, {executionProviders: ['wasm']});
      console.log('Detection model loaded successfully');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Failed to load detection model:', msg);
      throw new Error(`Detection model loading failed: ${msg}`);
    }
  }
  if (!recSession && recModelUrl) {
    console.log('Loading recognition model from:', recModelUrl);
    try {
      recSession = await ort.InferenceSession.create(recModelUrl, {executionProviders: ['wasm']});
      console.log('Recognition model loaded successfully');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Failed to load recognition model:', msg);
      throw new Error(`Recognition model loading failed: ${msg}`);
    }
  }
  return {detSession, recSession};
}

function imageToTensor(img: HTMLImageElement | HTMLCanvasElement, size = 640) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size).data;
  const floatData = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    floatData[i * 3 + 0] = imgData[i * 4 + 0] / 255.0;
    floatData[i * 3 + 1] = imgData[i * 4 + 1] / 255.0;
    floatData[i * 3 + 2] = imgData[i * 4 + 2] / 255.0;
  }
  const tensor = new ort.Tensor('float32', floatData, [1, 3, size, size]);
  return {tensor, canvas};
}

export async function runOCR(image: HTMLImageElement | HTMLCanvasElement) {
  if (!detSession || !recSession) throw new Error('Models not initialized');
  const targetSize = 640;
  const {tensor, canvas} = imageToTensor(image, targetSize);
  const feeds: Record<string, ort.Tensor> = {};
  const detInputName = detSession.inputNames[0];
  feeds[detInputName] = tensor;
  const detResults = await detSession.run(feeds);
  const detOutName = detSession.outputNames[0];
  const detOutput = detResults[detOutName] as ort.Tensor;
  let boxes: OCRBox[] = simplePostprocessDet(detOutput, canvas.width, canvas.height);
  boxes = nonMaxSuppression(boxes, 0.3);
  const results: OCRBox[] = [];
  const ctx = canvas.getContext('2d')!;
  const origW = (image as HTMLImageElement).naturalWidth || (image as HTMLCanvasElement).width;
  const origH = (image as HTMLImageElement).naturalHeight || (image as HTMLCanvasElement).height;
  const scaleX = origW / targetSize;
  const scaleY = origH / targetSize;
  for (const b of boxes) {
    const sx = Math.max(0, Math.floor(b.x));
    const sy = Math.max(0, Math.floor(b.y));
    const sw = Math.max(1, Math.floor(b.width));
    const sh = Math.max(1, Math.floor(b.height));
    const crop = ctx.getImageData(sx, sy, sw, sh);
    const cCanvas = document.createElement('canvas');
    cCanvas.width = sw;
    cCanvas.height = sh;
    const cCtx = cCanvas.getContext('2d')!;
    cCtx.putImageData(crop, 0, 0);
    const {tensor: recTensor} = imageToTensor(cCanvas, Math.max(sw, sh));
    const recFeeds: Record<string, ort.Tensor> = {};
    const recInputName = recSession.inputNames[0];
    recFeeds[recInputName] = recTensor;
    const recOut = await recSession.run(recFeeds);
    const recOutName = recSession.outputNames[0];
    const recOutTensor = recOut[recOutName] as ort.Tensor;
    const text = simpleDecodeRec(recOutTensor);
    // scale box to original image size
    results.push({x: b.x * scaleX, y: b.y * scaleY, width: b.width * scaleX, height: b.height * scaleY, text, score: b.score});
  }
  return results;
}

function simplePostprocessDet(tensor: ort.Tensor, w: number, h: number): OCRBox[] {
  const boxes: OCRBox[] = [];
  const data = tensor.data as Float32Array;
  const len = Math.min(50, Math.floor(data.length / 6));
  for (let i = 0; i < len; i++) {
    const idx = i * 6;
    const cx = data[idx] * w;
    const cy = data[idx + 1] * h;
    const bw = Math.max(5, data[idx + 2] * w);
    const bh = Math.max(5, data[idx + 3] * h);
    const score = data[idx + 4];
    if (score > 0.3) {
      boxes.push({x: Math.max(0, cx - bw / 2), y: Math.max(0, cy - bh / 2), width: bw, height: bh, score});
    }
  }
  return boxes;
}

function simpleDecodeRec(tensor: ort.Tensor) {
  return '"recognized English text"';
}

export function groupBoxesIntoLines(boxes: OCRBox[], yThreshold = 12) {
  const sorted = boxes.slice().sort((a, b) => a.y - b.y);
  const groups: OCRBox[][] = [];
  for (const b of sorted) {
    let placed = false;
    for (const g of groups) {
      const avgY = g.reduce((s, x) => s + x.y, 0) / g.length;
      if (Math.abs(b.y - avgY) < yThreshold) {
        g.push(b);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([b]);
  }
  return groups.map(g => {
    g.sort((a, b) => a.x - b.x);
    const text = g.map(x => x.text || '').join(' ');
    const x = Math.min(...g.map(p => p.x));
    const y = Math.min(...g.map(p => p.y));
    const width = Math.max(...g.map(p => p.x + p.width)) - x;
    const height = Math.max(...g.map(p => p.y + p.height)) - y;
    return {x, y, width, height, text};
  });
}

export default {initModels, runOCR, groupBoxesIntoLines};
