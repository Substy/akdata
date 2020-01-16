// 获取技能特判标记，存放在dps_specialtags.json中
function checkSpecs(tag, spec) {
  let specs = AKDATA.Data.dps_specialtags;
  if (!specs[tag]) return false;
  else return specs[tag][spec];
}

function getCharAttributes(char) {
  checkChar(char);
  let {
    basic,
    buffs
  } = getAttributes(char);
  let normalFrame = getBuffedAttributes(basic, buffs);
  return normalFrame;
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

  write(line) {
    this.log += line + "\n";
  }
  writeNote(line) {
    this.note += line + "\n";
  }

  toString() {
    return this.log;
  }
}

// 天赋/技能名字cache
displayNames = {};

function calculateDps(char, enemy) {
  let log = new Log();

  checkChar(char);
  enemy = enemy || {
    def: 0,
    magicResistance: 0,
    count: 1,
  };

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

  log.write(`角色: ${charId} ${charData.name}`);
  log.write(`等级: 精英 ${char.phase}, 等级 ${char.level}, 潜能 ${char.potentialRank+1}`);

  log.write(`技能: ${char.skillId} ${levelData.name} @ 等级 ${char.skillLevel+1}`);
  displayNames[char.skillId] = levelData.name;  // add to name cache

  log.write(`普攻:`);
  let normalAttack = calculateAttack(attr, enemy, false, charData, levelData, log);
  if (!normalAttack) return;

  log.write(`技能:`);
  let skillAttack = calculateAttack(attr, enemy, true, charData, levelData, log);
  if (!skillAttack) return;
 
  globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / (normalAttack.dur.duration + skillAttack.dur.duration + normalAttack.dur.stunDuration));
  globalHps = Math.round((normalAttack.totalHeal + skillAttack.totalHeal) / (normalAttack.dur.duration + skillAttack.dur.duration + normalAttack.dur.stunDuration));
  //console.log(globalDps, globalHps);
  let killTime = 0;
  // if (enemy.hp > 0) killTime = Math.ceil( enemy.count / skillAttack.maxTarget ) * enemy.hp * skillAttack.maxTarget / skillAttack.dps ;

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


// 叠加计算指定的技能/天赋效果，返回buffFrame
function applyBuff(charAttr, buffFrm, tag, blackbd, isSkill, log) {
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
  // log.write("----" + tag + "----");
  // console.log("bb", blackboard);
  // write log
  function writeBuff(text) {
    let line = ["  -"];
    if (tag == skillId) line.push("[技能]"); else line.push("[天赋]");
    if (checkSpecs(tag, "cond")) 
      if (options.cond) line.push("[触发]"); else line.push("[未触发]");
    if (checkSpecs(tag, "stack") && options.stack) line.push("[满层数]"); 
    if (checkSpecs(tag, "crit")) line.push("[暴击]");
    if (checkSpecs(tag, "ranged_penalty")) line.push("[距离惩罚]");
    
    line.push(displayNames[tag]);
    if (text) line.push("-> " + text);
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
            writeBuff(`base_attack_time: ${buffFrame.baseAttackTime.toFixed(2)}s`);
          } else {  // 攻击间隔延长 - 乘算
            buffFrame.baseAttackTime += basic.baseAttackTime * blackboard.base_attack_time;
            writeBuff(`base_attack_time: +${(basic.baseAttackTime * blackboard.base_attack_time).toFixed(2)}s`);
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
          writeBuff(`sp: +${buffFrame.spRecoveryPerSec}/s`);
          break;
        case "atk_scale":
        case "def_scale":
        case "heal_scale":
        case "damage_scale":
          buffFrame[key] *= blackboard[key];
          writeBuff(`${key}: ${blackboard[key].toFixed(2)}x`);
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
        case "edef":  // 敌人防御加算值
          buffFrame.edef += blackboard[key];
          writeBuff(`敌人防御: ${blackboard[key]}`);
          break;
        case "edef_scale": // 敌人防御乘算值
          buffFrame.edef_scale *= (1+blackboard[key]);
          writeBuff(`敌人防御: ${(buffFrame.edef_scale*100).toFixed(1)}%`);
          break;
        case "prob_override": // 计算后的暴击概率
          buffFrame.prob = blackboard[key];
          writeBuff(`概率(计算): ${Math.round(buffFrame.prob*100)}%`);
          break;
      }
    }
  }
// 特判
//----------------------------------------------------------------------------------------
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
        case "tachr_145_prove_1": // 普罗旺斯
          applyBuffDefault(); break;
        case "tachr_226_hmau_1":
          delete blackboard["heal_scale"];
          applyBuffDefault(); break;
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
        case "tachr_187_ccheal_1": // 贾维尔
          buffFrame.def += blackboard.def;
          blackboard.def = 0;
          writeBuff(`def +${buffFrame.def}`);
          break;
        case "tachr_145_prove_1":
          blackboard.prob_override = blackboard.prob2;
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
      } else if (tag == "tachr_188_helage_1") {
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
          writeBuff("抽攻击卡");
          log.writeNote("抽攻击卡");          
        } else if (skillId == "skchr_fmout_2") {
          blackboard.atk = 0;
          writeBuff("抽攻速卡");
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
        blackboard.edef = -blackboard["def_penetrate_fixed"];
        break;
      // 暴击类
      case "tachr_290_vigna_1":
        blackboard.prob_override = (isSkill ? blackboard.prob2 : blackboard.prob1);
        break;
      case "tachr_106_franka_1": // 芙兰卡
        blackboard.edef_scale = -1;
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
      // ---- 技能 ----
      case "skchr_swllow_1":
      case "skchr_helage_1":
      case "skchr_helage_2":
      case "skchr_excu_2":
        buffFrame.times = 2;
        writeBuff(`攻击次数 = ${buffFrame.times}`);
        break;
      case "skchr_texas_2":
        buffFrame.times = 2;
        buffFrame.maxTarget = 999;
        writeBuff(`攻击次数 = ${buffFrame.times} 最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_swllow_2":
        buffFrame.times = 3;
        writeBuff(`攻击次数 = ${buffFrame.times}`);
        break;
      case "skchr_milu_2":  // 守林(茂名版)
        buffFrame.times = blackboard.max_cnt;
        writeBuff(`核弹数量 ${buffFrame.times} (假设全中)`);
        buffFrame.maxTarget = 999;
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
        buffFrame.maxTarget = 999;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_durnar_2":
        buffFrame.maxTarget = 3;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_huang_3":
        blackboard.atk /= 2;
        buffFrame.maxTarget = 999;
        writeBuff(`avg atk + ${blackboard.atk}x, 最大目标数 = ${buffFrame.maxTarget}`);
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
        buffFrame.maxTarget = 2;
        writeBuff(`最大目标数 = ${buffFrame.maxTarget}`);
        break;
      case "skchr_deepcl_1":
      case "skchr_sora_2":
        blackboard.atk = 0; // 不增加本体攻击
        blackboard.def = 0;
        break;
      case "skchr_swire_1":
        blackboard.atk = 0; // 1技能不加攻击
        break;
      case "skchr_excu_1":
        buffFrame.atk_scale = 1.5;
        writeBuff("atk_scale = 1.5");
        break;
      case "skchr_ccheal_2": // hot记为额外治疗，不在这里计算
      case "skchr_ccheal_1":
        delete blackboard["heal_scale"];
        break;
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
          writeBuff(`不降低攻击力`);
        }
        break;
      case "skchr_svrash_2":
      case "skchr_svrash_3":
        if (options.ranged_penalty) {
          buffFrame.atk_scale = 1;
          writeBuff(`不降低攻击力`);
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
function extractDamageType(charData, charId, isSkill, skillDesc, skillBlackboard) {
  let skillId = skillBlackboard.id;
  let ret = 0;
  if (charData.profession == "MEDIC")
    ret = 2;
  else if (charData.description.includes('法术伤害') && charId != "char_260_durnar") {
    ret = 1;
  }
  if (isSkill) {
    if (["法术伤害", "<@ba.vup>法术</>伤害", "伤害类型变为"].some(x => skillDesc.includes(x)))
      ret = 1;
    else if (["治疗", "恢复", "每秒回复"].some(x => skillDesc.includes(x)) && 
             !skillBlackboard["hp_recovery_per_sec_by_max_hp_ratio"]) {
      ret = 2;
    }
    // special character/skill overrides
    ret = checkSpecs(charId, "damage_type") || checkSpecs(skillId, "damage_type") || ret;
  }  
  return ~~ret;
}

// 重置普攻判定
function checkResetAttack(key, blackboard) {
  return (checkSpecs(key, "reset_attack") || 
          blackboard['base_attack_time'] || blackboard['attack@max_target'] ||
          blackboard['max_target']);
}

// 计算攻击次数和持续时间
function calcDurations(isSkill, attackTime, levelData, buffList, buffFrame, enemyCount, log) {
  let blackboard = buffList.skill;
  let skillId = blackboard.id;
  let spData = levelData.spData;
  let duration = 0;
  let attackCount = 0;
  let stunDuration = 0;

  const spTypeTags = {
    1: "time",
    2: "attack",
    4: "hit",
    8: "special"
  };
  let tags = [spTypeTags[spData.spType]];  // 技能类型标记

  if (isSkill) { 
    // 快速估算
    attackCount = Math.ceil(levelData.duration / attackTime);
    duration = attackCount * attackTime;
    // 重置普攻
    if (checkResetAttack(skillId, blackboard)) {
      duration = levelData.duration;
      log.write('  - 可能重置普攻');
    }
    // 技能类型
    if (levelData.description.includes("持续时间无限")) {
      attackCount = Math.ceil(1800 / attackTime);
      duration = attackCount * attackTime;
      tags.push("infinity"); log.write("  - 持续时间无限 (记为1800s)"); log.writeNote("持续时间无限 (记为1800s)");
    } else if (spData.spType == 8) {
      if (levelData.duration <= 0 && blackboard.duration > 0) {
        // 砾的技能也是落地点火，但是持续时间在blackboard里
        levelData.duration = blackboard.duration;
      }
      if (levelData.duration > 0) { // 自动点火
        tags.push("auto"); log.write('  - 落地点火');
      } else if (checkSpecs(skillId, "passive")) { // 被动
        attackCount = 1;
        duration = attackTime;
        tags.push("passive"); log.write("  - 被动");
      } else {  // 摔炮
        attackCount = 1;
        duration = 0;
        tags.push("auto", "instant"); log.write("  - 落地点火, 瞬发")
      }
    } else if (levelData.duration <= 0) { 
      if (checkSpecs(skillId, "instant_buff")) { // 瞬发的有持续时间的buff，例如血浆
        duration = blackboard.duration;
        attackCount = Math.ceil(duration / attackTime);
        tags.push("instant", "buff"); log.write("  - 瞬发增益效果");
      } else { // 普通瞬发
        attackCount = 1;
        duration = attackTime;
        tags.push("instant"); log.write("  - 瞬发");
        // 施法时间
        if (checkSpecs(skillId, "cast_time")) {
          let ct = checkSpecs(skillId, "cast_time");
          if (duration < ct) {
            log.write(`  - [特殊] 技能释放时间: ${ct}s`);
            log.writeNote(`施法时间 ${ct}s`);
            duration = ct;
          }
        }
      }
    }
    // 特判
    if (skillId == "skchr_yuki_2") {
      attackCount = Math.ceil(attackCount / 3) * 3;
      log.write(`  - [特殊] ${displayNames["skchr_yuki_2"]}: 攻击有效时间 = ${attackCount} s`);
    } else if (skillId == "skchr_huang_3") {
      attackCount -= 2;
      log.write(`  - [特殊] ${displayNames["skchr_huang_3"]}: 实际攻击 ${attackCount}段+终结`);
    }
  } else { // 普攻
    // 眩晕处理
    if (skillId == "skchr_fmout_2") {
      stunDuration = blackboard.time;
    } else if (["skchr_amiya_2", "skchr_liskam_2", "skchr_ghost_2", "skchr_broca_2"].includes(skillId)) {
      stunDuration = blackboard.stun;
    }
    if (stunDuration > 0) log.write(`  - 晕眩: ${stunDuration}s`);
    
    // 快速估算
    let attackDuration = spData.spCost / (1 + buffFrame.spRecoveryPerSec) - stunDuration;
    // 施法时间
    if (checkSpecs(skillId, "cast_time")) {
      let ct = checkSpecs(skillId, "cast_time");
      if (attackTime > ct) {
        attackDuration -= (attackTime - ct);
        log.write(`  - [特殊] 技能释放时间: ${ct}s, 普攻时间偏移 ${(ct - attackTime).toFixed(1)}s (${attackDuration.toFixed(1)}s)`);
        log.writeNote(`施法时间 ${ct}s`);
      }
    }

    attackCount = Math.ceil(attackDuration / attackTime);
    duration = attackCount * attackTime;
    // 重置普攻
    if (checkResetAttack(skillId, blackboard)) {
      duration = spData.spCost / (1 + buffFrame.spRecoveryPerSec);
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
          log.write(`  - [特殊] 落地点火 - 取普攻时间=技能持续时间`);
          log.writeNote("取普攻时间=技能持续时间");
          attackDuration = levelData.duration;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
        } else if (checkSpecs(skillId, "passive")) { // 被动
          attackCount = 10;
          duration = attackCount * attackTime;
          tags.push("passive");
          log.write(`  - [特殊] 被动 - 以10次普攻计算`);
          log.writeNote("以10次普攻计算");
        } else {
          attackDuration = 10;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
          tags.push("auto", "instant");
          log.write(`  - [特殊] 落地点火/瞬发 - 以10s普攻计算`);
          log.writeNote("以10s普攻计算");
        }
        break;
      case 4: // 受击回复
        log.write(`  - 受击回复`);
        break;
      case 2: // 攻击恢复
        log.write(`  - 攻击回复`);
        attackCount = spData.spCost;
        if (buffList["tachr_010_chen_1"]) { // 呵斥 
          attackCount = Math.ceil(spData.spCost / (1 + attackTime / buffList["tachr_010_chen_1"].interval));
          let sp = Math.floor(attackCount * attackTime / buffList["tachr_010_chen_1"].interval);
          log.write(`  - [特殊] ${displayNames["tachr_010_chen_1"]}: sp = ${sp}, attack_count = ${attackCount}`);
        }
        duration = attackCount * attackTime;
        if (checkResetAttack(skillId, blackboard)) {
          duration -= attackTime;
        }
        break;
      case 1: // 普通，前面已经算过一遍了，这里只特判
        if (buffList["tachr_002_amiya_1"]) { // 情绪吸收
          attackCount = Math.ceil((spData.spCost - stunDuration) / (buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"] + attackTime));
          log.write(`  - [特殊] ${displayNames["tachr_002_amiya_1"]}: attack sp = ${attackCount * buffList["tachr_002_amiya_1"]["amiya_t_1[atk].sp"]}`);
          duration = attackCount * attackTime;
        } else if (buffList["tachr_134_ifrit_2"]) { // [莱茵回路]. 需要解出攻击次数
          let i = buffList["tachr_134_ifrit_2"].interval;
          let isp = i + buffList["tachr_134_ifrit_2"].sp;
          let recoverCount = Math.ceil((spData.spCost - i) / isp); // recoverCount >= (spCost - i) / isp
          let r = spData.spCost - recoverCount * isp;
          attackDuration = recoverCount * i + r;
          attackCount = Math.ceil(attackDuration / attackTime);
          //console.log(i, isp, recoverCount, r, attackDuration, attackCount);
          duration = attackDuration;
          log.write(`  - [特殊] ${displayNames["tachr_134_ifrit_2"]}: sp + ${recoverCount * buffList["tachr_134_ifrit_2"].sp}`); 
        } else if (checkSpecs(skillId, "instant_buff")) { // 不稳定血浆: 减去buff持续时间
          attackDuration -= blackboard.duration;
          attackCount = Math.ceil(attackDuration / attackTime);
          duration = attackCount * attackTime;
        }
        break;
        // todo: cast time
    } // switch
  } // else

  // 计算实际命中次数
  // attackCount = 发动攻击的次数(swings), hitCount = 命中敌人的次数(hits)
  let hitCount = attackCount * buffFrame.times * enemyCount;
  // 蓝毒2
  if (isSkill) {
    if (skillId == "skchr_bluep_2") {
      hitCount += attackCount * (blackboard["attack@times"] - 1);
    }
  }

  return {
    attackCount,
    times: buffFrame.times,
    hitCount,
    duration,
    stunDuration,
    tags
  };
}

function calculateAttack(charAttr, enemy, isSkill, charData, levelData, log) {
  let charId = charAttr.char.charId;
  let buffList = charAttr.buffList;
  let blackboard = buffList.skill;
  let basicFrame = charAttr.basic;
  let options = charAttr.char.options;

  // 计算面板属性
  //log.write("---- Buff ----");
  let buffFrame = initBuffFrame();
  for (var b in buffList) {
    let buffName = (b=="skill") ? buffList[b].id : b;
    //console.log(buffName);
    if (!checkSpecs(buffName, "crit"))
      buffFrame = applyBuff(charAttr, buffFrame, b, buffList[b], isSkill, log);
  }

  // 攻击类型
  let damageType = extractDamageType(charData, charId, isSkill, levelData.description, blackboard);
  if (damageType == 2)
    buffFrame.atk_scale *= buffFrame.heal_scale;
  // 灰喉-特判
  if (buffList["tachr_367_swllow_1"]) {
    buffFrame.attackSpeed += buffList["tachr_367_swllow_1"].attack_speed;
    log.write(`  - [特殊] ${displayNames["tachr_367_swllow_1"]} - attack_speed + ${buffFrame.attackSpeed}`);
  }
  // 陈特判
  if (charId == 'char_010_chen' && !isSkill) {
    buffFrame.times = 2;
    log.write("  - [特殊] 陈 - 攻击2次");
  }

  let finalFrame = getBuffedAttributes(basicFrame, buffFrame);
  let critBuffFrame = JSON.parse(JSON.stringify(buffFrame));  // deep copy?
  let critFrame = {};
  // 暴击面板
  if (options.crit) {
    for (var b in buffList) {
      let buffName = (b=="skill") ? blackboard.id : b;
      if (checkSpecs(buffName, "crit"))
        critBuffFrame = applyBuff(charAttr, critBuffFrame, b, buffList[b], isSkill, log);
    }
    critFrame = getBuffedAttributes(basicFrame, critBuffFrame);
  }
  // ---- 计算攻击参数
  // 最大目标数
  if (charData.description.includes("阻挡的<@ba.kw>所有敌人")) {
    buffFrame.maxTarget = basicFrame.blockCnt;
  } else if (["所有敌人", "群体法术伤害", "群体物理伤害"].some(kw => charData.description.includes(kw))) {
    buffFrame.maxTarget = 999;
  } else if (charData.description.includes("恢复三个") &&
             !(isSkill && charId == "char_275_breeze"))
    buffFrame.maxTarget = 3;
  // 计算最终攻击间隔，考虑fps修正
  let fps = 30;
  let realAttackTime = finalFrame.baseAttackTime / finalFrame.attackSpeed * 100;
  let frameAttackTime = Math.ceil(realAttackTime * fps) / fps;
  let attackTime = frameAttackTime;

  // 根据最终攻击间隔，重算攻击力
  if (isSkill && blackboard.id == "skchr_platnm_2") { // 白金
    let rate = (attackTime - 1) / (buffList["tachr_204_platnm_1"]["attack@max_delta"] - 1);
    buffFrame.atk_scale = 1 + rate * (buffList["tachr_204_platnm_1"]["attack@max_atk_scale"] - 1);
    finalFrame = getBuffedAttributes(basicFrame, buffFrame); // 重算
    log.write(`  - [特殊] ${displayNames["tachr_204_platnm_1"]}: atk_scale = ${buffFrame.atk_scale}`);
  } else if (buffList["tachr_215_mantic_1"] && attackTime >= buffList["tachr_215_mantic_1"].delay) { // 狮蝎
    let atk = basicFrame.atk * buffList["tachr_215_mantic_1"].atk;
    log.write(`  - [特殊] ${displayNames["tachr_215_mantic_1"]}: atk + ${atk}`);
    finalFrame.atk += atk;
    buffFrame.atk = finalFrame.atk - basicFrame.atk;
  }

  // 敌人属性
  let enemyBuffFrame = JSON.parse(JSON.stringify(buffFrame));
  // 处理对普攻也生效的debuff
  for (var b in buffList) {
    let buffName = (b=="skill") ? buffList[b].id : b;
    if (checkSpecs(buffName, "keep_debuff") && !enemyBuffFrame.applied[buffName]){
      log.write("  - 假设全程覆盖Debuff");
      log.writeNote("假设全程覆盖Debuff");      
      enemyBuffFrame = applyBuff(charAttr, enemyBuffFrame, buffName, buffList[b], true, new Log());
    }
  }
  let edef = Math.max(0, (enemy.def + enemyBuffFrame.edef) * enemyBuffFrame.edef_scale);
  let emr = Math.max(0, (enemy.magicResistance + enemyBuffFrame.emr) * enemyBuffFrame.emr_scale);
  let emrpct = emr / 100;
  let ecount = Math.min(buffFrame.maxTarget, enemy.count);

  // 计算攻击次数和持续时间
  let dur = calcDurations(isSkill, attackTime, levelData, buffList, buffFrame, ecount, log);
  // 暴击次数
  if (options.crit) {
    if (damageType != 2) {
      if (buffList["tachr_155_tiger_1"])
        dur.critCount = dur.duration / 3 * critBuffFrame.prob;
      else
        dur.critCount = dur.attackCount * critBuffFrame.prob;

      if (dur.critCount > 1) dur.critCount = Math.floor(dur.critCount);
      // 折算为命中次数
      dur.hitCount = (dur.attackCount - dur.critCount) * dur.times * ecount;
      dur.critHitCount = dur.critCount * dur.times * ecount;
    } else {
      dur.critCount = 0; dur.critHitCount = 0;
    }
  }

  //console.log(finalFrame, dur);
  // 输出面板数据
  //log.write("---- 最终面板 ----");
  let atk_line = `(${basicFrame.atk} + ${buffFrame.atk.toFixed(1)}) * ${buffFrame.atk_scale.toFixed(2)}`;
  if (buffFrame.damage_scale != 1) { atk_line += ` * ${buffFrame.damage_scale.toFixed(2)}`; }
  log.write(`  - 攻击力 / 倍率:  ${finalFrame.atk.toFixed(2)} = ${atk_line}`);
  log.write(`  - 攻速: ${finalFrame.attackSpeed} %`);
  log.write(`  - 攻击间隔: ${finalFrame.baseAttackTime.toFixed(3)} s`);
  log.write(`  - 最终攻击间隔 / FPS修正: ${realAttackTime.toFixed(3)} s (${frameAttackTime.toFixed(3)} s)`);
  log.write(`  - 持续: ${dur.duration.toFixed(1)} s`);
  log.write(`  - 攻击次数: ${dur.attackCount*dur.times} (${dur.times} 连击 x ${dur.attackCount}) (不计前摇)`);
  if (edef != enemy.def)
    log.write(`  - 敌人防御: ${edef.toFixed(1)} (${(edef-enemy.def).toFixed(1)})`);
  if (emr != enemy.magicResistance) {
    rate = (emr-enemy.magicResistance)/enemy.magicResistance;
    log.write(`  - 敌人魔抗: ${emr.toFixed(1)}% (${(rate*100).toFixed(1)}%)`);
  }
  if (ecount > 1 || enemy.count > 1)
    log.write(`  - 目标数: ${ecount} / ${enemy.count}`);

  // 计算伤害
  //log.write("----");
  log.write(`  - 伤害类型: ${['物理','法术','治疗','真伤'][damageType]}`);
  let dmgPrefix = (damageType == 2) ? "治疗" : "伤害";
  let hitDamage = finalFrame.atk;
  let critDamage = 0;
  let damagePool = [0, 0, 0, 0, 0]; // 物理，魔法，治疗，真伤，盾
  let extraDamagePool = [0, 0, 0, 0, 0];

  function calculateHitDamage(frame) {
    let minRate = (buffList["tachr_144_red_1"] ? buffList["tachr_144_red_1"].atk_scale : 0.05);
    if (damageType == 0)
      ret = Math.max(frame.atk - edef, frame.atk * minRate);
    else if (damageType == 1)
      ret = Math.max(frame.atk * (1-emrpct), frame.atk * minRate); 
    else 
      ret = frame.atk;
    if (ret <= frame.atk * minRate) log.write("  - [抛光]");
    return ret;
  }
  
  hitDamage = calculateHitDamage(finalFrame);
  damagePool[damageType] += hitDamage * dur.hitCount;
  log.write(`  - ${dmgPrefix}: ${hitDamage.toFixed(2)}, 命中 ${dur.hitCount.toFixed(1)}`);
  
  // 计算额外伤害
  // 暴击
  if (options.crit) {
    // console.log(critBuffFrame);
    edef = Math.max(0, (enemy.def + critBuffFrame.edef) * critBuffFrame.edef_scale);
    critDamage = calculateHitDamage(critFrame);
    if (critDamage > 0) {
      log.write(`  - 暴击${dmgPrefix}: ${critDamage.toFixed(2)}, 命中 ${dur.critHitCount.toFixed(1)}`);
    }
    damagePool[damageType] += critDamage * dur.critHitCount;
  }
  // 空(被动治疗没有写在天赋中)
  if (charId == "char_101_sora") {
    let ratio_sora = 0.1;
    if (isSkill && blackboard.id == "skchr_sora_1")
      ratio_sora = blackboard["attack@atk_to_hp_recovery_ratio"];
    extraDamagePool[2] = ratio_sora * finalFrame.atk * dur.duration;
    damagePool[0] = 0; log.write("  - [特殊] 伤害为0");
  }
  // 反射类-增加说明
  if (checkSpecs(blackboard.id, "reflect") && isSkill) {
    log.writeNote(`技能伤害为反射 ${dur.attackCount} 次的伤害`);
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
          damagePool[1] = 0;
          log.write(`  - [特殊] ${displayNames[buffName]}: 伤害为0`);
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
          log.write(`  - [特殊] ${displayNames["skchr_bluep_1"]}: 副目标毒伤 ${damage2} * 3s`);
        }
        pool[1] += total_damage;
        break;
      case "tachr_181_flower_1":
        pool[2] += bb.atk_to_hp_recovery_ratio * finalFrame.atk * dur.duration * ecount; break;
      case "tachr_188_helage_trait":
        pool[2] += bb.value * dur.hitCount; break;
      // 技能
      // 伤害类
      case "skchr_ifrit_2":
        damage = basicFrame.atk * bb["burn.atk_scale"] * Math.floor(bb.duration) * (1-emrpct);
        log.write(`  - [特殊] ${displayNames[buffName]}: 灼烧伤害 ${damage.toFixed(1)}, 命中 ${ecount}`);
        pool[1] += damage * dur.attackCount * ecount;
        break;
      case "skchr_amgoat_2":
        damage = finalFrame.atk/2 * (1 - enemy.magicResistance / 100);
        log.write(`  - [特殊] ${displayNames[buffName]}: 溅射伤害 ${damage.toFixed(1)}, 命中 ${dur.attackCount * (enemy.count-1)}`);
        pool[1] += damage * dur.attackCount * (enemy.count-1);
        break;
      case "skchr_nightm_2":
        let move = bb.duration / 4;
        log.write(`  - [特殊] ${displayNames[buffName]}: 移动距离估算 = ${move.toFixed(1)}`);
        pool[3] += bb.value * move * ecount;
        break;
      case "skchr_huang_3":
        let finishAtk = basicFrame.atk * (1 + bb.atk) * bb.damage_by_atk_scale;
        damage = Math.max(finishAtk - enemy.def, finishAtk * 0.05);
        log.write(`  - [特殊] ${displayNames[buffName]}: 终结伤害 = ${damage.toFixed(1)}, 命中 ${ecount}`);
        pool[0] += damage * ecount;
        break;
      case "skchr_chen_2":
        damage = finalFrame.atk * (1 - emrpct);
        pool[1] += damage * dur.hitCount;
        log.write(`  - [特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        break;
      case "skcom_assist_cost[2]":
      case "skchr_myrtle_2":
      case "skchr_skgoat_2":
        damagePool[0] = 0; damagePool[1] = 0;
        log.write(`  - [特殊] ${displayNames[buffName]}: 伤害为0`);
        break;
      case "skchr_silent_2":
        damagePool[2] = 0;
        log.write(`  - [特殊] ${displayNames[buffName]}: 治疗为0`);
        break;
      case "skchr_sddrag_2":
        damage = finalFrame.atk * bb["attack@skill.atk_scale"] * (1-emrpct);
        log.write(`  - [特殊] ${displayNames[buffName]}: 法术伤害 = ${damage.toFixed(1)}, 命中 ${dur.hitCount}`);
        pool[1] += damage * dur.hitCount;
        break;
      case "skchr_haak_2":
      case "skchr_haak_3":
        log.write(`  - [特殊] 用500的攻击力攻击队友15次(不计入自身dps)`);
        log.writeNote(`攻击队友15次(不计入自身dps)`);
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
      case "skchr_breeze_2":
        damage = finalFrame.atk/2 ;
        log.write(`  - [特殊] ${displayNames[buffName]}: 溅射治疗 ${damage.toFixed(1)}, 命中 ${dur.attackCount * (enemy.count-1)}`);
        pool[2] += damage * dur.attackCount * (enemy.count-1);
        break;
      case "skchr_ccheal_1":
        heal = finalFrame.atk * bb.heal_scale * bb.duration;
        log.write(`  - [特殊] ${displayNames[buffName]}: HoT ${heal.toFixed(1)}`);
        pool[2] += heal;
        break;
      case "skchr_ccheal_2":
        heal = finalFrame.atk * bb.heal_scale * bb.duration;
        log.write(`  - [特殊] ${displayNames[buffName]}: HoT ${heal.toFixed(1)}, 命中 ${enemy.count}`);
        pool[2] += heal * enemy.count;
        break;
      case "skchr_shining_2":
        heal = finalFrame.atk * bb.atk_scale;
        log.write(`  - [特殊] ${displayNames[buffName]}: 护盾量 ${heal}`);
        pool[4] += heal;
        break;
      case "skchr_cgbird_2":
        heal = finalFrame.atk * bb.atk_scale;
        log.write(`  - [特殊] ${displayNames[buffName]}: 护盾量 ${heal}, 命中 ${ecount}`);
        pool[4] += heal * ecount;
        break;
    }; // switch

    // 百分比/固定回血
    let hpratiosec = bb["hp_recovery_per_sec_by_max_hp_ratio"];
    let hpsec = bb["hp_recovery_per_sec"];
    if (hpratiosec) {
      pool[2] += hpratiosec * finalFrame.maxHp * dur.duration;
    }
    if (hpsec) {
      if ((buffName == "tachr_291_aglina_2" && isSkill) || 
          (buffName == "tachr_188_helage_2" && !options.noblock)) { /* skip */ }
      else
        pool[2] += hpsec * dur.duration;
    }
    // 自身血量百分比相关的治疗/伤害
    if (bb["hp_ratio"]) {
      switch (buffName) {
        case "skchr_huang_3":
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
            log.write(`  - [特殊] ${displayNames[buffName]}: 治疗 ${heal.toFixed(1)}, 命中 ${dur.critHitCount}`);
            pool[2] += heal * dur.critHitCount; 
          }
          break;
        case "tachr_017_huang_1":
        case "skchr_ccheal_1":
        case "skchr_ccheal_2":
        case "tachr_174_slbell_1":
          break;
        case "skchr_gravel_2":
          pool[4] += bb.hp_ratio * finalFrame.maxHp;
          log.write(`  - [特殊] ${displayNames[buffName]}: 护盾量 ${pool[4]}`);
          break;
        default:
          pool[2] += bb.hp_ratio * finalFrame.maxHp * dur.attackCount;
      };
    }

    let dmg = pool[0] + pool[1] + pool[3];
    if (dmg > 0) log.write(`  - [特殊] ${displayNames[buffName]}: 额外伤害 ${dmg.toFixed(2)}`);
    if (pool[2] > 0) log.write(`  - [特殊] ${displayNames[buffName]}: 额外治疗 ${pool[2].toFixed(2)}`);
    else if (pool[2] < 0) log.write(`  - [特殊] ${displayNames[buffName]}: 自身伤害 ${pool[2].toFixed(2)}`);
    for (let i=0; i<5; ++i) extraDamagePool[i] += pool[i];
  } 

  // 整理返回
  let totalDamage = [0, 1, 3].reduce((x, y) => x + damagePool[y] + extraDamagePool[y], 0);
  let totalHeal = [2, 4].reduce((x, y) => x + damagePool[y] + extraDamagePool[y], 0);
  let extraDamage = [0, 1, 3].reduce((x, y) => x + extraDamagePool[y], 0);
  let extraHeal = [2, 4].reduce((x, y) => x + extraDamagePool[y], 0);
  let dps = totalDamage / dur.duration;
  let hps = totalHeal / dur.duration;
  log.write(`  - 总伤害: ${totalDamage.toFixed(2)}`);
  if (hps != 0) log.write(`  - 总治疗: ${totalHeal.toFixed(2)}`);
  log.write(`  - DPS: ${dps.toFixed(1)}, HPS: ${hps.toFixed(1)}`);
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

  // 计算基础属性，包括等级和潜能
  if (char.level == charData.phases[char.phase].maxLevel) {
    attributesKeyFrames = Object.assign(attributesKeyFrames, phaseData.attributesKeyFrames[1].data);
  } else {
    AttributeKeys.forEach(key => {
      attributesKeyFrames[key] = getAttribute(phaseData.attributesKeyFrames, char.level, 1, key);
    });
  }
  let favorLevel = Math.floor(Math.min(char.favor, 100) / 2);
  AttributeKeys.forEach(key => {
    attributesKeyFrames[key] += getAttribute(charData.favorKeyFrames, favorLevel, 0, key);
    buffs[key] = 0;
  });

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
        if (checkSpecs(prefabKey, "todo")) log.write('[BUG] 天赋效果在调整中或有Bug，结果仅供参考');
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
  final.atk *= buffs.damage_scale;
  return final;
}

function getAttribute(frames, level, minLevel, attr) {
  return Math.ceil((level - minLevel) / (frames[1].level - frames[0].level) * (frames[1].data[attr] - frames[0].data[attr]) + frames[0].data[attr]);
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
}
