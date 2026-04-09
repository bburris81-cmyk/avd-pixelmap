import { createCanvas, registerFont } from "canvas";
import type { PixelMapInput } from "../shared/schema";

// Register Verdana Bold + Regular once
const VERDANA_BOLD = "/usr/share/fonts/truetype/msttcorefonts/Verdana_Bold.ttf";
const VERDANA_REG  = "/usr/share/fonts/truetype/msttcorefonts/Verdana.ttf";
try { registerFont(VERDANA_BOLD, { family: "Verdana", weight: "bold" }); } catch {}
try { registerFont(VERDANA_REG,  { family: "Verdana", weight: "normal" }); } catch {}

const RED = "#DC1A1A";

// ── helpers ─────────────────────────────────────────────────────────────────

function makeDropShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draw text centered on (cx, cy). Optionally rotated -90° for vertical labels.
 */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  fontSize: number,
  color: string,
  shadow: boolean,
  vertical = false
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (vertical) ctx.rotate(-Math.PI / 2);

  ctx.font = `bold ${fontSize}px Verdana`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  (ctx as any).antialias = "subpixel";

  if (shadow) makeDropShadow(ctx);
  else clearShadow(ctx);

  ctx.fillText(text, 0, 0);
  clearShadow(ctx);
  ctx.restore();
}

// ── Pixel Map ────────────────────────────────────────────────────────────────

export function renderPixelMap(input: PixelMapInput): Buffer {
  const { mediaWidth: mW, mediaHeight: mH, canvasWidth: cW, canvasHeight: cH } = input;

  const canvas = createCanvas(cW, cH);
  const ctx = canvas.getContext("2d");
  (ctx as any).antialias = "subpixel";

  // ── Black canvas background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, cW, cH);

  // ── Gray viewable media area (solid, clean)
  ctx.fillStyle = "#464646";
  ctx.fillRect(0, 0, Math.min(mW, cW), Math.min(mH, cH));

  // ── Adaptive font sizes
  const dimFont   = Math.max(20, Math.min(72, Math.round(Math.min(cW, cH) * 0.02)));
  const labelFont = Math.max(24, Math.min(72, Math.round(Math.min(mW, mH) * 0.055)));
  const instrFont = Math.max(24, Math.min(72, Math.round(Math.min(cW, cH) * 0.023)));

  // ── "Viewable Media" center label — clamp to visible canvas area
  const vmCx = Math.min(mW, cW) / 2;
  const vmCy = Math.min(mH, cH) / 2;
  drawText(ctx, "Viewable Media", vmCx, vmCy, labelFont, RED, true);

  // ── Dynamic placement: instructions in larger black region, No Media in smaller
  const rightW  = Math.max(0, cW - mW);
  const bottomH = Math.max(0, cH - mH);
  const rightArea  = rightW * cH;
  const bottomArea = cW * bottomH;

  // "No Media / Leave Black"
  if (rightW > 0 && bottomH > 0) {
    if (bottomArea >= rightArea && rightW > 200) {
      // Instructions in bottom → No Media in right
      drawText(ctx, "No Media",    mW + rightW / 2, cH / 2 - instrFont * 0.6, instrFont, RED, false);
      drawText(ctx, "Leave Black", mW + rightW / 2, cH / 2 + instrFont * 0.6, instrFont, RED, false);
    } else if (rightArea > bottomArea && bottomH > 150) {
      // Instructions in right → No Media in bottom
      drawText(ctx, "No Media — Leave Black", mW / 2, mH + bottomH / 2, instrFont, RED, false);
    }
  }

  // Instructions (in larger region)
  if (bottomArea >= rightArea && bottomH > 200) {
    const iY = mH + bottomH / 2;
    drawText(ctx, `Create Viewable Media at ${mW} x ${mH}`, cW / 2, iY - instrFont * 1.5, instrFont, RED, false);
    drawText(ctx, `Place within ${cW} x ${cH} project`,     cW / 2, iY - instrFont * 0.1, instrFont, RED, false);
    drawText(ctx, "Render as MP4 @20-25mbps",                cW / 2, iY + instrFont * 1.5, instrFont, RED, false);
  } else if (rightArea > bottomArea && rightW > 300) {
    const iX = mW + rightW / 2;
    const iY = cH / 2;
    const lh = instrFont * 1.4;
    drawText(ctx, "Create Viewable Media",           iX, iY - lh * 2.5, instrFont, RED, false);
    drawText(ctx, `at ${mW} x ${mH}`,               iX, iY - lh * 1.5, instrFont, RED, false);
    drawText(ctx, `Place within`,                    iX, iY - lh * 0.3, instrFont, RED, false);
    drawText(ctx, `${cW} x ${cH} project`,          iX, iY + lh * 0.7, instrFont, RED, false);
    drawText(ctx, "Render as MP4 @20-25mbps",        iX, iY + lh * 2,   instrFont, RED, false);
  }

  // ── Dimension callouts — clamped to visible canvas bounds
  const dimM = dimFont + 10;

  // Media width — top center (clamped within canvas)
  const mwLabelX = Math.min(mW / 2, cW - dimFont * 2);
  drawText(ctx, String(mW), mwLabelX, dimM, dimFont, RED, true);

  // Media height — left edge, vertical (clamped within canvas)
  const mhLabelY = Math.min(mH / 2, cH - dimFont * 2);
  drawText(ctx, String(mH), dimM, mhLabelY, dimFont, RED, true, true);

  // Canvas width — bottom center
  drawText(ctx, String(cW), cW / 2, cH - dimM, dimFont, RED, false);

  // Canvas height — right edge, vertical
  drawText(ctx, String(cH), cW - dimM, cH / 2, dimFont, RED, false, true);

  // ── Thin red divider lines
  ctx.strokeStyle = "rgba(220,26,26,0.5)";
  ctx.lineWidth = 3;
  if (rightW > 0) {
    ctx.beginPath(); ctx.moveTo(mW, 0); ctx.lineTo(mW, Math.min(mH, cH)); ctx.stroke();
  }
  if (bottomH > 0) {
    ctx.beginPath(); ctx.moveTo(0, mH); ctx.lineTo(Math.min(mW, cW), mH); ctx.stroke();
  }

  return canvas.toBuffer("image/png");
}

// ── Test Pattern (Pixl Grid–inspired) ────────────────────────────────────────

/**
 * Professional LED wall test pattern inspired by Pixl Grid.
 * - Colored tile grid with row/column tile IDs
 * - Center crosshairs + alignment circle
 * - Corner quarter-circles for geometry check
 * - SMPTE color bars (bottom strip)
 * - Grayscale ramp (top strip)
 * - Center label: "AV Dimensions" + resolution
 * - Grid lines (1px white between tiles)
 */

// Distinct, saturated tile colors that alternate for easy visual identification.
const TILE_PALETTE = [
  "#1a3a6e", // deep blue
  "#2d6e2d", // forest green
  "#6e1a6e", // purple
  "#1a6e6e", // teal
  "#6e4e1a", // bronze
  "#6e1a3a", // maroon
  "#2d4e6e", // steel blue
  "#4e6e1a", // olive
  "#3a1a6e", // indigo
  "#6e2d1a", // rust
  "#1a6e3a", // emerald
  "#6e1a4e", // magenta-dark
];

export function renderTestPattern(input: PixelMapInput): Buffer {
  const { mediaWidth: mW, mediaHeight: mH, canvasWidth: cW, canvasHeight: cH,
          tileWidth: tW, tileHeight: tH, tilesWide, tilesTall } = input;

  const canvas = createCanvas(cW, cH);
  const ctx    = canvas.getContext("2d");
  (ctx as any).antialias = "subpixel";

  // Black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, cW, cH);

  // ── Reserve zones for grayscale ramp (top) and SMPTE bars (bottom) ────────
  const rampH = Math.max(20, Math.round(mH * 0.05));
  const barH  = Math.max(24, Math.round(mH * 0.08));

  // ── Tile grid ─────────────────────────────────────────────────────────────
  const tileFontSize = Math.max(8, Math.min(28, Math.round(Math.min(tW, tH) * 0.12)));

  for (let row = 0; row < tilesTall; row++) {
    for (let col = 0; col < tilesWide; col++) {
      const x = col * tW;
      const y = row * tH;
      const colorIdx = (row * tilesWide + col) % TILE_PALETTE.length;

      // Fill tile
      ctx.fillStyle = TILE_PALETTE[colorIdx];
      ctx.fillRect(x, y, tW, tH);

      // Place tile ID in the safe zone — offset down on row 1, up on last row
      const tileCy = y + tH / 2;
      const safeTop = rampH + tileFontSize * 0.6;
      const safeBot = (mH - barH) - tileFontSize * 0.6;
      const labelY = Math.max(safeTop, Math.min(safeBot, tileCy));

      const label = `${row + 1},${col + 1}`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `bold ${tileFontSize}px Verdana`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      makeDropShadow(ctx);
      ctx.fillText(label, x + tW / 2, labelY);
      clearShadow(ctx);
    }
  }

  // ── White grid lines (1px between tiles) ──────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  for (let col = 0; col <= tilesWide; col++) {
    const x = col * tW;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mH); ctx.stroke();
  }
  for (let row = 0; row <= tilesTall; row++) {
    const y = row * tH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mW, y); ctx.stroke();
  }

  // ── Grayscale ramp (top strip — opaque, drawn over tile tops) ─────────────
  const rampSteps = 16;
  const rampStepW = mW / rampSteps;
  for (let i = 0; i < rampSteps; i++) {
    const v = Math.round((i / (rampSteps - 1)) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.round(i * rampStepW), 0, Math.ceil(rampStepW), rampH);
  }
  // Label
  const rampLabelFs = Math.max(8, Math.min(14, Math.round(rampH * 0.5)));
  ctx.save();
  ctx.font = `bold ${rampLabelFs}px Verdana`;
  ctx.fillStyle = "rgba(128,128,128,0.8)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("0–255", mW - 6, rampH / 2);
  ctx.restore();

  // ── SMPTE color bars (bottom strip — opaque, drawn over tile bottoms) ─────
  const barY = mH - barH;
  const barColors = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff", "#000000"];
  const barW = mW / barColors.length;
  barColors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(i * barW), barY, Math.ceil(barW), barH);
  });

  // ── Center crosshairs ─────────────────────────────────────────────────────
  const cx = mW / 2;
  const cy = mH / 2;

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(mW, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, mH); ctx.stroke();

  // ── Center alignment circles ──────────────────────────────────────────────
  const radius = Math.round(Math.min(mW, mH) * 0.25);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, Math.round(radius * 0.5), 0, Math.PI * 2); ctx.stroke();

  // ── Corner quarter-circles ────────────────────────────────────────────────
  const cornerR = Math.round(Math.min(mW, mH) * 0.12);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0,  0,  cornerR, 0,            Math.PI / 2);   ctx.stroke();
  ctx.beginPath(); ctx.arc(mW, 0,  cornerR, Math.PI / 2,  Math.PI);       ctx.stroke();
  ctx.beginPath(); ctx.arc(mW, mH, cornerR, Math.PI,      Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,  mH, cornerR, Math.PI * 1.5, Math.PI * 2);  ctx.stroke();

  // ── Center info box ───────────────────────────────────────────────────────
  const boxW = Math.min(mW * 0.45, 600);
  const boxH = Math.min(mH * 0.22, 180);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

  // "AV Dimensions" brand text
  const logoFont = Math.max(16, Math.min(44, Math.round(boxH * 0.22)));
  drawText(ctx, "AV Dimensions", cx, cy - boxH * 0.22, logoFont, "#ffffff", true);

  // Resolution label
  const resFont = Math.max(13, Math.min(36, Math.round(boxH * 0.18)));
  drawText(ctx, `${mW} x ${mH}`, cx, cy + boxH * 0.06, resFont, "#ffffff", false);

  // Canvas label
  const canvasFont = Math.max(10, Math.min(26, Math.round(boxH * 0.13)));
  drawText(ctx, `Canvas: ${cW} x ${cH}`, cx, cy + boxH * 0.3, canvasFont, "rgba(255,255,255,0.6)", false);

  // ── Raster box — thin white border around full media area ─────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, mW - 2, mH - 2);

  return canvas.toBuffer("image/png");
}
