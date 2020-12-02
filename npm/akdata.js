import * as loader from "./loader.js";
import * as Dps from "./dpsv2.js";
import * as Actions from "./dps_actions.js";
import * as Attributes from "./attributes.js";

export const GameDataRoot = "../resources/gamedata";
loader.loadGameData(GameDataRoot);
loader.patchAllChars();
var _d = loader.Data;

export { _d as Data, Dps, Actions, Attributes };
