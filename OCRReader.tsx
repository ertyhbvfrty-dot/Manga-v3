import React, {useRef, useState, useEffect} from 'react';
import init, { initModels, runOCR, groupBoxesIntoLines, OCRBox } from './ocrInit';

type Props = {};

export default function OCRReader(_: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [groups, setGroups] = useState<OCRBox[]>([]);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [modelsAvailable, setModelsAvailable] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const detUrl = `${base}models/ch_PP-OCRv4_det_infer.onnx`;
        const recUrl = `${base}models/en_PP-OCRv4_rec_infer.onnx`;
        console.log('Attempting to load models from:', {detUrl, recUrl});
        await initModels({
          detModelUrl: detUrl,
          recModelUrl: recUrl,
        });
        setModelsAvailable(true);
        setInitError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('Model init failed:', msg);
        setInitError(`Error loading OCR models: ${msg}. Check console for details.`);
        setModelsAvailable(false);
      }
    })();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showBoxes) {
      for (const g of groups) {
        ctx.strokeStyle = 'rgba(0,200,255,0.9)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0,200,255,0.12)';
        ctx.fillRect(g.x, g.y, g.width, g.height);
        ctx.strokeRect(g.x, g.y, g.width, g.height);
      }
    }
  }, [groups, showBoxes]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setGroups([]);
    setSelectedText(null);
  };

  const handleScan = async () => {
    if (!imgRef.current) return;
    setProcessing(true);
    try {
      if (modelsAvailable) {
        const boxes = await runOCR(imgRef.current);
        const grouped = groupBoxesIntoLines(boxes, 18);
        setGroups(grouped);
      } else {
        // demo fallback: create a sample box and text for UI testing without models
        const img = imgRef.current;
        const w = img.naturalWidth || 600;
        const h = img.naturalHeight || 800;
        const sample = [{ x: w * 0.2, y: h * 0.6, width: w * 0.6, height: h * 0.12, text: "Hello from demo OCR!" }];
        setGroups(sample);
        setSelectedText(sample[0].text || null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('OCR scan failed:', msg);
      alert(`OCR scan failed: ${msg}\nCheck console for full details.`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    for (const g of groups) {
      if (x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height) {
        setSelectedText(g.text || null);
        if (g.text) navigator.clipboard.writeText(g.text).catch(()=>{});
        return;
      }
    }
    setSelectedText(null);
  };

  return (
    <div className="p-4 border rounded-md bg-white/5">
      {initError && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-200 text-sm">
          <div className="font-semibold">⚠ {initError}</div>
          <div className="text-xs mt-1 text-red-300">Running in demo mode. Real OCR models not loaded.</div>
        </div>
      )}
      {modelsAvailable && (
        <div className="mb-4 p-2 bg-green-900/20 border border-green-700 rounded text-green-200 text-sm">
          ✓ OCR models loaded successfully
        </div>
      )}
      
      <div className="flex gap-4 items-center">
        <label className="p-2 border rounded cursor-pointer bg-gray-800">
          Upload Image
          <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={handleScan} disabled={!imageSrc || processing} className="px-3 py-1 rounded bg-primary disabled:opacity-50">
          {processing ? 'Scanning...' : 'Scan OCR'}
        </button>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showBoxes} onChange={e => setShowBoxes(e.target.checked)} /> Show boxes
        </label>
      </div>

      <div className="mt-4 flex gap-4">
        <div style={{position: 'relative'}}>
          {imageSrc ? (
            <>
              <img ref={imgRef} src={imageSrc} alt="uploaded" style={{maxWidth: '600px', display: 'block'}} onLoad={() => { setGroups([]); }} />
              <canvas ref={canvasRef} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'auto'}} onClick={handleCanvasClick} />
            </>
          ) : (
            <div className="w-[300px] h-[200px] flex items-center justify-center bg-gray-900 text-gray-400">No image</div>
          )}
        </div>

        <div className="w-64">
          <div className="mb-2 font-semibold">Details</div>
          <div className="text-sm h-40 overflow-auto p-2 border rounded bg-black/20">
            {selectedText ? selectedText : groups.length ? groups.map((g,i)=>(<div key={i} className="mb-2">{g.text}</div>)) : 'No text scanned yet.'}
          </div>
          <div className="mt-2 text-xs text-gray-400">Click a box to copy its text to clipboard.</div>
        </div>
      </div>
    </div>
  );
}
