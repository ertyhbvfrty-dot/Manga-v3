// index.tsx
import React5 from "react";
import ReactDOM from "react-dom/client";

// App.tsx
import React4, { useState as useState3 } from "react";

// Library.tsx
import React, { useRef } from "react";
var Library = ({ items, onSelect, onUpload }) => {
  const fileInputRef = useRef(null);
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-background-dark text-white font-display" }, /* @__PURE__ */ React.createElement("header", { className: "sticky top-0 z-50 flex items-center justify-between px-6 py-6 bg-background-dark/80 backdrop-blur-md border-b border-white/5" }, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold tracking-tight bg-gradient-to-r from-[#a78bfa] to-[#4b2bee] bg-clip-text text-transparent" }, "Library")), /* @__PURE__ */ React.createElement("main", { className: "px-4 pb-24 pt-4" }, items.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center h-[60vh] text-center text-white/50" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-7xl mb-6 text-white/10" }, "library_books"), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-medium text-white mb-2" }, "Your library is empty"), /* @__PURE__ */ React.createElement("p", { className: "text-sm max-w-md mx-auto mb-8" }, "Upload a local .cbz or .zip file to start reading your manga collection."), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => fileInputRef.current?.click(),
      className: "px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-medium transition-all shadow-[0_0_20px_rgba(75,43,238,0.3)] hover:shadow-[0_0_25px_rgba(75,43,238,0.5)] active:scale-95"
    },
    "Upload Manga"
  )) : /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" }, items.map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.id,
      onClick: () => onSelect(item.id),
      className: "group relative aspect-[2/3] overflow-hidden rounded-lg bg-primary/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ring-1 ring-white/10 hover:ring-primary/50"
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110",
        style: { backgroundImage: `url('${item.coverUrl}')` }
      },
      /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-white line-clamp-2" }, item.title))
    )
  )))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      ref: fileInputRef,
      onChange: handleFileChange,
      accept: ".zip,.cbz,.rar",
      className: "hidden"
    }
  ), items.length > 0 && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => fileInputRef.current?.click(),
      className: "fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_15px_rgba(75,43,238,0.4)] transition-transform hover:scale-105 active:scale-95 hover:bg-primary/90",
      "aria-label": "Upload Manga"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl" }, "add")
  ));
};

// Reader.tsx
import React2, { useState, useEffect, useCallback, useRef as useRef2 } from "react";

// ocr.ts
import { GoogleGenAI, Type } from "@google/genai";
var ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
var SYSTEM_PROMPT = `Analyze the provided manga pages in the exact order they are given.
For each page, detect all speech bubbles.
Return an array of results, where the first item corresponds to the first image, the second item to the second image, and so on.
For each bubble, extract the English text and the bounding box (ymin, xmin, ymax, xmax) on a 0-1000 scale relative to the image dimensions.
Ignore sound effects and narration boxes if they don't contain dialogue.`;
var analyzeMangaPages = async (base64Images) => {
  try {
    const parts = [];
    base64Images.forEach((b64) => {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: b64
        }
      });
    });
    parts.push({ text: SYSTEM_PROMPT });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of analysis results corresponding to the input images",
          items: {
            type: Type.OBJECT,
            properties: {
              bubbles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    box_2d: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                      description: "The bounding box [ymin, xmin, ymax, xmax] of the bubble."
                    }
                  },
                  required: ["text", "box_2d"]
                }
              }
            },
            required: ["bubbles"]
          }
        }
      }
    });
    const text = response.text;
    if (!text)
      return base64Images.map(() => []);
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((pageResult) => pageResult.bubbles || []);
      }
      return base64Images.map(() => []);
    } catch (e) {
      console.error("Failed to parse JSON response", e);
      return base64Images.map(() => []);
    }
  } catch (error) {
    console.error("OCR Batch Error:", error);
    return base64Images.map(() => []);
  }
};
var blobUrlToBase64 = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString();
      if (result) {
        resolve(result.split(",")[1]);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Reader.tsx
var BATCH_SIZE = 4;
var Reader = ({ manga, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [analysisCache, setAnalysisCache] = useState({});
  const [isAnalysisEnabled, setIsAnalysisEnabled] = useState(false);
  const processingQueue = useRef2(/* @__PURE__ */ new Set());
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const synth = useRef2(window.speechSynthesis);
  const [activeBubbleIndex, setActiveBubbleIndex] = useState(null);
  const lastSpokenPageIndexRef = useRef2(null);
  const processBatch = useCallback(async (batchIndex) => {
    if (processingQueue.current.has(batchIndex))
      return;
    const startPage = batchIndex * BATCH_SIZE;
    const endPage = Math.min(startPage + BATCH_SIZE, manga.pages.length);
    let allLoaded = true;
    for (let i = startPage; i < endPage; i++) {
      if (analysisCache[i]?.status !== "complete") {
        allLoaded = false;
        break;
      }
    }
    if (allLoaded)
      return;
    processingQueue.current.add(batchIndex);
    setAnalysisCache((prev) => {
      const nextState = { ...prev };
      for (let i = startPage; i < endPage; i++) {
        if (nextState[i]?.status !== "complete") {
          nextState[i] = { bubbles: [], status: "loading" };
        }
      }
      return nextState;
    });
    try {
      const imagePromises = [];
      for (let i = startPage; i < endPage; i++) {
        imagePromises.push(blobUrlToBase64(manga.pages[i]));
      }
      const base64Images = await Promise.all(imagePromises);
      const batchResults = await analyzeMangaPages(base64Images);
      setAnalysisCache((prev) => {
        const nextState = { ...prev };
        batchResults.forEach((bubbles, relativeIndex) => {
          const absoluteIndex = startPage + relativeIndex;
          bubbles.sort((a, b) => {
            const yDiff = a.box_2d[0] - b.box_2d[0];
            if (Math.abs(yDiff) > 50)
              return yDiff;
            return b.box_2d[1] - a.box_2d[1];
          });
          nextState[absoluteIndex] = { bubbles, status: "complete" };
        });
        return nextState;
      });
    } catch (err) {
      console.error("Batch analysis failed", err);
      setAnalysisCache((prev) => {
        const nextState = { ...prev };
        for (let i = startPage; i < endPage; i++) {
          nextState[i] = { bubbles: [], status: "error" };
        }
        return nextState;
      });
    } finally {
      processingQueue.current.delete(batchIndex);
    }
  }, [manga.pages, analysisCache]);
  useEffect(() => {
    if (!isAnalysisEnabled)
      return;
    const currentBatch = Math.floor(currentIndex / BATCH_SIZE);
    processBatch(currentBatch);
    const nextBatch = currentBatch + 1;
    if (nextBatch * BATCH_SIZE < manga.pages.length) {
      const timer = setTimeout(() => {
        processBatch(nextBatch);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isAnalysisEnabled, processBatch, manga.pages.length]);
  useEffect(() => {
    if (!ttsEnabled || !isAnalysisEnabled) {
      synth.current.cancel();
      setActiveBubbleIndex(null);
      lastSpokenPageIndexRef.current = null;
    }
  }, [ttsEnabled, isAnalysisEnabled]);
  useEffect(() => {
    if (!ttsEnabled || !isAnalysisEnabled)
      return;
    const currentPageData = analysisCache[currentIndex];
    if (lastSpokenPageIndexRef.current === currentIndex && synth.current.speaking) {
      return;
    }
    if (lastSpokenPageIndexRef.current !== currentIndex) {
      synth.current.cancel();
      setActiveBubbleIndex(null);
    }
    if (currentPageData?.status === "complete" && currentPageData.bubbles.length > 0) {
      lastSpokenPageIndexRef.current = currentIndex;
      currentPageData.bubbles.forEach((bubble, i) => {
        const utterance = new SpeechSynthesisUtterance(bubble.text);
        const voices = synth.current.getVoices();
        const voice = voices.find((v) => v.name.includes("Google US English")) || voices.find((v) => v.lang.startsWith("en"));
        if (voice)
          utterance.voice = voice;
        utterance.rate = 1;
        utterance.onstart = () => {
          setActiveBubbleIndex(i);
        };
        utterance.onend = () => {
          if (i === currentPageData.bubbles.length - 1) {
            setActiveBubbleIndex(null);
          }
        };
        utterance.onerror = () => {
          if (i === currentPageData.bubbles.length - 1) {
            setActiveBubbleIndex(null);
          }
        };
        synth.current.speak(utterance);
      });
    }
  }, [currentIndex, ttsEnabled, isAnalysisEnabled, analysisCache]);
  useEffect(() => {
    return () => {
      synth.current.cancel();
    };
  }, []);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        setCurrentIndex((prev) => Math.min(prev + 1, manga.pages.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [manga.pages.length, onClose]);
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };
  const handleNext = () => setCurrentIndex((prev) => Math.min(prev + 1, manga.pages.length - 1));
  const handlePrev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const toggleControls = () => setShowControls(!showControls);
  const currentAnalysis = analysisCache[currentIndex];
  const isLoading = currentAnalysis?.status === "loading";
  return /* @__PURE__ */ React2.createElement("div", { className: "relative h-screen w-full flex items-center justify-center bg-black overflow-hidden select-none font-sans" }, /* @__PURE__ */ React2.createElement(
    "div",
    {
      className: "relative h-full w-full max-w-5xl flex items-center justify-center",
      onClick: toggleControls
    },
    /* @__PURE__ */ React2.createElement(
      "img",
      {
        src: manga.pages[currentIndex],
        className: "max-h-full max-w-full object-contain shadow-2xl",
        alt: `Page ${currentIndex + 1}`
      }
    ),
    isAnalysisEnabled && currentAnalysis?.status === "complete" && /* @__PURE__ */ React2.createElement("div", { className: "absolute inset-0 pointer-events-none flex items-center justify-center" }, /* @__PURE__ */ React2.createElement(
      OverlayLayer,
      {
        bubbles: currentAnalysis.bubbles,
        activeBubbleIndex
      }
    ))
  ), isAnalysisEnabled && isLoading && /* @__PURE__ */ React2.createElement("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2" }, /* @__PURE__ */ React2.createElement("div", { className: "size-12 rounded-full border-4 border-primary border-t-transparent animate-spin drop-shadow-lg" }), /* @__PURE__ */ React2.createElement("div", { className: "bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider" }, "Analyzing Batch...")), /* @__PURE__ */ React2.createElement("div", { className: `absolute top-0 left-0 right-0 p-6 flex justify-between items-start transition-opacity duration-300 z-30 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}` }, /* @__PURE__ */ React2.createElement(
    "button",
    {
      onClick: onClose,
      className: "size-12 flex items-center justify-center rounded-lg bg-reader-dark/40 backdrop-blur-md border border-white/10 hover:bg-reader-dark/60 transition-colors text-white"
    },
    /* @__PURE__ */ React2.createElement("span", { className: "material-symbols-outlined text-2xl" }, "home")
  ), isAnalysisEnabled && /* @__PURE__ */ React2.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        setTtsEnabled(!ttsEnabled);
      },
      className: `flex items-center gap-2 px-4 h-12 rounded-full backdrop-blur-md border transition-all ${ttsEnabled ? "bg-primary text-white border-primary/50" : "bg-reader-dark/40 text-white/70 border-white/10 hover:bg-reader-dark/60"}`
    },
    /* @__PURE__ */ React2.createElement("span", { className: "material-symbols-outlined text-xl" }, ttsEnabled ? "volume_up" : "volume_off"),
    /* @__PURE__ */ React2.createElement("span", { className: "text-sm font-medium hidden sm:inline" }, ttsEnabled ? "Audio On" : "Audio Off")
  ), /* @__PURE__ */ React2.createElement(
    "button",
    {
      onClick: toggleFullScreen,
      className: "size-12 flex items-center justify-center rounded-lg bg-reader-dark/40 backdrop-blur-md border border-white/10 hover:bg-reader-dark/60 transition-colors text-white"
    },
    /* @__PURE__ */ React2.createElement("span", { className: "material-symbols-outlined text-2xl" }, isFullScreen ? "close_fullscreen" : "fullscreen")
  )), /* @__PURE__ */ React2.createElement("div", { className: `fixed bottom-10 left-0 right-0 px-6 flex flex-col items-center gap-6 transition-all duration-300 z-30 ${showControls ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}` }, /* @__PURE__ */ React2.createElement("div", { className: "w-full max-w-xl flex items-center gap-4" }, /* @__PURE__ */ React2.createElement("span", { className: "text-xs text-white/50 w-8 text-right" }, currentIndex + 1), /* @__PURE__ */ React2.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: manga.pages.length - 1,
      value: currentIndex,
      onChange: (e) => setCurrentIndex(Number(e.target.value)),
      className: "flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white transition-all hover:bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
    }
  ), /* @__PURE__ */ React2.createElement("span", { className: "text-xs text-white/50 w-8" }, manga.pages.length)), /* @__PURE__ */ React2.createElement("div", { className: "flex items-center gap-4 p-2 rounded-xl bg-reader-dark/60 backdrop-blur-xl border border-white/10 shadow-2xl" }, /* @__PURE__ */ React2.createElement(
    "button",
    {
      onClick: handlePrev,
      disabled: currentIndex === 0,
      className: "size-14 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
    },
    /* @__PURE__ */ React2.createElement("span", { className: "material-symbols-outlined text-white text-3xl" }, "chevron_left")
  ), /* @__PURE__ */ React2.createElement("div", { className: "relative group" }, /* @__PURE__ */ React2.createElement(
    "button",
    {
      onClick: () => setIsAnalysisEnabled(!isAnalysisEnabled),
      className: `size-16 flex items-center justify-center rounded-lg transition-all border ${isAnalysisEnabled ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(75,43,238,0.5)]" : "bg-white/5 text-white/80 border-white/5 hover:bg-white/10"}`,
      title: "Toggle AI Analysis"
    },
    /* @__PURE__ */ React2.createElement("span", { className: "material-symbols-outlined text-3xl" }, "psychology")
  )), /* @__PURE__ */ React2.createElement(
    "button",
    {
      onClick: handleNext,
      disabled: currentIndex === manga.pages.length - 1,
      className: "size-14 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
    },
    /* @__PURE__ */ React2.createElement("span", { className: "material-symbols-outlined text-white text-3xl" }, "chevron_right")
  ))));
};
var OverlayLayer = ({ bubbles, activeBubbleIndex }) => {
  const [imgRect, setImgRect] = useState(null);
  const containerRef = useRef2(null);
  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        const img = containerRef.current.parentElement?.querySelector("img");
        if (img) {
          setImgRect({
            width: img.offsetWidth,
            height: img.offsetHeight
          });
        }
      }
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    const interval = setInterval(updateRect, 500);
    return () => {
      window.removeEventListener("resize", updateRect);
      clearInterval(interval);
    };
  }, []);
  if (!imgRect)
    return /* @__PURE__ */ React2.createElement("div", { ref: containerRef });
  return /* @__PURE__ */ React2.createElement(
    "div",
    {
      ref: containerRef,
      style: {
        width: imgRect.width,
        height: imgRect.height,
        position: "absolute"
      }
    },
    bubbles.map((bubble, i) => {
      const [ymin, xmin, ymax, xmax] = bubble.box_2d;
      const top = ymin / 1e3 * 100;
      const left = xmin / 1e3 * 100;
      const height = (ymax - ymin) / 1e3 * 100;
      const width = (xmax - xmin) / 1e3 * 100;
      const isActive = i === activeBubbleIndex;
      return /* @__PURE__ */ React2.createElement(
        "div",
        {
          key: i,
          className: `absolute transition-all duration-300 group ${isActive ? "border-4 border-green-400 bg-green-400/20 z-50 shadow-[0_0_15px_rgba(74,222,128,0.5)]" : "border-2 border-red-500 bg-red-500/10 hover:bg-red-500/20"}`,
          style: {
            top: `${top}%`,
            left: `${left}%`,
            width: `${width}%`,
            height: `${height}%`
          },
          title: bubble.text
        },
        /* @__PURE__ */ React2.createElement("div", { className: `absolute -top-3 -left-3 size-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-md z-10 ${isActive ? "bg-green-600 scale-110" : "bg-red-600"}` }, i + 1),
        /* @__PURE__ */ React2.createElement("div", { className: `opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 text-white text-xs p-2 rounded w-48 pointer-events-none transition-opacity z-20 ${isActive ? "hidden" : ""}` }, bubble.text)
      );
    })
  );
};

// OCRReader.tsx
import React3, { useRef as useRef3, useState as useState2, useEffect as useEffect2 } from "react";

// ocrInit.ts
import * as ort from "onnxruntime-web";
var detSession = null;
var recSession = null;
async function initModels(options = {}) {
  const { wasmPaths, detModelUrl, recModelUrl } = options;
  if (!detSession && detModelUrl) {
    detSession = await ort.InferenceSession.create(detModelUrl, { executionProviders: ["wasm"] });
  }
  if (!recSession && recModelUrl) {
    recSession = await ort.InferenceSession.create(recModelUrl, { executionProviders: ["wasm"] });
  }
  return { detSession, recSession };
}
function imageToTensor(img, size = 640) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size).data;
  const floatData = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    floatData[i * 3 + 0] = imgData[i * 4 + 0] / 255;
    floatData[i * 3 + 1] = imgData[i * 4 + 1] / 255;
    floatData[i * 3 + 2] = imgData[i * 4 + 2] / 255;
  }
  const tensor = new ort.Tensor("float32", floatData, [1, 3, size, size]);
  return { tensor, canvas };
}
async function runOCR(image) {
  if (!detSession || !recSession)
    throw new Error("Models not initialized");
  const targetSize = 640;
  const { tensor, canvas } = imageToTensor(image, targetSize);
  const feeds = {};
  const detInputName = detSession.inputNames[0];
  feeds[detInputName] = tensor;
  const detResults = await detSession.run(feeds);
  const detOutName = detSession.outputNames[0];
  const detOutput = detResults[detOutName];
  let boxes = simplePostprocessDet(detOutput, canvas.width, canvas.height);
  boxes = nonMaxSuppression(boxes, 0.3);
  const results = [];
  const ctx = canvas.getContext("2d");
  const origW = image.naturalWidth || image.width;
  const origH = image.naturalHeight || image.height;
  const scaleX = origW / targetSize;
  const scaleY = origH / targetSize;
  for (const b of boxes) {
    const sx = Math.max(0, Math.floor(b.x));
    const sy = Math.max(0, Math.floor(b.y));
    const sw = Math.max(1, Math.floor(b.width));
    const sh = Math.max(1, Math.floor(b.height));
    const crop = ctx.getImageData(sx, sy, sw, sh);
    const cCanvas = document.createElement("canvas");
    cCanvas.width = sw;
    cCanvas.height = sh;
    const cCtx = cCanvas.getContext("2d");
    cCtx.putImageData(crop, 0, 0);
    const { tensor: recTensor } = imageToTensor(cCanvas, Math.max(sw, sh));
    const recFeeds = {};
    const recInputName = recSession.inputNames[0];
    recFeeds[recInputName] = recTensor;
    const recOut = await recSession.run(recFeeds);
    const recOutName = recSession.outputNames[0];
    const recOutTensor = recOut[recOutName];
    const text = simpleDecodeRec(recOutTensor);
    results.push({ x: b.x * scaleX, y: b.y * scaleY, width: b.width * scaleX, height: b.height * scaleY, text, score: b.score });
  }
  return results;
}
function simplePostprocessDet(tensor, w, h) {
  const boxes = [];
  const data = tensor.data;
  const len = Math.min(50, Math.floor(data.length / 6));
  for (let i = 0; i < len; i++) {
    const idx = i * 6;
    const cx = data[idx] * w;
    const cy = data[idx + 1] * h;
    const bw = Math.max(5, data[idx + 2] * w);
    const bh = Math.max(5, data[idx + 3] * h);
    const score = data[idx + 4];
    if (score > 0.3) {
      boxes.push({ x: Math.max(0, cx - bw / 2), y: Math.max(0, cy - bh / 2), width: bw, height: bh, score });
    }
  }
  return boxes;
}
function simpleDecodeRec(tensor) {
  return '"recognized English text"';
}
function groupBoxesIntoLines(boxes, yThreshold = 12) {
  const sorted = boxes.slice().sort((a, b) => a.y - b.y);
  const groups = [];
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
    if (!placed)
      groups.push([b]);
  }
  return groups.map((g) => {
    g.sort((a, b) => a.x - b.x);
    const text = g.map((x2) => x2.text || "").join(" ");
    const x = Math.min(...g.map((p) => p.x));
    const y = Math.min(...g.map((p) => p.y));
    const width = Math.max(...g.map((p) => p.x + p.width)) - x;
    const height = Math.max(...g.map((p) => p.y + p.height)) - y;
    return { x, y, width, height, text };
  });
}

// OCRReader.tsx
function OCRReader(_) {
  const [imageSrc, setImageSrc] = useState2(null);
  const [processing, setProcessing] = useState2(false);
  const [showBoxes, setShowBoxes] = useState2(true);
  const [groups, setGroups] = useState2([]);
  const [selectedText, setSelectedText] = useState2(null);
  const imgRef = useRef3(null);
  const canvasRef = useRef3(null);
  useEffect2(() => {
    (async () => {
      try {
        await initModels({
          wasmPaths: "/onnx/",
          detModelUrl: "/models/ch_PP-OCRv4_det_infer.onnx",
          recModelUrl: "/models/en_PP-OCRv4_rec_infer.onnx"
        });
        setModelsAvailable(true);
      } catch (e) {
        console.warn("Model init failed (this app expects model files in /models):", e);
      }
    })();
  }, []);
  const [modelsAvailable, setModelsAvailable] = useState2(false);
  useEffect2(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img)
      return;
    const ctx = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showBoxes) {
      for (const g of groups) {
        ctx.strokeStyle = "rgba(0,200,255,0.9)";
        ctx.lineWidth = 2;
        ctx.fillStyle = "rgba(0,200,255,0.12)";
        ctx.fillRect(g.x, g.y, g.width, g.height);
        ctx.strokeRect(g.x, g.y, g.width, g.height);
      }
    }
  }, [groups, showBoxes]);
  const handleFile = (file) => {
    if (!file)
      return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setGroups([]);
    setSelectedText(null);
  };
  const handleScan = async () => {
    if (!imgRef.current)
      return;
    setProcessing(true);
    try {
      if (modelsAvailable) {
        const boxes = await runOCR(imgRef.current);
        const grouped = groupBoxesIntoLines(boxes, 18);
        setGroups(grouped);
      } else {
        const img = imgRef.current;
        const w = img.naturalWidth || 600;
        const h = img.naturalHeight || 800;
        const sample = [{ x: w * 0.2, y: h * 0.6, width: w * 0.6, height: h * 0.12, text: "Hello from demo OCR!" }];
        setGroups(sample);
        setSelectedText(sample[0].text || null);
      }
    } catch (e) {
      console.error(e);
      alert("OCR failed. See console for details.");
    } finally {
      setProcessing(false);
    }
  };
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas)
      return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    for (const g of groups) {
      if (x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height) {
        setSelectedText(g.text || null);
        if (g.text)
          navigator.clipboard.writeText(g.text).catch(() => {
          });
        return;
      }
    }
    setSelectedText(null);
  };
  return /* @__PURE__ */ React3.createElement("div", { className: "p-4 border rounded-md bg-white/5" }, /* @__PURE__ */ React3.createElement("div", { className: "flex gap-4 items-center" }, /* @__PURE__ */ React3.createElement("label", { className: "p-2 border rounded cursor-pointer bg-gray-800" }, "Upload Image", /* @__PURE__ */ React3.createElement("input", { type: "file", accept: "image/*", className: "hidden", onChange: (e) => handleFile(e.target.files?.[0] ?? null) })), /* @__PURE__ */ React3.createElement("button", { onClick: handleScan, disabled: !imageSrc || processing, className: "px-3 py-1 rounded bg-primary disabled:opacity-50" }, processing ? "Scanning..." : "Scan OCR"), /* @__PURE__ */ React3.createElement("label", { className: "flex items-center gap-2" }, /* @__PURE__ */ React3.createElement("input", { type: "checkbox", checked: showBoxes, onChange: (e) => setShowBoxes(e.target.checked) }), " Show boxes")), /* @__PURE__ */ React3.createElement("div", { className: "mt-4 flex gap-4" }, /* @__PURE__ */ React3.createElement("div", { style: { position: "relative" } }, imageSrc ? /* @__PURE__ */ React3.createElement(React3.Fragment, null, /* @__PURE__ */ React3.createElement("img", { ref: imgRef, src: imageSrc, alt: "uploaded", style: { maxWidth: "600px", display: "block" }, onLoad: () => {
    setGroups([]);
  } }), /* @__PURE__ */ React3.createElement("canvas", { ref: canvasRef, style: { position: "absolute", left: 0, top: 0, pointerEvents: "auto" }, onClick: handleCanvasClick })) : /* @__PURE__ */ React3.createElement("div", { className: "w-[300px] h-[200px] flex items-center justify-center bg-gray-900 text-gray-400" }, "No image")), /* @__PURE__ */ React3.createElement("div", { className: "w-64" }, /* @__PURE__ */ React3.createElement("div", { className: "mb-2 font-semibold" }, "Details"), /* @__PURE__ */ React3.createElement("div", { className: "text-sm h-40 overflow-auto p-2 border rounded bg-black/20" }, selectedText ? selectedText : groups.length ? groups.map((g, i) => /* @__PURE__ */ React3.createElement("div", { key: i, className: "mb-2" }, g.text)) : "No text scanned yet."), /* @__PURE__ */ React3.createElement("div", { className: "mt-2 text-xs text-gray-400" }, "Click a box to copy its text to clipboard."))));
}

// zipUtils.ts
import JSZip from "jszip";
var processMangaFile = async (file) => {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  const imageFiles = [];
  const entries = Object.keys(zipContent.files).filter((filename) => {
    return !zipContent.files[filename].dir && /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
  });
  entries.sort((a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" }));
  for (const filename of entries) {
    const fileData = zipContent.files[filename];
    const blob = await fileData.async("blob");
    imageFiles.push({ name: filename, blob });
  }
  if (imageFiles.length === 0) {
    throw new Error("No valid images found in the archive.");
  }
  const pages = imageFiles.map((img) => URL.createObjectURL(img.blob));
  return {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.(cbz|zip)$/i, ""),
    coverUrl: pages[0],
    // Use first page as cover
    pages
  };
};

// App.tsx
function App() {
  const [view, setView] = useState3("library");
  const [currentManga, setCurrentManga] = useState3(null);
  const [libraryItems, setLibraryItems] = useState3([]);
  const [isLoading, setIsLoading] = useState3(false);
  const handleUpload = async (file) => {
    setIsLoading(true);
    try {
      const manga = await processMangaFile(file);
      setCurrentManga(manga);
      setLibraryItems((prev) => [
        ...prev,
        { id: manga.id, title: manga.title, coverUrl: manga.coverUrl }
      ]);
      setView("reader");
    } catch (error) {
      console.error("Failed to process file", error);
      alert("Failed to process file. Please ensure it is a valid .zip or .cbz file containing images.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleSelectManga = (id) => {
    if (currentManga && currentManga.id === id) {
      setView("reader");
    } else {
      alert("In-memory storage limit: Only the most recently uploaded manga is readable.");
    }
  };
  const handleCloseReader = () => {
    setView("library");
  };
  if (view === "reader" && currentManga) {
    return /* @__PURE__ */ React4.createElement(Reader, { manga: currentManga, onClose: handleCloseReader });
  }
  return /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(
    Library,
    {
      items: libraryItems,
      onSelect: handleSelectManga,
      onUpload: handleUpload
    }
  ), /* @__PURE__ */ React4.createElement("div", { className: "mt-6" }, /* @__PURE__ */ React4.createElement(OCRReader, null)), isLoading && /* @__PURE__ */ React4.createElement("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" }, /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col items-center gap-4" }, /* @__PURE__ */ React4.createElement("div", { className: "h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" }), /* @__PURE__ */ React4.createElement("p", { className: "text-white font-medium animate-pulse" }, "Processing Manga..."))));
}
var App_default = App;

// index.tsx
var rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
var root = ReactDOM.createRoot(rootElement);
root.render(
  /* @__PURE__ */ React5.createElement(React5.StrictMode, null, /* @__PURE__ */ React5.createElement(App_default, null))
);
