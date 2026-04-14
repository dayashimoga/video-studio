'use strict';
(function(){
    const $ = s => document.querySelector(s);
    
    // UI
    const dropZone = $('#dropZone');
    const fileInput = $('#fileInput');
    const editorWrap = $('#editorWrap');
    const videoPreview = $('#videoPreview');
    const loadingOverlay = $('#loadingOverlay');
    
    const resizeOpt = $('#resizeOpt');
    const trimStart = $('#trimStart');
    const trimEnd = $('#trimEnd');
    const muteVideoChk = $('#muteVideoChk');
    const formatOpt = $('#formatOpt');
    const effectOpt = $('#effectOpt');
    const extractAudioBtn = $('#extractAudioBtn');
    const exportBtn = $('#exportBtn');
    
    const progressWrap = $('#progressWrap');
    const exportStatus = $('#exportStatus');
    const exportPct = $('#exportPct');
    const exportProgress = $('#exportProgress');
    
    const resultModal = $('#resultModal');
    const downloadLink = $('#downloadLink');
    
    // Core state
    let FFmpeg = null;
    let fetchFile = null;
    let ffmpegInst = null;
    let activeFile = null;
    let activeFileName = '';
    let duration = 0;

    // Load FFmpeg dynamically via UMD script tags (avoids ESM Worker CORS errors)
    let ffmpegLoadedFlag = false;
    let ffmpegLoading = false;
    
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function loadFFmpeg() {
        if(ffmpegLoadedFlag && ffmpegInst) return true;
        if(ffmpegLoading) {
            while(ffmpegLoading) await new Promise(r => setTimeout(r, 200));
            return ffmpegLoadedFlag;
        }
        ffmpegLoading = true;
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.innerHTML = `<h2 style="color:#fff">⏳ Loading Video Engine...</h2><p class="mt-2 text-muted">This may take a few seconds on first load.</p>`;
        try {
            // Load UMD bundles via script tag — avoids ESM Worker CORS issues
            const cdnBases = [
                'https://unpkg.com',
                'https://cdn.jsdelivr.net/npm'
            ];
            let loaded = false;
            for(const cdn of cdnBases) {
                try {
                    await loadScript(`${cdn}/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js`);
                    await loadScript(`${cdn}/@ffmpeg/util@0.12.1/dist/umd/index.js`);
                    loaded = true;
                    break;
                } catch(err) { console.warn("CDN source failed:", cdn, err); }
            }
            if(!loaded) throw new Error("All CDN sources failed. Check your internet connection or adblocker.");

            FFmpeg = FFmpegWASM.FFmpeg;
            fetchFile = FFmpegUtil.fetchFile;
            
            ffmpegInst = new FFmpeg();
            ffmpegInst.on('progress', ({ progress }) => {
                const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
                exportProgress.style.width = pct + '%';
                exportPct.textContent = pct + '%';
            });
            ffmpegInst.on('log', ({ message }) => { console.log(message); });

            // Load core — use toBlobURL to bypass CORS entirely
            let coreLoaded = false;
            const hasSAB = typeof SharedArrayBuffer !== 'undefined';
            
            // Try multi-threaded first if SharedArrayBuffer is available
            if (hasSAB) {
                try {
                    await ffmpegInst.load({
                        coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.js', 'application/javascript'),
                        wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.wasm', 'application/wasm'),
                        workerURL: await toBlobURL('https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.worker.js', 'application/javascript')
                    });
                    coreLoaded = true;
                } catch(e) { console.warn("Multi-threaded FFmpeg failed, trying single-threaded:", e); }
            }
            
            // Fallback to Single-threaded
            if (!coreLoaded) {
                ffmpegInst = new FFmpeg();
                ffmpegInst.on('progress', ({ progress }) => {
                    const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
                    exportProgress.style.width = pct + '%';
                    exportPct.textContent = pct + '%';
                });
                try {
                    await ffmpegInst.load({
                        coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js', 'application/javascript'),
                        wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm', 'application/wasm')
                    });
                    coreLoaded = true;
                } catch(e) { console.warn("Single-threaded FFmpeg also failed:", e); }
            }

            if(!coreLoaded) throw new Error("FFmpeg core could not be loaded. Your browser may not support WebAssembly, or a content blocker is interfering.");
            
            loadingOverlay.classList.add('hidden');
            ffmpegLoadedFlag = true;
            ffmpegLoading = false;
            return true;
        } catch (e) {
            console.error('FFmpeg load error:', e);
            ffmpegLoading = false;
            loadingOverlay.innerHTML = `<h2 class="text-neon-red">⚠️ Video Engine Unavailable</h2><p class="mt-2 text-muted">${e.message || 'Failed to load FFmpeg.'}</p><p class="mt-2 text-muted" style="font-size:0.8rem">Try: disable adblocker, use Chrome/Edge, or check your connection.</p><button onclick="location.reload()" class="btn btn-secondary mt-4">🔄 Retry</button>`;
            return false;
        }
    }

    async function toBlobURL(url, mime) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("fetch failed");
            const buf = await res.arrayBuffer();
            const blob = new Blob([buf], { type: mime });
            return URL.createObjectURL(blob);
        } catch (e) {
            return url;
        }
    }

    // Eagerly start loading FFmpeg on page load so it's ready when user uploads
    loadFFmpeg();


    async function handleFile(file) {
        if(!file) return;
        if(!file.type.startsWith('video/')) return alert('Please drop a valid video file.');
        
        const loaded = await loadFFmpeg();
        if(!loaded) return;
        
        activeFile = file;
        activeFileName = file.name.replace(/\s+/g, '_');
        
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        
        videoPreview.onloadedmetadata = () => {
            duration = videoPreview.duration;
            trimEnd.value = duration.toFixed(1);
            trimEnd.max = duration.toFixed(1);
            trimStart.max = duration.toFixed(1);
            
            dropZone.classList.add('hidden');
            editorWrap.classList.remove('hidden');
        };
    }

    dropZone.addEventListener('click', e => {
        if(e.target !== fileInput) fileInput.click();
    });
    fileInput.addEventListener('click', e => {
        e.target.value = null; // Fixes double upload bug immediately
    });
    fileInput.addEventListener('change', e => {
        if(e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
    
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if(files.length) handleFile(files[0]);
    });

    $('#resetParamsBtn').addEventListener('click', () => {
        resizeOpt.value = 'original';
        if(duration) {
            trimStart.value = '0';
            trimEnd.value = duration.toFixed(1);
        }
        muteVideoChk.checked = false;
        formatOpt.value = 'mp4';
        if(effectOpt) effectOpt.value = 'none';
    });

    async function executeFFmpeg(args, outName) {
        progressWrap.classList.remove('hidden');
        exportBtn.disabled = true;
        extractAudioBtn.disabled = true;
        exportStatus.textContent = "Writing file to memory...";
        
        // Write file
        await ffmpegInst.writeFile(activeFileName, await fetchFile(activeFile));
        
        exportStatus.textContent = "Processing video...";
        exportProgress.style.width = '0%';
        exportPct.textContent = '0%';
        
        try {
            await ffmpegInst.exec(args);
            
            const data = await ffmpegInst.readFile(outName);
            const mime = outName.endsWith('.mp3') ? 'audio/mp3' : outName.endsWith('.webm') ? 'video/webm' : outName.endsWith('.gif') ? 'image/gif' : 'video/mp4';
            const blob = new Blob([data.buffer], { type: mime });
            const url = URL.createObjectURL(blob);
            
            downloadLink.href = url;
            downloadLink.download = outName;
            
            resultModal.classList.remove('hidden');
            
        } catch(e) {
            alert("An error occurred during rendering. See console for details.");
            console.error(e);
        } finally {
            progressWrap.classList.add('hidden');
            exportBtn.disabled = false;
            extractAudioBtn.disabled = false;
        }
    }

    extractAudioBtn.addEventListener('click', () => {
        if(!activeFile) return;
        const out = activeFileName.split('.')[0] + '_audio.mp3';
        // Basic extract without re-encoding video
        const args = ['-i', activeFileName, '-q:a', '0', '-map', 'a', out];
        executeFFmpeg(args, out);
    });

    exportBtn.addEventListener('click', () => {
        if(!activeFile) return;
        const fmt = formatOpt.value;
        const out = activeFileName.split('.')[0] + '_processed.' + fmt;
        
        const args = [];
        
        // Input
        // Calculate Trim
        const tS = parseFloat(trimStart.value) || 0;
        const tE = parseFloat(trimEnd.value) || duration;
        
        if (tS > 0) {
            args.push('-ss', tS.toString());
        }
        args.push('-i', activeFileName);
        
        if (tE < duration && tE > tS) {
            args.push('-t', (tE - tS).toString());
        }
        
        // Flags
        const filters = [];
        
        if(resizeOpt.value !== 'original') {
            filters.push(`scale=${resizeOpt.value}`);
        }
        if(effectOpt.value !== 'none') {
            filters.push(effectOpt.value);
        }
        if(fmt === 'gif') {
            filters.push('fps=10', 'scale=320:-1:flags=lanczos', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse');
        }
        
        if (filters.length > 0) {
            args.push('-vf', filters.join(','));
        }
        
        // Audio handling
        if(fmt === 'gif' || muteVideoChk.checked) {
            args.push('-an'); // remove audio
        } else if (fmt !== 'gif') {
            args.push('-c:a', 'copy'); // try direct copy 
        }
        
        args.push(out);
        executeFFmpeg(args, out);
    });

    if(typeof QU !== 'undefined') QU.init({ kofi: true, theme: true });
})();
