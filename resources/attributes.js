// 获取技能特判标记，存放在dps_specialtags.json中
function checkSpecs(tag, spec) {
  let specs = AKDATA.Data.dps_specialtags;
  if ((tag in specs) && (spec in specs[tag]))
    return specs[tag][spec];
  else return false;
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

function getTokenAtkHp(charAttr, tokenId, log) {
  var id = charAttr.char.charId;
  charAttr.char.charId = tokenId;
  var token = getAttributes(charAttr.char, log);
  // console.log(token);
  charAttr.basic.atk = token.basic.atk;
  charAttr.basic.maxHp = token.basic.maxHp;
  charAttr.basic.baseAttackTime = token.basic.baseAttackTime;
  charAttr.char.charId = id;
  log.write(`[召唤物] ${tokenId} maxHp = ${charAttr.basic.maxHp}, atk = ${charAttr.basic.atk}, baseAttackTime = ${charAttr.basic.baseAttackTime}`);
}

function checkChar(char) {
  let charData = AKDATA.Data.character_table[char.charId];
  if (!('phase' in char)) char.phase = charData.phases.length - 1;
  if (!('level' in char)) char.level = charData.phases[char.phase].maxLevel;
  if (!('favor' in char)) char.favor = 200;
  if (!('potentialRank' in char)) char.potentialRank = 5;
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
    this.log += "[注记] " + line + "\n";
    this.note += line + "\n";
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

// 天赋/技能名字cache
displayNames = {};

function calculateDps(char, enemy, raidBuff) {
  let log = new Log();
  checkChar(char);
  enemy = enemy || {
    def: 0,
    magicResistance: 0,
    count: 1,
  };
  raidBuff = raidBuff || { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
  // 把raidBuff处理成blackboard的格式
  let raidBlackboard = {
    atk: raidBuff.atkpct / 100,
    atk_override: raidBuff.atk,
    attack_speed: raidBuff.ats,
    sp_recovery_per_sec: raidBuff.cdr / 100,
    base_atk: raidBuff.base_atk / 100,
    damage_scale: 1 + raidBuff.damage_scale / 100
  };
  displayNames["raidBuff"] = "团辅";

  let charId = char.charId;
  let charData = AKDATA.Data.character_table[charId];
  let skillData = AKDATA.Data.skill_table[char.skillId];
  if (char.skillLevel == -1) char.skillLevel = skillData.levels.length - 1;

  let levelData = skillData.levels[char.skillLevel];
  let blackboard = getBlackboard(skillData.levels[char.skillLevel].blackboard) || {};

  // calculate basic attribute package
  let attr = getAttributes(char, log);
  blackboard.id = skillData.skillId;
  attr.buffList["skill"] = blackboard;

  console.log(charData.name, levelData.name);
  log.write(`| 角色 | 等级 | 技能 |`);
  log.write(`| :--: | :--: | :--: | `);
  log.write(`| ~${charId}~ - **${charData.name}**  | 精英 ${char.phase}, 等级 ${char.level}, 潜能 ${char.potentialRank+1} | ${levelData.name}, 等级 ${char.skillLevel+1} |`);

  displayNames[charId] = charData.name;
  displayNames[char.skillId] = levelData.name;  // add to name cache

  if (char.options.token && (checkSpecs(charId, "token") || checkSpecs(char.skillId, "token")))  {
    log.write("\n");
    log.writeNote("**召唤物dps，非本体**");
    var tokenId = checkSpecs(charId, "token") || checkSpecs(char.skillId, "token");      
    getTokenAtkHp(attr, tokenId, log);
  }

  // 原本攻击力的修正量
  if (raidBlackboard.base_atk != 0) {
    let delta = attr.basic.atk * raidBlackboard.base_atk;
    let prefix = (delta > 0 ? "+" : "");
    attr.basic.atk = Math.round(attr.basic.atk + delta);
    log.write(`[团辅] 原本攻击力变为 ${attr.basic.atk} (${prefix}${delta.toFixed(1)})`); 
  }

  log.write(`- **技能**\n`);
  let skillAttack = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
  if (!skillAttack) return;
  log.write("----");
  log.write(`- **普攻**\n`); 
  let normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
  if (!normalAttack) return;
 
  globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / (normalAttack.dur.duration + skillAttack.dur.duration + normalAttack.dur.stunDuration));
  globalHps = Math.round((normalAttack.totalHeal + skillAttack.totalHeal) / (normalAttack.dur.duration + skillAttack.dur.duration + normalAttack.dur.stunDuration));
  //console.log(globalDps, globalHps);
  let killTime = 0;

  return {
    normal: normalAttack,
    skill: skillAttack,
    skillName: levelData.name,

    killTime: killTime,
    globalDps,
    globalHps,
    log: log.toString(),
    note: log.note,
  };
}

function calculateDpsSeries(char, enemy, raidBuff, key, series) {
  let log = new NoLog();
  checkChar(char);
  enemy = enemy || {
    def: 0,
    magicResistance: 0,
    count: 1,
  };
  raidBuff = raidBuff || { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
  // 把raidBuff处理成blackboard的格式
  let raidBlackboard = {
    atk: raidBuff.atkpct / 100,
    atk_override: raidBuff.atk,
    attack_speed: raidBuff.ats,
    sp_recovery_per_sec: raidBuff.cdr / 100,
    base_atk: raidBuff.base_atk / 100,
    damage_scale: 1 + raidBuff.damage_scale / 100
  };
  displayNames["raidBuff"] = "";

  let charId = char.charId;
  let charData = AKDATA.Data.character_table[charId];
  let skillData = AKDATA.Data.skill_table[char.skillId];
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
  if (raidBlackboard.base_atk != 0) {
    let delta = attr.basic.atk * raidBlackboard.base_atk;
    let prefix = (delta > 0 ? "+" : "");
    attr.basic.atk = Math.round(attr.basic.atk + delta);
  }

  var results = {};
  series.forEach(x => {
    enemy[key] = x;

    let skillAttack = calculateAttack(attr, enemy, raidBlackboard, true, charData, levelData, log);
    if (!skillAttack) return;

    let normalAttack = calculateAttack(attr, enemy, raidBlackboard, false, charData, levelData, log);
    if (!normalAttack) return;

    globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / (normalAttack.dur.duration + skillAttack.dur.duration + normalAttack.dur.stunDuration));
    globalHps = Math.round((normalAttack.totalHeal + skillAttack.totalHeal) / (normalAttack.dur.duration + skillAttack.dur.duration + normalAttack.dur.stunDuration));
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

  // 如果是技能期间，则取得技能ID, 否则不计算技能
  if (tag == "skill") {
    if (isSkill)
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
    else if (tag == "raidBuff") line.push("[团辅/拐]");
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
          if (blackboard[key]>0) writeBuff(`sp: +${buffFrame.spRecoveryPerSec}/s`);
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
        case "prob_override": // 计算后的暴击概率
          buffFrame.prob = blackboard[key];
          writeBuff(`概率(计算): ${Math.round(buffFrame.prob*100)}%`);
          break;
        case "atk_override":  // 加算的攻击团辅
          buffFrame.atk += blackboard[key];
          prefix = blackboard[key] > 0 ? "+" : "";
          if (blackboard[key] != 0)
            writeBuff(`atk(+): ${prefix}${(blackboard[key]*100).toFixed(1)}`);
          break;
      }
    }
  }
// 特判
//----------------------------------------------------------------------------------------
  // 备注信息
  if (isSkill && checkSpecs(tag, "note"))
    log.writeNote(checkSpecs(tag, "note"));

  if (checkSpecs(tag, "cond")) { // 触发天赋类
    if (!options.cond) { // 未触发时依然生效的天赋
      switch (tag) {
        case "tachr_348_ceylon_1": // 锡兰
          buffFrame.atk += basic.atk * blackboard['ceylon_t_1[common].atk'];
          writeBuff(`非水地形 atk + ${buffFrame.atk.toFixed(1)}`);
          break;
        case "skchr_glacus_2":  // 格劳克斯
          buffFrame.atk_scale = blackboard["atk_scale[normal]"];
          writeBuff(`atk_scale = ${buffFrame.atk_scale} 不受天赋影响`);
        case "skchr_cutter_2":
          applyBuffDefault(); break;
        case "tachr_145_prove_1": // 普罗旺斯
          applyBuffDefault(); break;
        case "tachr_226_hmau_1":
          delete blackboard["heal_scale"];
          applyBuffDefault(); break;
        case "tachr_279_excu_trait":
          if (isSkill && skillId == "skchr_excu_1") applyBuffDefault();
          break;
        case "tachr_113_cqbw_2":  // W: 技能眩晕必定有天赋加成
          if (isSkill) applyBuffDefault();
          break;
      };
      done = true;
    } else {
      switch (tag) {
        case "tachr_348_ceylon_1":  // 锡兰
          buffFrame.atk += basic.atk * blackboard['celyon_t_1[map].atk'];  // yj手癌
          writeBuff(`水地形 atk + ${buffFrame.atk.toFixed(1)}`);
          done = true; break;
        case "skchr_glacus_2":
          buffFrame.atk_scale = blackboard["atk_scale[drone]"];
          writeBuff(`atk_scale = ${buffFrame.atk_scale} 不受天赋影响`);
          done = true; break;
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
          blackboard.edef_pene_scale = blackboard["def_penetrate"];
          break;
        case "tachr_358_lisa_2":  // 铃兰2
          if (isSkill && skillId == "skchr_lisa_3")
            delete blackboard.damage_scale; // 治疗不计易伤
          break;
      }
    }
  } else if (checkSpecs(tag, "ranged_penalty")) { // 距离惩罚类
    if (!options.ranged_penalty) done = true;
  } else if (checkSpecs(tag, "stack")) { // 叠层类
    if (options.stack) { // 叠层天赋类
      if (blackboard.max_stack_cnt) {
        ["atk", "def", "attack_speed", "max_hp"].forEach(key => {
          if (blackboard[key]) blackboard[key] *= blackboard.max_stack_cnt;
      });
      } else if (["tachr_188_helage_1", "tachr_337_utage_1"].includes(tag)) {
        blackboard.attack_speed = blackboard.min_attack_speed;
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
      case "tachr_367_swllow_1": // 灰喉
        blackboard.attack_speed = 0;  // 特判已经加了
        break;
      case "tachr_279_excu_1": // 送葬
        blackboard.edef_pene = blackboard["def_penetrate_fixed"];
        break;
      case "tachr_373_lionhd_1":  // 莱恩哈特
        blackboard.atk *= Math.min(enemy.count, blackboard.max_valid_stack_cnt);
        break;
      // 暴击类
      case "tachr_290_vigna_1":
        blackboard.prob_override = (isSkill ? blackboard.prob2 : blackboard.prob1);
        break;
      case "tachr_106_franka_1": // 芙兰卡
        blackboard.edef_pene_scale = 1;
        if (isSkill && skillId == "skchr_franka_2")
          blackboard.prob_override = 0.5;
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
        if (isSkill) done = true; break;
      // ---- 技能 ----
      case "skchr_swllow_1":
      case "skchr_helage_1":
      case "skchr_helage_2":
      case "skchr_excu_2":
      case "skchr_bpipe_2":
        buffFrame.times = 2;
        writeBuff(`攻击次数 = ${buffFrame.times}`);
        break;
      case "skchr_excu_1":
        delete blackboard.atk_scale; break;
      case "skchr_texas_2":
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
        buffFrame.times = blackboard.max_cnt;
        log.writeNote(`核弹数量: ${buffFrame.times} (按全中计算)`);
        buffFrame.maxTarget = 999;
        break;
      case "skchr_cqbw_3":  // D12(茂名版)
        buffFrame.times = blackboard.max_target;
        blackboard.max_target = 999;
        log.writeNote(`核弹数量: ${buffFrame.times} (按全中计算)`);
        break;
      case "skchr_slbell_1":  // 不结算的技能
      case "skchr_shining_2": 
      case "skchr_cgbird_2":
        done = true; break;
      case "skchr_amgoat_1":
        buffFrame.atk += basic.atk * blackboard['amgoat_s_1[b].atk'];
        buffFrame.attackSpeed += blackboard['amgoat_s_1[b].attack_speed'];
        writeBuff(`按第二次之后计算: atk + ${buffFrame.atk}, attackSpeed + ${buffFrame.attackSpeed}`);
        done = true; break;
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
      case "skchr_weedy_2":
      case "skchr_weedy_3":
      case "skchr_asbest_2":
      case "skchr_folnic_2":
      case "skchr_chiave_2":
        buffFrame.maxTarget = 999;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_durnar_2":
        buffFrame.maxTarget = 3;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_huang_3": // 可变攻击力技能，计算每段攻击力表格以和其他buff叠加
        buffFrame.maxTarget = 999;
        buffFrame.atk_table = [...Array(8).keys()].map(x => blackboard.atk / 8 *(x+1));
        writeBuff(`技能攻击力系数: ${buffFrame.atk_table.map(x => x.toFixed(2))}`);
        break;
      case "skchr_phatom_2":
        buffFrame.atk_table = [...Array(blackboard.times).keys()].reverse().map(x => blackboard.atk * (x+1));
        writeBuff(`技能攻击力系数: ${buffFrame.atk_table.map(x => x.toFixed(2))}`);
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
      case "skchr_sora_2":
        blackboard.atk = 0; // 不增加本体攻击
        blackboard.def = 0;
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
      case "skchr_glaze_2": // 攻击间隔延长，但是是加算
        buffFrame.baseAttackTime += blackboard.base_attack_time;
        writeBuff(`base_attack_time + ${blackboard.base_attack_time}s`);
        blackboard.base_attack_time = 0;
        break;
      case "skchr_brownb_2":  // 攻击间隔缩短，但是是乘算负数
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time *= basic.baseAttackTime;
        break;
      case "skchr_aglina_2":  // 攻击间隔缩短，但是是乘算正数
      case "skchr_cerber_2":
      case "skchr_finlpp_2": 
        writeBuff(`base_attack_time: ${blackboard.base_attack_time}x`);
        blackboard.base_attack_time = (blackboard.base_attack_time - 1) * basic.baseAttackTime;
        break;
      case "skchr_angel_3": // 攻击间隔双倍减算
        writeBuff("攻击间隔双倍减算");
        blackboard.base_attack_time *= 2;
        break;
      case "skchr_whitew_2":
        buffFrame.maxTarget = 2;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          writeBuff(`不受距离惩罚`);
        }
        break;
      case "skchr_ayer_2":
        delete blackboard.atk_scale;  // 断崖2记为额外伤害
      case "skchr_ayer_1":
      case "skchr_svrash_2":
      case "skchr_svrash_3":
      case "skchr_svrash_1":
      case "skchr_frostl_1":
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          writeBuff(`不受距离惩罚`);
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
        delete blackboard["atk_scale"];
        break;
    }
  }
  
  if (checkSpecs(tag, "sec")) {
    blackboard.base_attack_time = 1 - (basic.baseAttackTime + buffFrame.baseAttackTime);
    buffFrame.attackSpeed = 0;
    blackboard.attack_speed = 0;
    writeBuff("每秒造成一次伤害/治疗");
  }

  if (!done) applyBuffDefault();
  return buffFrame;
}

// 伤害类型判定
function extractDamageType(charData, chr, isSkill, skillDesc, skillBlackboard) {
  let charId = chr.charId;
  let skillId = skillBlackboard.id;
  let ret = 0;
  if (charData.profession == "MEDIC")
    ret = 2;
  else if (charData.description.includes('法术伤害') && !["char_260_durnar", "char_378_asbest"].includes(charId)) {
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
  } else if (chr.options.token) {
    ret = checkSpecs(charId, "token_damage_type") || ret;
  }
  return ~~ret;
}

// 重置普攻判定
function checkResetAttack(key, blackboard) {
  if (checkSpecs(key, "reset_attack") == "false") return false;
  else return (checkSpecs(key, "reset_attack") || 
          blackboard['base_attack_time'] || blackboard['attack@max_target'] ||
          blackboard['max_target']);
}

// 计算攻击次数和持续时间
function calcDurations(isSkill, attackTime, attackSpeed, levelData, buffList, buffFrame, enemyCount, options, log) {
  let blackboard = buffList.skill;
  let skillId = blackboard.id;
  let spData = levelData.spData;
  let duration = 0;
  let attackCount = 0;
  let stunDuration = 0;
  let startSp = 0;
  let rst = checkResetAttack(skillId, blackboard);

  log.write("\n**【循环计算】**");

  const spTypeTags = {
    1: "time",
    2: "attack",
    4: "hit",
    8: "special"
  };
  let tags = [spTypeTags[spData.spType]];  // 技能类型标记

  // 需要模拟的技能（自动回复+自动释放+有充能）
  if (checkSpecs(skillId, "sim")) {
    duration = 120;
    let fps = 30;
    let now = fps, sp = spData.initSp * fps, max_sp = 999 * fps;
    let last = {}, timeline = {}, total = {};
    const TimelineMarks = {
      "attack": "-",
      "skill": "+",
      "ifrit": "",
      "ifrit_recover_sp": "*",
      "reset_animation": "*",
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
    }

    // init sp
    if (skillId == "skchr_amgoat_2" && buffList["tachr_180_amgoat_2"])
      sp = (buffList["tachr_180_amgoat_2"].sp_min + buffList["tachr_180_amgoat_2"].sp_max) / 2 * fps;
    else if (buffList["tachr_222_bpipe_2"])
      sp = buffList["tachr_222_bpipe_2"].sp * fps;
    last["ifrit"] = 1;
    startSp = spData.spCost - sp / fps;

    // sp barrier
    if (skillId == "skchr_frostl_1") max_sp = spData.spCost * fps;
    if (blackboard.ct) max_sp = spData.spCost * fps * blackboard.ct;
    if (blackboard.cnt) max_sp = spData.spCost * fps * blackboard.cnt;

    log.write(`[模拟] T = 120s, 初始sp = ${(sp/fps).toFixed(1)} (+1落地sp), 技能sp = ${spData.spCost}, 技能动画时间 = ${Math.round(cast_time)} 帧, sp上限设为 ${max_sp / fps}`);
    if (checkSpecs(skillId, "attack_animation"))
      log.write(`[模拟] 攻击动画 = ${checkSpecs(skillId, "attack_animation")} 帧`);

    sp+=fps;  // 落地时恢复1sp

    while (now <= duration * fps) {
      // normal attack
      if (sp < spData.spCost * fps &&
          time_since("attack") >= attackTime * fps &&
          time_since("skill")  >= skill_time) {
        action("attack");
      }
      // skill
      if (sp >= spData.spCost * fps &&
          time_since("skill") >= skill_time &&
          (time_since("attack") >= attackTime * fps || time_since("attack") == checkSpecs(skillId, "attack_animation"))
         ) {
        if (time_since("attack") == checkSpecs(skillId, "attack_animation"))
          action("reset_animation");
        action("skill");
      }
      // sp recover
      if (time_since("skill") == 0)
        sp -= spData.spCost * fps;
      if (time_since("skill") >= cast_time && sp < max_sp) {
        sp += (1 + buffFrame.spRecoveryPerSec);
      }
      if (buffList["tachr_134_ifrit_2"] && time_since("ifrit") >= buffList["tachr_134_ifrit_2"].interval * fps) {
        action("ifrit");
        if (time_since("skill") >= cast_time) {
          action("ifrit_recover_sp");
          sp += buffList["tachr_134_ifrit_2"].sp * fps;
        }   
      }
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
      Object.keys(timeline).forEach(t => {
        line_str += timeline[t].map(x => TimelineMarks[x]).join("");
      });
      log.write(`[模拟] 时间轴: `);
      log.write(`${line_str}`);
      log.write(`( \-: 普攻, \+: 技能, \*: 特殊 )`)
      
      if (total.ifrit)
        log.write(`[模拟] 莱茵回路(*): 触发 ${total.ifrit_recover_sp} / ${total.ifrit} 次, sp + ${buffList["tachr_134_ifrit_2"].sp * total.ifrit_recover_sp}`);
      if (total.reset_animation)
        log.write(`[模拟] 取消攻击间隔(*) ${total.reset_animation} 次`);
    }
  } else {

  if (isSkill) { 
    // 快速估算
    attackCount = Math.ceil(levelData.duration / attackTime);
    duration = attackCount * attackTime;
    startSp = spData.spCost - spData.initSp;

    if (buffList["tachr_180_amgoat_2"]) { // 乱火
      var init_sp = spData.initSp + (buffList["tachr_180_amgoat_2"].sp_min + buffList["tachr_180_amgoat_2"].sp_max) / 2;
      startSp = spData.spCost - init_sp;
    } else if (buffList["tachr_222_bpipe_2"]) { // 军事传统
      startSp = spData.spCost - spData.initSp - buffList["tachr_222_bpipe_2"].sp;
    }
    // 重置普攻
    if (rst) {
      if (duration > levelData.duration && rst != "ogcd")
        log.write(`可能重置普攻（覆盖 ${(duration - levelData.duration).toFixed(3)}s）`);
      duration = levelData.duration;
      // 抬手时间
      var frameBegin = Math.round((checkSpecs(skillId, "attack_begin") || 12) * 100 / attackSpeed);
      var t = frameBegin / 30;
      attackCount = Math.ceil((duration - t) / attackTime);
      log.write(`技能前摇: ${t.toFixed(3)}s, ${frameBegin} 帧`);
      if (!checkSpecs(skillId, "attack_begin")) log.write("（估算值）");
      else log.writeNote(`技能前摇: ${t.toFixed(3)}s`);
    }
    // 技能类型
    if (levelData.description.includes("持续时间无限")) {
      attackCount = Math.ceil(1800 / attackTime);
      duration = attackCount * attackTime;
      tags.push("infinity"); log.writeNote("持续时间无限 (记为1800s)");
    } else if (spData.spType == 8) {
      if (levelData.duration <= 0 && blackboard.duration > 0) {
        // 砾的技能也是落地点火，但是持续时间在blackboard里
        levelData.duration = blackboard.duration;
      }
      if (levelData.duration > 0) { // 自动点火
        tags.push("auto"); log.write('落地点火');
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
        tags.push("auto", "instant"); log.write("落地点火, 瞬发")
      }
    } else if (levelData.duration <= 0) { 
      if (checkSpecs(skillId, "instant_buff")) { // 瞬发的有持续时间的buff，例如血浆
        duration = blackboard.duration || checkSpecs(skillId, "duration");
        attackCount = Math.ceil(duration / attackTime);
        tags.push("instant", "buff"); log.write("瞬发增益效果");
      } else { // 普通瞬发
        attackCount = 1;
        // 不占用普攻的瞬发技能，持续时间等于动画时间。否则持续时间为一次普攻间隔
        if (checkSpecs(skillId, "reset_attack") != "ogcd")
          duration = attackTime;
        tags.push("instant"); log.write("瞬发");
        // 施法时间
        if (checkSpecs(skillId, "cast_time")) {
          let ct = checkSpecs(skillId, "cast_time");
          if (duration < ct/30 || rst == "ogcd") {
            log.write(`[特殊] 技能释放时间: ${ct} 帧, ${(ct/30).toFixed(3)} s`);
            log.writeNote(`技能动画(阻回): ${ct} 帧`);
            if (spData.spType == 1 || rst == "ogcd")
              duration = ct / 30;
          }
        }
      }
    }
    // 特判
    if (skillId == "skchr_huang_3") {
      attackCount -= 2;
      log.write(`[特殊] ${displayNames["skchr_huang_3"]}: 实际攻击 ${attackCount}段+终结`);
    }
  } else { // 普攻
    // 眩晕处理
    if (skillId == "skchr_fmout_2") {
      stunDuration = blackboard.time;
    } else if (skillId == "skchr_peacok_2") {
      stunDuration = blackboard["failure.stun"] * (1 - blackboard.prob);
      log.write(`[特殊] 计算平均晕眩时间`);
    } else if (["skchr_amiya_2", "skchr_liskam_2", "skchr_ghost_2", "skchr_broca_2"].includes(skillId)) {
      stunDuration = blackboard.stun;
    } else if (skillId == "skchr_folivo_2" && options.token) {
      stunDuration = blackboard.stun;
    }
    if (stunDuration > 0) log.write(`晕眩: ${stunDuration}s`);
    
    // 快速估算
    let attackDuration = spData.spCost / (1 + buffFrame.spRecoveryPerSec) - stunDuration;
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
    if (rst && rst != "ogcd" && spData.spType != 8) {
      var dd = spData.spCost / (1 + buffFrame.spRecoveryPerSec);
      if (duration > dd)
        log.write(`可能重置普攻（覆盖 ${(duration-dd).toFixed(3)}s）`);
      duration = dd;
      // 抬手时间
      var frameBegin = Math.round((checkSpecs(skillId, "attack_begin") || 12) * 100 / attackSpeed);
      var t = frameBegin / 30;
      attackCount = Math.ceil((duration - t) / attackTime);
      log.write(`技能前摇: ${t.toFixed(3)}s, ${frameBegin} 帧`);
      if (!checkSpecs(skillId, "attack_begin")) log.write("（估算值）");
    }

    // 技能类型
    switch (spData.spType) {
      case 8: // 被动或落地点火
        if (levelData.duration <= 0 && blackboard.duration > 0) {
          console.log("Duration? l/b", skillId, levelData.duration, blackboard.duration);
          levelData.duration = blackboard.duration;
        }
        if (levelData.duration > 0) {
          tags.push("auto");
          log.write(`[特殊] 落地点火 - 取普攻时间=技能持续时间`);
          log.writeNote("取普攻时间=技能持续时间");
          attackDuration = levelData.duration;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
        } else if (checkSpecs(skillId, "passive")) { // 被动
          attackCount = 10;
          duration = attackCount * attackTime;
          tags.push("passive");
          log.write(`[特殊] 被动 - 以10次普攻计算`);
          log.writeNote("以10次普攻计算");
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
        attackCount = spData.spCost;
        if (buffList["tachr_010_chen_1"]) { // 呵斥 
          attackCount = Math.ceil(spData.spCost / (1 + attackTime / buffList["tachr_010_chen_1"].interval));
          let sp = Math.floor(attackCount * attackTime / buffList["tachr_010_chen_1"].interval);
          log.write(`[特殊] ${displayNames["tachr_010_chen_1"]}: sp = ${sp}, attack_count = ${attackCount}`);
        } else if (buffList["tachr_301_cutter_1"]) { // 刻刀  
          let p = buffList["tachr_301_cutter_1"].prob;
          if (skillId == "skchr_cutter_1") {
            attackCount = Math.ceil((spData.spCost - p) / (1+p*2));
            log.write(`[特殊] ${displayNames["skchr_cutter_1"]}: 额外判定1次天赋`);   
            log.write(`[特殊] ${displayNames["tachr_301_cutter_1"]}: sp = ${((attackCount*2+1) * p).toFixed(2)}, attack_count = ${attackCount}`);
           } else {
            attackCount = Math.ceil(spData.spCost / (1+p*2));
            log.write(`[特殊] ${displayNames["tachr_301_cutter_1"]}: sp = ${(attackCount*2*p).toFixed(2)}, attack_count = ${attackCount}`);
          }
        }
        duration = attackCount * attackTime;
        if (rst) {
          duration -= attackTime;
        }
        break;
      case 1: // 普通，前面已经算过一遍了，这里只特判
        let sp_rate = 1 + buffFrame.spRecoveryPerSec;
        if (buffList["tachr_002_amiya_1"]) { // 情绪吸收
          attackCount = Math.ceil((spData.spCost - stunDuration) / (buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"] + attackTime*sp_rate));
          log.write(`[特殊] ${displayNames["tachr_002_amiya_1"]}: attack sp = ${attackCount * buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"]}`);
          duration = attackCount * attackTime;
        } else if (buffList["tachr_134_ifrit_2"]) { // [莱茵回路]. 需要解出攻击次数
          let i = buffList["tachr_134_ifrit_2"].interval;
          let isp = i * sp_rate + buffList["tachr_134_ifrit_2"].sp;
          let recoverCount = Math.ceil((spData.spCost - i) / isp); // recoverCount >= (spCost - i) / isp
          let r = (spData.spCost - recoverCount * isp) / sp_rate;
          attackDuration = recoverCount * i + r;
          attackCount = Math.ceil(attackDuration / attackTime);
          //console.log(i, isp, recoverCount, r, attackDuration, attackCount);
          duration = attackDuration;
          log.write(`[特殊] ${displayNames["tachr_134_ifrit_2"]}: sp + ${recoverCount * buffList["tachr_134_ifrit_2"].sp}`); 
        } else if (checkSpecs(skillId, "instant_buff")) { // 不稳定血浆: 减去buff持续时间
          attackDuration -= blackboard.duration || checkSpecs(skillId, "duration");
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
        } else if (buffList["tachr_400_weedy_2"] && options.cannon) { // 水炮充能，持续20s/cd35s
          let m = Math.floor(spData.spCost / 55);
          let a = m * 6 + m * 55 * sp_rate; // 前m个水炮充能+自然恢复的sp量
          let b = 6 + 20 * sp_rate; // 最后一个水炮持续期间最多恢复的sp
          let c = 6;  // 最后一个水炮充的sp
          let r = 0; // 计算还需要多少时间充满
          if (a + b > spData.spCost) { // 技能会在b期间蓄好
            let y = Math.floor((spData.spCost - a) / (3 * sp_rate + 1.0));
            let z = (spData.spCost - a - y) / sp_rate - y*3;
            r = 3*y+z;
            c = Math.floor(r/3);
          } else {
            r = (spData.spCost - a - b) / sp_rate + 20;
          }
          attackDuration = m*55+r;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackDuration;
          log.write(`[特殊] ${displayNames["tachr_400_weedy_2"]}: 使用${m+1}个水炮, 充能sp=${m * 6 + c}`);
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
    } else if (["skcom_assist_cost[2]", "skchr_utage_1"].includes(skillId)) { // 投降类
      hitCount = 0;
    }
  }

  log.write(`持续: ${duration.toFixed(3)} s`);
  log.write(`攻击次数: ${attackCount*buffFrame.times} (${buffFrame.times} 连击 x ${attackCount})`);

  return {
    attackCount,
    times: buffFrame.times,
    hitCount,
    duration,
    stunDuration,
    tags,
    startSp
  };
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
  let damageType = extractDamageType(charData, charAttr.char, isSkill, levelData.description, blackboard);
  if (damageType == 2)
    buffFrame.atk_scale *= buffFrame.heal_scale;
  // 灰喉-特判
  if (buffList["tachr_367_swllow_1"]) {
    buffFrame.attackSpeed += buffList["tachr_367_swllow_1"].attack_speed;
    log.write(`[特殊] ${displayNames["tachr_367_swllow_1"]} - attack_speed + ${buffList["tachr_367_swllow_1"].attack_speed}`);
  }
  // 连击特判
  if (!isSkill && checkSpecs(charId, "times")) {
    var t = checkSpecs(charId, "times");
    buffFrame.times = t;
    log.write(`[连击] ${displayNames[charId]} - 攻击 ${t} 次`);
  }
  if (isSkill && checkSpecs(blackboard.id, "times")) {
    var t = checkSpecs(blackboard.id, "times");
    buffFrame.times = t;
    log.write(`[连击] ${displayNames[blackboard.id]} - 攻击 ${t} 次`);
  }
  
  // 瞬发技能的实际基础攻击间隔
  if (isSkill && checkSpecs(blackboard.id, "cast_bat")) {
    var f = checkSpecs(blackboard.id, "cast_bat");
    basicFrame.baseAttackTime = f / 30;
    log.write(`[特殊] ${displayNames[blackboard.id]} - 技能动画时间 ${(f/30).toFixed(3)}s, ${f} 帧`);
  }

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
  } else if (charData.description.includes("恢复三个") &&
             !(isSkill && charId == "char_275_breeze"))
    buffFrame.maxTarget = 3;

  // 计算最终攻击间隔，考虑fps修正
  let fps = 30;
  // 攻速上下界
  let _spd = Math.min(Math.max(10, finalFrame.attackSpeed), 600);
  if (finalFrame.attackSpeed != _spd) {
    finalFrame.attackSpeed = _spd;
    log.writeNote("达到攻速极限");
  }

  let realAttackTime = finalFrame.baseAttackTime * 100 / finalFrame.attackSpeed;
  if (options.token && blackboard.id != "skchr_mgllan_2") {
    realAttackTime = basicFrame.baseAttackTime; // token不计算攻速影响
    log.write("*** token不计算自身攻速，以最终攻击间隔数据为准 ***");
  }
  let frame = realAttackTime * fps; // 舍入成帧数
  // 额外帧数补偿 https://bbs.nga.cn/read.php?tid=20555008
  let corr = checkSpecs(charId, "frame_corr") || 0;
  let corr_s = checkSpecs(blackboard.id, "frame_corr");
  if ((!(corr_s === false)) && isSkill) corr = corr_s;
  if (corr != 0) {
    frame += corr;
    var prefix = (corr>0 ? "+":"");  
    if (isSkill) {
      log.writeNote(`技能额外帧数 ${prefix}${corr}`);
    } else {
      log.writeNote(`普攻额外帧数 ${prefix}${corr}`);
    }
  }
 // if (charId == "char_204_platnm") {
 //   frame = Math.ceil(frame);
 //   if (isSkill) log.writeNote("帧数进一（非舍入）");  // 存疑。先不加
 // } else 
    frame = Math.round(frame);  // 最后再舍入
  let frameAttackTime = frame / fps;
  let attackTime = frameAttackTime;

  // 根据最终攻击间隔，重算攻击力
  if (isSkill && blackboard.id == "skchr_platnm_2") { // 白金
    let rate = (attackTime - 1) / (buffList["tachr_204_platnm_1"]["attack@max_delta"] - 1);
    // 熔断
    rate = Math.min(Math.max(rate, 0), buffList["tachr_204_platnm_1"]["attack@max_delta"]);
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
  let edef = Math.max(0, (enemy.def + enemyBuffFrame.edef) * enemyBuffFrame.edef_scale * (1-enemyBuffFrame.edef_pene_scale) - enemyBuffFrame.edef_pene);
  let emr = Math.max(0, (enemy.magicResistance + enemyBuffFrame.emr) * enemyBuffFrame.emr_scale);
  let emrpct = emr / 100;
  let ecount = Math.min(buffFrame.maxTarget, enemy.count);

  // 平均化惊蛰伤害
  if (charId == 'char_306_leizi' && !(isSkill && blackboard.id == "skchr_leizi_2")) {
    buffFrame.damage_scale = 1 - 0.125 * (ecount-1);
    finalFrame.atk *= buffFrame.damage_scale;
    log.write(`[特殊] 惊蛰: 平均伤害 ${buffFrame.damage_scale.toFixed(2)}x`);
  }

  // 计算攻击次数和持续时间
  let dur = calcDurations(isSkill, attackTime, finalFrame.attackSpeed, levelData, buffList, buffFrame, ecount, options, log);
  // 暴击次数
  if (options.crit && critBuffFrame["prob"]) {
    if (damageType != 2) {
      if (buffList["tachr_155_tiger_1"])
        dur.critCount = dur.duration / 3 * critBuffFrame.prob;
      else
        dur.critCount = dur.attackCount * critBuffFrame.prob;

      if (dur.critCount > 1) dur.critCount = Math.floor(dur.critCount);
      // 折算为命中次数
      dur.hitCount = (dur.attackCount - dur.critCount) * dur.times * ecount;
      dur.critHitCount = dur.critCount * dur.times * ecount;
      if (buffList["tachr_222_bpipe_1"]) {
        dur.critHitCount = dur.critCount * dur.times * Math.min(enemy.count, 2);
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
  log.write(`攻速: ${finalFrame.attackSpeed} %`);
  log.write(`攻击间隔: ${finalFrame.baseAttackTime.toFixed(3)} s`);
  if (corr != 0) {
    var prefix = (corr>0?"+":"");
    log.write(`帧数补偿 ${frame} (${prefix}${corr})`);
  }
  log.write(`最终攻击间隔 / 舍入到帧: ${realAttackTime.toFixed(3)} s (${frame} 帧, ${frameAttackTime.toFixed(3)} s)`);
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
  log.write(`伤害类型: ${['物理','法术','治疗','真伤'][damageType]}`);
  let dmgPrefix = (damageType == 2) ? "治疗" : "伤害";
  let hitDamage = finalFrame.atk;
  let critDamage = 0;
  let damagePool = [0, 0, 0, 0, 0]; // 物理，魔法，治疗，真伤，盾
  let extraDamagePool = [0, 0, 0, 0, 0];
  let move = 0;

  function calculateHitDamage(frame, scale) {
    let minRate = (buffList["tachr_144_red_1"] ? buffList["tachr_144_red_1"].atk_scale : 0.05);
    if (damageType == 0)
      ret = Math.max(frame.atk - edef, frame.atk * minRate);
    else if (damageType == 1)
      ret = Math.max(frame.atk * (1-emrpct), frame.atk * minRate); 
    else 
      ret = frame.atk;
    if (ret <= frame.atk * minRate) log.write("[抛光]");
    if (scale != 1) { 
      ret *= scale;
      log.write(`damage_scale: ${scale.toFixed(2)}x`);
    }
    return ret;
  }
  
  hitDamage = calculateHitDamage(finalFrame, buffFrame.damage_scale);
  damagePool[damageType] += hitDamage * dur.hitCount;
  log.write(`${dmgPrefix}: ${hitDamage.toFixed(2)}, 命中 ${dur.hitCount.toFixed(1)}`);
  
  // 计算额外伤害
  // 暴击
  if (options.crit) {
    // console.log(critBuffFrame);
    if (isSkill && blackboard.id == "skchr_peacok_2") {
      log.write(`创世纪 - 成功（暴击）为全体法术伤害`);
      damageType = 1;
      ecount = enemy.count;
      dur.critHitCount = enemy.count;
    }
    edef = Math.max(0, (enemy.def + critBuffFrame.edef) * critBuffFrame.edef_scale * (1-critBuffFrame.edef_pene_scale) - critBuffFrame.edef_pene);
    if (edef != enemy.def)
      log.write(`[暴击]敌人防御: ${edef.toFixed(1)} (${(edef-enemy.def).toFixed(1)})`);
    critDamage = calculateHitDamage(critFrame, critBuffFrame.damage_scale);
    if (critDamage > 0) {
      log.write(`暴击${dmgPrefix}: ${critDamage.toFixed(2)}, 命中 ${dur.critHitCount.toFixed(1)}`);
    }
    damagePool[damageType] += critDamage * dur.critHitCount;
  }
  // 空(被动治疗没有写在天赋中)
  if (charId == "char_101_sora") {
    let ratio_sora = 0.1;
    if (isSkill && blackboard.id == "skchr_sora_1") {
      ratio_sora = blackboard["attack@atk_to_hp_recovery_ratio"];
      extraDamagePool[2] = ratio_sora * finalFrame.atk * (dur.duration-1) * enemy.count;
      log.writeNote("第一秒无治疗效果（待确认）");
    } else
      extraDamagePool[2] = ratio_sora * finalFrame.atk * dur.duration * enemy.count;
    damagePool[0] = 0; log.write("[特殊] 伤害为0 （以上计算无效），可以治疗召唤物");
    log.writeNote("可以治疗召唤物");
  }
  // 反射类-增加说明
  if (checkSpecs(blackboard.id, "reflect") && isSkill) {
    log.writeNote(`技能伤害为反射 ${dur.attackCount} 次的伤害`);
  }
  // 可变攻击力-重新计算
  if (checkSpecs(blackboard.id, "grad") && isSkill) {
    log.write("[特殊] 可变攻击力技能，重新计算伤害");
    damagePool[damageType] = 0;

    // 将finalFrame.atk变换为每次攻击的实际攻击力，同时不影响其他buff
    var a = buffFrame.atk_table.map(x => basicFrame.atk * x);
    var pivot = a[a.length-1];
    a = a.map(x => (finalFrame.atk - pivot + x));
    //console.log(a);

    // 计算每次伤害
    if (damageType == 0) {
      a = a.map(x => Math.max(x-edef, x*0.05) * buffFrame.damage_scale);
    }
    log.write(`单次伤害: ${a.map(x => x.toFixed(1))}`);
    damagePool[damageType] = a.reduce((x, y) => x + y);
  }
  if (charId == "char_328_cammou") {  // 卡达: 重新计算倍率
    log.write("[特殊] 卡达: 可变攻击倍率，重新计算伤害");
    damagePool[damageType] = 0;

    var tb = [1.2, 1.35, 1.5, 1.65, 1.8, 1.95, 2.1]; // 本体+无人机总的atk_scale
    var dmg = [...Array(dur.attackCount).keys()].map(x => (
      x >= tb.length ? Math.round(hitDamage * tb[tb.length-1]) : Math.round(hitDamage * tb[x])
    ));
    console.log(dmg);
    log.write(`单次伤害: ${dmg.slice(0, 6)}, ${dmg[6]} * ${dur.attackCount-6}`);
    damagePool[damageType] = dmg.reduce((x, y) => x + y);
  }

  // 额外伤害
  for (var b in buffList) {
    let buffName = b;
    let bb = buffList[b];  // blackboard
    if (buffName == "skill") {
      buffName = bb.id;
    }
    let pool = [0, 0, 0, 0, 0]; // 物理，魔法，治疗，真伤，盾
    let damage = 0;
    let heal = 0;

    if (!isSkill) { // 只在非技能期间生效
      switch (buffName) {
        // 伤害
        case "skchr_ethan_1":
          pool[1] += bb["attack@poison_damage"] * dur.duration * (1-emrpct);
          break;
        case "skchr_aglina_2":
        case "skchr_aglina_3":
        case "skchr_beewax_1":
        case "skchr_beewax_2":
          damagePool[1] = 0;
          log.write(`[特殊] ${displayNames[buffName]}: 伤害为0 （以上计算无效）`);
          break;
        default:
          if (b=="skill") continue; // 非技能期间，跳过其他技能的额外伤害判定
      }
    }
    switch (buffName) {
      case "tachr_129_bluep_1":
        damage = Math.max(bb.poison_damage * (1-emrpct), bb.poison_damage * 0.05);
        let total_damage = damage * dur.duration * ecount;
        if (isSkill && blackboard.id == "skchr_bluep_1" && ecount>1) {
          let damage2 = damage * blackboard.atk_scale;
          total_damage = damage * dur.duration + damage2 * 3;
          log.write(`[特殊] ${displayNames["skchr_bluep_1"]}: 副目标毒伤 ${damage2} * 3s`);
        }
        pool[1] += total_damage;
        break;
      case "tachr_181_flower_1":
        pool[2] += bb.atk_to_hp_recovery_ratio * finalFrame.atk * dur.duration * enemy.count;
        if (isSkill) log.writeNote("可以治疗召唤物");
        break;
      case "tachr_188_helage_trait":
      case "tachr_337_utage_trait":
        pool[2] += bb.value * dur.hitCount; break;
      case "tachr_2013_cerber_1":
        damage = bb.atk_scale * edef * Math.max(1-emrpct, 0.05);
        pool[1] += damage * dur.hitCount;
        break;
      // 技能
      // 伤害类
      case "skchr_ifrit_2":
        damage = basicFrame.atk * bb["burn.atk_scale"] * Math.floor(bb.duration) * (1-emrpct);
        log.write(`[特殊] ${displayNames[buffName]}: 灼烧伤害 ${damage.toFixed(1)}, 命中 ${ecount}`);
        pool[1] += damage * dur.attackCount * ecount;
        break;
      case "skchr_amgoat_2":
        damage = finalFrame.atk/2 * (1 - enemy.magicResistance / 100);
        log.write(`[特殊] ${displayNames[buffName]}: 溅射伤害 ${damage.toFixed(1)}, 命中 ${dur.attackCount * (enemy.count-1)}`);
        pool[1] += damage * dur.attackCount * (enemy.count-1);
        break;
      case "skchr_nightm_2":
        move = bb.duration / 4;
        log.writeNote(`总位移估算为${move.toFixed(1)}格`);
        pool[3] += bb.value * move * ecount;
        break;
      case "skchr_weedy_3":
        if (options.token)
          move = bb.force*bb.force/3 + bb.duration / 5;
        else
          move = bb.force*bb.force/4 + bb.duration / 5;
        log.writeNote(`总位移估算为${move.toFixed(1)}格`);
        pool[3] += bb.value * move * ecount;
        break;
      case "skchr_huang_3":
        let finishAtk = basicFrame.atk * (1 + bb.atk) * bb.damage_by_atk_scale;
        damage = Math.max(finishAtk - enemy.def, finishAtk * 0.05);
        log.write(`[特殊] ${displayNames[buffName]}: 终结伤害 = ${damage.toFixed(1)}, 命中 ${ecount}`);
        pool[0] += damage * ecount;
        break;
      case "skchr_chen_2":
        damage = finalFrame.atk * (1 - emrpct);
        pool[1] += damage * dur.hitCount;
        log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        break;
      case "skchr_bibeak_1":
        if (enemy.count > 1) {
          damage = finalFrame.atk * (1 - emrpct);
          pool[1] += damage * (enemy.count - 1);
          log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${(enemy.count-1)}`);
        }
        break;
      case "skchr_ayer_2":
        damage = finalFrame.atk * bb.atk_scale * (1 - emrpct);
        pool[1] += damage * enemy.count * dur.hitCount;
        log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${enemy.count * dur.hitCount}`);
        log.writeNote("假设断崖的当前攻击目标也被阻挡");
        break;
      case "skcom_assist_cost[2]":
      case "skcom_assist_cost[3]":
      case "skchr_myrtle_2":
      case "skchr_elysm_2":
      case "skchr_skgoat_2":
      case "skchr_utage_1":
        damagePool[0] = 0; damagePool[1] = 0;
        log.write(`[特殊] ${displayNames[buffName]}: 伤害为0 （以上计算无效）`);
        break;
      case "skchr_silent_2":
        damagePool[2] = 0;
        log.write(`[特殊] ${displayNames[buffName]}: 治疗为0 （以上计算无效）`);
        break;
      case "skchr_sddrag_2":
        damage = finalFrame.atk * bb["attack@skill.atk_scale"] * (1-emrpct);
        log.write(`[特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        pool[1] += damage * dur.hitCount;
        break;
      case "skchr_haak_2":
      case "skchr_haak_3":
        log.writeNote(`攻击队友15次(不计入自身dps)`);
        break;
      case "skchr_podego_2":
        log.write(`[特殊] ${displayNames[buffName]}: 直接伤害为0 （以上计算无效）, 效果持续${bb.projectile_delay_time}秒`);
        damage = finalFrame.atk * bb.projectile_delay_time * (1-emrpct) * enemy.count;
        pool[1] = damage; damagePool[1] = 0;
        break;
      case "skchr_beewax_2":
        if (isSkill) {
		  damage = finalFrame.atk * bb.atk_scale * (1-emrpct) * ecount;
		  pool[1] = damage;
		} 
		break;
      // 间接治疗
      case "skchr_tiger_2":
        pool[2] += damagePool[1] * bb.heal_scale; break;
      case "skcom_heal_self[1]":
      case "skcom_heal_self[2]":
        damagePool[2] = 0;
        // console.log(finalFrame);
        pool[2] += bb.heal_scale * finalFrame.maxHp; break;
      case "skchr_nightm_1":
        pool[2] += damagePool[1] * bb["attack@heal_scale"] * bb["attack@max_target"]; break;
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
        heal = finalFrame.atk * bb.atk_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 护盾量 ${heal}`);
        pool[4] += heal;
        break;
      case "skchr_cgbird_2":
        heal = finalFrame.atk * bb.atk_scale;
        log.write(`[特殊] ${displayNames[buffName]}: 护盾量 ${heal}, 命中 ${ecount}`);
        pool[4] += heal * ecount;
        break;
      case "skchr_tknogi_2":
      case "skchr_lisa_3":
        heal = finalFrame.atk * bb["attack@atk_to_hp_recovery_ratio"] * enemy.count * (dur.duration-1);
        log.write(`[特殊] ${displayNames[buffName]}: HoT ${heal.toFixed(1)}，可以治疗召唤物`);
        log.writeNote("可以治疗召唤物");
        log.writeNote("第一秒无治疗效果（待确认）");
        pool[2] += heal;
        damagePool[2] = 0; log.write("[特殊] 直接治疗为0");
        break;
    }; // switch

    // 百分比/固定回血
    let hpratiosec = bb["hp_recovery_per_sec_by_max_hp_ratio"];
    let hpsec = bb["hp_recovery_per_sec"];
    if (hpratiosec) {
      if (buffName == "tachr_344_beewax_1" && isSkill) {} else {
        pool[2] += hpratiosec * finalFrame.maxHp * (dur.duration + dur.stunDuration);
      }
    }
    if (hpsec) {
      if ((buffName == "tachr_291_aglina_2" && isSkill) || 
          (buffName == "tachr_188_helage_2" && !options.noblock)) { /* skip */ }
      else
      {
        pool[2] += hpsec * (dur.duration + dur.stunDuration);
        log.writeNote("可以治疗召唤物");
      }
    }
    // 自身血量百分比相关的治疗/伤害
    if (bb["hp_ratio"]) {
      switch (buffName) {
        case "skchr_huang_3":
        case "skchr_utage_2":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp; break;
        case "skchr_ifrit_3":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * dur.duration; break;
        case "skchr_bldsk_2":
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * bb.duration * 2; break;
        case "tachr_225_haak_trait":  // 阿-特性
          pool[2] -= bb.hp_ratio * finalFrame.maxHp * dur.duration; break;
        case "tachr_225_haak_1":
          if (options.crit) {
            heal = bb.hp_ratio * finalFrame.maxHp;
            log.write(`[特殊] ${displayNames[buffName]}: 治疗 ${heal.toFixed(1)}, 命中 ${dur.critHitCount}`);
            pool[2] += heal * dur.critHitCount; 
          }
          break;
        case "tachr_017_huang_1":
        case "skchr_ccheal_1":
        case "skchr_ccheal_2":
        case "tachr_174_slbell_1":
        case "tachr_254_vodfox_1":
        case "tachr_343_tknogi_1":
        case "tachr_405_absin_1":
          break;
        case "skchr_gravel_2":
        case "skchr_phatom_1":
          pool[4] += bb.hp_ratio * finalFrame.maxHp;
          log.write(`[特殊] ${displayNames[buffName]}: 护盾量 ${pool[4]}`);
          break;          
        default:
          pool[2] += bb.hp_ratio * finalFrame.maxHp * dur.attackCount;
      };
    }

    let dmg = pool[0] + pool[1] + pool[3];
    if (dmg > 0) log.write(`[特殊] ${displayNames[buffName]}: 额外伤害 ${dmg.toFixed(2)}`);
    if (pool[2] > 0) log.write(`[特殊] ${displayNames[buffName]}: 额外治疗 ${pool[2].toFixed(2)}`);
    else if (pool[2] < 0) log.write(`[特殊] ${displayNames[buffName]}: 自身伤害 ${pool[2].toFixed(2)}`);
    for (let i=0; i<5; ++i) extraDamagePool[i] += pool[i];
  } 

  // 整理返回
  let totalDamage = [0, 1, 3].reduce((x, y) => x + damagePool[y] + extraDamagePool[y], 0);
  let totalHeal = [2, 4].reduce((x, y) => x + damagePool[y] + extraDamagePool[y], 0);
  let extraDamage = [0, 1, 3].reduce((x, y) => x + extraDamagePool[y], 0);
  let extraHeal = [2, 4].reduce((x, y) => x + extraDamagePool[y], 0);

  log.write(`总伤害: ${totalDamage.toFixed(2)}`);
  if (totalHeal != 0) log.write(`总治疗: ${totalHeal.toFixed(2)}`);

  let dps = totalDamage / (dur.duration + dur.stunDuration);
  let hps = totalHeal / (dur.duration + dur.stunDuration);
  // 均匀化重置普攻时的普攻dps
  if (!isSkill && checkResetAttack(blackboard.id, blackboard)) {
    let d = dur.attackCount * attackTime;
    log.write(`以 ${d.toFixed(3)}s 计算普攻dps`);
    dps = totalDamage / d; hps = totalHeal / d;
  }
  log.write(`DPS: ${dps.toFixed(1)}, HPS: ${hps.toFixed(1)}`);
  log.write("----");

  return {
    atk: finalFrame.atk,
    dps,
    hps,
    dur,
    damageType,
    hitDamage,
    critDamage,
    extraDamage,
    extraHeal,
    totalDamage,
    totalHeal,
    maxTarget: ecount,
    damagePool,
    extraDamagePool,
    attackTime,
    attackCount: dur.attackCount, 
    spType: levelData.spData.spType,
  };
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
    emr:0,
    emr_scale:1,
    atk:0,
    def:0,
    attackSpeed:0,
    maxHp: 0,
    baseAttackTime:0,
    spRecoveryPerSec:0,
    applied:{}
  };
}

function getAttributes(char, log) { //charId, phase = -1, level = -1
  let charData = AKDATA.Data.character_table[char.charId];
  let phaseData = charData.phases[char.phase];
  let attributesKeyFrames = {};
  let buffs = initBuffFrame();
  let buffList = {};
  //console.log(charData);
  // 计算基础属性，包括等级和潜能
  if (char.level == charData.phases[char.phase].maxLevel) {
    attributesKeyFrames = Object.assign(attributesKeyFrames, phaseData.attributesKeyFrames[1].data);
  } else {
    AttributeKeys.forEach(key => {
      attributesKeyFrames[key] = getAttribute(phaseData.attributesKeyFrames, char.level, 1, key);
    });
  }
  if (charData.favorKeyFrames) {
    let favorLevel = Math.floor(Math.min(char.favor, 100) / 2);
    AttributeKeys.forEach(key => {
      attributesKeyFrames[key] += getAttribute(charData.favorKeyFrames, favorLevel, 0, key);
      // console.log(char.level, key, attributesKeyFrames[key]);
      buffs[key] = 0;
    });
  }
  // console.log(attributesKeyFrames);
  applyPotential(char.charId, charData, char.potentialRank, attributesKeyFrames);

  // 计算天赋/特性，记为Buff
  if (charData.trait && !charData.has_trait) {
    charData.has_trait = true;
    charData.talents.push(charData.trait);
  }
  charData.talents.forEach(talentData => {
    for (let i = talentData.candidates.length - 1; i >= 0; i--) {
      let cd = talentData.candidates[i];
      if (char.phase >= cd.unlockCondition.phase && char.level >= cd.unlockCondition.level && 
          char.potentialRank >= cd.requiredPotentialRank) {
        // 找到了当前生效的天赋
        let blackboard = getBlackboard(cd.blackboard);
        if (!cd.prefabKey) {
          cd.prefabKey = "trait";  // trait as talent
          cd.name = "特性";
        }
        let prefabKey = 'tachr_' + char.charId.slice(5) + '_' + cd.prefabKey;
        displayNames[prefabKey] = cd.name;  // add to name cache
        // bufflist处理
        buffList[prefabKey] = blackboard;
        break;
      }
    };
  });

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
  21: "respawnTime",
};

function applyPotential(charId, charData, rank, basic) {
  if (!charData.potentialRanks || charData.potentialRanks.length == 0) return;
  for (let i = 0; i < rank; i++) {
    let potentialData = charData.potentialRanks[i];
    if (!potentialData.buff) continue;
    let y = potentialData.buff.attributes.attributeModifiers[0];
    let key = PotentialAttributeTypeList[y.attributeType];
    let value = y.value;
    basic[key] += value;
  }
}

AKDATA.attributes = {
  getCharAttributes,
  calculateDps,
  calculateDpsSeries
};
