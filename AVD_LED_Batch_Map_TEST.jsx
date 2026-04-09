/*
    AVD LED Tile Batch Mapper — TEST (Single File)
    -----------------------------------------------
    Processes ONLY the first video file found in the source folder.
    Use this to verify the 1792x320 scale and 0,0 alignment before
    running the full batch script.
*/

(function () {

    // ===== CONFIGURATION =====
    var srcPath = "S:\\AV Dimensions Dropbox\\AV Dimensions Shared Folder\\2026 Media\\Interlake_Modex_41165\\CLEAR LED-1764x640-04-09-26";
    var outputPath = srcPath + "\\AVD Mapped";

    var srcWidth  = 1764;
    var srcHeight = 640;
    var targetWidth  = 1792;
    var targetHeight = 320;
    var compWidth  = 3840;
    var compHeight = 2160;

    var scaleX = (targetWidth  / srcWidth)  * 100;  // ~101.59%
    var scaleY = (targetHeight / srcHeight) * 100;  // 50%

    var validExts = ["mp4", "mov", "avi", "mkv", "mxf", "m4v", "wmv", "mpg", "mpeg"];
    var h264Template = "H.264 - Match Render Settings - 15 Mbps";

    function stripExt(name) {
        var idx = name.lastIndexOf(".");
        return (idx > 0) ? name.substring(0, idx) : name;
    }

    function isVideo(file) {
        var ext = file.name.split(".").pop().toLowerCase();
        for (var i = 0; i < validExts.length; i++) {
            if (ext === validExts[i]) return true;
        }
        return false;
    }

    // ===== BEGIN =====
    app.beginUndoGroup("AVD LED Test - Single File");

    var srcFolder = new Folder(srcPath);
    if (!srcFolder.exists) {
        alert("Source folder not found:\n" + srcPath);
        return;
    }

    var outFolder = new Folder(outputPath);
    if (!outFolder.exists) outFolder.create();

    // Grab only the FIRST video file
    var allFiles = srcFolder.getFiles();
    var file = null;
    for (var f = 0; f < allFiles.length; f++) {
        if (allFiles[f] instanceof File && isVideo(allFiles[f])) {
            file = allFiles[f];
            break;
        }
    }

    if (!file) {
        alert("No video files found in:\n" + srcPath);
        return;
    }

    var baseName = stripExt(file.name);
    var mappedName = baseName + " - AVD Mapped";

    // 1. Import footage
    var importOptions = new ImportOptions(file);
    var footage = app.project.importFile(importOptions);

    var duration  = footage.duration;
    var frameRate = footage.frameRate || 29.97;

    // 2. Pre-comp at 1792x320
    var preComp = app.project.items.addComp(
        baseName + " - Scaled",
        targetWidth,
        targetHeight,
        1.0,
        duration,
        frameRate
    );

    var preLayer = preComp.layers.add(footage);
    preLayer.property("Scale").setValue([scaleX, scaleY]);
    preLayer.property("Position").setValue([targetWidth / 2, targetHeight / 2]);

    // 3. Main 3840x2160 comp
    var mainComp = app.project.items.addComp(
        mappedName,
        compWidth,
        compHeight,
        1.0,
        duration,
        frameRate
    );

    var mainLayer = mainComp.layers.add(preComp);
    mainLayer.property("Position").setValue([targetWidth / 2, targetHeight / 2]);

    // 4. Queue render
    var rqItem = app.project.renderQueue.items.add(mainComp);

    try {
        rqItem.outputModule(1).applyTemplate(h264Template);
    } catch (e) {
        try {
            rqItem.outputModule(1).applyTemplate("H.264 - Match Render Settings - 5 Mbps");
        } catch (e2) { /* use default */ }
    }

    rqItem.outputModule(1).file = new File(outFolder.fsName + "\\" + mappedName + ".mp4");

    app.endUndoGroup();

    // Open the main comp for visual reference
    mainComp.openInViewer();

    // ===== PIXEL-LEVEL VALIDATION =====
    var tolerance = 0.5; // allow half-pixel rounding
    var errors = [];
    var details = [];

    // --- Validate pre-comp dimensions ---
    details.push("PRE-COMP (" + preComp.name + "):");
    details.push("  Dimensions: " + preComp.width + "x" + preComp.height);
    if (preComp.width !== targetWidth) {
        errors.push("Pre-comp width is " + preComp.width + ", expected " + targetWidth);
    }
    if (preComp.height !== targetHeight) {
        errors.push("Pre-comp height is " + preComp.height + ", expected " + targetHeight);
    }

    // --- Validate scale values inside pre-comp ---
    var actualScale = preLayer.property("Scale").value;
    details.push("  Layer Scale: [" + actualScale[0].toFixed(4) + "%, " + actualScale[1].toFixed(4) + "%]");
    details.push("  Expected:    [" + scaleX.toFixed(4) + "%, " + scaleY.toFixed(4) + "%]");
    if (Math.abs(actualScale[0] - scaleX) > 0.01) {
        errors.push("Pre-comp layer Scale X is " + actualScale[0].toFixed(4) + "%, expected " + scaleX.toFixed(4) + "%");
    }
    if (Math.abs(actualScale[1] - scaleY) > 0.01) {
        errors.push("Pre-comp layer Scale Y is " + actualScale[1].toFixed(4) + "%, expected " + scaleY.toFixed(4) + "%");
    }

    // --- Validate scaled pixel dimensions ---
    var scaledW = srcWidth  * (actualScale[0] / 100);
    var scaledH = srcHeight * (actualScale[1] / 100);
    details.push("  Scaled size: " + scaledW.toFixed(1) + "x" + scaledH.toFixed(1));
    if (Math.abs(scaledW - targetWidth) > tolerance) {
        errors.push("Scaled width is " + scaledW.toFixed(1) + "px, expected " + targetWidth);
    }
    if (Math.abs(scaledH - targetHeight) > tolerance) {
        errors.push("Scaled height is " + scaledH.toFixed(1) + "px, expected " + targetHeight);
    }

    // --- Validate main comp dimensions ---
    details.push("");
    details.push("MAIN COMP (" + mainComp.name + "):");
    details.push("  Dimensions: " + mainComp.width + "x" + mainComp.height);
    if (mainComp.width !== compWidth) {
        errors.push("Main comp width is " + mainComp.width + ", expected " + compWidth);
    }
    if (mainComp.height !== compHeight) {
        errors.push("Main comp height is " + mainComp.height + ", expected " + compHeight);
    }

    // --- Validate layer position in main comp (top-left at 0,0) ---
    var pos = mainLayer.property("Position").value;
    var anchor = mainLayer.property("Anchor Point").value;
    // Top-left corner = position - anchor (for an unscaled layer in the main comp)
    var topLeftX = pos[0] - anchor[0];
    var topLeftY = pos[1] - anchor[1];
    details.push("  Layer Position: [" + pos[0].toFixed(2) + ", " + pos[1].toFixed(2) + "]");
    details.push("  Layer Anchor:   [" + anchor[0].toFixed(2) + ", " + anchor[1].toFixed(2) + "]");
    details.push("  Top-Left Pixel: [" + topLeftX.toFixed(2) + ", " + topLeftY.toFixed(2) + "]");
    if (Math.abs(topLeftX) > tolerance) {
        errors.push("Top-left X is " + topLeftX.toFixed(2) + "px, expected 0");
    }
    if (Math.abs(topLeftY) > tolerance) {
        errors.push("Top-left Y is " + topLeftY.toFixed(2) + "px, expected 0");
    }

    // --- Validate layer bounds (bottom-right edge) ---
    var bottomRightX = topLeftX + preComp.width;
    var bottomRightY = topLeftY + preComp.height;
    details.push("  Bottom-Right:   [" + bottomRightX.toFixed(2) + ", " + bottomRightY.toFixed(2) + "]");
    details.push("  Expected:       [" + targetWidth + ", " + targetHeight + "]");
    if (Math.abs(bottomRightX - targetWidth) > tolerance) {
        errors.push("Bottom-right X is " + bottomRightX.toFixed(2) + "px, expected " + targetWidth);
    }
    if (Math.abs(bottomRightY - targetHeight) > tolerance) {
        errors.push("Bottom-right Y is " + bottomRightY.toFixed(2) + "px, expected " + targetHeight);
    }

    // ===== RESULTS =====
    var divider = "============================================";
    var report = divider + "\n";
    report += "  AVD LED TILE MAPPING — VALIDATION REPORT\n";
    report += divider + "\n\n";
    report += "Source File: " + file.name + "\n";
    report += "Source Res:  " + srcWidth + "x" + srcHeight + "\n\n";
    report += details.join("\n") + "\n\n";
    report += divider + "\n";

    if (errors.length === 0) {
        report += "  RESULT:  \u2705 ALL CHECKS PASSED\n";
        report += divider + "\n\n";
        report += "The 1792x320 scale and 0,0 alignment are pixel-accurate.\n";
        report += "You are clear to run the full batch script.";
    } else {
        report += "  RESULT:  \u274C FAILED — " + errors.length + " issue(s)\n";
        report += divider + "\n\n";
        for (var e = 0; e < errors.length; e++) {
            report += "  \u2022 " + errors[e] + "\n";
        }
        report += "\nDo NOT run the batch script until these are resolved.";
    }

    alert(report);

})();
