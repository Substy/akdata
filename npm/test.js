import * as AKDATA from "./akdata.js";

console.log("- 请在akdata.js中指定游戏数据路径");
console.log("- 当前AKDATA.GameDataRoot = ", AKDATA.GameDataRoot);

var charId = "char_185_frncat";
var skillId = "skchr_frncat_2";

var dps = new AKDATA.Dps.DpsCalculator();
dps.calculateDps({ charId, skillId });
var result = AKDATA.Attributes.calculateDps({ charId, skillId }, null, null);
console.log("----- DPSv2 result -----");
console.log(dps.summary);
console.log("----- old-DPS (attributes) result -----");
console.log(result);
