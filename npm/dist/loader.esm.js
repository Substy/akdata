"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Data = undefined;
exports.loadJSON = loadJSON;
exports.loadData = loadData;
exports.loadExcel = loadExcel;
exports.loadGameData = loadGameData;
exports.patchChar = patchChar;
exports.patchAllChars = patchAllChars;

var _fs = require("fs");

var fs = _interopRequireWildcard(_fs);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var Data = exports.Data = {};

function loadJSON(pathname, key) {
  console.log("parsing " + pathname + " -> " + key);
  Data[key] = JSON.parse(fs.readFileSync(pathname, "utf-8"));
}

function loadData(key) {
  loadJSON("./customdata/" + key + ".json", key);
}

// basepath 指向游戏数据根目录(有名为excel的下级目录的)
function loadExcel(key, base) {
  loadJSON(base + "/excel/" + key + ".json", key);
}

loadJSON("./version.json", "version");
loadData("dps_options");
loadData("dps_specialtags");
loadData("dps_specialtags_v2");
loadData("dps_anim");

function loadGameData(basepath) {
  loadExcel("character_table", basepath);
  loadExcel("char_patch_table", basepath);
  loadExcel("skill_table", basepath);
  loadExcel("uniequip_table", basepath);
  loadExcel("battle_equip_table", basepath);
}

function patchChar(charId, patchId, suffix) {
  if (!Data.character_table[charId]) {
    Data.character_table[charId] = Data.char_patch_table["patchChars"][patchId];
    Data.character_table[charId].name += suffix;
    console.log("patch char", charId);
  }
}

function patchAllChars() {
  patchChar("char_1001_amiya2", "char_1001_amiya2", "（近卫 Ver.）");
}