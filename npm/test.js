import * as AKDATA from './akdata.esm.js';

console.log("- 请在akdata.js中指定游戏数据路径");
console.log("- 当前AKDATA.GameDataRoot = ", AKDATA.GameDataRoot);

var charId = "char_4039_horn";
var skillId = "skchr_horn_3";
var options = { "cond": true };

//var dps = new AKDATA.Dps.DpsCalculator();
//dps.calculateDps({ charId, skillId });
var result = AKDATA.Attributes.calculateDps({ charId, skillId, skillLevel: 9, options }, null, null);
//console.log("----- DPSv2 result -----");
//console.log(dps.summary);
console.log("----- old-DPS (attributes) result -----");
console.log(result);
