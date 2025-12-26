(() => {
  'use strict';

  let isGameOver = false;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const restartBtn = document.getElementById('restart');
  const enableSoundBtn = document.getElementById('enable-sound');

  const GRID = 20; // number of cells per side
  

  function getCell(){
    return Math.floor(canvas.width / GRID);
  }

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { ...dir };
  let apple = { x: 0, y: 0 };
  let score = 0;
  let running = false;

  // Audio
  let audioCtx = null;
  let bgAudio = null;
  let audioAllowed = false;
  // synth fallback for Beethoven motif
  let motifInterval = null;
  // YouTube background player (use provided link id)
  const youtubeVideoId = 'IvrzJ8uH1PI';
  let youtubePlayer = null;
  // images
  const imgSnakeHead = new Image();
  const imgMouse = new Image();
  let imgsLoaded = false;
  imgSnakeHead.src = 'assets/snake_head.svg';
  imgMouse.src = 'assets/mouse.svg';
  let imgCount = 0;
  imgSnakeHead.onload = imgMouse.onload = () => { imgCount++; if(imgCount>=2) imgsLoaded = true; };

  const TICKS_PER_SECOND = 5;
  const MS_PER_TICK = 1000 / TICKS_PER_SECOND;
  let lastTick = 0;

  function reset() {
    snake = [ { x: Math.floor(GRID/2), y: Math.floor(GRID/2) } ];
    dir = { x: 1, y: 0 };
    isGameOver = false;
    nextDir = { ...dir };
    score = 0;
    placeApple();
    running = true;
    scoreEl.textContent = score;
  }

  function placeApple(){
    while(true){
      const x = Math.floor(Math.random()*GRID);
      const y = Math.floor(Math.random()*GRID);
      if(!snake.some(s => s.x===x && s.y===y)){
        apple = { x, y };
        return;
      }
    }
  }

  function gameOver(){
    running = false;
    isGameOver = true;
    // draw final frame with overlay
    draw();
    ctx.fillStyle = 'rgba(2,6,23,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffdddd';
    ctx.font = Math.max(18, Math.floor(canvas.width * 0.04)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Край Ти Умря!', canvas.width/2, canvas.height/2 - 8);
    ctx.fillStyle = '#fff';
    ctx.font = Math.max(14, Math.floor(canvas.width * 0.03)) + 'px sans-serif';
    ctx.fillText('Резултат: ' + score + ' — натиснете Рестарт', canvas.width/2, canvas.height/2 + 26);

    // audio on death
    try{ playDeathSound(); }catch(e){}
    try{ if(bgAudio && !bgAudio.paused){ bgAudio.pause(); } }catch(e){}
  }

  function tick(){
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // wall collision
    if(head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID){
      gameOver();
      return;
    }

    // self collision
    if(snake.some(s => s.x === head.x && s.y === head.y)){
      gameOver();
      return;
    }

    snake.unshift(head);

    // eat apple
    if(head.x === apple.x && head.y === apple.y){
      score += 100; // each mouse gives 100 points
      scoreEl.textContent = score;
      placeApple();
      try{ playEatSound(); }catch(e){}
    } else {
      snake.pop();
    }
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // background grid subtle
    ctx.fillStyle = '#071427';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // apple (draw as mouse)
    drawMouse(apple.x, apple.y);

    // snake (draw rounded segments, head with eyes)
    for(let i=0;i<snake.length;i++){
      const s = snake[i];
      const isHead = i === 0;
      const color = isHead ? '#a3e635' : '#22c55e';
      drawSegment(s.x, s.y, color, isHead);
    }

    // if game over, draw overlay so it remains visible
    if(isGameOver){
      ctx.fillStyle = 'rgba(2,6,23,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffdddd';
      ctx.font = Math.max(18, Math.floor(canvas.width * 0.04)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Край Ти Умря!', canvas.width/2, canvas.height/2 - 8);
      ctx.fillStyle = '#fff';
      ctx.font = Math.max(14, Math.floor(canvas.width * 0.03)) + 'px sans-serif';
      ctx.fillText('Резултат: ' + score + ' — натиснете Рестарт', canvas.width/2, canvas.height/2 + 26);
    }
  }
  function drawSegment(x,y,color,isHead){
    const cell = getCell();
    const cx = x * cell + cell/2;
    const cy = y * cell + cell/2;
    const radius = Math.max(4, Math.floor(cell*0.44));

    // body circle
    const g = ctx.createLinearGradient(cx-radius, cy-radius, cx+radius, cy+radius);
    g.addColorStop(0, shade(color, -10));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI*2);
    ctx.fill();

    if(isHead){
      if(imgsLoaded){
        // draw rotated snake head image
        const w = Math.max(8, Math.floor(cell*1.1));
        const h = w;
        const angle = Math.atan2(dir.y, dir.x);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.drawImage(imgSnakeHead, -w/2, -h/2, w, h);
        ctx.restore();
      } else {
        // fallback: eyes
        const eyeOffset = Math.max(2, Math.floor(cell*0.18));
        const eyeSize = Math.max(2, Math.floor(cell*0.09));
        const ex1 = cx - eyeOffset + dir.x*eyeOffset/2 - dir.y*eyeOffset/2;
        const ey1 = cy - eyeOffset + dir.y*eyeOffset/2 - dir.x*eyeOffset/2;
        const ex2 = cx + eyeOffset + dir.x*eyeOffset/2 + dir.y*eyeOffset/2;
        const ey2 = cy + eyeOffset + dir.y*eyeOffset/2 + dir.x*eyeOffset/2;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  function drawMouse(x,y){
    const cell = getCell();
    const cx = x * cell + cell/2;
    const cy = y * cell + cell/2;
    if(imgsLoaded){
      const w = Math.max(6, Math.floor(cell*0.9));
      const h = w;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.drawImage(imgMouse, -w/2, -h/2, w, h);
      ctx.restore();
      return;
    }
    const bodyR = Math.max(3, Math.floor(cell*0.32));

    // tail
    ctx.strokeStyle = '#8b5e3c';
    ctx.lineWidth = Math.max(2, Math.floor(cell*0.06));
    ctx.beginPath();
    ctx.moveTo(cx - bodyR, cy + bodyR/2);
    ctx.quadraticCurveTo(cx - bodyR - (cell*0.3), cy + bodyR, cx - bodyR - (cell*0.5), cy + bodyR*1.6);
    ctx.stroke();

    // body
    ctx.fillStyle = '#bfbfbf';
    ctx.beginPath(); ctx.arc(cx, cy, bodyR, 0, Math.PI*2); ctx.fill();

    // head slightly to the right
    const hx = cx + Math.floor(cell*0.28);
    const hy = cy - Math.floor(cell*0.08);
    const headR = Math.max(2, Math.floor(cell*0.18));
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI*2); ctx.fill();

    // ears
    ctx.fillStyle = '#999';
    ctx.beginPath(); ctx.arc(hx - headR*0.5, hy - headR*0.6, Math.max(1, Math.floor(cell*0.07)), 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + headR*0.2, hy - headR*0.6, Math.max(1, Math.floor(cell*0.07)), 0, Math.PI*2); ctx.fill();

    // eye
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(hx + headR*0.35, hy - headR*0.05, Math.max(1, Math.floor(cell*0.05)), 0, Math.PI*2); ctx.fill();
  }

  // --- Audio helpers (WebAudio for effects; optional background file)
  function initAudio(){
    if(audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // load background file if present
    try{
      bgAudio = new Audio('assets/beethoven5.mp3');
      bgAudio.loop = true;
      bgAudio.volume = 0.06;
      // prefer low-latency playback controls
      bgAudio.preload = 'auto';
      // if file fails to load, fallback to synth motif
      bgAudio.onerror = () => { bgAudio = null; console.log('bgAudio failed to load, will fallback'); };
    }catch(e){ bgAudio = null; }
  }

  function resumeAudio(){
    if(!audioCtx) initAudio();
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    audioAllowed = true;
    // if user previously enabled music, start playing
    try{
      const musicEnabled = window.localStorage.getItem('musicEnabled') === '1';
      if(musicEnabled){ startBackgroundMusic(); }
    }catch(e){ if(bgAudio) bgAudio.play().catch(()=>{}); }
  }

  function startBackgroundMusic(){
    if(!audioAllowed) return;
    if(!audioCtx) initAudio();
    // prefer file if available
    if(bgAudio){
      try{ console.log('Trying to play bgAudio file'); bgAudio.play().catch((err)=>{ console.warn('bgAudio play failed', err); }); }catch(e){ console.warn('bgAudio play exception', e); }
      return;
    }
    // else try YouTube player
    if(youtubeVideoId && typeof YT !== 'undefined'){
      try{
        if(!youtubePlayer){
          youtubePlayer = new YT.Player('yt-player', {
            height: '0', width: '0', videoId: youtubeVideoId,
            playerVars: { controls: 0, modestbranding: 1, rel: 0, fs: 0, iv_load_policy: 3, playsinline: 1 },
            events: {
              onReady: (e)=>{ console.log('YT player ready'); try{ e.target.setVolume(6); e.target.playVideo(); }catch(err){ console.warn('YT play failed', err); } },
              onStateChange: (e)=>{ if(e.data === YT.PlayerState.ENDED){ try{ e.target.seekTo(0); e.target.playVideo(); }catch(err){} } }
            }
          });
        } else {
          try{ console.log('Resuming youtubePlayer'); youtubePlayer.setVolume(6); youtubePlayer.playVideo(); }catch(e){ console.warn('youtube resume failed', e); }
        }
        return;
      }catch(e){ /* fallthrough to synth */ }
    }
    // otherwise start synth motif loop
    // try to create an in-memory WAV of the motif and play it as bgAudio
    try{
      generateMotifWav().then(blob => {
        try{
          bgAudio = new Audio(URL.createObjectURL(blob));
          bgAudio.loop = true;
          bgAudio.volume = 0.06;
          bgAudio.play().catch(e=>{ console.warn('play generated bgAudio failed', e); startSynthLoop(); });
        }catch(e){ console.warn('creating bgAudio from blob failed', e); startSynthLoop(); }
      }).catch(err => { console.warn('generateMotifWav failed', err); startSynthLoop(); });
    }catch(e){ console.warn('generate motif exception', e); startSynthLoop(); }
  }

  function stopBackgroundMusic(){
    try{ if(bgAudio){ bgAudio.pause(); } }catch(e){}
    stopSynthLoop();
    try{ if(youtubePlayer){ youtubePlayer.pauseVideo(); } }catch(e){}
  }

  function startSynthLoop(){
    if(motifInterval) return;
    if(!audioCtx) initAudio();
    // simple 4-note motif resembling short-short-short-long rhythm
    const notes = [ 440, 440, 440, 349 ]; // A A A F (approx motif)
    const dur = 0.18;
    const gap = 0.12;
    function playOnce(){
      let t = audioCtx.currentTime + 0.02;
      for(let i=0;i<notes.length;i++){
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(notes[i], t + i*(dur+gap));
        g.gain.setValueAtTime(0.0001, t + i*(dur+gap));
        g.gain.exponentialRampToValueAtTime(0.06, t + i*(dur+gap) + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i*(dur+gap) + dur + 0.02);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t + i*(dur+gap));
        o.stop(t + i*(dur+gap) + dur + 0.03);
      }
    }
    playOnce();
    motifInterval = setInterval(playOnce, Math.floor((dur+gap)*notes.length*1000 + 300));
  }

  function stopSynthLoop(){
    if(motifInterval){ clearInterval(motifInterval); motifInterval = null; }
  }

  // Generate WAV blob of motif using OfflineAudioContext
  async function generateMotifWav(){
    if(!window.OfflineAudioContext && !window.webkitOfflineAudioContext) throw new Error('OfflineAudioContext not supported');
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sampleRate = 44100;
    // motif: A A A F (approx) sequence
    const notes = [440,440,440,349];
    const dur = 0.18;
    const gap = 0.02;
    const totalDur = (dur + gap) * notes.length + 0.5;
    const offline = new OfflineCtx(1, Math.ceil(totalDur * sampleRate), sampleRate);
    const now = 0;
    for(let i=0;i<notes.length;i++){
      const o = offline.createOscillator();
      const g = offline.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(notes[i], now + i*(dur+gap));
      g.gain.setValueAtTime(0.0, now + i*(dur+gap));
      g.gain.linearRampToValueAtTime(0.08, now + i*(dur+gap) + 0.01);
      g.gain.linearRampToValueAtTime(0.0, now + i*(dur+gap) + dur);
      o.connect(g); g.connect(offline.destination);
      o.start(now + i*(dur+gap));
      o.stop(now + i*(dur+gap) + dur + 0.02);
    }
    const rendered = await offline.startRendering();
    const wav = audioBufferToWav(rendered);
    const blob = new Blob([new DataView(wav)], { type: 'audio/wav' });
    return blob;
  }

  // convert AudioBuffer to PCM WAV (32-bit float -> 16-bit PCM)
  function audioBufferToWav(buffer, opt) {
    opt = opt || {};
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    /* RIFF identifier */ writeString(view, 0, 'RIFF');
    /* file length */ view.setUint32(4, 36 + dataLength, true);
    /* RIFF type */ writeString(view, 8, 'WAVE');
    /* format chunk identifier */ writeString(view, 12, 'fmt ');
    /* format chunk length */ view.setUint32(16, 16, true);
    /* sample format (raw) */ view.setUint16(20, format, true);
    /* channel count */ view.setUint16(22, numChannels, true);
    /* sample rate */ view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */ view.setUint32(28, sampleRate * blockAlign, true);
    /* block align (channel count * bytes per sample) */ view.setUint16(32, blockAlign, true);
    /* bits per sample */ view.setUint16(34, bitsPerSample, true);
    /* data chunk identifier */ writeString(view, 36, 'data');
    /* data chunk length */ view.setUint32(40, dataLength, true);
    // write interleaved PCM samples
    let offset = 44;
    const channels = [];
    for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));
    const sampleCount = buffer.length;
    for (let i = 0; i < sampleCount; i++){
      for (let ch = 0; ch < numChannels; ch++){
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += bytesPerSample;
      }
    }
    return arrayBuffer;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++){
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function setMusicEnabled(enabled){
    try{ window.localStorage.setItem('musicEnabled', enabled ? '1' : '0'); }catch(e){}
    if(enabled){
      audioAllowed = true;
      if(!audioCtx) initAudio();
      try{ audioCtx.resume(); }catch(e){}
      if(bgAudio){ bgAudio.play().catch(()=>{}); }
      if(enableSoundBtn) enableSoundBtn.textContent = 'Звук: Вкл.';
    } else {
      if(bgAudio){ try{ bgAudio.pause(); }catch(e){} }
      if(enableSoundBtn) enableSoundBtn.textContent = 'Звук: Изкл.';
    }
  }

  function playEatSound(){
    if(!audioAllowed) return;
    if(!audioCtx) initAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(900, audioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(1400, audioCtx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.26);
  }

  function playDeathSound(){
    if(!audioAllowed) return;
    if(!audioCtx) initAudio();
    // low rumble + descending tone
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.9);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 1.2);
  }

  // init audio on user gesture
  function firstGesture(){
    try{ resumeAudio(); }catch(e){}
    try{ startBackgroundMusic(); }catch(e){}
    window.removeEventListener('keydown', firstGesture);
    try{ if(enableSoundBtn) enableSoundBtn.removeEventListener('click', firstGesture); }catch(e){}
  }
  window.addEventListener('keydown', firstGesture);
  try{ if(enableSoundBtn) enableSoundBtn.addEventListener('click', firstGesture); }catch(e){}

  // initialize music button state based on stored preference
  try{
    const stored = window.localStorage.getItem('musicEnabled');
    if(stored === null){
      if(enableSoundBtn) enableSoundBtn.textContent = 'Включи звук';
    } else if(stored === '1'){
      if(enableSoundBtn) enableSoundBtn.textContent = 'Звук: Вкл.';
      // try to auto-start if possible (will require user gesture first time)
      try{ resumeAudio(); }catch(e){}
    } else {
      if(enableSoundBtn) enableSoundBtn.textContent = 'Звук: Изкл.';
    }
  }catch(e){ if(enableSoundBtn) enableSoundBtn.textContent = 'Включи звук'; }

  // toggle music on explicit button click
  try{
    if(enableSoundBtn) enableSoundBtn.addEventListener('click', () => {
      try{
        const cur = window.localStorage.getItem('musicEnabled') === '1';
        setMusicEnabled(!cur);
      }catch(e){ setMusicEnabled(true); }
    });
  }catch(e){}

  // small utility to darken/lighten hex color
  function shade(hex, percent) {
    try{
      const c = hex.replace('#','');
      const num = parseInt(c,16);
      let r = (num >> 16) + percent;
      let g = ((num >> 8) & 0x00FF) + percent;
      let b = (num & 0x0000FF) + percent;
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      return '#' + (r<<16 | g<<8 | b).toString(16).padStart(6, '0');
    }catch(e){ return hex; }
  }

  function loop(ts){
    if(!lastTick) lastTick = ts;
    const delta = ts - lastTick;
    if(running){
      if(delta >= MS_PER_TICK){
        lastTick = ts;
        tick();
      }
    }
    // always draw so overlays (game over) remain visible
    draw();
    requestAnimationFrame(loop);
  }

  function handleKey(e){
    const key = e.key;
    let nd;
    if(key === 'ArrowUp' || key === 'w' || key === 'W') nd = { x:0, y:-1 };
    if(key === 'ArrowDown' || key === 's' || key === 'S') nd = { x:0, y:1 };
    if(key === 'ArrowLeft' || key === 'a' || key === 'A') nd = { x:-1, y:0 };
    if(key === 'ArrowRight' || key === 'd' || key === 'D') nd = { x:1, y:0 };
    if(nd){
      // prevent reverse into self
      if(nd.x === -dir.x && nd.y === -dir.y) return;
      nextDir = nd;
      e.preventDefault();
    }
  }

  // keep canvas square and compute CELL dynamically on load / resize
  function resize(){
    const size = Math.min(window.innerWidth*0.9, 720);
    canvas.width = canvas.height = Math.floor(size / GRID) * GRID;
  }

  // attach listeners
  window.addEventListener('keydown', handleKey);
  restartBtn.addEventListener('click', () => { reset(); if(audioAllowed && bgAudio){ try{ bgAudio.play(); }catch(e){} } });
  window.addEventListener('resize', resize);

  // initialize
  resize();
  reset();
  requestAnimationFrame(loop);

})();
