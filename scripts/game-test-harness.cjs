/* A real-game, headless platform harness. Only display/audio/input/storage are
 * substituted; every gameplay method comes from the generated AS3 port. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function createHarness(options = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/manifest.json')));
  let milliseconds = 0;
  const storage = options.storage || new Map();
  const writes = [], sounds = [], movies = [], draws = [];
  const inputState = {x: 0, y: 0, down: new Set(), hits: new Map()};
  const drawing = new Proxy({
    Width: () => 800, Height: () => 600,
    LoadSurface(name) {
      const image = manifest.images[name];
      assert.ok(image, 'Image missing from recovered manifest: ' + name);
      return {name, Width: () => image.width, Height: () => image.height};
    },
  }, {get: (target, key) => target[key] || ((...args) => {if (options.recordDraws) draws.push([key, ...args]); return 0;})});
  const inputKey = key => key === 224 ? 1 : key;
  const input = {
    BeginUpdate() {},
    EndUpdate() {inputState.hits.clear();},
    OnKeyDown(key) {
      if (key > 0 && key < 256 && !inputState.down.has(key)) {
        inputState.down.add(key);
        inputState.hits.set(key, ((inputState.hits.get(key) || 0) + 1) & 255);
      }
    },
    OnKeyUp(key) {if (key > 0 && key < 256) inputState.down.delete(key);},
    OnMouseMove(x, y) {inputState.x = x; inputState.y = y;},
    ReleaseAll() {inputState.down.clear();},
    KeyDown: key => key > 0 && key < 256 && inputState.down.has(inputKey(key)) ? 1 : 0,
    // AS3/runtime KeyHit is a read, not a consume operation. All hits expire
    // once at EndUpdate, including keys that gameplay did not query that frame.
    KeyHit: key => key > 0 && key < 256 ? inputState.hits.get(inputKey(key)) || 0 : 0,
    MouseX: () => inputState.x, MouseY: () => inputState.y,
  };
  const audio = {
    LoadSample: name => ({name}),
    PlaySample: (sample, flags) => {const channel = {sample, flags}; sounds.push(channel); return channel;},
    StopChannel: channel => {if (channel) channel.stopped = true; return 0;},
  };
  class App {
    constructor() {this.loading = 0; this.updateRate = 0;}
    GraphicsDevice() { return drawing; }
    InputDevice() { return input; }
    AudioDevice() { return audio; }
    SetUpdateRate(rate) { this.updateRate = rate; return 0; }
    MilliSecs() { return milliseconds | 0; }
    InvokeOnCreate() {this.OnCreate(); return 0;}
    InvokeOnUpdate() {
      input.BeginUpdate();
      try {this.OnUpdate();} finally {input.EndUpdate();}
      return 0;
    }
    InvokeOnRender() {
      drawing.BeginRender();
      try {this.loading ? this.OnLoading() : this.OnRender();} finally {drawing.EndRender();}
      return 0;
    }
    OnEnterFrame() {
      if (this.updateRate && !this.loading) this.InvokeOnUpdate();
      this.InvokeOnRender();
    }
  }
  const context = vm.createContext({
    console, gxtkApp: App, gxtkSurfaceListener: class {},
    ReadInt: (namespace, key) => storage.get(namespace + ':' + key) || 0,
    WriteInt: (namespace, key, value) => {storage.set(namespace + ':' + key, value); writes.push({namespace, key, value}); return 0;},
    FlushInts: namespace => {writes.push({namespace, flush: true}); return 0;},
    PlayMovie: name => {movies.push(name); return 0;}, MovieFinished: () => 1, EndMovie: () => 0,
    ShowMochi: () => 0, ShowMochiScores: () => 0, HideMochiScores: () => 0,
    MochiState: () => 0, Redirect: () => 0,
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/generated-game.js'), 'utf8'), context);
  context.bb_Init();
  context.bb_Main();
  const device = context.ZTPGamePort.state.bb_mojo_app_device;
  device.InvokeOnCreate();
  device.InvokeOnUpdate();
  const game = context.ZTPGamePort.state.bb_Game;
  return {
    context, game, device, storage, writes, sounds, movies, draws, input, inputState,
    renderEachFrame: !!options.renderEachFrame,
    setMillis(value) {milliseconds = value;},
    getMillis() {return milliseconds;},
    // The default remains an update-only unit-test clock. Campaign simulations
    // must opt into full original frames: one update THEN one render, per tick.
    tick(count = 1) {for (let i = 0; i < count; i++) {
      milliseconds += 1000 / 60;
      if (options.renderEachFrame) device.OnEnterFrame(); else device.InvokeOnUpdate();
    }},
    gameTick(count = 1) {for (let i = 0; i < count; i++) game.bbGameTick(0);},
    draw() {device.InvokeOnRender();},
    read(expression) {return vm.runInContext(expression, context);},
    count(list) {let count = 0; const iterator = list.bbObjectEnumerator(); while (iterator.bbHasNext()) {iterator.bbNextObject(); count++;} return count;},
  };
}
module.exports = {createHarness};
