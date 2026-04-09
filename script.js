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

    // Load FFmpeg dynamically
    async function loadFFmpeg() {
        if(ffmpegInst) return true;
        loadingOverlay.classList.remove('hidden');
        try {
            // Provide a graceful fallback to a promise race (timeout after 20s if CDN fails)
            const p = new Promise(async (resolve, reject) => {
                const t = setTimeout(()=>reject(new Error("FFmpeg script CDN timeout")), 20000);
                try {
                    const ffmpegMod = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/index.js');
                    const utilMod = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
                    clearTimeout(t);
                    resolve({ f: ffmpegMod.FFmpeg, util: utilMod.fetchFile });
                } catch(e) { reject(e); }
            });

            const lib = await p;
            FFmpeg = lib.f;
            fetchFile = lib.util;
            
            ffmpegInst = new FFmpeg();
            
            ffmpegInst.on('progress', ({ progress, time }) => {
                const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
                exportProgress.style.width = pct + '%';
                exportPct.textContent = pct + '%';
            });
            
            ffmpegInst.on('log', ({ message }) => {
                console.log(message);
            });

            await ffmpegInst.load({
                coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
                wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm'
            });
            
            loadingOverlay.classList.add('hidden');
            return true;
        } catch (e) {
            console.error(e);
            loadingOverlay.innerHTML = `<h2 class="text-neon-red">Error Loading Processing Core</h2><p class="mt-2 text-muted">Failed to load WebAssembly FFmpeg from CDN. Please check adblockers or network.</p><button onclick="location.reload()" class="btn btn-secondary mt-4">Retry</button>`;
            return false;
        }
    }

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
    fileInput.addEventListener('change', e => {
        if(e.target.files.length) handleFile(e.target.files[0]);
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
