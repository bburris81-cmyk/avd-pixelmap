import type { PixelMapInput } from "../shared/schema";

export function generatePixelMapJsx(input: PixelMapInput): string {
  const { mediaWidth, mediaHeight, canvasWidth, canvasHeight, outputFolder, projectName } = input;
  const name = projectName ? projectName.replace(/[^a-zA-Z0-9 _-]/g, "") : `AVD Pixel Map - ${mediaWidth}x${mediaHeight}`;

  return `/*
    AVD Pixel Map Generator — Auto-Generated
    ----------------------------------------
    Canvas:         ${canvasWidth} x ${canvasHeight} px
    Viewable Area:  ${mediaWidth} x ${mediaHeight} px (top-left, 0,0)
    Generated:      ${new Date().toLocaleString()}
*/
(function () {
    var canvasW   = ${canvasWidth};
    var canvasH   = ${canvasHeight};
    var mediaW    = ${mediaWidth};
    var mediaH    = ${mediaHeight};
    var outputFolder = "${outputFolder.replace(/\\/g, "\\\\")}";
    var docName   = "${name}";

    // Force pixel ruler units
    var origRuler = app.preferences.rulerUnits;
    var origType  = app.preferences.typeUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    app.preferences.typeUnits  = TypeUnits.POINTS;

    // ---- Create document ----
    var blk = new SolidColor();
    blk.rgb.red = 0; blk.rgb.green = 0; blk.rgb.blue = 0;
    app.foregroundColor = blk;

    var doc = app.documents.add(
        new UnitValue(canvasW, "px"),
        new UnitValue(canvasH, "px"),
        72, docName, NewDocumentMode.RGB
    );
    doc.selection.selectAll();
    doc.selection.fill(app.foregroundColor);
    doc.selection.deselect();

    // ---- Helper: solid color ----
    function rgb(r,g,b){ var c=new SolidColor(); c.rgb.red=r; c.rgb.green=g; c.rgb.blue=b; return c; }

    // ---- Helper: add text with optional drop shadow ----
    function addText(str, x, y, sizePt, color, layerName, shadow) {
        var layer = doc.artLayers.add();
        layer.kind = LayerKind.TEXT;
        layer.name = layerName || str;
        var t = layer.textItem;
        t.contents = str;
        t.font = "Verdana-Bold";
        t.size = new UnitValue(sizePt, "pt");
        t.color = color;
        t.position = [new UnitValue(x, "px"), new UnitValue(y, "px")];
        if (shadow) {
            var desc = new ActionDescriptor();
            var ref  = new ActionReference();
            ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            desc.putReference(charIDToTypeID("null"), ref);
            var fxList = new ActionDescriptor();
            var shadow  = new ActionDescriptor();
            shadow.putEnumerated(stringIDToTypeID("mode"), charIDToTypeID("BlnM"), charIDToTypeID("Mltp"));
            var shadowColor = new ActionDescriptor();
            shadowColor.putDouble(charIDToTypeID("Rd  "), 0);
            shadowColor.putDouble(charIDToTypeID("Grn "), 0);
            shadowColor.putDouble(charIDToTypeID("Bl  "), 0);
            shadow.putObject(charIDToTypeID("Clr "), charIDToTypeID("RGBC"), shadowColor);
            shadow.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), 75);
            shadow.putBoolean(charIDToTypeID("uglg"), true);
            shadow.putUnitDouble(charIDToTypeID("lagl"), charIDToTypeID("#Ang"), 120);
            shadow.putUnitDouble(charIDToTypeID("Dstn"), charIDToTypeID("#Pxl"), 8);
            shadow.putUnitDouble(charIDToTypeID("Ckmt"), charIDToTypeID("#Pxl"), 0);
            shadow.putUnitDouble(charIDToTypeID("blur"), charIDToTypeID("#Pxl"), 10);
            shadow.putBoolean(charIDToTypeID("enab"), true);
            fxList.putObject(charIDToTypeID("DrSh"), charIDToTypeID("DrSh"), shadow);
            desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lyr "), fxList);
            executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
        }
        return layer;
    }

    // ---- Background layer ----
    doc.activeLayer.name = "Background";

    // ---- Viewable Media Area ----
    doc.artLayers.add();
    doc.activeLayer.name = "Viewable Media Area";
    app.foregroundColor = rgb(70, 70, 70);
    doc.selection.select([[0,0],[mediaW,0],[mediaW,mediaH],[0,mediaH]]);
    doc.selection.fill(app.foregroundColor);
    doc.selection.deselect();

    var red = rgb(220, 0, 0);

    // ---- "Viewable Media" center label (with drop shadow — on gray bg) ----
    var vmFontSize = Math.round(Math.min(mediaW, mediaH) * 0.055);
    if (vmFontSize < 24) vmFontSize = 24;
    if (vmFontSize > 72) vmFontSize = 72;
    var vmCharW = vmFontSize * 0.55;
    addText("Viewable Media", mediaW/2 - (14 * vmCharW / 2), mediaH/2 + vmFontSize * 0.4, vmFontSize, red, "Label - Viewable Media", true);

    // ---- "No Media / Leave Black" (dynamically positioned) ----
    // When both black regions exist, instructions take the larger one,
    // so "No Media" goes in the smaller one. When only one exists, it goes there.
    var nmRightW   = canvasW - mediaW;
    var nmBottomH  = canvasH - mediaH;
    var nmRightA   = nmRightW * canvasH;
    var nmBottomA  = canvasW * nmBottomH;
    var nmFontSize = 72;

    if (nmRightW > 0 && nmBottomH > 0) {
        // Both regions exist: instructions go in bigger, "No Media" in smaller
        if (nmBottomA >= nmRightA && nmRightW > 200) {
            // Instructions are in bottom (bigger) → "No Media" in right (smaller)
            var nmX = mediaW + nmRightW/2;
            var nmCharW = nmFontSize * 0.55;
            addText("No Media",    nmX - (9 * nmCharW / 2), canvasH/2 - nmFontSize * 0.5, nmFontSize, red, "Label - No Media 1", false);
            addText("Leave Black", nmX - (11 * nmCharW / 2), canvasH/2 + nmFontSize * 0.9, nmFontSize, red, "Label - No Media 2", false);
        } else if (nmRightA > nmBottomA && nmBottomH > 150) {
            // Instructions are in right (bigger) → "No Media" in bottom (smaller)
            var nmX2 = canvasW/2;
            var nm2CharW = nmFontSize * 0.55;
            addText("No Media — Leave Black", nmX2 - (23 * nm2CharW / 2), mediaH + nmBottomH/2, nmFontSize, red, "Label - No Media", false);
        }
    } else if (nmRightW > 200 && nmBottomH <= 0) {
        // Only right region
        var nmX3 = mediaW + nmRightW/2;
        var nm3CharW = nmFontSize * 0.55;
        addText("No Media",    nmX3 - (9 * nm3CharW / 2), canvasH/2 - nmFontSize * 0.5, nmFontSize, red, "Label - No Media 1", false);
        addText("Leave Black", nmX3 - (11 * nm3CharW / 2), canvasH/2 + nmFontSize * 0.9, nmFontSize, red, "Label - No Media 2", false);
    } else if (nmBottomH > 200 && nmRightW <= 0) {
        // Only bottom region
        var nmX4 = canvasW/2;
        var nm4CharW = nmFontSize * 0.55;
        addText("No Media — Leave Black", nmX4 - (23 * nm4CharW / 2), mediaH + nmBottomH/2, nmFontSize, red, "Label - No Media", false);
    }

    // ---- Dimension callouts (adaptive font size) ----
    var dimFontSize = Math.round(Math.min(canvasW, canvasH) * 0.02);
    if (dimFontSize < 20) dimFontSize = 20;
    if (dimFontSize > 72) dimFontSize = 72;
    var dimCharW = dimFontSize * 0.55;
    var mwStr = "${mediaWidth}";
    var mhStr = "${mediaHeight}";
    var cwStr = "${canvasWidth}";
    var chStr = "${canvasHeight}";

    // Media width — top center of media area
    addText(mwStr, mediaW/2 - (mwStr.length * dimCharW / 2), dimFontSize + 10, dimFontSize, red, "Dim - Media Width", true);

    // Media height — left of media area (vertical rotated text)
    var hLabel = addText(mhStr, dimFontSize + 10, mediaH/2 + (mhStr.length * dimCharW / 2), dimFontSize, red, "Dim - Media Height", true);
    hLabel.rotate(-90, AnchorPosition.MIDDLECENTER);

    // Canvas height — right edge (vertical rotated text)
    var chLabel = addText(chStr, canvasW - dimFontSize - 10, canvasH/2 + (chStr.length * dimCharW / 2), dimFontSize, red, "Dim - Canvas Height", false);
    chLabel.rotate(-90, AnchorPosition.MIDDLECENTER);

    // Canvas width — bottom center
    addText(cwStr, canvasW/2 - (cwStr.length * dimCharW / 2), canvasH - dimFontSize - 30, dimFontSize, red, "Dim - Canvas Width", false);

    // ---- Instruction block (dynamically positioned in largest black region) ----
    var instrRightW  = canvasW - mediaW;
    var instrBottomH = canvasH - mediaH;
    var instrRightArea  = instrRightW * canvasH;
    var instrBottomArea = canvasW * instrBottomH;

    // Adaptive font size: scale based on available space
    var instrFontBase = Math.round(Math.min(canvasW, canvasH) * 0.023);
    if (instrFontBase < 24) instrFontBase = 24;
    if (instrFontBase > 72) instrFontBase = 72;

    if (instrBottomArea >= instrRightArea && instrBottomH > 200) {
        // Place instructions centered in the bottom black region
        var instrCX = canvasW / 2;
        var instrCY = mediaH + instrBottomH / 2;
        // Approximate text widths for centering (Verdana Bold ~0.6 * sizePt * charCount)
        var line1 = "Create Viewable Media at ${mediaWidth} x ${mediaHeight}";
        var line2 = "Place within ${canvasWidth} x ${canvasHeight} project";
        var line3 = "Render as MP4 @20-25mbps";
        var charW = instrFontBase * 0.55;
        addText(line1, instrCX - (line1.length * charW / 2), instrCY - instrFontBase * 1.5, instrFontBase, red, "Instr 1", false);
        addText(line2, instrCX - (line2.length * charW / 2), instrCY - instrFontBase * 0.1, instrFontBase, red, "Instr 2", false);
        addText(line3, instrCX - (line3.length * charW / 2), instrCY + instrFontBase * 1.8, instrFontBase, red, "Instr 3", false);
    } else if (instrRightW > 300) {
        // Place instructions centered in the right black region
        var instrRCX = mediaW + instrRightW / 2;
        var instrRCY = canvasH / 2;
        var rLine1 = "Create Viewable Media";
        var rLine2 = "at ${mediaWidth} x ${mediaHeight}";
        var rLine3 = "Place within";
        var rLine4 = "${canvasWidth} x ${canvasHeight} project";
        var rLine5 = "Render as MP4";
        var rLine6 = "@20-25mbps";
        var rCharW = instrFontBase * 0.48;
        var rLineH = instrFontBase * 1.3;
        var rStartY = instrRCY - rLineH * 3;
        addText(rLine1, instrRCX - (rLine1.length * rCharW / 2), rStartY,              instrFontBase, red, "Instr 1", false);
        addText(rLine2, instrRCX - (rLine2.length * rCharW / 2), rStartY + rLineH,     instrFontBase, red, "Instr 2", false);
        addText(rLine3, instrRCX - (rLine3.length * rCharW / 2), rStartY + rLineH * 2.5, instrFontBase, red, "Instr 3", false);
        addText(rLine4, instrRCX - (rLine4.length * rCharW / 2), rStartY + rLineH * 3.5, instrFontBase, red, "Instr 4", false);
        addText(rLine5, instrRCX - (rLine5.length * rCharW / 2), rStartY + rLineH * 5,   instrFontBase, red, "Instr 5", false);
        addText(rLine6, instrRCX - (rLine6.length * rCharW / 2), rStartY + rLineH * 6,   instrFontBase, red, "Instr 6", false);
    }

    // ---- Save PSD ----
    var outFolder = new Folder(outputFolder);
    if (!outFolder.exists) outFolder.create();

    var psdFile = new File(outputFolder + "\\\\" + docName + ".psd");
    var psdOpts = new PhotoshopSaveOptions();
    psdOpts.layers = true;
    psdOpts.embedColorProfile = true;
    doc.saveAs(psdFile, psdOpts, false, Extension.LOWERCASE);

    // ---- Save JPG ----
    doc.flatten();
    var jpgFile = new File(outputFolder + "\\\\" + docName + ".jpg");
    var jpgOpts = new JPEGSaveOptions();
    jpgOpts.quality = 10;
    doc.saveAs(jpgFile, jpgOpts, true, Extension.LOWERCASE);

    // ---- Restore units ----
    app.preferences.rulerUnits = origRuler;
    app.preferences.typeUnits  = origType;

    alert("AVD Pixel Map saved!\\n\\nPSD + JPG saved to:\\n" + outputFolder + "\\\\\\n\\n" + docName);
})();
`;
}

export function generateTestPatternJsx(input: PixelMapInput): string {
  const { mediaWidth, mediaHeight, canvasWidth, canvasHeight, outputFolder, projectName } = input;
  const name = projectName
    ? `${projectName.replace(/[^a-zA-Z0-9 _-]/g, "")} - Test Pattern`
    : `AVD Test Pattern - ${mediaWidth}x${mediaHeight}`;

  return `/*
    AVD Test Pattern Generator — Auto-Generated
    ${mediaWidth} x ${mediaHeight} viewable on ${canvasWidth} x ${canvasHeight} canvas
*/
(function () {
    var canvasW = ${canvasWidth};
    var canvasH = ${canvasHeight};
    var mediaW  = ${mediaWidth};
    var mediaH  = ${mediaHeight};
    var docName = "${name}";
    var outputFolder = "${outputFolder.replace(/\\/g, "\\\\")}";

    var origRuler = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;

    function rgb(r,g,b){ var c=new SolidColor(); c.rgb.red=r; c.rgb.green=g; c.rgb.blue=b; return c; }

    // Black foreground
    var blk = new SolidColor(); blk.rgb.red=0; blk.rgb.green=0; blk.rgb.blue=0;
    app.foregroundColor = blk;

    var doc = app.documents.add(
        new UnitValue(canvasW,"px"), new UnitValue(canvasH,"px"),
        72, docName, NewDocumentMode.RGB
    );
    doc.selection.selectAll();
    doc.selection.fill(app.foregroundColor);
    doc.selection.deselect();
    doc.activeLayer.name = "Background - Black";

    var sqSize = Math.round(Math.min(mediaW, mediaH) / 16);

    // ---- Checkerboard ----
    doc.artLayers.add();
    doc.activeLayer.name = "Checkerboard";
    var cols = Math.ceil(mediaW / sqSize);
    var rows = Math.ceil(mediaH / sqSize);
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if ((r + c) % 2 === 0) {
                app.foregroundColor = rgb(255,255,255);
            } else {
                app.foregroundColor = rgb(80,80,80);
            }
            var x1 = c * sqSize;
            var y1 = r * sqSize;
            var x2 = Math.min(x1 + sqSize, mediaW);
            var y2 = Math.min(y1 + sqSize, mediaH);
            doc.selection.select([[x1,y1],[x2,y1],[x2,y2],[x1,y2]]);
            doc.selection.fill(app.foregroundColor);
        }
    }
    doc.selection.deselect();

    // ---- Center X ----
    doc.artLayers.add();
    doc.activeLayer.name = "Center X";
    var lw = Math.round(sqSize * 0.4);
    app.foregroundColor = rgb(255,0,0);
    // Diagonal 1: top-left to bottom-right
    for (var i = 0; i < lw; i++) {
        doc.selection.select([[i, 0],[lw+i,0],[mediaW,mediaH-lw+i],[mediaW-lw+i,mediaH]]);
        doc.selection.fill(app.foregroundColor);
    }
    // Diagonal 2: top-right to bottom-left
    for (var j = 0; j < lw; j++) {
        doc.selection.select([[mediaW-lw-j,0],[mediaW-j,0],[lw-j,mediaH],[0-j,mediaH]]);
        doc.selection.fill(app.foregroundColor);
    }
    doc.selection.deselect();

    // ---- Center Circle ----
    doc.artLayers.add();
    doc.activeLayer.name = "Center Circle";
    var cx = Math.round(mediaW/2);
    var cy = Math.round(mediaH/2);
    var radius = Math.round(Math.min(mediaW,mediaH) * 0.35);
    app.foregroundColor = rgb(0, 200, 255);
    // Use ellipse selection
    doc.selection.select([[cx-radius,cy-radius],[cx+radius,cy-radius],[cx+radius,cy+radius],[cx-radius,cy+radius]]);
    // Shrink by stroke width for ring effect
    var strokeW = Math.round(sqSize * 0.5);
    doc.selection.fill(app.foregroundColor);
    var innerR = radius - strokeW;
    app.foregroundColor = blk;
    doc.selection.select([[cx-innerR,cy-innerR],[cx+innerR,cy-innerR],[cx+innerR,cy+innerR],[cx-innerR,cy+innerR]]);
    doc.selection.fill(app.foregroundColor);
    doc.selection.deselect();

    // ---- Crosshatch lines ----
    doc.artLayers.add();
    doc.activeLayer.name = "Crosshatch";
    app.foregroundColor = rgb(255, 255, 0);
    var hatchW = Math.round(sqSize * 0.15);
    // Horizontal center line
    doc.selection.select([[0, cy-hatchW],[mediaW, cy-hatchW],[mediaW, cy+hatchW],[0, cy+hatchW]]);
    doc.selection.fill(app.foregroundColor);
    // Vertical center line
    doc.selection.select([[cx-hatchW,0],[cx+hatchW,0],[cx+hatchW,mediaH],[cx-hatchW,mediaH]]);
    doc.selection.fill(app.foregroundColor);
    doc.selection.deselect();

    // ---- Color bars strip (bottom 10%) ----
    doc.artLayers.add();
    doc.activeLayer.name = "Color Bars";
    var barH = Math.round(mediaH * 0.1);
    var barY = mediaH - barH;
    var barColors = [
        rgb(255,255,255), rgb(255,255,0), rgb(0,255,255),
        rgb(0,255,0), rgb(255,0,255), rgb(255,0,0), rgb(0,0,255)
    ];
    var barW = Math.round(mediaW / barColors.length);
    for (var b = 0; b < barColors.length; b++) {
        app.foregroundColor = barColors[b];
        var bx1 = b * barW;
        var bx2 = (b === barColors.length - 1) ? mediaW : bx1 + barW;
        doc.selection.select([[bx1,barY],[bx2,barY],[bx2,mediaH],[bx1,mediaH]]);
        doc.selection.fill(app.foregroundColor);
    }
    doc.selection.deselect();

    // ---- AVD Logo text (white, centered, drop shadow) ----
    var logoLayer = doc.artLayers.add();
    logoLayer.kind = LayerKind.TEXT;
    logoLayer.name = "AVD Logo Text";
    var lt = logoLayer.textItem;
    lt.contents = "AV Dimensions";
    lt.font = "Verdana-Bold";
    lt.size = new UnitValue(Math.round(mediaH * 0.055), "pt");
    var wht = new SolidColor(); wht.rgb.red=255; wht.rgb.green=255; wht.rgb.blue=255;
    lt.color = wht;
    var logoX = Math.round(mediaW/2 - 300);
    var logoY = Math.round(mediaH * 0.08);
    lt.position = [new UnitValue(logoX,"px"), new UnitValue(logoY,"px")];

    // ---- Resolution label ----
    var resLayer = doc.artLayers.add();
    resLayer.kind = LayerKind.TEXT;
    resLayer.name = "Resolution Label";
    var rt = resLayer.textItem;
    rt.contents = "${mediaWidth} x ${mediaHeight}";
    rt.font = "Verdana-Bold";
    rt.size = new UnitValue(Math.round(mediaH * 0.038), "pt");
    var yel = new SolidColor(); yel.rgb.red=255; yel.rgb.green=220; yel.rgb.blue=0;
    rt.color = yel;
    rt.position = [new UnitValue(Math.round(mediaW/2 - 180),"px"), new UnitValue(Math.round(mediaH * 0.92),"px")];

    // ---- Save PSD + JPG ----
    var outFolder = new Folder(outputFolder);
    if (!outFolder.exists) outFolder.create();

    var psdFile = new File(outputFolder + "\\\\" + docName + ".psd");
    var psdOpts = new PhotoshopSaveOptions();
    psdOpts.layers = true;
    doc.saveAs(psdFile, psdOpts, false, Extension.LOWERCASE);

    doc.flatten();
    var jpgFile = new File(outputFolder + "\\\\" + docName + ".jpg");
    var jpgOpts = new JPEGSaveOptions();
    jpgOpts.quality = 10;
    doc.saveAs(jpgFile, jpgOpts, true, Extension.LOWERCASE);

    app.preferences.rulerUnits = origRuler;

    alert("Test Pattern saved!\\n\\n" + docName + "\\n\\nPSD + JPG saved to:\\n" + outputFolder);
})();
`;
}
