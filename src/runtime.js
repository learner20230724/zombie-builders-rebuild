/*
 * Zombie Trailer Park 0.33 — browser implementation of the original gxtk layer.
 * The game simulation remains in generated-game.js. No SWF player is used here.
 * Public configuration and diagnostics: window.ZTPRuntime.
 */
(function installZTPRuntime(global) {
  'use strict';

  const diagnostics = {
    errors: [], warnings: [], assets: {}, frames: 0, updates: 0,
    drawCalls: 0, audioStarted: 0, audioPending: 0, storageAvailable: true,
    cropCache: { entries: 0, pixels: 0, hits: 0, misses: 0 },
    remoteServices: 'Mochi Media is unavailable; scores and user data are local-only.'
  };
  const state = {
    canvas: null, context: null, assets: new Map(), movies: {}, imagePromises: new Map(),
    storageKey: 'zombie-trailer-park-0.33', storage: new Map(), strings: {},
    audioContext: null, audioUnavailable: false, audioUnlocked: false,
    channels: new Set(), inputCleanup: null, running: false, raf: null,
    lastFrame: null, manualTime: null, movie: null, mochiState: 0,
    mochiGets: [], mochiProperties: [], scoreDialog: null, options: {}, app: null
  };
  const perfNow = () => global.performance ? global.performance.now() : Date.now();
  const now = () => state.manualTime === null ? perfNow() : state.manualTime;
  const zero = () => 0;
  // Native BitmapData rectangle edges use ties-to-even, not Math.round's
  // positive-half rule. This is distinct from setPixel/Point int coercion.
  function roundPixelEdge(value) {
    const lower = Math.floor(value), fraction = value - lower;
    return fraction < .5 ? lower : fraction > .5 ? lower + 1
      : lower % 2 === 0 ? lower : lower + 1;
  }

  function emit(kind, message, error) {
    const detail = { message: String(message), time: now() };
    if (error && error.stack) detail.stack = error.stack;
    diagnostics[kind === 'error' ? 'errors' : 'warnings'].push(detail);
    if (typeof state.options.onDiagnostic === 'function') state.options.onDiagnostic(kind, detail);
    if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
      global.dispatchEvent(new CustomEvent('ztp-runtime-' + kind, { detail }));
    }
    if (global.console) (kind === 'error' ? global.console.error : global.console.warn)(message, error || '');
  }
  function fail(message, cause) {
    const error = cause instanceof Error ? cause : new Error(message);
    emit('error', message, error);
    throw error;
  }
  function getCanvas() {
    if (!state.canvas) fail('configureRuntime({ canvas }) must be called before creating the game.');
    return state.canvas;
  }
  function recordFor(path) {
    const key = String(path).replace(/^data\//, '');
    return state.assets.get(key) || state.assets.get(key.replace(/\.[^.]+$/, ''));
  }
  function imageType(record, key) {
    return String(record.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(record.src || key);
  }
  function audioType(record, key) {
    return String(record.type || '').startsWith('audio/') || /\.(mp3|ogg|wav|m4a)$/i.test(record.src || key);
  }
  function makeCanvas(width, height) {
    const canvas = global.document ? document.createElement('canvas') : new OffscreenCanvas(width, height);
    canvas.width = width; canvas.height = height;
    return canvas;
  }
  function loadImage(src) {
    if (state.imagePromises.has(src)) return state.imagePromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to load image: ' + src));
      image.src = src;
    });
    state.imagePromises.set(src, promise);
    return promise;
  }
  function getAudioContext() {
    if (state.audioContext || state.audioUnavailable) return state.audioContext;
    const Context = global.AudioContext || global.webkitAudioContext;
    if (!Context) {
      state.audioUnavailable = true;
      emit('warning', 'Web Audio is unavailable; using HTML audio playback.');
      return null;
    }
    state.audioContext = new Context();
    state.audioUnlocked = state.audioContext.state === 'running';
    return state.audioContext;
  }
  async function loadAudio(record) {
    const response = await fetch(record.src);
    if (!response.ok) throw new Error('Unable to load sound (' + response.status + '): ' + record.src);
    record.bytes = await response.arrayBuffer();
    const context = getAudioContext();
    if (context) record.buffer = await context.decodeAudioData(record.bytes.slice(0));
    record.ready = true;
  }

  function configureRuntime(options = {}) {
    if (state.running) fail('Stop the runtime before reconfiguring it.');
    state.options = { ...state.options, ...options };
    const canvas = options.canvas || state.canvas || (global.document && document.querySelector('canvas'));
    if (canvas) {
      state.canvas = canvas;
      state.context = canvas.getContext('2d', { alpha: false });
      if (!state.context) fail('Canvas 2D is required.');
      if (!canvas.width) canvas.width = 800;
      if (!canvas.height) canvas.height = 600;
      if (canvas.setAttribute) {
        canvas.setAttribute('tabindex', '0');
        canvas.setAttribute('aria-label', 'Zombie Trailer Park game');
      }
      if (canvas.style) canvas.style.touchAction = 'none';
    }
    if (options.storageKey) state.storageKey = String(options.storageKey);
    if (options.strings) state.strings = options.strings;
    if (options.movies) for (const [name, movie] of Object.entries(options.movies)) {
      // Own the mutable decoded handles. Two movies may share a source URL, or
      // even caller-supplied frame objects, without one releasing the other.
      state.movies[name] = { ...movie,
        frames: movie.frames && movie.frames.map(frame => typeof frame === 'string' ? { src: frame } : { ...frame }),
        sounds: (movie.sounds || (movie.sound ? [movie.sound] : [])).map(sound => ({ ...sound }))
      };
    }
    if (options.assets) {
      for (const [key, value] of Object.entries(options.assets)) {
        const record = typeof value === 'string' ? { src: value } : { ...value };
        if (!record.src && record.url) record.src = record.url;
        if (!record.src && !record.image && !record.buffer) fail('Asset is missing src: ' + key);
        state.assets.set(key, record);
        if (!state.assets.has(key.replace(/\.[^.]+$/, ''))) state.assets.set(key.replace(/\.[^.]+$/, ''), record);
      }
    }
    return api;
  }

  async function preloadRuntimeAssets() {
    const pending = [];
    const unique = new Set();
    for (const [key, record] of state.assets) {
      if (unique.has(record)) continue;
      unique.add(record);
      const job = (async () => {
        if (imageType(record, key)) {
          if (!record.image) record.image = await loadImage(record.src);
          record.width = record.image.naturalWidth || record.image.width;
          record.height = record.image.naturalHeight || record.image.height;
          record.ready = true;
        } else if (audioType(record, key)) {
          if (!record.buffer && !record.ready) await loadAudio(record);
          record.ready = true;
        }
        diagnostics.assets[key] = { src: record.src, ready: !!record.ready, width: record.width, height: record.height };
      })().catch(error => fail('Failed to preload ' + key + ': ' + error.message, error));
      pending.push(job);
    }
    for (const [name, movie] of Object.entries(state.movies)) pending.push(preloadMovieDefinition(name, movie));
    await Promise.all(pending);
    return api;
  }
  async function preloadMovieDefinition(name, movie) {
    const pending = [];
    for (const frame of movie.frames || []) if (!frame.image) {
      pending.push(loadImage(frame.src).then(image => { frame.image = image; }));
    }
    for (const sound of movie.sounds || []) if (!sound.buffer && !sound.ready) pending.push(loadAudio(sound));
    try { await Promise.all(pending); }
    catch (error) { fail('Failed to preload movie ' + name + ': ' + error.message, error); }
  }
  function movieAssetsReady(movie) {
    return (movie.frames || []).every(frame => !!frame.image)
      && (movie.sounds || []).every(sound => !!sound.buffer || !!sound.ready);
  }
  function releaseMovieAssets(name) {
    const movie = state.movies[name];
    if (!movie) return;
    if (state.movie && state.movie.name === name && !state.movie.cancelled) return;
    const sources = new Set((movie.frames || []).map(frame => frame.src));
    for (const frame of movie.frames || []) delete frame.image;
    for (const sound of movie.sounds || []) { delete sound.buffer; delete sound.bytes; sound.ready = false; }
    for (const src of sources) {
      const sharedAsset = [...state.assets.values()].some(record => record.src === src && record.image);
      const sharedMovie = Object.entries(state.movies).some(([otherName, other]) => otherName !== name
        && (other.frames || []).some(frame => frame.src === src && frame.image));
      if (!sharedAsset && !sharedMovie) state.imagePromises.delete(src);
    }
  }

  class gxtkApp {
    constructor() {
      state.app = this; global.app = this;
      this.graphics = new gxtkGraphics(); this.input = new gxtkInput(); this.audio = new gxtkAudio();
      this.loading = 0; this.maxloading = 0; this.updateRate = 0; this.startMillis = now();
      bindInput(this.input);
    }
    IncLoading() { this.maxloading = Math.max(this.maxloading, ++this.loading); }
    DecLoading() {
      if (this.loading <= 0) fail('Unbalanced gxtkApp.DecLoading()');
      if (--this.loading === 0) this.maxloading = 0;
    }
    OnEnterFrame() { if (this.updateRate && !this.loading) this.InvokeOnUpdate(); this.InvokeOnRender(); }
    GraphicsDevice() { return this.graphics; }
    InputDevice() { return this.input; }
    AudioDevice() { return this.audio; }
    GetMetaData(path, key) {
      const record = recordFor(path);
      if (!record) return '';
      if (key === 'type') return record.type || (imageType(record, path) ? 'image/png' : audioType(record, path) ? 'audio/mpeg' : '');
      return record[key] === undefined ? '' : String(record[key]);
    }
    AppTitle() { return state.options.title || 'Zombie Trailer Park 0.33'; }
    LoadState() { return readStorage('gxtkapp/state', ''); }
    SaveState(value) { writeStorage('gxtkapp/state', String(value)); return 0; }
    LoadString(path) { return state.strings[path] || ''; }
    SetUpdateRate(rate) { this.updateRate = Math.max(0, rate | 0); return 0; }
    MilliSecs() { return (now() - this.startMillis) | 0; }
    Loading() { return this.loading; }
    OnCreate() { return 0; }
    OnUpdate() { return 0; }
    OnRender() { return 0; }
    OnLoading() { return 0; }
    InvokeOnCreate() { this.OnCreate(); return 0; }
    InvokeOnUpdate() {
      this.input.BeginUpdate();
      try { this.OnUpdate(); diagnostics.updates++; } finally { this.input.EndUpdate(); }
      return 0;
    }
    InvokeOnRender() {
      this.graphics.BeginRender();
      try { this.loading ? this.OnLoading() : this.OnRender(); renderMovie(); }
      finally { this.graphics.EndRender(); }
      diagnostics.frames++;
      return 0;
    }
  }

  class gxtkGraphics {
    constructor() { this.color = 0xffffffff; this.cssColor = '#ffffff'; this.matrix = null; this.bitmapData = null; }
    BeginRender() {
      this.bitmapData = state.context;
      this.bitmapData.setTransform(1, 0, 0, 1, 0, 0);
      this.bitmapData.globalAlpha = 1;
      this.bitmapData.globalCompositeOperation = 'source-over';
    }
    UseBitmap() {}
    UseGraphics() {}
    EndRender() { this.bitmapData = null; }
    Width() { return getCanvas().width; }
    Height() { return getCanvas().height; }
    LoadSurface(path, listener) { const surface = new gxtkSurface(); surface.Load(path, listener); return surface; }
    SetColor(red, green, blue) {
      this.color = (0xff000000 | (red | 0) << 16 | (green | 0) << 8 | (blue | 0)) >>> 0;
      this.cssColor = '#' + (this.color & 0xffffff).toString(16).padStart(6, '0');
      return 0;
    }
    SetMatrix(a, b, c, d, tx, ty) {
      this.matrix = a === 1 && b === 0 && c === 0 && d === 1 && tx === 0 && ty === 0 ? null : [a, b, c, d, tx, ty];
      return 0;
    }
    _draw(callback, transformed = true) {
      const context = this.bitmapData || state.context;
      if (!context) fail('A draw was requested without a Canvas 2D context.');
      context.save();
      const matrix = transformed && this.matrix;
      if (matrix) context.setTransform(...matrix); else context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = context.strokeStyle = this.cssColor;
      context.imageSmoothingEnabled = !!matrix;
      try { callback(context); diagnostics.drawCalls++; } finally { context.restore(); }
      return 0;
    }
    Cls(red, green, blue) {
      return this._draw(context => {
        context.fillStyle = `rgb(${red | 0},${green | 0},${blue | 0})`;
        context.fillRect(0, 0, this.Width(), this.Height());
      }, false);
    }
    DrawPoint(x, y) { return this.matrix ? this.DrawRect(x, y, 1, 1) : this._draw(c => c.fillRect(x | 0, y | 0, 1, 1)); }
    DrawRect(x, y, width, height) {
      if (this.matrix) return this._draw(c => c.fillRect(x, y, width, height));
      const left = roundPixelEdge(x), top = roundPixelEdge(y);
      const right = roundPixelEdge(x + width), bottom = roundPixelEdge(y + height);
      if (!(right > left && bottom > top)) return 0;
      return this._draw(c => c.fillRect(left, top, right - left, bottom - top));
    }
    DrawLine(x1, y1, x2, y2) {
      return this._draw(c => { c.lineWidth = 1; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); });
    }
    DrawOval(x, y, width, height) {
      if (width <= 0 || height <= 0) return 0;
      return this._draw(c => { c.beginPath(); c.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2); c.fill(); });
    }
    DrawSurface(surface, x, y) {
      if (!surface || surface.Loaded() !== 1) return 0;
      if (this.matrix && (x !== 0 || y !== 0)) return -1;
      // Native copyPixels(Point) truncates destination coordinates toward zero,
      // unlike the separate transformed BitmapData.draw sampling path.
      return this._draw(c => c.drawImage(surface.image, this.matrix ? x : Math.trunc(x), this.matrix ? y : Math.trunc(y)));
    }
    DrawSurface2(surface, x, y, sourceX, sourceY, width, height) {
      // These four wrapper parameters are AS3 int, unlike its Number x/y and
      // the separate floating Rectangle API. Coerce before clipping or caching.
      sourceX |= 0; sourceY |= 0; width |= 0; height |= 0;
      if (!surface || surface.Loaded() !== 1 || width <= 0 || height <= 0) return 0;
      if (this.matrix && (x !== 0 || y !== 0)) return -1;
      if (!this.matrix) return this._draw(c => c.drawImage(surface.image, sourceX, sourceY, width, height, Math.trunc(x), Math.trunc(y), width, height));
      // Flash first crops to an isolated BitmapData; doing the same prevents atlas
      // neighbours from bleeding into the bilinear-filtered transformed sprite.
      const cacheKey = sourceX + ',' + sourceY + ',' + width + ',' + height;
      let fragment = surface.fragments.get(cacheKey);
      if (!fragment) {
        fragment = makeCanvas(width, height);
        fragment.getContext('2d').drawImage(surface.image, sourceX, sourceY, width, height, 0, 0, width, height);
        surface.fragments.set(cacheKey, fragment);
        diagnostics.cropCache.entries++; diagnostics.cropCache.misses++;
        diagnostics.cropCache.pixels += width * height;
      } else diagnostics.cropCache.hits++;
      // Assets and sprite rectangles are immutable, so a cached crop is exactly
      // the same bitmap the original re-created for every call. In particular,
      // varying glyph sizes must not reallocate a canvas for every letter.
      surface.scratch = fragment;
      return this._draw(c => c.drawImage(fragment, 0, 0));
    }
  }

  class gxtkSurfaceListener { OnSurfaceLoaded() { return 0; } }
  class gxtkSurface {
    constructor() { this.loaded = 0; this.image = null; this.bitmap = null; this.rect = { x: 0, y: 0, width: 0, height: 0 }; this.scratch = null; this.fragments = new Map(); this.listener = null; }
    _loaded(record) {
      this.image = record.image;
      this.rect = { x: 0, y: 0, width: record.width || this.image.width, height: record.height || this.image.height };
      this.bitmap = { bitmapData: this.image, width: this.rect.width, height: this.rect.height };
      this.loaded = 1;
    }
    Load(path, listener) {
      const record = recordFor(path);
      if (!record) fail('Image is not registered in the asset manifest: ' + path);
      if (record.image) { this._loaded(record); return; }
      this.listener = listener;
      this.rect.width = record.width || 0; this.rect.height = record.height || 0;
      if (!listener) state.app.IncLoading();
      loadImage(record.src).then(image => {
        record.image = image; record.width = image.naturalWidth || image.width; record.height = image.naturalHeight || image.height;
        this._loaded(record);
        if (listener) listener.OnSurfaceLoaded(this); else state.app.DecLoading();
      }).catch(error => {
        this.loaded = -1;
        if (listener) listener.OnSurfaceLoaded(this); else state.app.DecLoading();
        emit('error', 'Unable to load surface ' + path, error);
      });
    }
    Width() { return this.rect.width; }
    Height() { return this.rect.height; }
    Loaded() { return this.loaded; }
  }

  class gxtkInput {
    constructor() { this.keyStates = new Array(256).fill(0); this.charQueue = new Array(32).fill(0); this.charPut = 0; this.charGet = 0; this.mouseX = 0; this.mouseY = 0; }
    BeginUpdate() {}
    EndUpdate() { for (let i = 0; i < 256; i++) this.keyStates[i] &= 256; }
    OnKeyDown(key) { if (key > 0 && key < 256 && !(this.keyStates[key] & 256)) { this.keyStates[key] |= 256; ++this.keyStates[key]; } }
    OnKeyUp(key) { if (key > 0 && key < 256) this.keyStates[key] &= 255; }
    PutChar(char) { if (char && this.charPut - this.charGet < 32) this.charQueue[this.charPut++ & 31] = char; }
    OnMouseMove(x, y) { this.mouseX = x; this.mouseY = y; }
    KeyDown(key) { return key > 0 && key < 256 ? this.keyStates[key === 224 ? 1 : key] >> 8 : 0; }
    KeyHit(key) { return key > 0 && key < 256 ? this.keyStates[key === 224 ? 1 : key] & 255 : 0; }
    GetChar() { return this.charGet !== this.charPut ? this.charQueue[this.charGet++ & 31] | 0 : 0; }
    MouseX() { return this.mouseX; }
    MouseY() { return this.mouseY; }
    JoyX() { return 0; }
    JoyY() { return 0; }
    TouchX() { return this.mouseX; }
    TouchY() { return this.mouseY; }
    ReleaseAll() { for (let i = 0; i < 256; i++) this.OnKeyUp(i); }
  }
  function KeyToChar(key, shift) {
    if ([8, 9, 13, 27, 32].includes(key)) return key;
    if (key === 46) return 127;
    if (key >= 48 && key <= 57 && !shift) return key;
    if (key >= 65 && key <= 90) return shift ? key : key + 32;
    return key | 0x10000;
  }
  function bindInput(input) {
    if (state.inputCleanup) state.inputCleanup();
    const canvas = getCanvas();
    if (!global.addEventListener || !canvas.addEventListener) return;
    const listeners = [];
    function on(target, event, listener, options) { target.addEventListener(event, listener, options); listeners.push(() => target.removeEventListener(event, listener, options)); }
    function move(event) {
      const rect = canvas.getBoundingClientRect();
      input.OnMouseMove((event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height);
    }
    function acceptsKeys(event) {
      const target = event.target;
      return !state.scoreDialog && !(target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)));
    }
    on(canvas, 'pointermove', move);
    on(canvas, 'pointerdown', event => {
      if (event.button !== 0 || state.scoreDialog) return;
      move(event); input.OnKeyDown(1); canvas.focus({ preventScroll: true });
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
      unlockRuntimeAudio(); event.preventDefault();
      if (state.movie && state.movie.definition.clickURL) Redirect(state.movie.definition.clickURL);
    });
    on(global, 'pointerup', event => { if (event.button === 0) input.OnKeyUp(1); });
    on(canvas, 'pointercancel', () => input.OnKeyUp(1));
    on(global, 'blur', () => input.ReleaseAll());
    on(global, 'keydown', event => {
      if (!acceptsKeys(event)) return;
      const key = event.keyCode || event.which;
      input.OnKeyDown(key);
      input.PutChar(event.key && event.key.length === 1 ? event.key.charCodeAt(0) : KeyToChar(key, event.shiftKey));
      unlockRuntimeAudio();
      if ([8, 9, 32, 37, 38, 39, 40].includes(key)) event.preventDefault();
    });
    on(global, 'keyup', event => input.OnKeyUp(event.keyCode || event.which));
    state.inputCleanup = () => listeners.forEach(remove => remove());
  }

  class gxtkSample { constructor(sound) { this.sound = sound; } }
  class gxtkChannel {
    constructor(sample, loops = 0) {
      this.sample = sample; this.loops = Math.max(0, loops | 0); this.chan = this;
      this.source = null; this.element = null; this.stopped = false; this.started = false;
      this.volume = 1; this.timer = null; this.delay = 0;
      this.requestedAt = now(); this.pendingPlay = false;
    }
    stop() {
      if (this.stopped) return;
      this.stopped = true;
      if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
      if (this.source) { this.source.onended = null; this.source.stop(); }
      if (this.element) this.element.pause();
      state.channels.delete(this); updateAudioPending();
    }
    _start() {
      if (this.stopped || this.started || this.pendingPlay || this.timer !== null) return;
      const record = this.sample.sound;
      const context = getAudioContext();
      if (context) {
        if (context.state !== 'running') { updateAudioPending(); return; }
        if (!record.buffer) fail('Sound must be preloaded before playback: ' + record.src);
        const source = context.createBufferSource();
        source.buffer = record.buffer; source.loop = this.loops > 0;
        const elapsed = (now() - this.requestedAt - this.delay) / 1000;
        const total = record.buffer.duration * (this.loops + 1);
        if (elapsed >= total) { this.stopped = true; state.channels.delete(this); updateAudioPending(); return; }
        const wait = Math.max(0, -elapsed), offset = Math.max(0, elapsed);
        const gain = context.createGain(); gain.gain.value = this.volume;
        source.connect(gain); gain.connect(context.destination);
        this.source = source; this.started = true;
        source.onended = () => { this.stopped = true; state.channels.delete(this); updateAudioPending(); };
        source.start(context.currentTime + wait, offset % record.buffer.duration);
        if (this.loops > 0) source.stop(context.currentTime + wait + total - offset);
      } else {
        if (!this.element) {
          const audio = new Audio(record.src); audio.volume = this.volume;
          let remaining = this.loops;
          const rejected = error => {
            this.pendingPlay = false;
            if (this.stopped) return;
            this.started = false;
            if (error.name !== 'NotAllowedError') emit('error', 'HTML audio playback failed', error);
            updateAudioPending();
          };
          this._playElement = () => {
            this.timer = null;
            if (this.stopped || this.pendingPlay) return;
            this.pendingPlay = true;
            let result;
            try { result = audio.play(); } catch (error) { rejected(error); return; }
            Promise.resolve(result).then(() => {
              this.pendingPlay = false;
              if (this.stopped) { audio.pause(); return; }
              this.started = true; diagnostics.audioStarted++; updateAudioPending();
            }, rejected);
          };
          audio.addEventListener('ended', () => {
            if (!this.stopped && remaining-- > 0) { audio.currentTime = 0; this.started = false; this._playElement(); }
            else { this.stopped = true; state.channels.delete(this); updateAudioPending(); }
          });
          this.element = audio;
        }
        const remainingDelay = Math.max(0, this.requestedAt + this.delay - now());
        if (remainingDelay) this.timer = setTimeout(this._playElement, remainingDelay); else this._playElement();
      }
      if (context) diagnostics.audioStarted++;
      updateAudioPending();
    }
  }
  function updateAudioPending() { diagnostics.audioPending = [...state.channels].filter(channel => !channel.stopped && !channel.started).length; }
  class gxtkAudio {
    LoadSample(path) {
      const record = recordFor(path);
      if (!record) fail('Sound is not registered in the asset manifest: ' + path);
      return new gxtkSample(record);
    }
    PlaySample(sample, loops) {
      if (!sample || !sample.sound) fail('Cannot play an invalid audio sample.');
      const channel = new gxtkChannel(sample, loops);
      state.channels.add(channel); channel._start(); return channel;
    }
    StopChannel(channel) { if (channel) channel.stop(); }
  }
  async function unlockRuntimeAudio() {
    const context = getAudioContext();
    try {
      if (context && context.state !== 'running') await context.resume();
      state.audioUnlocked = !context || context.state === 'running';
      if (state.audioUnlocked) for (const channel of state.channels) channel._start();
    } catch (error) { emit('warning', 'Audio unlock failed; another user gesture may be needed.', error); }
    return state.audioUnlocked;
  }

  function readStorage(key, fallback = null) {
    const name = state.storageKey + '/' + key;
    if (state.storage.has(name)) return state.storage.get(name);
    try {
      const value = global.localStorage ? global.localStorage.getItem(name) : null;
      if (value !== null) { state.storage.set(name, value); return value; }
    } catch (error) {
      if (diagnostics.storageAvailable) emit('warning', 'Persistent storage is unavailable; saves last only for this page session.', error);
      diagnostics.storageAvailable = false;
    }
    return fallback;
  }
  function writeStorage(key, value) {
    const name = state.storageKey + '/' + key;
    state.storage.set(name, String(value));
    try { if (global.localStorage) global.localStorage.setItem(name, String(value)); }
    catch (error) { diagnostics.storageAvailable = false; emit('warning', 'Unable to persist save data: ' + key, error); }
  }
  function ReadInt(group, key) { return Number(readStorage('shared/' + group + '/' + key, 0)) | 0; }
  function WriteInt(group, key, value) { writeStorage('shared/' + group + '/' + key, value | 0); }
  function FlushInts() {} // localStorage writes synchronously, unlike Flash SharedObject.
  function SetCursor(cursor) { if (getCanvas().style) getCanvas().style.cursor = ({ auto: 'auto', arrow: 'default', button: 'pointer', hand: 'grab', ibeam: 'text' })[cursor] || cursor; }
  function Redirect(url) {
    const parsed = new URL(url, global.location && global.location.href || 'https://www.ninjakiwi.com/');
    if (!/^https?:$/.test(parsed.protocol)) fail('Unsupported external-link protocol: ' + parsed.protocol);
    if (typeof state.options.onRedirect === 'function') state.options.onRedirect(parsed.href);
    else if (global.open) global.open(parsed.href, '_blank', 'noopener,noreferrer');
  }

  function PlayMovie(name) {
    EndMovie();
    const movie = state.movies[name];
    if (!movie) fail('Movie is not registered: ' + name + '. Extract the original embedded animation before booting.');
    const frameLength = 1000 / (movie.frameRate || movie.fps || 30);
    const duration = movie.finishAt === undefined ? (movie.duration === undefined ? (movie.frames || []).reduce((total, frame) => total + (frame.duration === undefined ? frameLength : frame.duration), 0) : movie.duration) : movie.finishAt;
    if (!(duration > 0)) fail('Movie has no positive duration: ' + name);
    const playback = { name, definition: movie, start: null, duration, channels: [], loading: false, cancelled: false };
    state.movie = playback;
    if (movieAssetsReady(movie)) beginMovie(playback);
    else {
      if (state.app) { state.app.IncLoading(); playback.loading = true; }
      preloadMovieDefinition(name, movie).then(() => {
        if (!playback.cancelled && state.movie === playback) beginMovie(playback);
        else if (movie.releaseAfterPlay) releaseMovieAssets(name);
      }).catch(error => {
        playback.error = error;
        stopRuntime(); // The preload error is already present in diagnostics.
      }).finally(() => finishMovieLoading(playback));
    }
  }
  function finishMovieLoading(playback) {
    if (playback.loading) { playback.loading = false; state.app.DecLoading(); }
  }
  function beginMovie(playback) {
    playback.start = now();
    for (const sound of playback.definition.sounds || []) {
      const channel = new gxtkChannel(new gxtkSample(sound), sound.loops || 0);
      channel.requestedAt = playback.start;
      channel.delay = sound.startTime || 0; channel.volume = sound.volume === undefined ? 1 : sound.volume;
      state.channels.add(channel); playback.channels.push(channel); channel._start();
    }
  }
  function EndMovie() {
    if (state.movie) {
      const playback = state.movie;
      for (const channel of playback.channels) channel.stop();
      playback.cancelled = true;
      finishMovieLoading(playback);
      if (playback.definition.releaseAfterPlay && !playback.loading) releaseMovieAssets(playback.name);
    }
    state.movie = null;
  }
  function MovieFinished() { return state.movie && state.movie.start !== null && now() - state.movie.start >= state.movie.duration ? 1 : 0; }
  function renderMovie() {
    if (!state.movie || state.movie.start === null) return;
    const movie = state.movie.definition, elapsed = Math.min(now() - state.movie.start, state.movie.duration - 0.0001);
    const context = state.context;
    context.save(); context.setTransform(movie.scale || 1, 0, 0, movie.scale || 1, movie.x || 0, movie.y || 0);
    context.imageSmoothingEnabled = true;
    try {
      if (typeof movie.render === 'function') movie.render(elapsed, context);
      else {
        let end = 0, selected = movie.frames[movie.frames.length - 1];
        for (const frame of movie.frames) { end += frame.duration === undefined ? 1000 / (movie.frameRate || movie.fps || 30) : frame.duration; if (elapsed < end) { selected = frame; break; } }
        if (!selected || !selected.image) fail('Movie frame was not preloaded: ' + state.movie.name);
        context.drawImage(selected.image, movie.offsetX || 0, movie.offsetY || 0, movie.width || selected.image.width, movie.height || selected.image.height);
      }
    } finally { context.restore(); }
  }

  function closeMochiScores() {
    state.mochiState = 0;
    if (state.scoreDialog && state.scoreDialog.remove) state.scoreDialog.remove();
    state.scoreDialog = null;
    if (state.canvas && state.canvas.focus) state.canvas.focus({ preventScroll: true });
  }
  function ShowMochiScores(board, packedScore) {
    if (!packedScore) return;
    closeMochiScores();
    const difficulty = packedScore & 15, score = packedScore >> 4;
    const key = 'mochi/leaderboard/' + difficulty;
    let scores;
    try { scores = JSON.parse(readStorage(key, '[]')); } catch (error) { emit('warning', 'Discarded malformed local leaderboard.', error); scores = []; }
    if (!Array.isArray(scores)) scores = [];
    if (score > 0) {
      scores.push({ score, date: new Date().toISOString(), name: 'Local player' });
      scores.sort((a, b) => a.score - b.score); scores = scores.slice(0, 100);
      writeStorage(key, JSON.stringify(scores));
    }
    state.mochiState = 1;
    if (state.app) state.app.input.ReleaseAll();
    const details = { board, difficulty, score, scores, offline: true, close: closeMochiScores };
    if (typeof state.options.showLeaderboard === 'function') { state.scoreDialog = state.options.showLeaderboard(details) || { custom: true }; return; }
    if (!global.document) { state.scoreDialog = { headless: true }; return; }
    const backdrop = document.createElement('div');
    backdrop.setAttribute('data-ztp-leaderboard', '');
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#000a;display:grid;place-items:center;font-family:Arial,sans-serif;color:#e7dfc0';
    const panel = document.createElement('section'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'High Scores');
    panel.style.cssText = 'box-sizing:border-box;max-width:90vw;width:620px;max-height:85vh;overflow:auto;background:#292b24;border:3px solid #bdad76;padding:28px;box-shadow:0 8px 60px #000';
    const title = document.createElement('h2'); title.textContent = 'High Scores — Local Archive'; title.style.marginTop = '0'; panel.appendChild(title);
    const note = document.createElement('p'); note.textContent = 'The original Mochi Media online service is no longer available. This edition preserves your score submissions on this device; these are not global rankings.'; panel.appendChild(note);
    const label = document.createElement('h3'); label.textContent = 'Stage ' + Math.max(1, difficulty); panel.appendChild(label);
    const list = document.createElement('ol');
    if (scores.length) for (const entry of scores) { const item = document.createElement('li'); item.textContent = entry.name + ' — ' + (entry.score / 1000).toFixed(3) + ' seconds'; list.appendChild(item); }
    else { const empty = document.createElement('p'); empty.textContent = 'No local score submissions yet.'; panel.appendChild(empty); }
    panel.appendChild(list);
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Close'; button.style.cssText = 'font-size:20px;padding:8px 30px;cursor:pointer'; button.onclick = closeMochiScores;
    panel.appendChild(button); backdrop.appendChild(panel); document.body.appendChild(backdrop); state.scoreDialog = backdrop; button.focus();
    backdrop.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeMochiScores(); } if (event.key === 'Tab') { event.preventDefault(); button.focus(); } });
  }
  function mochiMain() {
    state.mochiGets.length = 0;
    try {
      const values = JSON.parse(readStorage('mochi/properties', '[]'));
      state.mochiProperties = Array.isArray(values) ? values : [];
    } catch (error) { state.mochiProperties = []; emit('warning', 'Discarded malformed local Mochi properties.', error); }
  }
  function GetMochi(key) { queueMicrotask(() => state.mochiGets.push(key, readStorage('mochi/data/' + key, ''))); }
  function PutMochi(key, value) { writeStorage('mochi/data/' + key, value); queueMicrotask(() => state.mochiGets.push(key, value)); }
  function PollMochi(result) { if (state.mochiGets.length < 2) return 0; result[0] = state.mochiGets.shift(); result[1] = state.mochiGets.shift(); return 2; }
  function ReadMochi(result) { state.mochiProperties.forEach((value, index) => { result[index] = value; }); return state.mochiProperties.length; }
  function WriteMochi(values) { state.mochiProperties = values.slice(); writeStorage('mochi/properties', JSON.stringify(values)); }
  function FetchMochi(uid) { queueMicrotask(() => state.mochiGets.push('data', readStorage('mochi/data/' + uid, ''))); }
  function ShareMochi(friends, title, message) {
    // Never impersonate an online success. The host may offer its native share UI.
    if (typeof state.options.onShare === 'function') state.options.onShare({ friends, title, message });
    else emit('warning', 'Mochi social sharing is unavailable offline: ' + title);
  }

  function effectiveFrameRate() {
    const app = state.app;
    if (!app || app.loading || !app.updateRate) return 10;
    // The original intro explicitly changes stage.frameRate independently of
    // gxtkApp.updateRate. It restores the previous rate before finishing.
    const movieRate = state.movie && state.movie.start !== null
      && (state.movie.definition.stageFrameRate || state.movie.definition.frameRate);
    return movieRate || app.updateRate;
  }
  function frame(timestamp) {
    if (!state.running) return;
    const app = state.app;
    const interval = 1000 / effectiveFrameRate();
    if (state.lastFrame === null || timestamp - state.lastFrame >= interval - 0.05) {
      state.lastFrame = state.lastFrame === null ? timestamp : timestamp - Math.max(0, timestamp - state.lastFrame) % interval;
      try { if (app) app.OnEnterFrame(); }
      catch (error) { stopRuntime(); emit('error', 'Game frame failed: ' + error.message, error); return; }
    }
    state.raf = global.requestAnimationFrame(frame);
  }
  function startRuntime() {
    if (state.running) return;
    if (!state.app) fail('No gxtkApp exists. Call bb_Init(), bb_Main(), and app.InvokeOnCreate() first.');
    if (state.manualTime !== null) fail('The runtime is in manual-clock mode. Call useRealtimeRuntime() before starting.');
    state.running = true; state.lastFrame = null; state.raf = global.requestAnimationFrame(frame);
  }
  function stopRuntime() { state.running = false; if (state.raf !== null) global.cancelAnimationFrame(state.raf); state.raf = null; }
  function advanceRuntime(milliseconds) {
    if (state.running) fail('Stop the animation loop before advancing the manual clock.');
    if (!(milliseconds >= 0) || !Number.isFinite(milliseconds)) fail('advanceRuntime requires a finite nonnegative millisecond duration.');
    if (state.manualTime === null) state.manualTime = perfNow();
    const end = state.manualTime + milliseconds;
    while (state.manualTime < end) {
      const app = state.app;
      const interval = 1000 / effectiveFrameRate();
      state.manualTime = Math.min(end, state.manualTime + interval);
      if (app) app.OnEnterFrame();
    }
  }
  function stepRuntime(ticks = 1) {
    if (!Number.isInteger(ticks) || ticks < 0) fail('stepRuntime requires a nonnegative integer tick count.');
    if (state.running) fail('Stop the animation loop before stepping the manual clock.');
    for (let tick = 0; tick < ticks; tick++) {
      const app = state.app;
      if (state.manualTime === null) state.manualTime = perfNow();
      state.manualTime += 1000 / effectiveFrameRate();
      if (app) app.OnEnterFrame();
    }
  }
  function useRealtimeRuntime() {
    if (state.manualTime !== null) {
      const difference = perfNow() - state.manualTime;
      if (state.app) state.app.startMillis += difference;
      if (state.movie && state.movie.start !== null) state.movie.start += difference;
      state.manualTime = null;
    }
  }
  async function bootRuntime(options = {}) {
    configureRuntime(options); await preloadRuntimeAssets();
    mochiMain();
    if (typeof options.create === 'function') options.create();
    else { global.bb_Init(); global.bb_Main(); }
    if (!state.app) fail('The game did not create its gxtkApp.');
    state.app.InvokeOnCreate(); state.app.InvokeOnRender();
    if (options.autostart !== false) startRuntime();
    return state.app;
  }
  function getRuntimeStatus() {
    const movieAssets = {};
    for (const [name, movie] of Object.entries(state.movies)) {
      const images = new Set((movie.frames || []).filter(frame => frame.image).map(frame => frame.image));
      movieAssets[name] = { retainedImages: images.size,
        decodedPixels: [...images].reduce((sum, image) => sum + image.width * image.height, 0),
        retainedSoundBuffers: (movie.sounds || []).filter(sound => sound.buffer).length };
    }
    return { running: state.running, milliseconds: state.app ? state.app.MilliSecs() : 0,
      updateRate: state.app && state.app.updateRate, stageFrameRate: effectiveFrameRate(), loading: state.app && state.app.loading,
      audioState: state.audioContext ? state.audioContext.state : 'uninitialized',
      movie: state.movie && state.movie.name, movieLoading: !!(state.movie && state.movie.loading), movieAssets,
      cachedImagePromises: state.imagePromises.size, mochiState: state.mochiState, diagnostics };
  }

  const api = { configure: configureRuntime, preload: preloadRuntimeAssets, boot: bootRuntime,
    start: startRuntime, stop: stopRuntime, advance: advanceRuntime, step: stepRuntime, useRealtime: useRealtimeRuntime,
    unlockAudio: unlockRuntimeAudio, getStatus: getRuntimeStatus, diagnostics, closeMochiScores,
    get app() { return state.app; }, get canvas() { return state.canvas; } };
  Object.assign(global, {
    ZTPRuntime: api, configureRuntime, preloadRuntimeAssets, bootRuntime, startRuntime, stopRuntime,
    advanceRuntime, stepRuntime, useRealtimeRuntime, unlockRuntimeAudio, getRuntimeStatus,
    gxtkApp, gxtkGraphics, gxtkSurfaceListener, gxtkSurface, gxtkInput, gxtkAudio, gxtkSample, gxtkChannel,
    KeyToChar, SetCursor, Redirect, ReadInt, WriteInt, FlushInts, PlayMovie, EndMovie, MovieFinished,
    mochiMain, FetchMochi, ShowMochi: zero, HideMochi: zero, ShowMochiScores,
    HideMochiScores: closeMochiScores, MochiState: () => state.mochiState,
    GetMochi, PutMochi, PollMochi, BeginMochi: zero, TrackMochi: zero, EndMochi: zero,
    MochiName: () => '', ReadMochi, WriteMochi, PingMochi: zero, InviteMochi: ShareMochi, PostMochi: ShareMochi
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
