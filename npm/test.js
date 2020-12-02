var AKDATA = require("./akdata");
AKDATA.patchAllChars();

var charId = "char_185_frncat";
var skillId = 'skchr_frncat_2';

var dps = new AKDATA.Dps.DpsCalculator();
dps.calculateDps({ charId, skillId });
var result = AKDATA.Attributes.calculateDps({ charId, skillId }, null, null);
console.log("----- DPSv2 result -----");
console.log(dps.summary);
console.log("----- old-DPS (attributes) result -----");
console.log(result);
