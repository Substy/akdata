var fs = require("fs");

exports = module.exports = { Data: {} };

function loadJSON(pathname, key) {
    console.log(`parsing ${pathname} -> ${key}`);
    exports.Data[key] = JSON.parse(fs.readFileSync(pathname, "utf-8"));
}

function loadData(key) {
    loadJSON(`./customdata/${key}.json`, key);
}

function loadExcel(key) {
    loadJSON(`./gamedata/excel/${key}.json`, key);
}

loadJSON("./version.json", "version");
loadExcel("character_table");
loadExcel("char_patch_table");
loadExcel("skill_table");
loadData("dps_options");
loadData("dps_specialtags");

exports.patchChar = function (charId, patchId, suffix) {
    var data = exports.Data;
    if (!data.character_table[charId]) {
        data.character_table[charId] = data.char_patch_table["patchChars"][patchId];
        data.character_table[charId].name += suffix;
        console.log("patch char", charId);
      }
}

exports.patchAllChars = function () {
    exports.patchChar("char_1001_amiya2", "char_1001_amiya2", "（近卫 Ver.）");
}
