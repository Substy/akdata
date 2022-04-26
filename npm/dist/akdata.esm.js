"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.professionNames = exports.new_op = exports.Attributes = exports.Data = exports.GameDataRoot = undefined;

var _loaderEsm = require("./loader.esm.js");

var loader = _interopRequireWildcard(_loaderEsm);

var _attributes = require("./attributes.js");

var Attributes = _interopRequireWildcard(_attributes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var GameDataRoot = exports.GameDataRoot = "../resources/gamedata";
//import * as Dps from "./dpsv2.js";
//import * as Actions from "./dps_actions.js";

loader.loadGameData(GameDataRoot);
loader.patchAllChars();
var _d = loader.Data;

var new_op = ["char_4039_horn", "char_4040_rockr", "char_4045_heidi", "char_4041_chnut"];

var professionNames = {
    "PIONEER": "先锋",
    "WARRIOR": "近卫",
    "SNIPER": "狙击",
    "TANK": "重装",
    "MEDIC": "医疗",
    "SUPPORT": "辅助",
    "CASTER": "术师",
    "SPECIAL": "特种"
    //  "TOKEN": "召唤物",
    //  "TRAP": "装置",
};

// export { _d as Data, Dps, Actions, Attributes, new_op, professionNames };
exports.Data = _d;
exports.Attributes = Attributes;
exports.new_op = new_op;
exports.professionNames = professionNames;