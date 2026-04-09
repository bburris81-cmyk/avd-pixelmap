/*
    AVD LED Tile Batch Mapper
    -------------------------
    - Imports all video files from the source folder
    - Pre-comps each at 1792x320 (scales 1764x640 source: 
        width  101.59% to fill 1792, height 50% to compress 640→320)
    - Places pre-comp into a 3840x2160 comp at anchor 0,0 (top-left)
    - Queues each for H.264 MP4 render as "OriginalName - AVD Mapped.mp4"
    
    Source: S:\AV Dimensions Dropbox\AV Dimensions Shared Folder\2026 Media\Interlake_Modex_41165\CLEAR LED-1764x640-04-09-26
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

    // Scale factors (percentage)
    var scaleX = (targetWidth  / srcWidth)  * 100;  // ~101.59%
    var scaleY = (targetHeight / srcHeight) * 100;  // 50%

    // Video extensions to import
    var validExts = ["mp4", "mov", "avi", "mkv", "mxf", "m4v", "wmv", "mpg", "mpeg"];

    // H.264 output template name — AE ships with these by default (AE 2023+)
    // Adjust if your installation uses a different template name
    var h264Template = "H.264 - Match Render Settings - 15 Mbps";

    // ===== HELPER: strip file extension =====
    function stripExt(name) {
        var idx = name.lastIndexOf(".");
        return (idx > 0) ? name.substring(0, idx) : name;
    }

    // ===== HELPER: check valid video extension =====
    function isVideo(file) {
        var ext = file.name.split(".").pop().toLowerCase();
        for (var i = 0; i < validExts.length; i++) {
            if (ext === validExts[i]) return true;
        }
        return false;
    }

    // ===== BEGIN =====
    app.beginUndoGroup("AVD LED Batch Map");

    var srcFolder = new Folder(srcPath);
    if (!srcFolder.exists) {
        alert("Source folder not found:\n" + srcPath);
        return;
    }

    var outFolder = new Folder(outputPath);
    if (!outFolder.exists) {
        outFolder.create();
    }

    // Gather video files
    var allFiles = srcFolder.getFiles();
    var videoFiles = [];
    for (var f = 0; f < allFiles.length; f++) {
        if (allFiles[f] instanceof File && isVideo(allFiles[f])) {
            videoFiles.push(allFiles[f]);
        }
    }

    if (videoFiles.length === 0) {
        alert("No video files found in:\n" + srcPath);
        return;
    }

    // Create a project folder bin for organization
    var binFolder = null;
    try {
        binFolder = app.project.items.addFolder("AVD LED Mapped");
    } catch (e) {
        // Folder might already exist; continue without bin
    }

    var processedCount = 0;
    var skippedCount = 0;

    for (var v = 0; v < videoFiles.length; v++) {
        var file = videoFiles[v];
        var baseName = stripExt(file.name);
        var mappedName = baseName + " - AVD Mapped";

        // Skip if output file already exists (resume after crash)
        var existingOut = new File(outFolder.fsName + "\\" + mappedName + ".mp4");
        if (existingOut.exists) {
            skippedCount++;
            continue;
        }

        try {
            // 1. Import footage
            var importOptions = new ImportOptions(file);
            var footage = app.project.importFile(importOptions);
            if (binFolder) footage.parentFolder = binFolder;

            // Get source duration and frame rate
            var duration  = footage.duration;
            var frameRate = footage.frameRate || 29.97;

            // 2. Create pre-comp at target resolution (1792x320)
            var preComp = app.project.items.addComp(
                baseName + " - Scaled",
                targetWidth,
                targetHeight,
                1.0,           // pixel aspect ratio
                duration,
                frameRate
            );
            if (binFolder) preComp.parentFolder = binFolder;

            // Add footage to pre-comp
            var preLayer = preComp.layers.add(footage);

            // Scale to fill 1792x320 (stretch width slightly, compress height 50%)
            preLayer.property("Scale").setValue([scaleX, scaleY]);

            // Anchor at top-left: position the layer so its top-left corner is at 0,0
            // AE positions layers by their anchor point (center of layer by default)
            // Layer anchor = [srcWidth/2, srcHeight/2], after scale the visual size = [targetWidth, targetHeight]
            // Position needs to place the visual top-left at comp 0,0
            // Position = [targetWidth/2, targetHeight/2] puts scaled layer centered-at-top-left
            preLayer.property("Position").setValue([targetWidth / 2, targetHeight / 2]);

            // 3. Create main 3840x2160 comp
            var mainComp = app.project.items.addComp(
                mappedName,
                compWidth,
                compHeight,
                1.0,
                duration,
                frameRate
            );
            if (binFolder) mainComp.parentFolder = binFolder;

            // Add pre-comp to main comp
            var mainLayer = mainComp.layers.add(preComp);

            // Position pre-comp so its top-left corner sits at 0,0 of the 3840x2160 canvas
            // Pre-comp is 1792x320, anchor default = center = [896, 160]
            // Position [896, 160] places top-left at 0,0
            mainLayer.property("Position").setValue([targetWidth / 2, targetHeight / 2]);

            // 4. Add to render queue
            var rqItem = app.project.renderQueue.items.add(mainComp);

            // Apply H.264 output module template
            try {
                rqItem.outputModule(1).applyTemplate(h264Template);
            } catch (e2) {
                // If template not found, try alternate names
                try {
                    rqItem.outputModule(1).applyTemplate("H.264 - Match Render Settings - 5 Mbps");
                } catch (e3) {
                    // Fall back to whatever default is set; user may need to adjust
                    // Alert at the end
                }
            }

            // Set output file path
            var outFile = new File(outFolder.fsName + "\\" + mappedName + ".mp4");
            rqItem.outputModule(1).file = outFile;

            processedCount++;

        } catch (err) {
            // Log error but continue with remaining files
            $.writeln("Error processing " + file.name + ": " + err.toString());
        }
    }

    app.endUndoGroup();

    alert("AVD LED Batch Map Complete!\n\n" +
          processedCount + " new file(s) queued for render.\n" +
          skippedCount + " file(s) skipped (already rendered).\n" +
          (processedCount + skippedCount) + " of " + videoFiles.length + " total.\n\n" +
          "Output folder:\n" + outFolder.fsName + "\n\n" +
          "Review the Render Queue, then click 'Render' to begin.");

})();
