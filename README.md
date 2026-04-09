# AVD Pixel Map Generator

A web-based pixel map and test pattern generator for ClearLED transparent LED tile installations, plus After Effects ExtendScript tools for batch video mapping.

**Live App:** [https://bburris81-cmyk.github.io/avd-pixelmap/](https://bburris81-cmyk.github.io/avd-pixelmap/)

---

## Scale Logic — 1764×640 → 1792×320

ClearLED transparent panels have a native content resolution of **1764×640**. The LED processor expects a **1792×320** input signal due to the physical pixel layout of the tiles:

| Dimension | Source | Target | Scale Factor | Why |
|-----------|--------|--------|-------------|-----|
| **Width** | 1764 | 1792 | 101.59% (stretch) | Processor maps 1792 horizontal pixels across the tile array |
| **Height** | 640 | 320 | 50% (compress) | Transparent LED tiles have vertical pixel gaps — every other row is open air, so 640 content rows compress into 320 processor rows |

The resulting **1792×320** frame is placed into a **3840×2160** (4K) raster canvas for output. Most of the 4K frame is blank (black).

## 0,0 Alignment Rules

The mapped content must be anchored at the **top-left corner** of the 4K canvas:

- **Top-left pixel of the 1792×320 content sits at position (0, 0)**
- Do **not** center, fit, or scale to fill the 4K frame
- The remaining area (right and below the 1792×320 region) stays **black**
- The LED processor reads pixels starting from (0, 0) — any offset breaks the tile mapping

In After Effects, this means positioning the pre-comp layer so its anchor point produces a top-left origin of `[0, 0]` in the 3840×2160 main comp.

## After Effects Scripts (.jsx)

Both scripts are ExtendScript files that run inside After Effects (2023+).

### AVD_LED_Batch_Map.jsx — Full Batch Processor

Processes **all** video files in a source folder:

1. Imports each video into AE
2. Creates a **1792×320 pre-comp** for each, scaling the source (width 101.59%, height 50%)
3. Anchors the layer at top-left `(0, 0)` inside the pre-comp
4. Creates a **3840×2160 main comp**, places the pre-comp at `(0, 0)`
5. Queues an **H.264 MP4** render as `OriginalName - AVD Mapped.mp4`

#### How to Run

1. Open **After Effects** (2023 or later recommended)
2. Go to **File → Scripts → Run Script File…**
3. Select `AVD_LED_Batch_Map.jsx`
4. The script runs automatically — it reads from the hardcoded source path and queues all renders
5. Open the **Render Queue** and click **Render** to start encoding

#### Configuration (edit at top of file)

```javascript
var srcPath    = "S:\\path\\to\\source\\folder";
var outputPath = srcPath + "\\AVD Mapped";

var srcWidth     = 1764;   // ClearLED native width
var srcHeight    = 640;    // ClearLED native height
var targetWidth  = 1792;   // Processor input width
var targetHeight = 320;    // Processor input height (50% of 640)
var compWidth    = 3840;   // 4K canvas width
var compHeight   = 2160;   // 4K canvas height
```

Change `srcPath` and `outputPath` for each project. The resolution values should stay the same unless the tile hardware changes.

### AVD_LED_Batch_Map_TEST.jsx — Single-File Validation

Processes **only the first video** found in the source folder, then runs pixel-level verification:

- Checks that the scaled dimensions match 1792×320 within 0.5px tolerance
- Validates the top-left pixel is at `(0, 0)`
- Validates the bottom-right pixel is at `(1792, 320)`
- Reports **PASS** or **FAIL** with detailed diagnostics

Use this to verify your AE setup is correct before running the full batch.

#### How to Run

Same as above — **File → Scripts → Run Script File…** → select the TEST script. It will display an alert dialog with the validation results.

## Web App — Pixel Map Generator

The web app generates two types of PNG images:

### Pixel Map

A visual reference diagram showing:

- The 4K canvas area (black)
- The viewable media area (gray `#464646` box)
- Red dimension labels (`#DC1A1A`, Verdana Bold) with drop shadows
- Rotated vertical dimension text
- Dynamic "No Media Leave Black" placement in the largest unused region
- Dynamic instruction text that updates based on the canvas and media size

### Test Pattern (Pixl Grid-style)

A comprehensive test pattern for the media area:

- 12-color tile grid with row/column ID labels
- Grayscale ramp (top 5% of frame)
- SMPTE color bars (bottom 8%)
- Crosshairs, circles, and corner quarter-circles
- Center info box with resolution details
- 1px raster border

### Default Configuration

| Setting | Default Value |
|---------|--------------|
| Canvas | 3840 × 2160 |
| Tile size | 208 × 208 px |
| Grid | 14 wide × 6 tall |
| Viewable media | 2912 × 1248 |

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The production build outputs static files to `dist/public/`. All rendering happens client-side in the browser using the Canvas API — no server-side dependencies are required at runtime.

### Deployment

The app is deployed to GitHub Pages from the `gh-pages` branch. To redeploy:

```bash
npm run build
cd dist/public
git init
git add -A
git commit -m "deploy"
git remote add origin https://github.com/bburris81-cmyk/avd-pixelmap.git
git push --force origin main:gh-pages
```

## Project Structure

```
avd-pixelmap/
├── client/
│   └── src/
│       ├── pages/
│       │   └── PixelMapGenerator.tsx    # Main UI
│       └── lib/
│           └── canvas-renderer.ts       # Client-side Canvas rendering
├── server/
│   └── routes.ts                        # Express routes (static serving only)
├── shared/
│   └── schema.ts                        # Shared type definitions
├── attached_assets/
│   └── avd-logo-dark.png               # AV Dimensions logo (transparent)
├── AVD_LED_Batch_Map.jsx               # AE batch mapper script
└── AVD_LED_Batch_Map_TEST.jsx          # AE single-file test script
```

## License

MIT
