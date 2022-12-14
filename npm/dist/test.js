"use strict";

var _akdataEsm = require("./akdata.esm.js");

var AKDATA = _interopRequireWildcard(_akdataEsm);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

console.log("- 请在akdata.js中指定游戏数据路径");
console.log("- 当前AKDATA.GameDataRoot = ", AKDATA.GameDataRoot);

var charId = "char_4039_horn";
var skillId = "skchr_horn_3";
var options = { "cond": true };

//var dps = new AKDATA.Dps.DpsCalculator();
//dps.calculateDps({ charId, skillId });
var result = AKDATA.Attributes.calculateDps({ charId: charId, skillId: skillId, skillLevel: 9, options: options }, null, null);
//console.log("----- DPSv2 result -----");
//console.log(dps.summary);
console.log("----- old-DPS (attributes) result -----");
console.log(result);