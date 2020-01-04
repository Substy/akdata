function getCharAttributes(char) {
  checkChar(char);
  let {
    basic,
    buffs
  } = getAttributes(char);
  let normalFrame = getBuffedAttributes(basic, buffs, false);
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
  }

  write(line) {
    this.log += line + "\n";
  }

  toString() {
    return this.log;
  }
}

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
  let blackboard = getBlackboard(levelData.blackboard);
 // console.log(blackboard);
  log.write(`角色: ${charId} ${charData.name}`);
  log.write(`等级: 精英 ${char.phase}, 等级 ${char.level}, 潜能 ${char.potentialRank+1}`);

  let {
    basic: basicFrame,
    buffs: buffFrame
  } = getAttributes(char, log);

  if (charData.description.includes('所有敌人') ||
  charData.description.includes('群体法术伤害') ||
  charData.description.includes('群体物理伤害') ) {
    buffFrame.maxTarget = 999;
  }
  log.write(`技能: ${char.skillId} ${levelData.name} @ 等级 ${char.skillLevel+1}`);
  log.write(`普攻:`);
  let normalAttack = calculateAttack(charId, charData, basicFrame, buffFrame, enemy, false, char.cond, char.crit, skillData, levelData, Object.assign({}, blackboard), log);
  if (!normalAttack) return;

  log.write(`技能:`);
  let skillAttack = calculateAttack(charId, charData, basicFrame, buffFrame, enemy, true, char.cond, char.crit, skillData, levelData, Object.assign({}, blackboard), log);
  if (!skillAttack) return;

  globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / (normalAttack.duration + skillAttack.duration + normalAttack.stunDuration));

  let killTime = 0;
  if (enemy.hp > 0) killTime = Math.ceil( enemy.count / skillAttack.maxTarget ) * enemy.hp * skillAttack.maxTarget / skillAttack.dps ;

  return {
    normal: normalAttack,
    skill: skillAttack,

    killTime: killTime,
    globalDps: skillAttack.spType >= 4 ? '-' : Math.round(globalDps), // 受击/被动不计算平均dps

    log: log.toString(),
  };
}

function calculateAttack(charId, charData, basicFrame, buffFrame, enemy, isSkill, isCond, isCrit, skillData, levelData, blackboard, log) {
  function write(text, ...params) {
    log.write(`  - ${text}: ${params.join(', ')}`);
  }

  buffFrame.emr = enemy.magicResistance;

  let damageType = 0;
  if (charData.profession == "MEDIC") {
    damageType = 2;
    // console.log(buffFrame, blackboard);
  } else if (charData.description.includes('法术伤害') && charId != "char_260_durnar") {
    damageType = 1;
  }

  // Hardcode talents
  function writeTalent(key, ...params) {
    write(key, ...params.map(x => `${x}=${buffFrame[key][x]}`));
  }
  if (false) { //
  } else if (buffFrame["tachr_174_slbell_1"] && isCond) { // 虚弱化, 攻击范围内的敌人生命少于40%时，其受到的伤害提升至133%<@ba.talpu>（+3%）</>, {"hp_ratio":0.4,"damage_scale":1.33}
    buffFrame.damage_scale = buffFrame["tachr_174_slbell_1"].damage_scale;
    writeTalent("tachr_174_slbell_1", 'damage_scale');
  } else if (buffFrame["tachr_185_frncat_1"]) { // 连击, 攻击时有23%<@ba.talpu>（+3%）</>的几率连续攻击两次, {"prob":0.23}
    buffFrame.times = 1 + buffFrame["tachr_185_frncat_1"].prob;
    writeTalent("tachr_185_frncat_1", 'prob');
  } else if (buffFrame["tachr_118_yuki_1"]) {
    buffFrame.atk = basicFrame.atk * buffFrame["tachr_118_yuki_1"].atk;
    buffFrame.baseAttackTime = buffFrame["tachr_118_yuki_1"].base_attack_time;
    writeTalent("tachr_118_yuki_1", "atk", "base_attack_time");
  } else if (buffFrame["tachr_279_excu_1"]) { // 终结改装 / 角色特性
    write(`tachr_279_excu_1: def_penetrate_fixed = ${buffFrame["tachr_279_excu_1"].def_penetrate_fixed}, atk_scale = ${buffFrame.atk_scale}`);
  } else if (buffFrame["tachr_298_susuro_1"] && isCond) { // 苏苏洛
    buffFrame.atk_scale = buffFrame["tachr_298_susuro_1"].heal_scale;
    writeTalent("tachr_298_susuro_1", "heal_scale");
  } else if (buffFrame["tachr_144_red_1"]) {
    buffFrame.atk_scale = 1;
    write(`tachr_144_red_1: min_atk_scale = ${buffFrame["tachr_144_red_1"].atk_scale}`);
  } else if (buffFrame["tachr_215_mantic_1"]) {
    buffFrame.atk = 0;
  } else if (buffFrame["tachr_348_ceylon_1"]) { // 锡兰
    // yj手癌警告
    buffFrame.atk = isCond ? buffFrame["tachr_348_ceylon_1"]['celyon_t_1[map].atk'] : buffFrame["tachr_348_ceylon_1"]['ceylon_t_1[common].atk'];
    write(`tachr_348_ceylon_1 水地形: ${isCond}, 不计算距离惩罚`);
    buffFrame.atk *= basicFrame.atk;
  } else if (skillData.skillId == "skchr_nightm_1") {
    buffFrame.atk = 0;
  }

  if (!isSkill && charId == 'char_010_chen') {
    buffFrame.times += 1;
    log.write(`  - [特殊] char_010_chen: times=2`);
  } else if (isSkill && skillData.skillId == "skchr_swllow_1") { 
    buffFrame.times = 2;
  } else if (isSkill && skillData.skillId == "skchr_swllow_2") { 
    buffFrame.times = 3;
  } 

  // Skill
  // 攻击类型判定
  if (isSkill) {
  if ((["法术伤害", "<@ba.vup>法术</>伤害", "伤害类型变为"].some(x => levelData.description.includes(x)) || charId == "char_260_durnar") &&
      charId != "char_202_demkni") {
      if (skillData.skillId != "skchr_sddrag_2") damageType = 1;
    } else if (["治疗", "恢复", "每秒回复"].some(x => levelData.description.includes(x))) {
      if (!(["skchr_estell_2", "skchr_yak_1", "skchr_deepcl_1", "skchr_hpsts_2"].includes(skillData.skillId)) &&
          !blackboard["hp_recovery_per_sec_by_max_hp_ratio"]) {
        damageType = 2;
        console.log("Heal", blackboard);
        if (blackboard.heal_scale) blackboard.atk_scale = blackboard.heal_scale;
        if (blackboard["attack@heal_scale"]) blackboard.atk_scale = blackboard["attack@heal_scale"];
      }
    } else if (skillData.skillId == "skchr_amiya_3") { 
      damageType = 3; // 真实伤害
    }

    if (false) { //
    } else if (levelData.prefabId == "skchr_texas_2") {
      buffFrame.times = 2;
      write('skchr_texas_2', 'times = 2');
    } else if (levelData.prefabId == "skchr_slbell_1") {
      delete blackboard.attack_speed;
    } else if (levelData.prefabId == "skchr_amgoat_1") {
      buffFrame.atk += basicFrame.atk * blackboard['amgoat_s_1[b].atk'];
      buffFrame.attackSpeed += blackboard['amgoat_s_1[b].attack_speed'];
      write('skchr_amgoat_1', `atk = ${blackboard['amgoat_s_1[b].atk']}, attackSpeed = ${blackboard['amgoat_s_1[b].attack_speed']}`);
    } else if (levelData.prefabId == "skchr_ifrit_3") {
      buffFrame.emr += blackboard['magic_resistance'];
      write('skchr_ifrit_3', `enemyMagicResistance = ${blackboard['magic_resistance']}`);
    } else if (levelData.prefabId == "skchr_helage_1" || levelData.prefabId == "skchr_helage_2") {
      buffFrame.times = 2;
    } else if (levelData.prefabId == "skchr_amgoat_2") {
      buffFrame.maxTarget = 99999;
    } else if (levelData.prefabId == "skchr_bluep_2") {
      //delete blackboard['attack@times'];
      buffFrame.maxTarget += 2;
    } else if (levelData.prefabId == "skchr_whitew_2" || levelData.prefabId == "skchr_bluep_1") {
      buffFrame.maxTarget += 1;
    } else if (skillData.skillId == "skchr_swire_1" || skillData.skillId == "skchr_swire_2") {
      buffFrame.atk *= blackboard.talent_scale;
      log.write(`  - [特殊] ${skillData.skillId}: talent_scale = ${blackboard.talent_scale}, atk + ${buffFrame.atk}`);
    } else if (skillData.skillId == "skchr_excu_1") {
      buffFrame.atk_scale = 1; blackboard.atk_scale = 1.5;
      log.write(`  - [特殊] skchr_excu_1: atk_scale = 1.5`);
    } else if (skillData.skillId == "skchr_excu_2") {
      buffFrame.times = 2;
      log.write(`  - [特殊] skchr_excu_2: times = 2`);
    } else if (["skchr_ccheal_1", "skchr_ccheal_2"].includes(skillData.skillId)) {
      blackboard.atk_scale = blackboard.heal_scale * blackboard.duration;
      log.write(`  - [特殊] ${skillData.skillId}: hot heal_scale = ${blackboard.atk_scale}`);
    } else if (["skchr_deepcl_1", "skchr_mgllan_2", "skchr_mgllan_3"].includes(skillData.skillId)) { 
      log.write(`  - 注意: 此处为本体数据`);
    } else if (skillData.skillId == "skchr_slbell_2") {
      buffFrame.emr_scale += blackboard['magic_resistance'];
      log.write(`  - [特殊] skchr_slbell_2: emr_scale = ${buffFrame.emr_scale}`);
    } else if (isSkill && skillData.skillId == "skchr_glacus_2") {
      buffFrame.atk_scale = isCond ? blackboard['atk_scale[drone]'] : blackboard['atk_scale[normal]'];
      log.write(`  - [特殊] skchr_glacus_2: atk_scale = ${buffFrame.atk_scale}`);
    } else if (isSkill && skillData.skillId == "skchr_huang_3") { // 煌3
      blackboard.atk /= 2;
      buffFrame.maxTarget = 999;
      log.write(`  - [特殊] skchr_huang_3: avg atk = ${blackboard.atk}, maxTarget = 999`);
    } else if (levelData.description.includes('所有敌人')) {
      buffFrame.maxTarget = 999;
    }

    if (blackboard['atk'] && !["skchr_swire_1", "skchr_deepcl_1", "skchr_sora_2"].includes(skillData.skillId)) {  // 诗怀雅1技能有atk字段，但是并未生效
      buffFrame.atk += basicFrame.atk * blackboard['atk'];
      write('atk', `+${blackboard['atk']*100}%(+${basicFrame.atk * blackboard['atk']})`);
    }
    if (blackboard['attack_speed']) {
      buffFrame.attackSpeed += blackboard['attack_speed'];
      write('attack_speed', `+${blackboard['attack_speed']}`);
    }
    if (blackboard['base_attack_time']) {
      let bat = basicFrame.baseAttackTime;
      if (["skchr_aglina_2"].includes(levelData.prefabId)) {
        bat *= blackboard['base_attack_time'];
        write(`baseAttackTime(${levelData.prefabId})`, `*${blackboard['base_attack_time']}`);
      } else if (["base_attack_time", "skchr_mantic_2", "skchr_glaze_2"].includes(levelData.prefabId)) {
        bat += blackboard['base_attack_time'];
        write(`baseAttackTime(${levelData.prefabId})`, `+${blackboard['base_attack_time']}`);
      } else if ( blackboard['base_attack_time'] < 0) {
        if (levelData.prefabId == "skchr_brownb_2") {
          bat *= (1 + blackboard['base_attack_time']);
          write(`[特殊] 急速拳: 攻击间隔乘算 = ${bat}s`);
        } else if (levelData.prefabId == "skchr_angel_3") {
          bat += blackboard['base_attack_time'] * 2;
          write(`[特殊] 过载: 攻击间隔双倍减算 = ${bat}s`);
        } else {
          bat += blackboard['base_attack_time'];
          write('攻击间隔缩短', `${blackboard['base_attack_time']} s`);
        }
      } else {
        bat += basicFrame.baseAttackTime * blackboard['base_attack_time'];
        write('攻击间隔延长', `+${blackboard['base_attack_time']} 倍`);
      }
      buffFrame.baseAttackTime = 0 - basicFrame.baseAttackTime + bat;
    }
    if (blackboard['attack@atk_scale']) {
      buffFrame.atk_scale *= blackboard['attack@atk_scale'];
      write('atk_scale', `+${blackboard['attack@atk_scale']}`);
    }
    if (blackboard['atk_scale']) {
      buffFrame.atk_scale *= blackboard['atk_scale'];
      write('atk_scale', `${blackboard['atk_scale']}`);
    }
    if (blackboard['max_target']) {
      buffFrame.maxTarget = blackboard['max_target'];
      write('max_target', `${blackboard['max_target']}`);
    }
    if (blackboard['attack@max_target']) {
      buffFrame.maxTarget = blackboard['attack@max_target'];
      write('max_target', `${blackboard['attack@max_target']}`);
    }
    if (blackboard['attack@times']) {
      buffFrame.times = blackboard['attack@times'];
      write('times', `+${blackboard['attack@times']}`);
    }
    if (blackboard['times']) {
      buffFrame.times = blackboard['times'];
      write('times', `+${blackboard['times']}`);
    }
    if (blackboard['damage_scale']) {
      buffFrame.damage_scale *= blackboard['damage_scale'];
      write('damage_scale', `+${blackboard['damage_scale']}`);
    }
/*
    if (buffFrame.enemyMagicResistance) {
      enemyMagicResistance += buffFrame.enemyMagicResistance;
      write('enemyMagicResistance', `+${buffFrame.enemyMagicResistance}`);
    }
*/
    // 远卫取消减伤判定
    if (["skchr_whitew_2", "skchr_svrash_3"].includes(skillData.skillId) && isCond) {
      buffFrame.atk_scale = 1;
      log.write(`  - 不降低攻击力 atk_scale = ${buffFrame.atk_scale}`);
    }
  }
  // 远山
  if (charId == "char_109_fmout") {
    if (skillData.skillId == "skcom_magic_rage[2]") {
      buffFrame.attackSpeed = isSkill ? blackboard.attack_speed : 0;
      log.write(`  - [特殊] tachr_109_fmout_1: atk + ${buffFrame["tachr_109_fmout_1"].atk}, attackSpeed = 0`);
    } else if (skillData.skillId == "skchr_fmout_2") {
      buffFrame.atk = isSkill ? basicFrame.atk * blackboard.atk : 0;
      log.write(`  - [特殊] tachr_109_fmout_1: attackSpeed + ${buffFrame["tachr_109_fmout_1"].attack_speed}, atk = 0`);
    }
  }

  let finalFrame = getBuffedAttributes(basicFrame, buffFrame, false);
  //console.log(buffFrame, finalFrame);

  // 重置普攻判定
  function checkResetAttack(key) {
    return (ResetAttackList.includes(key) || 
            blackboard['base_attack_time'] || blackboard['attack@max_target'] ||
            blackboard['max_target']);
  }
  
  // fps修正
  let fps = 30;
  let attackCalcTime = finalFrame.baseAttackTime / finalFrame.attackSpeed * 100;
  if (isSkill && SecSkillList.includes(skillData.skillId)) {
    attackCalcTime = 1;
    log.write(`  - [特殊] ${skillData.skillId}: 攻击间隔 = 1s`);
  }
  let attackFrameTime = Math.ceil(attackCalcTime * fps) / fps;
  attackTime = attackFrameTime;

  if (isSkill && skillData.skillId == "skchr_platnm_2") { // 白金
    let rate = (attackFrameTime - 1) / (buffFrame["tachr_204_platnm_1"]["attack@max_delta"] - 1);
    buffFrame.atk_scale = 1 + rate * (buffFrame["tachr_204_platnm_1"]["attack@max_atk_scale"] - 1);
    finalFrame = getBuffedAttributes(basicFrame, buffFrame, false); // 重算
    log.write(`  - [特殊] tachr_204_platnm_1: atk_scale = ${buffFrame.atk_scale}`);
  } else if (buffFrame["tachr_215_mantic_1"] && attackTime >= buffFrame["tachr_215_mantic_1"].delay) { // 狮蝎
    let atk = basicFrame.atk * buffFrame["tachr_215_mantic_1"].atk;
    log.write(`  - [特殊] tachr_215_mantic_1: atk + ${atk}`);
    finalFrame.atk += atk;
    buffFrame.atk = finalFrame.atk - basicFrame.atk;
  }

  // ---- 攻击次数计算 ----
  let attackCount = 0;
  let duration = 0;
  let isInstant = levelData.duration <= 0;
  let isSp8 = levelData.spData.spType == 8; // 被动技能
  let spType = levelData.spData.spType;
  let critDamage = 0;
  let critCount = 0;
  let damagePool = [0, 0, 0, 0];
  let stunDuration = 0;
  let attackDuration = 0;

  log.write(`  - 伤害类型: ${['physical','magic','heal','真实伤害'][damageType]}`);
  //console.log(levelData);

  if (isSkill) {
    if (levelData.description.includes('持续时间无限')) {
      attackCount = Math.ceil(1800 / attackTime);
      duration = attackCount * attackTime;
      isInstant = false;
      log.write(`  - 持续时间无限(记为1800s)`);
    } else if (isSp8) { 
      attackCount = Math.ceil((blackboard.duration || levelData.duration) / attackTime);
      duration = attackCount * attackTime;
      if (skillData.skillId == "skchr_waaifu_2") {
        duration = 1; attackCount = 1; isInstant = true;
      }
      isInstant = false;
    } else if (isInstant) {
      attackCount = 1;
      duration = attackTime;
      log.write(`  - 瞬发`);
    } else {
      attackCount = Math.ceil(levelData.duration / attackTime);
      if (skillData.skillId == "skchr_yuki_2") {  // 白雪2
        attackCount = Math.ceil(attackCount / 3) * 3;
        log.write(`  - [特殊] skchr_yuki_2: 攻击时间 = ${attackCount * attackTime} s`);
      } else if (skillData.skillId == "skchr_huang_3") { // 煌3
        attackCount -= 2;
        log.write(`  - [特殊] skchr_huang_3: 实际攻击 ${attackCount} 次`);
      }
      if (checkResetAttack(skillData.skillId)) {
        duration = levelData.duration;
        log.write('  - 重置普攻');
      } else {
        duration = attackCount * attackTime;
      }
    }
  } else { // 普攻
    // 晕眩处理
    if (levelData.prefabId == "skchr_fmout_2") {
      stunDuration += blackboard.time;
      log.write(`  - 晕眩: ${blackboard.time}`);
    } else if (["skchr_amiya_2", "skchr_liskam_2", "skchr_ghost_2", "skchr_broca_2"].includes(levelData.prefabId)) {
      stunDuration += blackboard.stun;
      log.write(`  - 晕眩: ${blackboard.stun}s`);
    }
    switch (levelData.spData.spType) {
      case 1: // 自动回复
        if (buffFrame["tachr_002_amiya_1"]) { // 情绪吸收, 攻击敌人时额外回复3<@ba.talpu>（+1）</>点技力，消灭敌人后额外获得10<@ba.talpu>（+2）</>点技力, {"amiya_t_1[atk].sp":3,"amiya_t_1[kill].sp":10}
          attackCount = Math.ceil((levelData.spData.spCost - stunDuration) / (buffFrame["tachr_002_amiya_1"]["amiya_t_1[atk].sp"] + attackTime));
          log.write(`  - [特殊] tachr_002_amiya_1: attack sp = ${attackCount * buffFrame["tachr_002_amiya_1"]["amiya_t_1[atk].sp"]}`);
        } else if (buffFrame["tachr_134_ifrit_2"]) { // [莱茵回路]--------------------------
          let i = buffFrame["tachr_134_ifrit_2"].interval;
          let isp = i + buffFrame["tachr_134_ifrit_2"].sp;
          let recoverCount = Math.ceil((levelData.spData.spCost - i) / isp); // recoverCount >= (spCost - i) / isp
          let r = levelData.spData.spCost - recoverCount * isp;
          attackDuration = recoverCount * i + r;
          attackCount = Math.ceil(attackDuration / attackTime);
          //console.log(i, isp, recoverCount, r, attackDuration, attackCount);
          duration = attackDuration;
          log.write(`  - [特殊] tachr_134_ifrit_2: sp = ${recoverCount * buffFrame["tachr_134_ifrit_2"].sp}`); 
        } else { // normal
          attackDuration = levelData.spData.spCost / (1 + buffFrame.spRecoveryPerSec) - stunDuration;   // 可以普攻的时间
          if (skillData.skillId == "skchr_amgoat_2") attackDuration -= 0.4;   // 模拟施法时间。
          attackCount = Math.ceil(attackDuration / attackTime);
          if (buffFrame.spRecoveryPerSec > 0) {  // 技力光环处理
            log.write(`  - SP回复: +${buffFrame.spRecoveryPerSec}/s`);
          }
        }
        if (checkResetAttack(skillData.skillId) && !buffFrame["tachr_134_ifrit_2"]) {
          duration = levelData.spData.spCost;
        }
        break;
      case 2: // 攻回
        //let sp2 = 1;
        // "tachr_134_ifrit_2" 莱茵回路, 每5.5<@ba.talpu>（-0.5）</>秒额外回复2点技力, {"sp":2,"interval":5.5}
        log.write("  - 攻击回复");
        attackCount = levelData.spData.spCost;
        if (buffFrame["tachr_010_chen_1"]) { // "tachr_010_chen_1", 呵斥, 在场时每4秒回复全场友方角色1点攻击/受击技力, {"interval":4,"sp":1}
          attackCount = Math.ceil(levelData.spData.spCost / (1 + attackTime / buffFrame["tachr_010_chen_1"].interval));
          let sp = Math.floor(attackCount * attackTime / buffFrame["tachr_010_chen_1"].interval);
          log.write(`  - [特殊] tachr_010_chen_1: sp = ${sp}, attack_count = ${attackCount}`);
        }
        if (checkResetAttack(skillData.skillId)) {
          duration = (attackCount - 1) * attackTime;
        }
        break;
      case 4: // 受击回复
        attackCount = Math.ceil((levelData.spData.spCost - stunDuration) / attackTime);
        log.write("  - 受击回复");
        break;
      case 8: // 被动，或落地释放
        attackCount = 1;
        log.write("  - 被动或部署时释放");
        break;
      default:
        console.log('bad sptype: ' + levelData.prefabId + ',' + levelData.spData.spType);
        return;
    }
    if (levelData.spData.spType >= 4 || !ResetAttackList.includes(skillData.skillId)) {
      duration = attackCount * attackTime + stunDuration;
    }
    //console.log(duration);
  }
  // 追加攻击次数
  attackCount *= buffFrame.times;

  let atk_line = `(${basicFrame.atk} + ${Math.round(buffFrame.atk)}) * ${buffFrame.atk_scale}`;
  if (buffFrame.damage_scale > 1) { atk_line += ` * ${buffFrame.damage_scale}`; }
  log.write(`  - 最终攻击力:  ${Math.round(finalFrame.atk)} = ${atk_line}`);
  log.write(`  - 持续: ${duration.toFixed(2)} sec.`);
  log.write(`  - 最终攻速: ${finalFrame.attackSpeed.toFixed(2)}`);
  log.write(`  - 实际攻击间隔 / FPS修正: ${attackCalcTime.toFixed(3)} s (${attackFrameTime.toFixed(3)} s)`);
  log.write(`  - 攻击次数: ${attackCount} (${buffFrame.times} 连击 x ${Math.round(attackCount/buffFrame.times)})`);
  let hitDamage = finalFrame.atk;  
  let emr = 1 - buffFrame.emr * buffFrame.emr_scale / 100;

  if (isSkill && buffFrame["tachr_148_nearl_1+"]) { // 临光
    hitDamage *= buffFrame["tachr_148_nearl_1+"].heal_scale;
    log.write(`  - [特殊] tachr_148_nearl_1+: heal_scale = ${buffFrame["tachr_148_nearl_1+"].heal_scale}`);
  }

  if (damageType == 0) {
    let minDamage = finalFrame.atk * 0.05;
    if (buffFrame["tachr_144_red_1"]) { // 刺骨, 每次攻击至少造成33%<@ba.talpu>（+3%）</>攻击力的伤害, {"atk_scale":0.33}
      minDamage = finalFrame.atk * buffFrame["tachr_144_red_1"].atk_scale;
      log.write(`  - [特殊] 刺骨: 最小伤害 = ${buffFrame["tachr_144_red_1"].atk_scale} (${minDamage.toFixed(2)})`);
    }
    let def = enemy.def;
    if (charId == "char_340_shwaz") def *= 0.8; // 假设黑减防常驻

    hitDamage = Math.max(finalFrame.atk - def, minDamage);

    // 暴击处理 
    if (buffFrame['_critdata'] && isCrit) { 
      let critFrame = getBuffedAttributes(basicFrame, buffFrame, true);
      let cd = buffFrame['_critdata'];
      critDamage = Math.max(critFrame.atk - def, critFrame.atk * 0.05);
      let prob = cd['prob'];
      if (buffFrame['tachr_290_vigna_1']) {
        prob = (isSkill ? cd['prob2'] : cd['prob1']);
      } else if (buffFrame['tachr_145_prove_1'] && isCond) {
        prob = cd['prob2'];
      } else if (buffFrame["tachr_106_franka_1"]) { // 铝热剑, 攻击时有20%的几率无视目标的防御, {"prob":0.2}
        if (isSkill && skillData.skillId == "skchr_franka_2") prob = 0.5;
        critDamage = critFrame.atk;
      } else if (buffFrame["tachr_340_shwaz_1"] && isSkill) {
        prob = blackboard["talent@prob"];
      } 
      
      // 暴击次数期望
      if (buffFrame["tachr_155_tiger_1"]) { // 虎拳迅击
        prob = cd["tiger_t_1[evade].prob"];
        critFrame.atk += basicFrame.atk * cd["charge_on_evade.atk"];
        critDamage = Math.max(critFrame.atk - def, critFrame.atk * 0.05);
        critCount = enemy.count * duration / 2.5 * prob;
      }
      else {
        critCount = attackCount * prob;
      }

      if (critCount > 1) critCount = Math.floor(critCount);
      attackCount -= critCount;
      log.write(`  - [暴击] 伤害=${critDamage.toFixed(2)}, 暴击率: ${prob*100}%, 期望 = ${critCount.toFixed(2)}`);
    }

  } else if (damageType == 1) {
    log.write(`  - 敌人魔抗: ${((1 - emr) * 100).toFixed(1)} %`);
    hitDamage *= emr;
    
    // 暴击处理 
    if (buffFrame['_critdata'] && isCrit) { 
      let critFrame = getBuffedAttributes(basicFrame, buffFrame, true);
      let cd = buffFrame['_critdata'];
      critDamage = critFrame.atk * emr;
      let prob = cd['prob'];

      // 暴击次数期望
      if (buffFrame["tachr_155_tiger_1"]) { // 虎拳迅击
        prob = cd["tiger_t_1[evade].prob"];
        critFrame.atk += basicFrame.atk * cd["charge_on_evade.atk"];
        critDamage = critFrame.atk * emr;
        critCount = enemy.count * duration / 2.5 * prob;
      }
      else {
        critCount = attackCount * prob;
      }
      if (critCount > 1) critCount = Math.floor(critCount);
      attackCount -= critCount;
      log.write(`  - [暴击] 伤害=${critDamage.toFixed(2)}, 暴击率: ${prob*100}%, 期望 = ${critCount.toFixed(2)}`);
    }
  }

  // 混伤处理
  if (isSkill && skillData.skillId == "skchr_sddrag_2") { // 苇草
    //console.log(blackboard);
    let pDmg = hitDamage;
    let mDmg = finalFrame.atk * blackboard["attack@skill.atk_scale"] * emr;
    hitDamage = pDmg + mDmg;
    log.write(`  - [特殊] skchr_sddrag_2: 魔法伤害 = ${mDmg.toFixed(2)}`);
    damagePool[0] += pDmg * attackCount;
    damagePool[1] += mDmg * attackCount;
  } else {
    damagePool[damageType] += hitDamage * attackCount + critDamage * critCount;
  }
  log.write(`  - 最终单次伤害: ${hitDamage.toFixed(2)}`);

  // 目标数处理
  let maxTarget = Math.min(buffFrame.maxTarget, enemy.count);
  if (levelData.prefabId == "skchr_bluep_2") {
    damagePool = damagePool.map(x => x * (1 + (maxTarget - 1) / 2));
  } else {
    damagePool = damagePool.map(x => x * maxTarget);
  }
  
  // 额外伤害/治疗处理
  if (isSkill && skillData.skillId == "skchr_ifrit_2") {
    let damage = (basicFrame.atk + buffFrame.atk) * blackboard['burn.atk_scale'] * duration * emr;
    damagePool[1] += damage;
    log.write(`  - [特殊] skchr_ifrit_2: 灼烧伤害 += ${damage.toFixed(2)}`);
  } else if (isSkill && skillData.skillId == "skchr_amgoat_2") {
    let mainEmr = 1 - (1 - emr) * (1 + blackboard["magic_resistance"]);
    let mainHitDamage = hitDamage / emr * mainEmr * 2;
    log.write(`  - [特殊] 点燃: 主目标伤害 = ${mainHitDamage.toFixed(2)}, 魔抗: ${((1 - mainEmr) * 100).toFixed(1)} %`);
    damagePool[1] += mainHitDamage - hitDamage;
  } else if (buffFrame["tachr_129_bluep_1"]) { // 神经毒素, 攻击使目标中毒，在3秒内每秒受到85<@ba.talpu>（+10）</>点法术伤害, {"duration":3.1,"poison_damage":85}
    let damage = buffFrame["tachr_129_bluep_1"].poison_damage * duration * emr;
    if (isSkill && skillData.skillId == "skchr_bluep_1") {
      damage *= blackboard.atk_scale; // 暴击毒!
      log.write(`  - [特殊] 神经毒素(暴击): ${damage.toFixed(2)}/s`);
    } else {
      log.write(`  - [特殊] 神经毒素(魔法): ${damage.toFixed(2)} = ${buffFrame["tachr_129_bluep_1"].poison_damage * emr} x ${duration.toFixed(2)}s`);
    }
    damagePool[1] += damage;
  } else if (skillData.skillId == "skchr_ethan_1") { // 伊桑
    let damage = blackboard["attack@poison_damage"] * duration * emr;
    log.write(`  - [特殊] skchr_ethan_1: 魔法伤害 = ${damage.toFixed(2)} (按不间断计算)`);
    damagePool[1] += damage;
  } else if (isSkill && skillData.skillId == "skchr_nightm_2") { // 夜魔2
    let damage = blackboard.value * blackboard.duration / 3 * maxTarget;
    damagePool[3] += damage;
    log.write(`  - [特殊] skchr_nightm_2: 移动（估算） = ${(blackboard.duration / 3).toFixed(1)}, 真实伤害 = ${damage.toFixed(2)}`);
  } else if (isSkill && skillData.skillId == "skchr_huang_3") { // 煌3
    console.log(blackboard);
    let extraAtk = basicFrame.atk * (1 + blackboard.atk*2) * blackboard.damage_by_atk_scale;
    let extraHitDamage = Math.max(extraAtk - enemy.def, Math.round(extraAtk * 0.05));
    damagePool[0] += extraHitDamage * maxTarget;
    log.write(`  - [特殊] skchr_huang_3: 终结伤害 = ${extraHitDamage} * ${maxTarget}`);
  } else if (!isSkill && ["skchr_aglina_2", "skchr_aglina_3"].includes(skillData.skillId)) {
    damagePool[0]=0; damagePool[1]=0;
    log.write(`  - [特殊] ${skillData.skillId}: 伤害=0`);
  } else if (isSkill && ["skcom_assist_cost[2]", "skchr_myrtle_2", "skchr_skgoat_2"].includes(skillData.skillId)) {
    damagePool[0]=0; damagePool[1]=0;
    log.write(`  - [特殊] ${skillData.skillId}: 伤害=0`);
  } else if (isSkill && ["skchr_silent_2"].includes(skillData.skillId)) {
    damagePool[2] = 0;
    log.write(`  - [特殊] ${skillData.skillId}: 治疗=0`);
  } else if (charId == "char_101_sora") {
    damagePool[0]=0; damagePool[1]=0;
    log.write(`  - [特殊]: 伤害=0`);
  }
  
  // 间接治疗
  let heal = 0;
  if (buffFrame["tachr_151_myrtle_1"]) { // 桃子
    heal = buffFrame["tachr_151_myrtle_1"].hp_recovery_per_sec * duration;
  } else if (isSkill && skillData.skillId == "skchr_tiger_2") { // 裂魂
    heal = damagePool[1] * blackboard.heal_scale;
  } else if (isSkill && blackboard["hp_recovery_per_sec_by_max_hp_ratio"]) { // 自回
    heal = blackboard["hp_recovery_per_sec_by_max_hp_ratio"] * finalFrame.maxHp * duration;
  } else if (isSkill && skillData.skillId == "skcom_heal_self[1]") { // 卡缇
    heal = blackboard.heal_scale * finalFrame.maxHp;
  } else if (isSkill && skillData.skillId == "skchr_nightm_1") { // 卡缇
    heal = blackboard[`attack@heal_scale`] * finalFrame.atk * maxTarget;
  } else if (isSkill && blackboard["hp_recovery_per_sec"]) { // 角峰1, 深海色
    heal = blackboard.hp_recovery_per_sec * duration;
  } else if (isSkill && skillData.skillId == "skchr_bldsk_1") { // 华法琳
    heal = blackboard.hp_ratio * finalFrame.maxHp;
    log.write(`  - [特殊] skchr_bldsk_1: 以自身血量百分比计算`);
  } else if (buffFrame["tachr_181_flower_1"]) { // 调香
    heal = buffFrame["tachr_181_flower_1"].atk_to_hp_recovery_ratio * finalFrame.atk * duration;
  } else if (buffFrame["tachr_188_helage_trait"]) {
    heal = buffFrame["tachr_188_helage_trait"].value * attackCount * maxTarget;
  } else if (buffFrame["tachr_143_ghost_1"]) { // 幽灵鲨
    heal = buffFrame["tachr_143_ghost_1"]["hp_recovery_per_sec_by_max_hp_ratio"] * finalFrame.maxHp * duration;
  }
  if (buffFrame["tachr_163_hpsts_1"] && isSkill) { // 火神
    let talent_heal = buffFrame["tachr_163_hpsts_1"].hp_recovery_per_sec_by_max_hp_ratio * finalFrame.maxHp * duration;
    log.write(`  - [特殊] tachr_163_hpsts_1: 自回 = ${talent_heal}`);
    heal += talent_heal;
    if (skillData.skillId == "skchr_hpsts_2") {
      let hit_heal = blackboard.hp_ratio * finalFrame.maxHp * attackCount;
      log.write(`  - [特殊] skchr_hpsts_2: 攻回 = ${hit_heal}`);
      heal += hit_heal;
    }
  }
  if (charId == "char_101_sora") { // 空
    let ratio = 0.1;
    if (isSkill && skillData.skillId == "skchr_sora_1")
      ratio = blackboard['attack@atk_to_hp_recovery_ratio'];
    heal = ratio * finalFrame.atk * duration;
    log.write(`  - [特殊] char_101_sora: atk_heal_ratio = ${ratio}`);
  }
  if (heal > 0) log.write(`  - 间接治疗量: ${heal.toFixed(2)}`);
  damagePool[2]+=heal;

  /*
  "tachr_215_mantic_1", // 隐匿的杀手·精英, 平时处于隐匿状态（不会被远程攻击选为目标），攻击时会解除隐匿状态，且当次攻击的攻击力+54%<@ba.talpu>（+4%）</>。停止攻击5秒后，重新进入隐匿状态, {"delay":5,"atk":0.54}
  "tachr_164_nightm_1", // 表里人格, 装备技能1时获得45%<@ba.talpu>（+5%）</>的物理和法术闪避，装备技能2时获得+18%<@ba.talpu>（+3%）</>攻击力, {"prob":0.45,"atk":0.18}
*/

  let totalDamage = damagePool[0] + damagePool[1] + damagePool[3];
  let dps = totalDamage / duration;
  let hps = damagePool[2] / duration;

  log.write(`  - 总伤害: ${ damagePool.map(x => " " + x.toFixed(2)) }`);
  log.write(`  - DPS: ${dps.toFixed(2)}`);
  if (hps > 0) log.write(`  - HPS: ${hps.toFixed(2)}`);
  return {
    atk: finalFrame.atk,
    dps,
    duration,
    isInstant,
    isSp8,
    hitDamage,
    critDamage,
    critCount,
    totalDamage,
    maxTarget,
    damagePool,
    damageType,
    attackSpeed: finalFrame.attackSpeed,
    attackTime,
    attackCount,
    hitNumber: 1, //buffFrame.times,
    buff: buffFrame,
    frame: finalFrame,
    emr,
    spType,
    stunDuration,
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

function getAttributes(char, log) { //charId, phase = -1, level = -1
  let charData = AKDATA.Data.character_table[char.charId];
  let phaseData = charData.phases[char.phase];
  let attributesKeyFrames = {};
  let buffs = {
    atk_scale: 1,
    def_scale: 1,
    damage_scale: 1,
    maxTarget: 1,
    times: 1,
    emr:0,
    emr_scale:1,
  };

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

  // 天赋/特性处理
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
          cd.name = "角色特性";
        }
        let prefabKey = 'tachr_' + char.charId.slice(5) + '_' + cd.prefabKey;
        if (log) {
          st = "{ " + $.map(blackboard, (v, k) => `${k}:${v}`).join(", ") + " }";
          log.write(`天赋: ${prefabKey} ${cd.name}`);
          log.write(`效果: ${st}`);
          if (HardcodeList.includes(prefabKey)) {
            console.log("Hard talent", prefabKey, blackboard);
            buffs[prefabKey] = blackboard;
            buffs[prefabKey].name = name;
          }
          if (CondList.includes(prefabKey)) log.write(`触发天赋增/减伤: ${char.cond}`);
          if (CritList.includes(prefabKey)) {
            log.write(`计算暴击: ${char.crit}`);
            buffs['_critdata'] = blackboard;
            buffs[prefabKey] = prefabKey;
            if (prefabKey == "tachr_367_swllow_1") {
              let spd = blackboard.attack_speed;
              blackboard = {"attack_speed":spd};
            } else { 
              blackboard = {};
            }
          }
          if (TodoList.includes(prefabKey)) log.write('[BUG] 天赋效果在调整中或有Bug，结果仅供参考');
        }
        // 判断是否不应用天赋
        if (CondList.includes(prefabKey) && !char.cond) break;
        // 使天赋生效
        applyTalent(prefabKey, blackboard, attributesKeyFrames, buffs, talentData.name);
        break;
      }
    }
  });
 // console.log(attributesKeyFrames);
  return {
    basic: attributesKeyFrames,
    buffs: buffs,
  };
}

function getBuffedAttributes(basic, buffs, crit) {
  let final = {};
  AttributeKeys.forEach(key => {
    final[key] = basic[key] + buffs[key];
  });

  // 暴击处理
  if (crit && buffs["_critdata"]) {
    let cd = buffs["_critdata"];
    let scale = buffs.atk_scale;
   // console.log(cd, final);
    if (cd.atk) final.atk += basic.atk * cd.atk;
    if (cd.atk_scale) scale *= cd.atk_scale;

    final.atk *= scale;
    final.def *= buffs.def_scale;
    final.atk *= buffs.damage_scale;
  }
  else {
    final.atk *= buffs.atk_scale;
    final.def *= buffs.def_scale;
    final.atk *= buffs.damage_scale;
  }
  return final;
}

function getFinalAttributes(...frames) {
  let final = {};
  AttributeKeys.forEach(key => {
    final[key] = 0;
    frames.forEach(frame => final[key] += frame[key]);
  });
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

// todo: 团辅被动列表
const BuffList = [
  "tachr_286_cast3_1",
  "tachr_134_ifrit_1",
  "tachr_141_nights_1",
  "tachr_187_ccheal_1",
  "tachr_128_plosis_1",
  "tachr_166_skfire_1",
  "tachr_108_silent_1",
  "tachr_148_nearl_1+",
  "tachr_174_slbell_1",
  "tachr_103_angel_2",
  "tachr_112_siege_1",
  "tachr_180_amgoat_1",
  "tachr_291_aglina_1",
  "tachr_147_shining_1",
  "tachr_179_cgbird_1",
  "tachr_136_hsguma_2",
  "tachr_263_skadi_1",
];

const CondList = [
  // 条件触发类
  "tachr_286_cast3_1", // 战术整理·VI, 部署后20秒内所有友方【近战位】单位的攻击力和防御力+20%, {"duration":20,"atk":0.2,"def":0.2}
  "tachr_503_rang_1", // 空射大师, 攻击飞行目标时，攻击力+50%, {"atk_scale":1.5}
  "tachr_126_shotst_1", // 空射专精, 攻击飞行目标时，攻击力+40%<@ba.talpu>（+5%）</>, {"atk_scale":1.4}
  "tachr_198_blackd_1",
  "tachr_149_scave_1",
  "tachr_187_ccheal_1",
  "tachr_158_milu_1",
  "tachr_173_slchan_1",
  "tachr_230_savage_1",
  "tachr_188_helage_1",
  "tachr_166_skfire_1", // 法术狙击, 在场时，所有被阻挡的敌人受到法术伤害时伤害提升18%<@ba.talpu>（+3%）</>, {"damage_scale":1.18}
  "tachr_145_prove_1", // 狩猎箭头, 攻击时，20%几率当次攻击的攻击力提升至190%<@ba.talpu>（+10%）</>。当敌人在正前方一格时，该几率提升到50%, {"prob":0.2,"prob2":0.5,"atk_scale":1.9}
  "tachr_340_shwaz_2",
  "tachr_356_broca_1", // 钻头强化
  "tachr_274_astesi_1", // 天体仪
  "tachr_298_susuro_1",
  "tachr_348_ceylon_1",
  "tachr_174_slbell_1",
  "tachr_326_glacus_1",
  "tachr_215_mantic_1",
  "tachr_279_excu_trait", // 送葬特性
  "tachr_193_frostl_trait", // 远卫特性
  "tachr_140_whitew_trait",
  "tachr_172_svrash_trait",
  "tachr_283_midn_trait",
  "tachr_202_demkni_1",
];

const CritList = [
  // 暴击类
  "tachr_290_vigna_1", // 蛮力穿刺, 攻击时，10%几率当次攻击的攻击力+110%<@ba.talpu>（+10%）</>。技能中这个几率提高到30%, {"atk":1.1,"prob1":0.1,"prob2":0.3}
  "tachr_196_sunbr_1", // 平底锅专精, 攻击时，18%<@ba.talpu>（+3%）</>几率当次攻击的攻击力提升至200%，并眩晕敌人1秒, {"prob":0.18,"atk_scale":2,"stun":1}
  "tachr_219_meteo_1", // 爆破附着改装, 普通攻击和技能释放时，30%几率当次攻击的攻击力+60%, {"atk":0.6,"prob":0.3}
  "tachr_283_midn_1", // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
  "tachr_124_kroos_1",
  "tachr_145_prove_1", // 狩猎箭头, 攻击时，20%几率当次攻击的攻击力提升至190%<@ba.talpu>（+10%）</>。当敌人在正前方一格时，该几率提升到50%, {"prob":0.2,"prob2":0.5,"atk_scale":1.9}
  "tachr_106_franka_1", // 铝热剑, 攻击时有20%的几率无视目标的防御, {"prob":0.2}
  "tachr_340_shwaz_1", 
  "tachr_155_tiger_1", // 虎拳迅击
  "tachr_243_waaifu_1", // 红眉咏春
  "tachr_367_swllow_1",
];

// 特判天赋，不包含特殊技能
const HardcodeList = [
  "tachr_185_frncat_1", // 连击, 攻击时有23%<@ba.talpu>（+3%）</>的几率连续攻击两次, {"prob":0.23}
  "tachr_237_gravel_1+", // 小个子支援, 自身部署费用-1，所有部署费用不超过10的单位防御力提升8%<@ba.talpu>（+2%）</>, {"cost":-1,"def":0.08,"cond.cost":10}
  "tachr_129_bluep_1", // 神经毒素, 攻击使目标中毒，在3秒内每秒受到85<@ba.talpu>（+10）</>点法术伤害, {"duration":3.1,"poison_damage":85}
  "tachr_002_amiya_1", // 情绪吸收, 攻击敌人时额外回复3<@ba.talpu>（+1）</>点技力，消灭敌人后额外获得10<@ba.talpu>（+2）</>点技力, {"amiya_t_1[atk].sp":3,"amiya_t_1[kill].sp":10}
  "tachr_144_red_1", // 刺骨, 每次攻击至少造成33%<@ba.talpu>（+3%）</>攻击力的伤害, {"atk_scale":0.33}
  "tachr_174_slbell_1", // 虚弱化, 攻击范围内的敌人生命少于40%时，其受到的伤害提升至133%<@ba.talpu>（+3%）</>, {"hp_ratio":0.4,"damage_scale":1.33}
  "tachr_134_ifrit_2", // 莱茵回路, 每5.5<@ba.talpu>（-0.5）</>秒额外回复2点技力, {"sp":2,"interval":5.5}
  "tachr_010_chen_1", // 呵斥, 在场时每4秒回复全场友方角色1点攻击/受击技力, {"interval":4,"sp":1}
  "tachr_164_nightm_1", // 表里人格, 装备技能1时获得45%<@ba.talpu>（+5%）</>的物理和法术闪避，装备技能2时获得+18%<@ba.talpu>（+3%）</>攻击力, {"prob":0.45,"atk":0.18}
  "tachr_188_helage_1",
  "tachr_274_astesi_1",
  "tachr_151_myrtle_1", // 浮光跃金
  "tachr_109_fmout_1",
  "tachr_118_yuki_1", // 重型手里剑
  "tachr_204_platnm_1",
  "tachr_279_excu_1",
  "tachr_148_nearl_1+",
  "tachr_298_susuro_1",
  "tachr_181_flower_1",
  "tachr_188_helage_trait",
  "tachr_215_mantic_1",
  "tachr_002_amiya_1",
  "tachr_163_hpsts_1",
  "tachr_143_ghost_1",
  "tachr_202_demkni_1",
  "tachr_348_ceylon_1",
];

// 重置普攻的技能
const ResetAttackList = [
  "skcom_assist_cost[2]",
  "skchr_myrtle_2",
  "skchr_franka_2",
  "skchr_whitew_2",
  "skchr_midn_1",
  "skchr_shwaz_2",
  "skchr_mostma_3",
  "skchr_mostma_2",
  "skchr_yuki_2",
  "skchr_ifrit_3", 
  "skchr_mgllan_3",
  "skchr_huang_3",
];

// 每秒计算伤害的技能
const SecSkillList = [
  "skchr_ifrit_3",
  "skchr_yuki_2", 
  "skchr_myrtle_2", 
  "skchr_hsguma_3", 
  "skchr_demkni_3",
  "skchr_huang_3",
  "skchr_mostma_2",
];

const TodoList = [
  "tachr_211_adnach_1",
];

function applyTalent(prefabKey, blackboard, basic, buffs, name) {
  if (false) {} // skip
  else if (prefabKey == "tachr_141_nights_1" || prefabKey == "tachr_134_ifrit_1") {
    buffs.emr_scale += blackboard.magic_resistance;
    blackboard = {};
  } // 黑色迷雾, 攻击使目标法术抗性-23%<@ba.talpu>（+3%）</>，持续1秒, {"duration":1,"magic_resistance":-0.23}
 else if (prefabKey == "tachr_187_ccheal_1") {
    buffs.atk += basic.atk * blackboard.atk;
    buffs.def += blackboard.def;
    blackboard = {};
  } // 战地医师, 部署后全体友方【医疗】职业干员攻击力+12%<@ba.talpu>（+2%）</>，防御力+120<@ba.talpu>（+20）</>，持续17<@ba.talpu>（+2）</>秒, {"atk":0.12,"def":120,"duration":17}
  else if (prefabKey == "tachr_147_shining_1") {
    buffs.def += blackboard.def;
    blackboard = {};
  } // 黑恶魔的庇护, 攻击范围内的友方单位防御力+65<@ba.talpu>（+5）</>, {"def":65}
  else if (prefabKey == "tachr_202_demkni_1") {
    buffs.def += basic.def * blackboard.def * blackboard.max_stack_cnt;
    buffs.atk += basic.atk * blackboard.atk * blackboard.max_stack_cnt;
    blackboard = {};
  } // 莱茵充能护服, 每在场上停留20秒，攻击力+6%<@ba.talpu>（+1%）</>，防御力+5%<@ba.talpu>（+1%）</>，最多叠加5层, {"max_stack_cnt":5,"interval":20,"atk":0.06,"def":0.05}
  else if (prefabKey == "tachr_137_brownb_1") {
    buffs.atk += basic.atk * blackboard.atk * blackboard.max_stack_cnt;
    blackboard = {};
  } // 竞技专注, 攻击相同目标时每次攻击可提高自身攻击力6%<@ba.talpu>（+1%）</>，最多可叠加5层。更换目标会失去之前叠加的效果, {"max_stack_cnt":5,"atk":0.06}
  else if (prefabKey == "tachr_188_helage_1") {
    buffs.attackSpeed += blackboard.min_attack_speed;
  }
  else if (prefabKey == "tachr_274_astesi_1") {
    buffs.attackSpeed += blackboard.attack_speed * blackboard.max_stack_cnt;
    blackboard = {};
  }

  if (blackboard.atk) buffs.atk += basic.atk * blackboard.atk;
  if (blackboard.def) buffs.def += basic.def * blackboard.def;
  if (blackboard.respawn_time) basic.respawnTime += blackboard.respawn_time;
  if (blackboard.cost) buffs.cost += blackboard.cost;
  if (blackboard.attack_speed) buffs.attackSpeed += blackboard.attack_speed;
  if (blackboard.base_attack_time) buffs.baseAttackTime += basic.baseAttackTime * blackboard.base_attack_time;
  if (blackboard.sp_recovery_per_sec) buffs.spRecoveryPerSec += blackboard.sp_recovery_per_sec;

  if (blackboard.atk_scale) buffs.atk_scale *= blackboard.atk_scale;
  if (blackboard.def_scale) buffs.def_scale *= blackboard.def_scale;
  if (blackboard.damage_scale) buffs.damage_scale *= blackboard.damage_scale;

}


AKDATA.attributes = {
  getCharAttributes,
  calculateDps,
}