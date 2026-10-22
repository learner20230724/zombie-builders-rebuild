'use strict';
const fs = require('node:fs');
const path = require('node:path');
const GameConfig = require('../src/game-config.js');
const ROOT = path.resolve(__dirname, '..');
const NAMES = ['units', 'zombies', 'buildings', 'powers', 'levels'];

function loadConfiguration(root = ROOT) {
  const documents = Object.fromEntries(NAMES.map(name => {
    const file = path.join(root, 'config', name + '.json');
    try { return [name, JSON.parse(fs.readFileSync(file, 'utf8'))]; }
    catch (error) { throw new Error(`config/${name}.json: ${error.message}`); }
  }));
  return GameConfig.fromDocuments(documents);
}
function checkConfig(root = ROOT) {
  const config = loadConfiguration(root);
  GameConfig.validate(config);
  return {passed:true, configurationFiles:NAMES.map(name => `config/${name}.json`),
    units:config.units.length, zombies:config.zombies.length,
    buildings:config.buildings.length, powers:config.powers.length, levels:config.levels.length};
}
if (require.main === module) console.log(JSON.stringify(checkConfig(), null, 2));
module.exports = {loadConfiguration, checkConfig};
