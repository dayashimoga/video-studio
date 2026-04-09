/* Video Studio script */
'use strict';


import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/index.js';
import { fetchFile } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

const $ = s => document.querySelector(s);
let ffmpeg = null;

    let originalFile = null;
    let videoDuration = 0;
    
    // Trimming State
    let trimStart = 0; // seconds
    let trimEnd = 0; // seconds
    
    // Timeline dragging state
    let isDragging = null; // 'left', 'right', 'center', null
    let dragStartX = 0;
    let initialTrimStart = 0;
    let initialTrimEnd = 0;

    // --- DOM Elements ---
    const dropZone = $('#dropZone');
    const fileInput = $('#fileInput');
    const video = $('#videoPreview');
    const toolsPanel = $('#toolsPanel');
    const playerWrap = $('#playerWrap');

    const timelineTrack = $('#timelineTrack');
    const trimSelection = $('#trimSelection');
    const trimHandleL = $('#trimHandleL');
    const trimHandleR = $('#trimHandleR');
    const playhead = $('#playhead');
    
    // Format helpers
    function fmtFrame(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        const ms = Math.floor((sec % 1) * 100).toString().padStart(2, '0');
        return `${m}:${s}.${ms}`;
    }

    // --- FFmpeg Initialization ---
    async function loadFFmpeg() {
        if (ffmpeg) return true;
        try {
            ffmpeg = new FFmpeg();
            
            ffmpeg.on('progress', ({ progress, time }) => {
                const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
                $('#exportProgress').style.width = `${pct}%`;
                $('#exportStatus').textContent = `Processing: ${pct}%`;
            });

            await ffmpeg.load({
                coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
                wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm'
            });

            $('#loadProgress').style.width = '100%';
            setTimeout(() => {
                $('#loadingOverlay').classList.add('hidden');
            }, 500);
            return true;
        } catch (e) {
            console.error(e);
            $('#loadingOverlay').innerHTML = `<h2>⚠️ Error loading engine</h2><p class="text-muted mt-2">Could not load FFmpeg. Check console for details.</p>`;
            return false;
        }
    }

    // --- File Handling ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (!file.type.startsWith('video/')) {
            alert('Please select a valid video file.');
            return;
        }
        
        // 2GB limit for WASM stability
        if (file.size > 2 * 1024 * 1024 * 1024) {
            alert('File too large. Please select a video under 2GB.');
            return;
        }

        originalFile = file;
        const url = URL.createObjectURL(file);
        video.src = url;

        // Auto load FFmpeg when file is selected
        loadFFmpeg();

        // Update UI
        dropZone.style.display = 'none';
        playerWrap.classList.remove('hidden');
        toolsPanel.style.opacity = '1';
        toolsPanel.style.pointerEvents = 'auto';

        $('#infoSize').textContent = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // --- Video Metadata ---
    video.addEventListener('loadedmetadata', () => {
        videoDuration = video.duration;
        trimStart = 0;
        trimEnd = videoDuration;
        
        $('#infoDur').textContent = fmtFrame(videoDuration);
        $('#infoRes').textContent = `${video.videoWidth} x ${video.videoHeight}`;
        
        // Reset Trim UI
        trimSelection.style.left = '0%';
        trimSelection.style.width = '100%';
        updateTimelineLabels();
    });

    video.addEventListener('timeupdate', () => {
        const pct = (video.currentTime / videoDuration) * 100;
        playhead.style.left = `${pct}%`;
        
        // Loop within trim range if playing
        if (!video.paused) {
            if (video.currentTime > trimEnd) {
                video.currentTime = trimStart;
            }
            if (video.currentTime < trimStart) {
                video.currentTime = trimStart;
            }
        }
    });

    // --- Timeline Interactions ---
    function updateTrimUI() {
        const startPct = (trimStart / videoDuration) * 100;
        const widthPct = ((trimEnd - trimStart) / videoDuration) * 100;
        
        trimSelection.style.left = `${startPct}%`;
        trimSelection.style.width = `${widthPct}%`;
        updateTimelineLabels();
    }

    function updateTimelineLabels() {
        $('#timeStart').textContent = fmtFrame(trimStart);
        $('#timeEnd').textContent = fmtFrame(trimEnd);
        $('#timeDuration').textContent = fmtFrame(trimEnd - trimStart);
    }

    // Drag handlers
    function getMouseXRelative(e) {
        const rect = timelineTrack.getBoundingClientRect();
        let x = e.clientX - rect.left;
        return Math.max(0, Math.min(x, rect.width)) / rect.width; // 0 to 1
    }

    trimHandleL.addEventListener('mousedown', e => {
        e.stopPropagation();
        isDragging = 'left';
        video.pause();
    });

    trimHandleR.addEventListener('mousedown', e => {
        e.stopPropagation();
        isDragging = 'right';
        video.pause();
    });

    trimSelection.addEventListener('mousedown', e => {
        // Prevent if we clicked a handle
        if (e.target.classList.contains('trim-handle')) return;
        isDragging = 'center';
        dragStartX = getMouseXRelative(e);
        initialTrimStart = trimStart;
        initialTrimEnd = trimEnd;
        video.pause();
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        
        const mouseX = getMouseXRelative(e);
        const time = mouseX * videoDuration;

        if (isDragging === 'left') {
            trimStart = Math.min(time, trimEnd - 0.5); // min 0.5s duration
            video.currentTime = trimStart;
        } else if (isDragging === 'right') {
            trimEnd = Math.max(time, trimStart + 0.5);
            video.currentTime = trimEnd;
        } else if (isDragging === 'center') {
            const shift = (mouseX - dragStartX) * videoDuration;
            const duration = initialTrimEnd - initialTrimStart;
            
            let newStart = initialTrimStart + shift;
            let newEnd = initialTrimEnd + shift;
            
            // Bounds check
            if (newStart < 0) {
                newStart = 0;
                newEnd = duration;
            } else if (newEnd > videoDuration) {
                newEnd = videoDuration;
                newStart = videoDuration - duration;
            }
            
            trimStart = newStart;
            trimEnd = newEnd;
            video.currentTime = trimStart;
        }
        
        updateTrimUI();
    });

    window.addEventListener('mouseup', () => {
        isDragging = null;
    });

    // Click track to jump
    timelineTrack.addEventListener('click', e => {
        if (e.target.closest('.trim-selection')) return; // handled by drag
        const pct = getMouseXRelative(e);
        video.currentTime = pct * videoDuration;
    });

    // Tools logic
    $('#outSpeed').addEventListener('input', e => {
        $('#speedDisplay').textContent = Number(e.target.value).toFixed(2) + 'x';
    });

    // --- Export Logic ---
    async function executeFFmpeg(args, outputName) {
        if(!ffmpeg) { alert("FFmpeg is still loading..."); return; }
        
        $('#exportPanel').classList.remove('hidden');
        $('#startExportBtn').disabled = true;
        $('#startExportBtn').textContent = 'Processing...';
        $('#exportActions').style.display = 'none';
        $('#exportError').classList.add('hidden');
        $('#exportProgress').classList.add('active');
        $('#exportProgress').style.width = '0%';
        $('#exportStatus').textContent = 'Writing input file...';

        try {
            const inputName = `input_${Date.now()}` + originalFile.name.substring(originalFile.name.lastIndexOf('.'));
            
            // Write file
            await ffmpeg.writeFile(inputName, await fetchFile(originalFile));
            
            $('#exportStatus').textContent = 'Executing task...';

            // Replace placeholder in args
            const finalArgs = [];
            for (let i=0; i<args.length; i++) {
                if (args[i] === '_INPUT_') finalArgs.push(inputName);
                else finalArgs.push(args[i]);
            }
            finalArgs.push(outputName);

            console.log("running:", finalArgs.join(" "));
            
            await ffmpeg.exec(finalArgs);

            // Read output
            $('#exportStatus').textContent = 'Reading output...';
            const data = await ffmpeg.readFile(outputName);

            // Cleanup MEMFS
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

            // Create download
            const ext = outputName.split('.').pop();
            const blobType = ext === 'mp3' ? 'audio/mpeg' : (ext === 'gif' ? 'image/gif' : 'video/' + ext);
            
            const url = URL.createObjectURL(new Blob([data.buffer], { type: blobType }));
            const a = $('#downloadLink');
            a.href = url;
            a.download = `quickutils_${Math.floor(Date.now()/1000)}.${ext}`;
            
            $('#exportStatus').textContent = 'Complete! 🎉';
            $('#exportActions').style.display = 'block';
            $('#exportProgress').classList.remove('active');
            $('#exportProgress').style.width = '100%';

        } catch (err) {
            console.error(err);
            $('#exportStatus').textContent = 'Error occurred';
            $('#exportProgress').classList.remove('active');
            $('#exportError').textContent = err.message || "Failed to process video.";
            $('#exportError').classList.remove('hidden');
        } finally {
            $('#startExportBtn').disabled = false;
            $('#startExportBtn').textContent = '🚀 Export Video';
        }
    }

    $('#startExportBtn').addEventListener('click', async () => {
        const outFormat = $('#outFormat').value; // mp4, webm, mkv, gif
        const res = $('#outRes').value; // 'original' or 'w:-2'
        const rot = $('#outRot').value; // '0', '90', '180', '270'
        const speed = parseFloat($('#outSpeed').value);
        const crf = $('#outCrf').value;
        const mute = $('#muteAudio').checked;
        
        let args = [
            '-i', '_INPUT_',
        ];

        // Trim
        if (trimStart > 0.1 || trimEnd < videoDuration - 0.1) {
             // We put -ss before -i for fast seek, but after for accuracy. 
             // Doing it after -i here for simplicity/accuracy as clips are <2GB
             args.push('-ss', String(trimStart));
             args.push('-t', String(trimEnd - trimStart));
        }

        // Setup filter graph
        let vfilters = [];
        let afilters = [];

        // Resolution
        if (res !== 'original') {
            vfilters.push(`scale=${res}`);
        }

        // Rotation
        if (rot === '90') vfilters.push('transpose=1');
        else if (rot === '180') vfilters.push('transpose=1,transpose=1'); /* flip */
        else if (rot === '270') vfilters.push('transpose=2');

        // Speed
        if (speed !== 1.0) {
            vfilters.push(`setpts=${1/speed}*PTS`);
            afilters.push(`atempo=${speed}`);
        }

        if (vfilters.length > 0) {
            args.push('-vf', vfilters.join(','));
        }

        if (mute) {
            args.push('-an');
        } else if (afilters.length > 0) {
             // atempo only works inside 0.5 and 2.0 limits per filter, we might need chaining for extreme speeds, simplified here.
             if (speed < 0.5 || speed > 2.0) {
                 // simplify: mute extreme speeds if filter chain gets complex, or ignore audio
                 args.push('-an'); 
                 console.warn("Muted audio due to extreme speed limits in basic FFmpeg.");
             } else {
                 args.push('-af', afilters.join(','));
             }
        }

        if (outFormat === 'gif') {
            // Special params for decent GIF
            args.push('-loop', '0');
        } else {
            // Quality
            args.push('-crf', crf);
            // Default fast web settings for mp4
            if (outFormat === 'mp4') {
               args.push('-preset', 'fast');
               args.push('-c:v', 'libx264');
               args.push('-c:a', 'aac');
            }
        }

        await executeFFmpeg(args, `output.${outFormat}`);
    });

    $('#extractAudioBtn').addEventListener('click', async () => {
        let args = ['-i', '_INPUT_'];
        
        if (trimStart > 0.1 || trimEnd < videoDuration - 0.1) {
             args.push('-ss', String(trimStart));
             args.push('-t', String(trimEnd - trimStart));
        }
        
        args.push('-q:a', '0', '-map', 'a');
        await executeFFmpeg(args, 'audio.mp3');
    });

    $('#newEditBtn').addEventListener('click', () => {
        $('#exportPanel').classList.add('hidden');
    });

    // --- Init ---
    if(typeof QU !== 'undefined') QU.init({ kofi: true, discover: true });
