// 获取技能特判标记，存放在dps_specialtags.json中
function checkSpecs(tag, spec) {
  let specs = AKDATA.Data.dps_specialtags;
  if ((tag in specs) && (spec in specs[tag]))
    return specs[tag][spec];
  else return false;
}

function checkEnum(classname, key) {
    return isNaN(key) ? AKDATA.Data.enums[classname][key] : key;
}

function getCharAttributes(char) {
  checkChar(char);
  let {
    basic,
    buffs
  } = getAttributes(char, new Log());
  let normalFrame = getBuffedAttributes(basic, buffs);
  return normalFrame;
}

// 天赋/技能名字cache
var displayNames = {};

function getTokenAtkHp(charAttr, tokenId, log) {
  console.log(charAttr.char.options, tokenId);

  if (charAttr.char.options.tokenChar)
    return getMlyssToken(charAttr, log);  // 缪缪特判

  var id = charAttr.char.charId;
  let oldChar = {...charAttr.basic};
  let tokenName = AKDATA.Data.character_table[tokenId].name;
  charAttr.char.charId = tokenId;
  var token = getAttributes(charAttr.char, log);
  charAttr.basic.atk = token.basic.atk;
  charAttr.basic.def = token.basic.def;
  charAttr.basic.maxHp = token.basic.maxHp;
  charAttr.basic.baseAttackTime = token.basic.baseAttackTime;
  charAttr.basic.attackSpeed = token.basic.attackSpeed;
  charAttr.char.charId = id;

  // 特判
  if (tokenId == "token_10027_ironmn_pile3") {
    charAttr.basic.atk = oldChar.atk;
    // 加入召唤物技能
    let skillData = AKDATA.Data.skill_table["sktok_ironmn_pile3"];
    let levelData = skillData.levels[charAttr.char.skillLevel];
    let blackboard = getBlackboard(levelData.blackboard) || {};
    charAttr.buffList["sktok_ironmn_pile3"] = blackboard;
    displayNames["sktok_ironmn_pile3"] = levelData.name;
    //console.log(charAttr.buffList);
  }

  // 模组判断
  let buffHp = 0;
  let buffAtk = 0;
  let buffAts = 0;
  let buffDef = 0;

  //console.log(charAttr);
  let blackboard = null;
  let updated = false;
  switch (charAttr.char.equipId) {
    case "uniequip_002_deepcl":
      // 深海色：直接乘算
      if (charAttr.char.equipLevel == 3) {
        buffHp = charAttr.basic.maxHp * charAttr.buffList["uniequip_002_deepcl"].talent.max_hp;
        updated = true;
      }
      break;
    case "uniequip_002_ling":
      if (charAttr.char.equipLevel == 3) {
        blackboard = charAttr.buffList["uniequip_002_ling"].token[tokenId];
        // 令：直接加算
        buffHp = blackboard.max_hp;
        buffAtk = blackboard.atk;
        updated = true;
      }
      break;
    case "uniequip_003_mgllan":
      if (charAttr.char.equipLevel == 3) {
        blackboard = charAttr.buffList["uniequip_003_mgllan"].token[tokenId];
        if ("max_hp" in blackboard) buffHp = blackboard.max_hp;
        if ("atk" in blackboard) buffAtk = blackboard.atk;
        if ("attack_speed" in blackboard) buffAts = blackboard.attack_speed;
        updated = true;
      }
      break;
    case "uniequip_002_bgsnow":
      if (charAttr.char.equipLevel >= 2) {
        blackboard = charAttr.buffList["uniequip_002_bgsnow"].token[tokenId];
        buffAtk = blackboard.atk;
        updated = true;
      }
      break;
    case "uniequip_003_dusk":
      if (charAttr.char.equipLevel >= 2) {
        blackboard = charAttr.buffList["uniequip_003_dusk"].token[tokenId];
        buffAtk = blackboard.atk;
        buffHp = blackboard.max_hp;
        buffDef = blackboard.def;
        updated = true;
      }
      break;
    case "uniequip_003_phatom":
      if (charAttr.char.equipLevel == 3) {
        blackboard = charAttr.buffList["uniequip_003_phatom"].token[tokenId];
        buffAtk = blackboard.atk;
        buffHp = blackboard.max_hp;
        buffDef = blackboard.def;
        updated = true;
      }
  }
  if (updated) {
    charAttr.basic.maxHp += buffHp;
    charAttr.basic.atk += buffAtk;
    charAttr.basic.attackSpeed += buffAts;
    charAttr.basic.def += buffDef;
    log.write(`[模组] ${tokenName} maxHp + ${Math.round(buffHp)}, atk + ${buffAtk}, attack_speed + ${buffAts}, def + ${buffDef}`);
  }
  log.write(`[召唤物] ${tokenName} maxHp = ${charAttr.basic.maxHp}, atk = ${charAttr.basic.atk}, baseAttackTime = ${charAttr.basic.baseAttackTime}`);
}

function getMlyssToken(charAttr, log) {
  let tokChar = charAttr.char.options.tokenChar;
  let tokId = tokChar.charId;
  let tokName = AKDATA.Data.character_table[tokId].name;
  let rate = 0.5 + 0.2 * charAttr.char.phase;

  // 1. calculate basic attribute package
  log.writeNote(`复制角色: ${tokName}`);
  let attr = getAttributes(tokChar, log);
  // 读取技能和模组信息，用于判断
  let charData = AKDATA.Data.character_table[tokId];
  let skillData = AKDATA.Data.skill_table[tokChar.skillId];
  if (tokChar.skillLevel == -1) tokChar.skillLevel = skillData.levels.length - 1;
  let levelData = skillData.levels[tokChar.skillLevel];
  let blackboard = getBlackboard(levelData.blackboard) || {};
  blackboard.id = skillData.skillId;
  attr.buffList["skill"] = blackboard;
  attr.skillId = blackboard.id;

  // 表里的攻击类型非1即为法伤
  // yj定义从1开始，计算器从0开始（物伤分别以1和0表示）
  let damageType = (checkEnum("subProfessionDamageTypePairs", charData.subProfessionId) == 1) ? 0 : 1;
  charAttr.char.options.mlyssDamageType = damageType;
  charAttr.char.options.mlyssPosition = charData.position;  // 近战/远程位
  log.write(`复制系数: ${rate.toFixed(1)}x, 攻击类型 / ${charData.subProfessionId}: ${['物理','法术'][damageType]}, 位置: ${charData.position}`);  
  // 2. copy attributes
  let copyRate = {
    "maxHp": rate,
    "atk": rate,
    "def": rate,
    "magicResistance": rate,
    "cost": 1,
    "blockCnt": 1,
  //  "attackSpeed": 1, // 不复制攻速
    "baseAttackTime": 1
  };
  let copyValue = {};

  Object.keys(copyRate).forEach(key => {
    copyValue[key] = charAttr.basic[key] = attr.basic[key] * copyRate[key];
  });
  log.write(`复制后的属性: ${JSON.stringify(copyValue)}`);

  // 3. special team buffs
  Object.keys(attr.buffList).forEach(key => {
    let tag = (key == "skill" ? blackboard.id : key);
    let enabled = true;
    if (checkSpecs(tag, "cloneable")) {
      // 进一步判断不生效的情况
      if (tag == "tachr_180_amgoat_1") {
        if (!(tokChar.equipId == "uniequip_002_amgoat" && tokChar.equipLevel >= 2))
          enabled = false;
      } else if (tag == "tachr_340_shwaz_2") {
        if (!(tokChar.equipId == "uniequip_002_shwaz" && tokChar.equipLevel >= 2))
          enabled = false;
      }
      // 生效时复制Buff
      if (enabled) {
        let newTag = tag + "_clone"; // buffKey和原buff区分开，避免进入原buff的特判case
        charAttr.buffList[newTag] = attr.buffList[key];
        displayNames[newTag] = "复制 - " + (displayNames[tag] || "被动");
        if (attr.buffList[key].attack_speed && attr.buffList[key].attack_speed != 0) {
          log.write("(不复制天赋的攻速加成)");
          delete charAttr.buffList[newTag].attack_speed;
        }
      }
    }
  });
  //console.log(charAttr.buffList);
  return attr;
}

function checkChar(char) {
  let charData = AKDATA.Data.character_table[char.charId];
  let skillData = char.skillId ? AKDATA.Data.skill_table[char.skillId] : null;
  // 默认最大属性
  let attr = {  
    phase: charData.phases.length - 1,
    level: charData.phases[charData.phases.length - 1].maxLevel,
    favor: 200,
    skillLevel: skillData ? skillData.levels.length-1 : 0,
    options: { cond: true, crit: true, token: false, equip: true },
    potentialRank: charData.potentialRanks.length
  };
  // 默认模组
  let elist = AKDATA.Data.uniequip_table["charEquip"][char.charId];
  if (elist) {
    attr.equipId = elist[elist.length-1];
    attr.equipLevel = 3;
  }

  // 检查属性
  Object.keys(attr).forEach(k => {
    if (!(k in char))
      char[k] = attr[k];
  });
  
 // console.log( {char} );
  return char;
}

class Log {
  constructor() {
    this.log = '';
    this.note = '';
  }

  write(line) { // 处理成markdown格式
    this.log += line.replace(/_/g, "\\_").replace(/\~/g, "_") + "\n";
  }
  writeNote(line) {
    if (this.note.indexOf(line) < 0) {
      this.log += "[注记] " + line + "\n";
      this.note += line + "\n";
    }
  }

  toString() {
    return this.log;
  }
}

class NoLog {
  write(line) { /* console.log(line); */}
  writeNote(line) {}
  toString() { return ""; }
}

function calculateDps(char, enemy, raidBuff) {
 // console.log(char, enemy, raidBuff);
  let log = new Log();
  checkChar(char);
  enemy = enemy || {
    def: 0,
    magicResistance: 0,
    count: 1,
    epResistance: 0,
    epDamageResistance: 0,
    dr: 0,
  };
  // 以后再优化，担心影响全局计算
  if (!enemy.def) enemy.def = 0;
  if (!enemy.magicResistance) enemy.magicResistance = 0;
  if (!enemy.count || enemy.count<1) enemy.count = 1;
  if (!enemy.epResistance) enemy.epResistance = 0;
  if (!enemy.epDamageResistance) enemy.epDamageResistance = 0;
  if (!enemy.dr) enemy.dr = 0;

  enemy.count = Math.round(enemy.count);
  enemy.dr = Math.min(100, Math.max(0, enemy.dr));

  raidBuff = raidBuff || { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
  // 把raidBuff处理成blackboard的格式
  let raidBlackboard = {
    atk: raidBuff.atkpct / 100 || 0,
    atk_override: raidBuff.atk || 0,
    attack_speed: raidBuff.ats || 0,
    sp_recovery_per_sec: raidBuff.cdr / 100 || 0,
    base_atk: raidBuff.base_atk / 100 || 0,
    damage_scale: 1 + raidBuff.damage_scale / 100 || 1
  };
  displayNames["raidBuff"] = "团辅";

  let charId = char.charId;
  let charData = AKDATA.Data.character_table[charId];
  let skillData = AKDATA.Data.skill_table[char.skillId];
  let equipData = {};
  if (char.equipId && char.equipId.length > 0) {
    equipData = AKDATA.Data.uniequip_table["equipDict"][char.equipId];
    displayNames[char.equipId] = equipData.uniEquipName;
  }
  if (char.skillLevel == -1) char.skillLevel = skillData.levels.length - 1;

  let levelData = skillData.levels[char.skillLevel];
  let blackboard = getBlackboard(skillData.levels[char.skillLevel].blackboard) || {};

  console.log(charData.name, levelData.name);
  log.write("说明：计算结果可能存在因为逻辑错误或者数据不全导致的计算错误，作者会及时修正。");
  log.write("　　　计算结果仅供参考，请仔细核对以下的计算过程：");
  log.write(`| 角色 | 等级 | 技能 | 模组 |`);
  log.write(`| :--: | :--: | :--: | :--: |`);
  log.write(`| **${charData.name}**<br>~${charId}~ | 潜能 ${char.potentialRank+1}<br>精英 ${char.phase}, 等级 ${char.level} | **${levelData.name}**<br>等级 ${char.skillLevel+1} | **${equipData.uniEquipName}**<br>等级 ${char.equipLevel} |`);
  log.write('');
  log.write("----");
  displayNames[charId] = charData.name;
  displayNames[char.skillId] = levelData.name;  // add to name cache

  // calculate basic attribute package
  let attr = getAttributes(char, log);
  blackboard.id = skillData.skillId;
  attr.buffList["skill"] = blackboard;
  attr.skillId = blackboard.id;

  if (char.options.token && (checkSpecs(charId, "token") || checkSpecs(char.skillId, "token")))  {
    log.write("\n");
    log.writeNote("**召唤物dps**");
    var tokenId = checkSpecs(charId, "token") || checkSpecs(char.skillId, "token");
    getTokenAtkHp(attr, tokenId, log);
  }

  // 原本攻击力的修正量
  if (raidBlackboard.base_atk != 0 && char.options.buff) {
    let delta = attr.basic.atk * raidBlackboard.base_atk;
    let prefix = (delta > 0 ? "+" : "");
    attr.basic.atk = Math.round(attr.basic.atk + delta);
    log.write(`[团辅] 原本攻击力变为 ${attr.basic.atk} (${prefix}${delta.toFixed(1)})`); 
  }
  log.write("");
  log.write("----");
  var _backup = {
	basic: {...attr.basic},
  };
  var _note = "";
  let normalAttack = null;
  let skillAttack = null;

  if (!checkSpecs(char.skillId, "overdrive")) { // 正常计算
    log.write(`【技能】`);
    log.write("----------");
    skillAttack = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
    if (!skillAttack) return;
    _note = `${log.note}`;
    
    log.write("----");
    attr.basic = _backup.basic;
  //  enemy = _backup.enemy;
  //  charData = _backup.chr;
  //  levelData = _backup.level;
    log.write(`【普攻】`);
    log.write("----------"); 
    normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
    if (!normalAttack) return;
  } else {
    // 22.4.15 过载模式计算
    log.write(`- **技能前半**\n`);
    let od_p1 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
    //_note = `${log.note}`;

    log.write("----");
    log.write(`- **过载**\n`);
    attr.basic = Object.assign({}, _backup.basic);
    attr.char.options.overdrive_mode = true; // 使用options控制，这个options不受UI选项影响
    let od_p2 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
    _note = `${log.note}`;

    // merge result
    var merged = Object.assign({}, od_p2);
    merged.dur = Object.assign({}, od_p2.dur);
    ["totalDamage", "totalHeal", "extraDamage", "extraHeal"].forEach(key => {
      merged[key] += od_p1[key];
    });
    for (var i=0; i<merged.damagePool.length; ++i) {
      merged.damagePool[i] += od_p1.damagePool[i];
      merged.extraDamagePool[i] += od_p1.extraDamagePool[i];
    }
    ["attackCount", "hitCount", "duration", "stunDuration", "prepDuration"].forEach(
      key => {
        merged.dur[key] += od_p1.dur[key];
      });
    var tm = (merged.dur.duration + merged.dur.stunDuration + merged.dur.prepDuration);
    merged.dps = merged.totalDamage / tm;
    merged.hps = merged.totalHeal / tm;
    skillAttack = merged;    
    
    log.write("----");
    log.write(`- **普攻**\n`); 
    attr.basic = Object.assign({}, _backup.basic);
    attr.char.options.overdrive_mode = false;
    normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
    if (!normalAttack) return;
  }
 
  let totalDuration = normalAttack.dur.duration + normalAttack.dur.stunDuration + skillAttack.dur.duration + skillAttack.dur.prepDuration;
  var globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / totalDuration);
  var globalHps = Math.round((normalAttack.totalHeal + skillAttack.totalHeal) / totalDuration);
  var globalEhps = Math.round((normalAttack.totalEpHeal + skillAttack.totalEpHeal) / totalDuration);
  let killTime = 0;
  return {
    normal: normalAttack,
    skill: skillAttack,
    skillName: levelData.name,

    killTime: killTime,
    globalDps,
    globalHps,
    globalEhps,
    log: log.toString(),
    note: _note
  };
}

function calculateDpsSeries(char, enemy, raidBuff, key, series) {
  let log = new NoLog();
  checkChar(char);
  enemy = enemy || {
    def: 0,
    magicResistance: 0,
    count: 1,
    epResistance: 0,
    epDamageResistance: 0
  };
  if (!enemy.def) enemy.def = 0;
  if (!enemy.magicResistance) enemy.magicResistance = 0;
  if (!enemy.count || enemy.count<1) enemy.count = 1;
  if (!enemy.epResistance) enemy.epResistance = 0;
  if (!enemy.epDamageResistance) enemy.epDamageResistance = 0;

  enemy.count = Math.round(enemy.count);

  raidBuff = raidBuff || { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
  // 把raidBuff处理成blackboard的格式
  let raidBlackboard = {
    atk: raidBuff.atkpct / 100 || 0,
    atk_override: raidBuff.atk || 0,
    attack_speed: raidBuff.ats || 0,
    sp_recovery_per_sec: raidBuff.cdr / 100 || 0,
    base_atk: raidBuff.base_atk / 100 || 0,
    damage_scale: 1 + raidBuff.damage_scale / 100 || 1
  };
  displayNames["raidBuff"] = "团辅";

  let charId = char.charId;
  let charData = AKDATA.Data.character_table[charId];
  let skillData = AKDATA.Data.skill_table[char.skillId];
  let equipData = {};
  if (char.equipId && char.equipId.length > 0) {
    equipData = AKDATA.Data.uniequip_table["equipDict"][char.equipId];
    displayNames[char.equipId] = equipData.uniEquipName;
  }
  if (char.skillLevel == -1) char.skillLevel = skillData.levels.length - 1;

  let levelData = skillData.levels[char.skillLevel];
  let blackboard = getBlackboard(skillData.levels[char.skillLevel].blackboard) || {};

  // calculate basic attribute package
  let attr = getAttributes(char, log);
  blackboard.id = skillData.skillId;
  attr.buffList["skill"] = blackboard;

  displayNames[charId] = charData.name;
  displayNames[char.skillId] = levelData.name;  // add to name cache

  if (char.options.token) {
    var tokenId = checkSpecs(charId, "token") || checkSpecs(char.skillId, "token");      
    getTokenAtkHp(attr, tokenId, log);
  }

  // 原本攻击力的修正量
  if (raidBlackboard.base_atk != 0 && char.options.buff) {
    let delta = attr.basic.atk * raidBlackboard.base_atk;
    let prefix = (delta > 0 ? "+" : "");
    attr.basic.atk = Math.round(attr.basic.atk + delta);
  }

  var results = {};
  var _backup = {
    basic: {...attr.basic},
    };
  let skillAttack = null;
  let normalAttack = null;

  series.forEach(x => {
    enemy[key] = x;
    if (!checkSpecs(char.skillId, "overdrive")) { // 正常计算
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
      let od_p1 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);

      attr.basic = Object.assign({}, _backup.basic);
      attr.char.options.overdrive_mode = true; // 使用options控制，这个options不受UI选项影响
      let od_p2 = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
      // merge result
      var merged = Object.assign({}, od_p2);
      merged.dur = Object.assign({}, od_p2.dur);
      ["totalDamage", "totalHeal", "extraDamage", "extraHeal", "totalEpDamage", "totalEpHeal"].forEach(key => {
        merged[key] += od_p1[key];
      });
      for (var i=0; i<merged.damagePool.length; ++i) {
        merged.damagePool[i] += od_p1.damagePool[i];
        merged.extraDamagePool[i] += od_p1.extraDamagePool[i];
      }
      ["attackCount", "hitCount", "duration", "stunDuration", "prepDuration"].forEach(
        key => {
          merged.dur[key] += od_p1.dur[key];
        });
      var tm = (merged.dur.duration + merged.dur.stunDuration + merged.dur.prepDuration);
      merged.dps = merged.totalDamage / tm;
      merged.hps = merged.totalHeal / tm;
      skillAttack = merged;    

      attr.basic = Object.assign({}, _backup.basic);
      attr.char.options.overdrive_mode = false;
      normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
      if (!normalAttack) return;
    }

    globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / 
                           (normalAttack.dur.duration + normalAttack.dur.stunDuration + skillAttack.dur.duration + skillAttack.dur.prepDuration));
    globalHps = Math.round((normalAttack.totalHeal + skillAttack.totalHeal) /
                           (normalAttack.dur.duration + normalAttack.dur.stunDuration + skillAttack.dur.duration + skillAttack.dur.prepDuration));
    results[x] = {
      normal: normalAttack,
      skill: skillAttack,
      skillName: levelData.name,
      globalDps,
      globalHps,
    };
  });

  return results;
}


// 叠加计算指定的技能/天赋效果，返回buffFrame
function applyBuff(charAttr, buffFrm, tag, blackbd, isSkill, isCrit, log, enemy) {
  let { ...buffFrame } = buffFrm || initBuffFrame();
  let { ...blackboard } = blackbd;
  let basic = charAttr.basic;
  let charId = charAttr.char.charId;
  let skillId = charAttr.buffList["skill"].id;
  let options = charAttr.char.options;
  let subProf = AKDATA.Data.character_table[charId].subProfessionId;

  // 如果是技能期间，则取得技能ID, 否则不计算技能
  // specialtags里标示的（spType!=8的）被动技能：一直生效
  if (tag == "skill") {
    if (isSkill || checkSpecs(skillId, "passive"))
      tag = skillId;  
    else return buffFrm;
  }

  buffFrm.applied[tag] = true;
  let done = false; // if !done, will call applyBuffDefault() in the end
  /*
  if (isCrit)
    log.write("[暴击] " +displayNames[tag] + ": -");
  else 
    log.write(displayNames[tag] + ": -");
    */
  // console.log("bb", blackboard);
  // write log
  function writeBuff(text) {
    let line = [""];
    if (tag == skillId) line.push("[技能]");
    else if (tag == "raidBuff" || tag == "fusion_buff") line.push("[团辅/拐]");
    else if (tag.includes("uniequip")) line.push("[模组]");
    else line.push("[天赋]");
    
    if (checkSpecs(tag, "cond")) 
      if (options.cond) line.push("[触发]"); else line.push("[未触发]");
    if (checkSpecs(tag, "stack") && options.stack) line.push("[满层数]"); 
    // if (checkSpecs(tag, "crit")) line.push("[暴击]");
    if (checkSpecs(tag, "ranged_penalty")) line.push("[距离惩罚]");
    
    line.push(displayNames[tag] + ": ");
    if (text) line.push(text);
    log.write(line.join(" "));
  }

  // 一般计算
  function applyBuffDefault() {
    let prefix = 0;
    for (var key in blackboard) {
      switch (key) {
        case "atk":
        case "def":
          prefix = blackboard[key] > 0 ? "+" : "";
          buffFrame[key] += basic[key] * blackboard[key];
          if (blackboard[key] != 0)
            writeBuff(`${key}: ${prefix}${(blackboard[key]*100).toFixed(1)}% (${prefix}${(basic[key] * blackboard[key]).toFixed(1)})`);
          break;
        case "max_hp":
          prefix = blackboard[key] > 0 ? "+" : "";
          if (Math.abs(blackboard[key]) > 2) { // 加算
            buffFrame.maxHp += blackboard[key];
            writeBuff(`${key}: ${prefix}${blackboard[key]}`);
          } else if (blackboard[key] != 0) { // 乘算
            buffFrame.maxHp += basic.maxHp * blackboard[key];
            writeBuff(`${key}: ${prefix}${(blackboard[key]*100).toFixed(1)}% (${prefix}${(basic.maxHp * blackboard[key]).toFixed(1)})`);
          }
          break;
        case "base_attack_time":
          if (blackboard.base_attack_time < 0) { // 攻击间隔缩短 - 加算
            buffFrame.baseAttackTime += blackboard.base_attack_time;
            writeBuff(`base_attack_time: ${buffFrame.baseAttackTime.toFixed(3)}s`);
          } else {  // 攻击间隔延长 - 乘算
            buffFrame.baseAttackTime += basic.baseAttackTime * blackboard.base_attack_time;
            writeBuff(`base_attack_time: +${(basic.baseAttackTime * blackboard.base_attack_time).toFixed(3)}s`);
          }
          break;
        case "attack_speed":
          if (blackboard[key] == 0) break;
          prefix = blackboard[key] > 0 ? "+" : "";
          buffFrame.attackSpeed += blackboard.attack_speed;
          writeBuff(`attack_speed: ${prefix}${blackboard.attack_speed}`);
          break;
        case "sp_recovery_per_sec":
          buffFrame.spRecoveryPerSec += blackboard.sp_recovery_per_sec;
          prefix = blackboard[key] > 0 ? "+" : "";
          if (blackboard.sp_recovery_per_sec != 0)
            writeBuff(`sp: ${prefix}${blackboard.sp_recovery_per_sec.toFixed(2)}/s`);
          break;
        case "atk_scale":
        case "def_scale":
        case "heal_scale":
        case "damage_scale":
          buffFrame[key] *= blackboard[key];
          if (blackboard[key] != 1) writeBuff(`${key}: ${blackboard[key].toFixed(2)}x`);
          break;
        case "attack@atk_scale":
          buffFrame.atk_scale *= blackboard["attack@atk_scale"];
          writeBuff(`atk_scale: ${buffFrame.atk_scale.toFixed(2)}`);
          break;
        case "attack@heal_scale":
          buffFrame.heal_scale *= blackboard["attack@heal_scale"];
          writeBuff(`heal_scale: ${buffFrame.heal_scale.toFixed(2)}`);
          break;
        case "max_target":
        case "attack@max_target":
          buffFrame.maxTarget = blackboard[key];
          writeBuff(`maxTarget: ${blackboard[key]}`);
          break;
        case "times":
        case "attack@times":
          buffFrame.times = blackboard[key];
          writeBuff(`攻击次数: ${blackboard[key]}`);
          break;
        case "magic_resistance":
          if (blackboard[key] < -1) { // 魔抗减算
            buffFrame.emr += blackboard[key];
            writeBuff(`敌人魔抗: ${blackboard[key]}% (加算)`);
          } else if (blackboard[key] < 0) { // 魔抗乘算
            buffFrame.emr_scale *= (1+blackboard[key]);
            writeBuff(`敌人魔抗: ${(blackboard[key]*100).toFixed(1)}% (乘算)`);
          } // 大于0时为增加自身魔抗，不计算
          break;
        case "prob":
          if (!blackboard["prob_override"]) {
            buffFrame.prob = blackboard[key];
            writeBuff(`概率(原始): ${Math.round(buffFrame.prob*100)}%`);
          }
          break;
        // 计算值，非原始数据
        case "edef":  // 减甲加算值（负数）
          buffFrame.edef += blackboard[key];
          writeBuff(`敌人护甲: ${blackboard[key]}`);
          break;
        case "edef_scale": // 减甲乘算值
          buffFrame.edef_scale *= (1+blackboard[key]);
          writeBuff(`敌人护甲: ${blackboard[key] *100}%`);
          break;
        case "edef_pene": // 无视护甲加算值
          buffFrame.edef_pene += blackboard[key];
          writeBuff(`无视护甲（最终加算）: -${blackboard[key]}`);
          break;
        case "edef_pene_scale":
          buffFrame.edef_pene_scale = blackboard[key];
          writeBuff(`无视护甲（最终乘算）: -${blackboard[key]*100}%`);
          break;
        case "emr_pene":  // 无视魔抗加算值
          buffFrame.emr_pene += blackboard[key];
          writeBuff(`无视魔抗（加算）: -${blackboard[key]}`);
          break;
        case "prob_override": // 计算后的暴击概率
          buffFrame.prob = blackboard[key];
          writeBuff(`概率(计算): ${Math.round(buffFrame.prob*100)}%`);
          break;
        case "atk_override":  // 加算的攻击团辅
          buffFrame.atk += blackboard[key];
          prefix = blackboard[key] > 0 ? "+" : "";
          if (blackboard[key] != 0)
            writeBuff(`atk(+): ${prefix}${(blackboard[key]).toFixed(1)}`);
          break;
        case "sp_interval": // June 20: {sp, interval, ...} -> 每interval秒/攻击x次回复sp点技力，可叠加
          // interval == "hit" 为每次攻击恢复
          // 也可以加入prob等额外参数用于特判
          let unit = (blackboard[key].interval == "hit" ? "" : "s");
            writeBuff(`额外技力: ${blackboard[key].sp} / ${blackboard[key].interval}${unit}`);
          blackboard[key].tag = tag;
          buffFrame.spRecoverIntervals.push(blackboard[key]);
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

  if (checkSpecs(tag, "cond")) { // 触发天赋类
    if (!options.cond) { // 未触发时依然生效的天赋
      switch (tag) {
        case "tachr_348_ceylon_1": // 锡兰
          blackboard.atk = blackboard['ceylon_t_1[common].atk'];
          applyBuffDefault(); break;
        case "skchr_glacus_2":  // 格劳克斯
          buffFrame.atk_scale = blackboard["atk_scale[normal]"];
          writeBuff(`atk_scale = ${buffFrame.atk_scale} 不受天赋影响`);
        case "tachr_326_glacus_1":
          if ("sp_recovery_per_sec" in blackboard)
            delete blackboard.sp_recovery_per_sec;
          break;
        case "skchr_cutter_2":
          applyBuffDefault(); break;
        case "tachr_145_prove_1": // 普罗旺斯
          applyBuffDefault(); break;
        case "tachr_226_hmau_1":
          delete blackboard["heal_scale"];
          applyBuffDefault(); break;
        case "tachr_279_excu_trait":
        case "tachr_1013_chen2_trait":
        case "tachr_440_pinecn_trait":
          if (isSkill && [
            "skchr_excu_1", "skchr_chen2_1", "skchr_chen2_3", "skchr_pinecn_2"
          ].includes(skillId)) {
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
          writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
          blackboard.base_attack_time *= basic.baseAttackTime;
          applyBuffDefault();
          break;
        case "tachr_431_ashlok_1":
          applyBuffDefault(); break;
        case "tachr_4013_kjera_1":
          if (options.freeze) {
            blackboard.magic_resistance = -15;
            log.writeNote("维持冻结: -15法抗");
          }
          applyBuffDefault(); break;
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
        case "tachr_4009_irene_2":
          applyBuffDefault();
          break;
        case "tachr_4064_mlynar_1":
          blackboard.atk_scale = blackboard.atk_scale_base;
          applyBuffDefault();
          break;
        case "tachr_4027_heyak_1":
          if (isSkill && skillId == "skchr_heyak_1" && enemy.count == 1) {
            log.writeNote("对单按浮空计算");
            applyBuffDefault();
          }
          break;
      };
      done = true;
    } else {
      switch (tag) {
        case "tachr_348_ceylon_1":  // 锡兰
          blackboard.atk = blackboard['ceylon_t_1[common].atk'] + blackboard['celyon_t_1[map].atk'];  // yj手癌
          break;
        case "skchr_glacus_2":
          buffFrame.atk_scale = blackboard["atk_scale[drone]"];
          writeBuff(`atk_scale = ${buffFrame.atk_scale} 不受天赋影响`);
          done = true; break;
        case "tachr_326_glacus_1":
          if ("sp_recovery_per_sec" in blackboard)
            delete blackboard.sp_recovery_per_sec;
          break;
        case "skchr_cutter_2":
          buffFrame.maxTarget = blackboard.max_target;
          buffFrame.atk_scale = blackboard.atk_scale * blackboard["cutter_s_2[drone].atk_scale"];
          writeBuff(`对空 atk_scale = ${buffFrame.atk_scale}`);
          done = true; break;
        case "tachr_187_ccheal_1": // 贾维尔
          buffFrame.def += blackboard.def;
          blackboard.def = 0;
          writeBuff(`def +${buffFrame.def}`);
          break;
        case "tachr_145_prove_1":
          blackboard.prob_override = blackboard.prob2;
          break;
        case "tachr_333_sidero_1":
          delete blackboard.times;
          break;
        case "tachr_197_poca_1": // 早露
        case "skchr_apionr_1":
          blackboard.edef_pene_scale = blackboard["def_penetrate"];
          break;
        case "tachr_358_lisa_2":  // 铃兰2
          if (isSkill && skillId == "skchr_lisa_3")
            delete blackboard.damage_scale; // 治疗不计易伤
          break;
        case "tachr_366_acdrop_1": // 酸糖1: 不在这里计算
          done = true; break;
        case "tachr_416_zumama_1":
          delete blackboard.hp_ratio; break;
        case "tachr_347_jaksel_1":
          blackboard.attack_speed = blackboard["charge_atk_speed_on_evade.attack_speed"];
          break;
        case "tachr_452_bstalk_trait":
        case "tachr_476_blkngt_trait":
        case "tachr_249_mlyss_trait":
          if (options.token) {
            done = true;
            log.writeNote("特性对召唤物无效");
          }
          break;
        case "tachr_427_vigil_trait":
          if (options.token) {
            done = true;
            if (isSkill) {
              log.writeNote("召唤物只攻击阻挡的敌人");
              log.writeNote("但特性不生效");
            }
          }
          break;
        case "tachr_402_tuye_1":
          blackboard.heal_scale = blackboard.heal_scale_2;
          break;
        case "tachr_457_blitz_1":
          if (isSkill && skillId == "skchr_blitz_2")
            blackboard.atk_scale *= charAttr.buffList.skill.talent_scale;
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
          writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
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
        case "tachr_4039_horn_1":  // 号角2天赋，编号反了
          blackboard.max_hp *= -1;
          delete blackboard.hp_ratio;
          break;
        case "tachr_4009_irene_2":
          blackboard.attack_speed *= 2;
          if ("atk" in blackboard) blackboard.atk *= 2;
          break;
        case "tachr_4064_mlynar_1":
          if (enemy.count >= 3) {
            blackboard.atk_scale = blackboard.atk_scale_up;
            log.writeNote("第一天赋强化");
          } else {
            blackboard.atk_scale = blackboard.atk_scale_base;
            log.writeNote("第一天赋未强化");
          }
          break;
        case "tachr_363_toddi_1":
          if (charAttr.buffList["uniequip_002_toddi"] && charAttr.char.equipLevel >= 2) {
            blackboard.atk_scale = charAttr.buffList["uniequip_002_toddi"].talent.atk_scale;
          }
          break;
        case "tachr_4062_totter_1":
          delete blackboard.atk_scale;
          break;
        case "tachr_2024_chyue_1":
          log.writeNote("假设全程覆盖Debuff");
          break;
        case "tachr_1030_noirc2_2":
          blackboard.atk *= 3;
          log.writeNote("2天赋叠满3层");
          break;
    
        // -- cond switch ends here --
      }
    }
  } else if (checkSpecs(tag, "ranged_penalty")) { // 距离惩罚类
    if (!options.ranged_penalty) done = true;
  } else if (checkSpecs(tag, "stack")) { // 叠层类
    if (options.stack) { // 叠层天赋类
      switch (tag) {
        case "tachr_300_phenxi_1":
          delete blackboard.hp_ratio;
          blackboard.atk = blackboard["phenxi_t_1[peak_2].peak_performance.atk"];
          log.writeNote("HP高于80%");
          break;
        case "tachr_2015_dusk_1":
        case "tachr_2023_ling_2":
          if (options.token) done = true; break;
      }
      if (!done && blackboard.max_stack_cnt) {
        ["atk", "def", "attack_speed", "max_hp"].forEach(key => {
          if (blackboard[key]) blackboard[key] *= blackboard.max_stack_cnt;
        });
      }
    } else done = true;
  } else { // 普通类
   // console.log(tag, options);
    switch (tag) {
      // ---- 天赋 ----
      case "tachr_185_frncat_1":  // 慕斯
        buffFrame.times = 1 + blackboard.prob;
        writeBuff(`攻击次数 x ${buffFrame.times}`);
        done = true; break;
      case "tachr_118_yuki_1":  // 白雪
      case "tachr_118_yuki_1_clone":
        buffFrame.atk = basic.atk * blackboard.atk;
        buffFrame.baseAttackTime = blackboard.base_attack_time;
        writeBuff("攻击间隔+0.2s, atk+0.2x");
        done = true; break;
      case "tachr_144_red_1": // 红
        writeBuff(`min_atk_scale: ${blackboard.atk_scale}`);
        done = true; break;
      case "tachr_117_myrrh_1":
      case "tachr_2014_nian_2":
      case "tachr_215_mantic_1": // 狮蝎，平时不触发
        done = true; break;
      case "tachr_164_nightm_1":  // 夜魔 仅2技能加攻
        if (skillId == "skchr_nightm_1") done = true;
        break;
      case "tachr_130_doberm_1":
      case "tachr_308_swire_1": // 诗怀雅: 不影响自身
        writeBuff("对自身无效");
        done = true; break;
      case "tachr_109_fmout_1": // 远山
        if (skillId == "skcom_magic_rage[2]") {
          blackboard.attack_speed = 0;
          log.writeNote("抽攻击卡");          
        } else if (skillId == "skchr_fmout_2") {
          blackboard.atk = 0;
          log.writeNote("抽攻速卡");
        }
        break;
      case "tachr_147_shining_1": // 闪灵
        writeBuff(`def +${blackboard.def}`);
        buffFrame.def += blackboard.def;
        blackboard.def = 0;
        break;
      case "tachr_147_shining_2":
        if (blackboard.atk) {
          if (skillId != "skchr_shining_2") {
            delete blackboard.atk;
          }
          if (skillId != "skchr_shining_3") {
            delete blackboard.sp_recovery_per_sec;
          }
        }
        break;
      case "tachr_367_swllow_1": // 灰喉
        blackboard.attack_speed = 0;  // 特判已经加了
        break;
      case "tachr_279_excu_1": // 送葬
      case "tachr_391_rosmon_1":
      case "skchr_pinecn_1":
        blackboard.edef_pene = blackboard["def_penetrate_fixed"];
        break;
      case "tachr_373_lionhd_1":  // 莱恩哈特
        blackboard.atk *= Math.min(enemy.count, blackboard.max_valid_stack_cnt);
        break;
      // 暴击类
      case "tachr_290_vigna_1":
        blackboard.prob_override = (isSkill ? blackboard.prob2 : blackboard.prob1);
        if (buffFrame.prob && buffFrame.prob > blackboard.prob_override)
          delete blackboard.prob_override;  // 防止覆盖模组概率
        break;
      case "tachr_106_franka_1": // 芙兰卡
        blackboard.edef_pene_scale = 1;
        if (isSkill && skillId == "skchr_franka_2")
          blackboard.prob_override = blackboard.prob * charAttr.buffList.skill.talent_scale;
        break;
      case "tachr_4009_irene_1":
        blackboard.edef_pene_scale = blackboard.def_penetrate;
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
        if (blackboard.prob) {
          blackboard.prob_override = blackboard.prob + (1-blackboard.prob)/4;
          delete blackboard.prob;
        }
        log.write("说明：暴击率计算值表示[触发暴击或治疗]的概率");
        if (!options.equip) delete blackboard.sp_recovery_per_sec;
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
      case "tachr_4080_lin_trait":
        if (isSkill) done = true; break;
      case "tachr_426_billro_2":
        done = true; break;
      case "tachr_426_billro_trait":
        if (isSkill && !(skillId == "skchr_billro_1" && options.charge)) {
          if (blackboard["billro_e_002[buff].def"]) {
            blackboard.def = blackboard["billro_e_002[buff].def"];
            blackboard.magicResistance = blackboard["billro_e_002[buff].magic_resistance"];
          } else done = true;
        }
        break;
      case "tachr_4080_lin_trait":
        if (isSkill && blackboard["lin_e_002[buff].def"]) {
            blackboard.def = blackboard["lin_e_002[buff].def"];
            blackboard.magicResistance = blackboard["lin_e_002[buff].magic_resistance"];
          } else done = true;
        break;
      case "tachr_388_mint_trait":
      case "tachr_344_beewax_trait":
        if (isSkill && blackboard["soil_e_002[buff].def"]) {
            blackboard.def = blackboard["soil_e_002[buff].def"];
            blackboard.magicResistance = blackboard["soil_e_002[buff].magic_resistance"];
          } else done = true;
        break;
      case "tachr_411_tomimi_1":
        if (!isSkill) done = true; break;
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
        writeBuff(`攻击次数 = ${buffFrame.times}`);
        break;
      case "skchr_excu_1":
        delete blackboard.atk_scale; break;
      case "skchr_texas_2":
      case "skchr_flamtl_2":
        buffFrame.times = 2;
        buffFrame.maxTarget = 999;
        writeBuff(`攻击次数 = ${buffFrame.times} 最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_swllow_2":
      case "skchr_bpipe_3":
        buffFrame.times = 3;
        writeBuff(`攻击次数 = ${buffFrame.times}`);
        break;
      case "skchr_milu_2":  // 守林(茂名版)
        buffFrame.times = Math.min(enemy.count, blackboard.max_cnt);
        log.writeNote(`核弹数量: ${buffFrame.times} (按全中计算)`);
        buffFrame.maxTarget = 999;
        break;
      case "skchr_cqbw_3":  // D12(茂名版)
        buffFrame.times = Math.min(enemy.count, blackboard.max_target);
        blackboard.max_target = 999;
        log.writeNote(`炸弹数量: ${buffFrame.times} (按全中计算)`);
        break;
      case "skchr_iris_2":  // 爱丽丝2
        buffFrame.times = Math.min(enemy.count, blackboard.max_target);
        blackboard.max_target = 999;
        log.writeNote(`睡眠目标数量: ${buffFrame.times}\n其余目标按全中计算`);
        break;
      case "skchr_lava2_1":  // sp炎熔1
        delete blackboard["attack@max_target"];
        buffFrame.times = Math.min(2, enemy.count);
        log.writeNote(`按全中计算`);
        break;
      case "skchr_lava2_2":
        buffFrame.times = 2;
        log.writeNote(`按火圈叠加计算`);
        break;
      case "skchr_slbell_1":  // 不结算的技能
      case "skchr_shining_2": 
      case "skchr_cgbird_2":
        done = true; break;
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
        } else
          log.writeNote("首次启动时");
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          if (isSkill) log.writeNote(`技能不受距离惩罚`);
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
        buffFrame.maxTarget = 1; break;
      case "skchr_snsant_2":
      case "skchr_demkni_2":
      case "skchr_demkni_3":
      case "skchr_hsguma_3":
      case "skchr_waaifu_2":
      case "skchr_sqrrel_2":
      case "skchr_panda_2":
      case "skchr_red_2":
      case "skchr_phatom_3":
      case "skchr_asbest_2":
      case "skchr_folnic_2":
      case "skchr_chiave_2":
      case "skchr_mudrok_2":
      case "skchr_siege_2":
      case "skchr_glady_3":
      case "skchr_gnosis_2":
      case "skchr_ebnhlz_2":
      case "skchr_doroth_2":
      case "skchr_doroth_3":
      case "skchr_cement_1":
      case "skchr_agoat2_2":
        buffFrame.maxTarget = 999;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_durnar_2":
        buffFrame.maxTarget = 3;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_aprot_1":
      case "skchr_aprot2_1":
        buffFrame.maxTarget = 3;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time *= basic.baseAttackTime;
        break;
      case "skchr_saga_2":
        buffFrame.maxTarget = 6;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_huang_3": // 可变攻击力技能，计算每段攻击力表格以和其他buff叠加
        buffFrame.maxTarget = 999;
        buffFrame.atk_table = [...Array(8).keys()].map(x => blackboard.atk / 8 *(x+1));
        writeBuff(`技能攻击力加成: ${buffFrame.atk_table.map(x => x.toFixed(2))}`);
        break;
      case "skchr_phatom_2":
        buffFrame.atk_table = [...Array(blackboard.times).keys()].reverse().map(x => blackboard.atk * (x+1));
        writeBuff(`技能攻击力加成: ${buffFrame.atk_table.map(x => x.toFixed(2))}`);
        delete blackboard.times;
        break;
      case "skchr_bluep_2":
        // 蓝毒2: 只对主目标攻击多次
        buffFrame.maxTarget = 3;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}, 主目标命中 ${blackboard["attack@times"]} 次`);
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
      case "skchr_threye_2":
      case "skchr_agoat2_1":
        buffFrame.maxTarget = 2;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
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
        buffFrame.dpsDuration = blackboard.duration;
      case "skchr_ccheal_1":
        delete blackboard["heal_scale"];
        break;
      case "skchr_hmau_2":
      case "skchr_spot_1":
      case "tachr_193_frostl_1":
      case "tachr_193_frostl_1_clone":
      case "skchr_mantic_2":
      case "skchr_glaze_2":
      case "skchr_zumama_2":
      case "skchr_melnte_1":
      case "skchr_shwaz_3": // 攻击间隔延长，但是是加算
      case "fusion_buff":
      case "skchr_windft_2":
      case "skchr_mlynar_2":
      case "skchr_judge_3":
      case "skchr_lin_1":
        buffFrame.baseAttackTime += blackboard.base_attack_time;
        writeBuff(`base_attack_time + ${blackboard.base_attack_time}s`);
        blackboard.base_attack_time = 0;
        break;
      case "skchr_brownb_2":  // 攻击间隔缩短，但是是乘算负数
      case "skchr_whispr_2":
      case "skchr_indigo_1":
      case "skchr_pasngr_2":
      case "skchr_ashlok_2":
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time *= basic.baseAttackTime;
        break;
      case "skchr_mudrok_3":
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time *= basic.baseAttackTime;
        buffFrame.maxTarget = basic.blockCnt;
        break;
      case "skchr_rosmon_3":
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time *= basic.baseAttackTime;
        if (options.cond) {
            blackboard.edef = -160;
            log.writeNote("计算战术装置阻挡减防");
        }
        if (options.rosmon_double) {
          blackboard.times = 2;
          log.writeNote(`按2次攻击都命中所有敌人计算`);
        }
        break;
      case "skchr_aglina_2":  // 攻击间隔缩短，但是是乘算正数
      case "skchr_cerber_2":
      case "skchr_finlpp_2": 
      case "skchr_jaksel_2":
      case "skchr_iris_1":
      case "skchr_indigo_2":
      case "skchr_ebnhlz_1":
      case "skchr_hamoni_1":
      case "skchr_hamoni_2":
      case "skchr_mberry_2":
      case "skchr_flamtl_3":
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time = (blackboard.base_attack_time - 1) * basic.baseAttackTime;
        break;
      case "skchr_angel_3": // 攻击间隔双倍减算
        writeBuff("攻击间隔双倍减算");
        blackboard.base_attack_time *= 2;
        break;
      case "skchr_whitew_2":
      case "skchr_spikes_2":
        buffFrame.maxTarget = 2;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        if (options.ranged_penalty) {
          buffFrame.atk_scale /= 0.8;
          if (isSkill) log.writeNote(`技能不受距离惩罚`);
        }
        break;
      case "skchr_ayer_2":
        delete blackboard.atk_scale;  // 断崖2记为额外伤害
      case "skchr_ayer_1":
      case "skchr_svrash_2":
      case "skchr_svrash_1":
      case "skchr_frostl_1":
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          if (isSkill) log.writeNote(`技能不受距离惩罚`);
        }
        break;
      case "skchr_svrash_3":
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          if (isSkill) log.writeNote(`技能不受距离惩罚`);
        }
        blackboard.def_scale = 1 + blackboard.def;
        delete blackboard.def;
        break;
      case "skchr_ceylon_1":
        if (options.ranged_penalty) {
          buffFrame.atk_scale /= 0.7;
          if (isSkill) log.writeNote(`技能不受距离惩罚`);
        }
        break;
      case "skchr_nightm_1":
        writeBuff(`治疗目标数 ${blackboard["attack@max_target"]}`);  
        delete blackboard["attack@max_target"];
        break;
      case "skchr_shotst_1":  // 破防类
      case "skchr_shotst_2":
        blackboard.edef_scale = blackboard.def;
        blackboard.def = 0;
        break;
      case "skchr_meteo_2":
        blackboard.edef = blackboard.def;
        blackboard.def = 0;
        break;
      case "skchr_slbell_2": // 初雪
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
        writeBuff(`总倍率: ${blackboard["attack@atk_scale"]}`);
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
          writeBuff(`成功 - atk_scale = ${blackboard["success.atk_scale"]}`);
          blackboard.atk_scale = blackboard["success.atk_scale"];
          buffFrame.maxTarget = 999;
        } else {
          writeBuff("失败时有一次普攻")
        }
        break;
      case "skchr_vodfox_1":
        buffFrame.damage_scale = 1 + (buffFrame.damage_scale - 1) * blackboard.scale_delta_to_one;
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
          log.writeNote(`每种状态概率: ${(blackboard.prob_override*100).toFixed(1)}%`);
        }
        break;
      case "skchr_surtr_2":
        if (enemy.count == 1) {
          blackboard.atk_scale = blackboard["attack@surtr_s_2[critical].atk_scale"];
          log.writeNote(`对单目标倍率 ${blackboard.atk_scale.toFixed(1)}x`);
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
        done = true; break;
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
      case "tachr_4046_ebnhlz_trait":
      case "tachr_4046_ebnhlz_1":
      case "tachr_297_hamoni_trait":
        done = true; break;
      case "tachr_4046_ebnhlz_2":
        delete blackboard.atk_scale;
        if ("attack_speed" in blackboard) {
          if (options.equip &&
            !(skillId == "skchr_ebnhlz_3" && isSkill)) {
          log.writeNote("触发-模组攻速增加");
          } else {
            done = true;
            log.writeNote("不触发攻速增加");
          }
        } else done = true;
        break;
      case "skchr_tuye_1":
      case "skchr_tuye_2":
        delete blackboard.heal_scale;
        delete blackboard.atk_scale;
        break;
      case "skchr_saga_3":
        buffFrame.maxTarget = 2;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        if (options.cond) {
          buffFrame.times = 2;
          log.writeNote("半血2连击");
        }
        break;
      case "skchr_dusk_1":
      case "skchr_dusk_3":
        if (options.token) done = true; break;
      case "skchr_dusk_2":
        if (options.token) done = true;
        else {
          if (options.cond) {
            log.writeNote("触发半血增伤");
          } else delete blackboard.damage_scale;
        }
        break;
      case "skchr_weedy_2":
        if (options.token) delete blackboard.base_attack_time;
        else buffFrame.maxTarget = 999;
        break;
      case "tachr_455_nothin_1":
        done = true; break;
      case "skchr_nothin_2":
        delete blackboard.prob;
        if (!options.cond) {
          delete blackboard.attack_speed;
          log.writeNote("蓝/紫Buff");
        } else log.writeNote("红Buff(攻速)");
        break;
      case "skchr_ash_2":
        if (options.cond)
          blackboard.atk_scale = blackboard["ash_s_2[atk_scale].atk_scale"];
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
        buffFrame.dpsDuration = blackboard.projectile_delay_time;
        break;
      case "skchr_tachak_2":
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time *= basic.baseAttackTime;
        if (!isCrit) delete blackboard.atk_scale;
        break;
      case "skchr_pasngr_1":
        blackboard.max_target = blackboard['pasngr_s_1.max_target'];
        blackboard.atk_scale = blackboard['pasngr_s_1.atk_scale'];
        break;
      case "skchr_pasngr_3":
        buffFrame.dpsDuration = 4;
        done = true; break;
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
      case "skchr_ghost2_1":
      case "skchr_ghost2_2":
        if (options.annie) {
          log.writeNote("替身模式");
          buffFrame.maxTarget = 999;
          done = true;
        }
        break;
      case "skchr_ghost2_3":
        if (options.annie) {
          log.writeNote("替身模式");
          buffFrame.maxTarget = 999;
          done = true;
        } else {
          buffFrame.baseAttackTime += blackboard.base_attack_time;
          writeBuff(`base_attack_time + ${blackboard.base_attack_time}s`);
          blackboard.base_attack_time = 0;
          buffFrame.maxTarget = 2;
          writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        }
        break;
      case "skchr_kazema_2":
        if (options.annie) {
          log.writeNote("替身模式");
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
      case "tachr_4106_bryota_trait":
        if (!options.noblock) 
          done = true;
        break;
      case "uniequip_002_pallas":
      case "uniequip_002_sophia":
      case "uniequip_002_swire":
        if (!options.noblock) done = true; break;
      case "tachr_130_doberm_trait":
        if (!options.noblock) 
          done = true; break;
      case "skchr_pallas_3":
        if (options.pallas) {
          blackboard.def = blackboard["attack@def"];
          blackboard.atk += blackboard["attack@peak_performance.atk"];
        }
        break;
      case "tachr_486_takila_1":
        done = true; break;
      case "tachr_486_takila_trait":
        if (!options.charge) {
          blackboard.atk = 1;
          log.writeNote("未蓄力-按100%攻击加成计算");
        } else {
          log.writeNote("蓄力-按蓄满40秒计算");
        }
        break;
      case "skchr_takila_2":
        if (options.charge)
          buffFrame.maxTarget = blackboard["attack@plus_max_target"];
        else
          buffFrame.maxTarget = 2;
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
        if (options.water)
          blackboard.attack_speed += blackboard["chen2_t_2[map].attack_speed"];
        break;
      case "tachr_479_sleach_1":
        blackboard.attack_speed = blackboard["sleach_t_1[ally].attack_speed"];
        break;
      case "skchr_fartth_3":
        if (!options.far) delete blackboard.damage_scale;
        break;
      case "tachr_1014_nearl2_1":
        delete blackboard.atk_scale; break;
      case "tachr_1014_nearl2_2":
        blackboard.edef_pene_scale = blackboard["def_penetrate"];
        break;
      case "skchr_nearl2_2":
        delete blackboard.times; break;
      case "tachr_489_serum_1":
        done = true; break;
      case "skchr_glider_1":
        buffFrame.maxTarget = 2;
        break;
      case "skchr_aurora_2":
        blackboard.prob_override = 0.1; // any value
        if (!isCrit) delete blackboard.atk_scale;
        break;
      case "tachr_206_gnosis_1":
        if (options.freeze ||
            (skillId == "skchr_gnosis_2" && isSkill && options.charge)
          ) {
          blackboard.damage_scale = blackboard.damage_scale_freeze;
          blackboard.magic_resistance = -15;
          if (options.freeze) log.writeNote("维持冻结 -15法抗/脆弱加强");
        } else 
          blackboard.damage_scale = blackboard.damage_scale_cold;
        break;
      case "skchr_gnosis_3":
        if (!options.freeze)
          log.writeNote("攻击按非冻结计算\n终结伤害按冻结计算");
        delete blackboard.atk_scale; break;
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
        done = true; break;
      case "tachr_300_phenxi_2":
        if (isSkill)
          blackboard.attack_speed = blackboard["phenxi_e_t_2[in_skill].attack_speed"] || 0;
        break;
      case "skchr_chnut_2":
        blackboard.heal_scale = blackboard["attack@heal_continuously_scale"];
        log.writeNote("以连续治疗同一目标计算");
        break;
      case "tachr_4045_heidi_1":
        if (skillId == "skchr_heidi_1")
          delete blackboard.def;
        if (skillId == "skchr_heidi_2")
          delete blackboard.atk;
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
        if (options.overdrive_mode)
          blackboard.atk = blackboard["horn_s_3[overload_start].atk"];
        break;
      case "skchr_rockr_2":
        if (!options.overdrive_mode)
          delete blackboard.atk;
        break;
      case "tachr_108_silent_1":
        if (options.token) done = true;
        break;
      case "skchr_silent_2":
        if (options.token) buffFrame.maxTarget = 999;
        break;
      case "skchr_windft_1":
        buffFrame.maxTarget = 999;
        break;
      case "tachr_433_windft_1":
        if (options.stack) {
          blackboard.atk *= 2;
          if (skillId == "skchr_windft_2" && isSkill)
            blackboard.atk *= charAttr.buffList["skill"].talent_scale;
          log.writeNote(`装备2个装置\n攻击力提升比例: ${(blackboard.atk*100).toFixed(1)}%`);
        } else {
          done = true; 
          log.writeNote("不装备装置");
        }
        break;
      case "tachr_4042_lumen_1":
      case "tachr_4042_lumen_2":
        done = true; break;
      case "skchr_lumen_3":
        delete blackboard.heal_scale;
        break;
      case "tachr_1023_ghost2_1":
        if (!options.annie)
          done = true; break;
      case "skchr_irene_1":
      case "skchr_irene_2":
          blackboard.prob_override = 1;
          break;
      case "skchr_irene_3":
          blackboard.prob_override = 1;
          buffFrame.maxTarget = 999;
          writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
          break;
      case "tachr_4043_erato_1":
        delete blackboard.atk_scale;
        if (options.cond)
          blackboard.edef_pene_scale = blackboard.def_penetrate;
        else
          done = true;
        break;
      case "skchr_pianst_2":
        delete blackboard.atk_scale;
        blackboard.atk *= blackboard.max_stack_cnt;
        break;
      case "tachr_4047_pianst_1":
        delete blackboard.atk_scale;
        break; 
      case "tachr_258_podego_1":
        if ("sp_recovery_per_sec" in blackboard)
          delete blackboard.sp_recovery_per_sec;
        break;
      case "tachr_195_glassb_1":
        if (isSkill && "glassb_e_t_1[skill].attack_speed" in blackboard) 
          blackboard.attack_speed += blackboard["glassb_e_t_1[skill].attack_speed"];
        break;
      case "tachr_135_halo_trait":
      case "tachr_4071_peper_trait":
        blackboard.max_target = blackboard["attack@chain.max_target"];
        break;
      case "skchr_halo_1":
        blackboard.times = Math.min(blackboard.max_target, enemy.count);
        delete blackboard.max_target;
        break;
      case "skchr_halo_2":
        blackboard.times = Math.min(blackboard["attack@max_target"], enemy.count);
        delete blackboard["attack@max_target"];
        break;
      case "skchr_greyy2_2":
        buffFrame.dpsDuration = blackboard.projectile_delay_time;
        done = true; break;
      case "skchr_doroth_1":
        blackboard.edef_scale = blackboard.def;
        delete blackboard.def;
        break;
      case "tachr_129_bluep_1":
        done = true; break;
      case "tachr_1026_gvial2_1":
        if (options.block) {
          // 确认阻挡数
          let gvial2_blk = (skillId == "skchr_gvial2_3" && isSkill ? 5 : 3);
          let ecount = Math.min(enemy.count, gvial2_blk);
          let atk_add = blackboard.atk_add * ecount;
          blackboard.atk += atk_add;
          blackboard.def += atk_add;
          writeBuff(`阻挡数: ${ecount}, 额外加成 +${atk_add.toFixed(2)}`);
          log.writeNote(`按阻挡${ecount}个敌人计算`);
        }
        break;
      case "skchr_gvial2_3":
        blackboard.max_target = 5;
        break;
      case "tachr_4055_bgsnow_2":
        // 判断value。具体值存在召唤物的talent里，本体判断只能写死
        let bgsnow_t2_value = -0.18;
        if (charAttr.char.potentialRank >= 4)
          bgsnow_t2_value = -0.2;
        if (options.cond_near)  // 周围4格
          bgsnow_t2_value -= 0.05;
        // 判断是否减防
        if (options.token || options.cond_def)
          blackboard.edef_scale = bgsnow_t2_value;
        break;
      case "skchr_bgsnow_1":
        if (!isCrit) delete blackboard.atk_scale;
        break;
      case "skchr_bgsnow_3":
        if (options.cond_front || options.token) {
          blackboard.atk_scale = blackboard["bgsnow_s_3[atk_up].atk_scale"];
          log.writeNote("正前方敌人");
        }
        break;
      case "tachr_497_ctable_1":
        if (options.noblock) {
          delete blackboard.atk;
          log.writeNote("未阻挡");
        } else {
          delete blackboard.attack_speed;
          log.writeNote("阻挡");
        }
        break;
      case "tachr_472_pasngr_2":
        if (!options.cond_2) done = true; break;
      case "skchr_provs_2":
        delete blackboard.atk_scale; break;
      case "tachr_4032_provs_1":
        // 模组覆盖到这里，在这里判断
        if (!options.equip)
          delete blackboard.sp_recovery_per_sec;
        break;
      case "tachr_4064_mlynar_2":
        done = true; break;
      case "tachr_4064_mlynar_trait":
        let atk_rate = (options.stack ? 1 : 0.5);
        if (isSkill && skillId == "skchr_mlynar_3")
          atk_rate *= charAttr.buffList["skill"].trait_up;
        blackboard.atk *= atk_rate;
        log.writeNote(`以 ${Math.round(blackboard.atk*100)}% 计算特性`);
        break;
      case "skchr_mlynar_3":
        delete blackboard.atk_scale;
        break;
      case "tachr_136_hsguma_1":
        if ("atk" in blackboard) {
          if (!options.equip) {
          delete blackboard.atk;
          log.writeNote("不触发抵挡加攻");
          } else {
            log.writeNote("触发抵挡加攻");
          }
        }
        break;
      case "tachr_136_hsguma_2": 
        if (charAttr.buffList["uniequip_003_hsguma"] && charAttr.char.equipLevel >= 2) {
          let def = charAttr.char.equipLevel * 0.02;
          log.write(`自身防御额外增加 ${def}`);
          blackboard.def += def;
        }
        break;
      case "tachr_325_bison_1":
        charAttr.basic.def += blackboard.def;
        writeBuff(`防御力直接加算: +${blackboard.def}`);
        done = true; break;
      case "skchr_lolxh_1":
        buffFrame.maxTarget = 2;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          log.writeNote(`技能不受距离惩罚`);
        }
        break;
      case "skchr_lolxh_2":
        buffFrame.maxTarget = 2;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          log.writeNote(`技能不受距离惩罚`);
        }
        break;
      case "skchr_qanik_2":
        blackboard.atk_scale = blackboard.trigger_atk_scale;
        break;
      case "skchr_totter_2":
        blackboard.max_target = blackboard["attack@s2n.max_target"];
        if (enemy.count == 1) {
          blackboard.atk_scale = blackboard["attack@s2c.atk_scale"];
          log.writeNote(`单体倍率 ${(blackboard.atk_scale * buffFrame.atk_scale).toFixed(1)}x`);
        }
        break;
      case "tachr_157_dagda_1":
        if (options.stack) {
          blackboard.atk_scale = blackboard.atk_up_max_value;
          log.writeNote(`爆伤叠满`);
        }
        if (isSkill && skillId == "skchr_dagda_2")
          blackboard.prob_override = charAttr.buffList.skill["talent@prob"];
        break;
      case "skchr_quartz_2":
        delete blackboard.damage_scale;
        if (options.crit) {
          blackboard.prob_override = blackboard["attack@s2_buff_prob"];
        }
        blackboard.atk_scale = blackboard["attack@s2_atk_scale"];
        break;
      case "skchr_peper_2":
        blackboard.max_target = 4;
        break;
      case "tachr_4014_lunacu_1":
        if (isSkill) {
          writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
          blackboard.base_attack_time *= basic.baseAttackTime;
        }
        break;
      case "tachr_4065_judge_2":
        done = true; break;
      case "skchr_judge_1":
        if (options.charge) {
          blackboard.atk_scale = blackboard["judge_s_1_enhance_checker.atk_scale"];
          log.writeNote("不考虑蓄力打断普攻的特殊情况");
        }
        break; 
      case "skchr_judge_2":
        blackboard.max_target = 999;
        break;
      case "tachr_1028_texas2_1":
        if (!isSkill) done = true;
        break;
      case "skchr_texas2_2":
        delete blackboard.atk_scale;
        break;
      case "tachr_427_vigil_1":
        if (options.stack && options.token) {
          blackboard.times = 3;
          if (isSkill) log.writeNote("以3连击计算");
        } else
          blackboard.times = 1;
        break;
      case "tachr_427_vigil_2":
        if (options.cond)
          blackboard.edef_pene = blackboard.def_penetrate_fixed;
        break;
      case "skchr_vigil_2":
        if (options.token) {
          blackboard.atk_scale = blackboard["vigil_wolf_s_2.atk_scale"];
          blackboard.hp_ratio = blackboard["vigil_wolf_s_2.hp_ratio"];
        }
        break;
      case "skchr_vigil_3":
        if (!options.token)
          blackboard.times = 3;
        break;
      case "skchr_ironmn_1":
        if (options.token) done = true;
        break;
      case "skchr_ironmn_2":
        if (options.token)
          done = true;
        else {
          buffFrame.maxTarget = 2;
          writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        }
        break;
      case "sktok_ironmn_pile3":
        delete blackboard.hp_ratio;
        break;
      case "tachr_420_flamtl_1+":
        blackboard.atk_scale = blackboard["attack@atkscale_t1+.atk_scale"] || 1;
        break;
      case "skchr_texas2_3":
        done = true;
        log.writeNote("落地1s，不影响技能时间");
        break;
      case "tachr_1020_reed2_1":
        delete blackboard.atk;
        log.writeNote("假设法术脆弱一直生效");
        break;
      case "skchr_reed2_2":
        done = true; break;
      case "skchr_reed2_3":
        blackboard.atk = blackboard["reed2_skil_3[switch_mode].atk"];
        break;
      case "tachr_4017_puzzle_1":
        done = true; break;
      case "tachr_493_firwhl_1":
        if (options.noblock)
          delete blackboard.def;
        else
          delete blackboard.atk;
        break;
      case "tachr_4080_lin_1":
        done = true; break;
      case "skchr_chyue_1":
        if (!options.charge)
          delete blackboard.times;
        break;
      case "skchr_chyue_2":
        if (options.cond)
          log.writeNote("只对主目标触发第一天赋和二段伤害");
        else 
          log.writeNote("不触发浮空和二段伤害");
        delete blackboard.max_target;
        break;
      case "skchr_apionr_1":
        blackboard.edef_pene_scale = blackboard.def_penetrate;
        break;
      case "skchr_firwhl_1":
        buffFrame.dpsDuration = blackboard.burn_duration;
        break;
      case "skchr_firwhl_2":
        buffFrame.dpsDurationDelta = blackboard.projectile_life_time - 1;
        break;
      case "skchr_podego_2":
        buffFrame.dpsDuration = blackboard.projectile_delay_time;
        break;
      case "skchr_lumen_1":
        buffFrame.dpsDuration = blackboard["aura.projectile_life_time"];
        break;
      case "skchr_chimes_2":
        if (options.od_trigger)
          delete blackboard.atk;
        buffFrame.maxTarget = 999;
        break;
      case "tachr_4082_qiubai_1":
        done = true; break;
      case "skchr_qiubai_1":
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          log.writeNote(`技能不受距离惩罚`);
        }
        break;
      case "skchr_qiubai_3":
        blackboard.attack_speed *= blackboard.max_stack_cnt;
        buffFrame.maxTarget = 3;
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          log.writeNote(`技能不受距离惩罚`);
        }
        break;
      case "skchr_bison_2":
        blackboard.def = blackboard["bison_s_2[self].def"];
        break;
      case "skchr_noirc2_1":
      case "skchr_noirc2_2":
        blackboard.times = blackboard.multi_times;
        blackboard.atk_scale = blackboard.multi_atk_scale;
        break;
      case "tachr_1029_yato2_2":
        if (isSkill && blackboard["yato2_e_002[atk].atk"])
          blackboard.atk += blackboard["yato2_e_002[atk].atk"];
        break;
      case "skchr_yato2_2":
      case "skchr_yato2_3":
        buffFrame.maxTarget = 999;
        break;
      case "tachr_400_weedy_2":
        // options.cannon 为True，且为本体或者3技能水炮时计算模组加攻
        if (!options.cannon || (options.token && skillId != "skchr_weedy_3"))
          done = true;
        break;
      case "skchr_humus_2":
        buffFrame.maxTarget = 3;
        if (options.cond_80) {
          blackboard.atk = blackboard["humus_s_2[peak_2].peak_performance.atk"];
          log.writeNote("HP>80%");
        } else if (options.cond_50) {
          blackboard.atk = blackboard["humus_s_2[peak_1].peak_performance.atk"];
          log.writeNote("HP>50%");
        }
        break;
      case "skchr_cement_2":
        blackboard.def *= blackboard.cnt;
        break; 
      case "skchr_morgan_1":
        let hp_table = [];
        let hp = 1-blackboard["attack@hp_ratio"];
        while (hp >= 0.3) {
          hp_table.push(hp);
          hp *= (1-blackboard["attack@hp_ratio"]);
        }
        hp_table.push(0.3);
        buffFrame.atk_table = hp_table.map(x => (1-x)/0.7 * charAttr.buffList["tachr_154_morgan_1"].min_atk);
        log.write(`HP比例: ${hp_table.map(x => x.toFixed(2))}`);
        log.write(`攻击加成: ${buffFrame.atk_table.map(x => x.toFixed(2))}`);
        log.writeNote("普攻不计背水加成");
        break; 
      case "tachr_154_morgan_1":
        if (skillId == "skchr_morgan_2") {
          blackboard.atk = blackboard.min_atk;
          log.writeNote("以损失70%生命计算");
        }
        break;
      case "tachr_4087_ines_1":
        let ines_steal_count = (skillId == "skchr_ines_3" ? Math.min(enemy.count, charAttr.buffList["skill"].max_target) : 1);
        let ines_steal_atk = blackboard.steal_atk * ines_steal_count;
        log.write(`偷取目标数 ${ines_steal_count}, 偷取攻击力 ${ines_steal_atk} (最终加算)`);
        log.writeNote(`偷取攻击力 ${ines_steal_atk}`);
        buffFrame.atk += ines_steal_atk;
        delete blackboard.atk;
        break;
      case "skchr_ines_1":
        buffFrame.dpsDuration = blackboard.bleed_duration;
        break;
      case "skchr_ines_2":
        blackboard.attack_speed = blackboard["attack@steal_atk_speed_max"];
        break;
      case "skchr_ines_3":
        delete blackboard.atk_scale;
        delete blackboard.max_target;
        break;
      case "tachr_344_beewax_1":
        if (isSkill) delete blackboard.max_hp;
        break;
      case "skchr_weedy_3":
        buffFrame.maxTarget = 999;
        if (options.token && isSkill) // 重新计算本体属性
          done = true;
        break;
      case "skchr_ironmn_3":
        if (options.token)
          delete blackboard.attack_speed;
        break;
      case "tachr_188_helage_1":
      case "tachr_337_utage_1":
      case "tachr_475_akafyu_1":
        //blackboard.attack_speed = blackboard.min_attack_speed;
        if (options.musha_hp) {
          log.writeNote(`剩余HP: ${options.musha_hp}%`);
          let frac = calcFractile(
            1 - options.musha_hp/100,   // 损失的血量
            [0, 1 - blackboard.min_hp_ratio],   // 损血范围
            [0, blackboard.min_attack_speed]   // 攻速范围
          );
          blackboard.attack_speed = frac.value;
          log.writeNote(`攻速 +${Math.round(frac.value)} (强度${Math.round(frac.rate*100)}%)`);
        }
        break;
      case "tachr_1030_noirc2_1":
        if (options.musha_hp) {
          log.writeNote(`剩余HP: ${options.musha_hp}%`);
          let frac = calcFractile(
            1 - options.musha_hp/100,   // 损失的血量
            [0, 1 - blackboard.min_hp_ratio],   // 损血范围
            [0, blackboard.min_attack_speed]   // 攻速范围
          );
          let buff_rate = (1 - options.musha_hp/100) / (1 - blackboard.min_hp_ratio);
          buff_rate = Math.min(1, buff_rate);
          blackboard.attack_speed = frac.value;
          blackboard.def = frac.value;
          log.writeNote(`攻速/防御 +${Math.round(blackboard.attack_speed)} (强度${Math.round(frac.rate*100)}%)`);
        }
        break;
      case "tachr_4048_doroth_1":
        log.writeNote(`当前选择的干员ID: ${options.char_dialog}`);
        break;
      case "tachr_391_rosmon_trait":
      case "tachr_1027_greyy2_trait":
        done = true; break;
      case "skchr_melnte_2":
        buffFrame.maxTarget = 999;
        log.writeNote(`目标距离: ${options.range4.toFixed(1)}`);
        let melnte_frac = calcFractile(
          options.range4,   // 当前距离
          [1, 4],   // 距离范围
          [blackboard.atk_scale, blackboard.scale]   // 倍率范围(负的)
        );
        log.writeNote(`系数: ${melnte_frac.value.toFixed(2)} (-${Math.round(melnte_frac.rate * 100)}%)`);
        blackboard.atk_scale = melnte_frac.value;
        break;
      case "tachr_4006_melnte_1":
        if (!options.warmup)
          done = true; break;
      case "tachr_1031_slent2_1":
        log.writeNote(`目标HP: ${options.musha_hp}%`);
        let buff_rate = (1 - options.musha_hp/100) / (1 - blackboard.min_hp_ratio);
        buff_rate = Math.min(1, buff_rate);
        // 损失70%HP时效果为 base+scale*7，算法和武者不同
        let res_scale = blackboard.damage_resistance_base + blackboard.resistance_scale * 7 * buff_rate;
        if (skillId == "skchr_slent2_3")
          res_scale *= charAttr.buffList.skill.talent_scale;
        log.writeNote(`庇护减伤 ${Math.round(res_scale*100)}% (强度${Math.round(buff_rate*100)}%)`);
        buffFrame.res_scale = res_scale;
        break;
      case "skchr_slent2_2":
        log.writeNote(`无人机庇护减伤 ${Math.round(buffFrame.res_scale * 100 * blackboard.damage_resistance_scale)}%`);
        break;
      case "skchr_heyak_1":
        buffFrame.maxTarget = 2;
        break;
      case "skchr_heyak_3":
        buffFrame.maxTarget = 3;
        buffFrame.baseAttackTime += blackboard.base_attack_time;
        writeBuff(`base_attack_time + ${blackboard.base_attack_time}s`);
        blackboard.base_attack_time = 0;
        log.writeNote(`目标距离: ${options.range4.toFixed(1)}`);
        let heyak_frac = calcFractile(
          options.range4,   // 当前距离
          [0, 3],   // 距离范围
          [blackboard["attack@min_atk_scale"], blackboard["attack@max_atk_scale"]]   // 攻速范围
        );
        log.writeNote(`系数: ${heyak_frac.value.toFixed(2)} (${Math.round(heyak_frac.rate * 100)}%)`);
        blackboard.atk_scale = heyak_frac.value;
        break;
      case "tachr_348_ceylon_1_clone":
        blackboard.atk = blackboard['ceylon_t_1[common].atk']; //+ blackboard['celyon_t_1[map].atk']; // 无法判断是否水地形
        break;
      case "skchr_excu2_1":
        blackboard.edef_pene = blackboard.def_penetrate_fixed;
        break;
      case "skchr_excu2_3":
        buffFrame.baseAttackTime += blackboard.base_attack_time;
        writeBuff(`base_attack_time + ${blackboard.base_attack_time}s`);
        blackboard.base_attack_time = 0;
        buffFrame.atk_table = [...Array(blackboard["attack@max_stack_cnt"]+1).keys()].map(
          x => blackboard["attack@atk"] * x
        );
        break;
      case "tachr_1032_excu2_1":
        if (!isSkill) {
          buffFrame.times = 1 + blackboard.prob;
          log.write("普攻：计算期望攻击次数（类似慕斯天赋算法）");  // 但是慕斯连击不加技力
        }
        break;
      case "skchr_spuria_2":
        delete blackboard.prob;
        break;
      case "skchr_typhon_3":
        buffFrame.baseAttackTime += blackboard.base_attack_time;
        writeBuff(`base_attack_time + ${blackboard.base_attack_time}s`);
        blackboard.base_attack_time = 0;
        buffFrame.times = blackboard["attack@s3_max_hit_num"];
        blackboard.atk_scale = blackboard["attack@s3_atk_scale"];
        break;
      case "tachr_2012_typhon_1":
        if (!options.equip && blackboard.atk_scale)
          delete blackboard.atk_scale;
        // options.typhon_fix == True时，考虑叠层过程，否则以叠满计算
        // 在extraDamage里调整穿防比例  
        blackboard.edef_pene_scale = blackboard.def_penetrate * blackboard.max_stack_cnt;
        if (options.typhon_fix) {
          if (isCrit) {
            blackboard.edef_pene_scale = blackboard.def_penetrate;
            log.writeNote("考虑叠层过程");
          }
        } else
          log.writeNote("第一天赋以叠满计算");
        break;
      case "tachr_2012_typhon_2":
        blackboard.prob_override = 0; // 标记字段,无实际效果
        break;
      case "skchr_sntlla_2":
        if (options.freeze) {
          blackboard.magic_resistance = -15;
          log.writeNote("维持冻结: -15法抗");
        }
        break;
      case "tachr_1016_agoat2_1":
        done = true; break;
      case "tachr_4106_bryota_1":
        if (options.noblock)
          blackboard.def = blackboard["bryota_t_self.def"];
        break;
      case "skchr_swire2_2":
        if (options.cond)
          blackboard.times = 2;
        break;
      case "skchr_swire2_3":
        done = true; break;
    }
  }
  // --- applyBuff switch ends here ---
  
  if (tag == "skchr_thorns_2") {
    log.writeNote("反击按最小间隔计算");
    blackboard.base_attack_time = blackboard.cooldown - (basic.baseAttackTime + buffFrame.baseAttackTime);
    buffFrame.attackSpeed = 0;
    blackboard.attack_speed = 0;
  } else if (options.token && options.mlyssPosition == "RANGED") {
    let cnt = options.mlyss_count;
    // 3技能默认5个，2技能二连击
    if (isSkill && skillId == "skchr_mlyss_3") cnt = 5;
    log.writeNote(`流形数量: ${cnt}`);
    if (isSkill && skillId == "skchr_mlyss_2") cnt *= 2;

    buffFrame.times = cnt;
  }
  // 决战者阻回
  if (subProf == "duelist" && !options.block && !options.equip) {
    buffFrame.spRecoverRatio = -1;
    log.writeNote("未阻挡无法恢复SP");
    log.writeNote("仅显示这时的普攻和技能DPS");
  }
    // 模组判定
    // options.equip 指满足模组额外效果的条件
    // 条件不满足时，面板副属性加成依然要计算
  switch (tag) {
    case "uniequip_002_cuttle":
    case "uniequip_002_glaze":
    case "uniequip_002_fartth":
      if (options.equip) {
        blackboard = blackboard.trait;
        if (blackboard.damage_scale < 1) blackboard.damage_scale += 1;
        log.writeNote("距离>4.5");
      } else blackboard.damage_scale = 1;
      break;
    case "uniequip_002_ifrit":
      if (isSkill && blackboard.talent["ifrit_e_002[dice_sp].prob"]) {
        if (skillId == "skchr_ifrit_2" )
          log.writeNote("按平均值模拟，非随机");
        else
          log.writeNote("以触发1次额外技力估算"); 
      } // continue to next case
    case "uniequip_002_serum":
      if (options.equip) {
        blackboard = blackboard.trait;
        if (blackboard.damage_scale < 1) blackboard.damage_scale += 1;
        log.writeNote("距离>4");
      } else blackboard.damage_scale = 1;
      break;
    case "uniequip_002_sddrag":
      if (options.equip) {
        blackboard.atk_scale = blackboard.trait.atk_scale;
        if (options.cond_spd) {
          blackboard.attack_speed = blackboard.talent.attack_speed;
          log.writeNote("受到持续法术伤害");
        }
      }
      break;
    case "uniequip_002_vigna":
      if (options.equip)
        blackboard.atk_scale = blackboard.trait.atk_scale;
      if ("prob1" in blackboard.talent)
        blackboard.prob_override = (isSkill ? blackboard.talent.prob2 : blackboard.talent.prob1); 
      break;
    case "uniequip_002_chen":
    case "uniequip_002_tachak":
    case "uniequip_002_bibeak":
      blackboard = blackboard.trait;
      if (!isSkill)
        delete blackboard.damage_scale;
      break;
    case "uniequip_002_cutter":
    case "uniequip_002_phenxi":
    case "uniequip_002_meteo":
    case "uniequip_002_irene":
    case "uniequip_002_bdhkgt":
      blackboard = blackboard.trait;
      blackboard.edef_pene = blackboard.def_penetrate_fixed;
      break;
    case "uniequip_003_cqbw":
      if (isSkill && (skillId == "skchr_cqbw_2" || skillId == "skchr_cqbw_3")) {
        log.writeNote("地雷不享受穿防效果");
      } else {
        blackboard.edef_pene = blackboard.trait.def_penetrate_fixed;
      }
      if (options.equip && blackboard.talent && blackboard.talent.atk)
        blackboard.atk = blackboard.talent.atk * blackboard.talent.max_stack_cnt;
      break;
    case "uniequip_002_yuki":
      let bb_yuki = {...blackboard.trait};
      bb_yuki.edef_pene = bb_yuki.def_penetrate_fixed;
      if (blackboard.talent.sp_recovery_per_sec)
        bb_yuki.sp_recovery_per_sec = blackboard.talent.sp_recovery_per_sec;
      blackboard = bb_yuki;
      break;
    case "uniequip_002_nearl2":
    case "uniequip_002_franka":
    case "uniequip_002_peacok":
    case "uniequip_002_sesa":
    case "uniequip_003_skadi":
    case "uniequip_002_morgan":
      if (options.equip || options.block)
        blackboard = blackboard.trait;
      break;
    case "uniequip_002_cqbw":
      if (options.equip || options.block)
        blackboard = blackboard.trait;
      break;
    case "uniequip_002_skadi":
    case "uniequip_002_flameb":
    case "uniequip_002_gyuki":
      if (options.equip) blackboard.attack_speed = blackboard.trait.attack_speed;
      break;
    case "uniequip_002_lisa":
      if ("atk" in blackboard.talent)
        blackboard.atk = blackboard.talent.atk;
    case "uniequip_002_podego":
    case "uniequip_002_glacus":
      if (options.equip)
        blackboard.sp_recovery_per_sec = 0.2; // 覆盖1天赋数值，但是在模组里计算技力回复
      break;
    case "uniequip_003_aglina":
      if (options.equip)
        blackboard = blackboard.talent; // 不覆盖1天赋数值
      break;
    case "uniequip_002_lumen":
    case "uniequip_002_ceylon":
    case "uniequip_002_whispr":
      done = true; break;
    case "uniequip_002_finlpp":
      if (isSkill)
        blackboard = blackboard.talent;
      break;
    case "uniequip_002_ghost2":
    case "uniequip_002_kazema":
    case "uniequip_002_bena":
      blackboard = blackboard.trait;
      if (!options.annie || options.token)
        done = true;
      break;
    case "uniequip_002_zumama":
    case "uniequip_002_aurora":
    case "uniequip_002_cement":
      if (!options.block) {  
        buffFrame.spRecoverRatio = blackboard.trait.sp_recover_ratio;
        log.write(`技力回复系数 ${buffFrame.spRecoverRatio.toFixed(2)}x`);
      }
      break;
    case "uniequip_002_doberm":
      if (options.equip) {
        blackboard = blackboard.talent;
        log.writeNote("有三星干员");
      }
      break;
    case "uniequip_002_plosis":
      if (options.equip && "sp_recovery_per_sec" in blackboard.talent)
          blackboard.sp_recovery_per_sec = blackboard.talent.sp_recovery_per_sec - 0.3;
      break;
    case "uniequip_002_red":
    case "uniequip_002_kafka":
    case "uniequip_002_texas2":
      if (options.equip) {
        blackboard = blackboard.trait;
        log.writeNote("周围4格没有队友");
      }
      break;
    case "uniequip_003_phatom":
      if (options.equip && !options.token) {
        blackboard = blackboard.trait;
        log.writeNote("周围4格没有队友");
      }
      break;
    case "uniequip_002_waaifu":
      if (options.equip) {
        blackboard = blackboard.talent;
        log.writeNote("对感染生物");
      }
      break;
    case "uniequip_002_pasngr":
      if (options.cond_2)
        blackboard = blackboard.talent;
      break;
    case "uniequip_002_nearl":
    case "uniequip_002_sunbr":
    case "uniequip_002_demkni":
    case "uniequip_003_blemsh":
      if (options.equip || skillId == "skchr_demkni_1")
        blackboard.heal_scale = blackboard.trait.heal_scale;
      break;
    case "uniequip_002_ash":
    case "uniequip_002_archet":
    case "uniequip_002_aprl":
    case "uniequip_002_swllow":
    case "uniequip_002_bluep":
    case "uniequip_002_jesica":
      if (options.equip)
        blackboard.attack_speed = 8;  // 写死。避免同名词条问题
      break;
    case "uniequip_002_angel":
    case "uniequip_002_kroos2":
    case "uniequip_002_platnm":
    case "uniequip_002_mm":
    case "uniequip_002_clour":
    case "uniequip_003_archet":
    case "uniequip_002_inside":
      if (options.equip)
        blackboard.atk_scale = blackboard.trait.atk_scale;
      break;
    case "uniequip_002_shotst":
      if (options.cond) // 流星直接用cond判断
        blackboard.atk_scale = blackboard.trait.atk_scale;
      break;
    case "uniequip_002_bgsnow":
    case "uniequip_002_melnte":
      if (options.cond_front && !options.token) {
        // 模组效果对token不生效
        blackboard.atk_scale = blackboard.trait.atk_scale;
      }
      break;
    case "uniequip_003_shwaz":
      if (options.equip || (skillId == "skchr_shwaz_3" && isSkill)) {
        log.writeNote("攻击正前方敌人");
        blackboard.atk_scale = blackboard.trait.atk_scale;
      }
      break;
    case "uniequip_003_zumama":
      if (options.block) {
        blackboard.atk = blackboard.trait.atk;
        blackboard.def = blackboard.trait.def;
      }
      break;
    case "uniequip_002_nian":
      blackboard.def = options.block ? blackboard.trait.def : 0;
      if (blackboard.talent.atk) {
        blackboard.atk = blackboard.talent.atk * blackboard.talent.max_stack_cnt;
        blackboard.def += blackboard.talent.def * blackboard.talent.max_stack_cnt;
        log.writeNote("按模组效果叠满计算");
      }
      break;
    case "uniequip_003_nian":
      if (blackboard.trait && blackboard.trait.max_hp) {
        let stack = options.equip ? 3 : 1;
        blackboard.max_hp = blackboard.trait.max_hp * stack;
      }
      break;
    case "uniequip_002_bison":
    case "uniequip_002_bubble":
    case "uniequip_002_snakek":
      if (options.block) blackboard.def = blackboard.trait.def;
      break;
    case "uniequip_003_hsguma":
      if (options.equip) blackboard.def = blackboard.trait.def;
      break;
    case "uniequip_002_shining":
    case "uniequip_002_folnic":
      if (options.equip) {
        blackboard = blackboard.trait;
        log.writeNote("治疗地面目标");
      }
      break;
    case "uniequip_003_kalts":
      if (options.equip) {
        if (!options.token) {
          blackboard = blackboard.trait;
          log.writeNote("治疗地面目标");
        } else {
          blackboard = blackboard.talent;
          log.writeNote("M3在凯尔希范围内");
        }
      }
      break;
    case "uniequip_002_silent":
      if (options.equip && !options.token) {
        blackboard = blackboard.trait;
        log.writeNote("治疗地面目标");
      }
      break;
    case "uniequip_002_kalts":
    case "uniequip_002_tuye":
    case "uniequip_002_bldsk":
    case "uniequip_002_susuro":
    case "uniequip_002_myrrh":
      if (options.equip) {
        blackboard.heal_scale = blackboard.trait.heal_scale;
        log.writeNote("治疗半血目标");
      }
      break;
    case "uniequip_003_shining":
      if (options.equip) {
        blackboard.heal_scale = blackboard.trait.heal_scale;
        log.writeNote("治疗半血目标");
      }
      break;
    case "uniequip_002_siege":
      let equip_atk = (options.equip ? blackboard.trait.atk : 0);
      let talent_atk = blackboard.talent.atk || 0;
      blackboard.atk = blackboard.def = equip_atk + talent_atk;
      writeBuff(`特性 +${equip_atk*100}%, 天赋 +${talent_atk*100}%`);
      break;
    case "uniequip_002_blackd":
    case "uniequip_002_scave":
    case "uniequip_002_headbr":
    case "uniequip_003_flamtl":
      if (options.equip)
        blackboard = blackboard.trait;
      break;
    case "uniequip_002_texas":
      if (isSkill)
        blackboard = blackboard.talent;
      break;
    case "uniequip_002_toddi":
    case "uniequip_002_erato":
    case "uniequip_002_totter":
      if (options.equip) {
        blackboard.atk_scale = 1.15; // 写死
      }
      break;
    case "uniequip_002_utage":
      if (options.equip) {
        blackboard.atk = blackboard.talent.atk || 0;
        blackboard.def = blackboard.talent.def || 0;
      }
      break;
    case "uniequip_002_amgoat":
    case "uniequip_002_cerber":
    case "uniequip_002_absin":
    case "uniequip_002_nights": 
    case "uniequip_002_heyak": 
      blackboard.emr_pene = blackboard.trait.magic_resist_penetrate_fixed;
      break;
    case "uniequip_002_forcer":
      if (options.equip) {
        blackboard.edef_pene = blackboard.talent.def_penetrate_fixed;
      }
      break;
    case "uniequip_002_doroth":
    case "uniequip_002_robin":
      if (isSkill) buffFrame.prob = blackboard.trait.prob;
      if (isCrit) {
        blackboard.atk_scale = blackboard.trait.atk_scale;
      }
      break;
    case "uniequip_002_rfrost":
      if (isSkill) buffFrame.prob = blackboard.trait.prob;
      blackboard.edef_pene = blackboard.talent.def_penetrate_fixed || 0;
      if (isCrit) {
        blackboard.atk_scale = blackboard.trait.atk_scale;
      }
      break;
    case "uniequip_002_billro":
      if (isSkill && blackboard.trait["billro_e_002[max_hp_buff].max_hp"]) {
        blackboard.max_hp = blackboard.trait["billro_e_002[max_hp_buff].max_hp"];
        if (options.charge) blackboard.max_hp *= 2;
      }
      break;
    case "uniequip_002_greyy2":
      if (options.equip && blackboard.talent && blackboard.talent.damage_scale)
        blackboard.damage_scale = blackboard.talent.damage_scale;
      break;
    case "uniequip_002_spuria":
      blackboard = {...blackboard.talent};
      if (!options.equip) delete blackboard.sp_recovery_per_sec;
      if (!isCrit) delete blackboard.atk_scale;
      break;
    case "uniequip_002_ironmn":
      if (options.equip)
        blackboard.sp_recovery_per_sec = blackboard.talent.sp_recovery_per_sec;
      break;
  }
  // -- uniequip switch ends here --

  if (!done) applyBuffDefault();
  return buffFrame;
}

// 伤害类型判定
function extractDamageType(charData, chr, isSkill, skillDesc, skillBlackboard, options) {
  let charId = chr.charId;
  let spId = charData.subProfessionId;
  let skillId = skillBlackboard.id;
  let ret = 0;
  if (charData.profession == "MEDIC" && spId != "incantationmedic")
    ret = 2;
  else if (spId == "bard") {
    ret = 2;
  } else if (options.annie) {
    ret = 1;
  } else if (charData.description.includes('法术伤害') && spId != "artsprotector") {
    ret = 1;
  }
  if (isSkill) {
    if (["法术伤害", "法术</>伤害", "伤害类型变为"].some(x => skillDesc.includes(x)))
      ret = 1;
    else if (["治疗", "恢复", "每秒回复"].some(x => skillDesc.includes(x)) && 
             !skillBlackboard["hp_recovery_per_sec_by_max_hp_ratio"]) {
      ret = 2;
    }
    // special character/skill overrides
    ret = checkSpecs(charId, "damage_type") || checkSpecs(skillId, "damage_type") || ret;
    if (skillId == "skchr_nearl2_3") {
      ret = (options.block) ? 3 : 0;
    }
    if (options.token) {
      var _r = checkSpecs(skillId, "token_damage_type")
      if (_r != null) ret = _r;
      if (skillId == "skchr_ling_3" && chr.options.ling_fusion) ret = 1;
    }
  } else if (chr.options.token) {
    ret = checkSpecs(charId, "token_damage_type") || ret;
    if (["skchr_mgllan_3"].includes(skillId))
      ret = 0;
    else if (skillId == "skchr_ling_2" ||
             (skillId == "skchr_ling_3" && chr.options.ling_fusion))
      ret = 1;
  }
  // mlyss
  if (options.token && ("mlyssDamageType" in options)) {
    ret = options.mlyssDamageType;
  }
  return ~~ret;
}

// 重置普攻判定
function checkResetAttack(key, blackboard, options) {
  if (checkSpecs(key, "reset_attack") == "false") return false;
  else if (checkSpecs(key, "overdrive") && !options.overdrive_mode) return false;
  else return (checkSpecs(key, "reset_attack") || 
          blackboard['base_attack_time'] || blackboard['attack@max_target'] ||
          blackboard['max_target']);
}

// 计算攻击次数和持续时间
function calcDurations(isSkill, attackTime, attackSpeed, levelData, buffList, buffFrame, enemyCount, options, charId, log) {
  let blackboard = buffList.skill;
  let skillId = blackboard.id;
  let spData = levelData.spData;
  let spType = checkEnum("spType", spData.spType);
  let duration = 0;
  let attackCount = 0;
  let frameBegin = 12;
  let stunDuration = 0;
  let prepDuration = 0;
  let dpsDuration = -1;
  let startSp = 0;
  let rst = checkResetAttack(skillId, blackboard, options);
  let subProf = AKDATA.Data.character_table[charId].subProfessionId;

  log.write("\n**【循环计算】**");

  // 技能类型标记，和官方的不同
  // 官方的在customdata/enums.json里
  const spTypeCustomTags = {
    1: "time",
    2: "attack",
    4: "hit",
    8: "special"
  };
  let tags = [spTypeCustomTags[spType]];  

  // 需要模拟的技能（自动回复+自动释放+有充能）
  if (checkSpecs(skillId, "sim")) {
    log.writeNote("模拟120s时间轴");
    tags.push("sim");
    duration = 120;
    let fps = 30;
    let now = fps, sp = spData.initSp * fps, max_sp = 999 * fps;
    let last = {}, timeline = {}, total = {};
    let extra_sp = 0;
    let ifrit_extra_count = 0, ifrit_extra_value = 0;
    const TimelineMarks = {
      "attack": "-",
      "skill": "+",
      "ifrit": "",
      "ifrit_extra": "!",
      "archet": "",
      "chen": "",
      "recover_sp": "^",
      "recover_overflow": "x",
      "cannot_recover": "x",
      "reset_animation": "\\*",
      "cancel_attack": "!"
    };
    // 技能动画(阻回)时间-帧
    let cast_time = checkSpecs(skillId, "cast_time") ||
                    checkSpecs(skillId, "cast_bat") * 100 / attackSpeed ||
                    attackTime * fps;
    let skill_time = Math.max(cast_time, attackTime * fps);

    function time_since(key) { return now - (last[key] || -999); }
    function action(key) {
      if (!timeline[now]) timeline[now] = [];
      timeline[now].push(key);
      last[key] = now;
      total[key] = (total[key] || 0) + 1;
      //console.log(now, key);
    }
    function cancelaction(key) {
      if (last[key] && last[key] >= 0) {
        let which = timeline[last[key]].indexOf(key);
        if (which >= 0) {
          timeline[last[key]].splice(which, 1);
          let t = last[key];
          while (t>0) {
            if (timeline[t] && timeline[t].indexOf(key) >= 0) break;
            t -= 1;
          }
          last[key] = t;
          total[key] -= 1;
          action(`cancel_${key}`);
        }
      }
    }

    // charge 
    var cast_sp = spData.spCost;
    if (options.charge && checkSpecs(skillId, "charge"))
      if (skillId == "skchr_chyue_1")
        cast_sp = spData.spCost * blackboard.cnt;
      else
        cast_sp = spData.spCost*2;
    // init sp
    if (skillId == "skchr_amgoat_2" && buffList["tachr_180_amgoat_2"])
      sp = (buffList["tachr_180_amgoat_2"].sp_min + buffList["tachr_180_amgoat_2"].sp_max) / 2 * fps;
    else if (buffList["tachr_222_bpipe_2"])
      sp = buffList["tachr_222_bpipe_2"].sp * fps;
    else if (buffList["uniequip_002_archet"] && buffList["uniequip_002_archet"].talent["archet_e_t_2.sp"])
      sp = buffList["uniequip_002_archet"].talent["archet_e_t_2.sp"] * fps;
    last["ifrit"] = last["archet"] = last["chen"] = last["ifrit_extra"] = 1; // 落地即开始计算 记为1帧
    startSp = cast_sp - sp / fps;

    // sp barrier
    max_sp = cast_sp * fps;
//    if (!options.charge && checkSpecs(skillId, "charge")) max_sp *= 2;  // 充能技能1层直接放的情况
    if (blackboard.ct) max_sp = spData.spCost * fps * blackboard.ct;
    if (blackboard.cnt) max_sp = spData.spCost * fps * blackboard.cnt;

    log.write(`[模拟] T = 120s, 初始sp = ${(sp/fps).toFixed(1)}, 技能sp = ${cast_sp}, 技能动画时间 = ${Math.round(cast_time)} 帧, sp上限设为 ${max_sp / fps}`);
    log.write(`[模拟] 攻击间隔 ${attackTime.toFixed(3)}s`);
    log.writeNote(`技能动画 ${cast_time} 帧`);
    let attackAnim = checkSpecs(skillId, "attack_animation");
    if (attackAnim) {
      // 缩放至攻击间隔
      attackAnim = Math.min(Math.round(attackTime * fps), attackAnim);
      log.write(`[模拟] 攻击动画 = ${attackAnim} 帧`);
    }

    if (spType == 1) {
      sp = Math.min(sp + fps, max_sp);  // 落地时恢复1sp
      log.write("[模拟] +1落地sp");
    }
    while (now <= duration * fps) {
      // normal attack
      if (sp < cast_sp * fps &&
          time_since("attack") >= attackTime * fps &&
          time_since("skill")  >= skill_time) {
        action("attack");
        if (spType == 2) sp += fps;
      }
      // 技能已经cd好
      if (sp >= cast_sp * fps &&
          time_since("skill") >= skill_time) {
        // 正常：普通攻击间隔结束后进入技能
        if (time_since("attack") >= attackTime * fps)
          action("skill");
       // else if (skillId == "skchr_judge_1")
       // {
       //   // 斥罪：蓄力时，普攻可被打断，但是不蓄力时不会
       //   if (options.charge && time_since("attack") < attackAnim) {
       //     cancelaction("attack");
       //     action("skill");
       //   }
       // }
       else if (attackAnim && time_since("attack") == attackAnim) {
          // W，华法琳：普攻动画结束后进入技能（取消后摇）
          action("reset_animation");
          action("skill");
        }
      }
      // sp recover
      if (time_since("skill") == 0)
        sp -= cast_sp * fps;
      if (time_since("skill") >= cast_time && sp < max_sp) {
        if (spType == 1) sp += (1 + buffFrame.spRecoveryPerSec);
      }
      // 乱火
      if (buffList["tachr_134_ifrit_2"] && time_since("ifrit") >= buffList["tachr_134_ifrit_2"].interval * fps) {
        action("ifrit");
        extra_sp = buffList["tachr_134_ifrit_2"].sp;
        let prob = buffList["tachr_134_ifrit_2"]["ifrit_e_002[dice_sp].prob"];
        // 为了得到稳定结果，平稳增加额外技力计数值
        if (prob) {
          ifrit_extra_value += prob;
          if (ifrit_extra_value >= 1) {
            extra_sp += 5;
            ifrit_extra_count ++;
            ifrit_extra_value -= 1;
            action("ifrit_extra");
          }
        }
      }
      // 兰登战术/呵斥
      let intv_archet = (buffList["tachr_332_archet_1"] ? buffList["tachr_332_archet_1"].interval : 2.5);
      let intv_chen = buffList["tachr_010_chen_1"] ? buffList["tachr_010_chen_1"].interval : 4;
      if ((buffList["tachr_332_archet_1"] || options.archet) && time_since("archet") >= intv_archet * fps) {
        action("archet");
        extra_sp += 1;
      }
      if ((buffList["tachr_010_chen_1"] || options.chen) && time_since("chen") >= intv_chen * fps) {
        action("chen");
        extra_sp += 1;
      }
      if (extra_sp > 0) {
        if (time_since("skill") >= cast_time) { 
          sp += extra_sp * fps;
          if (sp <= max_sp) action("recover_sp");
          else {
            sp = max_sp;
            action("recover_overflow");
          }
        } else action("cannot_recover");
      } 
      extra_sp = 0;
      ++now;
    }

    if (isSkill) {
      attackCount = total.skill;
      duration = attackCount * skill_time / fps;
      if (buffFrame.dpsDuration) {
        log.write(`以${buffFrame.dpsDuration}s 计算每次技能时间`);
        duration = attackCount * buffFrame.dpsDuration;
      }
    } else {
      attackCount = total.attack;
      duration -= total.skill * skill_time / fps;

      // 打印时间轴和特殊动作
      var line_str = "";
      console.log(timeline);
      Object.keys(timeline).forEach(t => {
        line_str += timeline[t].map(x => TimelineMarks[x]).join("");
      });
      log.write(`[模拟] 时间轴: `);
      log.write(`${line_str}`);
      log.write(`( \-: 普攻, \+: 技能, ^: 技力回复, \\*: 取消后摇, x: sp溢出或无法回复, !: 取消普攻/额外技力 )`);
      
      if (total.ifrit) {
        log.write(`[模拟] 莱茵回路(\\*): 触发 ${total.recover_sp} / ${total.ifrit} 次, sp + ${buffList["tachr_134_ifrit_2"].sp * total.recover_sp}`);
        if (ifrit_extra_count > 0) {
          log.write(`[模拟] 额外技力触发 ${ifrit_extra_count} 次`);
        }
      }
      if (total.archet)
        log.write(`[模拟] 兰登战术: 触发 ${total.archet} 次`);
      if (total.chen)
        log.write(`[模拟] 呵斥: 触发 ${total.chen} 次`);
      if (total.recover_sp)
        log.write(`[模拟] sp恢复成功 ${total.recover_sp} 次, 溢出 ${total.recover_overflow || 0} 次, 技能期间无法恢复sp ${total.cannot_recover} 次`);
      if (total.reset_animation)
        log.write(`[模拟] 取消攻击间隔(\\*) ${total.reset_animation} 次`);
    }
  } else {

  if (isSkill) {
    
    // 准备时间
    switch (skillId) {
      case "skchr_mudrok_3":
        prepDuration = blackboard.sleep; break;
      case "skchr_amiya2_2":
        prepDuration = 3.33; break;
      case "skchr_surtr_3":
        prepDuration = 0.67; break;
      case "skchr_ash_2":
      case "skchr_nearl2_2":
      case "skchr_blemsh_2":
      case "skchr_ctable_1":
        prepDuration = 1; break;
      case "skchr_gnosis_3":
        prepDuration = 1.167; break;
      case "skchr_mint_2":
        prepDuration = 1.33; break;
      case "skchr_provs_2":
        prepDuration = 0.767; break;
      case "skchr_red_1":
        log.writeNote("落地1s，不影响技能时间");
        break;
      case "skchr_texas2_2":
        log.writeNote("落地1s，不影响技能时间");
        prepDuration = 0.167;
        break;
      case "skchr_lin_2":
        prepDuration = 1.333;
        log.writeNote("技能开关耗费40帧");
        break;
      case "skchr_noirc2_1":
        prepDuration = blackboard.nadaodonghua_duration;  // yj的工地拼音
        break;
      case "skchr_typhon_3":
        prepDuration = 1.667;
        log.writeNote("启动30帧，结束20帧");
        break;
    }

    // 快速估算
    attackCount = Math.ceil((levelData.duration - prepDuration) / attackTime);
    duration = attackCount * attackTime;
    startSp = spData.spCost - spData.initSp;

    if (buffList["tachr_180_amgoat_2"]) { // 乱火
      var init_sp = spData.initSp + (buffList["tachr_180_amgoat_2"].sp_min + buffList["tachr_180_amgoat_2"].sp_max) / 2;
      startSp = spData.spCost - init_sp;
    } else if (buffList["tachr_222_bpipe_2"]) { // 军事传统
      startSp = spData.spCost - spData.initSp - buffList["tachr_222_bpipe_2"].sp
                - (buffList["tachr_222_bpipe_2"]["bpipe_e_2[locate].sp"] || 0);
    } else if (buffList["tachr_456_ash_2"]) {
      startSp = spData.spCost - spData.initSp - buffList["tachr_456_ash_2"].sp;
    } else if (buffList["uniequip_002_archet"] && "archet_e_t_2.sp" in buffList["uniequip_002_archet"].talent) {
      startSp = spData.spCost - spData.initSp - buffList["uniequip_002_archet"].talent["archet_e_t_2.sp"];
    }
    log.write(`技能启动需要SP: ${startSp.toFixed(1)}`);
    // 重置普攻
    if (rst) {
      if (duration > (levelData.duration-prepDuration) && rst != "ogcd") {
        if (options.overdrive_mode)
          log.write("[结束时重置普攻] 截断最后一个攻击间隔");
        else
          log.write(`[重置普攻] 截断最后一个攻击间隔`);
      }
      duration = levelData.duration - prepDuration;
      // 抬手时间
      // 技能没有抬手数据的尝试使用普攻抬手
      frameBegin = 12;
      if (!checkSpecs(skillId, "attack_begin") && checkSpecs(charId, "attack_begin")) {
        frameBegin = calcAttackBegin(charId, attackSpeed, options, log);
        log.write("(参照普攻抬手时间)");
      } else {
        frameBegin = calcAttackBegin(skillId, attackSpeed, options, log);
      }

      var t = frameBegin / 30;
      attackCount = Math.ceil((duration - t) / attackTime);
      log.write(`技能前摇: ${t.toFixed(3)}s, ${frameBegin} 帧`);

    }
    // 技能类型
    if (levelData.description.includes("持续时间无限") || checkSpecs(skillId, "toggle")) {
      if (skillId == "skchr_thorns_3" && !options.warmup) {}
      else if (skillId == "skchr_buildr_2" && !options.warmup) {}
      else if (skillId == "skchr_tuye_2") {
        log.writeNote("取技能时间=暖机时间");
        duration = spData.spCost / (1 + buffFrame.spRecoveryPerSec);
        attackCount = Math.ceil(duration / attackTime);
      } else if (skillId == "skchr_surtr_3") {
        var lock_time = buffList["tachr_350_surtr_2"]["surtr_t_2[withdraw].interval"];
        duration = Math.sqrt(600) + lock_time;
        attackCount = Math.ceil(duration / attackTime);
        log.write(`损失100%血量耗时: ${Math.sqrt(600).toFixed(1)}s，锁血时间: ${lock_time}s`);
        log.writeNote(`不治疗最大维持 ${duration.toFixed(1)}s`);
      } else if (skillId == "skchr_typhon_2" && !options.warmup) {
        duration = blackboard.first_duration;
        attackCount = Math.ceil(duration / attackTime);
      } else if (skillId == "skchr_swire2_3") {
        duration = 3 * options.swire2_s3_coin;
        attackCount = Math.ceil(duration / attackTime);
        log.writeNote(`以${duration.toFixed(2)}s(${options.swire2_s3_coin}金币)计算技能时间`);
        log.writeNote(`终结动画40帧`);
        duration += 1.33;
      } else {
        var d = (options.short_mode ? 180 : 1000);
        attackCount = Math.ceil(d / attackTime);
        duration = attackCount * attackTime;
        if (checkSpecs(skillId, "toggle")) {
          log.writeNote(`切换类技能 (以${d}s计算)`); tags.push("toggle", "infinity");
        } else {
          log.writeNote(`永续技能 (以${d}s计算)`); tags.push("infinity");
        }
      }
    } else if (spType == 8) {
      if (levelData.duration <= 0 && blackboard.duration > 0) {
        // 砾的技能也是落地点火，但是持续时间在blackboard里
        levelData.duration = blackboard.duration;
	     	duration = blackboard.duration;
        attackCount = Math.ceil(levelData.duration / attackTime);
      }
      if (levelData.duration > 0) { // 自动点火
        tags.push("auto"); log.write('落地点火');
        if (prepDuration > 0) duration = levelData.duration - prepDuration;
      } else if (checkSpecs(skillId, "passive")) { // 被动
        attackCount = 1;
        duration = attackTime;
        tags.push("passive"); log.write("被动");
      } else if (skillId == "skchr_phatom_2") { // 傀影2
        attackCount = blackboard.times;
        duration = attackTime * attackCount;
      } else {  // 摔炮
        attackCount = 1;
        duration = 0;
        tags.push("auto", "instant"); log.write("落地点火, 瞬发");
        if (checkSpecs(skillId, "cast_time")) {
          duration = checkSpecs(skillId, "cast_time") / 30;
        }
        if (skillId == "skchr_yato2_2")
          attackCount = 16;
        else if (skillId == "skchr_yato2_3") {
          attackCount = (options.cond ? 18 : 5);
          log.writeNote(`以${attackCount}段伤害计算`);
        } 
      }
    } else if (levelData.duration <= 0) { 
      if (checkSpecs(skillId, "instant_buff")) { // 瞬发的有持续时间的buff，例如血浆
        duration = blackboard.duration || checkSpecs(skillId, "duration");
        attackCount = Math.ceil(duration / attackTime);
        tags.push("instant", "buff"); log.writeNote("瞬发Buff，技能周期为Buff持续时间");
      } else if (checkSpecs(skillId, "magazine")) { // 弹药技能
        let mag = checkSpecs(skillId, "magazine");
        if (options.charge && skillId == "skchr_chen2_2")
          mag = 20;        
        else if (skillId == "skchr_ctable_2")
          mag = blackboard["attack@trigger_time"];
        else if (skillId == "skchr_typhon_3")
          mag = blackboard["attack@s3_trigger_time"];

        if (buffList["tachr_1013_chen2_1"]) {
          var prob = buffList["tachr_1013_chen2_1"]["spareshot_chen.prob"];
          var new_mag = Math.floor(mag / (1-prob));
          log.writeNote(`计入 ${new_mag - mag} 发额外弹药`);
          mag = new_mag;
        }
        let extraMagazine = 0;
        if (charId == "char_1032_excu2") {
          extraMagazine = parseInt(options.extra_magazine) || 0;
        } else if (buffList["tachr_498_inside_1"]) {
          extraMagazine = buffList["tachr_498_inside_1"].self_ammo;
        }
        if (extraMagazine > 0) { 
          log.writeNote(`计入 ${extraMagazine} 发额外弹药`);
          mag += extraMagazine;
        }
        log.write(`弹药类技能: ${displayNames[skillId]}: 攻击 ${mag} 次`);
        attackCount = mag;
        duration = attackTime * attackCount;
        if (rst) duration -= attackTime;
      } else if (skillId == "skchr_blkngt_2" && options.token) {
        duration = blackboard["blkngt_s_2.duration"];
        attackCount = Math.ceil(duration / attackTime);
      } else if (skillId.includes("charge_cost")) {
        duration = attackCount = 0;
      } else { // 普通瞬发
        attackCount = 1;
        // 不占用普攻的瞬发技能，持续时间等于动画时间。否则持续时间为一次普攻间隔
        if (checkSpecs(skillId, "reset_attack") != "ogcd")
          duration = attackTime;
        tags.push("instant"); log.write("瞬发");
        // 施法时间-基于动画
        if (checkSpecs(skillId, "anim_key") && checkSpecs(skillId, "anim_cast")) {
          let animKey = checkSpecs(skillId, "anim_key");
          let animData = AKDATA.Data.dps_anim[charId][animKey];
          let ct = animData.duration || animData;

          log.write(`技能动画：${animKey}, 释放时间 ${ct} 帧`);
          log.writeNote(`技能动画: ${ct} 帧`);
          if ((duration < ct/30 && spType == 1) || rst == "ogcd")
            duration = ct/30;
        }
        // 施法时间
        if (checkSpecs(skillId, "cast_time")) {
          let ct = checkSpecs(skillId, "cast_time");
          if (duration < ct/30 || rst == "ogcd") {
            log.write(`技能动画: ${ct} 帧(基于动画数据)`);
            log.writeNote(`技能动画: ${ct} 帧`);
            if (spType == 1 || spType == 2 || rst == "ogcd")
              duration = ct / 30;
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
        log.write(`一半弹药攻击 ${attackCountHalf} 次`);
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
      log.write(`[特殊] ${displayNames["skchr_huang_3"]}: 实际攻击 ${attackCount}段+终结`);
    } else if (skillId == "skchr_sunbr_2") { // 古米2准备时间延长技能时间
      prepDuration = blackboard.disarm;
    } else if (skillId == "skchr_qiubai_2") {
      prepDuration = checkSpecs(skillId, "cast_time") / 30.0;
    } else if (skillId == "skchr_takila_2" && options.charge) {
      duration = blackboard.enhance_duration;
      attackCount = Math.ceil(duration / attackTime);
    } else if (charId == "char_4055_bgsnow" && options.token) {
      // 不管精英化等级 统一按25秒计算
      if (duration > 25) {
        duration = 25;
        attackCount = Math.ceil(duration / attackTime);
        log.writeNote("[打字机]按持续25秒计算");
      }
    } else if (skillId == "skchr_ironmn_3" && options.token) {
      attackCount = 1;
      duration = 3 * 100 / attackSpeed;
      log.writeNote("以攻击1次计算");
      log.writeNote("可使用攻速Buff设置攻击间隔");
    } else if (skillId == "skchr_chimes_2") {
      attackCount = 1;  // 只有一刀
      if (options.od_trigger) duration = 0; // 选择立即结束，时间为0
      let chimes_s2_cast = checkSpecs(skillId, "cast_time"); // 再加上尾刀时间，以动画时间计
      log.writeNote(`尾刀时间 ${chimes_s2_cast} 帧`);
      duration += chimes_s2_cast / 30.0;
    } else if (skillId == "skchr_qiubai_3") { // 仇白3
      // 计算当前普攻攻速
      let fps = 30;
      let base_attack_time = 39;  // 原本39帧
      let anim_time = 35; // 动画35帧，如果攻击间隔大于这个数字 则补帧
      let normal_aspd = attackSpeed - blackboard.attack_speed * blackboard.max_stack_cnt;

      let aspd_list = [...Array(blackboard.max_stack_cnt+1).keys()].map(x => normal_aspd + blackboard.attack_speed * x);
      let frame_list = aspd_list.map(x => {
        let f = base_attack_time * 100 / x;
        if (f > anim_time + 0.5)  // -- 有ResetAttackStrategy时 根据动画时间加半帧判断是否补帧（存疑）
          f = Math.ceil(f) + 1;
        else 
          f = Math.round(f);
        return f;
      });
      let stack_frame = frame_list.reduce((x, y) => x+y);
      let stack_attack_count = frame_list.length;

      let stack_predelay = Math.ceil((checkSpecs(skillId, "attack_begin")-1) * 100 / attackSpeed + 1);  // ceil(15 / 204% + 1)
      let remain_frame = duration * fps - stack_predelay - stack_frame;
      let remain_attack_count = Math.ceil(remain_frame / (fps * attackTime));
      let edge = remain_frame - fps * attackTime * (remain_attack_count-1); // 给calcEdges调用
      tags["edge"] = edge;
      attackCount = stack_attack_count + remain_attack_count;
      log.write(`攻速: ${aspd_list}...`);
      log.write(`叠层攻击帧数(考虑帧数对齐补正): ${frame_list}...`);
      log.write(`叠层时间 ${stack_frame} 帧(包括第${stack_attack_count}次攻击)`);
    } else if (skillId == "skchr_noirc2_1") { // S黑角1
      if (options.od_trigger) {
        duration = 1;
        attackCount = 1;
        log.writeNote("立即拔刀，仅计算尾刀时间");
      } else {
        duration += 1;
        attackCount = 1;
      }
    } else if (skillId == "skchr_noirc2_2") {
      attackCount = 1;
    } else if (skillId == "skchr_yato2_1") {
      // 这部分代码需要统一化
      let fps = 30;
      let base_attack_time = 0.93;  // 原本攻击间隔/s
      let atb = [15, 15, 19, 9];  // 4刀各自的原本前摇
      let anim = [30, 30, 31, 32]; // 各自动画时间
      let real_atb = atb.map(x => Math.round(x * 100 / attackSpeed)); // 各自实际前摇
      let real_attack_time = base_attack_time * 100 / attackSpeed;
      let frameCorrection = function(realAttackTime, origAnimFrame, maxAnimScale, resetCDStrategy, relyOnAttackSpeed, speed) { // realAttackTime
        // resetCD = False, maxAnimScale = 1, speed = 1, rely = False
        origAnimFrame /= speed; // 调速
        // 计算scale
        let attackFrame = Math.round(realAttackTime * fps * 100000)/100000; // 攻击帧数（不舍入但保留小数位）
        let scale = attackFrame / origAnimFrame;
        if (maxAnimScale > 0) scale = Math.min(maxAnimScale, scale);
        if (!relyOnAttackSpeed) scale = 1;
        //console.log("scale: ", scale);

        // animation frame (混合了前后摇，并且四舍五入)
        let animFrame = Math.round(origAnimFrame * scale);
        // resetCDStrategy为True时舍入，False时只能ceil
        let attackFrameInt = (resetCDStrategy ? Math.round(attackFrame) : Math.ceil(attackFrame));
        // 补帧判断
        if (attackFrameInt > animFrame) attackFrameInt += 1;
        attackFrameInt = Math.max(animFrame, attackFrameInt); // 不能比缩放后的动画短，以此拉长攻击间隔
        // duration: 动画帧数, interval: 补帧后的攻击间隔
        console.log({animFrame, attackFrameInt, attackFrame, real_attack_time});
        return { duration: animFrame, interval: attackFrameInt};
      };

      let f_12 = frameCorrection(real_attack_time, anim[0], 1, false, true, 1).interval; // 前两刀补帧
      let f_3 = frameCorrection(real_attack_time, anim[2], 1, false, true, 1).duration; // 3-4刀只计算动画时间
      let f_4 = frameCorrection(real_attack_time, anim[3], 1, false, true, 1).duration;
      let f_34 = frameCorrection(real_attack_time, f_3+f_4, 1, false, false, 1).interval; // 之后在relyAttackSpeed=False的环境中一起补帧
      log.writeNote(`连击帧数 ${f_12}-${f_12}-${f_34}`);

      let rotationFrame = f_12 + f_12 + f_34;
      // 尾刀计算
      let n = Math.floor(duration * fps / rotationFrame);
      attackCount = n * 5;
      let r = duration * fps - n * rotationFrame;
      if (r > real_atb[0]) {
        r -= f_12; attackCount += 1;
      }
      if (r > real_atb[0]) {
        r -= f_12; attackCount += 1;
      }
      if (r > real_atb[2]) {
        r -= f_3; attackCount += 2;
      }
      if (r > real_atb[3]) {
        r = r+f_3-f_34; attackCount += 1;
      }
      log.write(`攻击次数 ${n} * 10 + ${(attackCount-n*5)*2}`);
      tags["edge"] = r;
    } else if (skillId == "skchr_ines_2") {
      // 计算当前普攻攻速
      let fps = 30;
      let base_attack_time = 30;  // 原本39帧
      let anim_time = 30; // 动画35帧，如果攻击间隔大于这个数字 则补帧
      let normal_aspd = attackSpeed - blackboard["attack@steal_atk_speed_max"];

      let aspd_list = [...Array(10+1).keys()].map(x => normal_aspd + blackboard["attack@steal_atk_speed"] * x);
      let frame_list = aspd_list.map(x => {
        let f = base_attack_time * 100 / x;
        if (f > anim_time + 0.5)  // -- 有ResetAttackStrategy时 根据动画时间加半帧判断是否补帧（存疑）
          f = Math.ceil(f) + 1;
        else 
          f = Math.round(f);
        return f;
      });
      let stack_frame = frame_list.reduce((x, y) => x+y);
      let stack_attack_count = frame_list.length;

      let stack_predelay = Math.ceil((checkSpecs(skillId, "attack_begin")-1) * 100 / attackSpeed + 1);  // ceil(14 / 170% + 1)
      let remain_frame = duration * fps - stack_predelay - stack_frame;
      let remain_attack_count = Math.ceil(remain_frame / (fps * attackTime));
      let edge = remain_frame - fps * attackTime * (remain_attack_count-1); // 给calcEdges调用
      tags["edge"] = edge;
      attackCount = stack_attack_count + remain_attack_count;
      log.write(`攻速: ${aspd_list}...`);
      log.write(`叠层攻击帧数(考虑帧数对齐补正): ${frame_list}...`);
      log.write(`叠层时间 ${stack_frame} 帧(包括第${stack_attack_count}次攻击)`);
    } else if (charId == "char_1032_excu2" && buffList["tachr_1032_excu2_1"]) {
      let {prob, prob_add} = buffList["tachr_1032_excu2_1"];
      let stackCount = Math.ceil((1-prob) / prob_add); // 叠层次数
      let n = Math.min(attackCount, stackCount);
      let stackProb = prob + prob_add * (n-1);  // 等差数列了
      let expect = (prob + stackProb) * n / 2 + Math.max(attackCount-n, 0);

      log.writeNote(`技能连击期望 ${expect.toFixed(2)}`);
      tags["origAttackCount"] = attackCount;
      tags["extraAttack"] = expect;
      attackCount += expect;
      if (skillId == "skchr_excu2_3") {
        duration += 1;
        log.writeNote("尾刀动画时间1s");
      }
    } else if (skillId == "skchr_spuria_2") {
      if (attackTime < blackboard.stun_time) {
        // attackCount * attackTime * (1-prob) + attackCount * stunTime * prob = duration
        attackCount = Math.ceil(duration / (attackTime + blackboard.prob * (blackboard.stun_time - attackTime)));
        let stunCount = Math.floor(attackCount * blackboard.prob);
        let goodCount = attackCount - stunCount;
        let stunTime = stunCount * blackboard.stun_time;
        let goodTime = goodCount * attackTime;
        log.writeNote(`攻击${attackCount}次，其中晕眩${stunCount}次`);
        log.write(`计时 ${goodTime.toFixed(1)} + ${stunTime.toFixed(1)}s`);
      } else {
        log.writeNote("攻击间隔>晕眩时间，无影响");
      }
    }
    // -- calcDurations skill judge ends here

    // Jan 26: 处理伤害时间与技能持续时间不同的情况
    if (buffFrame.dpsDuration) {
      dpsDuration = buffFrame.dpsDuration;
      log.writeNote(`技能伤害持续${dpsDuration.toFixed(3)}s`);
      tags.push("diff");
    }
    if (buffFrame.dpsDurationDelta) {
      dpsDuration = buffFrame.dpsDurationDelta + duration;
      log.writeNote(`技能伤害持续${dpsDuration.toFixed(3)}s`);
      tags.push("diff");
    }
  } else { // 普攻
    // 眩晕处理
    if (skillId == "skchr_fmout_2") {
      stunDuration = blackboard.time;
    } else if (skillId == "skchr_peacok_2") {
      stunDuration = blackboard["failure.stun"] * (1 - blackboard.prob);
      log.write(`[特殊] 计算平均晕眩时间`);
    } else if (["skchr_amiya_2", "skchr_liskam_2", "skchr_ghost_2",
                "skchr_broca_2", "skchr_serum_1", "skchr_aurora_1"].includes(skillId)) {
      stunDuration = blackboard.stun;
    } else if (skillId == "skchr_folivo_2" && options.token) {
      stunDuration = blackboard.stun;
    } else if (skillId == "skchr_rockr_2" && !options.od_trigger) {
      stunDuration = 20;
    }
    if (stunDuration > 0) log.write(`晕眩: ${stunDuration}s`);

    // 圣葬: 开技能可以重置普攻，但结束时不行
    // 因此设置reset_attack=False但在普攻这里改成True
    if (charId == "char_1032_excu2") rst = true;
    
    // 快速估算
    let spRatio = 1;
    if (buffFrame.spRecoverRatio != 0) {
      spRatio += buffFrame.spRecoverRatio;
      log.write(`技力回复 ${((1 + buffFrame.spRecoveryPerSec) * spRatio).toFixed(2)}/s`);
    }
    let attackDuration = spData.spCost / ((1 + buffFrame.spRecoveryPerSec) * spRatio) - stunDuration;
    if (spRatio == 0) {
      attackDuration = 180;
      log.writeNote("以180s计算普攻DPS");
    }

    // 施法时间
    if (checkSpecs(skillId, "cast_time")) {
      let ct = checkSpecs(skillId, "cast_time");
      if (attackTime > ct/30 && rst != "ogcd") {
        attackDuration -= (attackTime - ct/30);
        log.write(`[特殊] 技能释放时间: ${ct} 帧, 普攻时间偏移 ${(ct/30 - attackTime).toFixed(3)}s (${attackDuration.toFixed(3)}s)`);
        log.writeNote(`技能动画(阻回): ${ct} 帧`);
      }
    }
    attackCount = Math.ceil(attackDuration / attackTime);
    duration = attackCount * attackTime;
    // 重置普攻（瞬发/ogcd除外）
    if (rst && rst != "ogcd" && spType != 8 && spRatio != 0) {
      var dd = spData.spCost / ((1 + buffFrame.spRecoveryPerSec) * spRatio) - stunDuration;
      if (duration > dd)
        log.write(`[重置普攻] 截断最后一个攻击间隔`);
      duration = dd;
      // 抬手时间
      frameBegin = calcAttackBegin(charId, attackSpeed, options, log);
      var t = frameBegin / 30;
      attackCount = Math.ceil((duration - t) / attackTime);
      log.write(`普攻前摇: ${t.toFixed(3)}s, ${frameBegin} 帧`);
    }
    
    // June 20: 额外sp计算mixin
    let _args = {
      buffFrame,
      buffList, 
      spData,
      stunDuration,
      attackCount,
      attackTime,
      duration,
      rst,
      options,
      skillId,
      enemyCount
    };

    // 技能类型
    switch (spType) {
      case 8: // 被动或落地点火
        if (levelData.duration <= 0 && blackboard.duration > 0) {
          console.log("Duration? l/b", skillId, levelData.duration, blackboard.duration);
          levelData.duration = blackboard.duration;
        }
        if (levelData.duration > 0) {
          tags.push("auto");
          if (skillId == "skchr_nearl2_2") {
            attackCount = 0; duration = 1;
            log.writeNote("不进行普攻");
          } else {
            if (skillId == "skchr_yato2_1") {
              log.write(`[特殊] 取普攻时间=10s`);
              log.writeNote("普攻时间以10s计算");
              attackDuration = 10;
            } else {
              log.write(`[特殊] 落地点火 - 取普攻时间=技能持续时间`);
              log.writeNote("取普攻时间=技能持续时间");
              attackDuration = levelData.duration;
            }
            attackCount = Math.ceil(attackDuration / attackTime);
            duration = attackCount * attackTime;
          }
        } else if (checkSpecs(skillId, "passive")) { // 被动
          attackCount = 10;
          duration = attackCount * attackTime;
          tags.push("passive");
          log.write(`[特殊] 被动 - 以10次普攻计算`);
          log.writeNote("以10次普攻计算");
        } else if (skillId == "skchr_swire2_1" || skillId == "skchr_swire2_2") {
          attackDuration = 2;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
          tags.push("auto", "instant");
        } else {
          attackDuration = 10;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
          tags.push("auto", "instant");
          log.write(`[特殊] 落地点火/瞬发 - 以10s普攻计算`);
          log.writeNote("以10s普攻计算");
        }
        break;
      case 4: // 受击回复
        log.write(`受击回复`);
        break;
      case 2: // 攻击恢复
        log.write(`攻击回复`);
        let realSp = spData.spCost;
        if (options.charge && checkSpecs(skillId, "charge")) {
          if (skillId == "skchr_chyue_1")
            realSp = spData.spCost * blackboard.cnt;
          else
            realSp = spData.spCost*2;
        }
        if (skillId == "skchr_chyue_3" && options.warmup)
          realSp = spData.spCost / 2;
        if (realSp != spData.spCost)
          log.write(`实际需要SP: ${realSp.toFixed(1)}`);
        attackCount = realSp;
        
        let intv_chen = buffList["tachr_010_chen_1"] ? buffList["tachr_010_chen_1"].interval : 4;
        let intv_archet = buffList["tachr_332_archet_1"] ? buffList["tachr_332_archet_1"].interval : 2.5;
        let extra_sp = 0, next = true;

        // 枚举所需的最少攻击次数
        while (attackCount > 0 && next) {
          duration = attackCount * attackTime;
          extra_sp = 0;
          if (buffList["tachr_010_chen_1"] || options.chen)
            extra_sp += Math.floor(duration / intv_chen);
          if (buffList["tachr_332_archet_1"] || options.archet)
            extra_sp += Math.floor(duration / intv_archet);
          if (buffList["tachr_301_cutter_1"]) {
            let p = buffList["tachr_301_cutter_1"].prob;
            extra_sp += (skillId == "skchr_cutter_1" ? (attackCount*2+1)*p : attackCount*2*p); 
          }
          if (buffList["tachr_1032_excu2_1"]) {
            let p = buffList["tachr_1032_excu2_1"].prob;
            extra_sp += attackCount*p;
          }
          next = (attackCount + extra_sp >= realSp);
          if (next) attackCount -= 1;
        }
        if (!next) attackCount += 1;
        duration = attackCount * attackTime;
        let line = [];
        if (buffList["tachr_010_chen_1"] || options.chen)
          line.push(`呵斥触发 ${Math.floor(duration / intv_chen)} 次`);
        if (buffList["tachr_332_archet_1"] || options.archet)
          line.push(`兰登战术触发 ${Math.floor(duration / intv_archet)} 次`);
        if (buffList["tachr_301_cutter_1"]) {
          let p = buffList["tachr_301_cutter_1"].prob;
          let _n = ( skillId == "skchr_cutter_1" ? (attackCount*2+1)*p : attackCount*2*p )
          line.push(`光蚀刻痕期望 ${_n.toFixed(2)} 次`);
        }
        if (buffList["tachr_1032_excu2_1"]) {
          let p = buffList["tachr_1032_excu2_1"].prob;
          let _n = attackCount*p;
          line.push(`连击期望 ${_n.toFixed(2)} 次`);
        }
        if (line.length > 0) log.write(`[特殊] ${line.join(", ")}`);
        if (rst) {
          duration -= attackTime;
          if (checkSpecs(charId, "attack_begin")) {
            let t = checkSpecs(charId, "attack_begin");
            duration += t / 30;
            log.write(`普攻前摇${t}帧，技能取消后摇`);
          } else {
            log.write('不计最后一次普攻时间(需要前摇数据)');
          }
        }
        break;
      case 1: // 普通，前面已经算过一遍了，这里只特判
        let sp_rate = 1 + buffFrame.spRecoveryPerSec;
        if (buffList["tachr_002_amiya_1"]) { // 情绪吸收
          attackCount = Math.ceil((spData.spCost - stunDuration*sp_rate) / (buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"] + attackTime*sp_rate));
          log.write(`[特殊] ${displayNames["tachr_002_amiya_1"]}: attack sp = ${attackCount * buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"]}`);
          duration = attackCount * attackTime;
        } else if (buffList["tachr_134_ifrit_2"]) { // [莱茵回路]. 需要解出攻击次数
          let i = buffList["tachr_134_ifrit_2"].interval;
          let extra_sp = buffList["tachr_134_ifrit_2"]["ifrit_e_002[dice_sp].prob"] ? 5 : 0;
          let isp = i * sp_rate + buffList["tachr_134_ifrit_2"].sp;
          let recoverCount = Math.ceil((spData.spCost - i - extra_sp) / isp); // recoverCount >= (spCost - i) / isp
          let r = (spData.spCost - recoverCount * isp - extra_sp) / sp_rate;
          attackDuration = recoverCount * i + r;
          attackCount = Math.ceil(attackDuration / attackTime);
          //console.log(i, isp, recoverCount, r, attackDuration, attackCount);
          duration = attackDuration;
          log.write(`[特殊] ${displayNames["tachr_134_ifrit_2"]}: sp + ${recoverCount * buffList["tachr_134_ifrit_2"].sp + extra_sp}`); 
        } else if (checkSpecs(skillId, "instant_buff")) { // 不稳定血浆: 减去buff持续时间
          attackDuration -= blackboard.duration || checkSpecs(skillId, "duration");
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
          log.writeNote("瞬发Buff，技能周期为Buff持续时间");
        } else if (buffList["tachr_400_weedy_2"] && options.cannon) { // 水炮充能，持续20s/cd35s
          let intv = buffList["tachr_400_weedy_2"].interval || 3;
          let cannon_sp = Math.floor(20 / intv);
          let m = Math.floor(spData.spCost / 55);
          let a = m * cannon_sp + m * 55 * sp_rate; // 前m个水炮充能+自然恢复的sp量
          let b = cannon_sp + 20 * sp_rate; // 最后一个水炮持续期间最多恢复的sp
          let c = cannon_sp;  // 最后一个水炮充的sp
          let r = 0; // 计算还需要多少时间充满
          if (a + b > spData.spCost) { // 技能会在b期间蓄好
            let y = Math.floor((spData.spCost - a) / (intv * sp_rate + 1.0));
            let z = (spData.spCost - a - y) / sp_rate - y*intv;
            r = intv*y+z;
            c = Math.floor(r/intv);
          } else {
            r = (spData.spCost - a - b) / sp_rate + 20;
          }
          attackDuration = m*55+r;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackDuration;
          log.write(`[特殊] ${displayNames["tachr_400_weedy_2"]}: 使用${m+1}个水炮, 充能sp=${m * cannon_sp + c}`);
        } else if (options.charge && checkSpecs(skillId, "charge")) { // 蓄力
          let chargeDuration = spData.spCost;
          if (buffList["tachr_426_billro_2"]) {
            chargeDuration /= (1 + buffFrame.spRecoveryPerSec + buffList["tachr_426_billro_2"].sp_recovery_per_sec);
            log.write(`[特殊] ${displayNames["tachr_426_billro_2"]}: 二段蓄力时间 ${chargeDuration.toFixed(1)} s`);
          }
          attackDuration += chargeDuration;
          duration = attackDuration;
          attackCount = Math.ceil(attackDuration / attackTime);
        } else if (options.equip && subProf == "longrange") { // 守林模组
          let entry = buffList["uniequip_002_milu"] || buffList["uniequip_003_fartth"] || buffList["uniequip_002_lunacu"];
          if (entry) {
            log.writeNote("每次攻击恢复1sp");
            attackCount = Math.ceil((spData.spCost - stunDuration*sp_rate) / (entry.trait.sp + attackTime*sp_rate));
            log.write(`[特殊] 攻击恢复SP = ${attackCount * entry.trait.sp}`);
            duration = attackCount * attackTime;
          }
        } else if ("uniequip_002_leizi" in buffList && options.cond
                   && "sp" in buffList["uniequip_002_leizi"].talent) { // 惊蛰模组
          log.writeNote("每次命中恢复1sp");
          attackCount = Math.ceil((spData.spCost - stunDuration*sp_rate) / (enemyCount + attackTime*sp_rate));
          log.write(`[特殊] ${displayNames["uniequip_002_leizi"]}: 攻击恢复SP = ${attackCount * enemyCount}`);
          duration = attackCount * attackTime;
        } else if (buffList["tachr_489_serum_1"] && skillId == "skchr_serum_1") {
          let esp = buffList["tachr_489_serum_1"].sp_recovery_per_sec *
                    (stunDuration - buffList["tachr_489_serum_1"].delay);
          log.write(`眩晕时额外恢复 ${esp.toFixed(1)}sp`);
          attackDuration = (spData.spCost - esp) / (1 + buffFrame.spRecoveryPerSec) - stunDuration;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackDuration;
        } else if (buffList["tachr_422_aurora_1"]) {
          attackDuration = spData.spCost / ((1 + buffFrame.spRecoveryPerSec) * spRatio) / 2;
          if (attackDuration < stunDuration) attackDuration = 0;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = spData.spCost / ((1 + buffFrame.spRecoveryPerSec) * spRatio);
          log.write(`[特殊] ${displayNames["tachr_422_aurora_1"]}: 普攻时间 ${attackDuration.toFixed(3)}s / ${duration.toFixed(3)}s, 攻击 ${attackCount} 次`);
          log.write("(晕眩期间不回复技力)");
        } else if (skillId == "skchr_blkngt_2" && options.token) {
          duration = attackDuration - blackboard["blkngt_s_2.duration"];
          attackCount = Math.ceil(duration / attackTime);
        } else if (skillId == "skchr_ironmn_3" && options.token) {
          attackCount = 1;
          duration = 3 * 100 / attackSpeed;
        }
        // todo: cast time
    } // switch

    // ogcd穿插收益
    if (rst == "ogcd") {
      var _ct = (checkSpecs(skillId, "cast_time") || 12) / 30;
      var weavingGain = (duration - spData.spCost - _ct) / duration * 100;
      log.write("[提示] 非GCD技能（技能不影响普攻间隔），计算器不计入穿插收益");
      if (weavingGain > 0) {
        log.writeNote(`OGCD技能/穿插收益: ${weavingGain.toFixed(1)}%`);
      }
    }
  } // else
  } // sim else

  // 计算实际命中次数
  // attackCount = 发动攻击的次数(swings), hitCount = 命中敌人的次数(hits)
  let hitCount = attackCount * buffFrame.times * enemyCount;
  // 蓝毒2
  if (isSkill) {
    if (skillId == "skchr_bluep_2") {
      hitCount += attackCount * (blackboard["attack@times"] - 1);
    } else if (["skcom_assist_cost[2]", "skchr_utage_1", "skchr_tachak_1"].includes(skillId)) { // 投降类
      hitCount = 0;
    } else if (skillId == "skchr_kroos2_2") {
      let extra_atk_count = attackCount - blackboard["attack@max_stack_count"] / 2;
      if (extra_atk_count > 0) {
        hitCount += extra_atk_count * 2;
        log.writeNote(`4连击次数: ${extra_atk_count}`);
      } 
    } else if (skillId == "skchr_mlyss_3" && options.token && options.mlyssPosition == "RANGED") {
      // 分身登场耗费1s, 需要减去攻击次数
      frameBegin = calcAttackBegin(skillId, attackSpeed, options, new NoLog());
      let newTokenDuration = levelData.duration - 1.2 - frameBegin / 30;
      let newTokenAttackCount = Math.ceil(newTokenDuration / attackTime);
      let newTokenCount = 5 - options.mlyss_count;
      let delta = (attackCount - newTokenAttackCount) * newTokenCount
      hitCount -= delta;
      log.write(`技能生成${newTokenCount}个新分身，新分身部署-损失攻击次数 ${delta}, 实际攻击次数 ${hitCount}`);
      // 计算新旧分身抬手余量
      let frameOld = attackTime * 30 * (attackCount-1) + frameBegin;
      log.write(`[边缘检测] 原分身最后一次攻击判定 ${frameOld} / ${levelData.duration*30}`);
      if (frameOld > levelData.duration * 30) {
        log.write("实际为普攻，技能攻击次数-1");
        --hitCount;
      }
      log.write("[边缘检测] 新分身抬手计算");
      calcEdges({id: skillId}, Math.round(attackTime * 30),
                { duration: newTokenDuration,
                  attackCount: newTokenAttackCount,
                  tags, attackSpeed,
                  attackBegin: frameBegin },
                options, log);
      
    }
  }
  // 重岳3
  if (!isSkill && skillId == "skchr_chyue_3" && options.warmup) {
    hitCount -= 1;
    log.writeNote("最后一次普攻只有1段伤害");
  }

  log.write(`持续: ${duration.toFixed(3)} s`);
  log.write(`攻击次数: ${hitCount} (${buffFrame.times} 连击 x ${attackCount})`);

  return {
    attackCount,
    attackSpeed,
    times: buffFrame.times,
    hitCount,
    duration,
    stunDuration,
    prepDuration,
    dpsDuration,
    tags,
    startSp,
    spType,
    attackBegin: frameBegin,
    resetAttack: rst
  };
}

function calcAttackBegin(tag, attackSpeed, options, log) {
  let print = true;
  let attackBegin = checkSpecs(tag, "attack_begin");
  if (attackBegin === "0") attackBegin = 0; // 多一个等号

  if (options.token) {
    attackBegin = checkSpecs(tag, "token_attack_begin");
    if (tag == "skchr_ling_3" && options.ling_fusion) {
      attackBegin = 15;
      log.writeNote("大龙前摇增加");
    }
  } else if (tag == "skchr_glaze_2" && options.far) {
    attackBegin = 27;
    log.writeNote("原本范围外前摇延长");
  }
 
  if (!attackBegin && attackBegin !== 0) {
    log.writeNote("暂无抬手数据，以12帧计算");
    attackBegin = 12;
    print = false;
  }
  if (!options.fixed_atb) {
    // fixed_atb==True表示抬手不随攻速变化, 默认为False
    attackBegin = Math.ceil( (attackBegin - 1) * 100 / attackSpeed + 1);
  }
  if (print) {
    log.write(`[抬手时间] ${attackBegin} 帧`);
    log.writeNote(`抬手 ${attackBegin} 帧`);
  }
  return attackBegin;
}

// 计算边缘情况
function calcEdges(blackboard, frame, dur, options, log) {
  let _fps = 30;
  let skillId = blackboard.id;

  let attackBegin = dur.attackBegin;
  if (dur.attackBegin == 12)
    attackBegin = calcAttackBegin(skillId, dur.attackSpeed, options, new NoLog());
  let durationF = Math.round(_fps * dur.duration);  
  let remainF = attackBegin + frame * dur.attackCount - durationF;
  let passF = frame - remainF;
  // 类似能天使3这种，最后一次连击可能丢伤害的计算
  // 如果连击不丢伤害，则不需要这样计算
  let trigger = checkSpecs(skillId, "trigger_interval");  // triggerInterval / triggerDelta 连击间隔秒数
  let triggerCount = checkSpecs(skillId, "trigger_count");

  if (dur.tags.edge) {
    passF = dur.tags.edge;
    remainF = frame - passF;
  }

  log.write("**【边缘情况估算(试验功能，结果仅供参考)】**");
  log.write(`技能持续时间: ${durationF} 帧, 攻速 ${dur.attackSpeed}%, 抬手 ${attackBegin} 帧(受攻速影响), 攻击间隔 ${frame} 帧`);
  log.write(`技能结束时，前一次攻击经过: **${passF} 帧**`);
  log.write(`技能结束时，下一次攻击判定还需: **${remainF} 帧**`);
  if (trigger) {
    let triggerF = trigger * _fps;
    let totalTriggerF = Math.ceil(triggerF * triggerCount);
    log.write(`连击间隔 ${triggerF.toFixed(2)} 帧, 连击共耗时 ${totalTriggerF} 帧`);
    if (passF < attackBegin + totalTriggerF) {
      log.write('** 技能结束时，可能正在连击 **');
      let passHit = Math.min(Math.ceil(passF / triggerF), triggerCount);
      log.writeNote(`最后一次攻击${passHit}/${triggerCount}次在技能内`);
    }
  }
  if (remainF <= attackBegin)
    log.write('** 技能结束时，可能正在抬手 **');

  dur.remain = remainF;
}

function calculateAttack(charAttr, enemy, raidBlackboard, isSkill, charData, levelData, log) {
  let charId = charAttr.char.charId;
  let buffList = charAttr.buffList;
  let blackboard = buffList.skill;
  let basicFrame = charAttr.basic;
  let options = charAttr.char.options;
 
  // 备注信息
  if (isSkill && checkSpecs(charId, "note"))
    log.writeNote(checkSpecs(charId, "note"));
  if (options.equip && charAttr.char.equipId)
    log.writeNote("满足模组触发条件");
  //console.log(buffList);

  // 计算面板属性
  log.write("**【Buff计算】**");
  let buffFrame = initBuffFrame();
  for (var b in buffList) {
    let buffName = (b=="skill") ? buffList[b].id : b;
    //console.log(buffName);
    if (!checkSpecs(buffName, "crit"))
      buffFrame = applyBuff(charAttr, buffFrame, b, buffList[b], isSkill, false, log, enemy);
  }
  // 计算团辅
  if (options.buff)
    buffFrame = applyBuff(charAttr, buffFrame, "raidBuff", raidBlackboard, isSkill, false, log, enemy);

  // 攻击类型
  let damageType = extractDamageType(charData, charAttr.char, isSkill, levelData.description, blackboard, options);
  if (damageType == 2)
    buffFrame.atk_scale *= buffFrame.heal_scale;
  // 灰喉-特判
  if (buffList["tachr_367_swllow_1"]) {
    buffFrame.attackSpeed += buffList["tachr_367_swllow_1"].attack_speed;
    log.write(`[特殊] ${displayNames["tachr_367_swllow_1"]}: attack_speed + ${buffList["tachr_367_swllow_1"].attack_speed}`);
  }
  // 泡泡
  if (isSkill && blackboard.id == "skchr_bubble_2") {
    buffFrame.atk = basicFrame.def + buffFrame.def - basicFrame.atk;
    log.write(`[特殊] ${displayNames["skchr_bubble_2"]}: 攻击力以防御计算(${basicFrame.def + buffFrame.def})`);
  }
  // 迷迭香
  if (["char_391_rosmon", "char_1027_greyy2", "char_421_crow", "char_491_humus", "char_1032_excu2",
       "char_431_ashlok", "char_4066_highmo", "char_4039_horn"].includes(charId)) {
    if (charId == "char_4039_horn" && options.melee) {}
    else {
        buffFrame.maxTarget = 999;
        log.write(`[特殊] ${displayNames[charId]}: maxTarget = 999`);
    }
  }
  // 连击特判
  if (!isSkill && checkSpecs(charId, "times")) {
    var t = checkSpecs(charId, "times");
    buffFrame.times = t;

  }
  if (isSkill && checkSpecs(blackboard.id, "times")) {
    var t = checkSpecs(blackboard.id, "times");
    buffFrame.times = t;
  }
  if (blackboard.id == "skchr_chyue_3" && options.warmup) {
    // 重岳3：暖机后普攻/技能均攻击2次
    buffFrame.times = 2;
  }
  if (buffFrame.times > 1)
    log.write(`[连击] ${displayNames[charId]} - 攻击 ${buffFrame.times} 次`);
  
  // 瞬发技能的实际基础攻击间隔
  /*
  if (isSkill && checkSpecs(blackboard.id, "cast_bat")) {
    var f = checkSpecs(blackboard.id, "cast_bat");
    basicFrame.baseAttackTime = f / 30;
    log.write(`[特殊] ${displayNames[blackboard.id]} - 技能动画时间 ${(f/30).toFixed(3)}s, ${f} 帧`);
  }
*/
  let finalFrame = getBuffedAttributes(basicFrame, buffFrame);
  let critBuffFrame = initBuffFrame();
  let critFrame = {};
  // 暴击面板
  if (options.crit) {
    log.write("**【暴击Buff计算】**");
    for (var b in buffList) {
      let buffName = (b=="skill") ? blackboard.id : b;
      critBuffFrame = applyBuff(charAttr, critBuffFrame, b, buffList[b], isSkill, true, log, enemy);
    }  
    // 计算团辅
    if (options.buff)
      critBuffFrame = applyBuff(charAttr, critBuffFrame, "raidBuff", raidBlackboard, isSkill, true, log, enemy);
    critFrame = getBuffedAttributes(basicFrame, critBuffFrame);
  }
  // ---- 计算攻击参数
  // 最大目标数
  if (charData.description.includes("阻挡的<@ba.kw>所有敌人") && buffFrame.maxTarget < basicFrame.blockCnt) {
    buffFrame.maxTarget = basicFrame.blockCnt;
  } else if (["所有敌人", "群体法术伤害", "群体物理伤害"].some(kw => charData.description.includes(kw))) {
    buffFrame.maxTarget = 999;
  } else if (charData.description.includes("恢复三个") && !(isSkill && charId == "char_275_breeze")) {
      buffFrame.maxTarget = Math.max(buffFrame.maxTarget, 3);
  }
  if (options.token) {
    if (blackboard.id == "skchr_mgllan_3" ||
        (isSkill && blackboard.id == "skchr_mgllan_2"))
        buffFrame.maxTarget = 999;
    if (blackboard.id == "skchr_ling_3")
      buffFrame.maxTarget = (options.ling_fusion ? 4 : 2);
  } 
  // 计算最终攻击间隔，考虑fps修正
  let fps = 30;
  // 攻速上下界
  let _spd = Math.min(Math.max(10, finalFrame.attackSpeed), 600);
  if (finalFrame.attackSpeed != _spd) {
    finalFrame.attackSpeed = _spd;
    log.writeNote("达到攻速极限");
  }

  // sec spec
  if ((checkSpecs(blackboard.id, "sec") && isSkill) ||
      (options.annie && charId == "char_1023_ghost2")) {
    let intv = 1;
    if (checkSpecs(blackboard.id, "interval")) {
      intv = checkSpecs(blackboard.id, "interval");
    }
    finalFrame.baseAttackTime = intv;
    finalFrame.attackSpeed = 100;
    buffFrame.attackSpeed = 0;
    log.writeNote(`每 ${intv} 秒造成一次伤害/治疗`);
  }

  let realAttackTime = finalFrame.baseAttackTime * 100 / finalFrame.attackSpeed;
  let frame = realAttackTime * fps; 
  // 额外帧数补偿 https://bbs.nga.cn/read.php?tid=20555008
  let corr = checkSpecs(charId, "frame_corr") || 0;
  let corr_s = checkSpecs(blackboard.id, "frame_corr");
  if ((!(corr_s === false)) && isSkill) corr = corr_s;
  if (corr != 0) {
    let real_frame = Math.ceil(frame); // 有误差时，不舍入而取上界，并增加补正值(一般为1)
    real_frame += corr;
    var prefix = (corr>0 ? "+":"");
    if (isSkill) {
      log.writeNote("帧数补正");
      log.write("[补帧处理] 攻击间隔帧数 > 攻击动画帧数，实际攻击间隔需要补帧（参考动画帧数表）");
      log.write(`[补帧处理] 技能理论 ${Math.round(frame)} 帧 / 实际 ${real_frame} 帧`);
    } else {
      log.write("[补帧处理] 攻击间隔帧数 > 攻击动画帧数，实际攻击间隔需要补帧");
      log.write(`[补帧处理] 普攻理论 ${Math.round(frame)} 帧 / 实际 ${real_frame} 帧`);
    }
    frame = real_frame;
  } else {
    frame = Math.round(frame); // 无误差时，舍入成帧数
  }
  let frameAttackTime = frame / fps;
  let attackTime = frameAttackTime;
  calculateAnimation(charId, blackboard.id, isSkill, realAttackTime, finalFrame.attackSpeed, log);
  // 根据最终攻击间隔，重算攻击力
  if (isSkill && blackboard.id == "skchr_platnm_2") { // 白金
    let rate = (attackTime - 1) / (buffList["tachr_204_platnm_1"]["attack@max_delta"] - 1);
    // 熔断
    rate = Math.min(Math.max(rate, 0), 1);
    buffFrame.atk_scale = 1 + rate * (buffList["tachr_204_platnm_1"]["attack@max_atk_scale"] - 1);
    finalFrame = getBuffedAttributes(basicFrame, buffFrame); // 重算
    log.write(`[特殊] ${displayNames["tachr_204_platnm_1"]}: atk_scale = ${buffFrame.atk_scale.toFixed(3)} (${(rate*100).toFixed(1)}%蓄力)`);
  } else if (buffList["tachr_215_mantic_1"] && attackTime >= buffList["tachr_215_mantic_1"].delay) { // 狮蝎
    let atk = basicFrame.atk * buffList["tachr_215_mantic_1"].atk;
    log.write(`[特殊] ${displayNames["tachr_215_mantic_1"]}: atk + ${atk}`);
    finalFrame.atk += atk;
    buffFrame.atk = finalFrame.atk - basicFrame.atk;
  } 

  // 敌人属性
  let enemyBuffFrame = JSON.parse(JSON.stringify(buffFrame));
  // 处理对普攻也生效的debuff
  for (var b in buffList) {
    let buffName = (b=="skill") ? buffList[b].id : b;
    if (checkSpecs(buffName, "keep_debuff") && !enemyBuffFrame.applied[buffName]){
      log.writeNote("假设全程覆盖Debuff");
      enemyBuffFrame = applyBuff(charAttr, enemyBuffFrame, buffName, buffList[b], true, false, new Log(), enemy);
    }
  }
  // "用于计算伤害"的敌人属性
  let edef = Math.max(0, ((enemy.def + enemyBuffFrame.edef) * enemyBuffFrame.edef_scale - enemyBuffFrame.edef_pene) * (1-enemyBuffFrame.edef_pene_scale) );
  let emr = Math.min((enemy.magicResistance + enemyBuffFrame.emr) * enemyBuffFrame.emr_scale, 100);
  emr = Math.max(emr - enemyBuffFrame.emr_pene, 0);
  let emrpct = emr / 100;
  let ecount = Math.min(buffFrame.maxTarget, enemy.count);

  if (blackboard.id == "skchr_pudd_2" && isSkill && ecount > 1) {
    ecount = buffFrame.maxTarget;
    log.writeNote(`相当于命中 ${ecount} 个敌人`); 
  }

  // 平均化链法伤害
  if (["chain", "chainhealer"].includes(charData.subProfessionId)) {
    let scale = 0.85, s = 1; tot = 1, sks = [1];
    if (isSkill && blackboard.id == "skchr_leizi_2")
      scale = 1;
    else if (charAttr.char.equipId && AKDATA.Data.battle_equip_table[charAttr.char.equipId])
      scale = basicFrame.equip_blackboard.trait["attack@chain.atk_scale"];
    else if (charData.subProfessionId == "chainhealer") {
      let prefabId = charId.replace("char", "tachr") + "_trait";
      scale = buffList[prefabId]["attack@chain.atk_scale"];
    }
    
    for (var i=0; i<ecount-1; ++i) {
        s*=scale; tot += s; sks.push(s);
    }
    log.write(`[特殊] 链式攻击: 原本伤害倍率: ${buffFrame.damage_scale.toFixed(2)}`);
    buffFrame.damage_scale *= tot / ecount;
    log.write(`[特殊] 链式攻击: 连锁倍率: ${sks.map(x => x.toFixed(2))}, 平均伤害倍率 ${buffFrame.damage_scale.toFixed(2)}x`);
  }

  // 计算攻击次数和持续时间
  let dur = calcDurations(isSkill, attackTime, finalFrame.attackSpeed, levelData, buffList, buffFrame, ecount, options, charId, log);

  // 计算边缘情况
  let rst = checkResetAttack(blackboard.id, blackboard, options);
  if (rst && rst != "ogcd" && isSkill && !checkSpecs(blackboard.id, "skip_edges")) {
    calcEdges(blackboard, frame, dur, options, log);
  }
  // 暴击次数
  if (options.crit && !isNaN(critBuffFrame["prob"]) && critBuffFrame["prob"] !== null) {
    if (damageType != 2) {
      if (buffList["tachr_155_tiger_1"])
        dur.critCount = dur.duration / 3 * critBuffFrame.prob;
      else if (charId == "char_420_flamtl") {
        dur.critCount = Math.floor(dur.duration / 5);
        switch (blackboard.id) {
          case "skchr_flamtl_1":
          case "skchr_flamtl_2":
            if (!isSkill) dur.critCount += 1; break;
          case "skchr_flamtl_3":
            if (isSkill) dur.critCount += 2; break; 
        }
        console.log(`按闪避 ${dur.critCount} 次计算`);
      } else if (blackboard.id == "skchr_aurora_2" && isSkill) {
        dur.critCount = (options.freeze ? 9 : 3);
        log.writeNote(`按 ${dur.critCount} 次暴击计算`);
      } else if (charId == "char_4015_spuria") {
        // 只把晕眩的计入暴击次数，其他（二连击，无视防御）记为额外伤害
        dur.critCount = Math.ceil(dur.attackCount * critBuffFrame.prob / 3);
      } else 
        dur.critCount = dur.attackCount * critBuffFrame.prob;

      if (dur.critCount > 1) dur.critCount = Math.floor(dur.critCount);
      // 折算为命中次数
      if (buffList["tachr_222_bpipe_1"]) {
        dur.critHitCount = dur.critCount * dur.times * Math.min(enemy.count, 2);
      } else if (charId == "char_420_flamtl") {
        dur.critHitCount = dur.critCount * 2 * enemy.count;
      } else
        dur.critHitCount = dur.critCount * dur.times * ecount;

      if (charId == "char_1021_kroos2") {
        dur.critHitCount = Math.floor(dur.hitCount * critBuffFrame.prob);
        dur.hitCount -= dur.critHitCount;
      } else if (buffList["tachr_2012_typhon_2"]) {
        dur.critHitCount = 1;  // 固定首次攻击
        dur.hitCount -= 1;
        log.writeNote("触发1次第二天赋")
      } else if (charId == "char_4015_spuria") {
        dur.hitCount = dur.attackCount - Math.floor(dur.attackCount * critBuffFrame.prob);
        if ((dur.attackCount - dur.hitCount - dur.critCount) % 2 == 1) {
          --dur.critCount;  // 剩余攻击次数调整为偶数，方便计算额外伤害
        }
        dur.critHitCount = dur.critCount;
      } else {
        dur.hitCount = (dur.attackCount - dur.critCount) * dur.times * ecount;
      }
    } else {
      dur.critCount = 0; dur.critHitCount = 0;
    }
  } else {
    dur.critCount = 0; dur.critHitCount = 0;
  }

  //console.log(finalFrame, dur);
  // 输出面板数据
  log.write("\n**【最终面板】**");
  let atk_line = `(${basicFrame.atk.toFixed(1)} + ${buffFrame.atk.toFixed(1)}) * ${buffFrame.atk_scale.toFixed(2)}`;
  // if (buffFrame.damage_scale != 1) { atk_line += ` * ${buffFrame.damage_scale.toFixed(2)}`; }
  log.write(`攻击力 / 倍率:  ${finalFrame.atk.toFixed(2)} = ${atk_line}`);
  log.write(`攻击间隔: ${finalFrame.baseAttackTime.toFixed(3)} s`);
  log.write(`攻速: ${finalFrame.attackSpeed} %`);
  log.write(`最终攻击间隔: ${(realAttackTime * 30).toFixed(2)} 帧, ${realAttackTime.toFixed(3)} s`);
  if (corr!=0) {
    log.write(`**帧数补正后攻击间隔: ${frame} 帧, ${frameAttackTime.toFixed(3)} s**`);
  } else {
    log.write(`**帧对齐攻击间隔: ${frame} 帧, ${frameAttackTime.toFixed(3)} s**`);
  }

  if (edef != enemy.def)
    log.write(`敌人防御: ${edef.toFixed(1)} (${(edef-enemy.def).toFixed(1)})`);
  if (emr != enemy.magicResistance) {
    rate = (emr-enemy.magicResistance)/enemy.magicResistance;
    log.write(`敌人魔抗: ${emr.toFixed(1)}% (${(rate*100).toFixed(1)}%)`);
  }
  if (ecount > 1 || enemy.count > 1)
    log.write(`目标数: ${ecount} / ${enemy.count}`);

  // 计算伤害
  log.write("\n**【伤害计算】**");
  log.write(`伤害类型: ${['物理','法术','治疗','真伤','护盾','元素','元素损伤'][damageType]}`);
  let dmgPrefix = (damageType == 2) ? "治疗" : "伤害";
  let hitDamage = finalFrame.atk;
  let critDamage = 0;
  let damagePool = [0, 0, 0, 0, 0, 0, 0, 0]; // 物理，魔法，治疗，真伤，盾，元素，元素损伤，元素治疗
  let extraDamagePool = [0, 0, 0, 0, 0, 0, 0, 0];
  let move = 0;

  function calculateHitDamage(frame, scale) {
    let minRate = 0.05, ret = 0;
    if (buffList["tachr_144_red_1"]) minRate = buffList["tachr_144_red_1"].atk_scale;
    if (buffList["tachr_366_acdrop_1"]) {
      minRate = options.cond ? buffList["tachr_366_acdrop_1"].atk_scale_2 : buffList["tachr_366_acdrop_1"].atk_scale;
    }
    if (damageType == 0)
      ret = Math.max(frame.atk - edef, frame.atk * minRate);
    else if (damageType == 1)
      ret = Math.max(frame.atk * (1-emrpct), frame.atk * minRate); 
    else 
      ret = frame.atk;
    if (ret <= frame.atk * minRate) log.write("[抛光]");
    if (scale != 1) { 
      ret *= scale;
      log.write(`攻击增伤: ${scale.toFixed(2)}x`);
    }
    return ret;
  }
  
  hitDamage = calculateHitDamage(finalFrame, buffFrame.damage_scale);
  damagePool[damageType] += hitDamage * dur.hitCount;
  log.write(`${dmgPrefix} ${hitDamage.toFixed(2)} * 命中 ${dur.hitCount.toFixed(1)} = ${(hitDamage * dur.hitCount).toFixed(1)} 直接${dmgPrefix}`);
  
  // 计算额外伤害
  // 暴击
  if (options.crit) {
    // console.log(critBuffFrame);
    if (blackboard.id == "skchr_peacok_2") {
      dur.critHitCount = 0;
      if (isSkill) {
        log.write(`创世纪 - 成功（暴击）为全体法术伤害`);
        damageType = 1;
        ecount = enemy.count;
        dur.critHitCount = enemy.count;
      }
    }
    edef = Math.max(0, ((enemy.def + critBuffFrame.edef) * critBuffFrame.edef_scale - critBuffFrame.edef_pene) * (1-critBuffFrame.edef_pene_scale) );
    if (edef != enemy.def)
      log.write(`[暴击]敌人防御: ${edef.toFixed(1)} (${(edef-enemy.def).toFixed(1)})`);
    critDamage = calculateHitDamage(critFrame, critBuffFrame.damage_scale);
    if (critDamage > 0 && dur.critHitCount > 0) {
      log.write(`暴击${dmgPrefix}: ${critDamage.toFixed(2)}, 命中 ${dur.critHitCount}`);
    }
    damagePool[damageType] += critDamage * dur.critHitCount;
  }
  // 空(被动治疗没有写在天赋中)
  if (["char_1012_skadi2", "char_101_sora", "char_4045_heidi"].includes(charId)) {
    let ratio_sora = 0.1;
    if (isSkill && blackboard.id == "skchr_skadi2_3")
      ratio_sora = 0;
    else if (isSkill && blackboard["attack@atk_to_hp_recovery_ratio"])
      ratio_sora = blackboard["attack@atk_to_hp_recovery_ratio"];
    extraDamagePool[2] = ratio_sora * finalFrame.atk * dur.duration * enemy.count;
    damagePool[2] = 0; damagePool[3] = 0; log.write("[特殊] 伤害为0 （以上计算无效），可以治疗召唤物");
    log.writeNote("可以治疗召唤物");
  }
  // 反射类-增加说明
  if (checkSpecs(blackboard.id, "reflect") && isSkill) {
    log.writeNote(`技能伤害为反射 ${dur.attackCount} 次的伤害`);
  }
  // 可变攻击力-重新计算
  if (checkSpecs(charId, "grad") || (checkSpecs(blackboard.id, "grad") && isSkill)) {
    if (blackboard.id == "skchr_kalts_3" && !options.token) {
      /* skip */
    } else {
      let kwargs = {
        charId, 
        skillId: blackboard.id,
        isSkill,
        options,
        basicFrame,
        buffFrame,
        finalFrame,
        buffList,
        blackboard,
        dur,
        attackTime,
        hitDamage,
        damageType,
        edef,
        ecount,
        emrpct,
        log
      };
      log.write("[特殊] 可变技能，重新计算伤害 ----");
      damagePool[damageType] = calculateGradDamage(kwargs);
    }
  }

  // 额外伤害
  for (var b in buffList) {
    let buffName = b;
    let bb = buffList[b];  // blackboard
    if (buffName == "skill") {
      buffName = bb.id;
    }
    let pool = [0, 0, 0, 0, 0, 0, 0, 0]; // *物理，*魔法，治疗，*真伤，盾，*元素伤害，元素损伤，元素治疗
    let damage = 0;
    let heal = 0, atk = 0;

    if (!isSkill) { // 只在非技能期间生效
      switch (buffName) {
        // 伤害
        case "skchr_ethan_1":
          pool[1] += bb["attack@poison_damage"] * dur.duration * (1-emrpct) * ecount;
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
        case "skchr_lin_1":
        case "skchr_lin_2":
        case "skchr_lin_3":
          damagePool[1] = 0;
          log.write(`[特殊] ${displayNames[buffName]}: 不普攻，伤害为0`);
          break;
        case "skchr_takila_1":
        case "skchr_takila_2":
        case "skchr_mlynar_1":
        case "skchr_mlynar_2":
        case "skchr_mlynar_3":
          damagePool[0] = damagePool[3] = 0;
          log.write(`[特殊] ${displayNames[buffName]}: 不普攻，伤害为0`);
          break;
        case "skcom_heal_up[3]":
          if (options.token) {
            damagePool[0] = damagePool[2] = 0;
            log.write(`[特殊] ${displayNames[buffName]}: 伤害/治疗为0 （以上计算无效）`);
          }
          break;
        case "skchr_silent_2":
          if (options.token) {
            damagePool[2] = 0;
            log.write(`[特殊] ${displayNames[buffName]}: 治疗为0 （以上计算无效）`);
          }
          break;
        case "skchr_ghost2_1":
        case "skchr_ghost2_2":
        case "skchr_ghost2_3":
          if (options.annie) {
            damagePool[1] = 0;
            log.write(`[特殊] ${displayNames[buffName]}: 伤害为0 （以上计算无效）`);
          }
          break;
        case "skchr_ironmn_1":
        case "skchr_ironmn_2":
          if (options.token) {
            damagePool[0] = 0;
            log.write("不普攻");
          }
        default:
          if (b=="skill") continue; // 非技能期间，跳过其他技能的额外伤害判定
      }
    }
    //console.log(buffName);
    switch (buffName) {
      case "tachr_129_bluep_1":
        damage = Math.max(bb.poison_damage * (1-emrpct), bb.poison_damage * 0.05) * buffFrame.damage_scale;
        let total_damage = damage * dur.duration * ecount;
        if (isSkill && blackboard.id == "skchr_bluep_1" && ecount>1) {
          let damage2 = damage * blackboard.atk_scale;
          total_damage = damage * dur.duration + damage2 * 3;
          log.write(`[特殊] ${displayNames["skchr_bluep_1"]}: 副目标毒伤 ${damage2} * 3s`);
        }
        pool[1] += total_damage;
        log.writeNote("毒伤按循环时间计算");
        break;
      case "tachr_293_thorns_1":
        var poison = options.thorns_ranged ? bb["damage[ranged]"] : bb["damage[normal]"];
        damage = Math.max(poison * (1-emrpct), poison * 0.05) * dur.duration * ecount * buffFrame.damage_scale;
        pool[1] = damage;
        if (isSkill) log.writeNote("毒伤按循环时间计算");
        break;
      case "tachr_346_aosta_1":
        var poison = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale;
        if (blackboard.id == "skchr_aosta_2") poison *= blackboard.talent_scale;
        log.write(`流血伤害/秒: ${poison.toFixed(1)}`);
        damage = Math.max(poison * (1-emrpct), poison * 0.05) * dur.duration * ecount * buffFrame.damage_scale;
        pool[1] = damage;
        if (isSkill) log.writeNote("毒伤按循环时间计算");
        break;
      case "tachr_181_flower_1":
        pool[2] += bb.atk_to_hp_recovery_ratio * finalFrame.atk * dur.duration * enemy.count;
        if (isSkill) log.writeNote("可以治疗召唤物");
        break;
      case "tachr_436_whispr_1":
        if (options.cond) {
          var ts = (blackboard.id == "skchr_whispr_2") ? blackboard.talent_scale : 1;
          var extra_hps = bb.atk_to_hp_recovery_ratio * finalFrame.atk * ts;
          pool[2] += extra_hps * dur.duration * enemy.count;
          log.write(`天赋hps: ${extra_hps.toFixed(1)}`); 
          if (isSkill) log.writeNote("天赋可以治疗召唤物");
        }
        break;
      case "tachr_188_helage_trait":
      case "tachr_337_utage_trait":
      case "tachr_475_akafyu_trait":
      case "tachr_1030_noirc2_trait":
        pool[2] += bb.value * dur.hitCount;
        break;
      case "tachr_485_pallas_2":
        pool[2] += bb.value * dur.hitCount;
        if ("pallas_e_t_2.value" in bb) {
          pool[2] += bb["pallas_e_t_2.value"] * dur.hitCount;
        }
        break;
      case "tachr_421_crow_trait":
      case "tachr_4066_highmo_trait":
      case "tachr_491_humus_trait":
        pool[2] += bb.value * dur.attackCount * Math.min(ecount, 2);
        break;
      case "tachr_1032_excu2_trait":
        let excu2_trait_ratio = (isSkill && blackboard.id == "skchr_excu2_3") ? blackboard.trait_ratio : 1;
        let block = (isSkill && blackboard.id == "skchr_excu2_2") ? 3 : 2;
        log.write(`特性倍率 ${excu2_trait_ratio}x`);
        pool[2] += bb.value * dur.attackCount * Math.min(ecount, block) * excu2_trait_ratio;
        break;
      case "tachr_2013_cerber_1":
        let cerber_t1_scale = bb.atk_scale;
        let cerber_t1_loss = 0;
        if ("max_atk_scale" in bb) {
          cerber_t1_scale = bb.max_atk_scale;
          cerber_t1_loss = 0.75;
        }  
        damage = cerber_t1_scale * edef * (1-emrpct) * buffFrame.damage_scale;
        let damage_loss = cerber_t1_loss * edef * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * dur.hitCount - damage_loss;
        log.write(`${displayNames[buffName]}: 额外法伤 ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        if (damage_loss)
          log.write(`叠层损失伤害: ${damage_loss.toFixed(1)} (75%防御)`);
        break;
      case "tachr_391_rosmon_trait":
      case "tachr_1027_greyy2_trait":
        var ntimes = 1;
        if (bb["attack@times"]) ntimes = bb["attack@times"] - 1;  // 迷迭香模组
        if (bb["attack@enable_third_attack"]) ++ntimes; // 格蕾伊模组
        if (isSkill && blackboard.id == "skchr_rosmon_2") ntimes += 2;
        var quake_atk = finalFrame.atk / buffFrame.atk_scale * bb["attack@append_atk_scale"];
        var quake_damage = Math.max(quake_atk - edef, quake_atk * 0.05) * buffFrame.damage_scale;
        
        damage = quake_damage * dur.hitCount * ntimes;
        log.write(`${displayNames[buffName]}: 余震攻击力 ${quake_atk.toFixed(1)}, 单次伤害 ${quake_damage.toFixed(1)}, 次数 ${ntimes}`);
        log.write(`${displayNames[buffName]}: 余震命中 ${dur.hitCount * ntimes}, 总伤害 ${damage.toFixed(1)}`);
        pool[0] += damage;
        break;
      // 技能
      // 伤害类
      case "skchr_ifrit_2":
        damage = basicFrame.atk * bb["burn.atk_scale"] * Math.floor(bb.duration) * (1-emrpct) * buffFrame.damage_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 灼烧伤害 ${damage.toFixed(1)}, 命中 ${ecount}`);
        pool[1] += damage * dur.attackCount * ecount;
        break;
      case "skchr_amgoat_2":
        damage = finalFrame.atk/2 * (1 - enemy.magicResistance / 100) * buffFrame.damage_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 溅射伤害 ${damage.toFixed(1)}, 命中 ${dur.attackCount * (enemy.count-1)}`);
        pool[1] += damage * dur.attackCount * (enemy.count-1);
        break;
      case "skchr_nightm_2":
        move = bb.duration / 4;
        log.writeNote(`以位移${move.toFixed(1)}格计算`);
        pool[3] += bb.value * move * ecount * buffFrame.damage_scale;
        break;
      case "skchr_weedy_3":
        if (options.token) {
          damagePool[0] = 0;
          log.writeNote("直接伤害请参照本体计算");
          move = bb.force*bb.force/3 + bb.duration / 5;
          damage = bb.value * move * ecount * buffFrame.damage_scale;
        } else {
          move = bb.force*bb.force/4 + bb.duration / 5;
          damage = bb.value * move * buffFrame.damage_scale;
          pool[3] += damage * ecount;
        }
        log.writeNote(`以位移${move.toFixed(1)}格计算`);
        log.writeNote(`位移真伤 ${damage.toFixed(1)}`);
        break;
      case "skchr_huang_3":
        let finishAtk = finalFrame.atk * bb.damage_by_atk_scale;
        damage = Math.max(finishAtk - enemy.def, finishAtk * 0.05) * buffFrame.damage_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 终结伤害 = ${damage.toFixed(1)}, 命中 ${ecount}`);
        pool[0] += damage * ecount;
        break;
      case "skchr_chen_2":
        damage = finalFrame.atk * (1 - emrpct) * buffFrame.damage_scale;
        pool[1] += damage * dur.hitCount;
        log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        break;
      case "skchr_bibeak_1":
        if (enemy.count > 1) {
          damage = finalFrame.atk * (1 - emrpct) * buffFrame.damage_scale;
          pool[1] += damage;
          log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}`);
        }
        break;
      case "skchr_ayer_2":
        damage = finalFrame.atk * bb.atk_scale * (1 - emrpct) * buffFrame.damage_scale;
        pool[1] += damage * enemy.count * dur.hitCount;
        log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${enemy.count * dur.hitCount}`);
        log.writeNote("假设断崖的当前攻击目标也被阻挡");
        break;
      case "skcom_charge_cost[1]":
      case "skcom_charge_cost[2]":
      case "skcom_charge_cost[3]":
      case "skcom_assist_cost[2]":
      case "skcom_assist_cost[3]":
      case "skchr_myrtle_2":
      case "skchr_elysm_2":
      case "skchr_skgoat_2":
      case "skchr_utage_1":
      case "skchr_snakek_2":
      case "skchr_blitz_1":
      case "skchr_robrta_2":
        damagePool[0] = 0; damagePool[1] = 0;
        log.write(`[特殊] ${displayNames[buffName]}: 伤害为0 （以上计算无效）`);
        break;
      case "skchr_zebra_1":
        damagePool[2] = 0;
        log.write(`[特殊] ${displayNames[buffName]}: 治疗为0 （以上计算无效）`);
        break;
      case "skchr_sddrag_2":
        damage = finalFrame.atk * bb["attack@skill.atk_scale"] * (1-emrpct) * buffFrame.damage_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        pool[1] += damage * dur.hitCount;
        break;
      case "skchr_haak_2":
      case "skchr_haak_3":
        log.writeNote(`攻击队友15次(不计入自身dps)`);
        break;
      case "skchr_podego_2":
        log.write(`[特殊] ${displayNames[buffName]}: 直接伤害为0 （以上计算无效）, 效果持续${bb.projectile_delay_time}秒`);
        damage = finalFrame.atk * bb.projectile_delay_time * (1-emrpct) * enemy.count * buffFrame.damage_scale;
        pool[1] = damage; damagePool[1] = 0;
        break;
      case "skchr_beewax_2":
      case "skchr_mint_2":
        if (isSkill) {
          damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * ecount * buffFrame.damage_scale;
          pool[1] = damage;
        } 
        break;
      case "skchr_tomimi_2":
        if (isSkill && options.crit) {
          damage = Math.max(finalFrame.atk - enemy.def, finalFrame.atk * 0.05) * buffFrame.damage_scale;
          log.write(`[特殊] ${displayNames[buffName]}: 范围伤害 ${damage.toFixed(1)}, 命中 ${dur.critHitCount * (enemy.count-1)}`);
          log.write(`[特殊] ${displayNames[buffName]}: 总共眩晕 ${(dur.critHitCount * bb["attack@tomimi_s_2.stun"]).toFixed(1)} 秒`)
          pool[0] += damage * dur.critHitCount * (enemy.count-1);
        }
        break;
      case "skchr_archet_1":
        atk = finalFrame.atk / bb.atk_scale * bb.atk_scale_2;
        let hit = Math.min(enemy.count-1, bb.show_max_target) * dur.hitCount;
        damage = Math.max(atk - enemy.def, atk * 0.05) * buffFrame.damage_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 分裂箭伤害 ${damage.toFixed(1)}, 命中 ${hit}`);
        pool[0] += damage * hit;
        break;
      case "skchr_archet_2":
        let n = Math.min(4, enemy.count-1);
        if (n>0) {
          let hit = (9-n)*n/2;
          log.write(`[特殊] ${displayNames[buffName]}: 弹射箭额外命中 ${hit} (${n} 额外目标)`);
          pool[0] += hitDamage * hit * dur.attackCount;
        }
        break;
      case "tachr_338_iris_trait":
      case "tachr_469_indigo_trait":
      case "tachr_4046_ebnhlz_trait":
      case "tachr_297_hamoni_trait":
          if (isSkill && ["skchr_iris_2", "skchr_ebnhlz_2"].includes(blackboard.id)) {} 
          else {
            let talent_key = charId.replace("char", "tachr") + "_1";
            // 倍率
            let scale = buffList[talent_key].atk_scale || 1;
            if (isSkill && blackboard.id == "skchr_ebnhlz_3")
              scale *= buffList.skill.talent_scale_multiplier;
            else if (charId == "char_297_hamoni")
              scale = 1;  // 第一天赋不是蓄力. 坑
            // 个数
            let nBalls = bb.times;
            if (talent_key == "tachr_4046_ebnhlz_1" && options.cond_elite)
              ++nBalls;
            // 伤害
            let extra_scale = 0;
            if ("tachr_4046_ebnhlz_2" in buffList && enemy.count == 1) {
              extra_scale = buffList["tachr_4046_ebnhlz_2"].atk_scale;
            }
            damage = hitDamage * (scale + extra_scale); // hitDamage已经包含了damage_scale和法抗
            let md = damage * nBalls + hitDamage * (1 + extra_scale);
            let delta = md - hitDamage * (1+extra_scale) * (1+nBalls);
            log.write(`[特殊] ${displayNames[buffName]}: 蓄力倍率 ${scale.toFixed(2)}, 每层伤害 ${damage.toFixed(1)}, 最大层数 ${nBalls}。
                       满蓄力+普攻伤害 ${md.toFixed(1)}, 比连续普攻多 ${delta.toFixed(1)}`);
            log.writeNote(`满蓄力伤害 ${md.toFixed(1)}`);
            if (isSkill) log.writeNote("DPS按满蓄力1次计算");
            pool[1] += delta;
          }
        break;
      case "skchr_ash_3":
        atk = finalFrame.atk / bb.atk_scale * (options.cond ? bb.hitwall_scale : bb.not_hitwall_scale);
        damage = Math.max(atk - enemy.def, atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * enemy.count;
        log.write(`[特殊] ${displayNames[buffName]}: 爆炸伤害 ${damage.toFixed(1)}, 命中 ${enemy.count}`);
        break;
      case "skchr_blitz_2":
        atk = finalFrame.atk * bb.atk_scale;
        damage = Math.max(atk - enemy.def, atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * enemy.count;
        log.write(`[特殊] ${displayNames[buffName]}: 范围伤害 ${damage.toFixed(1)}, 命中 ${enemy.count}`);
        break;
      case "skchr_rfrost_2":
        atk = finalFrame.atk / bb.atk_scale * bb.trap_atk_scale;
        damage = Math.max(atk - enemy.def, atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage;
        log.write(`[特殊] ${displayNames[buffName]}: 陷阱伤害 ${damage.toFixed(1)}`);
        break;
      case "skchr_tachak_1":
        atk = finalFrame.atk * bb.atk_scale;
        damage = Math.max(atk * (1-emrpct), atk * 0.05) * buffFrame.damage_scale;
        pool[1] += damage * bb.projectile_delay_time * enemy.count;
        log.write(`[特殊] ${displayNames[buffName]}: 燃烧伤害 ${damage.toFixed(1)}, 命中 ${bb.projectile_delay_time * enemy.count}`);
        break;
      case "skchr_pasngr_3":
        atk = finalFrame.atk * bb.atk_scale;
        damage = Math.max(atk * (1-emrpct), atk * 0.05) * buffFrame.damage_scale;
        pool[1] += damage * ecount * 8;
        log.write(`[特殊] ${displayNames[buffName]}: 雷击区域伤害 ${damage.toFixed(1)} (平均倍率 ${buffFrame.damage_scale.toFixed(2)}), 命中 ${8 * ecount}`);
        break;
      case "skchr_toddi_2":
        atk = finalFrame.atk / bb["attack@atk_scale"] * bb["attack@splash_atk_scale"];
        damage = Math.max(atk - enemy.def, atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * enemy.count * dur.hitCount;
        log.write(`[特殊] ${displayNames[buffName]}: 爆炸伤害 ${damage.toFixed(1)}, 命中 ${enemy.count * dur.hitCount}`);
        break;
      case "skchr_indigo_2":
        if (options.cond) {
          atk = finalFrame.atk * bb["indigo_s_2[damage].atk_scale"];
          damage = Math.max(atk * (1-emrpct), atk*0.05) * buffFrame.damage_scale;
          pool[1] += damage * enemy.count * dur.duration * 2;
          log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 ${damage.toFixed(1)}, 命中 ${enemy.count * dur.duration * 2}`);
          log.writeNote(`触发束缚伤害`);
        }
        break;
      case "tachr_426_billro_1":
        if (isSkill) {
          heal = bb.heal_scale * finalFrame.maxHp;
          if (options.charge) heal *= 2;
          pool[2] += heal;
        }
      case "tachr_486_takila_1":
        if (!isSkill) {
          damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
          log.writeNote(`技能未开启时反弹法伤最高为 ${damage.toFixed(1)}`);
        }
      break;
      case "tachr_437_mizuki_1":
        let scale = bb["attack@mizuki_t_1.atk_scale"];
        if (blackboard.id == "skchr_mizuki_1" && isSkill)
          scale *= buffList.skill.talent_scale;
        log.write(`法伤倍率: ${scale.toFixed(2)}x`);
        damage = finalFrame.atk / buffFrame.atk_scale * scale * (1-emrpct) * buffFrame.damage_scale;
        let nHit = bb["attack@max_target"];
        if (isSkill) {
          if (blackboard.id == "skchr_mizuki_2") nHit += 1;
          else if (blackboard.id == "skchr_mizuki_3") nHit += 2;
        }
        nHit = dur.attackCount * Math.min(ecount, nHit);
        pool[1] += damage * nHit;
        log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 ${damage.toFixed(1)}, 命中 ${nHit}`);
        break;
      case "tachr_1014_nearl2_1":
        let _scale = bb.atk_scale;
        let _nHit = options.cond ? 2 : 1;
        damage = finalFrame.atk * _scale * buffFrame.damage_scale;
        switch (blackboard.id) {
            case "skchr_nearl2_1":
                if (!isSkill)
                    log.writeNote(`本体落地伤害 ${damage.toFixed(1)}, 不计入总伤害`);
                break;
            case "skchr_nearl2_2":
                if (isSkill) {
                    pool[3] += damage * enemy.count * _nHit;
                    log.write(`[特殊] ${displayNames[buffName]}: 落地伤害 ${damage.toFixed(1)}, 命中 ${ecount*_nHit}`);
                }
                break;
            case "skchr_nearl2_3":
                if (!isSkill)
                    log.writeNote(`本体落地伤害 ${damage.toFixed(1)}, 不计入总伤害`);
                else {
                    _scale = buffList.skill.value;
                    damage = finalFrame.atk * _scale * buffFrame.damage_scale;
                    pool[3] += damage * enemy.count * _nHit;
                    log.write(`[特殊] ${displayNames[buffName]}: 落地伤害 ${damage.toFixed(1)}, 命中 ${ecount*_nHit}`);
                }
            break;
        }
        break;
      case "skchr_lmlee_2":
        let lmlee_2_scale = bb.default_atk_scale + bb.factor_atk_scale * bb.max_stack_cnt;
        damage = finalFrame.atk * lmlee_2_scale * (1-emrpct) * buffFrame.damage_scale;
        //pool[1] += damage * ecount;
        log.write(`[特殊] ${displayNames[buffName]}: 满层数爆炸伤害 ${damage.toFixed(1)}, 命中 ${ecount}`);
        log.writeNote(`满层数爆炸伤害 ${damage.toFixed(1)}`);
        break;
      case "uniequip_002_rope":
      case "uniequip_002_slchan":
      case "uniequip_002_snsant":
      case "uniequip_002_glady":
        if (isSkill) {
          let force = buffList.skill.force || buffList.skill["attack@force"];
          move = force+1;
          log.writeNote(`以位移${move}格计算`);
          pool[1] += bb.trait.value * move * (1-emrpct) * ecount * buffFrame.damage_scale;
        }
        break;
      // 间接治疗
      case "skchr_tiger_2":
        pool[2] += damagePool[1] * bb.heal_scale; break;
      case "skchr_strong_2":
        pool[2] += damagePool[0] * bb.scale; break;
      case "skcom_heal_self[1]":
      case "skcom_heal_self[2]":
        damagePool[2] = 0;
        // console.log(finalFrame);
        pool[2] += bb.heal_scale * finalFrame.maxHp; break;
      case "skchr_nightm_1":
        damage = finalFrame.atk * bb["attack@heal_scale"];
        pool[2] += damage * dur.hitCount * Math.min(enemy.count, bb["attack@max_target"]); 
        log.writeNote("以攻击力计算治疗量，而非伤害");
        break;
      case "tachr_1024_hbisc2_trait":
      case "tachr_1020_reed2_trait":
        pool[2] += damagePool[1] * bb.scale; break;
      case "skchr_folnic_2":
        pool[2] += bb["attack@heal_scale"] * finalFrame.atk / buffFrame.atk_scale * dur.hitCount; break;
      case "skchr_breeze_2":
        damage = finalFrame.atk/2 ;
        log.write(`[特殊] ${displayNames[buffName]}: 溅射治疗 ${damage.toFixed(1)}, 命中 ${dur.attackCount * (enemy.count-1)}`);
        pool[2] += damage * dur.attackCount * (enemy.count-1);
        break;
      case "skchr_ccheal_1":
        heal = finalFrame.atk * bb.heal_scale * bb.duration * dur.duration / attackTime;  // 乘以技能次数
        log.write(`[特殊] ${displayNames[buffName]}: HoT ${heal.toFixed(1)}`);
        pool[2] += heal;
        break;
      case "skchr_ccheal_2":
        heal = finalFrame.atk * bb.heal_scale * bb.duration;
        log.write(`[特殊] ${displayNames[buffName]}: HoT ${heal.toFixed(1)}, 命中 ${enemy.count}`);
        pool[2] += heal * enemy.count;
        break;
      case "skchr_shining_2":
      case "skchr_tuye_1":
        heal = finalFrame.atk * bb.atk_scale * dur.attackCount;
        log.write(`[特殊] ${displayNames[buffName]}: 护盾量 ${heal}`);
        pool[4] += heal;
        break;
      case "skchr_cgbird_2":
        heal = finalFrame.atk * bb.atk_scale * dur.attackCount;
        log.write(`[特殊] ${displayNames[buffName]}: 护盾量 ${heal}, 命中 ${ecount}`);
        pool[4] += heal * ecount;
        break;
      case "skchr_tknogi_2":
      case "skchr_lisa_3":
        heal = finalFrame.atk * bb["attack@atk_to_hp_recovery_ratio"] * enemy.count * (dur.duration-1);
        log.write(`[特殊] ${displayNames[buffName]}: HoT ${heal.toFixed(1)}，可以治疗召唤物`);
        log.writeNote("可以治疗召唤物");
        pool[2] += heal;
        damagePool[2] = 0; log.write("[特殊] 直接治疗为0");
        break;
      case "skchr_blemsh_1":
        heal = finalFrame.atk * bb.heal_scale * buffFrame.heal_scale / buffFrame.atk_scale;
        pool[2] += heal;
        break;
      case "skchr_blemsh_2":
        heal = finalFrame.atk * bb["attack@atk_to_hp_recovery_ratio"] / buffFrame.atk_scale;
        log.write(`每秒单体治疗: ${heal.toFixed(1)}`);
        log.writeNote("可以治疗召唤物");
        pool[2] += heal * (dur.duration + dur.prepDuration) * enemy.count;
        break;
      case "skchr_blemsh_3":
        damage = finalFrame.atk * bb["attack@blemsh_s_3_extra_dmg[magic].atk_scale"];
        damage = Math.max(damage * (1-emrpct), damage * 0.05) * buffFrame.damage_scale;
        heal = finalFrame.atk / buffFrame.atk_scale * bb.heal_scale * buffFrame.heal_scale;
        log.write(`每次攻击额外法伤：${damage.toFixed(1)} （计算天赋加成），额外治疗: ${heal.toFixed(1)}`);
        pool[1] += damage * dur.attackCount;
        pool[2] += heal * dur.attackCount;
        break;
      case "skchr_rosmon_1":
        damage = finalFrame.atk * bb.extra_atk_scale;
        damage = Math.max(damage * (1-emrpct), damage * 0.05) * dur.hitCount * buffFrame.damage_scale;
        pool[1] += damage;
        log.write(`${displayNames[buffName]}: 法术伤害 ${damage.toFixed(1)}`);
        break;
      case "skchr_kirara_1":
        damage = finalFrame.atk * bb["kirara_s_1.atk_scale"];
        damage = Math.max(damage * (1-emrpct), damage * 0.05) * dur.hitCount * buffFrame.damage_scale;
        pool[1] += damage;
        log.write(`${displayNames[buffName]}: 法术伤害 ${damage.toFixed(1)}`);
        break;
      case "skchr_amiya2_2":
        var arts_atk = finalFrame.atk * bb.atk_scale;
        var real_atk = finalFrame.atk * bb.atk_scale_2;
        var arts_dmg = Math.max(arts_atk * (1-emrpct), arts_atk * 0.05);
        log.write(`[斩击] 法术伤害 ${arts_dmg.toFixed(1)}, 命中 9, 真实伤害 ${real_atk.toFixed(1)}, 命中 1`);
        pool[1] += arts_dmg * 9;
        pool[3] += real_atk;
        break;
      case "skchr_kafka_1":
        log.write(`[特殊] ${displayNames[buffName]}: 直接伤害为0 （以上计算无效）, 效果持续${bb.duration}秒`);
        damage = finalFrame.atk * (1-emrpct) * enemy.count * buffFrame.damage_scale;
        pool[1] = damage; damagePool[1] = 0;
        break;
      case "skchr_kafka_2":
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * enemy.count * buffFrame.damage_scale;
        pool[1] = damage;
        break;
      case "skchr_tuye_2":
        pool[2] = finalFrame.atk * bb.heal_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 瞬间治疗 ${pool[2].toFixed(1)}, 最多3次`);
        log.writeNote(`瞬间治疗量 ${pool[2].toFixed(1)}`);
        pool[2] *= 3;
        break;
      case "skchr_nothin_1":
      case "skchr_nothin_2":
        let a = finalFrame.atk * buffList["tachr_455_nothin_1"].atk_scale;
        damage = Math.max(a - edef, a * 0.05) * buffFrame.damage_scale;
        log.writeNote(`首次攻击伤害 ${damage.toFixed(1)}`);
        break;
      case "skchr_heidi_1":
      case "skchr_heidi_2":
      case "skchr_skadi2_2":
      case "skchr_sora_2":
        if (bb.max_hp) {
          var buff_hp = finalFrame.maxHp * bb.max_hp;
          log.writeNote(`队友HP增加 ${buff_hp.toFixed(1)}`);
        }
        if (bb.def) {
          var buff_def = finalFrame.def * bb.def;
          log.writeNote(`队友防御力增加 ${buff_def.toFixed(1)}`);
        }
        if (bb.atk) {
          var buff_atk = finalFrame.atk * bb.atk;
          log.writeNote(`队友攻击力增加 ${buff_atk.toFixed(1)}`);
        }
        break;
      case "skchr_skadi2_3":
        var buff_atk = finalFrame.atk * bb.atk;
        damage = finalFrame.atk * bb.atk_scale * buffFrame.damage_scale;
        pool[3] += damage * enemy.count * dur.duration;
        log.writeNote(`队友攻击力增加 ${buff_atk.toFixed(1)}`);
        log.writeNote(`每秒真实伤害 ${damage.toFixed(1)}, 总伤害 ${pool[3]}`);
        log.writeNote(`叠加海嗣时真伤x2，不另行计算`);
        break;
      case "skchr_mizuki_3":
        if (ecount < 3) {
          damage = bb["attack@hp_ratio"] * finalFrame.maxHp;
          log.writeNote(`目标数<3，自身伤害 ${damage.toFixed(1)}`);
          pool[2] -= damage * dur.attackCount;
        }
        break;
      case "tachr_473_mberry_trait":
      case "tachr_449_glider_trait":
      case "tachr_4041_chnut_trait":
      case "tachr_1016_agoat2_trait":
        let ep_ratio = bb.ep_heal_ratio;
        let ep_scale = 1;
        if (isSkill) {
          switch (blackboard.id) {
            case "skchr_mberry_1":
              ep_ratio = buffList.skill.ep_heal_ratio;
              break;
            case "skchr_glider_1":
              ep_ratio = buffList.skill["glider_s_1.ep_heal_ratio"];
              ep_scale = 3;
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
        log.write(`元素治疗系数: ${ep_ratio.toFixed(2)}x`);
        if (ep_scale != 1)
          log.write(`元素治疗倍率: ${ep_scale.toFixed(2)}x`);

        damage = finalFrame.atk / buffFrame.heal_scale * ep_ratio * ep_scale;
        if (isSkill && blackboard.id == "skchr_agoat2_3")
            damage *= buffFrame.heal_scale; // 仅纯艾3受直接治疗系数影响

        let ep_total = damage * dur.hitCount;
       // log.writeNote(`元素治疗 ${damage.toFixed(1)} (${(ep_ratio*ep_scale).toFixed(2)} x)`);
        if (isSkill && blackboard.id == "skchr_glider_1")
          log.writeNote(`技能元素HPS ${(ep_total / (dur.attackCount*3)).toFixed(1)}`);
        pool[7] += ep_total;
        break;
      case "skchr_sleach_2":
        damagePool[0] = 0; damagePool[1] = 0; damagePool[2] = 0;
        log.write("伤害为0（以上计算无效）");
        pool[2] += finalFrame.atk * bb.atk_to_hp_recovery_ratio * dur.duration;
        log.writeNote("可以治疗召唤物");
        break;
      case "skchr_sleach_3":
        damagePool[0] = 0; damagePool[1] = 0; damagePool[2] = 0;
        log.write("伤害为0（以上计算无效）");
        damage = Math.max(finalFrame.atk - edef, finalFrame.atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * ecount;
        log.write(`摔炮伤害 ${damage.toFixed(1)} (damage_scale=${buffFrame.damage_scale.toFixed(3)}), 命中 ${ecount}`);
        break;
      case "skchr_gnosis_1":
        var scale_mul_g1 = (options.freeze ?
                          1 : buffList["tachr_206_gnosis_1"].damage_scale_freeze / buffList["tachr_206_gnosis_1"].damage_scale_cold);
        damage = finalFrame.atk * (1 - emrpct) * buffFrame.damage_scale * scale_mul_g1;
        pool[1] += damage * dur.hitCount;
        log.write(`冻结伤害 ${damage.toFixed(1)} (damage_scale=${(buffFrame.damage_scale * scale_mul_g1).toFixed(2)}), 命中 ${dur.hitCount}`);
        break;
      case "skchr_gnosis_3":
        var scale_mul_g3 = (options.freeze ?
                         1 : buffList["tachr_206_gnosis_1"].damage_scale_freeze / buffList["tachr_206_gnosis_1"].damage_scale_cold);
        damage = finalFrame.atk * (1 - emrpct) * bb.atk_scale * buffFrame.damage_scale * scale_mul_g3;
        pool[1] += damage * ecount;
        log.write(`终结伤害 ${damage.toFixed(1)} (damage_scale=${(buffFrame.damage_scale * scale_mul_g3).toFixed(2)}), 命中 ${ecount}, 按冻结计算`);
        break;
      case "skchr_ling_3":
        if (options.token) {
          log.writeNote("不计算范围法伤");
          log.writeNote("(去掉“计算召唤物数据”才能计算范围伤害)");
        } else {
          damage = finalFrame.atk * (1-emrpct) * bb.atk_scale * buffFrame.damage_scale;
          pool[1] += damage * ecount * dur.duration * 2;
          log.writeNote(`召唤物范围法术伤害 ${damage.toFixed(1)*2}/s`);
        }
        break;
      case "tachr_377_gdglow_1":
        if (dur.critHitCount > 0 && isSkill) {
          damage = finalFrame.atk * (1-emrpct) * bb["attack@atk_scale_2"] * buffFrame.damage_scale;
          var funnel = checkSpecs(blackboard.id, "funnel") || 1;
          pool[1] += damage * enemy.count * funnel * dur.critHitCount;
          log.writeNote(`爆炸 ${dur.critHitCount*funnel} 次, 爆炸伤害 ${damage.toFixed(1)}`);
        }
        break;
      case "skchr_bena_1":
      case "skchr_bena_2":
        if (options.annie && isSkill) {
          damagePool[0] = 0; damagePool[1] = 0;
        }
        break;
      case "skchr_kazema_1":
        if (options.annie) {
          let kazema_scale = buffList["tachr_4016_kazema_1"].damage_scale;
          if ("uniequip_002_kazema" in buffList && 
              "damage_scale" in buffList["uniequip_002_kazema"].talent &&
              !options.token)
            kazema_scale = buffList["uniequip_002_kazema"].talent.damage_scale;
          damage = finalFrame.atk / buffFrame.atk_scale * kazema_scale
                  * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage * ecount;
          log.writeNote(`替身落地法伤 ${damage.toFixed(1)} (${kazema_scale.toFixed(2)}x)，命中 ${ecount}`);
          if (isSkill) {
            damagePool[0] = 0; damagePool[1] = 0;
          }
        }
        break;
      case "skchr_kazema_2":
        let kazema_scale = buffList["tachr_4016_kazema_1"].damage_scale;
        let kz_name = "[纸偶]";
        let kz_invalid = false;
        if (options.annie) {
          kz_name = "[替身]";
          if ("uniequip_002_kazema" in buffList && 
              "damage_scale" in buffList["uniequip_002_kazema"].talent &&
              !options.token)
            kazema_scale = buffList["uniequip_002_kazema"].talent.damage_scale;
        } else if (!options.token) {
          log.writeNote("落地伤害需要勾选\n[替身]或[召唤物]进行计算");
          kz_invalid = true;
        }
        if (!kz_invalid) {
          damage = finalFrame.atk * kazema_scale * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage * ecount;
          
          log.writeNote(`${kz_name}落地法伤 ${damage.toFixed(1)} (${kazema_scale.toFixed(2)}x)，命中 ${ecount}`);
        }
        if (options.annie && isSkill) {
          damagePool[0] = 0; damagePool[1] = 0;
        }
        break;
      case "skchr_phenxi_2":
        var ph_2_atk = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale_2;
        damage = Math.max(ph_2_atk - edef, ph_2_atk*0.05) * buffFrame.damage_scale;
        pool[0] += damage * 2 * dur.hitCount;
        log.writeNote(`子爆炸伤害 ${damage.toFixed(1)}\n以2段子爆炸计算`);
        break;
      case "skchr_horn_2":
        if (options.overdrive_mode) {
          damage = finalFrame.atk / bb["attack@s2.atk_scale"] * bb["attack@s2.magic_atk_scale"]
                 * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage * dur.hitCount;
          log.write(`法术伤害 ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        }
        break;
      case "skchr_horn_3":
        if (options.overdrive_mode && !options.od_trigger) {
          var horn_3_pct = dur.duration * (dur.duration-0.2) / 2; // 0.4, 1.4,...,11.4
          damage = finalFrame.maxHp * horn_3_pct / 100;
          pool[2] -= damage;
          log.writeNote(`生命流失 ${damage.toFixed(1)}`);
        }
        break;
      case "skcom_heal_up[3]":
        if (options.token) {
          damagePool[0] = damagePool[2] = 0;
          log.write(`[特殊] ${displayNames[buffName]}: 伤害/治疗为0 （以上计算无效）`);
        }
        break;
      case "skchr_irene_3":
        var irene_3_edef = Math.max(0, (enemy.def - enemyBuffFrame.edef_pene) * (1-buffList["tachr_4009_irene_1"].def_penetrate));
        var irene_3_atk = finalFrame.atk / buffFrame.atk_scale * bb.multi_atk_scale;
        damage = Math.max(irene_3_atk - irene_3_edef, irene_3_atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * bb.multi_times * ecount;
        log.write(`[特殊] ${displayNames[buffName]} 额外伤害-敌人防御 ${irene_3_edef.toFixed(1)}`);
        log.write(`[特殊] ${displayNames[buffName]} 轰击伤害 ${damage.toFixed(1)} 命中 ${bb.multi_times * ecount}`);
        break;
      case "skchr_lumen_1":
        heal = finalFrame.atk * bb["aura.heal_scale"];
        var lumen_1_hitcount = bb["aura.projectile_life_time"] * dur.attackCount * enemy.count;
        log.write(`[特殊] ${displayNames[buffName]}: HoT ${heal.toFixed(1)}/s, 命中 ${lumen_1_hitcount}`);
        pool[2] += heal * lumen_1_hitcount;
        break;
      case "skchr_ghost2_3":
        if (isSkill && !options.annie) {
          if (options.cond) {
            var ghost2_3_atk = finalFrame.atk * bb["attack@atk_scale_ex"];
            damage = Math.max(ghost2_3_atk - edef, ghost2_3_atk * 0.05) * buffFrame.damage_scale;
            pool[0] += damage * dur.hitCount;
            log.write(`[特殊] ${displayNames[buffName]} 额外伤害 ${damage.toFixed(1)} 命中 ${dur.hitCount}`);
          } else {
            damage = finalFrame.maxHp * bb["attack@hp_ratio"];
            pool[2] -= damage * dur.hitCount;
          }
        }
        break;
      case "skchr_pianst_2":
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * enemy.count;
        log.write(`[特殊] ${displayNames[buffName]} 额外伤害 ${damage.toFixed(1)} 命中 ${enemy.count}`);
        break;
      case "tachr_4047_pianst_1":
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        log.writeNote(`反弹伤害 ${damage.toFixed(1)}, 不计入DPS`);
        break;
      case "tachr_4046_ebnhlz_2":
        if (enemy.count == 1) {
          damage = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage * dur.hitCount;
          log.write(`[特殊] ${displayNames[buffName]} 额外伤害 ${damage.toFixed(1)} 命中 ${dur.hitCount}`);
        } else if (enemy.count > 1 && "atk_scale_2" in bb) {
          damage = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale_2 * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage * dur.attackCount * (enemy.count - 1);
          log.write(`[特殊] ${displayNames[buffName]} 额外伤害 ${damage.toFixed(1)} 命中 ${dur.attackCount * (enemy.count-1)}`);
        }
        break;
      case "skchr_greyy2_2":
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        let greyy2_2_count = bb.projectile_delay_time / bb.interval;
        pool[1] += damage * greyy2_2_count * enemy.count;
        damagePool[1] = 0;
        extraDamagePool[0] = 0;
        log.write(`[特殊] ${displayNames[buffName]}: 直接伤害为0 （以上计算无效）`);
        log.write(`[特殊] ${displayNames[buffName]}: 额外伤害 ${damage.toFixed(1)} 命中 ${enemy.count * greyy2_2_count}`);
        break;
      case "skchr_gvial2_1":
        let gvial2_scale = 1;
        if ("tachr_1026_gvial2_2" in buffList)
          gvial2_scale = (options.cond ? buffList["tachr_1026_gvial2_2"].heal_scale_2 : buffList["tachr_1026_gvial2_2"].heal_scale_1);
        pool[2] = damagePool[0] * bb.heal_scale * gvial2_scale;
        log.write(`治疗倍率: ${bb.heal_scale} * ${gvial2_scale.toFixed(2)}`);
        break;
      case "skchr_provs_2":
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * enemy.count;
        log.write(`[特殊] ${displayNames[buffName]}: 额外伤害 ${damage.toFixed(1)} 命中 ${enemy.count}`);
        break;
      case "tachr_4064_mlynar_2":
        let mlynar_t2_scale = bb.atk_scale;
        if (isSkill && blackboard.id == "skchr_mlynar_3") {
          mlynar_t2_scale += buffList.skill.atk_scale;
          log.writeNote("额外真伤对反弹也生效");
        }
        damage = finalFrame.atk / buffFrame.atk_scale * mlynar_t2_scale * buffFrame.damage_scale;
        log.write(`反弹伤害 ${damage.toFixed(1)}`);
        if (isSkill) log.writeNote(`反弹伤害 ${damage.toFixed(1)}`);
        break;
      case "skchr_mlynar_3":
        if (isSkill) {
          damage = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale * buffFrame.damage_scale;
          pool[3] += damage * dur.hitCount;
          log.write(`[特殊] ${displayNames[buffName]}: 额外伤害 ${damage.toFixed(1)} 命中 ${dur.hitCount}`);
        }
        break;
      case "skchr_lolxh_2":
        if (isSkill && options.cond) {
          let lolxh_2_edef = Math.max(0, edef - bb["attack@def_penetrate_fixed"]);
          damage = Math.max(finalFrame.atk-lolxh_2_edef, finalFrame.atk * 0.05) * buffFrame.damage_scale;
          log.write(`[特殊] ${displayNames[buffName]}: 额外攻击伤害 ${damage.toFixed(1)} 命中 ${dur.hitCount}`);
          log.writeNote("半血敌人");
          pool[0] += damage * dur.hitCount;
        }
        break;
      case "tachr_117_myrrh_1":
        if (!isSkill) {
          heal = finalFrame.atk * bb.heal_scale;
          pool[2] += heal * enemy.count;
          log.write(`[特殊] ${displayNames[buffName]}: 瞬发治疗 ${heal.toFixed(1)} 命中 ${enemy.count}`);
        }
      case "skchr_qanik_2":
          let qanik_2_damage_scale = options.cond ? buffFrame.damage_scale / buffList["tachr_466_qanik_1"].damage_scale
                                                  : buffFrame.damage_scale;
          damage = finalFrame.atk / buffFrame.atk_scale * bb.critical_damage_scale * (1-emrpct) * qanik_2_damage_scale;
          pool[1] += damage * ecount * enemy.count;
          log.write(`[特殊] ${displayNames[buffName]}: 落地伤害 ${damage.toFixed(1)}（不享受法术脆弱）`);
          log.write(`落地伤害倍率 ${qanik_2_damage_scale.toFixed(2)}x，命中 ${ecount*enemy.count}`);
        break;
      case "tachr_157_dagda_2":
        if (options.cond) {
          pool[2] += damagePool[0] * bb.heal_scale;
        }
        break;
      case "skchr_dagda_1":
        let dagda_1_atk = finalFrame.atk * bb["attack@defensive_atk_scale"];
        damage = Math.max(dagda_1_atk - enemy.def, dagda_1_atk*0.05)*buffFrame.damage_scale;
        log.writeNote(`反击伤害 ${damage.toFixed(1)}/不计入dps`);
        break;  
      case "skchr_judge_1":
        damage = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale_2 * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * dur.hitCount;
        log.write(`法术伤害 ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        break;
      case "tachr_4065_judge_1":
        let judge_shield_1 = finalFrame.maxHp * bb.born_hp_ratio;
        let judge_shield_2 = finalFrame.maxHp * bb.kill_hp_ratio;
        if (isSkill) {
          if (blackboard.id == "skchr_judge_2")
            judge_shield_2 *= (1 + buffList.skill.shield_scale);
          log.writeNote(`初始护盾 ${judge_shield_1.toFixed(1)}`);
          log.writeNote(`技能击杀护盾 ${judge_shield_2.toFixed(1)}`);
        }
        break;
      case "tachr_4065_judge_2":
        damage = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        if (isSkill) log.writeNote(`反弹伤害 ${damage.toFixed(1)}`);
        break;
      case "skchr_texas2_1":
        let texas2_s1_dur = dur.duration + bb["attack@texas2_s_1[dot].duration"] - 1;
        damage = bb["attack@texas2_s_1[dot].dot_damage"] * (1-emrpct) * buffFrame.damage_scale;
        log.write(`持续法伤 ${damage.toFixed(1)}, 按持续 ${texas2_s1_dur.toFixed(1)}s计算`);
        pool[1] += damage * texas2_s1_dur;
        break;
      case "skchr_texas2_2":
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * enemy.count;
        log.write(`落地法伤 ${damage.toFixed(1)}, 命中 ${enemy.count}`);
        break;
      case "skchr_texas2_3":
        let texas2_s3_aoe = finalFrame.atk * bb["appear.atk_scale"] * (1-emrpct) * buffFrame.damage_scale;
        let texas2_s3_target = Math.min(enemy.count, bb.max_target);
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += texas2_s3_aoe * enemy.count * 2 + damage * texas2_s3_target * dur.duration;
        log.write(`落地法伤 ${texas2_s3_aoe.toFixed(1)}, 命中 ${enemy.count * 2}`);
        log.write(`剑雨法伤 ${damage.toFixed(1)}, 命中 ${texas2_s3_target * dur.duration}`);
        break;
      case "skchr_vigil_2":
        if (options.token) {
          pool[2] += finalFrame.maxHp * bb["vigil_wolf_s_2.hp_ratio"];
        }
        break;
      case "skchr_vigil_3":
        if (options.cond || options.token) {
          // 计算本体属性。狼的法伤不享受特性加成
          let vigil_final_atk = finalFrame.atk;
          if (options.token) {
            let token_id = charAttr.char.charId;
            charAttr.char.charId = "char_427_vigil";
            let vigil = getAttributes(charAttr.char, new NoLog());
            let vigil_final = getBuffedAttributes(vigil.basic, buffFrame);
            charAttr.char.charId = token_id;
          // console.log(vigil_final);
            vigil_final_atk = vigil_final.atk;
            if (!options.cond) {
              log.writeNote("必定满足阻挡条件");
            }
          }
          damage = vigil_final_atk * bb["attack@vigil_s_3.atk_scale"] * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage * dur.hitCount;
          log.write(`额外法伤 ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        }
        break;
      case "skchr_ironmn_1":
        if (!options.token) {
          let ironmn_s1_atk = 12 * bb.fake_scale;
          log.writeNote(`常态加攻+12%, 技能加攻+${ironmn_s1_atk}%`);
        } else {
          damagePool[0] = 0;
          log.writeNote("召唤物结果无效");
        }
        break;
      case "skchr_ironmn_2":
        if (!options.token) {
          let ironmn_s2_skill_hp = 24;  // 30s * 0.8%/s
          let ironmn_s2_normal_time = (100 - ironmn_s2_skill_hp*2) / 0.4;
          let ironmn_s2_skill_sp = Math.floor(ironmn_s2_skill_hp / bb.fake_interval / 0.8);
          let ironmn_s2_normal_sp = Math.floor(ironmn_s2_normal_time / 3.5 / 0.8);
          log.writeNote(`以开2次技能计算`);
          log.writeNote(`技能恢复SP: ${ironmn_s2_skill_sp} / 30s`);
          log.writeNote(`常态恢复SP: ${ironmn_s2_normal_sp} / ${ironmn_s2_normal_time}s`);
        } else {
          damagePool[0] = 0;
        }
        break;
      case "sktok_ironmn_pile3":
        let pile3_atk = finalFrame.atk / 2;
        if (enemy.count > 1) {
          damage = Math.max(pile3_atk - edef, pile3_atk * 0.05)* buffFrame.damage_scale;
          log.write(`范围伤害 ${damage.toFixed(1)}, 命中 ${(enemy.count-1) * dur.hitCount}`);
          pool[0] += damage * (enemy.count-1) * dur.hitCount;
        }
        if (isSkill) {
          log.writeNote("技能/普攻伤害分别为");
          log.writeNote("白铁开/关技能时的召唤物伤害");
        }
        break;
      case "skchr_reed2_2":
        if (isSkill) {
          damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
          heal = damage * buffList["tachr_1020_reed2_trait"].scale;
          let reed2_interval = options.reed2_fast ? 1.567 : 0.8;
          let reed2_hitCount = Math.ceil((dur.duration - 0.167) / reed2_interval); // 减去抬手时间

          if (options.reed2_fast) {
            log.writeNote("理想情况, 火球立即引爆");
            log.writeNote(`每${reed2_interval}s命中三个火球`);
            reed2_hitCount = Math.ceil((dur.duration - 0.167) / reed2_interval) * 3;
          } else {
            log.writeNote(`每${reed2_interval}s命中一个火球`);
          }
          if (options.rosmon_double) {
            log.writeNote("计算两组火球伤害");
            reed2_hitCount *= 2;
          }
          log.write(`火球伤害 ${damage.toFixed(1)}, 治疗 ${heal.toFixed(1)}, 命中 ${reed2_hitCount}`);
          pool[1] += damage * reed2_hitCount;
          pool[2] += heal * reed2_hitCount;
         }
        break;
      case "skchr_reed2_3":
        damage = finalFrame.atk * bb["talent@s3_atk_scale"] * (1-emrpct) * buffFrame.damage_scale;
        let reed2_boom_damage = finalFrame.atk * bb["talent@aoe_scale"] * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * dur.duration * ecount;
        log.write(`灼痕伤害 ${damage.toFixed(1)}, 命中 ${dur.duration * ecount}`);
        log.writeNote(`爆炸伤害 ${reed2_boom_damage.toFixed(1)}, 半径1.7`);
        break;
      case "skchr_puzzle_2":
        damage = finalFrame.atk * bb["attack@atk_scale_2"] * (1-emrpct) * buffFrame.damage_scale;
        let puzzle_hitCount = 15 * 10 + 6 * (dur.attackCount - 10);
        let puzzle_hitCount_skill = 55;
        pool[1] += damage * puzzle_hitCount_skill;
        log.writeNote("法伤按8s/60跳估算");
        log.writeNote(`总法伤 ${(damage * puzzle_hitCount).toFixed(1)}/${puzzle_hitCount}跳估算`);
        break;
      case "skchr_hamoni_2":
        damage = bb.damage_value * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * dur.duration * enemy.count;
        log.write(`范围伤害 ${damage.toFixed(1)}, 命中 ${dur.duration * enemy.count}`);
        break;
      case "tachr_197_poca_1":
        if (options.cond && "extra_atk_scale" in bb) {
          let poca_t1_atk = finalFrame.atk * bb.extra_atk_scale;
          damage = Math.max(poca_t1_atk - edef, poca_t1_atk * 0.05) * buffFrame.damage_scale;
          log.write(`额外伤害 ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
          pool[0] += damage * dur.hitCount;
        }
        break;
      case "skchr_firwhl_1":
        damage = finalFrame.atk / buffFrame.atk_scale * bb["burn.atk_scale"] * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * bb.burn_duration * ecount;
        break;
      case "skchr_firwhl_2":
        let firwhl_burn_time = dur.duration + bb.projectile_life_time - 1;
        damage = finalFrame.atk * bb["attack@burn.atk_scale"] * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * firwhl_burn_time * ecount;
        log.writeNote(`燃烧时间以${firwhl_burn_time.toFixed(1)}s计算`);
        log.write(`燃烧伤害 ${damage.toFixed(1)}, 命中 ${firwhl_burn_time * ecount}`);
        break;
      case "tachr_4080_lin_1":
        damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
        log.writeNote(`破壁伤害 ${damage.toFixed(1)}`);
        let lin_shield = bb.value;
        if (blackboard.id == "skchr_lin_3" && isSkill)
          lin_shield *= buffList["skill"].talent_scale;
        log.writeNote(`琉璃璧抵挡伤害 ${lin_shield.toFixed(1)}`);
        break;
      case "skchr_chyue_2":
        // 第一段aoe, 不计第一天赋
        if (enemy.count > 1) {
          let chyue_t1_scale = options.cond ? buffList["tachr_2024_chyue_1"].damage_scale : 1;
          damage = Math.max(finalFrame.atk * 0.05, finalFrame.atk - edef) * buffFrame.damage_scale / chyue_t1_scale;
          let chyue_s2_hitc = Math.min(enemy.count - 1, bb.max_target - 1);
          pool[0] += damage * chyue_s2_hitc;
          log.write(`范围伤害 ${damage.toFixed(1)} (不计第一天赋), 命中 ${chyue_s2_hitc}`);
        }
        // 第二段伤害，只计算主目标
        if (options.cond) {
          let chyue_s2_atk = finalFrame.atk / bb.atk_scale * bb.atk_scale_down;
          damage = Math.max(chyue_s2_atk * 0.05, chyue_s2_atk - edef) * buffFrame.damage_scale;
          log.write(`落地伤害 ${damage.toFixed(1)}, 命中 ${ecount}`);
          pool[0] += damage;
          break;
        }
        break;
      case "skchr_chyue_3":
        if (enemy.count > 1) {
          let chyue_t1_scale = (options.cond ? buffList["tachr_2024_chyue_1"].damage_scale : 1);
          damage = Math.max(finalFrame.atk * 0.05, finalFrame.atk - edef) * buffFrame.damage_scale / chyue_t1_scale;
          pool[0] += damage * (enemy.count - 1) * dur.hitCount;
          log.write(`范围伤害 ${damage.toFixed(1)} (不计第一天赋), 命中 ${(enemy.count-1) * dur.hitCount}`);
        }
        break;
      case "tachr_4082_qiubai_1":
        let qiubai_t1_hit_skill = 0;
        let qiubai_t1_hit_extra = 0;
        let qiubai_t1_atk_extra = finalFrame.atk;
        let talent_scale = 1;
        if (isSkill) {
          // 根据技能和触发选项，设定攻击次数
          // s1 不触发：技能攻击1 结束伤害 不计
          // s1 触发：技能1 结束伤害 enemy.count
          // s2 无论触发与否都计额外伤害 技能 hitCount，额外伤害 enemy.count*2
          // 但是额外伤害不计攻击加成
          // s3 不触发：不计，触发：计
          switch (blackboard.id) {
            case "skchr_qiubai_1":
              qiubai_t1_hit_skill = dur.hitCount;  
              qiubai_t1_hit_extra = (options.cond ? parseInt(enemy.count) : 0);
              log.write("技能伤害触发第一天赋，范围伤害跟随选项");
              break;
            case "skchr_qiubai_2":
              log.writeNote("全程触发第一天赋");
              qiubai_t1_hit_skill = dur.hitCount;
              qiubai_t1_hit_extra = parseInt(enemy.count) * 2;
              qiubai_t1_atk_extra = finalFrame.atk / buffFrame.atk_scale - buffList.skill.atk * basicFrame.atk;
              break;
            case "skchr_qiubai_3":
              if (options.cond) {
                qiubai_t1_hit_skill = dur.hitCount;
                log.writeNote("全程触发第一天赋");
              } else 
                log.writeNote("不计第一天赋伤害");
              if (buffList.skill.talent_scale) talent_scale = buffList.skill.talent_scale;
              break;
          }

          let damage_atk = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale * talent_scale * (1-emrpct) * buffFrame.damage_scale;
          let damage_extra = qiubai_t1_atk_extra * bb.atk_scale * talent_scale * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage_atk * qiubai_t1_hit_skill + damage_extra * qiubai_t1_hit_extra;

          log.write(`${displayNames[buffName]}: 额外伤害 ${damage_atk.toFixed(1)} (天赋倍率 ${talent_scale.toFixed(1)})`);
          if (blackboard.id == "skchr_qiubai_2")
            log.write(`${displayNames[buffName]}: 首尾刀额外伤害 ${damage_extra.toFixed(1)} (不计攻击力加成)`);
          log.write(`${displayNames[buffName]}: 额外伤害次数: 攻击 ${qiubai_t1_hit_skill} 额外 ${qiubai_t1_hit_extra}`);

        } else if (options.cond) {
          damage = finalFrame.atk / buffFrame.atk_scale * bb.atk_scale * (1-emrpct) * buffFrame.damage_scale;
          pool[1] += damage * dur.hitCount;
        }
        break;
      case "skchr_qiubai_1":
        damage = finalFrame.atk * bb.aoe_scale * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * enemy.count;
        break;
      case "skchr_qiubai_2":
        let qiubai_s2_a1 = finalFrame.atk / buffFrame.atk_scale - bb.atk * basicFrame.atk;
        let qiubai_s2_a2 = finalFrame.atk / buffFrame.atk_scale * bb.sword_end_atk_scale;
        let qiubai_s2_d1 = qiubai_s2_a1 * bb.sword_begin_atk_scale * (1-emrpct) * buffFrame.damage_scale;
        let qiubai_s2_d2 = Math.max(qiubai_s2_a2 - edef, qiubai_s2_a2*0.05) * buffFrame.damage_scale;
        log.write(`${displayNames[buffName]}: 初始伤害攻击力 ${qiubai_s2_a1.toFixed(1)}`);
        log.write(`${displayNames[buffName]}: 初始伤害-法术: ${qiubai_s2_d1.toFixed(1)}, 收尾伤害-物理: ${qiubai_s2_d2.toFixed(1)}`);
        pool[1] += qiubai_s2_d1 * enemy.count;
        pool[0] += qiubai_s2_d2 * enemy.count;
        break;
      case "tachr_1029_yato2_1":
        let yato2_t1_scale = 1;
        if (blackboard.id == "skchr_yato2_2")
          yato2_t1_scale = buffList.skill.talent_scale_display || 1;
        damage = finalFrame.atk * yato2_t1_scale * bb["attack@atk_scale_1"] * (1-emrpct) * buffFrame.damage_scale;
        log.write(`${displayNames[buffName]}: 额外伤害 ${damage.toFixed(1)}`);
        pool[1] += damage * dur.hitCount;
        break;
      case "skchr_humus_1":
        pool[2] += bb.value;
        break; 
      case "skchr_ines_1":
        damage = finalFrame.atk * bb.bleed_atk_scale * (1-emrpct) * buffFrame.damage_scale;
        pool[1] += damage * bb.bleed_duration;
        log.write(`${displayNames[buffName]}: 流血伤害 ${damage.toFixed(1)} * 3s`);
        break;
      case "skchr_ines_3":
        let ines_3_count = Math.min(enemy.count, bb.max_target);
        // 前面已经算过一层偷攻击这里减去
        let ines_3_steal_table = [...Array(ines_3_count).keys()].map(x => (x-1)*buffList["tachr_4087_ines_1"]["steal_atk"]);
        let pivot = ines_3_steal_table[ines_3_steal_table.length-1];
        let ines_3_atk_table = ines_3_steal_table.map(x => (finalFrame.atk - pivot + x) * bb.atk_scale);
        let ines_3_dmg_table = ines_3_atk_table.map(x => Math.max(x - edef, x * 0.05) * buffFrame.damage_scale);
        log.write(`影哨伤害 ${ines_3_dmg_table.map(x => x.toFixed(1))}`);
        pool[0] += ines_3_dmg_table.reduce((x, y)=>x+y);
        break;
      case "tachr_4072_ironmn_1":
        if (options.token && blackboard.id == "skchr_ironmn_2") {
          let ironmn_2_ratio = (isSkill ? 0.008 : 0.004);
          damage = ironmn_2_ratio * dur.duration * finalFrame.maxHp;
          pool[2] -= damage;
        }
        break;
      case "skchr_kalts_3":
        if (options.token) {
          // 判断value。具体值存在召唤物的talent里，本体判断只能写死
          let kalts_t2_value = 1200;
          if (charAttr.char.potentialRank >= 4)
            kalts_t2_value += 200;
          if (charAttr.char.equipId == "uniequip_002_kalts" && charAttr.char.equipLevel == 3)
            kalts_t2_value += 300;
          log.writeNote(`自爆真伤 ${kalts_t2_value}`);
        }
        break;
      case "skchr_excu2_3":
        let excu2_s3_atk = dur.tags["finalFrame.atk"] * bb["attack@final_atk_scale"];
        damage = Math.max(excu2_s3_atk - edef, excu2_s3_atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * ecount;
        log.writeNote(`尾刀伤害 ${damage.toFixed(1)}, 命中 ${ecount}`);
        break;
      case "tachr_4015_spuria_1":
        let spur_count = (dur.attackCount - dur.hitCount - dur.critCount) / 2;
        let spur_edef = edef * (1-bb.def_penetrate);
        let spur_scale = 1;
        if (buffList["uniequip_002_spuria"]) {
          let theBuff = buffList["uniequip_002_spuria"].talent;
          if (theBuff && theBuff.atk_scale)
            spur_scale = theBuff.atk_scale;
        }
        let spur_atk = finalFrame.atk * spur_scale;
        damage = Math.max(spur_atk - edef, spur_atk * 0.05) * buffFrame.damage_scale;
        damage_defp = Math.max(spur_atk - spur_edef, spur_atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * 2 * spur_count + damage_defp * spur_count;
        log.write("(此处暴击伤害对应仅晕眩的伤害)");
        log.write(`二连击伤害 ${damage.toFixed(1)}, 命中 ${spur_count*2}`);
        log.write(`穿防伤害 ${damage_defp.toFixed(1)}, 命中 ${spur_count}`);
        break;
      case "tachr_2012_typhon_1": // 修正提丰叠层期间伤害
        if (options.typhon_fix) {
          let edef_table = [2, 3, 4].map(x => enemy.def * (1 - bb.def_penetrate * x));
          let damage_table = edef_table.map(x => Math.max(finalFrame.atk - x, finalFrame.atk*0.05) * buffFrame.damage_scale);
          log.write(`第2-4次伤害: ${damage_table.map(x => x.toFixed(1))}`);
          let delta = hitDamage * 3 - damage_table.reduce((x, y)=>x+y);
          log.write(`损失伤害 ${delta.toFixed(1)}`);
          pool[0] -= delta;
        }
        break;
      case "uniequip_003_helage":
        heal = finalFrame.maxHp * bb.trait.hp_ratio;
        log.writeNote(`被击倒时恢复HP ${heal.toFixed(1)}`);
        break;   
      case "tachr_4102_threye_2": // ID为2但是是第一天赋
        if (options.cond) {
          damage = finalFrame.atk / buffFrame.atk_scale * bb.ep_damage_ratio * (100 - enemy.epDamageResistance)/100;
          log.write(`${displayNames[buffName]}: 单次攻击元素损伤 ${damage.toFixed(1)}`);
          pool[6] += damage * dur.hitCount;
        }
        break;
      case "skchr_threye_1":
        damage = finalFrame.atk / buffFrame.atk_scale * bb.ep_damage_ratio * (100 - enemy.epDamageResistance)/100;
        log.write(`${displayNames[buffName]}: 单次攻击元素损伤 ${damage.toFixed(1)}`);
        pool[6] += damage * dur.hitCount;
        break;
      case "skchr_threye_2":
        damage = finalFrame.atk * bb["attack@ep_damage_ratio"] * (100 - enemy.epDamageResistance)/100;
        log.write(`${displayNames[buffName]}: 单次攻击元素损伤 ${damage.toFixed(1)}`);
        log.writeNote("以每目标爆发1次计算");
        pool[6] += damage * dur.hitCount; // 元素槽损伤
        pool[5] += 800 * 15 * ecount * (100 - enemy.epResistance) / 100; // 元素伤害
        break;
      case "tachr_1016_agoat2_1":
        let agoat2_stack = options.agoat2_stack;
        let agoat2_t1_count = 1;
        if (isSkill) {
          if (blackboard.id == "skchr_agoat2_3") {
            agoat2_stack = 3;
            agoat2_t1_count = Math.min(enemy.count, 5);
            log.writeNote(`第一天赋按满层/${agoat2_t1_count}目标计算`);
          } else if (blackboard.id == "skchr_agoat2_1") {
            agoat2_t1_count = ecount;
            log.writeNote(`第一天赋按${agoat2_t1_count}目标计算`);
          }
        }
        heal = finalFrame.atk / buffFrame.heal_scale * bb.heal_scale * agoat2_stack;
        let agoat2_t1_ep_heal = heal * buffList["tachr_1016_agoat2_trait"].ep_heal_ratio;
        pool[2] += heal * dur.duration * agoat2_t1_count;
        pool[7] += agoat2_t1_ep_heal * dur.duration * agoat2_t1_count;
        log.write(`${displayNames[buffName]}: 额外治疗 ${heal.toFixed(1)}/s, 元素治疗 ${agoat2_t1_ep_heal.toFixed(1)}/s`);
        break;
      case "skchr_agoat2_1":
        heal = finalFrame.atk * bb["agoat2_s_1[aura].ep_heal_ratio"];
        pool[7] += heal * dur.duration * enemy.count;
        log.writeNote(`缓回元素治疗 ${heal.toFixed(1)}/s/${enemy.count}目标`);
        break;
      case "skchr_agoat2_2":
        heal = finalFrame.atk * bb["agoat2_s_2[shield].atk_scale"];
        pool[7] += heal;
        log.writeNote(`元素屏障值 ${heal.toFixed(1)}`);
        if (ecount > 1) {
          let t1bb = buffList["tachr_1016_agoat2_1"];
          let t1heal = finalFrame.atk / buffFrame.heal_scale * t1bb.heal_scale;
          let t1ep = t1heal * buffList["tachr_1016_agoat2_trait"].ep_heal_ratio;
          pool[2] += t1heal * t1bb.duration * (ecount-1);
          pool[7] += t1ep * t1bb.duration * (ecount-1);
          log.writeNote("非主目标按1层第一天赋计算");      
        }
        break;
      case "skchr_swire2_3":
        let swire2_s3_atk = finalFrame.atk * bb.atk_scale;
        damage = Math.max(swire2_s3_atk - edef, swire2_s3_atk * 0.05) * buffFrame.damage_scale;
        pool[0] += damage * options.swire2_s3_coin;
        log.write(`终结伤害 ${damage.toFixed(1)} x ${options.swire2_s3_coin}`);
        break;
    }; // extraDamage switch ends here

    // 百分比/固定回血
    let hpratiosec = bb["hp_recovery_per_sec_by_max_hp_ratio"];
    let hpsec = bb["hp_recovery_per_sec"];
    if (hpratiosec) {
      if (buffName == "tachr_478_kirara_1") {
        if (options.cond) hpratiosec = bb["kirara_t_2.hp_recovery_per_sec_by_max_hp_ratio"];
        if (isSkill && blackboard.id == "skchr_kirara_2") {
          hpratiosec *= buffList["skill"].talent_scale;
        }
        log.write(`天赋回血比例: ${(hpratiosec * 100).toFixed(1)}%/s`);
      }

      if (buffName == "tachr_344_beewax_1" && isSkill) {}
      else if (buffName == "tachr_362_saga_2") {}
      else if (buffName == "tachr_293_thorns_2") {
        if (blackboard.id == "skchr_thorns_2" && isSkill) {
          pool[2] += hpratiosec * finalFrame.maxHp * (dur.duration + dur.stunDuration - 2);
          log.writeNote("治疗从2秒后开始计算");
        } else {}
      } else if (buffName == "tachr_422_aurora_1") {
        if (!isSkill) {
          var aurora_hp_time = levelData.spData.spCost / ((1 + buffFrame.spRecoveryPerSec) * (1 + buffFrame.spRecoverRatio)) / 2 + dur.stunDuration;
          var aurora_hps = hpratiosec * finalFrame.maxHp;
          pool[2] += aurora_hps * aurora_hp_time;
          log.write(`HP恢复时间: ${aurora_hp_time.toFixed(3)}s, HPS ${aurora_hps.toFixed(1)}`);
        }
      } else if (buffName == "skchr_blkngt_1") {
        if (isSkill && options.token) {
          var blkngt_hps = hpratiosec * finalFrame.maxHp;
          log.writeNote(`HPS: ${blkngt_hps.toFixed(1)}`);
        } // else {}
      } else if (buffName == "skchr_mlyss_2") {
        if (options.token && options.mlyssPosition == "MELEE")
          pool[2] += hpratiosec * finalFrame.maxHp * dur.duration;
      } else {
        pool[2] += hpratiosec * finalFrame.maxHp * (dur.duration + dur.stunDuration);
      }
    }
    if (hpsec) {
      if ((buffName == "tachr_291_aglina_2" && isSkill) || 
          (buffName == "tachr_188_helage_2" && !options.noblock)) { /* skip */ }
      else
      {
        pool[2] += hpsec * (dur.duration + dur.stunDuration);
      }
    }
    // 自身血量百分比相关的治疗/伤害
    if (bb["hp_ratio"]) {
      switch (buffName) {
        case "skchr_huang_3": // 自爆
        case "skchr_utage_2":
        case "skchr_akafyu_2":
        case "skchr_kazema_2":
          if (!options.annie && !options.token) {
            damage = bb.hp_ratio * finalFrame.maxHp;
            pool[2] -= damage; 
            log.writeNote(`对自身伤害 ${damage.toFixed(1)}`);
          }
          break;
        case "skchr_ifrit_3": // 自己掉血
        case "skchr_skadi2_3":
        case "skchr_aprot2_2":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * dur.duration; break;
        case "skchr_bldsk_2":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * bb.duration * 2; break;
        case "tachr_225_haak_trait":  // 阿-特性
        case "tachr_4015_spuria_trait":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * dur.duration; break;
        case "tachr_225_haak_1":
          if (options.crit) {
            heal = bb.hp_ratio * finalFrame.maxHp * buffFrame.heal_scale;
            log.write(`[特殊] ${displayNames[buffName]}: 治疗 ${heal.toFixed(1)}, 命中 ${dur.critHitCount}`);
            pool[2] += heal * dur.critHitCount; 
          }
          break;
        case "skchr_kazema_1":
          if (!isSkill) break;
        case "skchr_bena_2":
          if (!options.annie) {
            pool[2] -= bb.hp_ratio * dur.attackCount * finalFrame.maxHp;
            log.writeNote(`每次技能攻击HP-${(bb.hp_ratio * finalFrame.maxHp).toFixed(1)}`);
          }
          break;
        case "sktok_ironmn_pile3":
          if (options.token && blackboard.id == "skchr_ironmn_3") {
            damage = bb.hp_ratio * finalFrame.maxHp;
            log.write(`每次攻击HP-${damage.toFixed(1)}`);
            pool[2] -= damage * dur.hitCount;
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
        case "tachr_4019_ncdeer_1":
        case "tachr_492_quercu_1":
        case "skchr_ling_2":
        case "tachr_4039_horn_1":
        case "tachr_4042_lumen_1":
        case "tachr_1026_gvial2_2":
        case "tachr_4027_heyak_2":
        case "tachr_003_kalts_2":
        case "tachr_1028_texas2_1":
        case "tachr_4017_puzzle_1":
        case "tachr_1030_noirc2_2":
        case "tachr_188_helage_2":
        case "tachr_1031_slent2_1":
          break;
        case "skchr_gravel_2":
          pool[4] += bb.hp_ratio * finalFrame.maxHp;
          log.write(`[特殊] ${displayNames[buffName]}: 护盾量 ${pool[4].toFixed(1)}`);
          log.writeNote("护盾在9秒内衰减到0");
          break;
        case "skchr_phatom_1":
          pool[4] += bb.hp_ratio * finalFrame.maxHp;
          log.write(`[特殊] ${displayNames[buffName]}: 护盾量 ${pool[4]}`);
          break;
        case "skchr_surtr_3":
          pool[4] -= finalFrame.maxHp + 5000;
          let surtr_maxHps = finalFrame.maxHp * bb.hp_ratio;
          log.writeNote(`最大生命流失量 ${surtr_maxHps.toFixed(1)}/s`);
          break;
        case "tachr_311_mudrok_1":
          pool[2] += bb.hp_ratio * finalFrame.maxHp / bb.interval * (dur.duration + dur.prepDuration);
          break;
        case "uniequip_002_skadi":
        case "uniequip_002_flameb":
        case "uniequip_002_gyuki":
          if (options.equip) {
            log.writeNote(`HP上限减少至 ${(finalFrame.maxHp * bb.max_hp).toFixed(1)}`);
            finalFrame.maxHp = finalFrame.maxHp * bb.trait.max_hp;
          }
          break;
        case "tachr_300_phenxi_1":
          heal = Math.ceil(bb.hp_ratio * finalFrame.maxHp) * 10;
          log.writeNote(`最大生命流失率 ${heal.toFixed(1)}/s`);
          break;
        case "skchr_horn_2":
          if (options.od_trigger && options.overdrive_mode) {
            pool[2] -= finalFrame.maxHp * bb.hp_ratio;
            log.writeNote(`自爆伤害 ${pool[2].toFixed(1)}`);
          }
          break;
        case "skchr_highmo_2":
          heal = bb.hp_ratio * finalFrame.maxHp;
          log.writeNote(`击杀恢复HP ${heal.toFixed(1)}`);
          break;
        case "tachr_4071_peper_1":
          if (options.cond) {
            pool[2] += bb.value * dur.hitCount;
          }
          break;
        case "skchr_judge_3":
          pool[4] += bb.hp_ratio * finalFrame.maxHp;
          break;
        case "tachr_437_mizuki_2":
          if (bb.hp_ratio < 0.5) {
            heal = bb.hp_ratio * finalFrame.maxHp;
            log.writeNote(`击杀恢复HP ${heal.toFixed(1)}`);
          }
          break;
        case "tachr_491_humus_1":
        case "skchr_morgan_2":
          heal = bb.hp_ratio * finalFrame.maxHp;
          log.writeNote(`屏障最大值 ${heal.toFixed(1)}`);
          break;
        case "tachr_1031_slent2_2":
          if (options.musha_hp < bb.hp_ratio * 100) {
            heal = finalFrame.atk * bb.atk_to_hp_recovery_ratio;
            if (options.cond) {
              heal *= 2;
              log.writeNote("莱茵");
            }
            log.writeNote(`2天赋HPS: ${heal.toFixed(1)}`); 
            pool[2] += heal * dur.duration * ecount;
          }
          break;
        case "tachr_1033_swire2_2":
          heal = finalFrame.maxHp * bb.hp_ratio;
          log.writeNote(`买活HP ${heal.toFixed(1)}`);
          break;
        default:
          pool[2] += bb.hp_ratio * finalFrame.maxHp * dur.attackCount;
      };
    }

    let dmg = pool[0] + pool[1] + pool[3] + pool[5];
    if (dmg > 0) log.write(`[特殊] ${displayNames[buffName]}: 额外伤害 ${dmg.toFixed(2)}`);
    if (pool[2] > 0) log.write(`[特殊] ${displayNames[buffName]}: 额外治疗 ${pool[2].toFixed(2)}`);
    else if (pool[2] < 0) log.write(`[特殊] ${displayNames[buffName]}: 自身伤害 ${pool[2].toFixed(2)}`);
    
    if (pool[6] > 0)
      log.write(`[特殊] ${displayNames[buffName]}: 元素损伤 ${pool[6].toFixed(2)}`);

    for (let i=0; i<8; ++i) extraDamagePool[i] += pool[i];
  } 
  // 减伤计算
  if (enemy.dr) {
    log.write(`[减伤] 物理/法术伤害减免 ${enemy.dr}%`);
    [0, 1].forEach(x => {
      damagePool[x] *= (1-enemy.dr/100);
      extraDamagePool[x] *= (1-enemy.dr/100);
    });
  }

  // 整理返回
  let totalDamage = [0, 1, 3, 5].reduce((x, y) => x + damagePool[y] + extraDamagePool[y], 0);
  let totalHeal = [2, 4].reduce((x, y) => x + damagePool[y] + extraDamagePool[y], 0);
  let extraDamage = [0, 1, 3, 5].reduce((x, y) => x + extraDamagePool[y], 0);
  let extraHeal = [2, 4].reduce((x, y) => x + extraDamagePool[y], 0);
  let totalEpDamage = damagePool[6] + extraDamagePool[6];
  let totalEpHeal = damagePool[7] + extraDamagePool[7];

  log.write(`总伤害: ${totalDamage.toFixed(2)}`);
  if (totalHeal != 0) log.write(`总治疗: ${totalHeal.toFixed(2)}`);

  let dpsDuration = dur.dpsDuration > 0 ? dur.dpsDuration : dur.duration;
  dpsDuration += dur.prepDuration + dur.stunDuration;
  if (dpsDuration != dur.duration) 
    log.write(`以 ${dpsDuration.toFixed(1)}s 计算DPS/HPS`);
  let dps = totalDamage / dpsDuration;
  let hps = totalHeal / dpsDuration;
  let eps = totalEpDamage / dpsDuration;
  let ehps = totalEpHeal / dpsDuration;
  // 均匀化重置普攻时的普攻dps
  if (!isSkill && checkResetAttack(blackboard.id, blackboard, options)) {
    let d = dur.attackCount * attackTime;
    log.write(`以 ${d.toFixed(3)}s (${dur.attackCount} 个攻击间隔) 计算普攻dps`);
    dps = totalDamage / d; hps = totalHeal / d;
  }
  if (eps > 0)
    log.writeNote(`${isSkill ? '技能':'普攻'}EPS: ${eps.toFixed(1)}/${ecount}目标`);

  log.write(`DPS: ${dps.toFixed(1)}, HPS: ${hps.toFixed(1)}`);
  log.write("----");

  return {
    atk: finalFrame.atk,
    dps,
    hps,
    ehps,
    dur,
    damageType,
    hitDamage,
    critDamage,
    extraDamage,
    extraHeal,
    totalDamage,
    totalHeal,
    totalEpDamage,
    totalEpHeal,
    maxTarget: ecount,
    damagePool,
    extraDamagePool,
    attackTime,
    frame,
    attackCount: dur.attackCount, 
    spType: dur.spType
  };
}

function calculateGradDamage(_) { // _ -> args
  var ret = 0;
  var dmg_table = [];
  var _seq = [...Array(Math.round(_.dur.attackCount)).keys()];  // [0, 1, ..., attackCount-1]
  var subProf = AKDATA.Data.character_table[_.charId].subProfessionId;

  if (subProf == "funnel") {
    // 驭蟹术士
    // 基于当前伤害直接乘算atk_scale倍率即可
    let base_scale = ((_.skillId == "skchr_gdglow_3" && _.isSkill) ? 0 : 1);
    let base_table = [0, 1, 2, 3, 4, 5, 6];
    let max_funnel_scale = 1.1;
    if (_.skillId == "skchr_rockr_2" && _.options.overdrive_mode) {
      // 洛洛 - 过载模式
      _.log.writeNote("假设进入过载时是满倍率1.1");
      let start = 1.1;
      max_funnel_scale = _.blackboard.scale * 1.1;
      let stacks = Math.ceil((_.blackboard.scale * 1.1 - start) / 0.15 + 1);
      base_table = [...Array(stacks).keys()].map(x => x + 6);
    }

    let funnel = 1;
    if (_.isSkill) funnel = checkSpecs(_.skillId, "funnel") || 1;

    let tb = base_table.map(x => base_scale + Math.min(max_funnel_scale, 0.2+0.15*x)*funnel);
    let acount = _.dur.attackCount;
    if (_.charId == "char_377_gdglow" && _.dur.critHitCount > 0 && _.isSkill) {
      acount -= _.dur.critHitCount;
      _.log.write(`每个浮游炮平均爆炸 ${_.dur.critHitCount} 次, 从攻击次数中减去`);
    }
    _.log.write(`攻击 ${acount} 次，命中 ${(base_scale + funnel) * acount * _.buffFrame.times}`);
    dmg_table = [...Array(acount * _.buffFrame.times).keys()].map(x => (
      x >= tb.length ? Math.round(_.hitDamage * tb[tb.length-1]) : Math.round(_.hitDamage * tb[x])
    ));
    _.log.write(`倍率: ${tb.map(x => (x * _.buffFrame.atk_scale).toFixed(2))} (本体: ${base_scale}, 浮游炮: ${funnel})`);
    _.log.write(`单次伤害: ${dmg_table.slice(0, tb.length-1)}, ${dmg_table[tb.length-1]} * ${acount-tb.length+1}`);
  } else if (_.skillId == "skchr_kalts_3") {
    // 凯尔希: 每秒改变一次攻击力, finalFrame.atk为第一次攻击力
    let range = _.basicFrame.atk * _.blackboard["attack@atk"];
    let n = Math.floor(_.dur.duration);
    let atk_by_sec = [...Array(n+1).keys()].map(x => _.finalFrame.atk - range * x / n);
    // 抬手时间
    let atk_begin = calcAttackBegin(_.skillId, _.dur.attackSpeed, _.options, new NoLog()) / 30;
    let atk_timing = _seq.map(i => atk_begin + _.attackTime * i);

    dmg_table = atk_timing.map(x => atk_by_sec[Math.floor(x)] * _.buffFrame.damage_scale);
    _.log.write(explainGradAttackTiming({
      duration: n,
      atk_by_sec,
      atk_timing,
      dmg_table 
    }));
  } else if (_.skillId == "skchr_billro_3") {
    // 卡涅利安: 每秒改变一次攻击力（多一跳），蓄力时随攻击次数改变damage_scale倍率, finalFrame.atk为最后一次攻击力
    let range = _.basicFrame.atk * _.blackboard.atk;
    let n = Math.floor(_.dur.duration);
    // rate = (x-1)/(n-1), thus t=0, x=n, rate=1; t=(n-1), x=1, rate=0
    let atk_by_sec = [...Array(n+1).keys()].reverse().map(x => _.finalFrame.atk - range * (x-1) / (n-1));
    // 抬手时间
    let atk_begin = calcAttackBegin(_.skillId, _.dur.attackSpeed, _.options, new NoLog()) / 30;
    //let atk_begin = Math.round((checkSpecs(_.skillId, "attack_begin") || 12)) / 30;
    let atk_timing = _seq.map(i => atk_begin + _.attackTime * i);
    // damage_scale
    let sc = [1.2, 1.4, 1.6, 1.8, 2];
    let scale_table = _seq.map(i => (i>=sc.length ? 2 : sc[i]));

    //console.log({atk_by_sec, atk_timing, scale_table});
    dmg_table = atk_timing.map(x => atk_by_sec[Math.floor(x)] * _.ecount * Math.max(1-_.emrpct, 0.05) * _.buffFrame.damage_scale);
    kwargs = { duration: n, atk_by_sec, atk_timing, dmg_table };
    if (_.options.charge) {
      dmg_table = _seq.map(i => dmg_table[i] * scale_table[i]);
      kwargs.scale_table = scale_table.map(x => x * _.buffFrame.damage_scale);
      kwargs.dmg_table = dmg_table;
    }
    _.log.write(explainGradAttackTiming(kwargs));
  } else if (_.skillId == "skchr_excu2_3") {
    // 异葬3: 计算每击的期望
    // 第二段伤害是加攻以后的攻击力
    let acount = _.dur.tags["origAttackCount"];
    let tbl = _.buffFrame.atk_table;
    let seq = [...Array(acount).keys()];
    while (tbl.length < acount + 1)
      tbl.push(tbl[tbl.length-1]);  // padding
    let excu2_atk = tbl.slice(0, acount+1).map(
      x => _.finalFrame.atk + _.basicFrame.atk * x // 每击攻击力，第n次攻击连击时按第n+1次的攻击力计算
    );
    let excu2_dmg = excu2_atk.map(
      x => Math.max(x-_.edef, x*0.05) * _.buffFrame.damage_scale  // 伤害
    );
    let edef_extra = _.edef;
    if (_.buffList["tachr_1032_excu2_1"].def_penetrate_fixed) // 计算模组额外穿防
      edef_extra = Math.max(0, edef_extra - _.buffList["tachr_1032_excu2_1"].def_penetrate_fixed);
    let excu2_dmg_extra = excu2_atk.map(
      x => Math.max(x-edef_extra, x*0.05) * _.buffFrame.damage_scale  // 伤害
    );
    let {prob, prob_add} = _.buffList["tachr_1032_excu2_1"];
    let excu2_prob = seq.map(
      x => Math.min(1, prob + prob_add * x) // 连击概率
    );
    let excu2_expect = seq.map(
      x => excu2_dmg[x] + excu2_prob[x] * excu2_dmg_extra[x+1]
    );
    ret = excu2_expect.reduce((x, y) => x + y) * _.ecount;   
    // explain with markdown
    let mdText = makeMarkdownTable(
      [ "攻击次数", "攻击力", { text: "连击期望" }, "伤害期望" ],
      [
        seq.map(x=>x+1),
        excu2_atk,
        excu2_prob.map(x => `${Math.round(x*100)}%`),
        excu2_expect
      ]
    );
    _.log.write(mdText);
    _.log.write("");

    // 把最终攻击力暂存在dur.tags里面
    _.dur.tags["finalFrame.atk"] = excu2_atk[excu2_atk.length-1];
    _.log.write(`最终攻击力 ${_.dur.tags["finalFrame.atk"].toFixed(1)}`);
  } else {
    // 一般处理（煌，傀影）: 攻击加成系数在buffFrame.atk_table预先计算好,此时finalFrame.atk为最后一次攻击的攻击力
    // 由finalFrame.atk计算之前每次攻击的实际攻击力，同时不影响其他buff
    if (_.skillId == "skchr_morgan_1") {
      // 摩根1: 取真实攻击次数
      if (_.buffFrame.atk_table.length > _.dur.attackCount)
        _.buffFrame.atk_table = _.buffFrame.atk_table.slice(0, _.dur.attackCount);
      let last = _.buffFrame.atk_table[_.buffFrame.atk_table.length-1];
      while (_.buffFrame.atk_table.length < _.dur.attackCount)
        _.buffFrame.atk_table.push(last);
    }
    var a = _.buffFrame.atk_table.map(x => _.basicFrame.atk * x * _.buffFrame.atk_scale);
    var pivot = a[a.length-1];
    if (_.skillId == "skchr_morgan_1") pivot = a[0];
    a = a.map(x => (_.finalFrame.atk - pivot + x));
    //console.log(a);

    // 计算每次伤害
    if (_.damageType == 0) {
      dmg_table = a.map(x => Math.max(x-_.edef, x*0.05) * _.buffFrame.damage_scale);
    } else if (_.damageType == 3) {
      dmg_table = a.map(x => x * _.buffFrame.damage_scale);
    }
    _.log.write(`单次伤害: ${dmg_table.map(x => x.toFixed(1))}`);
  }
  if (dmg_table.length > 0)
    ret = dmg_table.reduce((x, y) => x + y);
  
  // 至简暴击（均摊计算）
  if ("tachr_4054_malist_1" in _.buffList && _.options.crit) {
    let entry = _.buffList["tachr_4054_malist_1"];
    let crit_scale = 1 + entry.prob * (entry.atk_scale - 1);
    _.log.write(`原本伤害 ${ret.toFixed(2)}, 均摊暴击倍率 ${crit_scale.toFixed(2)}x`);
    ret *= crit_scale;
  }
  return ret;
}

/*
headers = { text: "blablabla", precision: 2 }
cols = [ [1,2,3,4,5] ]
生成表格-->
blablabla 1.00 2.00 3.00 4.00 5.00
*/
function makeMarkdownTable(headers, cols, maxCol=10) {
  let i=0, ret = [];
  let divLine = [...Array(cols[0].length).keys()].map(x => ":--:");
  // console.log(headers, cols);
  // shortcut for string
  let h = headers.map(x => (typeof x === 'string' ? { text: x, precision: 0 } : x));
  while (i < cols[0].length) {
    let subTable = [...Array(h.length).keys()].map(
      col => [h[col].text, ...cols[col].slice(i, i+maxCol).map(
        x => isNaN(h[col].precision) ? x : x.toFixed(h[col].precision)
      )]
    );
    subTable.splice(1, 0, [":--:", ...divLine.slice(i, i+maxCol)]);

    let subTableLines = subTable.map(x => `| ${x.join(" | ")} |`);
    ret.push(...subTableLines);
    ret.push("\n");
    i+=maxCol;
  }
  return ret.join("\n");
}

/*
时间 row_time(0->t)
---
攻击力 atk_by_sec Math.round

攻击时点 atk_timing toFixed(2)
---
倍率   scale_table toFixed(2)
*/
function explainGradAttackTiming(_, n=7) {
  let atkByTimeTable = makeMarkdownTable(
    [ "时间", "攻击力" ],
    [ [...Array(_.duration).keys()], _.atk_by_sec ],
    n
  );
  let dmgByTimeHeaders = [
    { text: "攻击时点", precision: 2 },
    "伤害"
  ];
  let dmgByTimeCols = [
    _.atk_timing,
    _.dmg_table
  ];
  if (_.scale_table) {
    dmgByTimeHeaders.splice(1, 0, { text: "倍率", precision: 2 });
    dmgByTimeCols.splice(1, 0, _.scale_table);
  }
  let dmgByTimeTable = makeMarkdownTable(dmgByTimeHeaders, dmgByTimeCols, n);
  return [atkByTimeTable, dmgByTimeTable].join("\n");
}

let AttributeKeys = [
  'atk',
  'attackSpeed',
  'baseAttackTime',
  'baseForceLevel',
  'blockCnt',
  'cost',
  'def',
  'hpRecoveryPerSec',
  'magicResistance',
  'massLevel',
  'maxDeckStackCnt',
  'maxDeployCount',
  'maxHp',
  'moveSpeed',
  'respawnTime',
  'spRecoveryPerSec',
  'tauntLevel',
];

function initBuffFrame() {
  return {
    atk_scale: 1,
    def_scale: 1,
    heal_scale:1,
    damage_scale: 1,
    maxTarget: 1,
    times: 1,
    edef:0, // 敌人防御/魔抗
    edef_scale:1,
    edef_pene:0,
    edef_pene_scale:0,
    emr_pene:0, // 无视魔抗
    emr:0,
    emr_scale:1,
    atk:0,
    def:0,
    attackSpeed:0,
    maxHp: 0,
    baseAttackTime:0,
    spRecoveryPerSec:0,
    spRecoverRatio:0,
    spRecoverIntervals: [],
    applied:{},
  };
}

function getAttributes(char, log) { //charId, phase = -1, level = -1
  let charData = AKDATA.Data.character_table[char.charId];
  let phaseData = charData.phases[char.phase];
  let attributesKeyFrames = {};
  let buffs = initBuffFrame();
  let buffList = {};
  if (char.charId.startsWith("token"))
    log.write("【召唤物属性】");
  else 
    log.write("【基础属性】");
  log.write("----");
  // 计算基础属性，包括等级和潜能
  if (char.level == charData.phases[char.phase].maxLevel) {
    attributesKeyFrames = Object.assign(attributesKeyFrames, phaseData.attributesKeyFrames[1].data);
  } else {
    AttributeKeys.forEach(key => {
      attributesKeyFrames[key] = getAttribute(phaseData.attributesKeyFrames, char.level, 1, key);
    });
  }
  if (charData.favorKeyFrames && charData.profession != "TOKEN") {  // token不计信赖
    let favorLevel = Math.floor(Math.min(char.favor, 100) / 2);
    AttributeKeys.forEach(key => {
      attributesKeyFrames[key] += getAttribute(charData.favorKeyFrames, favorLevel, 0, key);
      // console.log(char.level, key, attributesKeyFrames[key]);
      buffs[key] = 0;
    });
  }

  // 计算潜能和模组
  applyPotential(char.charId, charData, char.potentialRank, attributesKeyFrames, log);
  if (char.equipId && char.phase >= 2) {
    applyEquip(char, attributesKeyFrames, log);
    if (!checkSpecs(char.equipId, "defer")) // 普通模组，在天赋前添加
      buffList[char.equipId] = attributesKeyFrames.equip_blackboard;
  }

  // 计算天赋/特性，记为Buff
  if (charData.trait && !charData.has_trait) {
    charData.has_trait = true;
    charData.talents.push(charData.trait);
  }
  if (charData.talents) {
    charData.talents.forEach(talentData => {
      if (talentData.candidates) { // mon3tr!!
        for (let i = talentData.candidates.length - 1; i >= 0; i--) {
          let cd = talentData.candidates[i];
          //console.log(cd);
          if (char.phase >= checkEnum("phase", cd.unlockCondition.phase) && char.level >= cd.unlockCondition.level && 
              char.potentialRank >= cd.requiredPotentialRank) {
            // 找到了当前生效的天赋
            let blackboard = getBlackboard(cd.blackboard);
            if (!cd.prefabKey || cd.prefabKey < 0) {
              cd.prefabKey = "trait";  // trait as talent
              cd.name = "特性";
            }
            let prefabKey = 'tachr_' + char.charId.slice(5) + '_' + cd.prefabKey;
            displayNames[prefabKey] = cd.name;  // add to name cache

            // 如果天赋被模组修改，覆盖对应面板
            if (attributesKeyFrames.equip_blackboard) {
              let ebb = attributesKeyFrames.equip_blackboard; 
              if (ebb.override_talent == cd.prefabKey && ebb.talent) {
                var tb = ebb.talent;
                ebb.remove_keys.forEach(k => {
                  delete tb[k];
                });
               // console.log({cd, old: blackboard, new: tb });
                Object.keys(tb).forEach(k => {
                  blackboard[k] = tb[k];
                });
                log.write(`[模组] 强化天赋 - ${cd.name}: ${JSON.stringify(blackboard)}`);
              }
              if (cd.prefabKey == "trait" && ebb.override_trait) {
                var tb = ebb.trait;
                //console.log({cd, old: blackboard, new: tb });
                Object.keys(tb).forEach(k => {
                  blackboard[k] = tb[k];
                });
                log.write(`[模组] 强化特性: ${JSON.stringify(blackboard)}`);
              }
            }
            // bufflist处理
            buffList[prefabKey] = blackboard;
            break;
          }
        };
      }
    }); // foreach
  }

  if (checkSpecs(char.equipId, "defer")) { // 特殊模组，buff在天赋后结算
    buffList[char.equipId] = attributesKeyFrames.equip_blackboard;
    log.write("延后结算模组效果");
  }
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
    char: char,
  };
}

function getBuffedAttributes(basic, buffs) {
  let {...final} = basic;
  AttributeKeys.forEach(key => {
    if (buffs[key]) final[key] += buffs[key];
  });

  final.atk *= buffs.atk_scale;
  final.def *= buffs.def_scale;
  // final.atk *= buffs.damage_scale;
  return final;
}

function getAttribute(frames, level, minLevel, attr) {
  var ret = (level - minLevel) / (frames[1].level - frames[0].level) * (frames[1].data[attr] - frames[0].data[attr]) + frames[0].data[attr];
  if (attr != "baseAttackTime")
    return Math.round(ret);
  else return ret;
}

function getBlackboard(blackboardArray) {
  let blackboard = {};
  blackboardArray.forEach(kv => blackboard[kv.key] = kv.value);
  return blackboard;
}

let PotentialAttributeTypeList = {
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
  for (let i = 0; i < rank; i++) {
    let potentialData = charData.potentialRanks[i];
    if (!potentialData.buff) continue;
    let y = potentialData.buff.attributes.attributeModifiers[0];
    let key = PotentialAttributeTypeList[checkEnum("potential", y.attributeType)];
    let value = y.value;

    basic[key] += value;
    if (value>0) {
      log.write(`潜能 ${i+2}: ${key} ${basic[key]-value} -> ${basic[key]} (+${value})`);
    }
  }
}

function applyEquip(char, basic, log) {
  var equipId = char.equipId;
  var bedb = AKDATA.Data.battle_equip_table;
  var phase = char.equipLevel - 1;
  var cand = 0;
  var blackboard = {};
  var attr = {};
  //console.log(phase);
  if (equipId && bedb[equipId]) {
    var item = bedb[equipId].phases[phase];
    attr = getBlackboard(item.attributeBlackboard);
    blackboard.attr = attr;

    if (item.tokenAttributeBlackboard) {
      var tb = {};
      Object.keys(item.tokenAttributeBlackboard).forEach(tok => {
        tb[tok] = getBlackboard(item.tokenAttributeBlackboard[tok]);
      })
//      Object.assign(blackboard, tb);
      blackboard.token = tb;
    }
    var talents = {}, traits = {};

    item.parts.forEach(pt => {
      let talentBundle = pt.addOrOverrideTalentDataBundle;
      let traitBundle = pt.overrideTraitDataBundle;
      // 天赋变更
      if (talentBundle && talentBundle.candidates) {
        for (cand = talentBundle.candidates.length - 1; cand > 0; --cand) {
          if (char.potentialRank >= talentBundle.candidates[cand].requiredPotentialRank) break;
        }
        $.extend(talents, getBlackboard(talentBundle.candidates[cand].blackboard));
      }
      // 特性变更
      if (traitBundle && traitBundle.candidates) {
        for (cand = traitBundle.candidates.length - 1; cand > 0; --cand) {
          if (char.potentialRank >= traitBundle.candidates[cand].requiredPotentialRank) break;
        }
        $.extend(traits, getBlackboard(traitBundle.candidates[cand].blackboard));
      }
      
    });
    blackboard.talent = talents;
    blackboard.trait = traits;
    // 查询额外数据，获得修改的是哪个天赋的面板
    // which = 1, 2, "1+"
    var which = checkSpecs(equipId, "override_talent");
    // console.log(which);
    if (which && which.toString().length > 0) {
      if (char.equipLevel > 1 || (char.equipLevel == 1 && checkSpecs(equipId, "override_lv1")))
        blackboard.override_talent = which.toString();
      if (char.equipLevel == 1)
        log.writeNote("1级模组覆盖天赋，需要核对");
    }
    // override_trait 为true时才把装备特性面板覆盖到原本特性上，否则把装备和特性作为不同buff处理。
    blackboard.override_trait = checkSpecs(equipId, "override_trait");
    blackboard.remove_keys = checkSpecs(equipId, "remove_keys") || [];
  }
//  console.log(attr, blackboard);
  var attrKeys = {
    max_hp: "maxHp",
    atk: "atk",
    def: "def",
    magic_resistance: "magicResistance",
    attack_speed: "attackSpeed",
    block_cnt: "blockCnt"
  };
  if (!char.options.token) {
    Object.keys(attr).forEach(x => {
      basic[attrKeys[x]] += attr[x];
      if (attr[x]!=0) log.write(`模组 Lv${char.equipLevel}: ${attrKeys[x]} ${basic[attrKeys[x]]-attr[x]} -> ${basic[attrKeys[x]]} (+${attr[x]})`);
    });  
  } 
  basic.equip_blackboard = blackboard; // 处理过的模组面板放在这里
}

function calculateAnimation(charId, skillId, isSkill, attackTime, attackSpeed, log) {
  var _fps = 30;
  var charData = AKDATA.Data.character_table[charId];
  var animData = AKDATA.Data.dps_anim[charId] || {};
  var animKey = "Attack";
  var attackKey = checkSpecs(charId, "anim_key");
  if (!attackKey) {
    attackKey = ["Attack", "Attack_Loop", "Combat"].find(x => animData[x]);
  }
  var tags = [];
  var count = 0;  // animKeys中出现的最大技能编号

  // 推断animKey
  if (!isSkill)
    animKey = attackKey;
  else {
    animKey = checkSpecs(skillId, "anim_key");
    if (!animKey) {
      // 首先，取得技能号
      let skIndex = ~~skillId.split("_")[2];
      let skCount = charData.skills.length;
      // 取得可能描述技能动画时间的animKeys
      let candidates = Object.keys(animData).filter(k => 
        typeof(animData[k].OnAttack) == "number" &&
        k.includes("Skill") && !k.includes("Begin") && !k.includes("End")
      );
      if (typeof(animData.Skill) == "number") candidates.push("Skill");
      // 分析
      if (candidates.length == 0)
        animKey = attackKey;  // 没有合适的技能动画，则使用普攻
      else {
        candidates.forEach(k => {
          k.split("_").forEach(t => {
            let value = parseInt(t, 10) || t;
            if (!tags.includes(value)) tags.push(value);
            if (value > count) count = value;
          })
        });
        // 例子：如果有3个技能但是animKeys最大为skill2说明skill2对应3技能
        // 否则skill3对应3技能
        if (skCount > count) skIndex -= 1;
        // 选择最终animKey
        if (skIndex == 0 || count == 0) {
          animKey = candidates.find(k => k.includes("Skill"));
        } else {
          animKey = candidates.find(k => k.includes(skIndex));
        }
        if (!animKey) animKey = attackKey;
      }
      //console.log( { animKey, animData, candidates, count, skIndex } );
    }
  }

  // 帧数算法. 258yyds
  var attackFrame = attackTime * _fps;  // 理论攻击间隔 换算为帧
  var realAttackFrame = Math.round(attackFrame);  // 实际攻击间隔，后面会调整
  var realAttackTime = realAttackFrame / _fps;
  var animFrame = 0, eventFrame = -1;  // 原本动画帧数，判定帧数
  var scale = 1;
  var scaledAnimFrame = 0; // 缩放后的动画帧数
  var preDelay = 0, postDelay = 0;

 // console.log("**【动画计算测试，结果仅供参考，不用于后续计算】**");

  if (!animKey || !animData[animKey]) {
 //   console.log("暂无帧数数据，保持原结果不变");
  } else {
    var specKey = animKey.includes("Attack") ? charId : skillId;
    var isLoop = animKey.includes("Loop");
    // 动画拉伸幅度默认为任意
    var max_scale = 99;

    if (typeof(animData[animKey]) == "number") {
      // 没有OnAttack，一般是瞬发或者不攻击的技能
      animFrame = animData[animKey];
    } else if (isLoop && !animData[animKey].OnAttack) {
      // 名字为xx_Loop的动画且没有OnAttack事件，则为引导型动画
      // 有OnAttack事件的正常处理
      log.write("Loop动画，判定帧数=理论攻击间隔")
      animFrame = attackFrame;
      eventFrame = attackFrame;
      scale = 1;
    } else {
      animFrame = animData[animKey].duration;
      eventFrame = animData[animKey].OnAttack;
      // 计算缩放比例
      if (checkSpecs(specKey, "anim_max_scale")) {
        max_scale = checkSpecs(specKey, "anim_max_scale");
        log.write(`动画最大缩放系数: ${max_scale}`);
      }
      scale = Math.max(Math.min(attackFrame / animFrame, max_scale), 0.1);
    }
    //if (eventFrame < 0 || isLoop) {
    //  scale = 1;
   // }

    if (eventFrame >= 0) {
      // 计算前后摇。后摇至少1帧
      preDelay = Math.max(Math.round(eventFrame * scale), 1);   // preDelay 即 scaled eventFrame
      postDelay = Math.max(Math.round(animFrame * scale - preDelay), 1);
      scaledAnimFrame = preDelay + postDelay; 
    } else
      scaledAnimFrame = animFrame;
/*
    console.log(`理论攻击间隔: ${attackTime.toFixed(3)}s, ${attackFrame.toFixed(1)} 帧. 攻速 ${Math.round(attackSpeed)}%`);
    console.log(`原本动画时间: ${animKey} - ${animFrame} 帧, 抬手 ${eventFrame} 帧`);
    console.log(`缩放系数: ${scale.toFixed(2)}`);
    console.log(`缩放后动画时间: ${scaledAnimFrame} 帧, 抬手 ${preDelay} 帧`);
*/
    // 帧数补正
    // checkSpecs(specKey, "reset_cd_strategy") == "ceil" ? 
    if (attackFrame - scaledAnimFrame > 0.5) {
      //console.log("[补正] 动画时间 < 攻击间隔-0.5帧: 理论攻击帧数向上取整且+1");
      realAttackFrame = Math.ceil(attackFrame) + 1;
    } else {
      //console.log("[补正] 四舍五入");
      realAttackFrame = Math.max(scaledAnimFrame, Math.round(attackFrame));
    }
    
    realAttackTime = realAttackFrame / _fps;
    //console.log(`实际攻击间隔: ${realAttackTime.toFixed(3)}s, ${realAttackFrame} 帧`);
  }

  return {
    realAttackTime,
    realAttackFrame,
    preDelay,
    postDelay,
    scaledAnimFrame
  };
}

// 根据args里估算的值，计算给定duration里的攻击次数和恢复的技力
// 不包含stunDuration，但是包含stun期间恢复的技力
function simNormalDuration(args) {
  let fps = 30, t = 0, sp = 0;
  let spCost = args.spData.spCost;
  if (args.options.charge && checkSpecs(args.skillId, "charge"))
    spCost *= 2;
  let last = {}, timeline = {}, count = {};

  // 阻回
  let cast_time = args.attackTime * fps;
  let _spec = checkSpecs(args.skillId, "cast_time");
  if (_spec) cast_time = _spec;
  _spec = checkSpecs(args.skillId, "cast_bat");
  if (_spec) cast_time = _spec * 100 / args.attackSpeed;
  let skill_time = Math.max(cast_time, attackTime * fps);

  function time_since(key) { return t - (last[key] || -999); }
  function act(key) {
    if (!timeline[t]) timeline[t] = [];
    if (!count[key]) count[key] = 0;
    timeline[t].push(key);
    last[key] = t;
    count[key] += 1;
  }
}

function calcFractile(key, keyRange, valueRange, rateRange=[0, 1]) {
  let rate = (key - keyRange[0]) / (keyRange[1] - keyRange[0]);
  rate = Math.max(rateRange[0], Math.min(rateRange[1], rate));   // clamp
  let value = valueRange[0] + rate * (valueRange[1] - valueRange[0]);
  return {value, rate};
}

AKDATA.attributes = {
  getCharAttributes,
  calculateDps,
  calculateDpsSeries,
  checkChar,
  checkSpecs
};
