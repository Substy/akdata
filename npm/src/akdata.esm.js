import * as loader from "./loader.esm.js";
//import * as Dps from "./dpsv2.js";
//import * as Actions from "./dps_actions.js";
import * as Attributes from "./attributes.js";

export const GameDataRoot = "../resources/gamedata";
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
    "SPECIAL": "特种",
  //  "TOKEN": "召唤物",
  //  "TRAP": "装置",
};

// export { _d as Data, Dps, Actions, Attributes, new_op, professionNames };
export { _d as Data, Attributes, new_op, professionNames };
