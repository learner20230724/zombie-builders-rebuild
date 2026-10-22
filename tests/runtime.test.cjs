const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(options = {}) {
  const calls = [];
  function context() {
    return new Proxy({ imageSmoothingEnabled: true }, {
      get(target, key) {
        if (key in target) return target[key];
        return (...args) => calls.push([key, ...args]);
      }
    });
  }
  class Canvas {
    constructor(width = 800, height = 600) { this.width = width; this.height = height; this.style = {}; this.context = context(); }
    getContext() { return this.context; }
    setAttribute() {}
  }
  const storage = new Map();
  const sources = [];
  const audioContexts = [];
  const audioElements = [], timers = new Map();
  let nextTimer = 1;
  class Audio {
    constructor(src) { this.src = src; this.events = {}; this.playCount = 0; this.pauseCount = 0; audioElements.push(this); }
    addEventListener(type, callback) { this.events[type] = callback; }
    play() { this.playCount++; return options.play ? options.play(this) : Promise.resolve(); }
    pause() { this.pauseCount++; }
  }
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 10; this.destination = {}; audioContexts.push(this); }
    async decodeAudioData() { return { duration: 2 }; }
    async resume() { this.state = 'running'; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    createBufferSource() {
      const source = { connect() {}, start(...args) { this.startArgs = args; }, stop(...args) { this.stopArgs = args; } };
      sources.push(source); return source;
    }
  }
  class Image {
    constructor() { this.width = this.naturalWidth = 64; this.height = this.naturalHeight = 32; }
    set src(value) { this._src = value; queueMicrotask(() => this.onload()); }
    get src() { return this._src; }
  }
  const sandbox = {
    console: { warn() {}, error() {} }, performance: { now: () => 1000 },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    OffscreenCanvas: Canvas, AudioContext, Audio, Image, queueMicrotask, setTimeout, clearTimeout,
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    URL, requestAnimationFrame: () => 1, cancelAnimationFrame() {}
  };
  if (options.noWebAudio) delete sandbox.AudioContext;
  if (options.manualTimers) {
    sandbox.setTimeout = (callback, delay) => { const id = nextTimer++; timers.set(id, { callback, delay }); return id; };
    sandbox.clearTimeout = id => timers.delete(id);
  }
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/runtime.js'), 'utf8'), sandbox);
  const canvas = new Canvas(); sandbox.configureRuntime({ canvas });
  return { sandbox, canvas, calls, storage, sources, audioContexts, audioElements, timers,
    fireTimers() { const pending = [...timers.values()]; timers.clear(); for (const timer of pending) timer.callback(); },
    run: code => vm.runInContext(code, sandbox) };
}

test('input preserves key-hit counts until EndUpdate, including quick clicks', () => {
  const h = harness(), input = new h.sandbox.gxtkInput();
  input.OnKeyDown(1); input.OnKeyDown(1);
  assert.equal(input.KeyHit(1), 1); assert.equal(input.KeyDown(224), 1);
  input.OnKeyUp(1); input.OnKeyDown(1);
  assert.equal(input.KeyHit(224), 2);
  input.EndUpdate(); assert.equal(input.KeyHit(1), 0); assert.equal(input.KeyDown(1), 1);
  input.OnKeyUp(1); assert.equal(input.KeyDown(1), 0);
  for (let i = 0; i < 40; i++) input.PutChar(65 + i);
  assert.equal(input.charPut, 32);
  assert.equal(input.GetChar(), 65);
  input.OnMouseMove(123.5, 234.75); assert.equal(input.TouchX(0), 123.5); assert.equal(input.MouseY(), 234.75);
});

test('DrawPoint uses the original setPixel int coercion, including negative fractional coordinates', () => {
  const h = harness(), app = new h.sandbox.gxtkApp(), graphics = app.GraphicsDevice();
  graphics.BeginRender(); graphics.DrawPoint(-0.75, -0.25); graphics.DrawPoint(2.9, 3.7); graphics.EndRender();
  const fills = h.calls.filter(call => call[0] === 'fillRect');
  assert.deepEqual(fills.map(call => call.slice(1)), [[0, 0, 1, 1], [2, 3, 1, 1]]);
});

test('untransformed surface destinations truncate like native copyPixels Point samples', () => {
  const h = harness(), app = new h.sandbox.gxtkApp(), graphics = app.GraphicsDevice();
  const surface = new h.sandbox.gxtkSurface();
  surface._loaded({image: {width: 4, height: 4}, width: 4, height: 4});
  graphics.BeginRender();
  graphics.DrawSurface(surface, -0.25, -0.75);
  graphics.DrawSurface(surface, -1.25, 2.99);
  graphics.DrawSurface2(surface, 0.5, -0.5, 0, 0, 4, 4);
  graphics.DrawSurface2(surface, 2.99, 2.01, 0, 0, 3, 3);
  graphics.EndRender();
  const draws = h.calls.filter(call => call[0] === 'drawImage').map(call => call.slice(2));
  // Normalize negative zero only for a readable call-level assertion; the
  // separate real-Canvas native-oracle test compares every resulting pixel.
  assert.deepEqual(draws.map(args => args.map(v => Object.is(v, -0) ? 0 : v)),
    [[0, 0], [-1, 2], [0, 0, 4, 4, 0, 0, 4, 4], [0, 0, 3, 3, 2, 2, 3, 3]]);
});

test('DrawSurface2 coerces the four source rectangle arguments to original AS3 int parameters', () => {
  const h = harness(), app = new h.sandbox.gxtkApp(), graphics = app.GraphicsDevice();
  const surface = new h.sandbox.gxtkSurface();
  surface._loaded({image: {width: 8, height: 8}, width: 8, height: 8});
  graphics.BeginRender();
  graphics.DrawSurface2(surface, 0, 0, 1.9, -1.9, 2.9, 3.9);
  const draws = h.calls.filter(call => call[0] === 'drawImage');
  assert.deepEqual(draws[0].slice(2), [1, -1, 2, 3, 0, 0, 2, 3]);
  const before = draws.length;
  assert.equal(graphics.DrawSurface2(surface, 0, 0, 0, 0, .75, 3), 0);
  assert.equal(graphics.DrawSurface2(surface, 0, 0, 0, 0, 4, NaN), 0);
  assert.equal(h.calls.filter(call => call[0] === 'drawImage').length, before);
  graphics.SetMatrix(2, 0, 0, 2, 1, 1);
  graphics.DrawSurface2(surface, 0, 0, 4294967297.9, -1.9, 4294967298.9, 4294967299.9);
  assert.equal(surface.fragments.size, 1);
  assert.ok(surface.fragments.has('1,-1,2,3'));
  assert.equal(surface.scratch.width, 2); assert.equal(surface.scratch.height, 3);
  graphics.EndRender();
});

test('identity DrawRect rounds each boundary ties-to-even and does not antialias fractional extents', () => {
  const h = harness(), app = new h.sandbox.gxtkApp(), graphics = app.GraphicsDevice();
  graphics.BeginRender();
  for(const rect of [[.25,.75,2.5,3.5],[-.25,-.75,3.5,4.5],[.75,1.25,.5,2.5],
    [.5,.5,2,2],[-.5,-.5,2,2],[1.5,2.5,1,1],[.5,.5,1.5,2.5]])graphics.DrawRect(...rect);
  assert.deepEqual(h.calls.filter(call => call[0] === 'fillRect').map(call => call.slice(1)),
    [[0,1,3,3],[0,-1,3,5],[0,0,2,2],[0,0,2,2],[0,0,2,3]]);
  graphics.SetMatrix(2, 0, 0, 2, 1, 1);
  graphics.DrawRect(.5, .5, 1.5, 2.5);
  assert.deepEqual(h.calls.filter(call => call[0] === 'fillRect').at(-1).slice(1), [.5,.5,1.5,2.5],
    'The matrix branch is native BitmapData.draw, not identity fillRect rounding');
  graphics.EndRender();
});

test('SharedObject integer groups and generic app state persist independently', () => {
  const h = harness();
  h.sandbox.WriteInt('ZTPBestScores', '0', 1234);
  h.sandbox.WriteInt('OtherScores', '0', 5678);
  assert.equal(h.sandbox.ReadInt('ZTPBestScores', '0'), 1234);
  assert.equal(h.sandbox.ReadInt('OtherScores', '0'), 5678);
  assert.equal(h.sandbox.ReadInt('ZTPBestScores', '3'), 0);
  const app = new h.sandbox.gxtkApp();
  assert.equal(app.LoadState(), ''); app.SaveState('full save string');
  assert.equal(app.LoadState(), 'full save string'); assert.equal(h.storage.size, 3);
});

test('preloaded surface dimensions are synchronous and transformed crops isolate atlas pixels', async () => {
  const h = harness();
  h.sandbox.configureRuntime({ assets: { 'atlas.png': { src: '/atlas.png', type: 'image/png' } } });
  await h.sandbox.preloadRuntimeAssets();
  const app = new h.sandbox.gxtkApp(), g = app.GraphicsDevice();
  const surface = g.LoadSurface('atlas.png', null);
  assert.equal(surface.Width(), 64); assert.equal(surface.Height(), 32); assert.equal(surface.Loaded(), 1);
  assert.equal(app.Loading(), 0);
  g.BeginRender(); g.SetMatrix(2, 0, 0, 2, 5, 7);
  assert.equal(g.DrawSurface(surface, 10, 0), -1);
  assert.equal(g.DrawSurface2(surface, 0, 0, 1, 2, 8, 9), 0);
  assert.equal(surface.scratch.width, 8); assert.equal(surface.scratch.height, 9);
  const firstFragment = surface.scratch;
  g.DrawSurface2(surface, 0, 0, 5, 6, 10, 11);
  g.DrawSurface2(surface, 0, 0, 1, 2, 8, 9);
  assert.equal(surface.scratch, firstFragment);
  assert.equal(surface.fragments.size, 2);
  assert.equal(h.sandbox.getRuntimeStatus().diagnostics.cropCache.hits, 1);
  assert.ok(h.calls.some(call => call[0] === 'setTransform' && call[1] === 2 && call[5] === 5));
  g.Cls(1, 2, 3); g.EndRender();
  assert.equal(h.sandbox.getRuntimeStatus().diagnostics.drawCalls, 4);
});

test('audio honors Flash repeat count and resumes a suspended track at its elapsed offset', async () => {
  const h = harness();
  h.sandbox.configureRuntime({ assets: { 'music.mp3': { src: '/music.mp3', type: 'audio/mpeg' } } });
  await h.sandbox.preloadRuntimeAssets();
  const app = new h.sandbox.gxtkApp();
  const channel = app.AudioDevice().PlaySample(app.AudioDevice().LoadSample('music.mp3'), 2);
  assert.equal(h.sources.length, 1); assert.equal(h.sources[0].loop, true);
  assert.deepEqual(h.sources[0].startArgs, [10, 0]);
  assert.deepEqual(h.sources[0].stopArgs, [16]); // initial play plus 2 repeats, each 2 s.
  app.AudioDevice().StopChannel(channel); assert.equal(channel.stopped, true);
  assert.equal(h.sandbox.getRuntimeStatus().diagnostics.audioPending, 0);
  h.audioContexts[0].state = 'suspended';
  app.SetUpdateRate(60);
  const delayed = app.AudioDevice().PlaySample(app.AudioDevice().LoadSample('music.mp3'), 0);
  assert.equal(delayed.started, false); assert.equal(h.sandbox.getRuntimeStatus().diagnostics.audioPending, 1);
  h.sandbox.stepRuntime(30);
  await h.sandbox.unlockRuntimeAudio();
  assert.equal(delayed.started, true);
  assert.ok(Math.abs(h.sources[1].startArgs[1] - 0.5) < 0.001);
});

test('movie completion and game updates share a testable millisecond clock', async () => {
  const h = harness();
  h.sandbox.configureRuntime({ movies: { splash: { width: 64, height: 32, scale: 1.478, frameRate: 30,
    finishAt: 100, frames: [{ src: '/frame.png', duration: 200 }] } } });
  await h.sandbox.preloadRuntimeAssets();
  h.run(`class TestApp extends gxtkApp {
    constructor() { super(); this.updates = 0; this.renders = 0; this.SetUpdateRate(30); }
    OnUpdate() { this.updates++; }
    OnRender() { this.renders++; }
  }; globalThis.testApp = new TestApp(); PlayMovie('splash');`);
  assert.equal(h.sandbox.MovieFinished(), 0);
  h.sandbox.stepRuntime(2);
  assert.equal(h.sandbox.testApp.updates, 2); assert.equal(h.sandbox.testApp.renders, 2);
  assert.equal(h.sandbox.MovieFinished(), 0);
  h.sandbox.advanceRuntime(35); assert.equal(h.sandbox.MovieFinished(), 1);
  h.sandbox.EndMovie(); assert.equal(h.sandbox.MovieFinished(), 0);
  assert.ok(h.sandbox.testApp.MilliSecs() >= 100);
});

test('offline leaderboard retains submissions and closes through original Mochi state contract', () => {
  const h = harness(); new h.sandbox.gxtkApp();
  h.sandbox.ShowMochiScores('original-board', 12345 * 16 + 2);
  assert.equal(h.sandbox.MochiState(), 1);
  assert.ok([...h.storage.values()].some(value => value.includes('12345')));
  h.sandbox.HideMochiScores(); assert.equal(h.sandbox.MochiState(), 0);
  h.sandbox.ShowMochiScores('original-board', 0); assert.equal(h.sandbox.MochiState(), 0);
});

test('releaseAfterPlay frees only its movie handles and repeat playback reloads behind the loading gate', async () => {
  const h = harness();
  const frame = { src: '/shared-frame.png', duration: 100 };
  h.sandbox.configureRuntime({ movies: {
    splash: { frames: [frame], releaseAfterPlay: true },
    retained: { frames: [frame], releaseAfterPlay: false }
  } });
  await h.sandbox.preloadRuntimeAssets();
  const app = new h.sandbox.gxtkApp();
  assert.equal(h.sandbox.getRuntimeStatus().movieAssets.splash.retainedImages, 1);
  h.sandbox.PlayMovie('splash'); h.sandbox.EndMovie();
  const released = h.sandbox.getRuntimeStatus();
  assert.equal(released.movieAssets.splash.retainedImages, 0);
  assert.equal(released.movieAssets.retained.retainedImages, 1);
  assert.equal(released.cachedImagePromises, 1); // The second movie still owns this same URL.
  h.sandbox.PlayMovie('splash');
  assert.equal(app.Loading(), 1); assert.equal(h.sandbox.MovieFinished(), 0);
  assert.equal(h.sandbox.getRuntimeStatus().movieLoading, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.Loading(), 0); assert.equal(h.sandbox.getRuntimeStatus().movieLoading, false);
  assert.equal(h.sandbox.getRuntimeStatus().movieAssets.splash.retainedImages, 1);
  h.sandbox.EndMovie(); h.sandbox.PlayMovie('retained'); h.sandbox.EndMovie();
  assert.equal(h.sandbox.getRuntimeStatus().movieAssets.retained.retainedImages, 1);
  assert.equal(app.Loading(), 0);
});

test('HTML audio delayed start is idempotent across unlocks and stop cancels its timer', async () => {
  const h = harness({ noWebAudio: true, manualTimers: true });
  const channel = new h.sandbox.gxtkChannel(new h.sandbox.gxtkSample({ src: '/effect.wav', ready: true }), 0);
  channel.delay = 1000;
  channel._start(); channel._start(); channel._start();
  assert.equal(h.audioElements.length, 1); assert.equal(h.timers.size, 1); assert.equal(h.audioElements[0].playCount, 0);
  channel.stop(); channel._start();
  assert.equal(h.timers.size, 0); h.fireTimers();
  assert.equal(h.audioElements[0].playCount, 0); assert.equal(channel.stopped, true);
});

test('HTML audio pending promises, autoplay retries, and stop-before-resolution cannot duplicate playback', async () => {
  let resolvePlay;
  const h = harness({ noWebAudio: true, manualTimers: true,
    play: () => new Promise(resolve => { resolvePlay = resolve; }) });
  const channel = new h.sandbox.gxtkChannel(new h.sandbox.gxtkSample({ src: '/effect.wav', ready: true }), 0);
  channel._start(); channel._start(); channel._start();
  assert.equal(h.audioElements[0].playCount, 1); assert.equal(channel.pendingPlay, true);
  channel.stop(); resolvePlay(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(channel.started, false); assert.ok(h.audioElements[0].pauseCount >= 1);

  let blocked = true;
  const retry = harness({ noWebAudio: true, play: () => blocked
    ? Promise.reject(Object.assign(new Error('Gesture required'), { name: 'NotAllowedError' })) : Promise.resolve() });
  const retried = new retry.sandbox.gxtkChannel(new retry.sandbox.gxtkSample({ src: '/effect.wav', ready: true }), 1);
  retried._start(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(retried.started, false); assert.equal(retried.pendingPlay, false);
  assert.equal(retry.sandbox.getRuntimeStatus().diagnostics.errors.length, 0);
  blocked = false; retried._start(); retried._start(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(retry.audioElements.length, 1); assert.equal(retry.audioElements[0].playCount, 2); assert.equal(retried.started, true);
  retry.audioElements[0].events.ended(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(retry.audioElements[0].playCount, 3); // One repeat after the successful initial play.
  retry.audioElements[0].events.ended(); assert.equal(retried.stopped, true);
});
