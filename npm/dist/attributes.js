"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateDpsSeries = exports.calculateDps = exports.getCharAttributes = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // generated with attributes.stub.js


var _loaderEsm = require("./loader.esm.js");

var Loader = _interopRequireWildcard(_loaderEsm);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

if (typeof AKDATA == "undefined") {
  global.AKDATA = Object.assign({}, Loader);
}

// attributes.js
// 获取技能特判标记，存放在dps_specialtags.json中
function checkSpecs(tag, spec) {
  var specs = AKDATA.Data.dps_specialtags;
  if (tag in specs && spec in specs[tag]) return specs[tag][spec];else return false;
}

function groupArray(arr, n) {
  var ret = [],
      i = 0;
  while (i < arr.length) {
    ret.push(arr.slice(i, i + n));
    i += n;
  }
  return ret;
}

function getCharAttributes(char) {
  checkChar(char);

  var _getAttributes = getAttributes(char, new Log()),
      basic = _getAttributes.basic,
      buffs = _getAttributes.buffs;

  var normalFrame = getBuffedAttributes(basic, buffs);
  return normalFrame;
}

function getTokenAtkHp(charAttr, tokenId, log) {
  var id = charAttr.char.charId;
  charAttr.char.charId = tokenId;
  var token = getAttributes(charAttr.char, log);
  // console.log(token);
  charAttr.basic.atk = token.basic.atk;
  charAttr.basic.def = token.basic.def;
  charAttr.basic.maxHp = token.basic.maxHp;
  charAttr.basic.baseAttackTime = token.basic.baseAttackTime;
  charAttr.basic.attackSpeed = token.basic.attackSpeed;
  charAttr.char.charId = id;
  log.write("[\u53EC\u5524\u7269] " + tokenId + " maxHp = " + charAttr.basic.maxHp + ", atk = " + charAttr.basic.atk + ", baseAttackTime = " + charAttr.basic.baseAttackTime);
}

function checkChar(char) {
  var charData = AKDATA.Data.character_table[char.charId];
  if (!('phase' in char)) char.phase = charData.phases.length - 1;
  if (!('level' in char)) char.level = charData.phases[char.phase].maxLevel;
  if (!('favor' in char)) char.favor = 200;
  if (!('skillLevel' in char)) char.skillLevel = 6;
  if (!('options' in char)) char.options = { cond: true, crit: true, token: false };
  if (!('potentialRank' in char)) char.potentialRank = 5;
}

var Log = function () {
  function Log() {
    _classCallCheck(this, Log);

    this.log = '';
    this.note = '';
  }

  _createClass(Log, [{
    key: "write",
    value: function write(line) {
      // 处理成markdown格式
      this.log += line.replace(/_/g, "\\_").replace(/\~/g, "_") + "\n";
    }
  }, {
    key: "writeNote",
    value: function writeNote(line) {
      if (this.note.indexOf(line) < 0) {
        this.log += "[注记] " + line + "\n";
        this.note += line + "\n";
      }
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.log;
    }
  }]);

  return Log;
}();

var NoLog = function () {
  function NoLog() {
    _classCallCheck(this, NoLog);
  }

  _createClass(NoLog, [{
    key: "write",
    value: function write(line) {/* console.log(line); */}
  }, {
    key: "writeNote",
    value: function writeNote(line) {}
  }, {
    key: "toString",
    value: function toString() {
      return "";
    }
  }]);

  return NoLog;
}();

// 天赋/技能名字cache


var displayNames = {};

function calculateDps(char, enemy, raidBuff) {
  var log = new Log();
  checkChar(char);
  enemy = enemy || {
    def: 0,
    magicResistance: 0,
    count: 1
  };
  raidBuff = raidBuff || { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
  // 把raidBuff处理成blackboard的格式
  var raidBlackboard = {
    atk: raidBuff.atkpct / 100,
    atk_override: raidBuff.atk,
    attack_speed: raidBuff.ats,
    sp_recovery_per_sec: raidBuff.cdr / 100,
    base_atk: raidBuff.base_atk / 100,
    damage_scale: 1 + raidBuff.damage_scale / 100
  };
  displayNames["raidBuff"] = "团辅";

  var charId = char.charId;
  var charData = AKDATA.Data.character_table[charId];
  var skillData = AKDATA.Data.skill_table[char.skillId];
  var equipData = {};
  if (char.equipId && char.equipId.length > 0) {
    equipData = AKDATA.Data.uniequip_table["equipDict"][char.equipId];
    displayNames[char.equipId] = equipData.uniEquipName;
  }
  if (char.skillLevel == -1) char.skillLevel = skillData.levels.length - 1;

  var levelData = skillData.levels[char.skillLevel];
  var blackboard = getBlackboard(skillData.levels[char.skillLevel].blackboard) || {};

  // calculate basic attribute package
  var attr = getAttributes(char, log);
  blackboard.id = skillData.skillId;
  attr.buffList["skill"] = blackboard;
  attr.skillId = blackboard.id;

  console.log(charData.name, levelData.name);
  log.write("| \u89D2\u8272 | \u7B49\u7EA7 | \u6280\u80FD | \u6A21\u7EC4 |");
  log.write("| :--: | :--: | :--: | :--: |");
  log.write("| ~" + charId + "~ - **" + charData.name + "**  | \u7CBE\u82F1 " + char.phase + ", \u7B49\u7EA7 " + char.level + ", \u6F5C\u80FD " + (char.potentialRank + 1) + " | " + levelData.name + ", \u7B49\u7EA7 " + (char.skillLevel + 1) + " | " + equipData.uniEquipName + " |");
  displayNames[charId] = charData.name;
  displayNames[char.skillId] = levelData.name; // add to name cache

  if (char.options.token && (checkSpecs(charId, "token") || checkSpecs(char.skillId, "token"))) {
    log.write("\n");
    log.writeNote("**召唤物dps，非本体**");
    var tokenId = checkSpecs(charId, "token") || checkSpecs(char.skillId, "token");
    getTokenAtkHp(attr, tokenId, log);
  }

  // 原本攻击力的修正量
  if (raidBlackboard.base_atk != 0) {
    var delta = attr.basic.atk * raidBlackboard.base_atk;
    var prefix = delta > 0 ? "+" : "";
    attr.basic.atk = Math.round(attr.basic.atk + delta);
    log.write("[\u56E2\u8F85] \u539F\u672C\u653B\u51FB\u529B\u53D8\u4E3A " + attr.basic.atk + " (" + prefix + delta.toFixed(1) + ")");
  }

  var _backup = {
    basic: _extends({}, attr.basic)
    //	enemy: {...enemy},
    //	chr: {...charData},
    //	level: {...levelData}
  };
  var _note = "";
  var normalAttack = null;
  var skillAttack = null;

  if (!checkSpecs(char.skillId, "overdrive")) {
    // 正常计算
    log.write("- **\u6280\u80FD**\n");
    skillAttack = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
    if (!skillAttack) return;
    _note = "" + log.note;

    log.write("----");
    attr.basic = _backup.basic;
    //  enemy = _backup.enemy;
    //  charData = _backup.chr;
    //  levelData = _backup.level;

    log.write("- **\u666E\u653B**\n");
    normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
    if (!normalAttack) return;
  } else {
    // 22.4.15 过载模式计算
    log.write("- **\u6280\u80FD\u524D\u534A**\n");
    var od_p1 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
    //_note = `${log.note}`;

    log.write("----");
    log.write("- **\u8FC7\u8F7D**\n");
    attr.basic = Object.assign({}, _backup.basic);
    attr.char.options.overdrive_mode = true; // 使用options控制，这个options不受UI选项影响
    var od_p2 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
    _note = "" + log.note;

    // merge result
    var merged = Object.assign({}, od_p2);
    merged.dur = Object.assign({}, od_p2.dur);
    ["totalDamage", "totalHeal", "extraDamage", "extraHeal"].forEach(function (key) {
      merged[key] += od_p1[key];
    });
    for (var i = 0; i < merged.damagePool.length; ++i) {
      merged.damagePool[i] += od_p1.damagePool[i];
      merged.extraDamagePool[i] += od_p1.extraDamagePool[i];
    }
    ["attackCount", "hitCount", "duration", "stunDuration", "prepDuration"].forEach(function (key) {
      merged.dur[key] += od_p1.dur[key];
    });
    var tm = merged.dur.duration + merged.dur.stunDuration + merged.dur.prepDuration;
    merged.dps = merged.totalDamage / tm;
    merged.hps = merged.totalHeal / tm;
    skillAttack = merged;

    log.write("----");
    log.write("- **\u666E\u653B**\n");
    attr.basic = Object.assign({}, _backup.basic);
    attr.char.options.overdrive_mode = false;
    normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
    if (!normalAttack) return;
  }

  var globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / (normalAttack.dur.duration + normalAttack.dur.stunDuration + skillAttack.dur.duration + skillAttack.dur.prepDuration));
  var globalHps = Math.round((normalAttack.totalHeal + skillAttack.totalHeal) / (normalAttack.dur.duration + normalAttack.dur.stunDuration + skillAttack.dur.duration + skillAttack.dur.prepDuration));
  //console.log(globalDps, globalHps);
  var killTime = 0;
  return {
    normal: normalAttack,
    skill: skillAttack,
    skillName: levelData.name,

    killTime: killTime,
    globalDps: globalDps,
    globalHps: globalHps,
    log: log.toString(),
    note: _note
  };
}

function calculateDpsSeries(char, enemy, raidBuff, key, series) {
  var log = new NoLog();
  checkChar(char);
  enemy = enemy || {
    def: 0,
    magicResistance: 0,
    count: 1
  };
  raidBuff = raidBuff || { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
  // 把raidBuff处理成blackboard的格式
  var raidBlackboard = {
    atk: raidBuff.atkpct / 100,
    atk_override: raidBuff.atk,
    attack_speed: raidBuff.ats,
    sp_recovery_per_sec: raidBuff.cdr / 100,
    base_atk: raidBuff.base_atk / 100,
    damage_scale: 1 + raidBuff.damage_scale / 100
  };
  displayNames["raidBuff"] = "";

  var charId = char.charId;
  var charData = AKDATA.Data.character_table[charId];
  var skillData = AKDATA.Data.skill_table[char.skillId];
  if (char.skillLevel == -1) char.skillLevel = skillData.levels.length - 1;

  var levelData = skillData.levels[char.skillLevel];
  var blackboard = getBlackboard(skillData.levels[char.skillLevel].blackboard) || {};

  // calculate basic attribute package
  var attr = getAttributes(char, log);
  blackboard.id = skillData.skillId;
  attr.buffList["skill"] = blackboard;

  displayNames[charId] = charData.name;
  displayNames[char.skillId] = levelData.name; // add to name cache

  if (char.options.token) {
    var tokenId = checkSpecs(charId, "token") || checkSpecs(char.skillId, "token");
    getTokenAtkHp(attr, tokenId, log);
  }

  // 原本攻击力的修正量
  if (raidBlackboard.base_atk != 0) {
    var delta = attr.basic.atk * raidBlackboard.base_atk;
    var prefix = delta > 0 ? "+" : "";
    attr.basic.atk = Math.round(attr.basic.atk + delta);
  }

  var results = {};
  var _backup = {
    basic: _extends({}, attr.basic)
  };
  var skillAttack = null;
  var normalAttack = null;

  series.forEach(function (x) {
    enemy[key] = x;
    if (!checkSpecs(char.skillId, "overdrive")) {
      // 正常计算
      attr.char.options.overdrive_mode = false;
      attr.basic = Object.assign({}, _backup.basic);
      skillAttack = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
      if (!skillAttack) return;

      attr.basic = Object.assign({}, _backup.basic);
      normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
      if (!normalAttack) return;
    } else {
      // 22.4.15 过载模式计算
      // 直接粘过来了。麻了
      attr.basic = Object.assign({}, _backup.basic);
      var od_p1 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);

      attr.basic = Object.assign({}, _backup.basic);
      attr.char.options.overdrive_mode = true; // 使用options控制，这个options不受UI选项影响
      var od_p2 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
      // merge result
      var merged = Object.assign({}, od_p2);
      merged.dur = Object.assign({}, od_p2.dur);
      ["totalDamage", "totalHeal", "extraDamage", "extraHeal"].forEach(function (key) {
        merged[key] += od_p1[key];
      });
      for (var i = 0; i < merged.damagePool.length; ++i) {
        merged.damagePool[i] += od_p1.damagePool[i];
        merged.extraDamagePool[i] += od_p1.extraDamagePool[i];
      }
      ["attackCount", "hitCount", "duration", "stunDuration", "prepDuration"].forEach(function (key) {
        merged.dur[key] += od_p1.dur[key];
      });
      var tm = merged.dur.duration + merged.dur.stunDuration + merged.dur.prepDuration;
      merged.dps = merged.totalDamage / tm;
      merged.hps = merged.totalHeal / tm;
      skillAttack = merged;

      attr.basic = Object.assign({}, _backup.basic);
      attr.char.options.overdrive_mode = false;
      normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
      if (!normalAttack) return;
    }

    globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / (normalAttack.dur.duration + normalAttack.dur.stunDuration + skillAttack.dur.duration + skillAttack.dur.prepDuration));
    globalHps = Math.round((normalAttack.totalHeal + skillAttack.totalHeal) / (normalAttack.dur.duration + normalAttack.dur.stunDuration + skillAttack.dur.duration + skillAttack.dur.prepDuration));
    results[x] = {
      normal: normalAttack,
      skill: skillAttack,
      skillName: levelData.name,
      globalDps: globalDps,
      globalHps: globalHps
    };
  });

  return results;
}

// 叠加计算指定的技能/天赋效果，返回buffFrame
function applyBuff(charAttr, buffFrm, tag, blackbd, isSkill, isCrit, log, enemy) {
  var _ref = buffFrm || initBuffFrame(),
      buffFrame = _objectWithoutProperties(_ref, []);

  var blackboard = _objectWithoutProperties(blackbd, []);

  var basic = charAttr.basic;
  var charId = charAttr.char.charId;
  var skillId = charAttr.buffList["skill"].id;
  var options = charAttr.char.options;

  // 如果是技能期间，则取得技能ID, 否则不计算技能
  // specialtags里标示的（spType!=8的）被动技能：一直生效
  if (tag == "skill") {
    if (isSkill || checkSpecs(skillId, "passive")) tag = skillId;else return buffFrm;
  }

  buffFrm.applied[tag] = true;
  var done = false; // if !done, will call applyBuffDefault() in the end
  /*
  if (isCrit)
    log.write("[暴击] " +displayNames[tag] + ": -");
  else 
    log.write(displayNames[tag] + ": -");
    */
  // console.log("bb", blackboard);
  // write log
  function writeBuff(text) {
    var line = [""];
    if (tag == skillId) line.push("[技能]");else if (tag == "raidBuff" || tag == "fusion_buff") line.push("[团辅/拐]");else if (tag.includes("uniequip")) line.push("[模组]");else line.push("[天赋]");

    if (checkSpecs(tag, "cond")) if (options.cond) line.push("[触发]");else line.push("[未触发]");
    if (checkSpecs(tag, "stack") && options.stack) line.push("[满层数]");
    // if (checkSpecs(tag, "crit")) line.push("[暴击]");
    if (checkSpecs(tag, "ranged_penalty")) line.push("[距离惩罚]");

    line.push(displayNames[tag] + ": ");
    if (text) line.push(text);
    log.write(line.join(" "));
  }

  // 一般计算
  function applyBuffDefault() {
    var prefix = 0;
    for (var key in blackboard) {
      switch (key) {
        case "atk":
        case "def":
          prefix = blackboard[key] > 0 ? "+" : "";
          buffFrame[key] += basic[key] * blackboard[key];
          if (blackboard[key] != 0) writeBuff(key + ": " + prefix + (blackboard[key] * 100).toFixed(1) + "% (" + prefix + (basic[key] * blackboard[key]).toFixed(1) + ")");
          break;
        case "max_hp":
          prefix = blackboard[key] > 0 ? "+" : "";
          if (Math.abs(blackboard[key]) > 2) {
            // 加算
            buffFrame.maxHp += blackboard[key];
            writeBuff(key + ": " + prefix + blackboard[key]);
          } else if (blackboard[key] != 0) {
            // 乘算
            buffFrame.maxHp += basic.maxHp * blackboard[key];
            writeBuff(key + ": " + prefix + (blackboard[key] * 100).toFixed(1) + "% (" + prefix + (basic.maxHp * blackboard[key]).toFixed(1) + ")");
          }
          break;
        case "base_attack_time":
          if (blackboard.base_attack_time < 0) {
            // 攻击间隔缩短 - 加算
            buffFrame.baseAttackTime += blackboard.base_attack_time;
            writeBuff("base_attack_time: " + buffFrame.baseAttackTime.toFixed(3) + "s");
          } else {
            // 攻击间隔延长 - 乘算
            buffFrame.baseAttackTime += basic.baseAttackTime * blackboard.base_attack_time;
            writeBuff("base_attack_time: +" + (basic.baseAttackTime * blackboard.base_attack_time).toFixed(3) + "s");
          }
          break;
        case "attack_speed":
          if (blackboard[key] == 0) break;
          prefix = blackboard[key] > 0 ? "+" : "";
          buffFrame.attackSpeed += blackboard.attack_speed;
          writeBuff("attack_speed: " + prefix + blackboard.attack_speed);
          break;
        case "sp_recovery_per_sec":
          buffFrame.spRecoveryPerSec += blackboard.sp_recovery_per_sec;
          if (blackboard[key] > 0) writeBuff("sp: +" + buffFrame.spRecoveryPerSec + "/s");
          break;
        case "atk_scale":
        case "def_scale":
        case "heal_scale":
        case "damage_scale":
          buffFrame[key] *= blackboard[key];
          if (blackboard[key] != 1) writeBuff(key + ": " + blackboard[key].toFixed(2) + "x");
          break;
        case "attack@atk_scale":
          buffFrame.atk_scale *= blackboard["attack@atk_scale"];
          writeBuff("atk_scale: " + buffFrame.atk_scale.toFixed(2));
          break;
        case "attack@heal_scale":
          buffFrame.heal_scale *= blackboard["attack@heal_scale"];
          writeBuff("heal_scale: " + buffFrame.heal_scale.toFixed(2));
          break;
        case "max_target":
        case "attack@max_target":
          buffFrame.maxTarget = blackboard[key];
          writeBuff("maxTarget: " + blackboard[key]);
          break;
        case "times":
        case "attack@times":
          buffFrame.times = blackboard[key];
          writeBuff("\u653B\u51FB\u6B21\u6570: " + blackboard[key]);
          break;
        case "magic_resistance":
          if (blackboard[key] < -1) {
            // 魔抗减算
            buffFrame.emr += blackboard[key];
            writeBuff("\u654C\u4EBA\u9B54\u6297: " + blackboard[key] + "% (\u52A0\u7B97)");
          } else if (blackboard[key] < 0) {
            // 魔抗乘算
            buffFrame.emr_scale *= 1 + blackboard[key];
            writeBuff("\u654C\u4EBA\u9B54\u6297: " + (blackboard[key] * 100).toFixed(1) + "% (\u4E58\u7B97)");
          } // 大于0时为增加自身魔抗，不计算
          break;
        case "prob":
          if (!blackboard["prob_override"]) {
            buffFrame.prob = blackboard[key];
            writeBuff("\u6982\u7387(\u539F\u59CB): " + Math.round(buffFrame.prob * 100) + "%");
          }
          break;
        // 计算值，非原始数据
        case "edef":
          // 减甲加算值（负数）
          buffFrame.edef += blackboard[key];
          writeBuff("\u654C\u4EBA\u62A4\u7532: " + blackboard[key]);
          break;
        case "edef_scale":
          // 减甲乘算值
          buffFrame.edef_scale *= 1 + blackboard[key];
          writeBuff("\u654C\u4EBA\u62A4\u7532: " + blackboard[key] * 100 + "%");
          break;
        case "edef_pene":
          // 无视护甲加算值
          buffFrame.edef_pene += blackboard[key];
          writeBuff("\u65E0\u89C6\u62A4\u7532\uFF08\u6700\u7EC8\u52A0\u7B97\uFF09: -" + blackboard[key]);
          break;
        case "edef_pene_scale":
          buffFrame.edef_pene_scale = blackboard[key];
          writeBuff("\u65E0\u89C6\u62A4\u7532\uFF08\u6700\u7EC8\u4E58\u7B97\uFF09: -" + blackboard[key] * 100 + "%");
          break;
        case "emr_pene":
          // 无视魔抗加算值
          buffFrame.emr_pene += blackboard[key];
          writeBuff("\u65E0\u89C6\u9B54\u6297\uFF08\u52A0\u7B97\uFF09: -" + blackboard[key]);
          break;
        case "prob_override":
          // 计算后的暴击概率
          buffFrame.prob = blackboard[key];
          writeBuff("\u6982\u7387(\u8BA1\u7B97): " + Math.round(buffFrame.prob * 100) + "%");
          break;
        case "atk_override":
          // 加算的攻击团辅
          buffFrame.atk += blackboard[key];
          prefix = blackboard[key] > 0 ? "+" : "";
          if (blackboard[key] != 0) writeBuff("atk(+): " + prefix + (blackboard[key] * 100).toFixed(1));
          break;
      }
    }
  }
  // 特判
  //------------------------d----------------------------------------------------------------
  // 备注信息
  if (isSkill && !isCrit && checkSpecs(tag, "note")) {
    log.writeNote(checkSpecs(tag, "note"));
    //console.log("here");
  }

  if (checkSpecs(tag, "cond")) {
    // 触发天赋类
    if (!options.cond) {
      // 未触发时依然生效的天赋
      switch (tag) {
        case "tachr_348_ceylon_1":
          // 锡兰
          blackboard.atk = blackboard['ceylon_t_1[common].atk'];
          applyBuffDefault();break;
        case "skchr_glacus_2":
          // 格劳克斯
          buffFrame.atk_scale = blackboard["atk_scale[normal]"];
          writeBuff("atk_scale = " + buffFrame.atk_scale + " \u4E0D\u53D7\u5929\u8D4B\u5F71\u54CD");
        case "skchr_cutter_2":
          applyBuffDefault();break;
        case "tachr_145_prove_1":
          // 普罗旺斯
          applyBuffDefault();break;
        case "tachr_226_hmau_1":
          delete blackboard["heal_scale"];
          applyBuffDefault();break;
        case "tachr_279_excu_trait":
        case "tachr_1013_chen2_trait":
        case "tachr_440_pinecn_trait":
          if (isSkill && ["skchr_excu_1", "skchr_chen2_1", "skchr_chen2_3", "skchr_pinecn_2"].includes(skillId)) {
            log.writeNote("技能享受特性加成(普攻无加成)");
            applyBuffDefault();
          }
          break;
        case "tachr_113_cqbw_2":
          if (isSkill) log.writeNote("假设攻击目标免疫眩晕");
          break;
        case "tachr_1012_skadi2_2":
          log.writeNote("无深海猎人");
          blackboard.atk = blackboard["skadi2_t_2[atk][1].atk"];
          applyBuffDefault();
          break;
        case "skchr_crow_2":
          writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
          blackboard.base_attack_time *= basic.baseAttackTime;
          applyBuffDefault();
          break;
        case "tachr_431_ashlok_1":
          applyBuffDefault();break;
        case "tachr_4013_kjera_1":
          if (options.freeze) {
            blackboard.magic_resistance = -15;
            log.writeNote("维持冻结: -15法抗");
          }
          applyBuffDefault();break;
        case "tachr_322_lmlee_1":
          if (options.block) {
            blackboard.attack_speed = blackboard["lmlee_t_1[self].attack_speed"];
            applyBuffDefault();
          }
          break;
        case "skchr_phenxi_3":
          blackboard.atk_scale = blackboard["attack@atk_scale_2"];
          delete blackboard["attack@atk_scale"];
          applyBuffDefault();
          break;
      };
      done = true;
    } else {
      switch (tag) {
        case "tachr_348_ceylon_1":
          // 锡兰
          blackboard.atk = blackboard['ceylon_t_1[common].atk'] + blackboard['celyon_t_1[map].atk']; // yj手癌
          break;
        case "skchr_glacus_2":
          buffFrame.atk_scale = blackboard["atk_scale[drone]"];
          writeBuff("atk_scale = " + buffFrame.atk_scale + " \u4E0D\u53D7\u5929\u8D4B\u5F71\u54CD");
          done = true;break;
        case "skchr_cutter_2":
          buffFrame.maxTarget = blackboard.max_target;
          buffFrame.atk_scale = blackboard.atk_scale * blackboard["cutter_s_2[drone].atk_scale"];
          writeBuff("\u5BF9\u7A7A atk_scale = " + buffFrame.atk_scale);
          done = true;break;
        case "tachr_187_ccheal_1":
          // 贾维尔
          buffFrame.def += blackboard.def;
          blackboard.def = 0;
          writeBuff("def +" + buffFrame.def);
          break;
        case "tachr_145_prove_1":
          blackboard.prob_override = blackboard.prob2;
          break;
        case "tachr_333_sidero_1":
          delete blackboard.times;
          break;
        case "tachr_197_poca_1":
          // 早露
          blackboard.edef_pene_scale = blackboard["def_penetrate"];
          break;
        case "tachr_358_lisa_2":
          // 铃兰2
          if (isSkill && skillId == "skchr_lisa_3") delete blackboard.damage_scale; // 治疗不计易伤
          break;
        case "tachr_366_acdrop_1":
          // 酸糖1: 不在这里计算
          done = true;break;
        case "tachr_416_zumama_1":
          delete blackboard.hp_ratio;break;
        case "tachr_347_jaksel_1":
          blackboard.attack_speed = blackboard["charge_atk_speed_on_evade.attack_speed"];
          break;
        case "tachr_452_bstalk_trait":
        case "tachr_476_blkngt_trait":
          if (options.token) {
            done = true;
            log.writeNote("特性对召唤物无效");
          }
          break;
        case "tachr_402_tuye_1":
          blackboard.heal_scale = blackboard.heal_scale_2;
          break;
        case "tachr_457_blitz_1":
          if (isSkill && skillId == "skchr_blitz_2") blackboard.atk_scale *= charAttr.buffList.skill.talent_scale;
          break;
        case "tachr_472_pasngr_1":
          blackboard.damage_scale = blackboard["pasngr_t_1[enhance].damage_scale"];
          break;
        case "tachr_1012_skadi2_2":
          log.writeNote("有深海猎人");
          blackboard.atk = blackboard["skadi2_t_2[atk][2].atk"];
          break;
        case "tachr_485_pallas_1":
          if (isSkill && skillId == "skchr_pallas_3" && options.pallas) {
            log.writeNote("第一天赋被3技能覆盖");
            done = true;
          } else {
            blackboard.atk = blackboard["peak_performance.atk"];
          }
          break;
        case "skchr_crow_2":
          blackboard.atk += blackboard["crow_s_2[atk].atk"];
          log.writeNote("半血斩杀加攻");
          writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
          blackboard.base_attack_time *= basic.baseAttackTime;
          break;
        case "tachr_431_ashlok_1":
          blackboard.atk = blackboard["ashlok_t_1.atk"];
          log.writeNote("周围四格为地面");
          break;
        case "tachr_4013_kjera_1":
          blackboard.atk = blackboard["kjera_t_1[high].atk"];
          log.writeNote("存在2格以上的地面");
          if (options.freeze) {
            blackboard.magic_resistance = -15;
            log.writeNote("维持冻结: -15法抗");
          }
          break;
        case "tachr_322_lmlee_1":
          if (options.block) {
            blackboard.attack_speed = blackboard["lmlee_t_1[self].attack_speed"] * 2;
          }
          break;
        case "skchr_phenxi_3":
          blackboard.atk_scale = blackboard["attack@atk_scale"];
          delete blackboard["attack@atk_scale"];
          break;
        case "tachr_4039_horn_1":
          // 号角2天赋，编号反了
          blackboard.max_hp *= -1;
          delete blackboard.hp_ratio;
          break;
      }
    }
  } else if (checkSpecs(tag, "ranged_penalty")) {
    // 距离惩罚类
    if (!options.ranged_penalty) done = true;
  } else if (checkSpecs(tag, "stack")) {
    // 叠层类
    if (options.stack) {
      // 叠层天赋类
      if (tag == "tachr_2015_dusk_1" && options.token) done = true;else if (tag == "tachr_2023_ling_2" && options.token) done = true;else if (tag == "tachr_300_phenxi_1") {
        delete blackboard.hp_ratio;
        blackboard.atk = blackboard["phenxi_t_1[peak_2].peak_performance.atk"];
        log.writeNote("HP高于80%");
      } else {
        if (blackboard.max_stack_cnt) {
          ["atk", "def", "attack_speed", "max_hp"].forEach(function (key) {
            if (blackboard[key]) blackboard[key] *= blackboard.max_stack_cnt;
          });
        } else if (["tachr_188_helage_1", "tachr_337_utage_1", "tachr_475_akafyu_1"].includes(tag)) {
          blackboard.attack_speed = blackboard.min_attack_speed;
        }
      }
    } else done = true;
  } else {
    // 普通类
    // console.log(tag, options);
    switch (tag) {
      // ---- 天赋 ----
      case "tachr_185_frncat_1":
        // 慕斯
        buffFrame.times = 1 + blackboard.prob;
        writeBuff("\u653B\u51FB\u6B21\u6570 x " + buffFrame.times);
        done = true;break;
      case "tachr_118_yuki_1":
        // 白雪
        buffFrame.atk = basic.atk * blackboard.atk;
        buffFrame.baseAttackTime = blackboard.base_attack_time;
        writeBuff("攻击间隔+0.2s, atk+0.2x");
        done = true;break;
      case "tachr_144_red_1":
        // 红
        writeBuff("min_atk_scale: " + blackboard.atk_scale);
        done = true;break;
      case "tachr_117_myrrh_1":
      case "tachr_2014_nian_2":
      case "tachr_215_mantic_1":
        // 狮蝎，平时不触发
        done = true;break;
      case "tachr_164_nightm_1":
        // 夜魔 仅2技能加攻
        if (skillId == "skchr_nightm_1") done = true;
        break;
      case "tachr_130_doberm_1":
      case "tachr_308_swire_1":
        // 诗怀雅: 不影响自身
        writeBuff("对自身无效");
        done = true;break;
      case "tachr_109_fmout_1":
        // 远山
        if (skillId == "skcom_magic_rage[2]") {
          blackboard.attack_speed = 0;
          log.writeNote("抽攻击卡");
        } else if (skillId == "skchr_fmout_2") {
          blackboard.atk = 0;
          log.writeNote("抽攻速卡");
        }
        break;
      case "tachr_147_shining_1":
        // 闪灵
        writeBuff("def +" + blackboard.def);
        buffFrame.def += blackboard.def;
        blackboard.def = 0;
        break;
      case "tachr_367_swllow_1":
        // 灰喉
        blackboard.attack_speed = 0; // 特判已经加了
        break;
      case "tachr_279_excu_1": // 送葬
      case "tachr_391_rosmon_1":
      case "skchr_pinecn_1":
        blackboard.edef_pene = blackboard["def_penetrate_fixed"];
        break;
      case "tachr_373_lionhd_1":
        // 莱恩哈特
        blackboard.atk *= Math.min(enemy.count, blackboard.max_valid_stack_cnt);
        break;
      // 暴击类
      case "tachr_290_vigna_1":
        blackboard.prob_override = isSkill ? blackboard.prob2 : blackboard.prob1;
        break;
      case "tachr_106_franka_1":
        // 芙兰卡
        blackboard.edef_pene_scale = 1;
        if (isSkill && skillId == "skchr_franka_2") blackboard.prob_override = 0.5;
        break;
      case "tachr_155_tiger_1":
        blackboard.prob_override = blackboard["tiger_t_1[evade].prob"];
        blackboard.atk = blackboard["charge_on_evade.atk"];
        break;
      case "tachr_340_shwaz_1":
        if (isSkill) blackboard.prob_override = charAttr.buffList.skill["talent@prob"];
        blackboard.edef_scale = blackboard.def;
        delete blackboard["def"];
        break;
      case "tachr_225_haak_1":
        blackboard.prob_override = 0.25;
        break;
      case "tachr_2013_cerber_1":
        delete blackboard["atk_scale"];
        break;
      case "tachr_401_elysm_1":
        delete blackboard["attack_speed"];
        break;
      case "tachr_345_folnic_1":
        delete blackboard["damage_scale"];
        break;
      case "tachr_344_beewax_trait":
      case "tachr_388_mint_trait":
      case "tachr_388_mint_1":
        if (isSkill) done = true;break;
      case "tachr_426_billro_2":
        done = true;break;
      case "tachr_426_billro_trait":
        if (isSkill && !(skillId == "skchr_billro_1" && options.charge)) {
          done = true;
        }
        break;
      case "tachr_411_tomimi_1":
        if (!isSkill) done = true;break;
      case "tachr_509_acast_1":
      case "tachr_350_surtr_1":
      case "tachr_377_gdglow_2":
        blackboard.emr_pene = blackboard.magic_resist_penetrate_fixed;
        break;
      // ---- 技能 ----
      case "skchr_swllow_1":
      case "skchr_helage_1":
      case "skchr_helage_2":
      case "skchr_akafyu_1":
      case "skchr_excu_2":
      case "skchr_bpipe_2":
      case "skchr_acdrop_2":
      case "skchr_spikes_1":
        buffFrame.times = 2;
        writeBuff("\u653B\u51FB\u6B21\u6570 = " + buffFrame.times);
        break;
      case "skchr_excu_1":
        delete blackboard.atk_scale;break;
      case "skchr_texas_2":
      case "skchr_flamtl_2":
        buffFrame.times = 2;
        buffFrame.maxTarget = 999;
        writeBuff("\u653B\u51FB\u6B21\u6570 = " + buffFrame.times + " \u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        break;
      case "skchr_swllow_2":
      case "skchr_bpipe_3":
        buffFrame.times = 3;
        writeBuff("\u653B\u51FB\u6B21\u6570 = " + buffFrame.times);
        break;
      case "skchr_milu_2":
        // 守林(茂名版)
        buffFrame.times = Math.min(enemy.count, blackboard.max_cnt);
        log.writeNote("\u6838\u5F39\u6570\u91CF: " + buffFrame.times + " (\u6309\u5168\u4E2D\u8BA1\u7B97)");
        buffFrame.maxTarget = 999;
        break;
      case "skchr_cqbw_3":
        // D12(茂名版)
        buffFrame.times = Math.min(enemy.count, blackboard.max_target);
        blackboard.max_target = 999;
        log.writeNote("\u70B8\u5F39\u6570\u91CF: " + buffFrame.times + " (\u6309\u5168\u4E2D\u8BA1\u7B97)");
        break;
      case "skchr_iris_2":
        // 爱丽丝2
        buffFrame.times = Math.min(enemy.count, blackboard.max_target);
        blackboard.max_target = 999;
        log.writeNote("\u7761\u7720\u76EE\u6807\u6570\u91CF: " + buffFrame.times + "\n\u5176\u4F59\u76EE\u6807\u6309\u5168\u4E2D\u8BA1\u7B97");
        break;
      case "skchr_lava2_1":
        // sp炎熔1
        delete blackboard["attack@max_target"];
        buffFrame.times = Math.min(2, enemy.count);
        log.writeNote("\u6309\u5168\u4E2D\u8BA1\u7B97");
        break;
      case "skchr_lava2_2":
        buffFrame.times = 2;
        log.writeNote("\u6309\u706B\u5708\u53E0\u52A0\u8BA1\u7B97");
        break;
      case "skchr_slbell_1": // 不结算的技能
      case "skchr_shining_2":
      case "skchr_cgbird_2":
        done = true;break;
      // 多段暖机
      case "skchr_amgoat_1":
        if (options.warmup) {
          blackboard.atk = blackboard['amgoat_s_1[b].atk'];
          blackboard.attack_speed = blackboard['amgoat_s_1[b].attack_speed'];
          if (isSkill) log.writeNote("暖机完成");
        } else {
          blackboard.attack_speed = blackboard["amgoat_s_1[a].attack_speed"];
          log.writeNote("首次启动时");
        }
        break;
      case "skchr_thorns_3":
        if (options.warmup) {
          blackboard.atk = blackboard["thorns_s_3[b].atk"];
          blackboard.attack_speed = blackboard["thorns_s_3[b].attack_speed"];
          if (isSkill) log.writeNote("暖机完成");
        } else log.writeNote("首次启动时");
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          if (isSkill) log.writeNote("\u6280\u80FD\u4E0D\u53D7\u8DDD\u79BB\u60E9\u7F5A");
        }
        break;
      case "skchr_pinecn_2":
        if (options.warmup) {
          blackboard.atk = blackboard['pinecn_s_2[d].atk'];
          if (isSkill) log.writeNote("按攻击力叠满计算");
        } else {
          blackboard.atk = blackboard['pinecn_s_2[a].atk'];
          if (isSkill) log.writeNote("首次启动时");
        }
        break;
      case "skchr_amgoat_2":
        blackboard.atk_scale = blackboard.fk;
        break;
      case "skchr_breeze_2":
        buffFrame.maxTarget = 1;break;
      case "skchr_snsant_2":
      case "skchr_demkni_2":
      case "skchr_demkni_3":
      case "skchr_hsguma_3":
      case "skchr_waaifu_2":
      case "skchr_sqrrel_2":
      case "skchr_panda_2":
      case "skchr_red_2":
      case "skchr_phatom_3":
      case "skchr_weedy_3":
      case "skchr_asbest_2":
      case "skchr_folnic_2":
      case "skchr_chiave_2":
      case "skchr_mudrok_2":
      case "skchr_siege_2":
      case "skchr_glady_3":
      case "skchr_gnosis_2":
        buffFrame.maxTarget = 999;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        break;
      case "skchr_durnar_2":
        buffFrame.maxTarget = 3;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        break;
      case "skchr_aprot_1":
      case "skchr_aprot2_1":
        buffFrame.maxTarget = 3;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
        blackboard.base_attack_time *= basic.baseAttackTime;
        break;
      case "skchr_saga_2":
        buffFrame.maxTarget = 6;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        break;
      case "skchr_huang_3":
        // 可变攻击力技能，计算每段攻击力表格以和其他buff叠加
        buffFrame.maxTarget = 999;
        buffFrame.atk_table = [].concat(_toConsumableArray(Array(8).keys())).map(function (x) {
          return blackboard.atk / 8 * (x + 1);
        });
        writeBuff("\u6280\u80FD\u653B\u51FB\u529B\u52A0\u6210: " + buffFrame.atk_table.map(function (x) {
          return x.toFixed(2);
        }));
        break;
      case "skchr_phatom_2":
        buffFrame.atk_table = [].concat(_toConsumableArray(Array(blackboard.times).keys())).reverse().map(function (x) {
          return blackboard.atk * (x + 1);
        });
        writeBuff("\u6280\u80FD\u653B\u51FB\u529B\u52A0\u6210: " + buffFrame.atk_table.map(function (x) {
          return x.toFixed(2);
        }));
        delete blackboard.times;
        break;
      case "skchr_bluep_2":
        // 蓝毒2: 只对主目标攻击多次
        buffFrame.maxTarget = 3;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget + ", \u4E3B\u76EE\u6807\u547D\u4E2D " + blackboard["attack@times"] + " \u6B21");
        delete blackboard["attack@times"]; // 额外攻击后面计算
        break;
      case "skchr_bluep_1":
      case "skchr_breeze_1":
      case "skchr_grani_2":
      case "skchr_astesi_2":
      case "skchr_hpsts_2":
      case "skchr_myrrh_1":
      case "skchr_myrrh_2":
      case "skchr_whispr_1":
      case "skchr_ling_2":
        buffFrame.maxTarget = 2;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        break;
      case "skchr_folivo_1":
      case "skchr_folivo_2":
      case "skchr_deepcl_1":
        if (!options.token) {
          blackboard.atk = 0; // 不增加本体攻击
          blackboard.def = 0;
        }
        break;
      case "skchr_otter_2":
        if (options.token) {
          log.writeNote("结果无意义，应去掉召唤物选项");
          done = true;
        }
        break;
      case "skchr_kalts_2":
        if (options.token) {
          delete blackboard.attack_speed;
          blackboard.atk = blackboard["attack@atk"];
          buffFrame.maxTarget = 3;
        } // else attack_speed ok, attack@atk no effect.
        break;
      case "skchr_kalts_3":
        if (options.token) {
          blackboard.atk = blackboard["attack@atk"];
          blackboard.def = blackboard["attack@def"];
        }
        break;
      case "skchr_skadi2_3":
        delete blackboard.atk_scale;
      case "skchr_sora_2":
      case "skchr_skadi2_2":
      case "skchr_heidi_1":
      case "skchr_heidi_2":
        blackboard.atk = 0; // 不增加本体攻击
        blackboard.def = 0;
        blackboard.max_hp = 0;
        log.writeNote("自身不受鼓舞影响");
        break;
      case "skchr_swire_1":
        blackboard.atk = 0; // 1技能不加攻击
        break;
      case "skchr_ccheal_2": // hot记为额外治疗，不在这里计算
      case "skchr_ccheal_1":
        delete blackboard["heal_scale"];
        break;
      case "skchr_hmau_2":
      case "skchr_spot_1":
      case "tachr_193_frostl_1":
      case "skchr_mantic_2":
      case "skchr_glaze_2":
      case "skchr_zumama_2":
      case "skchr_shwaz_3": // 攻击间隔延长，但是是加算
      case "fusion_buff":
        buffFrame.baseAttackTime += blackboard.base_attack_time;
        writeBuff("base_attack_time + " + blackboard.base_attack_time + "s");
        blackboard.base_attack_time = 0;
        break;
      case "skchr_brownb_2": // 攻击间隔缩短，但是是乘算负数
      case "skchr_whispr_2":
      case "skchr_pasngr_2":
      case "skchr_indigo_1":
      case "skchr_ashlok_2":
        writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
        blackboard.base_attack_time *= basic.baseAttackTime;
        break;
      case "skchr_mudrok_3":
        writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
        blackboard.base_attack_time *= basic.baseAttackTime;
        buffFrame.maxTarget = basic.blockCnt;
        break;
      case "skchr_rosmon_3":
        writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
        blackboard.base_attack_time *= basic.baseAttackTime;
        if (options.cond) {
          blackboard.edef = -160;
          log.writeNote("计算战术装置阻挡减防");
        }
        if (options.rosmon_double) {
          blackboard.times = 2;
          log.writeNote("\u63092\u6B21\u653B\u51FB\u90FD\u547D\u4E2D\u6240\u6709\u654C\u4EBA\u8BA1\u7B97");
        }
        break;
      case "skchr_aglina_2": // 攻击间隔缩短，但是是乘算正数
      case "skchr_cerber_2":
      case "skchr_finlpp_2":
      case "skchr_jaksel_2":
      case "skchr_iris_1":
      case "skchr_indigo_2":
      case "skchr_mberry_2":
      case "skchr_flamtl_3":
        writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
        blackboard.base_attack_time = (blackboard.base_attack_time - 1) * basic.baseAttackTime;
        break;
      case "skchr_angel_3":
        // 攻击间隔双倍减算
        writeBuff("攻击间隔双倍减算");
        blackboard.base_attack_time *= 2;
        break;
      case "skchr_whitew_2":
      case "skchr_spikes_2":
        buffFrame.maxTarget = 2;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        if (options.ranged_penalty) {
          buffFrame.atk_scale /= 0.8;
          if (isSkill) log.writeNote("\u6280\u80FD\u4E0D\u53D7\u8DDD\u79BB\u60E9\u7F5A");
        }
        break;
      case "skchr_ayer_2":
        delete blackboard.atk_scale; // 断崖2记为额外伤害
      case "skchr_ayer_1":
      case "skchr_svrash_2":
      case "skchr_svrash_1":
      case "skchr_frostl_1":
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          if (isSkill) log.writeNote("\u6280\u80FD\u4E0D\u53D7\u8DDD\u79BB\u60E9\u7F5A");
        }
        break;
      case "skchr_svrash_3":
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          if (isSkill) log.writeNote("\u6280\u80FD\u4E0D\u53D7\u8DDD\u79BB\u60E9\u7F5A");
        }
        blackboard.def_scale = 1 + blackboard.def;
        delete blackboard.def;
        break;
      case "skchr_ceylon_1":
        if (options.ranged_penalty) {
          buffFrame.atk_scale /= 0.7;
          if (isSkill) log.writeNote("\u6280\u80FD\u4E0D\u53D7\u8DDD\u79BB\u60E9\u7F5A");
        }
        break;
      case "skchr_nightm_1":
        writeBuff("\u6CBB\u7597\u76EE\u6807\u6570 " + blackboard["attack@max_target"]);
        delete blackboard["attack@max_target"];
        break;
      case "skchr_shotst_1": // 破防类
      case "skchr_shotst_2":
        blackboard.edef_scale = blackboard.def;
        blackboard.def = 0;
        break;
      case "skchr_meteo_2":
        blackboard.edef = blackboard.def;
        blackboard.def = 0;
        break;
      case "skchr_slbell_2":
        // 初雪
        blackboard.edef_scale = blackboard.def;
        blackboard.def = 0;
        break;
      case "skchr_ifrit_2":
        blackboard.edef = blackboard.def;
        blackboard.def = 0;
        break;
      case "skchr_nian_3":
        blackboard.atk = blackboard["nian_s_3[self].atk"];
        break;
      case "skchr_nian_2":
      case "skchr_hsguma_2":
        writeBuff("计算反射伤害，而非DPS");
        break;
      case "skchr_yuki_2":
        blackboard["attack@atk_scale"] *= 3;
        writeBuff("\u603B\u500D\u7387: " + blackboard["attack@atk_scale"]);
        break;
      case "skchr_waaifu_1":
        blackboard.atk = blackboard["waaifu_s_1[self].atk"];
        break;
      case "skchr_peacok_1":
        blackboard.prob_override = blackboard["peacok_s_1[crit].prob"];
        if (isCrit) blackboard.atk_scale = blackboard.atk_scale_fake;
        break;
      case "skchr_peacok_2":
        if (isCrit) {
          writeBuff("\u6210\u529F - atk_scale = " + blackboard["success.atk_scale"]);
          blackboard.atk_scale = blackboard["success.atk_scale"];
          buffFrame.maxTarget = 999;
        } else {
          writeBuff("失败时有一次普攻");
        }
        break;
      case "skchr_vodfox_1":
        buffFrame.damage_scale = 1 + (buffFrame.damage_scale - 1) * blackboard.scale_delta_to_one;
        break;
      case "skchr_silent_2":
      case "skchr_vodfox_2":
        if (isSkill) log.writeNote("召唤类技能，调整中");
        break;
      case "skchr_elysm_2":
        delete blackboard["def"];
        delete blackboard["max_target"];
        break;
      case "skchr_asbest_1":
        delete blackboard["damage_scale"];
        break;
      case "skchr_beewax_2":
      case "skchr_mint_2":
        delete blackboard["atk_scale"];
        break;
      case "skchr_tomimi_2":
        blackboard.prob_override = blackboard["attack@tomimi_s_2.prob"] / 3;
        delete blackboard.base_attack_time;
        if (isCrit) {
          blackboard.atk_scale = blackboard["attack@tomimi_s_2.atk_scale"];
          log.writeNote("\u6BCF\u79CD\u72B6\u6001\u6982\u7387: " + (blackboard.prob_override * 100).toFixed(1) + "%");
        }
        break;
      case "skchr_surtr_2":
        if (enemy.count == 1) {
          blackboard.atk_scale = blackboard["attack@surtr_s_2[critical].atk_scale"];
          log.writeNote("\u5BF9\u5355\u76EE\u6807\u500D\u7387 " + blackboard.atk_scale.toFixed(1) + "x");
        }
        break;
      case "skchr_surtr_3":
        delete blackboard.hp_ratio;
        break;
      case "tachr_381_bubble_1":
        delete blackboard.atk;
        break;
      case "tachr_265_sophia_1":
        if (isSkill) {
          var ts = charAttr.buffList["skill"].talent_scale;
          if (skillId == "skchr_sophia_1") {
            blackboard.def = blackboard["sophia_t_1_less.def"] * ts;
            blackboard.attack_speed = blackboard["sophia_t_1_less.attack_speed"] * ts;
            writeBuff("1技能 - 自身享受一半增益");
          } else if (skillId == "skchr_sophia_2") {
            blackboard.def *= ts;
            blackboard.attack_speed *= ts;
            blackboard.max_target = basic.blockCnt;
            writeBuff("2技能 - 自身享受全部增益");
          }
        } else {
          delete blackboard.def;
          delete blackboard.attack_speed;
          writeBuff("非技能期间天赋对自身无效");
        }
        break;
      case "tachr_346_aosta_1":
        delete blackboard.atk_scale;
        break;
      case "skchr_blemsh_1":
        delete blackboard.heal_scale;
        break;
      case "skchr_rosmon_2":
        delete blackboard["attack@times"];
        break;
      case "tachr_1001_amiya2_1":
        if (isSkill) {
          blackboard.atk *= charAttr.buffList["skill"].talent_scale;
          blackboard.def *= charAttr.buffList["skill"].talent_scale;
        }
        break;
      case "skchr_amiya2_2":
        delete blackboard.times;
        delete blackboard.atk_scale;
        if (options.stack) {
          blackboard.atk = blackboard["amiya2_s_2[kill].atk"] * blackboard["amiya2_s_2[kill].max_stack_cnt"];
          log.writeNote("斩击伤害全部以叠满计算");
          log.writeNote("包括前三刀");
        }
        break;
      case "tachr_214_kafka_1":
        if (isSkill) applyBuffDefault();
        done = true;break;
      case "skchr_kafka_2":
        delete blackboard.atk_scale;
        break;
      case "skchr_f12yin_2":
        blackboard.def_scale = 1 + blackboard.def;
        buffFrame.maxTarget = 2;
        delete blackboard.def;
        break;
      case "skchr_f12yin_3":
        blackboard.prob_override = blackboard["talent@prob"];
        break;
      case "tachr_264_f12yin_1":
        delete blackboard.atk;
        break;
      case "tachr_264_f12yin_2":
        delete blackboard.prob;
        break;
      case "skchr_archet_1":
        delete blackboard.max_target;
        break;
      case "tachr_338_iris_trait":
      case "tachr_469_indigo_trait":
      case "tachr_338_iris_1":
      case "tachr_362_saga_2":
        done = true;break;
      case "skchr_tuye_1":
      case "skchr_tuye_2":
        delete blackboard.heal_scale;
        delete blackboard.atk_scale;
        break;
      case "skchr_saga_3":
        buffFrame.maxTarget = 2;
        writeBuff("\u6700\u5927\u76EE\u6807\u6570 = " + buffFrame.maxTarget);
        if (options.cond) {
          buffFrame.times = 2;
          log.writeNote("半血2连击");
        }
        break;
      case "skchr_dusk_1":
      case "skchr_dusk_3":
        if (options.token) done = true;break;
      case "skchr_dusk_2":
        if (options.token) done = true;else {
          if (options.cond) {
            log.writeNote("触发半血增伤");
          } else delete blackboard.damage_scale;
        }
        break;
      case "skchr_weedy_2":
        if (options.token) delete blackboard.base_attack_time;else buffFrame.maxTarget = 999;
        break;
      case "tachr_455_nothin_1":
        done = true;break;
      case "skchr_nothin_2":
        delete blackboard.prob;
        if (!options.cond) {
          delete blackboard.attack_speed;
          log.writeNote("蓝/紫Buff");
        } else log.writeNote("红Buff(攻速)");
        break;
      case "skchr_ash_2":
        if (options.cond) blackboard.atk_scale = blackboard["ash_s_2[atk_scale].atk_scale"];
        break;
      case "skchr_ash_3":
        buffFrame.maxTarget = 999;
        break;
      case "skchr_blitz_2":
        delete blackboard.atk_scale;
        break;
      case "skchr_tachak_1":
        blackboard.edef_pene = blackboard.def_penetrate_fixed;
        delete blackboard.atk_scale;
        break;
      case "skchr_tachak_2":
        writeBuff("base_attack_time: " + blackboard.base_attack_time + "x");
        blackboard.base_attack_time *= basic.baseAttackTime;
        if (!isCrit) delete blackboard.atk_scale;
        break;
      case "skchr_pasngr_3":
        done = true;break;
      case "skchr_toddi_1":
        blackboard.edef_scale = blackboard.def;
        delete blackboard.def;
        break;
      case "skchr_tiger_1":
      case "skchr_bena_1":
        blackboard.edef_pene_scale = blackboard["def_penetrate"];
        if (options.annie) {
          log.writeNote("替身模式");
          done = true;
        }
        break;
      case "skchr_bena_2":
      case "skchr_kazema_1":
        if (options.annie) {
          log.writeNote("替身模式");
          done = true;
        }
        break;
      case "skchr_kazema_2":
        if (options.annie) {
          log.writeNote("分身按本体属性计算");
          done = true;
        }
        break;
      case "skchr_billro_2":
        if (!options.charge) {
          delete blackboard.atk;
        }
        break;
      case "tachr_485_pallas_trait":
      case "tachr_308_swire_trait":
      case "tachr_265_sophia_trait":
        if (!options.noblock) done = true;else if (basic.equip_blackboard.atk_scale) {
          delete blackboard.atk_scale;
          //blackboard.atk_scale = basic.equip_blackboard.atk_scale;
          //writeBuff(`模组倍率覆盖: ${blackboard.atk_scale}x`);
        }
        break;
      case "uniequip_002_pallas":
      case "uniequip_002_sophia":
      case "uniequip_002_swire":
        if (!options.noblock) done = true;break;
      case "tachr_130_doberm_trait":
        if (!options.noblock) done = true;break;
      case "skchr_pallas_3":
        if (options.pallas) {
          blackboard.def = blackboard["attack@def"];
          blackboard.atk += blackboard["attack@peak_performance.atk"];
        }
        break;
      case "tachr_486_takila_1":
        done = true;break;
      case "tachr_486_takila_trait":
        if (!options.charge) {
          blackboard.atk = 1;
          log.writeNote("未蓄力-按100%攻击加成计算");
        } else {
          log.writeNote("蓄力-按蓄满40秒计算");
        }
        break;
      case "skchr_takila_2":
        if (options.charge) buffFrame.maxTarget = blackboard["attack@plus_max_target"];else buffFrame.maxTarget = 2;
        break;
      case "skchr_chen2_2":
      case "skchr_chen2_3":
        blackboard.edef = blackboard["attack@def"];
      case "skchr_chen2_1":
        delete blackboard.atk_scale;
        break;
      case "tachr_1013_chen2_1":
        blackboard.prob_override = blackboard["spareshot_chen.prob"];
        break;
      case "tachr_1013_chen2_2":
        blackboard.attack_speed = blackboard["chen2_t_2[common].attack_speed"];
        if (options.water) blackboard.attack_speed += blackboard["chen2_t_2[map].attack_speed"];
        break;
      case "tachr_479_sleach_1":
        blackboard.attack_speed = blackboard["sleach_t_1[ally].attack_speed"];
        break;
      case "skchr_fartth_3":
        if (!options.far) delete blackboard.damage_scale;
        break;
      case "tachr_1014_nearl2_1":
        delete blackboard.atk_scale;break;
      case "tachr_1014_nearl2_2":
        blackboard.edef_pene_scale = blackboard["def_penetrate"];
        break;
      case "skchr_nearl2_2":
        delete blackboard.times;break;
      case "tachr_489_serum_1":
        done = true;break;
      case "skchr_glider_1":
        buffFrame.maxTarget = 2;break;
      case "skchr_aurora_2":
        blackboard.prob_override = 0.1; // any value
        if (!isCrit) delete blackboard.atk_scale;
        break;
      case "tachr_206_gnosis_1":
        if (options.freeze || skillId == "skchr_gnosis_2" && isSkill && options.charge) {
          blackboard.damage_scale = blackboard.damage_scale_freeze;
          blackboard.magic_resistance = -15;
          if (options.freeze) log.writeNote("维持冻结 -15法抗/脆弱加强");
        } else blackboard.damage_scale = blackboard.damage_scale_cold;
        break;
      case "skchr_gnosis_3":
        if (!options.freeze) log.writeNote("攻击按非冻结计算\n终结伤害按冻结计算");
        delete blackboard.atk_scale;break;
      case "skchr_blkngt_1":
        if (options.token) {
          blackboard.atk = blackboard["blkngt_hypnos_s_1[rage].atk"];
          blackboard.attack_speed = Math.round(blackboard["blkngt_hypnos_s_1[rage].attack_speed"] * 100);
        }
        break;
      case "skchr_blkngt_2":
        if (options.token) {
          blackboard.atk_scale = blackboard["blkngt_s_2.atk_scale"];
          buffFrame.maxTarget = 999;
        }
        break;
      case "skchr_ling_3":
        delete blackboard.atk_scale;
        break;
      case "tachr_377_gdglow_1":
        blackboard.prob_override = 0.1;
        break;
      case "tachr_4016_kazema_1":
        done = true;break;
      case "tachr_300_phenxi_2":
        if (isSkill) done = true;break;
      case "skchr_chnut_2":
        blackboard.heal_scale = blackboard["attack@heal_continuously_scale"];
        log.writeNote("以连续治疗同一目标计算");
        break;
      case "tachr_4045_heidi_1":
        if (skillId == "skchr_heidi_1") delete blackboard.def;
        if (skillId == "skchr_heidi_2") delete blackboard.atk;
        break;
      case "skchr_horn_1":
        if (!options.melee) buffFrame.maxTarget = 999;
        break;
      case "skchr_horn_2":
        buffFrame.maxTarget = 999;
        blackboard.atk_scale = blackboard["attack@s2.atk_scale"];
        break;
      case "skchr_horn_3":
        if (!options.melee) buffFrame.maxTarget = 999;
        if (options.overdrive_mode) blackboard.atk = blackboard["horn_s_3[overload_start].atk"];
        break;
      case "skchr_rockr_2":
        if (!options.overdrive_mode) delete blackboard.atk;
        break;
    }
  }

  if (tag == "skchr_thorns_2") {
    log.writeNote("反击按最小间隔计算");
    blackboard.base_attack_time = blackboard.cooldown - (basic.baseAttackTime + buffFrame.baseAttackTime);
    buffFrame.attackSpeed = 0;
    blackboard.attack_speed = 0;
  }
  // 模组判定
  // options.equip 指满足模组额外效果的条件
  // 条件不满足时，面板副属性加成依然要计算
  switch (tag) {
    case "uniequip_002_cuttle":
    case "uniequip_002_glaze":
    case "uniequip_002_fartth":
      if (options.equip) {
        if (blackboard.damage_scale < 1) blackboard.damage_scale += 1;
        log.writeNote("距离>4.5");
      } else blackboard.damage_scale = 1;
      break;
    case "uniequip_002_sddrag":
    case "uniequip_002_vigna":
      if (options.equip) {
        delete blackboard.hp_ratio;
      } else done = true;
      break;
    case "uniequip_002_chen":
    case "uniequip_002_tachak":
    case "uniequip_002_bibeak":
      if (!isSkill) delete blackboard.damage_scale;
      break;
    case "uniequip_002_cutter":
    case "uniequip_002_phenxi":
    case "uniequip_002_meteo":
    case "uniequip_002_yuki":
      blackboard.edef_pene = blackboard.def_penetrate_fixed;
      break;
    case "uniequip_002_nearl2":
    case "uniequip_002_franka":
    case "uniequip_002_peacok":
    case "uniequip_002_cqbw":
    case "uniequip_002_sesa":
      if (!options.equip) delete blackboard.atk_scale;
      break;
    case "uniequip_002_skadi":
    case "uniequip_002_flameb":
    case "uniequip_002_gyuki":
      delete blackboard.hp_ratio;
      delete blackboard.max_hp;
      if (!options.equip) delete blackboard.attack_speed;
      break;
    case "uniequip_002_lisa":
    case "uniequip_002_glacus":
    case "uniequip_002_podego":
      if (!options.equip) delete blackboard.sp_recovery_per_sec;
      break;
  }

  if (!done) applyBuffDefault();
  return buffFrame;
}

// 伤害类型判定
function extractDamageType(charData, chr, isSkill, skillDesc, skillBlackboard, options) {
  var charId = chr.charId;
  var skillId = skillBlackboard.id;
  var ret = 0;
  if (charData.profession == "MEDIC") ret = 2;else if (["char_1012_skadi2", "char_101_sora", "char_4045_heidi"].includes(charId)) {
    ret = 2;
  } else if (options.annie) {
    ret = 1;
  } else if (charData.description.includes('法术伤害') && !["char_260_durnar", "char_378_asbest", "char_4025_aprot2", "char_512_aprot"].includes(charId)) {
    ret = 1;
  }
  if (isSkill) {
    if (["法术伤害", "法术</>伤害", "伤害类型变为"].some(function (x) {
      return skillDesc.includes(x);
    })) ret = 1;else if (["治疗", "恢复", "每秒回复"].some(function (x) {
      return skillDesc.includes(x);
    }) && !skillBlackboard["hp_recovery_per_sec_by_max_hp_ratio"]) {
      ret = 2;
    }
    // special character/skill overrides
    ret = checkSpecs(charId, "damage_type") || checkSpecs(skillId, "damage_type") || ret;
    if (skillId == "skchr_nearl2_3") {
      ret = options.block ? 3 : 0;
    }
    if (options.token) {
      var _r = checkSpecs(skillId, "token_damage_type");
      if (_r != null) ret = _r;
    }
  } else if (chr.options.token) {
    ret = checkSpecs(charId, "token_damage_type") || ret;
    if (["skchr_mgllan_3"].includes(skillId)) ret = 0;else if (skillId == "skchr_ling_2" || skillId == "skchr_ling_3" && chr.options.ling_fusion) ret = 1;
  }
  return ~~ret;
}

// 重置普攻判定
function checkResetAttack(key, blackboard, options) {
  if (checkSpecs(key, "reset_attack") == "false") return false;else if (checkSpecs(key, "overdrive") && !options.overdrive_mode) return false;else return checkSpecs(key, "reset_attack") || blackboard['base_attack_time'] || blackboard['attack@max_target'] || blackboard['max_target'];
}

// 计算攻击次数和持续时间
function calcDurations(isSkill, attackTime, attackSpeed, levelData, buffList, buffFrame, enemyCount, options, charId, log) {
  var blackboard = buffList.skill;
  var skillId = blackboard.id;
  var spData = levelData.spData;
  var duration = 0;
  var attackCount = 0;
  var stunDuration = 0;
  var prepDuration = 0;
  var startSp = 0;
  var rst = checkResetAttack(skillId, blackboard, options);

  log.write("\n**【循环计算】**");

  var spTypeTags = {
    1: "time",
    2: "attack",
    4: "hit",
    8: "special"
  };
  var tags = [spTypeTags[spData.spType]]; // 技能类型标记

  // 需要模拟的技能（自动回复+自动释放+有充能）
  if (checkSpecs(skillId, "sim")) {
    var time_since = function time_since(key) {
      return now - (last[key] || -999);
    };

    var action = function action(key) {
      if (!timeline[now]) timeline[now] = [];
      timeline[now].push(key);
      last[key] = now;
      total[key] = (total[key] || 0) + 1;
      //console.log(now, key);
    };

    // charge 


    log.writeNote("模拟120s时间轴");
    duration = 120;
    var fps = 30;
    var now = fps,
        sp = spData.initSp * fps,
        max_sp = 999 * fps;
    var last = {},
        timeline = {},
        total = {};
    var extra_sp = 0;
    var TimelineMarks = {
      "attack": "-",
      "skill": "+",
      "ifrit": "",
      "archet": "",
      "chen": "",
      "recover_sp": "\\*",
      "recover_overflow": "x",
      "reset_animation": "\\*"
    };
    // 技能动画(阻回)时间-帧
    var cast_time = checkSpecs(skillId, "cast_time") || checkSpecs(skillId, "cast_bat") * 100 / attackSpeed || attackTime * fps;
    var skill_time = Math.max(cast_time, attackTime * fps);

    var cast_sp = options.charge && checkSpecs(skillId, "charge") ? spData.spCost * 2 : spData.spCost;
    // init sp
    if (skillId == "skchr_amgoat_2" && buffList["tachr_180_amgoat_2"]) sp = (buffList["tachr_180_amgoat_2"].sp_min + buffList["tachr_180_amgoat_2"].sp_max) / 2 * fps;else if (buffList["tachr_222_bpipe_2"]) sp = buffList["tachr_222_bpipe_2"].sp * fps;
    last["ifrit"] = last["archet"] = last["chen"] = 1; // 落地即开始计算 记为1帧
    startSp = cast_sp - sp / fps;

    // sp barrier
    max_sp = cast_sp * fps;
    if (!options.charge && checkSpecs(skillId, "charge")) max_sp *= 2; // 充能技能1层直接放的情况
    if (blackboard.ct) max_sp = spData.spCost * fps * blackboard.ct;
    if (blackboard.cnt) max_sp = spData.spCost * fps * blackboard.cnt;

    log.write("[\u6A21\u62DF] T = 120s, \u521D\u59CBsp = " + (sp / fps).toFixed(1) + ", \u6280\u80FDsp = " + cast_sp + ", \u6280\u80FD\u52A8\u753B\u65F6\u95F4 = " + Math.round(cast_time) + " \u5E27, sp\u4E0A\u9650\u8BBE\u4E3A " + max_sp / fps);
    log.write("[\u6A21\u62DF] \u653B\u51FB\u95F4\u9694 " + attackTime.toFixed(3) + "s");
    if (checkSpecs(skillId, "attack_animation")) log.write("[\u6A21\u62DF] \u653B\u51FB\u52A8\u753B = " + checkSpecs(skillId, "attack_animation") + " \u5E27");

    if (spData.spType == 1) {
      sp += fps; // 落地时恢复1sp
      log.write("[模拟] +1落地sp");
    }
    while (now <= duration * fps) {
      // normal attack
      if (sp < cast_sp * fps && time_since("attack") >= attackTime * fps && time_since("skill") >= skill_time) {
        action("attack");
        if (spData.spType == 2) sp += fps;
      }
      // skill
      if (sp >= cast_sp * fps && time_since("skill") >= skill_time && (time_since("attack") >= attackTime * fps || checkSpecs(skillId, "attack_animation") && time_since("attack") == checkSpecs(skillId, "attack_animation"))) {
        if (checkSpecs(skillId, "attack_animation") && time_since("attack") == checkSpecs(skillId, "attack_animation")) action("reset_animation");
        action("skill");
      }
      // sp recover
      if (time_since("skill") == 0) sp -= cast_sp * fps;
      if (time_since("skill") >= cast_time && sp < max_sp) {
        if (spData.spType == 1) sp += 1 + buffFrame.spRecoveryPerSec;
      }
      // 乱火
      if (buffList["tachr_134_ifrit_2"] && time_since("ifrit") >= buffList["tachr_134_ifrit_2"].interval * fps) {
        action("ifrit");
        extra_sp = buffList["tachr_134_ifrit_2"].sp;
      }
      // 兰登战术/呵斥
      var intv_archet = buffList["tachr_332_archet_1"] ? buffList["tachr_332_archet_1"].interval : 2.5;
      var intv_chen = buffList["tachr_010_chen_1"] ? buffList["tachr_010_chen_1"].interval : 4;
      if ((buffList["tachr_332_archet_1"] || options.archet) && time_since("archet") >= intv_archet * fps) {
        action("archet");
        extra_sp += 1;
      }
      if ((buffList["tachr_010_chen_1"] || options.chen) && time_since("chen") >= intv_chen * fps) {
        action("chen");
        extra_sp += 1;
      }
      if (time_since("skill") >= cast_time && extra_sp > 0) {
        sp += extra_sp * fps;
        if (sp <= max_sp) action("recover_sp");else {
          sp = max_sp;
          action("recover_overflow");
        }
      }
      extra_sp = 0;
      ++now;
    }

    if (isSkill) {
      attackCount = total.skill;
      duration = attackCount * skill_time / fps;
    } else {
      attackCount = total.attack;
      duration -= total.skill * skill_time / fps;

      // 打印时间轴和特殊动作
      var line_str = "";
      Object.keys(timeline).forEach(function (t) {
        line_str += timeline[t].map(function (x) {
          return TimelineMarks[x];
        }).join("");
      });
      log.write("[\u6A21\u62DF] \u65F6\u95F4\u8F74: ");
      log.write("" + line_str);
      log.write("( -: \u666E\u653B, +: \u6280\u80FD, \\*: \u5145\u80FD, x: sp\u6EA2\u51FA )");

      if (total.ifrit) log.write("[\u6A21\u62DF] \u83B1\u8335\u56DE\u8DEF(\\*): \u89E6\u53D1 " + total.recover_sp + " / " + total.ifrit + " \u6B21, sp + " + buffList["tachr_134_ifrit_2"].sp * total.recover_sp);
      if (total.archet) log.write("[\u6A21\u62DF] \u5170\u767B\u6218\u672F: \u89E6\u53D1 " + total.archet + " \u6B21");
      if (total.chen) log.write("[\u6A21\u62DF] \u5475\u65A5: \u89E6\u53D1 " + total.chen + " \u6B21");
      if (total.recover_sp) log.write("[\u6A21\u62DF] sp\u6062\u590D\u6210\u529F " + total.recover_sp + " \u6B21, \u6EA2\u51FA " + (total.recover_overflow || 0) + " \u6B21, \u5176\u4F59\u4E3A\u6280\u80FD\u671F\u95F4\u65E0\u6CD5\u6062\u590Dsp");
      if (total.reset_animation) log.write("[\u6A21\u62DF] \u53D6\u6D88\u653B\u51FB\u95F4\u9694(\\*) " + total.reset_animation + " \u6B21");
    }
  } else {

    if (isSkill) {

      // 准备时间
      switch (skillId) {
        case "skchr_mudrok_3":
          prepDuration = blackboard.sleep;break;
        case "skchr_amiya2_2":
          prepDuration = 3.33;break;
        case "skchr_surtr_3":
          prepDuration = 0.67;break;
        case "skchr_ash_2":
        case "skchr_nearl2_2":
          prepDuration = 1;break;
        case "skchr_gnosis_3":
          prepDuration = 1.167;break;
        case "skchr_mint_2":
          prepDuration = 1.33;break;
      }

      // 快速估算
      attackCount = Math.ceil((levelData.duration - prepDuration) / attackTime);
      duration = attackCount * attackTime;
      startSp = spData.spCost - spData.initSp;

      if (buffList["tachr_180_amgoat_2"]) {
        // 乱火
        var init_sp = spData.initSp + (buffList["tachr_180_amgoat_2"].sp_min + buffList["tachr_180_amgoat_2"].sp_max) / 2;
        startSp = spData.spCost - init_sp;
      } else if (buffList["tachr_222_bpipe_2"]) {
        // 军事传统
        startSp = spData.spCost - spData.initSp - buffList["tachr_222_bpipe_2"].sp;
      } else if (buffList["tachr_456_ash_2"]) {
        startSp = spData.spCost - spData.initSp - buffList["tachr_456_ash_2"].sp;
      }
      // 重置普攻
      if (rst) {
        if (duration > levelData.duration - prepDuration && rst != "ogcd") {
          if (options.overdrive_mode) log.write("[结束时重置普攻] 截断最后一个攻击间隔");else log.write("[\u91CD\u7F6E\u666E\u653B] \u622A\u65AD\u6700\u540E\u4E00\u4E2A\u653B\u51FB\u95F4\u9694");
        }
        duration = levelData.duration - prepDuration;
        // 抬手时间
        var frameBegin = Math.round(checkSpecs(skillId, "attack_begin") || 12);
        if (skillId == "skchr_glaze_2" && options.far) {
          log.writeNote("技能前摇增加至27帧");
          frameBegin = 27;
        }
        var t = frameBegin / 30;
        attackCount = Math.ceil((duration - t) / attackTime);
        log.write("\u6280\u80FD\u524D\u6447: " + t.toFixed(3) + "s, " + frameBegin + " \u5E27");
        if (!checkSpecs(skillId, "attack_begin")) log.write("（此为计算器默认值。实际前摇请参考动画时间）");else log.writeNote("\u6280\u80FD\u524D\u6447: " + t.toFixed(3) + "s");
        if (spData.spType == 2) {
          log.writeNote("考虑普攻穿插技能");
          duration -= attackTime;
        }
      }
      // 技能类型
      if (levelData.description.includes("持续时间无限") || checkSpecs(skillId, "toggle")) {
        if (skillId == "skchr_thorns_3" && !options.warmup) {} else if (skillId == "skchr_tuye_2") {
          log.writeNote("取技能时间=暖机时间");
          duration = spData.spCost / (1 + buffFrame.spRecoveryPerSec);
          attackCount = Math.ceil(duration / attackTime);
        } else if (skillId == "skchr_surtr_3") {
          var lock_time = buffList["tachr_350_surtr_2"]["surtr_t_2[withdraw].interval"];
          duration = Math.sqrt(600) + lock_time;
          attackCount = Math.ceil(duration / attackTime);
          log.write("\u635F\u5931100%\u8840\u91CF\u8017\u65F6: " + Math.sqrt(600).toFixed(1) + "s\uFF0C\u9501\u8840\u65F6\u95F4: " + lock_time + "s");
          log.writeNote("不治疗最大维持时间");
        } else {
          attackCount = Math.ceil(1800 / attackTime);
          duration = attackCount * attackTime;
          if (checkSpecs(skillId, "toggle")) {
            log.writeNote("切换类技能 (记为1800s)");tags.push("toggle");
          } else {
            log.writeNote("持续时间无限 (记为1800s)");tags.push("infinity");
          }
        }
      } else if (spData.spType == 8) {
        if (levelData.duration <= 0 && blackboard.duration > 0) {
          // 砾的技能也是落地点火，但是持续时间在blackboard里
          levelData.duration = blackboard.duration;
          duration = blackboard.duration;
          attackCount = Math.ceil(levelData.duration / attackTime);
        }
        if (levelData.duration > 0) {
          // 自动点火
          tags.push("auto");log.write('落地点火');
          if (prepDuration > 0) duration = levelData.duration - prepDuration;
        } else if (checkSpecs(skillId, "passive")) {
          // 被动
          attackCount = 1;
          duration = attackTime;
          tags.push("passive");log.write("被动");
        } else if (skillId == "skchr_phatom_2") {
          // 傀影2
          attackCount = blackboard.times;
          duration = attackTime * attackCount;
        } else {
          // 摔炮
          attackCount = 1;
          duration = 0;
          tags.push("auto", "instant");log.write("落地点火, 瞬发");
        }
      } else if (levelData.duration <= 0) {
        if (checkSpecs(skillId, "instant_buff")) {
          // 瞬发的有持续时间的buff，例如血浆
          duration = blackboard.duration || checkSpecs(skillId, "duration");
          attackCount = Math.ceil(duration / attackTime);
          tags.push("instant", "buff");log.writeNote("瞬发Buff，技能周期为Buff持续时间");
        } else if (checkSpecs(skillId, "magazine")) {
          // 弹药技能
          var mag = checkSpecs(skillId, "magazine");
          if (options.charge && skillId == "skchr_chen2_2") mag = 20;
          if (buffList["tachr_1013_chen2_1"]) {
            var prob = buffList["tachr_1013_chen2_1"]["spareshot_chen.prob"];
            var new_mag = Math.floor(mag / (1 - prob));
            log.writeNote("\u8BA1\u5165 " + (new_mag - mag) + " \u53D1\u989D\u5916\u5F39\u836F");
            mag = new_mag;
          }
          log.write("\u5F39\u836F\u7C7B\u6280\u80FD: " + displayNames[skillId] + ": \u653B\u51FB " + mag + " \u6B21");
          attackCount = mag;
          duration = attackTime * attackCount;
          if (rst) duration -= attackTime;
        } else if (skillId == "skchr_blkngt_2" && options.token) {
          duration = blackboard["blkngt_s_2.duration"];
          attackCount = Math.ceil(duration / attackTime);
        } else {
          // 普通瞬发
          attackCount = 1;
          // 不占用普攻的瞬发技能，持续时间等于动画时间。否则持续时间为一次普攻间隔
          if (checkSpecs(skillId, "reset_attack") != "ogcd") duration = attackTime;
          tags.push("instant");log.write("瞬发");
          // 施法时间-基于动画
          if (checkSpecs(skillId, "anim_key") && checkSpecs(skillId, "anim_cast")) {
            var animKey = checkSpecs(skillId, "anim_key");
            var animData = AKDATA.Data.dps_anim[charId][animKey];
            var ct = animData.duration || animData;
            /*
            if (checkSpecs(skillId, "anim_max_scale") != 1) {
              // 瞬发技能，但是动画时间和攻速挂钩
              ct = Math.round(ct * 100 / attackSpeed);
              log.writeNote(`动画时间随攻速(${attackSpeed})变化(???)`);
            }
            */
            log.write("\u6280\u80FD\u52A8\u753B\uFF1A" + animKey + ", \u91CA\u653E\u65F6\u95F4 " + ct + " \u5E27");
            log.writeNote("\u6280\u80FD\u52A8\u753B: " + ct + " \u5E27");
            if (duration < ct / 30 && spData.spType == 1 || rst == "ogcd") duration = ct / 30;
          }
          // 施法时间
          if (checkSpecs(skillId, "cast_time")) {
            var _ct2 = checkSpecs(skillId, "cast_time");
            if (duration < _ct2 / 30 || rst == "ogcd") {
              log.write("\u6280\u80FD\u52A8\u753B: " + _ct2 + " \u5E27(\u57FA\u4E8E\u6D4B\u91CF)");
              log.writeNote("\u6280\u80FD\u52A8\u753B: " + _ct2 + " \u5E27");
              if (spData.spType == 1 || rst == "ogcd") duration = _ct2 / 30;
            }
          }
        }
      } else if (skillId == "skchr_glady_3") {
        attackCount = 6;
        attackTime = 1.5;
        log.writeNote("[特殊] 持续9秒，第7次拖拽无伤害");
      } else if (options.annie) {
        duration = 20;
        attackCount = Math.ceil(duration / attackTime);
        log.write("傀儡师替身 - 持续20s");
      }

      // 过载
      if (checkSpecs(skillId, "overdrive")) {
        // 重新估算前半时间
        var attackCountHalf = Math.ceil((levelData.duration - prepDuration) / 2 / attackTime);
        var durationHalf = attackCountHalf * attackTime;
        if (checkSpecs(skillId, "magazine")) {
          attackCountHalf = Math.ceil(attackCount / 2);
          durationHalf = attackCountHalf * attackTime;
          log.write("\u4E00\u534A\u5F39\u836F\u653B\u51FB " + attackCountHalf + " \u6B21");
        }
        if (options.overdrive_mode) {
          // 过载: 减去前半部分
          duration -= durationHalf;
          attackCount -= attackCountHalf;
          if (options.od_trigger) {
            // 立即结束
            log.writeNote("立即结束过载");
            duration = attackCount = 0;
            if (skillId == "skchr_horn_2") {
              duration = 1.066; // 32f
              attackCount = attackCountHalf;
            }
          }
        } else {
          // 前半
          duration = durationHalf;
          attackCount = attackCountHalf;
        }
      }

      // 特判
      if (skillId == "skchr_huang_3") {
        attackCount -= 2;
        log.write("[\u7279\u6B8A] " + displayNames["skchr_huang_3"] + ": \u5B9E\u9645\u653B\u51FB " + attackCount + "\u6BB5+\u7EC8\u7ED3");
      } else if (skillId == "skchr_sunbr_2") {
        // 古米2准备时间延长技能时间
        prepDuration = blackboard.disarm;
      } else if (skillId == "skchr_takila_2" && options.charge) {
        duration = blackboard.enhance_duration;
        attackCount = Math.ceil(duration / attackTime);
      }
    } else {
      // 普攻
      // 眩晕处理
      if (skillId == "skchr_fmout_2") {
        stunDuration = blackboard.time;
      } else if (skillId == "skchr_peacok_2") {
        stunDuration = blackboard["failure.stun"] * (1 - blackboard.prob);
        log.write("[\u7279\u6B8A] \u8BA1\u7B97\u5E73\u5747\u6655\u7729\u65F6\u95F4");
      } else if (["skchr_amiya_2", "skchr_liskam_2", "skchr_ghost_2", "skchr_broca_2", "skchr_serum_1", "skchr_aurora_1"].includes(skillId)) {
        stunDuration = blackboard.stun;
      } else if (skillId == "skchr_folivo_2" && options.token) {
        stunDuration = blackboard.stun;
      } else if (skillId == "skchr_rockr_2" && !options.od_trigger) {
        stunDuration = 20;
      }
      if (stunDuration > 0) log.write("\u6655\u7729: " + stunDuration + "s");

      // 快速估算
      var attackDuration = spData.spCost / (1 + buffFrame.spRecoveryPerSec) - stunDuration;
      // 施法时间
      if (checkSpecs(skillId, "cast_time")) {
        var _ct3 = checkSpecs(skillId, "cast_time");
        if (attackTime > _ct3 / 30 && rst != "ogcd") {
          attackDuration -= attackTime - _ct3 / 30;
          log.write("[\u7279\u6B8A] \u6280\u80FD\u91CA\u653E\u65F6\u95F4: " + _ct3 + " \u5E27, \u666E\u653B\u65F6\u95F4\u504F\u79FB " + (_ct3 / 30 - attackTime).toFixed(3) + "s (" + attackDuration.toFixed(3) + "s)");
          log.writeNote("\u6280\u80FD\u52A8\u753B(\u963B\u56DE): " + _ct3 + " \u5E27");
        }
      }

      attackCount = Math.ceil(attackDuration / attackTime);
      duration = attackCount * attackTime;
      // 重置普攻（瞬发/ogcd除外）
      if (rst && rst != "ogcd" && spData.spType != 8) {
        var dd = spData.spCost / (1 + buffFrame.spRecoveryPerSec) - stunDuration;
        if (duration > dd) log.write("[\u91CD\u7F6E\u666E\u653B] \u622A\u65AD\u6700\u540E\u4E00\u4E2A\u653B\u51FB\u95F4\u9694");
        duration = dd;
        // 抬手时间
        var frameBegin = Math.round(checkSpecs(skillId, "attack_begin") || 12);
        var t = frameBegin / 30;
        attackCount = Math.ceil((duration - t) / attackTime);
        log.write("\u6280\u80FD\u524D\u6447: " + t.toFixed(3) + "s, " + frameBegin + " \u5E27");
        if (!checkSpecs(skillId, "attack_begin")) log.write("（此为计算器默认值。实际前摇请参考动画时间）");
      }

      // 技能类型
      switch (spData.spType) {
        case 8:
          // 被动或落地点火
          if (levelData.duration <= 0 && blackboard.duration > 0) {
            console.log("Duration? l/b", skillId, levelData.duration, blackboard.duration);
            levelData.duration = blackboard.duration;
          }
          if (levelData.duration > 0) {
            tags.push("auto");
            if (skillId == "skchr_nearl2_2") {
              attackCount = 0;duration = 1;
              log.writeNote("不进行普攻");
            } else {
              log.write("[\u7279\u6B8A] \u843D\u5730\u70B9\u706B - \u53D6\u666E\u653B\u65F6\u95F4=\u6280\u80FD\u6301\u7EED\u65F6\u95F4");
              log.writeNote("取普攻时间=技能持续时间");
              attackDuration = levelData.duration;
              attackCount = Math.ceil(attackDuration / attackTime);
              duration = attackCount * attackTime;
            }
          } else if (checkSpecs(skillId, "passive")) {
            // 被动
            attackCount = 10;
            duration = attackCount * attackTime;
            tags.push("passive");
            log.write("[\u7279\u6B8A] \u88AB\u52A8 - \u4EE510\u6B21\u666E\u653B\u8BA1\u7B97");
            log.writeNote("以10次普攻计算");
          } else {
            attackDuration = 10;
            attackCount = Math.ceil(attackDuration / attackTime);
            duration = attackCount * attackTime;
            tags.push("auto", "instant");
            log.write("[\u7279\u6B8A] \u843D\u5730\u70B9\u706B/\u77AC\u53D1 - \u4EE510s\u666E\u653B\u8BA1\u7B97");
            log.writeNote("以10s普攻计算");
          }
          break;
        case 4:
          // 受击回复
          log.write("\u53D7\u51FB\u56DE\u590D");
          break;
        case 2:
          // 攻击恢复
          log.write("\u653B\u51FB\u56DE\u590D");
          attackCount = spData.spCost;

          var _intv_chen = buffList["tachr_010_chen_1"] ? buffList["tachr_010_chen_1"].interval : 4;
          var _intv_archet = buffList["tachr_332_archet_1"] ? buffList["tachr_332_archet_1"].interval : 2.5;
          var _extra_sp = 0,
              next = true;

          // 枚举所需的最少攻击次数
          while (attackCount > 0 && next) {
            duration = attackCount * attackTime;
            _extra_sp = 0;
            if (buffList["tachr_010_chen_1"] || options.chen) _extra_sp += Math.floor(duration / _intv_chen);
            if (buffList["tachr_332_archet_1"] || options.archet) _extra_sp += Math.floor(duration / _intv_archet);
            if (buffList["tachr_301_cutter_1"]) {
              var p = buffList["tachr_301_cutter_1"].prob;
              _extra_sp += skillId == "skchr_cutter_1" ? (attackCount * 2 + 1) * p : attackCount * 2 * p;
            }
            next = attackCount + _extra_sp >= spData.spCost;
            if (next) attackCount -= 1;
          }
          if (!next) attackCount += 1;
          duration = attackCount * attackTime;
          var line = [];
          if (buffList["tachr_010_chen_1"] || options.chen) line.push("\u5475\u65A5\u89E6\u53D1 " + Math.floor(duration / _intv_chen) + " \u6B21");
          if (buffList["tachr_332_archet_1"] || options.archet) line.push("\u5170\u767B\u6218\u672F\u89E6\u53D1 " + Math.floor(duration / _intv_archet) + " \u6B21");
          if (buffList["tachr_301_cutter_1"]) {
            var _p = buffList["tachr_301_cutter_1"].prob;
            var _n = skillId == "skchr_cutter_1" ? (attackCount * 2 + 1) * _p : attackCount * 2 * _p;
            line.push("\u5149\u8680\u523B\u75D5\u89E6\u53D1 " + _n.toFixed(2) + " \u6B21");
          }
          if (line.length > 0) log.write("[\u7279\u6B8A] " + line.join(", "));
          if (rst) {
            duration -= attackTime;
          }
          break;
        case 1:
          // 普通，前面已经算过一遍了，这里只特判
          var sp_rate = 1 + buffFrame.spRecoveryPerSec;
          if (buffList["tachr_002_amiya_1"]) {
            // 情绪吸收
            attackCount = Math.ceil((spData.spCost - stunDuration * sp_rate) / (buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"] + attackTime * sp_rate));
            log.write("[\u7279\u6B8A] " + displayNames["tachr_002_amiya_1"] + ": attack sp = " + attackCount * buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"]);
            duration = attackCount * attackTime;
          } else if (buffList["tachr_134_ifrit_2"]) {
            // [莱茵回路]. 需要解出攻击次数
            var i = buffList["tachr_134_ifrit_2"].interval;
            var isp = i * sp_rate + buffList["tachr_134_ifrit_2"].sp;
            var recoverCount = Math.ceil((spData.spCost - i) / isp); // recoverCount >= (spCost - i) / isp
            var r = (spData.spCost - recoverCount * isp) / sp_rate;
            attackDuration = recoverCount * i + r;
            attackCount = Math.ceil(attackDuration / attackTime);
            //console.log(i, isp, recoverCount, r, attackDuration, attackCount);
            duration = attackDuration;
            log.write("[\u7279\u6B8A] " + displayNames["tachr_134_ifrit_2"] + ": sp + " + recoverCount * buffList["tachr_134_ifrit_2"].sp);
          } else if (checkSpecs(skillId, "instant_buff")) {
            // 不稳定血浆: 减去buff持续时间
            attackDuration -= blackboard.duration || checkSpecs(skillId, "duration");
            attackCount = Math.ceil(attackDuration / attackTime);
            duration = attackCount * attackTime;
            log.writeNote("瞬发Buff，技能周期为Buff持续时间");
          } else if (buffList["tachr_400_weedy_2"] && options.cannon) {
            // 水炮充能，持续20s/cd35s
            var m = Math.floor(spData.spCost / 55);
            var a = m * 6 + m * 55 * sp_rate; // 前m个水炮充能+自然恢复的sp量
            var b = 6 + 20 * sp_rate; // 最后一个水炮持续期间最多恢复的sp
            var c = 6; // 最后一个水炮充的sp
            var _r2 = 0; // 计算还需要多少时间充满
            if (a + b > spData.spCost) {
              // 技能会在b期间蓄好
              var y = Math.floor((spData.spCost - a) / (3 * sp_rate + 1.0));
              var z = (spData.spCost - a - y) / sp_rate - y * 3;
              _r2 = 3 * y + z;
              c = Math.floor(_r2 / 3);
            } else {
              _r2 = (spData.spCost - a - b) / sp_rate + 20;
            }
            attackDuration = m * 55 + _r2;
            attackCount = Math.ceil(attackDuration / attackTime);
            duration = attackDuration;
            log.write("[\u7279\u6B8A] " + displayNames["tachr_400_weedy_2"] + ": \u4F7F\u7528" + (m + 1) + "\u4E2A\u6C34\u70AE, \u5145\u80FDsp=" + (m * 6 + c));
          } else if (options.charge && checkSpecs(skillId, "charge")) {
            // 蓄力
            var chargeDuration = spData.spCost;
            if (buffList["tachr_426_billro_2"]) {
              chargeDuration /= 1 + buffFrame.spRecoveryPerSec + buffList["tachr_426_billro_2"].sp_recovery_per_sec;
              log.write("[\u7279\u6B8A] " + displayNames["tachr_426_billro_2"] + ": \u4E8C\u6BB5\u84C4\u529B\u65F6\u95F4 " + chargeDuration.toFixed(1) + " s");
            }
            attackDuration += chargeDuration;
            duration = attackDuration;
            attackCount = Math.ceil(attackDuration / attackTime);
          } else if (buffList["uniequip_002_milu"] && options.equip) {
            // 守林模组
            attackCount = Math.ceil((spData.spCost - stunDuration * sp_rate) / (buffList["uniequip_002_milu"].sp + attackTime * sp_rate));
            log.write("[\u7279\u6B8A] " + displayNames["uniequip_002_milu"] + ": attack sp = " + attackCount * buffList["uniequip_002_milu"].sp);
            duration = attackCount * attackTime;
          } else if (buffList["tachr_489_serum_1"] && skillId == "skchr_serum_1") {
            var esp = buffList["tachr_489_serum_1"].sp_recovery_per_sec * (stunDuration - buffList["tachr_489_serum_1"].delay);
            log.write("\u7729\u6655\u65F6\u989D\u5916\u6062\u590D " + esp.toFixed(1) + "sp");
            attackDuration = (spData.spCost - esp) / (1 + buffFrame.spRecoveryPerSec) - stunDuration;
            attackCount = Math.ceil(attackDuration / attackTime);
            duration = attackDuration;
          } else if (buffList["tachr_422_aurora_1"]) {
            attackDuration = spData.spCost / (1 + buffFrame.spRecoveryPerSec) / 2;
            if (attackDuration < stunDuration) attackDuration = 0;
            attackCount = Math.ceil(attackDuration / attackTime);
            duration = spData.spCost / (1 + buffFrame.spRecoveryPerSec);
            log.write("[\u7279\u6B8A] " + displayNames["tachr_422_aurora_1"] + ": \u666E\u653B\u65F6\u95F4 " + attackDuration.toFixed(3) + "s / " + duration.toFixed(3) + "s, \u653B\u51FB " + attackCount + " \u6B21");
            log.write("(晕眩期间不回复技力)");
          } else if (skillId == "skchr_blkngt_2" && options.token) {
            duration = attackDuration - blackboard["blkngt_s_2.duration"];
            attackCount = Math.ceil(duration / attackTime);
          }
          break;
        // todo: cast time
      } // switch

      // ogcd穿插收益
      if (rst == "ogcd") {
        var _ct = (checkSpecs(skillId, "cast_time") || 12) / 30;
        var weavingGain = (duration - spData.spCost - _ct) / duration * 100;
        log.write("[提示] 非GCD技能（技能不影响普攻间隔），计算器不计入穿插收益");
        if (weavingGain > 0) {
          log.writeNote("OGCD\u6280\u80FD/\u7A7F\u63D2\u6536\u76CA: " + weavingGain.toFixed(1) + "%");
        }
      }
    } // else
  } // sim else

  // 计算实际命中次数
  // attackCount = 发动攻击的次数(swings), hitCount = 命中敌人的次数(hits)
  var hitCount = attackCount * buffFrame.times * enemyCount;
  // 蓝毒2
  if (isSkill) {
    if (skillId == "skchr_bluep_2") {
      hitCount += attackCount * (blackboard["attack@times"] - 1);
    } else if (["skcom_assist_cost[2]", "skchr_utage_1", "skchr_tachak_1"].includes(skillId)) {
      // 投降类
      hitCount = 0;
    } else if (skillId == "skchr_kroos2_2") {
      var extra_atk_count = attackCount - blackboard["attack@max_stack_count"] / 2;
      if (extra_atk_count > 0) {
        hitCount += extra_atk_count * 2;
        log.writeNote("4\u8FDE\u51FB\u6B21\u6570: " + extra_atk_count);
      }
    }
  }

  log.write("\u6301\u7EED: " + duration.toFixed(3) + " s");
  log.write("\u653B\u51FB\u6B21\u6570: " + attackCount * buffFrame.times + " (" + buffFrame.times + " \u8FDE\u51FB x " + attackCount + ")");

  return {
    attackCount: attackCount,
    times: buffFrame.times,
    hitCount: hitCount,
    duration: duration,
    stunDuration: stunDuration,
    prepDuration: prepDuration,
    tags: tags,
    startSp: startSp
  };
}

function calculateAttack(charAttr, enemy, raidBlackboard, isSkill, charData, levelData, log) {
  var charId = charAttr.char.charId;
  var buffList = charAttr.buffList;
  var blackboard = buffList.skill;
  var basicFrame = charAttr.basic;
  var options = charAttr.char.options;

  // 备注信息
  if (isSkill && checkSpecs(charId, "note")) log.writeNote(checkSpecs(charId, "note"));
  //console.log(buffList);

  // 计算面板属性
  log.write("**【Buff计算】**");
  var buffFrame = initBuffFrame();
  for (var b in buffList) {
    var buffName = b == "skill" ? buffList[b].id : b;
    //console.log(buffName);
    if (!checkSpecs(buffName, "crit")) buffFrame = applyBuff(charAttr, buffFrame, b, buffList[b], isSkill, false, log, enemy);
  }
  // 计算团辅
  if (options.buff) buffFrame = applyBuff(charAttr, buffFrame, "raidBuff", raidBlackboard, isSkill, false, log, enemy);

  // 攻击类型
  var damageType = extractDamageType(charData, charAttr.char, isSkill, levelData.description, blackboard, options);
  if (damageType == 2) buffFrame.atk_scale *= buffFrame.heal_scale;
  // 灰喉-特判
  if (buffList["tachr_367_swllow_1"]) {
    buffFrame.attackSpeed += buffList["tachr_367_swllow_1"].attack_speed;
    log.write("[\u7279\u6B8A] " + displayNames["tachr_367_swllow_1"] + " - attack_speed + " + buffList["tachr_367_swllow_1"].attack_speed);
  }
  // 泡泡
  if (isSkill && blackboard.id == "skchr_bubble_2") {
    buffFrame.atk = basicFrame.def + buffFrame.def - basicFrame.atk;
    log.write("[\u7279\u6B8A] " + displayNames["skchr_bubble_2"] + ": \u653B\u51FB\u529B\u4EE5\u9632\u5FA1\u8BA1\u7B97(" + (basicFrame.def + buffFrame.def) + ")");
  }
  // 迷迭香
  if (["char_391_rosmon", "char_421_crow", "char_431_ashlok"].includes(charId)) {
    buffFrame.maxTarget = 999;
    log.write("[\u7279\u6B8A] " + displayNames[charId] + ": maxTarget = 999");
  }
  // 连击特判
  if (!isSkill && checkSpecs(charId, "times")) {
    var t = checkSpecs(charId, "times");
    buffFrame.times = t;
    log.write("[\u8FDE\u51FB] " + displayNames[charId] + " - \u653B\u51FB " + t + " \u6B21");
  }
  if (isSkill && checkSpecs(blackboard.id, "times")) {
    var t = checkSpecs(blackboard.id, "times");
    buffFrame.times = t;
    log.write("[\u8FDE\u51FB] " + displayNames[blackboard.id] + " - \u653B\u51FB " + t + " \u6B21");
  }

  // 瞬发技能的实际基础攻击间隔
  /*
  if (isSkill && checkSpecs(blackboard.id, "cast_bat")) {
    var f = checkSpecs(blackboard.id, "cast_bat");
    basicFrame.baseAttackTime = f / 30;
    log.write(`[特殊] ${displayNames[blackboard.id]} - 技能动画时间 ${(f/30).toFixed(3)}s, ${f} 帧`);
  }
  */
  var finalFrame = getBuffedAttributes(basicFrame, buffFrame);
  var critBuffFrame = initBuffFrame();
  var critFrame = {};
  // 暴击面板
  if (options.crit) {
    log.write("**【暴击Buff计算】**");
    for (var b in buffList) {
      var _buffName = b == "skill" ? blackboard.id : b;
      critBuffFrame = applyBuff(charAttr, critBuffFrame, b, buffList[b], isSkill, true, log, enemy);
    }
    // 计算团辅
    if (options.buff) critBuffFrame = applyBuff(charAttr, critBuffFrame, "raidBuff", raidBlackboard, isSkill, true, log, enemy);
    critFrame = getBuffedAttributes(basicFrame, critBuffFrame);
  }
  // ---- 计算攻击参数
  // 最大目标数
  if (charData.description.includes("阻挡的<@ba.kw>所有敌人") && buffFrame.maxTarget < basicFrame.blockCnt) {
    buffFrame.maxTarget = basicFrame.blockCnt;
  } else if (["所有敌人", "群体法术伤害", "群体物理伤害"].some(function (kw) {
    return charData.description.includes(kw);
  })) {
    buffFrame.maxTarget = 999;
  } else if (buffList["uniequip_002_flower"]) buffFrame.maxTarget = 4;else if (charData.description.includes("恢复三个") && !(isSkill && charId == "char_275_breeze")) {
    buffFrame.maxTarget = 3;
  }
  if (options.token) {
    if (blackboard.id == "skchr_mgllan_3" || isSkill && blackboard.id == "skchr_mgllan_2") buffFrame.maxTarget = 999;
    if (blackboard.id == "skchr_ling_3") buffFrame.maxTarget = options.ling_fusion ? 4 : 2;
  }
  // 计算最终攻击间隔，考虑fps修正
  var fps = 30;
  // 攻速上下界
  var _spd = Math.min(Math.max(10, finalFrame.attackSpeed), 600);
  if (finalFrame.attackSpeed != _spd) {
    finalFrame.attackSpeed = _spd;
    log.writeNote("达到攻速极限");
  }

  // sec spec
  if (checkSpecs(blackboard.id, "sec") && isSkill) {
    var intv = 1;
    if (checkSpecs(blackboard.id, "interval")) {
      intv = checkSpecs(blackboard.id, "interval");
    }
    finalFrame.baseAttackTime = intv;
    finalFrame.attackSpeed = 100;
    buffFrame.attackSpeed = 0;
    log.writeNote("\u6BCF " + intv + " \u79D2\u9020\u6210\u4E00\u6B21\u4F24\u5BB3/\u6CBB\u7597");
  }

  var realAttackTime = finalFrame.baseAttackTime * 100 / finalFrame.attackSpeed;
  var frame = realAttackTime * fps;
  // 额外帧数补偿 https://bbs.nga.cn/read.php?tid=20555008
  var corr = checkSpecs(charId, "frame_corr") || 0;
  var corr_s = checkSpecs(blackboard.id, "frame_corr");
  if (!(corr_s === false) && isSkill) corr = corr_s;
  if (corr != 0) {
    var real_frame = Math.ceil(frame); // 有误差时，不舍入而取上界，并增加补正值(一般为1)
    real_frame += corr;
    var prefix = corr > 0 ? "+" : "";
    if (isSkill) {
      log.writeNote("帧数补正");
      log.write("[补帧处理] 攻击间隔帧数 > 攻击动画帧数，实际攻击间隔需要补帧（参考动画帧数表）");
      log.write("[\u8865\u5E27\u5904\u7406] \u6280\u80FD\u7406\u8BBA " + Math.round(frame) + " \u5E27 / \u5B9E\u9645 " + real_frame + " \u5E27");
    } else {
      log.write("[补帧处理] 攻击间隔帧数 > 攻击动画帧数，实际攻击间隔需要补帧");
      log.write("[\u8865\u5E27\u5904\u7406] \u666E\u653B\u7406\u8BBA " + Math.round(frame) + " \u5E27 / \u5B9E\u9645 " + real_frame + " \u5E27");
    }
    frame = real_frame;
  } else {
    frame = Math.round(frame); // 无误差时，舍入成帧数
  }
  var frameAttackTime = frame / fps;
  var attackTime = frameAttackTime;
  calculateAnimation(charId, blackboard.id, isSkill, realAttackTime, finalFrame.attackSpeed, log);
  // 根据最终攻击间隔，重算攻击力
  if (isSkill && blackboard.id == "skchr_platnm_2") {
    // 白金
    var _rate = (attackTime - 1) / (buffList["tachr_204_platnm_1"]["attack@max_delta"] - 1);
    // 熔断
    _rate = Math.min(Math.max(_rate, 0), 1);
    buffFrame.atk_scale = 1 + _rate * (buffList["tachr_204_platnm_1"]["attack@max_atk_scale"] - 1);
    finalFrame = getBuffedAttributes(basicFrame, buffFrame); // 重算
    log.write("[\u7279\u6B8A] " + displayNames["tachr_204_platnm_1"] + ": atk_scale = " + buffFrame.atk_scale.toFixed(3) + " (" + (_rate * 100).toFixed(1) + "%\u84C4\u529B)");
  } else if (buffList["tachr_215_mantic_1"] && attackTime >= buffList["tachr_215_mantic_1"].delay) {
    // 狮蝎
    var atk = basicFrame.atk * buffList["tachr_215_mantic_1"].atk;
    log.write("[\u7279\u6B8A] " + displayNames["tachr_215_mantic_1"] + ": atk + " + atk);
    finalFrame.atk += atk;
    buffFrame.atk = finalFrame.atk - basicFrame.atk;
  }

  // 敌人属性
  var enemyBuffFrame = JSON.parse(JSON.stringify(buffFrame));
  // 处理对普攻也生效的debuff
  for (var b in buffList) {
    var _buffName2 = b == "skill" ? buffList[b].id : b;
    if (checkSpecs(_buffName2, "keep_debuff") && !enemyBuffFrame.applied[_buffName2]) {
      log.writeNote("假设全程覆盖Debuff");
      enemyBuffFrame = applyBuff(charAttr, enemyBuffFrame, _buffName2, buffList[b], true, false, new Log(), enemy);
    }
  }
  var edef = Math.max(0, (enemy.def + enemyBuffFrame.edef) * enemyBuffFrame.edef_scale * (1 - enemyBuffFrame.edef_pene_scale) - enemyBuffFrame.edef_pene);
  var emr = Math.min((enemy.magicResistance + enemyBuffFrame.emr) * enemyBuffFrame.emr_scale, 100);
  emr = Math.max(emr - enemyBuffFrame.emr_pene, 0);
  var emrpct = emr / 100;
  var ecount = Math.min(buffFrame.maxTarget, enemy.count);
  if (blackboard.id == "skchr_pudd_2" && isSkill && ecount > 1) ecount = buffFrame.maxTarget;

  // 平均化惊蛰/异客伤害
  if (['char_306_leizi', 'char_472_pasngr', 'char_4004_pudd'].includes(charId)) {
    var scale = 0.85,
        s = 1;tot = 1, sks = [1];
    if (isSkill && blackboard.id == "skchr_leizi_2") scale = 1;else if (charAttr.char.equipId && AKDATA.Data.battle_equip_table[charAttr.char.equipId]) scale = basicFrame.equip_blackboard["attack@chain.atk_scale"];

    for (var i = 0; i < ecount - 1; ++i) {
      s *= scale;tot += s;sks.push(s);
    }
    log.write("[\u7279\u6B8A] \u7535\u6CD5: \u539F\u672C\u4F24\u5BB3\u500D\u7387: " + buffFrame.damage_scale.toFixed(2));
    buffFrame.damage_scale *= tot / ecount;
    log.write("[\u7279\u6B8A] \u7535\u6CD5: \u8FDE\u9501\u500D\u7387: " + sks.map(function (x) {
      return x.toFixed(2);
    }) + ", \u5E73\u5747\u4F24\u5BB3\u500D\u7387 " + buffFrame.damage_scale.toFixed(2) + "x");
  }

  // 计算攻击次数和持续时间
  var dur = calcDurations(isSkill, attackTime, finalFrame.attackSpeed, levelData, buffList, buffFrame, ecount, options, charId, log);
  // 暴击次数
  if (options.crit && critBuffFrame["prob"]) {
    if (damageType != 2) {
      if (buffList["tachr_155_tiger_1"]) dur.critCount = dur.duration / 3 * critBuffFrame.prob;else if (charId == "char_420_flamtl") {
        dur.critCount = Math.floor(dur.duration / 5);
        switch (blackboard.id) {
          case "skchr_flamtl_1":
          case "skchr_flamtl_2":
            if (!isSkill) dur.critCount += 1;break;
          case "skchr_flamtl_3":
            if (isSkill) dur.critCount += 2;break;
        }
        console.log("\u6309\u95EA\u907F " + dur.critCount + " \u6B21\u8BA1\u7B97");
      } else if (blackboard.id == "skchr_aurora_2" && isSkill) {
        dur.critCount = options.freeze ? 9 : 3;
        log.writeNote("\u6309 " + dur.critCount + " \u6B21\u66B4\u51FB\u8BA1\u7B97");
      } else dur.critCount = dur.attackCount * critBuffFrame.prob;

      if (dur.critCount > 1) dur.critCount = Math.floor(dur.critCount);
      // 折算为命中次数
      if (buffList["tachr_222_bpipe_1"]) {
        dur.critHitCount = dur.critCount * dur.times * Math.min(enemy.count, 2);
      } else if (charId == "char_420_flamtl") {
        dur.critHitCount = dur.critCount * 2 * enemy.count;
      } else dur.critHitCount = dur.critCount * dur.times * ecount;

      if (charId == "char_1021_kroos2") {
        dur.critHitCount = Math.floor(dur.hitCount * critBuffFrame.prob);
        dur.hitCount -= dur.critHitCount;
      } else {
        dur.hitCount = (dur.attackCount - dur.critCount) * dur.times * ecount;
      }
    } else {
      dur.critCount = 0;dur.critHitCount = 0;
    }
  } else {
    dur.critCount = 0;dur.critHitCount = 0;
  }

  //console.log(finalFrame, dur);
  // 输出面板数据
  log.write("\n**【最终面板】**");
  var atk_line = "(" + basicFrame.atk.toFixed(1) + " + " + buffFrame.atk.toFixed(1) + ") * " + buffFrame.atk_scale.toFixed(2);
  // if (buffFrame.damage_scale != 1) { atk_line += ` * ${buffFrame.damage_scale.toFixed(2)}`; }
  log.write("\u653B\u51FB\u529B / \u500D\u7387:  " + finalFrame.atk.toFixed(2) + " = " + atk_line);
  log.write("\u653B\u51FB\u95F4\u9694: " + finalFrame.baseAttackTime.toFixed(3) + " s");
  log.write("\u653B\u901F: " + finalFrame.attackSpeed + " %");
  log.write("\u6700\u7EC8\u653B\u51FB\u95F4\u9694: " + (realAttackTime * 30).toFixed(2) + " \u5E27, " + realAttackTime.toFixed(3) + " s");
  if (corr != 0) {
    log.write("**\u5E27\u6570\u8865\u6B63\u540E\u653B\u51FB\u95F4\u9694: " + frame + " \u5E27, " + frameAttackTime.toFixed(3) + " s**");
  } else {
    log.write("**\u5E27\u5BF9\u9F50\u653B\u51FB\u95F4\u9694: " + frame + " \u5E27, " + frameAttackTime.toFixed(3) + " s**");
  }
  if (edef != enemy.def) log.write("\u654C\u4EBA\u9632\u5FA1: " + edef.toFixed(1) + " (" + (edef - enemy.def).toFixed(1) + ")");
  if (emr != enemy.magicResistance) {
    rate = (emr - enemy.magicResistance) / enemy.magicResistance;
    log.write("\u654C\u4EBA\u9B54\u6297: " + emr.toFixed(1) + "% (" + (rate * 100).toFixed(1) + "%)");
  }
  if (ecount > 1 || enemy.count > 1) log.write("\u76EE\u6807\u6570: " + ecount + " / " + enemy.count);

  // 计算伤害
  log.write("\n**【伤害计算】**");
  log.write("\u4F24\u5BB3\u7C7B\u578B: " + ['物理', '法术', '治疗', '真伤'][damageType]);
  var dmgPrefix = damageType == 2 ? "治疗" : "伤害";
  var hitDamage = finalFrame.atk;
  var critDamage = 0;
  var damagePool = [0, 0, 0, 0, 0]; // 物理，魔法，治疗，真伤，盾
  var extraDamagePool = [0, 0, 0, 0, 0];
  var move = 0;

  function calculateHitDamage(frame, scale) {
    var minRate = 0.05,
        ret = 0;
    if (buffList["tachr_144_red_1"]) minRate = buffList["tachr_144_red_1"].atk_scale;
    if (buffList["tachr_366_acdrop_1"]) {
      minRate = options.cond ? buffList["tachr_366_acdrop_1"].atk_scale_2 : buffList["tachr_366_acdrop_1"].atk_scale;
    }
    if (damageType == 0) ret = Math.max(frame.atk - edef, frame.atk * minRate);else if (damageType == 1) ret = Math.max(frame.atk * (1 - emrpct), frame.atk * minRate);else ret = frame.atk;
    if (ret <= frame.atk * minRate) log.write("[抛光]");
    if (scale != 1) {
      ret *= scale;
      log.write("damage_scale: " + scale.toFixed(2) + "x");
    }
    return ret;
  }

  hitDamage = calculateHitDamage(finalFrame, buffFrame.damage_scale);
  damagePool[damageType] += hitDamage * dur.hitCount;
  log.write(dmgPrefix + ": " + hitDamage.toFixed(2) + ", \u547D\u4E2D " + dur.hitCount.toFixed(1));

  // 计算额外伤害
  // 暴击
  if (options.crit) {
    // console.log(critBuffFrame);
    if (blackboard.id == "skchr_peacok_2") {
      dur.critHitCount = 0;
      if (isSkill) {
        log.write("\u521B\u4E16\u7EAA - \u6210\u529F\uFF08\u66B4\u51FB\uFF09\u4E3A\u5168\u4F53\u6CD5\u672F\u4F24\u5BB3");
        damageType = 1;
        ecount = enemy.count;
        dur.critHitCount = enemy.count;
      }
    }
    edef = Math.max(0, (enemy.def + critBuffFrame.edef) * critBuffFrame.edef_scale * (1 - critBuffFrame.edef_pene_scale) - critBuffFrame.edef_pene);
    if (edef != enemy.def) log.write("[\u66B4\u51FB]\u654C\u4EBA\u9632\u5FA1: " + edef.toFixed(1) + " (" + (edef - enemy.def).toFixed(1) + ")");
    critDamage = calculateHitDamage(critFrame, critBuffFrame.damage_scale);
    if (critDamage > 0 && dur.critHitCount > 0) {
      log.write("\u66B4\u51FB" + dmgPrefix + ": " + critDamage.toFixed(2) + ", \u547D\u4E2D " + dur.critHitCount);
    }
    damagePool[damageType] += critDamage * dur.critHitCount;
  }
  // 空(被动治疗没有写在天赋中)
  if (["char_1012_skadi2", "char_101_sora", "char_4045_heidi"].includes(charId)) {
    var ratio_sora = 0.1;
    if (isSkill && blackboard.id == "skchr_skadi2_3") ratio_sora = 0;else if (isSkill && blackboard["attack@atk_to_hp_recovery_ratio"]) ratio_sora = blackboard["attack@atk_to_hp_recovery_ratio"];
    extraDamagePool[2] = ratio_sora * finalFrame.atk * dur.duration * enemy.count;
    damagePool[2] = 0;damagePool[3] = 0;log.write("[特殊] 伤害为0 （以上计算无效），可以治疗召唤物");
    log.writeNote("可以治疗召唤物");
  }
  // 反射类-增加说明
  if (checkSpecs(blackboard.id, "reflect") && isSkill) {
    log.writeNote("\u6280\u80FD\u4F24\u5BB3\u4E3A\u53CD\u5C04 " + dur.attackCount + " \u6B21\u7684\u4F24\u5BB3");
  }
  // 可变攻击力-重新计算
  if (checkSpecs(charId, "grad") || checkSpecs(blackboard.id, "grad") && isSkill) {
    if (blackboard.id == "skchr_kalts_3" && !options.token) {
      /* skip */
    } else {
      var _kwargs = {
        charId: charId,
        skillId: blackboard.id,
        isSkill: isSkill,
        options: options,
        basicFrame: basicFrame,
        buffFrame: buffFrame,
        finalFrame: finalFrame,
        blackboard: blackboard,
        dur: dur,
        attackTime: attackTime,
        hitDamage: hitDamage,
        damageType: damageType,
        edef: edef,
        ecount: ecount,
        emrpct: emrpct,
        log: log
      };
      log.write("[特殊] 可变技能，重新计算伤害 ----");
      damagePool[damageType] = calculateGradDamage(_kwargs);
    }
  }

  // 额外伤害
  for (var b in buffList) {
    var _buffName3 = b;
    var bb = buffList[b]; // blackboard
    if (_buffName3 == "skill") {
      _buffName3 = bb.id;
    }
    var pool = [0, 0, 0, 0, 0]; // 物理，魔法，治疗，真伤，盾
    var damage = 0;
    var heal = 0,
        _atk = 0;

    if (!isSkill) {
      // 只在非技能期间生效
      switch (_buffName3) {
        // 伤害
        case "skchr_ethan_1":
          pool[1] += bb["attack@poison_damage"] * dur.duration * (1 - emrpct) * ecount;
          break;
        case "skchr_aglina_2":
        case "skchr_aglina_3":
        case "skchr_beewax_1":
        case "skchr_beewax_2":
        case "skchr_billro_1":
        case "skchr_billro_2":
        case "skchr_billro_3":
        case "skchr_mint_1":
        case "skchr_mint_2":
          damagePool[1] = 0;
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u4F24\u5BB3\u4E3A0 \uFF08\u4EE5\u4E0A\u8BA1\u7B97\u65E0\u6548\uFF09");
          break;
        case "skchr_takila_1":
        case "skchr_takila_2":
          damagePool[0] = 0;
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u4F24\u5BB3\u4E3A0 \uFF08\u4EE5\u4E0A\u8BA1\u7B97\u65E0\u6548\uFF09");
          break;
        default:
          if (b == "skill") continue; // 非技能期间，跳过其他技能的额外伤害判定
      }
    }
    //console.log(buffName);
    switch (_buffName3) {
      case "tachr_129_bluep_1":
        damage = Math.max(bb.poison_damage * (1 - emrpct), bb.poison_damage * 0.05);
        var total_damage = damage * dur.duration * ecount;
        if (isSkill && blackboard.id == "skchr_bluep_1" && ecount > 1) {
          var damage2 = damage * blackboard.atk_scale;
          total_damage = damage * dur.duration + damage2 * 3;
          log.write("[\u7279\u6B8A] " + displayNames["skchr_bluep_1"] + ": \u526F\u76EE\u6807\u6BD2\u4F24 " + damage2 + " * 3s");
        }
        pool[1] += total_damage;
        log.writeNote("毒伤按循环时间计算");
        break;
      case "tachr_293_thorns_1":
        var poison = options.thorns_ranged ? bb["damage[ranged]"] : bb["damage[normal]"];
        damage = Math.max(poison * (1 - emrpct), poison * 0.05) * dur.duration * ecount;
        pool[1] = damage;
        if (isSkill) log.writeNote("毒伤按循环时间计算");
        break;
      case "tachr_346_aosta_1":
        var poison = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale;
        if (blackboard.id == "skchr_aosta_2") poison *= blackboard.talent_scale;
        log.write("\u6D41\u8840\u4F24\u5BB3/\u79D2: " + poison.toFixed(1));
        damage = Math.max(poison * (1 - emrpct), poison * 0.05) * dur.duration * ecount;
        pool[1] = damage;
        if (isSkill) log.writeNote("毒伤按循环时间计算");
        break;
      case "tachr_181_flower_1":
        pool[2] += bb.atk_to_hp_recovery_ratio * finalFrame.atk * dur.duration * enemy.count;
        if (isSkill) log.writeNote("可以治疗召唤物");
        break;
      case "tachr_436_whispr_1":
        if (options.cond) {
          var ts = blackboard.id == "skchr_whispr_2" ? blackboard.talent_scale : 1;
          var extra_hps = bb.atk_to_hp_recovery_ratio * finalFrame.atk * ts;
          pool[2] += extra_hps * dur.duration * enemy.count;
          log.write("\u5929\u8D4Bhps: " + extra_hps.toFixed(1));
          if (isSkill) log.writeNote("天赋可以治疗召唤物");
        }
        break;
      case "tachr_188_helage_trait":
      case "tachr_337_utage_trait":
      case "tachr_475_akafyu_trait":
      case "tachr_485_pallas_2":
        pool[2] += bb.value * dur.hitCount;
        break;
      case "tachr_421_crow_trait":
        pool[2] += bb.value * dur.attackCount * Math.min(ecount, 2);
        break;
      case "tachr_2013_cerber_1":
        damage = bb.atk_scale * edef * Math.max(1 - emrpct, 0.05);
        pool[1] += damage * dur.hitCount;
        break;
      case "tachr_391_rosmon_trait":
        var ntimes = 1;
        if (isSkill && blackboard.id == "skchr_rosmon_2") ntimes = 3;
        var quake_atk = finalFrame.atk / buffFrame.atk_scale * bb["attack@append_atk_scale"];
        var quake_damage = Math.max(quake_atk - edef, quake_atk * 0.05);

        damage = quake_damage * dur.hitCount * ntimes;
        log.write(displayNames[_buffName3] + ": \u4F59\u9707\u653B\u51FB\u529B " + quake_atk.toFixed(1) + ", \u5355\u6B21\u4F24\u5BB3 " + quake_damage.toFixed(1) + ", \u6B21\u6570 " + ntimes);
        log.write(displayNames[_buffName3] + ": \u4F59\u9707\u547D\u4E2D " + dur.hitCount * ntimes + ", \u603B\u4F24\u5BB3 " + damage.toFixed(1));
        pool[0] += damage;
        break;
      // 技能
      // 伤害类
      case "skchr_ifrit_2":
        damage = basicFrame.atk * bb["burn.atk_scale"] * Math.floor(bb.duration) * (1 - emrpct) * buffFrame.damage_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u707C\u70E7\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + ecount);
        pool[1] += damage * dur.attackCount * ecount;
        break;
      case "skchr_amgoat_2":
        damage = finalFrame.atk / 2 * (1 - enemy.magicResistance / 100) * buffFrame.damage_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6E85\u5C04\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + dur.attackCount * (enemy.count - 1));
        pool[1] += damage * dur.attackCount * (enemy.count - 1);
        break;
      case "skchr_nightm_2":
        move = bb.duration / 4;
        log.writeNote("\u603B\u4F4D\u79FB\u4F30\u7B97\u4E3A" + move.toFixed(1) + "\u683C");
        pool[3] += bb.value * move * ecount;
        break;
      case "skchr_weedy_3":
        if (options.token) move = bb.force * bb.force / 3 + bb.duration / 5;else move = bb.force * bb.force / 4 + bb.duration / 5;
        log.writeNote("\u603B\u4F4D\u79FB\u4F30\u7B97\u4E3A" + move.toFixed(1) + "\u683C");
        pool[3] += bb.value * move * ecount;
        break;
      case "skchr_huang_3":
        var finishAtk = finalFrame.atk * bb.damage_by_atk_scale;
        damage = Math.max(finishAtk - enemy.def, finishAtk * 0.05) * buffFrame.damage_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u7EC8\u7ED3\u4F24\u5BB3 = " + damage.toFixed(1) + ", \u547D\u4E2D " + ecount);
        pool[0] += damage * ecount;
        break;
      case "skchr_chen_2":
        damage = finalFrame.atk * (1 - emrpct) * buffFrame.damage_scale;
        pool[1] += damage * dur.hitCount;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 = " + damage.toFixed(1) + ", \u547D\u4E2D " + dur.hitCount);
        break;
      case "skchr_bibeak_1":
        if (enemy.count > 1) {
          damage = finalFrame.atk * (1 - emrpct) * buffFrame.damage_scale;
          pool[1] += damage;
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 = " + damage.toFixed(1));
        }
        break;
      case "skchr_ayer_2":
        damage = finalFrame.atk * bb.atk_scale * (1 - emrpct) * buffFrame.damage_scale;
        pool[1] += damage * enemy.count * dur.hitCount;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 = " + damage.toFixed(1) + ", \u547D\u4E2D " + enemy.count * dur.hitCount);
        log.writeNote("假设断崖的当前攻击目标也被阻挡");
        break;
      case "skcom_assist_cost[2]":
      case "skcom_assist_cost[3]":
      case "skchr_myrtle_2":
      case "skchr_elysm_2":
      case "skchr_skgoat_2":
      case "skchr_utage_1":
      case "skchr_snakek_2":
      case "skchr_blitz_1":
      case "skchr_robrta_2":
        damagePool[0] = 0;damagePool[1] = 0;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u4F24\u5BB3\u4E3A0 \uFF08\u4EE5\u4E0A\u8BA1\u7B97\u65E0\u6548\uFF09");
        break;
      case "skchr_silent_2":
      case "skchr_zebra_1":
        damagePool[2] = 0;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CBB\u7597\u4E3A0 \uFF08\u4EE5\u4E0A\u8BA1\u7B97\u65E0\u6548\uFF09");
        break;
      case "skchr_sddrag_2":
        damage = finalFrame.atk * bb["attack@skill.atk_scale"] * (1 - emrpct) * buffFrame.damage_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 = " + damage.toFixed(1) + ", \u547D\u4E2D " + dur.hitCount);
        pool[1] += damage * dur.hitCount;
        break;
      case "skchr_haak_2":
      case "skchr_haak_3":
        log.writeNote("\u653B\u51FB\u961F\u53CB15\u6B21(\u4E0D\u8BA1\u5165\u81EA\u8EABdps)");
        break;
      case "skchr_podego_2":
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u76F4\u63A5\u4F24\u5BB3\u4E3A0 \uFF08\u4EE5\u4E0A\u8BA1\u7B97\u65E0\u6548\uFF09, \u6548\u679C\u6301\u7EED" + bb.projectile_delay_time + "\u79D2");
        damage = finalFrame.atk * bb.projectile_delay_time * (1 - emrpct) * enemy.count * buffFrame.damage_scale;
        pool[1] = damage;damagePool[1] = 0;
        break;
      case "skchr_beewax_2":
      case "skchr_mint_2":
        if (isSkill) {
          damage = finalFrame.atk * bb.atk_scale * (1 - emrpct) * ecount * buffFrame.damage_scale;
          pool[1] = damage;
        }
        break;
      case "skchr_tomimi_2":
        if (isSkill && options.crit) {
          damage = Math.max(finalFrame.atk - enemy.def, finalFrame.atk * 0.05);
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u8303\u56F4\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + dur.critHitCount * (enemy.count - 1));
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u603B\u5171\u7729\u6655 " + (dur.critHitCount * bb["attack@tomimi_s_2.stun"]).toFixed(1) + " \u79D2");
          pool[0] += damage * dur.critHitCount * (enemy.count - 1);
        }
        break;
      case "skchr_archet_1":
        _atk = finalFrame.atk / bb.atk_scale * bb.atk_scale_2;
        var hit = Math.min(enemy.count - 1, bb.show_max_target) * dur.hitCount;
        damage = Math.max(_atk - enemy.def, _atk * 0.05) * buffFrame.damage_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u5206\u88C2\u7BAD\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + hit);
        pool[0] += damage * hit;
        break;
      case "skchr_archet_2":
        var n = Math.min(4, enemy.count - 1);
        if (n > 0) {
          var _hit = (9 - n) * n / 2;
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u5F39\u5C04\u7BAD\u989D\u5916\u547D\u4E2D " + _hit + " (" + n + " \u989D\u5916\u76EE\u6807)");
          pool[0] += hitDamage * _hit;
        }
        break;
      case "tachr_338_iris_trait":
      case "tachr_469_indigo_trait":
        if (isSkill && ["skchr_iris_2", "skchr_indigo_2"].includes(blackboard.id)) {} else {
          var _scale3 = buffList["tachr_338_iris_1"] ? buffList["tachr_338_iris_1"].atk_scale : 1;
          damage = hitDamage * _scale3 * buffFrame.damage_scale;
          var md = damage * 3 + hitDamage;
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u84C4\u529B\u4F24\u5BB3 " + damage.toFixed(1) + ", \u6EE1\u84C4\u529B\u4F24\u5BB3(3\u84C4+\u666E\u653B) " + md.toFixed(1) + ", \u4E0D\u8BA1\u5165dps");
          log.writeNote("\u6EE1\u84C4\u529B\u4F24\u5BB3 " + md.toFixed(1));
          if (isSkill) log.writeNote("(不计入dps)");
        }
        break;
      case "skchr_ash_3":
        _atk = finalFrame.atk / bb.atk_scale * (options.cond ? bb.hitwall_scale : bb.not_hitwall_scale);
        damage = Math.max(_atk - enemy.def, _atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * enemy.count;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u7206\u70B8\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + enemy.count);
        break;
      case "skchr_blitz_2":
        _atk = finalFrame.atk * bb.atk_scale;
        damage = Math.max(_atk - enemy.def, _atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * enemy.count;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u8303\u56F4\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + enemy.count);
        break;
      case "skchr_rfrost_2":
        _atk = finalFrame.atk / bb.atk_scale * bb.trap_atk_scale;
        damage = Math.max(_atk - enemy.def, _atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u9677\u9631\u4F24\u5BB3 " + damage.toFixed(1));
        break;
      case "skchr_tachak_1":
        _atk = finalFrame.atk * bb.atk_scale;
        damage = Math.max(_atk * (1 - emrpct), _atk * 0.05) * buffFrame.damage_scale;
        pool[1] += damage * bb.projectile_delay_time * enemy.count;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u71C3\u70E7\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + bb.projectile_delay_time * enemy.count);
        break;
      case "skchr_pasngr_3":
        _atk = finalFrame.atk * bb.atk_scale;
        damage = Math.max(_atk * (1 - emrpct), _atk * 0.05) * buffFrame.damage_scale;
        pool[1] += damage * ecount * 8;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u96F7\u51FB\u533A\u57DF\u4F24\u5BB3 " + damage.toFixed(1) + " (\u5E73\u5747\u500D\u7387 " + buffFrame.damage_scale.toFixed(2) + "), \u547D\u4E2D " + 8 * ecount);
        break;
      case "skchr_toddi_2":
        _atk = finalFrame.atk / bb["attack@atk_scale"] * bb["attack@splash_atk_scale"];
        damage = Math.max(_atk - enemy.def, _atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * enemy.count * dur.hitCount;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u7206\u70B8\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + enemy.count * dur.hitCount);
        break;
      case "skchr_indigo_2":
        if (options.cond) {
          _atk = finalFrame.atk * bb["indigo_s_2[damage].atk_scale"];
          damage = Math.max(_atk * (1 - emrpct), _atk * 0.05) * buffFrame.damage_scale;
          pool[1] += damage * enemy.count * dur.duration * 2;
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + enemy.count * dur.duration * 2);
          log.writeNote("\u89E6\u53D1\u675F\u7F1A\u4F24\u5BB3");
        }
        break;
      case "tachr_426_billro_1":
        if (isSkill) {
          damage = bb.heal_scale * finalFrame.maxHp;
          if (options.charge) damage *= 2;
          pool[2] += damage;
        }
      case "tachr_486_takila_1":
        if (!isSkill) {
          damage = finalFrame.atk * bb.atk_scale * (1 - emrpct) * buffFrame.damage_scale;
          log.writeNote("\u6280\u80FD\u672A\u5F00\u542F\u65F6\u53CD\u5F39\u6CD5\u4F24\u6700\u9AD8\u4E3A " + damage.toFixed(1));
        }
        break;
      case "tachr_437_mizuki_1":
        var _scale2 = bb["attack@mizuki_t_1.atk_scale"];
        if (blackboard.id == "skchr_mizuki_1" && isSkill) _scale2 *= buffList.skill.talent_scale;
        log.write("\u6CD5\u4F24\u500D\u7387: " + _scale2.toFixed(2) + "x");
        damage = finalFrame.atk / buffFrame.atk_scale * _scale2 * (1 - emrpct) * buffFrame.damage_scale;
        var nHit = 1;
        if (isSkill) {
          if (blackboard.id == "skchr_mizuki_2") nHit = 2;else if (blackboard.id == "skchr_mizuki_3") nHit = 3;
        }
        nHit = dur.attackCount * Math.min(ecount, nHit);
        pool[1] += damage * nHit;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + nHit);
        break;
      case "tachr_1014_nearl2_1":
        var _scale = bb.atk_scale;
        var _nHit = options.cond ? 2 : 1;
        damage = finalFrame.atk * _scale * buffFrame.damage_scale;
        switch (blackboard.id) {
          case "skchr_nearl2_1":
            if (!isSkill) log.writeNote("\u672C\u4F53\u843D\u5730\u4F24\u5BB3 " + damage.toFixed(1) + ", \u4E0D\u8BA1\u5165\u603B\u4F24\u5BB3");
            break;
          case "skchr_nearl2_2":
            if (isSkill) {
              pool[3] += damage * ecount * _nHit;
              log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u843D\u5730\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + ecount * _nHit);
            }
            break;
          case "skchr_nearl2_3":
            if (!isSkill) log.writeNote("\u672C\u4F53\u843D\u5730\u4F24\u5BB3 " + damage.toFixed(1) + ", \u4E0D\u8BA1\u5165\u603B\u4F24\u5BB3");else {
              _scale = buffList.skill.value;
              damage = finalFrame.atk * _scale * buffFrame.damage_scale;
              pool[3] += damage * ecount * _nHit;
              log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u843D\u5730\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + ecount * _nHit);
            }
            break;
        }
        break;
      case "skchr_lmlee_2":
        var lmlee_2_scale = bb.default_atk_scale + bb.factor_atk_scale * bb.max_stack_cnt;
        damage = finalFrame.atk * lmlee_2_scale * (1 - emrpct) * buffFrame.damage_scale;
        //pool[1] += damage * ecount;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6EE1\u5C42\u6570\u7206\u70B8\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + ecount);
        log.writeNote("\u6EE1\u5C42\u6570\u7206\u70B8\u4F24\u5BB3 " + damage.toFixed(1));
        break;
      // 间接治疗
      case "skchr_tiger_2":
        pool[2] += damagePool[1] * bb.heal_scale;break;
      case "skchr_strong_2":
        pool[2] += damagePool[0] * bb.scale;break;
      case "skcom_heal_self[1]":
      case "skcom_heal_self[2]":
        damagePool[2] = 0;
        // console.log(finalFrame);
        pool[2] += bb.heal_scale * finalFrame.maxHp;break;
      case "skchr_nightm_1":
        pool[2] += damagePool[1] * bb["attack@heal_scale"] * Math.min(enemy.count, bb["attack@max_target"]);break;
      case "skchr_folnic_2":
        pool[2] += bb["attack@heal_scale"] * finalFrame.atk / buffFrame.atk_scale * dur.hitCount;break;
      case "skchr_breeze_2":
        damage = finalFrame.atk / 2;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6E85\u5C04\u6CBB\u7597 " + damage.toFixed(1) + ", \u547D\u4E2D " + dur.attackCount * (enemy.count - 1));
        pool[2] += damage * dur.attackCount * (enemy.count - 1);
        break;
      case "skchr_ccheal_1":
        heal = finalFrame.atk * bb.heal_scale * bb.duration * dur.duration / attackTime; // 乘以技能次数
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": HoT " + heal.toFixed(1));
        pool[2] += heal;
        break;
      case "skchr_ccheal_2":
        heal = finalFrame.atk * bb.heal_scale * bb.duration;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": HoT " + heal.toFixed(1) + ", \u547D\u4E2D " + enemy.count);
        pool[2] += heal * enemy.count;
        break;
      case "skchr_shining_2":
      case "skchr_tuye_1":
        heal = finalFrame.atk * bb.atk_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u62A4\u76FE\u91CF " + heal);
        pool[4] += heal;
        break;
      case "skchr_cgbird_2":
        heal = finalFrame.atk * bb.atk_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u62A4\u76FE\u91CF " + heal + ", \u547D\u4E2D " + ecount);
        pool[4] += heal * ecount;
        break;
      case "skchr_tknogi_2":
      case "skchr_lisa_3":
        heal = finalFrame.atk * bb["attack@atk_to_hp_recovery_ratio"] * enemy.count * (dur.duration - 1);
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": HoT " + heal.toFixed(1) + "\uFF0C\u53EF\u4EE5\u6CBB\u7597\u53EC\u5524\u7269");
        log.writeNote("可以治疗召唤物");
        log.writeNote("第一秒无治疗效果（待确认）");
        pool[2] += heal;
        damagePool[2] = 0;log.write("[特殊] 直接治疗为0");
        break;
      case "skchr_blemsh_1":
        heal = finalFrame.atk * bb.heal_scale / buffFrame.atk_scale;
        pool[2] += heal;
        break;
      case "skchr_blemsh_2":
        heal = finalFrame.atk * bb["attack@atk_to_hp_recovery_ratio"] / buffFrame.atk_scale;
        log.write("\u6BCF\u79D2\u5355\u4F53\u6CBB\u7597: " + heal.toFixed(1));
        log.writeNote("可以治疗召唤物");
        pool[2] += heal * dur.duration * enemy.count;
        break;
      case "skchr_blemsh_3":
        damage = finalFrame.atk * bb["attack@blemsh_s_3_extra_dmg[magic].atk_scale"];
        damage = Math.max(damage * (1 - emrpct), damage * 0.05);
        heal = finalFrame.atk / buffFrame.atk_scale * bb.heal_scale;
        log.write("\u6BCF\u6B21\u653B\u51FB\u989D\u5916\u6CD5\u4F24\uFF1A" + damage.toFixed(1) + " \uFF08\u8BA1\u7B97\u5929\u8D4B\u52A0\u6210\uFF09\uFF0C\u989D\u5916\u6CBB\u7597: " + heal.toFixed(1));
        pool[1] += damage * dur.attackCount;
        pool[2] += heal * dur.attackCount;
        break;
      case "skchr_rosmon_1":
        damage = finalFrame.atk * bb.extra_atk_scale;
        damage = Math.max(damage * (1 - emrpct), damage * 0.05) * dur.hitCount;
        pool[1] += damage;
        log.write(displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 " + damage.toFixed(1));
        break;
      case "skchr_kirara_1":
        damage = finalFrame.atk * bb["kirara_s_1.atk_scale"];
        damage = Math.max(damage * (1 - emrpct), damage * 0.05) * dur.hitCount;
        pool[1] += damage;
        log.write(displayNames[_buffName3] + ": \u6CD5\u672F\u4F24\u5BB3 " + damage.toFixed(1));
        break;
      case "skchr_amiya2_2":
        var arts_atk = finalFrame.atk * bb.atk_scale;
        var real_atk = finalFrame.atk * bb.atk_scale_2;
        var arts_dmg = Math.max(arts_atk * (1 - emrpct), arts_atk * 0.05);
        log.write("[\u65A9\u51FB] \u6CD5\u672F\u4F24\u5BB3 " + arts_dmg.toFixed(1) + ", \u547D\u4E2D 9, \u771F\u5B9E\u4F24\u5BB3 " + real_atk.toFixed(1) + ", \u547D\u4E2D 1");
        pool[1] += arts_dmg * 9;
        pool[3] += real_atk;
        break;
      case "skchr_kafka_1":
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u76F4\u63A5\u4F24\u5BB3\u4E3A0 \uFF08\u4EE5\u4E0A\u8BA1\u7B97\u65E0\u6548\uFF09, \u6548\u679C\u6301\u7EED" + bb.duration + "\u79D2");
        damage = finalFrame.atk * (1 - emrpct) * enemy.count;
        pool[1] = damage;damagePool[1] = 0;
        break;
      case "skchr_kafka_2":
        damage = finalFrame.atk * bb.atk_scale * (1 - emrpct) * enemy.count;
        pool[1] = damage;
        break;
      case "skchr_tuye_2":
        pool[2] = finalFrame.atk * bb.heal_scale;
        log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u77AC\u95F4\u6CBB\u7597 " + pool[2].toFixed(1) + ", \u6700\u591A3\u6B21");
        log.writeNote("\u77AC\u95F4\u6CBB\u7597\u91CF " + pool[2].toFixed(1));
        pool[2] *= 3;
        break;
      case "skchr_nothin_1":
      case "skchr_nothin_2":
        var a = finalFrame.atk * buffList["tachr_455_nothin_1"].atk_scale;
        damage = Math.max(a - edef, a * 0.05);
        log.writeNote("\u9996\u6B21\u653B\u51FB\u4F24\u5BB3 " + damage.toFixed(1));
        break;
      case "skchr_heidi_1":
      case "skchr_heidi_2":
      case "skchr_skadi2_2":
      case "skchr_sora_2":
        if (bb.max_hp) {
          var buff_hp = finalFrame.maxHp * bb.max_hp;
          log.writeNote("\u961F\u53CBHP\u589E\u52A0 " + buff_hp.toFixed(1));
        }
        if (bb.def) {
          var buff_def = finalFrame.def * bb.def;
          log.writeNote("\u961F\u53CB\u9632\u5FA1\u529B\u589E\u52A0 " + buff_def.toFixed(1));
        }
        if (bb.atk) {
          var buff_atk = finalFrame.atk * bb.atk;
          log.writeNote("\u961F\u53CB\u653B\u51FB\u529B\u589E\u52A0 " + buff_atk.toFixed(1));
        }
        break;
      case "skchr_skadi2_3":
        var buff_atk = finalFrame.atk * bb.atk;
        damage = finalFrame.atk * bb.atk_scale * buffFrame.damage_scale;
        pool[3] += damage * enemy.count * dur.duration;
        log.writeNote("\u961F\u53CB\u653B\u51FB\u529B\u589E\u52A0 " + buff_atk.toFixed(1));
        log.writeNote("\u6BCF\u79D2\u771F\u5B9E\u4F24\u5BB3 " + damage.toFixed(1) + ", \u603B\u4F24\u5BB3 " + pool[3]);
        log.writeNote("\u53E0\u52A0\u6D77\u55E3\u65F6\u771F\u4F24x2\uFF0C\u4E0D\u53E6\u884C\u8BA1\u7B97");
        break;
      case "skchr_mizuki_3":
        if (ecount < 3) {
          damage = bb["attack@hp_ratio"] * finalFrame.maxHp;
          log.writeNote("\u76EE\u6807\u6570<3\uFF0C\u81EA\u8EAB\u4F24\u5BB3 " + damage.toFixed(1));
          pool[2] -= damage * dur.attackCount;
        }
        break;
      case "tachr_473_mberry_trait":
      case "tachr_449_glider_trait":
      case "tachr_4041_chnut_trait":
        var ep_ratio = bb.ep_heal_ratio;
        var ep_scale = 1;
        if (isSkill) {
          switch (blackboard.id) {
            case "skchr_mberry_1":
              ep_ratio = buffList.skill.ep_heal_ratio;
              break;
            case "skchr_glider_1":
              ep_ratio = buffList.skill["glider_s_1.ep_heal_ratio"];
              ep_scale = 3;
              log.writeNote("计算3秒内总元素回复量");
              break;
            case "skchr_chnut_1":
              ep_scale = buffList.skill.trait_scale;
              break;
            case "skchr_chnut_2":
              ep_scale = buffList.skill["attack@heal_continuously_scale"];
              break;
          }
        }
        if (buffList["tachr_4041_chnut_1"] && options.cond) {
          ep_scale *= buffList["tachr_4041_chnut_1"].ep_heal_scale;
        }
        log.write("\u5143\u7D20\u6CBB\u7597\u7CFB\u6570: " + ep_ratio.toFixed(2) + "x");
        if (ep_scale != 1) log.write("\u5143\u7D20\u6CBB\u7597\u500D\u7387: " + ep_scale.toFixed(2) + "x");

        damage = finalFrame.atk / buffFrame.heal_scale * ep_ratio * ep_scale;
        var ep_total = damage * dur.hitCount;
        log.writeNote("\u5143\u7D20\u6CBB\u7597 " + damage.toFixed(1) + " (" + (ep_ratio * ep_scale).toFixed(2) + " x)");
        log.writeNote("\u6280\u80FD\u5143\u7D20HPS " + (ep_total / dur.duration).toFixed(1));
        break;
      case "skchr_sleach_2":
        damagePool[0] = 0;damagePool[1] = 0;damagePool[2] = 0;
        log.write("伤害为0（以上计算无效）");
        pool[2] += finalFrame.atk * bb.atk_to_hp_recovery_ratio * dur.duration;
        log.writeNote("可以治疗召唤物");
        break;
      case "skchr_sleach_3":
        damagePool[0] = 0;damagePool[1] = 0;damagePool[2] = 0;
        log.write("伤害为0（以上计算无效）");
        damage = Math.max(finalFrame.atk - edef, finalFrame.atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * ecount;
        log.write("\u6454\u70AE\u4F24\u5BB3 " + damage.toFixed(1) + " (damage_scale=" + buffFrame.damage_scale.toFixed(3) + "), \u547D\u4E2D " + ecount);
        break;
      case "skchr_gnosis_1":
        var scale_mul_g1 = options.freeze ? 1 : buffList["tachr_206_gnosis_1"].damage_scale_freeze / buffList["tachr_206_gnosis_1"].damage_scale_cold;
        damage = finalFrame.atk * (1 - emrpct) * buffFrame.damage_scale * scale_mul_g1;
        pool[1] += damage * dur.hitCount;
        log.write("\u51BB\u7ED3\u4F24\u5BB3 " + damage.toFixed(1) + " (damage_scale=" + (buffFrame.damage_scale * scale_mul_g1).toFixed(2) + "), \u547D\u4E2D " + dur.hitCount);
        break;
      case "skchr_gnosis_3":
        var scale_mul_g3 = options.freeze ? 1 : buffList["tachr_206_gnosis_1"].damage_scale_freeze / buffList["tachr_206_gnosis_1"].damage_scale_cold;
        damage = finalFrame.atk * (1 - emrpct) * bb.atk_scale * buffFrame.damage_scale * scale_mul_g3;
        pool[1] += damage * ecount;
        log.write("\u7EC8\u7ED3\u4F24\u5BB3 " + damage.toFixed(1) + " (damage_scale=" + (buffFrame.damage_scale * scale_mul_g3).toFixed(2) + "), \u547D\u4E2D " + ecount + ", \u6309\u51BB\u7ED3\u8BA1\u7B97");
        break;
      case "skchr_ling_3":
        if (options.token) {
          log.writeNote("不计算范围法伤");
          log.writeNote("(去掉“计算召唤物数据”才能计算范围伤害)");
        } else {
          damage = finalFrame.atk * (1 - emrpct) * bb.atk_scale * buffFrame.damage_scale;
          pool[1] += damage * ecount * dur.duration * 2;
          log.writeNote("\u53EC\u5524\u7269\u8303\u56F4\u6CD5\u672F\u4F24\u5BB3 " + damage.toFixed(1) * 2 + "/s");
        }
        break;
      case "tachr_377_gdglow_1":
        if (dur.critHitCount > 0 && isSkill) {
          damage = finalFrame.atk * (1 - emrpct) * bb["attack@atk_scale_2"] * buffFrame.damage_scale;
          var funnel = checkSpecs(blackboard.id, "funnel") || 1;
          pool[1] += damage * enemy.count * funnel * dur.critHitCount;
          log.writeNote("\u7206\u70B8 " + dur.critHitCount * funnel + " \u6B21, \u7206\u70B8\u4F24\u5BB3 " + damage.toFixed(1));
        }
        break;
      case "skchr_bena_1":
      case "skchr_bena_2":
        if (options.annie && isSkill) {
          damagePool[0] = 0;damagePool[1] = 0;
        }
        break;
      case "skchr_kazema_1":
        if (options.annie) {
          damage = finalFrame.atk / buffFrame.atk_scale * buffList["tachr_4016_kazema_1"].damage_scale * (1 - emrpct) * buffFrame.damage_scale;
          pool[1] += damage * ecount;
          log.writeNote("\u66FF\u8EAB\u843D\u5730\u6CD5\u4F24 " + damage.toFixed(1) + "\uFF0C\u547D\u4E2D " + ecount);
          if (isSkill) {
            damagePool[0] = 0;damagePool[1] = 0;
          }
        }
        break;
      case "skchr_kazema_2":
        damage = finalFrame.atk * buffList["tachr_4016_kazema_1"].damage_scale * (1 - emrpct) * buffFrame.damage_scale;
        pool[1] += damage * ecount;
        var kz_name = options.annie ? "*替身*" : "*纸偶*";
        log.writeNote(kz_name + "\u843D\u5730\u6CD5\u4F24 " + damage.toFixed(1) + "\uFF0C\u547D\u4E2D " + ecount);
        if (options.annie && isSkill) {
          damagePool[0] = 0;damagePool[1] = 0;
        }
        break;
      case "skchr_phenxi_2":
        var ph_2_atk = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale_2;
        damage = Math.max(ph_2_atk - edef, ph_2_atk * 0.05) * buffFrame.damage_scale;
        log.writeNote("\u5B50\u7206\u70B8\u4F24\u5BB3 " + damage.toFixed(1) + ", \u4E0D\u8BA1\u5165\u603B\u4F24");
        break;
      case "skchr_horn_2":
        if (options.overdrive_mode) {
          damage = finalFrame.atk / bb["attack@s2.atk_scale"] * bb["attack@s2.magic_atk_scale"] * (1 - emrpct) * buffFrame.damage_scale;
          pool[1] += damage * dur.hitCount;
          log.write("\u6CD5\u672F\u4F24\u5BB3 " + damage.toFixed(1) + ", \u547D\u4E2D " + dur.hitCount);
        }
        break;
      case "skchr_horn_3":
        if (options.overdrive_mode && !options.od_trigger) {
          var horn_3_pct = dur.duration * (dur.duration - 0.2) / 2; // 0.4, 1.4,...,11.4
          damage = finalFrame.maxHp * horn_3_pct / 100;
          pool[2] -= damage;
          log.writeNote("\u751F\u547D\u6D41\u5931 " + damage.toFixed(1));
        }
        break;

    }; // switch

    // 百分比/固定回血
    var hpratiosec = bb["hp_recovery_per_sec_by_max_hp_ratio"];
    var hpsec = bb["hp_recovery_per_sec"];
    if (hpratiosec) {
      if (_buffName3 == "tachr_478_kirara_1") {
        if (options.cond) hpratiosec = bb["kirara_t_2.hp_recovery_per_sec_by_max_hp_ratio"];
        if (isSkill && blackboard.id == "skchr_kirara_2") {
          hpratiosec *= buffList["skill"].talent_scale;
        }
        log.write("\u5929\u8D4B\u56DE\u8840\u6BD4\u4F8B: " + (hpratiosec * 100).toFixed(1) + "%/s");
      }

      if (_buffName3 == "tachr_344_beewax_1" && isSkill) {} else if (_buffName3 == "tachr_362_saga_2") {} else if (_buffName3 == "tachr_293_thorns_2") {
        if (blackboard.id == "skchr_thorns_2" && isSkill) {
          pool[2] += hpratiosec * finalFrame.maxHp * (dur.duration + dur.stunDuration - 2);
          log.writeNote("治疗从2秒后开始计算");
        } else {}
      } else if (_buffName3 == "tachr_422_aurora_1") {
        if (!isSkill) {
          var aurora_hp_time = levelData.spData.spCost / (1 + buffFrame.spRecoveryPerSec) / 2 + dur.stunDuration;
          var aurora_hps = hpratiosec * finalFrame.maxHp;
          pool[2] += aurora_hps * aurora_hp_time;
          log.write("HP\u6062\u590D\u65F6\u95F4: " + aurora_hp_time.toFixed(3) + "s, HPS " + aurora_hps.toFixed(1));
        }
      } else if (_buffName3 == "skchr_blkngt_1") {
        if (isSkill && options.token) {
          var blkngt_hps = hpratiosec * finalFrame.maxHp;
          log.writeNote("HPS: " + blkngt_hps.toFixed(1));
        } // else {}
      } else {
        pool[2] += hpratiosec * finalFrame.maxHp * (dur.duration + dur.stunDuration);
      }
    }
    if (hpsec) {
      if (_buffName3 == "tachr_291_aglina_2" && isSkill || _buffName3 == "tachr_188_helage_2" && !options.noblock) {/* skip */} else {
        pool[2] += hpsec * (dur.duration + dur.stunDuration);
      }
    }
    // 自身血量百分比相关的治疗/伤害
    if (bb["hp_ratio"]) {
      switch (_buffName3) {
        case "skchr_huang_3": // 自爆
        case "skchr_utage_2":
        case "skchr_akafyu_2":
        case "skchr_kazema_2":
          if (!options.annie) {
            damage = bb.hp_ratio * finalFrame.maxHp;
            pool[2] -= damage;
            log.writeNote("\u5BF9\u81EA\u8EAB\u4F24\u5BB3 " + damage.toFixed(1));
          }
          break;
        case "skchr_ifrit_3": // 自己掉血
        case "skchr_skadi2_3":
        case "skchr_aprot2_2":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * dur.duration;break;
        case "skchr_bldsk_2":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * bb.duration * 2;break;
        case "tachr_225_haak_trait":
          // 阿-特性
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * dur.duration;break;
        case "tachr_225_haak_1":
          if (options.crit) {
            heal = bb.hp_ratio * finalFrame.maxHp * buffFrame.heal_scale;
            log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u6CBB\u7597 " + heal.toFixed(1) + ", \u547D\u4E2D " + dur.critHitCount);
            pool[2] += heal * dur.critHitCount;
          }
          break;
        case "skchr_kazema_1":
          if (!isSkill) break;
        case "skchr_bena_2":
          if (!options.annie) {
            pool[2] -= bb.hp_ratio * dur.attackCount * finalFrame.maxHp;
            log.writeNote("\u6BCF\u6B21\u6280\u80FD\u653B\u51FBHP-" + (bb.hp_ratio * finalFrame.maxHp).toFixed(1));
          }
          break;
        case "tachr_017_huang_1":
        case "skchr_ccheal_1":
        case "skchr_ccheal_2":
        case "tachr_174_slbell_1":
        case "tachr_254_vodfox_1":
        case "tachr_343_tknogi_1":
        case "tachr_405_absin_1":
        case "tachr_416_zumama_1":
        case "tachr_362_saga_2":
        case "skchr_dusk_2":
        case "tachr_472_pasngr_1":
        case "skchr_crow_2":
        case "tachr_437_mizuki_2":
        case "uniequip_002_sddrag":
        case "uniequip_002_vigna":
        case "tachr_4019_ncdeer_1":
        case "tachr_492_quercu_1":
        case "skchr_ling_2":
        case "tachr_4039_horn_1":
          break;
        case "skchr_gravel_2":
        case "skchr_phatom_1":
          pool[4] += bb.hp_ratio * finalFrame.maxHp;
          log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u62A4\u76FE\u91CF " + pool[4]);
          break;
        case "skchr_surtr_3":
          pool[4] -= finalFrame.maxHp + 5000;
          break;
        case "tachr_311_mudrok_1":
          pool[2] += bb.hp_ratio * finalFrame.maxHp / bb.interval * (dur.duration + dur.prepDuration);
          break;
        case "uniequip_002_skadi":
        case "uniequip_002_flameb":
        case "uniequip_002_gyuki":
          if (options.equip) {
            log.writeNote("HP\u4E0A\u9650\u51CF\u5C11\u81F3 " + (finalFrame.maxHp * bb.max_hp).toFixed(1));
            finalFrame.maxHp = finalFrame.maxHp * bb.max_hp;
          }
          break;
        case "tachr_300_phenxi_1":
          heal = Math.ceil(bb.hp_ratio * finalFrame.maxHp) * 10;
          log.writeNote("\u6700\u5927\u751F\u547D\u6D41\u5931\u7387 " + heal.toFixed(1) + "/s");
          break;
        case "skchr_horn_2":
          if (options.od_trigger && options.overdrive_mode) {
            pool[2] -= finalFrame.maxHp * bb.hp_ratio;
            log.writeNote("\u81EA\u7206\u4F24\u5BB3 " + pool[2].toFixed(1));
          }
          break;
        default:
          pool[2] += bb.hp_ratio * finalFrame.maxHp * dur.attackCount;
      };
    }

    var dmg = pool[0] + pool[1] + pool[3];
    if (dmg > 0) log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u989D\u5916\u4F24\u5BB3 " + dmg.toFixed(2));
    if (pool[2] > 0) log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u989D\u5916\u6CBB\u7597 " + pool[2].toFixed(2));else if (pool[2] < 0) log.write("[\u7279\u6B8A] " + displayNames[_buffName3] + ": \u81EA\u8EAB\u4F24\u5BB3 " + pool[2].toFixed(2));
    for (var _i = 0; _i < 5; ++_i) {
      extraDamagePool[_i] += pool[_i];
    }
  }

  // 整理返回
  var totalDamage = [0, 1, 3].reduce(function (x, y) {
    return x + damagePool[y] + extraDamagePool[y];
  }, 0);
  var totalHeal = [2, 4].reduce(function (x, y) {
    return x + damagePool[y] + extraDamagePool[y];
  }, 0);
  var extraDamage = [0, 1, 3].reduce(function (x, y) {
    return x + extraDamagePool[y];
  }, 0);
  var extraHeal = [2, 4].reduce(function (x, y) {
    return x + extraDamagePool[y];
  }, 0);

  log.write("\u603B\u4F24\u5BB3: " + totalDamage.toFixed(2));
  if (totalHeal != 0) log.write("\u603B\u6CBB\u7597: " + totalHeal.toFixed(2));

  var dps = totalDamage / (dur.duration + dur.stunDuration + dur.prepDuration);
  var hps = totalHeal / (dur.duration + dur.stunDuration + dur.prepDuration);
  // 均匀化重置普攻时的普攻dps
  if (!isSkill && checkResetAttack(blackboard.id, blackboard, options)) {
    var d = dur.attackCount * attackTime;
    log.write("\u4EE5 " + d.toFixed(3) + "s (" + dur.attackCount + " \u4E2A\u653B\u51FB\u95F4\u9694) \u8BA1\u7B97\u666E\u653Bdps");
    dps = totalDamage / d;hps = totalHeal / d;
  }
  log.write("DPS: " + dps.toFixed(1) + ", HPS: " + hps.toFixed(1));
  log.write("----");

  return {
    atk: finalFrame.atk,
    dps: dps,
    hps: hps,
    dur: dur,
    damageType: damageType,
    hitDamage: hitDamage,
    critDamage: critDamage,
    extraDamage: extraDamage,
    extraHeal: extraHeal,
    totalDamage: totalDamage,
    totalHeal: totalHeal,
    maxTarget: ecount,
    damagePool: damagePool,
    extraDamagePool: extraDamagePool,
    attackTime: attackTime,
    frame: frame,
    attackCount: dur.attackCount,
    spType: levelData.spData.spType
  };
}

function calculateGradDamage(_) {
  // _ -> args
  var ret = 0;
  var dmg_table = [];
  var _seq = [].concat(_toConsumableArray(Array(_.dur.attackCount).keys())); // [0, 1, ..., attackCount-1]

  if (["char_328_cammou", "char_4013_kjera", "char_377_gdglow", "char_4040_rockr"].includes(_.charId)) {
    // 驭蟹术士
    // 基于当前伤害直接乘算atk_scale倍率即可
    var base_scale = _.skillId == "skchr_gdglow_3" && _.isSkill ? 0 : 1;
    var base_table = [0, 1, 2, 3, 4, 5, 6];
    if (_.skillId == "skchr_rockr_2" && _.options.overdrive_mode) {
      // 洛洛 - 过载模式
      _.log.writeNote("假设进入过载时是满倍率1.1");
      var start = 1.1;
      var stacks = Math.ceil((_.blackboard.scale - start) / 0.15 + 1);
      base_table = [].concat(_toConsumableArray(Array(stacks).keys())).map(function (x) {
        return x + 6;
      });
    }

    var funnel = 1;
    if (_.isSkill) funnel = checkSpecs(_.skillId, "funnel") || 1;

    var tb = base_table.map(function (x) {
      return base_scale + (0.2 + 0.15 * x) * funnel;
    });
    var acount = _.dur.attackCount;
    if (_.charId == "char_377_gdglow" && _.dur.critHitCount > 0 && _.isSkill) {
      acount -= _.dur.critHitCount;
      _.log.write("\u6BCF\u4E2A\u6D6E\u6E38\u70AE\u5E73\u5747\u7206\u70B8 " + _.dur.critHitCount + " \u6B21, \u4ECE\u653B\u51FB\u6B21\u6570\u4E2D\u51CF\u53BB");
    }
    _.log.write("\u653B\u51FB " + acount + " \u6B21\uFF0C\u547D\u4E2D " + (base_scale + funnel) * acount);
    dmg_table = [].concat(_toConsumableArray(Array(acount).keys())).map(function (x) {
      return x >= tb.length ? Math.round(_.hitDamage * tb[tb.length - 1]) : Math.round(_.hitDamage * tb[x]);
    });
    _.log.write("\u500D\u7387: " + tb.map(function (x) {
      return x.toFixed(2);
    }) + " (\u672C\u4F53: " + base_scale + ", \u6D6E\u6E38\u70AE: " + funnel + ")");
    _.log.write("\u5355\u6B21\u4F24\u5BB3: " + dmg_table.slice(0, tb.length - 1) + ", " + dmg_table[tb.length - 1] + " * " + (acount - tb.length + 1));
  } else if (_.skillId == "skchr_kalts_3") {
    // 凯尔希: 每秒改变一次攻击力, finalFrame.atk为第一次攻击力
    var range = _.basicFrame.atk * _.blackboard["attack@atk"];
    var n = Math.floor(_.dur.duration);
    var atk_by_sec = [].concat(_toConsumableArray(Array(n + 1).keys())).map(function (x) {
      return _.finalFrame.atk - range * x / n;
    });
    // 抬手时间
    var atk_begin = Math.round(checkSpecs(_.skillId, "attack_begin") || 12) / 30;
    var atk_timing = _seq.map(function (i) {
      return atk_begin + _.attackTime * i;
    });

    dmg_table = atk_timing.map(function (x) {
      return atk_by_sec[Math.floor(x)] * _.buffFrame.damage_scale;
    });
    _.log.write(explainGradAttackTiming({
      duration: n,
      atk_by_sec: atk_by_sec,
      atk_timing: atk_timing,
      dmg_table: dmg_table
    }));
  } else if (_.skillId == "skchr_billro_3") {
    // 卡涅利安: 每秒改变一次攻击力（多一跳），蓄力时随攻击次数改变damage_scale倍率, finalFrame.atk为最后一次攻击力
    var _range = _.basicFrame.atk * _.blackboard.atk;
    var _n2 = Math.floor(_.dur.duration);
    // rate = (x-1)/(n-1), thus t=0, x=n, rate=1; t=(n-1), x=1, rate=0
    var _atk_by_sec = [].concat(_toConsumableArray(Array(_n2 + 1).keys())).reverse().map(function (x) {
      return _.finalFrame.atk - _range * (x - 1) / (_n2 - 1);
    });
    // 抬手时间
    var _atk_begin = Math.round(checkSpecs(_.skillId, "attack_begin") || 12) / 30;
    var _atk_timing = _seq.map(function (i) {
      return _atk_begin + _.attackTime * i;
    });
    // damage_scale
    var sc = [1.2, 1.4, 1.6, 1.8, 2];
    var scale_table = _seq.map(function (i) {
      return i >= sc.length ? 2 : sc[i];
    });

    //console.log({atk_by_sec, atk_timing, scale_table});
    dmg_table = _atk_timing.map(function (x) {
      return _atk_by_sec[Math.floor(x)] * _.ecount * Math.max(1 - _.emrpct, 0.05) * _.buffFrame.damage_scale;
    });
    kwargs = { duration: _n2, atk_by_sec: _atk_by_sec, atk_timing: _atk_timing, dmg_table: dmg_table };
    if (_.options.charge) {
      dmg_table = _seq.map(function (i) {
        return dmg_table[i] * scale_table[i];
      });
      kwargs.scale_table = scale_table.map(function (x) {
        return x * _.buffFrame.damage_scale;
      });
      kwargs.dmg_table = dmg_table;
    }
    _.log.write(explainGradAttackTiming(kwargs));
  } else {
    // 一般处理（煌，傀影）: 攻击加成系数在buffFrame.atk_table预先计算好,此时finalFrame.atk为最后一次攻击的攻击力
    // 由finalFrame.atk计算之前每次攻击的实际攻击力，同时不影响其他buff
    var a = _.buffFrame.atk_table.map(function (x) {
      return _.basicFrame.atk * x;
    });
    var pivot = a[a.length - 1];
    a = a.map(function (x) {
      return _.finalFrame.atk - pivot + x;
    });
    //console.log(a);

    // 计算每次伤害
    if (_.damageType == 0) {
      dmg_table = a.map(function (x) {
        return Math.max(x - _.edef, x * 0.05) * _.buffFrame.damage_scale;
      });
    } else if (_.damageType == 3) {
      dmg_table = a.map(function (x) {
        return x * _.buffFrame.damage_scale;
      });
    }
    _.log.write("\u5355\u6B21\u4F24\u5BB3: " + dmg_table.map(function (x) {
      return x.toFixed(1);
    }));
  }
  if (dmg_table.length > 0) ret = dmg_table.reduce(function (x, y) {
    return x + y;
  });
  return ret;
}

function explainGradAttackTiming(_) {
  var n = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 7;

  var lines = [],
      i = 0;
  var row_time = [].concat(_toConsumableArray(Array(_.duration).keys()));
  var l1 = row_time.map(function (x) {
    return ":--:";
  });
  var row_atk = [].concat(_toConsumableArray(_.atk_by_sec.map(function (x) {
    return Math.round(x);
  })));
  var row_timing = [].concat(_toConsumableArray(_.atk_timing.map(function (x) {
    return x.toFixed(2);
  })));
  var row_scale = [];
  var l2 = row_timing.map(function (x) {
    return ":--:";
  });
  var row_dmg = [].concat(_toConsumableArray(_.dmg_table.map(function (x) {
    return Math.round(x);
  })));
  if (_.scale_table) row_scale = [].concat(_toConsumableArray(_.scale_table.map(function (x) {
    return x.toFixed(2);
  })));

  while (i < row_time.length) {
    var r1 = ["时间(s)"].concat(_toConsumableArray(row_time.slice(i, i + n)));
    var ls1 = [":--:"].concat(_toConsumableArray(l1.slice(i, i + n)));
    var a1 = ["攻击力"].concat(_toConsumableArray(row_atk.slice(i, i + n)));

    lines.push("| " + r1.join(" | ") + " |");
    lines.push("| " + ls1.join(" | ") + " |");
    lines.push("| " + a1.join(" | ") + " |");
    lines.push("\n");
    i += n;
  }
  i = 0;
  while (i < row_timing.length) {
    var r2 = ["时点(s)"].concat(_toConsumableArray(row_timing.slice(i, i + n)));
    var ls2 = [":--:"].concat(_toConsumableArray(l2.slice(i, i + n)));
    var s2 = [];
    var d2 = ["伤害"].concat(_toConsumableArray(row_dmg.slice(i, i + n)));
    lines.push("| " + r2.join(" | ") + " |");
    lines.push("| " + ls2.join(" | ") + " |");
    if (_.scale_table) {
      s2 = ["倍率"].concat(_toConsumableArray(row_scale.slice(i, i + n)));
      lines.push("| " + s2.join(" | ") + " |");
    }
    lines.push("| " + d2.join(" | ") + " |");
    lines.push("\n");
    i += n;
  }
  //  console.log(lines);
  return lines.join("\n");
}

var AttributeKeys = ['atk', 'attackSpeed', 'baseAttackTime', 'baseForceLevel', 'blockCnt', 'cost', 'def', 'hpRecoveryPerSec', 'magicResistance', 'massLevel', 'maxDeckStackCnt', 'maxDeployCount', 'maxHp', 'moveSpeed', 'respawnTime', 'spRecoveryPerSec', 'tauntLevel'];

function initBuffFrame() {
  return {
    atk_scale: 1,
    def_scale: 1,
    heal_scale: 1,
    damage_scale: 1,
    maxTarget: 1,
    times: 1,
    edef: 0, // 敌人防御/魔抗
    edef_scale: 1,
    edef_pene: 0,
    edef_pene_scale: 0,
    emr_pene: 0, // 无视魔抗
    emr: 0,
    emr_scale: 1,
    atk: 0,
    def: 0,
    attackSpeed: 0,
    maxHp: 0,
    baseAttackTime: 0,
    spRecoveryPerSec: 0,
    applied: {}
  };
}

function getAttributes(char, log) {
  //charId, phase = -1, level = -1
  var charData = AKDATA.Data.character_table[char.charId];
  var phaseData = charData.phases[char.phase];
  var attributesKeyFrames = {};
  var buffs = initBuffFrame();
  var buffList = {};
  log.write("**【基础属性计算】**");
  // 计算基础属性，包括等级和潜能
  if (char.level == charData.phases[char.phase].maxLevel) {
    attributesKeyFrames = Object.assign(attributesKeyFrames, phaseData.attributesKeyFrames[1].data);
  } else {
    AttributeKeys.forEach(function (key) {
      attributesKeyFrames[key] = getAttribute(phaseData.attributesKeyFrames, char.level, 1, key);
    });
  }
  if (charData.favorKeyFrames && charData.profession != "TOKEN") {
    // token不计信赖
    var favorLevel = Math.floor(Math.min(char.favor, 100) / 2);
    AttributeKeys.forEach(function (key) {
      attributesKeyFrames[key] += getAttribute(charData.favorKeyFrames, favorLevel, 0, key);
      // console.log(char.level, key, attributesKeyFrames[key]);
      buffs[key] = 0;
    });
  }

  // 计算潜能和模组
  applyPotential(char.charId, charData, char.potentialRank, attributesKeyFrames, log);
  if (char.equipId && !char.options.token) {
    applyEquip(char, attributesKeyFrames, log);
    buffList[char.equipId] = attributesKeyFrames.equip_blackboard;
  }

  // 计算天赋/特性，记为Buff
  if (charData.trait && !charData.has_trait) {
    charData.has_trait = true;
    charData.talents.push(charData.trait);
  }
  charData.talents.forEach(function (talentData) {
    if (talentData.candidates) {
      // mon3tr!!
      for (var i = talentData.candidates.length - 1; i >= 0; i--) {
        var cd = talentData.candidates[i];
        //console.log(cd);
        if (char.phase >= cd.unlockCondition.phase && char.level >= cd.unlockCondition.level && char.potentialRank >= cd.requiredPotentialRank) {
          // 找到了当前生效的天赋
          var blackboard = getBlackboard(cd.blackboard);
          if (!cd.prefabKey || cd.prefabKey < 0) {
            cd.prefabKey = "trait"; // trait as talent
            cd.name = "特性";
          }
          var prefabKey = 'tachr_' + char.charId.slice(5) + '_' + cd.prefabKey;
          displayNames[prefabKey] = cd.name; // add to name cache
          // bufflist处理
          buffList[prefabKey] = blackboard;
          break;
        }
      };
    }
  });

  // 令3
  if (char.skillId == "skchr_ling_3" && char.options.ling_fusion && char.options.token) {
    log.write("“弦惊” - 高级形态: 添加合体Buff");
    buffList["fusion_buff"] = checkSpecs(char.skillId, "fusion_buff");
    displayNames["fusion_buff"] = "高级形态";
  }

  return {
    basic: attributesKeyFrames,
    buffs: buffs,
    buffList: buffList,
    char: char
  };
}

function getBuffedAttributes(basic, buffs) {
  var final = _objectWithoutProperties(basic, []);

  AttributeKeys.forEach(function (key) {
    if (buffs[key]) final[key] += buffs[key];
  });

  final.atk *= buffs.atk_scale;
  final.def *= buffs.def_scale;
  // final.atk *= buffs.damage_scale;
  return final;
}

function getAttribute(frames, level, minLevel, attr) {
  var ret = (level - minLevel) / (frames[1].level - frames[0].level) * (frames[1].data[attr] - frames[0].data[attr]) + frames[0].data[attr];
  if (attr != "baseAttackTime") return Math.round(ret);else return ret;
}

function getBlackboard(blackboardArray) {
  var blackboard = {};
  blackboardArray.forEach(function (kv) {
    return blackboard[kv.key] = kv.value;
  });
  return blackboard;
}

var PotentialAttributeTypeList = {
  0: "maxHp",
  1: "atk",
  2: "def",
  3: "magicResistance",
  4: "cost",
  5: "blockCnt",
  6: "moveSpeed",
  7: "attackSpeed",
  21: "respawnTime"
};

function applyPotential(charId, charData, rank, basic, log) {
  if (!charData.potentialRanks || charData.potentialRanks.length == 0) return;
  for (var i = 0; i < rank; i++) {
    var potentialData = charData.potentialRanks[i];
    if (!potentialData.buff) continue;
    var y = potentialData.buff.attributes.attributeModifiers[0];
    var key = PotentialAttributeTypeList[y.attributeType];
    var value = y.value;

    basic[key] += value;
    if (value > 0) {
      log.write("\u6F5C\u80FD " + (i + 2) + ": " + key + " " + (basic[key] - value) + " -> " + basic[key]);
    }
  }
}

function applyEquip(char, basic, log) {
  var equipId = char.equipId;
  var bedb = AKDATA.Data.battle_equip_table;
  var phase = 0; // 默认取第一个
  var cand = 0;
  var blackboard = {};
  var attr = {};

  if (equipId && bedb[equipId]) {
    var item = bedb[equipId].phases[phase];
    attr = getBlackboard(item.attributeBlackboard);

    if (item.tokenAttributeBlackboard) {
      var tb = {};
      Object.keys(item.tokenAttributeBlackboard).forEach(function (tok) {
        tb[tok] = getBlackboard(item.tokenAttributeBlackboard[tok]);
      });
      Object.assign(blackboard, tb);
    }

    item.parts.forEach(function (pt) {
      var talentBundle = pt.addOrOverrideTalentDataBundle;
      var traitBundle = pt.overrideTraitDataBundle;
      // 天赋变更
      if (talentBundle && talentBundle.candidates) {
        // 目前只有杜宾一个人
        var entry = talentBundle.candidates[cand];
        Object.assign(blackboard, getBlackboard(entry.blackboard));
      }
      // 特性变更
      if (traitBundle && traitBundle.candidates) {
        var _entry = traitBundle.candidates[cand];
        Object.assign(blackboard, getBlackboard(_entry.blackboard));
      }
    });
  }
  //console.log(attr, blackboard);
  var attrKeys = {
    max_hp: "maxHp",
    atk: "atk",
    def: "def",
    magic_resistance: "magicResistance",
    attack_speed: "attackSpeed"
  };

  Object.keys(attr).forEach(function (x) {
    basic[attrKeys[x]] += attr[x];
    if (attr[x] != 0) log.write("\u6A21\u7EC4: " + attrKeys[x] + " " + (basic[attrKeys[x]] - attr[x]) + " -> " + basic[attrKeys[x]]);
  });
  basic.equip_blackboard = blackboard; // 处理过的模组面板放在这里
}

function calculateAnimation(charId, skillId, isSkill, attackTime, attackSpeed, log) {
  var _fps = 30;
  var charData = AKDATA.Data.character_table[charId];
  var animData = AKDATA.Data.dps_anim[charId] || {};
  var animKey = "Attack";
  var attackKey = checkSpecs(charId, "anim_key");
  if (!attackKey) {
    attackKey = ["Attack", "Attack_Loop", "Combat"].find(function (x) {
      return animData[x];
    });
  }
  var tags = [];
  var count = 0; // animKeys中出现的最大技能编号

  // 推断animKey
  if (!isSkill) animKey = attackKey;else {
    animKey = checkSpecs(skillId, "anim_key");
    if (!animKey) {
      // 首先，取得技能号
      var skIndex = ~~skillId.split("_")[2];
      var skCount = charData.skills.length;
      // 取得可能描述技能动画时间的animKeys
      var candidates = Object.keys(animData).filter(function (k) {
        return typeof animData[k].OnAttack == "number" && k.includes("Skill") && !k.includes("Begin") && !k.includes("End");
      });
      if (typeof animData.Skill == "number") candidates.push("Skill");
      // 分析
      if (candidates.length == 0) animKey = attackKey; // 没有合适的技能动画，则使用普攻
      else {
          candidates.forEach(function (k) {
            k.split("_").forEach(function (t) {
              var value = parseInt(t, 10) || t;
              if (!tags.includes(value)) tags.push(value);
              if (value > count) count = value;
            });
          });
          // 例子：如果有3个技能但是animKeys最大为skill2说明skill2对应3技能
          // 否则skill3对应3技能
          if (skCount > count) skIndex -= 1;
          // 选择最终animKey
          if (skIndex == 0 || count == 0) {
            animKey = candidates.find(function (k) {
              return k.includes("Skill");
            });
          } else {
            animKey = candidates.find(function (k) {
              return k.includes(skIndex);
            });
          }
          if (!animKey) animKey = attackKey;
        }
      //console.log( { animKey, animData, candidates, count, skIndex } );
    }
  }

  // 帧数算法. 258yyds
  var attackFrame = attackTime * _fps; // 理论攻击间隔 换算为帧
  var realAttackFrame = Math.round(attackFrame); // 实际攻击间隔，后面会调整
  var realAttackTime = realAttackFrame / _fps;
  var animFrame = 0,
      eventFrame = -1; // 原本动画帧数，判定帧数
  var scale = 1;
  var scaledAnimFrame = 0; // 缩放后的动画帧数
  var preDelay = 0,
      postDelay = 0;

  console.log("**【动画计算测试，结果仅供参考，不用于后续计算】**");

  if (!animKey || !animData[animKey]) console.log("暂无帧数数据，保持原结果不变");else {
    var specKey = animKey.includes("Attack") ? charId : skillId;
    var isLoop = animKey.includes("Loop");
    // 动画拉伸幅度默认为任意
    var max_scale = 99;

    if (typeof animData[animKey] == "number") {
      // 没有OnAttack，一般是瞬发或者不攻击的技能
      animFrame = animData[animKey];
    } else if (isLoop && !animData[animKey].OnAttack) {
      // 名字为xx_Loop的动画且没有OnAttack事件，则为引导型动画
      // 有OnAttack事件的正常处理
      log.write("Loop动画，判定帧数=理论攻击间隔");
      animFrame = attackFrame;
      eventFrame = attackFrame;
      scale = 1;
    } else {
      animFrame = animData[animKey].duration;
      eventFrame = animData[animKey].OnAttack;
      // 计算缩放比例
      if (checkSpecs(specKey, "anim_max_scale")) {
        max_scale = checkSpecs(specKey, "anim_max_scale");
        log.write("\u52A8\u753B\u6700\u5927\u7F29\u653E\u7CFB\u6570: " + max_scale);
      }
      scale = Math.max(Math.min(attackFrame / animFrame, max_scale), 0.1);
    }
    //if (eventFrame < 0 || isLoop) {
    //  scale = 1;
    // }

    if (eventFrame >= 0) {
      // 计算前后摇。后摇至少1帧
      preDelay = Math.max(Math.round(eventFrame * scale), 1); // preDelay 即 scaled eventFrame
      postDelay = Math.max(Math.round(animFrame * scale - preDelay), 1);
      scaledAnimFrame = preDelay + postDelay;
    } else scaledAnimFrame = animFrame;

    console.log("\u7406\u8BBA\u653B\u51FB\u95F4\u9694: " + attackTime.toFixed(3) + "s, " + attackFrame.toFixed(1) + " \u5E27. \u653B\u901F " + Math.round(attackSpeed) + "%");
    console.log("\u539F\u672C\u52A8\u753B\u65F6\u95F4: " + animKey + " - " + animFrame + " \u5E27, \u62AC\u624B " + eventFrame + " \u5E27");
    console.log("\u7F29\u653E\u7CFB\u6570: " + scale.toFixed(2));
    console.log("\u7F29\u653E\u540E\u52A8\u753B\u65F6\u95F4: " + scaledAnimFrame + " \u5E27, \u62AC\u624B " + preDelay + " \u5E27");

    // 帧数补正
    // checkSpecs(specKey, "reset_cd_strategy") == "ceil" ? 
    if (attackFrame - scaledAnimFrame > 0.5) {
      console.log("[补正] 动画时间 < 攻击间隔-0.5帧: 理论攻击帧数向上取整且+1");
      realAttackFrame = Math.ceil(attackFrame) + 1;
    } else {
      console.log("[补正] 四舍五入");
      realAttackFrame = Math.max(scaledAnimFrame, Math.round(attackFrame));
    }

    realAttackTime = realAttackFrame / _fps;
    console.log("\u5B9E\u9645\u653B\u51FB\u95F4\u9694: " + realAttackTime.toFixed(3) + "s, " + realAttackFrame + " \u5E27");
  }

  return {
    realAttackTime: realAttackTime,
    realAttackFrame: realAttackFrame,
    preDelay: preDelay,
    postDelay: postDelay,
    scaledAnimFrame: scaledAnimFrame
  };
}

AKDATA.attributes = {
  getCharAttributes: getCharAttributes,
  calculateDps: calculateDps,
  calculateDpsSeries: calculateDpsSeries
};

exports.getCharAttributes = getCharAttributes;
exports.calculateDps = calculateDps;
exports.calculateDpsSeries = calculateDpsSeries;