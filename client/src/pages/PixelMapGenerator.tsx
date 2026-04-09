import { useState, useEffect, useCallback } from "react";
import avdLogoDark from "@assets/avd-logo-dark.png";
import type { PixelMapInput } from "../../../shared/schema";
import { downloadRenderedPng } from "../lib/canvas-renderer";

type InputMode = "tile" | "direct";

const CANVAS_PRESETS = [
  { label: "3840 × 2160", w: 3840, h: 2160 },
  { label: "1920 × 1200", w: 1920, h: 1200 },
  { label: "1920 × 1080", w: 1920, h: 1080 },
];

export default function PixelMapGenerator() {
  const [inputMode, setInputMode]   = useState<InputMode>("tile");
  const [canvasPreset, setCanvasPreset] = useState(0);

  // Tile mode
  const [tileW,    setTileW]    = useState(208);
  const [tileH,    setTileH]    = useState(208);
  const [tilesWide, setTilesWide] = useState(14);
  const [tilesTall, setTilesTall] = useState(6);

  // Direct mode
  const [directW, setDirectW] = useState(2912);
  const [directH, setDirectH] = useState(1248);

  // Computed
  const [mediaW, setMediaW] = useState(2912);
  const [mediaH, setMediaH] = useState(1248);

  // Settings
  const [projectName, setProjectName] = useState("");
  const [genMap,  setGenMap]  = useState(true);
  const [genTest, setGenTest] = useState(false);

  const [downloading, setDownloading] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (inputMode === "tile") {
      setMediaW(tileW * tilesWide);
      setMediaH(tileH * tilesTall);
    } else {
      setMediaW(directW);
      setMediaH(directH);
    }
  }, [inputMode, tileW, tileH, tilesWide, tilesTall, directW, directH]);

  const canvasW = CANVAS_PRESETS[canvasPreset].w;
  const canvasH = CANVAS_PRESETS[canvasPreset].h;

  // Preview geometry
  const PREVIEW_W  = 540;
  const previewScale = PREVIEW_W / canvasW;
  const PREVIEW_H   = Math.round(canvasH * previewScale);
  const prevMediaW  = Math.round(mediaW * previewScale);
  const prevMediaH  = Math.round(mediaH * previewScale);

  // Consistent label font — doesn't drift with canvas size
  const baseLabelFont = Math.max(8, Math.min(14, Math.round(PREVIEW_W / 45)));

  const buildPayload = useCallback((): PixelMapInput => ({
    tileWidth:           tileW,
    tileHeight:          tileH,
    tilesWide:           tilesWide,
    tilesTall:           tilesTall,
    mediaWidth:          mediaW,
    mediaHeight:         mediaH,
    canvasWidth:         canvasW,
    canvasHeight:        canvasH,
    projectName:         projectName || undefined,
    generatePixelMap:    genMap,
    generateTestPattern: genTest,
  }), [tileW, tileH, tilesWide, tilesTall, mediaW, mediaH, canvasW, canvasH, projectName, genMap, genTest]);

  const downloadPng = (mode: "map" | "test") => {
    setDownloading(mode);
    setStatus(null);
    try {
      downloadRenderedPng(mode, buildPayload(), projectName || undefined);
      const name = projectName
        ? projectName.replace(/[^a-zA-Z0-9 _-]/g, "")
        : mode === "test"
          ? `AVD_TestPattern_${mediaW}x${mediaH}`
          : `AVD_PixelMap_${mediaW}x${mediaH}`;
      setStatus({ ok: true, msg: `Downloaded ${name}.png` });
    } catch (err: any) {
      setStatus({ ok: false, msg: `Render failed: ${err.message}` });
    } finally {
      setDownloading(null);
    }
  };

  const numInput = (
    val: number,
    set: (n: number) => void,
    label: string,
    testId: string,
    min = 1
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</label>
      <input
        data-testid={testId}
        type="number"
        min={min}
        value={val}
        onChange={e => set(Math.max(min, parseInt(e.target.value) || min))}
        className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center">
        <div className="flex items-center gap-4">
          <img src={avdLogoDark} alt="AV Dimensions" className="h-10 object-contain" data-testid="img-logo" />
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Pixel Map Generator</h1>
            <p className="text-xs text-muted-foreground">LED Tile Mapping Tool</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-0">
        {/* ── Left panel ── */}
        <div className="w-80 border-r border-border p-5 flex flex-col gap-5 overflow-y-auto">

          {/* Project name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Project Name (optional)</label>
            <input
              data-testid="input-project-name"
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. Interlake_Modex_41165"
              className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Input mode toggle */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Resolution Input Mode</p>
            <div className="flex rounded overflow-hidden border border-border text-sm" data-testid="toggle-input-mode">
              <button
                data-testid="button-mode-tile"
                onClick={() => setInputMode("tile")}
                className={`flex-1 py-2 transition-colors font-semibold ${inputMode === "tile" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}
              >Tile Count</button>
              <button
                data-testid="button-mode-direct"
                onClick={() => setInputMode("direct")}
                className={`flex-1 py-2 transition-colors font-semibold ${inputMode === "direct" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}
              >Direct Entry</button>
            </div>
          </div>

          {/* Canvas size selector */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Canvas Size</p>
            <div className="flex rounded overflow-hidden border border-border text-xs" data-testid="toggle-canvas-size">
              {CANVAS_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  data-testid={`button-canvas-${preset.w}x${preset.h}`}
                  onClick={() => setCanvasPreset(i)}
                  className={`flex-1 py-2 transition-colors font-semibold ${canvasPreset === i ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}
                >{preset.label}</button>
              ))}
            </div>
          </div>

          {/* Resolution inputs */}
          {inputMode === "tile" ? (
            <div className="flex flex-col gap-4">
              <div className="avd-panel p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Tile Size (px)</p>
                <div className="grid grid-cols-2 gap-3">
                  {numInput(tileW, setTileW, "Width",  "input-tile-w")}
                  {numInput(tileH, setTileH, "Height", "input-tile-h")}
                </div>
              </div>
              <div className="avd-panel p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Tile Configuration</p>
                <div className="grid grid-cols-2 gap-3">
                  {numInput(tilesWide, setTilesWide, "Tiles Wide", "input-tiles-wide")}
                  {numInput(tilesTall, setTilesTall, "Tiles Tall", "input-tiles-tall")}
                </div>
              </div>
            </div>
          ) : (
            <div className="avd-panel p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Viewable Media Resolution (px)</p>
              <div className="grid grid-cols-2 gap-3">
                {numInput(directW, setDirectW, "Width",  "input-direct-w")}
                {numInput(directH, setDirectH, "Height", "input-direct-h")}
              </div>
            </div>
          )}

          {/* Computed resolution display */}
          <div className="avd-panel p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Computed Viewable Media</p>
            <p className={`font-bold text-primary ${canvasW >= 3840 ? "text-2xl" : "text-xl"}`} data-testid="text-media-res">
              {mediaW} × {mediaH}
            </p>
            <p className="text-xs text-muted-foreground mt-1">on {canvasW} × {canvasH} canvas</p>
          </div>

          {/* Output type toggles */}
          <div className="avd-panel p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Output</p>
            <label className="flex items-center gap-3 cursor-pointer" data-testid="toggle-gen-map">
              <input type="checkbox" checked={genMap}  onChange={e => setGenMap(e.target.checked)}  className="w-4 h-4 accent-primary" />
              <span className="text-sm text-foreground">Pixel Map</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer" data-testid="toggle-gen-test">
              <input type="checkbox" checked={genTest} onChange={e => setGenTest(e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-foreground">Test Pattern</span>
            </label>
          </div>

          {/* Download buttons */}
          <div className="flex flex-col gap-2">
            {genMap && (
              <button
                data-testid="button-download-map"
                onClick={() => downloadPng("map")}
                disabled={!!downloading}
                className="w-full py-3 rounded font-bold text-sm bg-primary text-primary-foreground hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {downloading === "map" ? "Generating…" : "↓ Download Pixel Map PNG"}
              </button>
            )}
            {genTest && (
              <button
                data-testid="button-download-test"
                onClick={() => downloadPng("test")}
                disabled={!!downloading}
                className="w-full py-3 rounded font-bold text-sm bg-primary text-primary-foreground hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {downloading === "test" ? "Generating…" : "↓ Download Test Pattern PNG"}
              </button>
            )}
          </div>

          {/* Status message */}
          {status && (
            <div
              data-testid="text-result"
              className={`p-3 rounded text-sm ${status.ok ? "bg-green-900/40 border border-green-700 text-green-300" : "bg-red-900/40 border border-red-700 text-red-300"}`}
            >
              {status.ok ? "✅ " : "❌ "}{status.msg}
            </div>
          )}
        </div>

        {/* ── Right panel: live preview ── */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Live Preview</p>

          <div
            className="preview-canvas"
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
            data-testid="preview-canvas"
          >
            {/* Inner clip — constrains gray area to canvas bounds */}
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 4 }}>
              <div className="preview-media" style={{ width: prevMediaW, height: prevMediaH }} />
            </div>

            {/* "Viewable Media" label */}
            <span
              className="preview-label"
              style={{
                left: Math.min(prevMediaW, PREVIEW_W) / 2 - 60,
                top:  Math.min(prevMediaH, PREVIEW_H) / 2 - 8,
                fontSize: baseLabelFont + 4,
              }}
            >Viewable Media</span>

            {/* Instruction block — in the larger black region */}
            {(canvasW > mediaW || canvasH > mediaH) && (() => {
              const rightW  = PREVIEW_W - prevMediaW;
              const bottomH = PREVIEW_H - prevMediaH;
              const rightArea  = rightW * PREVIEW_H;
              const bottomArea = PREVIEW_W * bottomH;
              const fs = Math.max(6, baseLabelFont - 2);

              if (bottomArea >= rightArea && bottomH > 40) {
                return (
                  <div className="preview-label" style={{
                    left: PREVIEW_W / 2, top: prevMediaH + bottomH / 2,
                    transform: "translate(-50%,-50%)",
                    fontSize: fs, textAlign: "center", lineHeight: "1.8", whiteSpace: "nowrap",
                  }}>
                    Create Viewable Media at {mediaW} x {mediaH}<br/>
                    Place within {canvasW} x {canvasH} project<br/>
                    Render as MP4 @20-25mbps
                  </div>
                );
              } else if (rightW > 60) {
                const rFs = Math.min(fs, Math.max(5, Math.round(rightW / 14)));
                return (
                  <div className="preview-label" style={{
                    left: prevMediaW + rightW / 2, top: PREVIEW_H / 2,
                    transform: "translate(-50%,-50%)",
                    fontSize: rFs, textAlign: "center", lineHeight: "1.7",
                    maxWidth: rightW - 16, overflow: "hidden",
                  }}>
                    Create Viewable Media<br/>at {mediaW} x {mediaH}<br/><br/>
                    Place within<br/>{canvasW} x {canvasH} project<br/><br/>
                    Render as MP4<br/>@20-25mbps
                  </div>
                );
              }
              return null;
            })()}

            {/* "No Media / Leave Black" — in the smaller black region */}
            {(() => {
              const rightW  = PREVIEW_W - prevMediaW;
              const bottomH = PREVIEW_H - prevMediaH;
              const rightArea  = rightW * PREVIEW_H;
              const bottomArea = PREVIEW_W * bottomH;
              const fs = Math.max(6, Math.min(baseLabelFont, baseLabelFont - 2));

              if (rightW > 0 && bottomH > 0) {
                if (bottomArea >= rightArea && rightW > 30) {
                  const nmFs = Math.min(fs, Math.max(5, Math.round(rightW / 12)));
                  return (
                    <span className="preview-label" style={{
                      left: prevMediaW + rightW / 2, top: prevMediaH / 2,
                      transform: "translate(-50%,-50%)",
                      fontSize: nmFs, textAlign: "center", lineHeight: "1.3",
                    }}>No Media<br/>Leave Black</span>
                  );
                } else if (rightArea > bottomArea && bottomH > 15) {
                  return (
                    <span className="preview-label" style={{
                      left: prevMediaW / 2, top: prevMediaH + bottomH / 2,
                      transform: "translate(-50%,-50%)",
                      fontSize: fs, textAlign: "center", lineHeight: "1.3",
                    }}>No Media — Leave Black</span>
                  );
                }
              }
              return null;
            })()}

            {/* Dimension callouts */}
            <span className="preview-label" style={{ left: prevMediaW / 2 - 20, top: 3, fontSize: baseLabelFont }}>{mediaW}</span>
            <span className="preview-label" style={{ left: -16, top: prevMediaH / 2, fontSize: baseLabelFont, transform: "rotate(-90deg)", transformOrigin: "center center", zIndex: 10 }}>{mediaH}</span>
            <span className="preview-label" style={{ left: PREVIEW_W / 2 - 15, bottom: 3, fontSize: baseLabelFont }}>{canvasW}</span>
            <span className="preview-label" style={{ right: -18, top: PREVIEW_H / 2, fontSize: baseLabelFont, transform: "rotate(-90deg)", transformOrigin: "center center", zIndex: 10 }}>{canvasH}</span>

            {/* Divider lines */}
            {PREVIEW_W > prevMediaW && <div style={{ position: "absolute", left: prevMediaW, top: 0, width: 1, height: prevMediaH, background: "rgba(220,26,26,0.4)" }} />}
            {PREVIEW_H > prevMediaH && <div style={{ position: "absolute", left: 0, top: prevMediaH, width: prevMediaW, height: 1, background: "rgba(220,26,26,0.4)" }} />}
          </div>

          {/* Stats below preview */}
          <div className="flex gap-6 text-center mt-2">
            <div>
              <p className="text-xs text-muted-foreground">Media Area</p>
              <p className="text-sm font-bold text-primary">{mediaW} × {mediaH}</p>
            </div>
            <div className="border-l border-border" />
            <div>
              <p className="text-xs text-muted-foreground">Canvas</p>
              <p className="text-sm font-bold text-foreground">{canvasW} × {canvasH}</p>
            </div>
            {inputMode === "tile" && (
              <>
                <div className="border-l border-border" />
                <div>
                  <p className="text-xs text-muted-foreground">Tile Size</p>
                  <p className="text-sm font-bold text-foreground">{tileW} × {tileH}</p>
                </div>
                <div className="border-l border-border" />
                <div>
                  <p className="text-xs text-muted-foreground">Config</p>
                  <p className="text-sm font-bold text-foreground">{tilesWide}W × {tilesTall}T</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
