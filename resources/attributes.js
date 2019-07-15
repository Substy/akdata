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
  constructor(){
    this.log = '';
  }

  write(line){
    this.log += line + "\n";
  }

  toString(){
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

  let {
    basic: basicFrame,
    buffs: buffFrame
  } = getAttributes(char);
  let charId = char.charId;
  let charData = AKDATA.Data.character_table[charId];
  let skillData = AKDATA.Data.skill_table[char.skillId];
  if (char.skillLevel == -1) char.skillLevel = skillData.levels.length - 1;

  let levelData = skillData.levels[char.skillLevel];
  let blackboard = getBlackboard(levelData.blackboard);

  if (charData.description.includes('所有敌人') ||
    charData.description.includes('群体法术伤害') ||
    charData.description.includes('群体物理伤害')
  ) {
    buffFrame.target = 999;
  }

  log.write(`Char: ${charId}(${charData.name})`);
  log.write(`Level: Phase ${char.phase}, Level ${char.level}`);
  log.write(`Skill: ${char.skillId}(${levelData.name}), Level ${char.skillLevel}`);
  log.write(`Cond: ${char.cond}`);

  log.write(`NormalAttack:`);
  let normalAttack = calculateAttack(charId, charData, basicFrame, buffFrame, enemy, false, skillData, levelData, Object.assign({}, blackboard), log);
  if (!normalAttack) return;
  log.write(`  - DPS: ${normalAttack.dps}`);
  log.write(`  - Basic attack: ${normalAttack.frame.atk}`);
  log.write(`  - Attack scale: ${normalAttack.buff.atk_scale}`);
  log.write(`  - Dist damage: ${normalAttack.hitDamage}`);
  log.write(`  - Attack speed: ${normalAttack.attackSpeed}`);
  log.write(`  - Attack time: ${normalAttack.attackTime}`);
  log.write(`  - Duration: ${normalAttack.duration}`);
  log.write(`  - Total damage: ${normalAttack.damagePool}(${normalAttack.totalDamage})`);

  log.write(`SkillAttack:`);
  let skillAttack = calculateAttack(charId, charData, basicFrame, buffFrame, enemy, true, skillData, levelData, Object.assign({}, blackboard), log);
  if (!skillAttack) return;
  log.write(`  - DPS: ${skillAttack.dps}`);
  log.write(`  - Basic attack: ${skillAttack.frame.atk}`);
  log.write(`  - Attack scale: ${skillAttack.buff.atk_scale}`);
  log.write(`  - Dist damage: ${skillAttack.hitDamage}`);
  log.write(`  - Attack speed: ${skillAttack.attackSpeed}`);
  log.write(`  - Attack time: ${skillAttack.attackTime}`);
  log.write(`  - Duration: ${skillAttack.duration}`);
  log.write(`  - Total damage: ${skillAttack.damagePool}(${skillAttack.totalDamage})`);
  log.write(`  - Enemy magic resistance: ${skillAttack.emr}`);

  let stunDuration = 0;
  if (levelData.prefabId == "skchr_fmout_2") {
    stunDuration += blackboard.time;
  } else if (levelData.prefabId == "skchr_amiya_2") {
    stunDuration += blackboard.stun;
  } else if (levelData.prefabId == "skchr_liskam_2") {
    stunDuration += blackboard.stun;
  }

  globalDps = Math.round((normalAttack.totalDamage + skillAttack.totalDamage) / (normalAttack.duration + skillAttack.duration + stunDuration));

  let killTime = 0;
  if (enemy.hp > 0) killTime = enemy.hp / dps;

  return {
    normalDps: Math.round(normalAttack.dps * 10) / 10,
    normalAtk: Math.round(normalAttack.hitDamage * 10) / 10,
    normalAttackSpeed: Math.round(normalAttack.attackSpeed * 10) / 10,
    normalAttackTime: Math.round(normalAttack.attackTime * 100) / 100,

    skillAtk: Math.round(skillAttack.hitDamage * 10) / 10,
    skillAttackTime: Math.round(skillAttack.attackTime * 100) / 100,
    skillAttackSpeed: Math.round(skillAttack.attackSpeed * 100) / 100,
    skillDps: Math.round(skillAttack.dps * 10) / 10,
    globalDps: Math.round(globalDps * 10) / 10,
    killTime: Math.round(killTime * 10) / 10,

    log: log.toString(),

    isInstant: levelData.duration <= 0,
  };
}

function calculateAttack(charId, charData, basicFrame, buffFrame, enemy, isSkill, skillData, levelData, blackboard, log) {
  let enemyMagicResistance = enemy.magicResistance;

  let damageType = 0;
  if (charData.profession == "MEDIC") {
    damageType = 2;
  } else if (charData.description.includes('法术伤害')) {
    damageType = 1;
  }

  // Hardcode talents
  if (false) { //
  } else if (buffFrame["tachr_290_vigna_1"]) {
    log.write('蛮力穿刺, 攻击时，10%几率当次攻击的攻击力+110%<@ba.talpu>（+10%）</>。技能中这个几率提高到30%, {"atk":1.1,"prob1":0.1,"prob2":0.3}');
    buffFrame.atk += buffFrame["tachr_290_vigna_1"].atk * buffFrame["tachr_290_vigna_1"][isSkill ? 'prob2' : 'prob1'];
  } else if (buffFrame["tachr_196_sunbr_1"]) { // 
    log.write('平底锅专精, 攻击时，18%<@ba.talpu>（+3%）</>几率当次攻击的攻击力提升至200%，并眩晕敌人1秒, {"prob":0.18,"atk_scale":2,"stun":1}');
    buffFrame.atk_scale *= 1 + buffFrame["tachr_196_sunbr_1"].prob * (buffFrame["tachr_196_sunbr_1"].atk_scale - 1);
  } else if (buffFrame["tachr_219_meteo_1"]) { // 爆破附着改装, 普通攻击和技能释放时，30%几率当次攻击的攻击力+60%, {"atk":0.6,"prob":0.3}
    buffFrame.atk += buffFrame["tachr_219_meteo_1"].atk * buffFrame["tachr_219_meteo_1"].prob;
  } else if (buffFrame["tachr_166_skfire_1"]) { //
    buffFrame.damage_scale *= buffFrame["tachr_166_skfire_1"].damage_scale;
  } else if (buffFrame["tachr_145_prove_1"]) { // 狩猎箭头, 攻击时，20%几率当次攻击的攻击力提升至190%<@ba.talpu>（+10%）</>。当敌人在正前方一格时，该几率提升到50%, {"prob":0.2,"prob2":0.5,"atk_scale":1.9}
    buffFrame.atk_scale *= 1 + buffFrame["tachr_145_prove_1"].prob2 * (buffFrame["tachr_145_prove_1"].atk_scale - 1);
  } else if (buffFrame["tachr_174_slbell_1"]) { // 虚弱化, 攻击范围内的敌人生命少于40%时，其受到的伤害提升至133%<@ba.talpu>（+3%）</>, {"hp_ratio":0.4,"damage_scale":1.33}
    buffFrame.damage_scale *= buffFrame["tachr_174_slbell_1"].damage_scale;
  } else if (buffFrame["tachr_283_midn_1"]) { // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
    buffFrame.atk_scale *= 1 + buffFrame["tachr_283_midn_1"].prob * (buffFrame["tachr_283_midn_1"].atk_scale - 1);
  } else if (buffFrame["tachr_124_kroos_1"]) { // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
    buffFrame.atk_scale *= 1 + buffFrame["tachr_124_kroos_1"].prob * (buffFrame["tachr_124_kroos_1"].atk_scale - 1);
  } else if (buffFrame["tachr_185_frncat_1"]) { // 连击, 攻击时有23%<@ba.talpu>（+3%）</>的几率连续攻击两次, {"prob":0.23}
    buffFrame.times += buffFrame["tachr_185_frncat_1"].prob;
  }

  if (!isSkill && charId == 'char_010_chen') {
    buffFrame.times += 1;
  }

  // Skill
  if (isSkill) {
    if (levelData.description.includes('法术伤害') || levelData.description.includes('伤害类型变为<@ba.vup>法术</>')) {
      damageType = 1;
    } else if (levelData.description.includes('进行治疗')) {
      damageType = 2;
    }

    if (false) { //
    } else if (levelData.prefabId == "skchr_texas_2") {
      buffFrame.times = 2;
    } else if (levelData.prefabId == "skchr_slbell_1") {
      delete blackboard.attack_speed;
    } else if (levelData.prefabId == "skchr_amgoat_1") {
      buffFrame.atk += basicFrame.atk * blackboard['amgoat_s_1[b].atk'];
      buffFrame.attackSpeed += blackboard['amgoat_s_1[b].attack_speed'];
    } else if (levelData.prefabId == "skchr_amgoat_2") {
      buffFrame.atk_scale *= blackboard['atk_scale_2'];
    } else if (levelData.prefabId == "skchr_ifrit_3") {
      buffFrame.enemyMagicResistance += blackboard['magic_resistance'];
    } else if (levelData.prefabId == "skchr_amgoat_2") {
      buffFrame.enemyMagicResistance += blackboard['magic_resistance'];
    }

    if (blackboard['atk']) buffFrame.atk += basicFrame.atk * blackboard['atk'];
    if (blackboard['attack_speed']) buffFrame.attackSpeed += blackboard['attack_speed'];
    if (blackboard['base_attack_time']) buffFrame.baseAttackTime += blackboard['base_attack_time'];
    if (blackboard['attack@atk_scale']) buffFrame.atk_scale *= blackboard['attack@atk_scale'];
    if (blackboard['atk_scale']) buffFrame.atk_scale *= blackboard['atk_scale'];
    if (blackboard['attack@times']) buffFrame.times = blackboard['attack@times'];
    if (blackboard['times']) buffFrame.times = blackboard['times'];
    if (blackboard['damage_scale']) buffFrame.damage_scale *= blackboard['damage_scale'];

    enemyMagicResistance += buffFrame.enemyMagicResistance || 0;
  }
  let finalFrame = getBuffedAttributes(basicFrame, buffFrame);
  let attackTime = finalFrame.baseAttackTime / finalFrame.attackSpeed * 100;
  if (isSkill && levelData.prefabId == "skchr_aglina_2") {
    attackTime *= blackboard['base_attack_time'];
  } else if (isSkill && levelData.prefabId == "skchr_ifrit_3") {
    attackTime = 1;
  } else if (isSkill && levelData.prefabId == "skchr_yuki_2") {
    attackTime = 1;
  }

  let attackCount = 0;
  let duration = 0;

  if (isSkill) {
    if (levelData.duration <= 0) {
      attackCount = 1;
      duration = attackTime;
    } else {
      attackCount = Math.floor(levelData.duration / attackTime);
      duration = attackCount * attackTime;
    }
  } else {
    switch (levelData.spData.spType) {
      case 1:
        //let sp1 = 1;
        //if (buffFrame["tachr_002_amiya_1"]) sp1 += buffFrame["tachr_002_amiya_1"]["amiya_t_1[atk].sp"]; // 情绪吸收, 攻击敌人时额外回复3<@ba.talpu>（+1）</>点技力，消灭敌人后额外获得10<@ba.talpu>（+2）</>点技力, {"amiya_t_1[atk].sp":3,"amiya_t_1[kill].sp":10}
        attackCount = Math.ceil(levelData.spData.spCost / attackTime);
        break;
      case 2:
        //let sp2 = 1;
        // "tachr_134_ifrit_2" 莱茵回路, 每5.5<@ba.talpu>（-0.5）</>秒额外回复2点技力, {"sp":2,"interval":5.5}
        // "tachr_010_chen_1", 呵斥, 在场时每4秒回复全场友方角色1点攻击/受击技力, {"interval":4,"sp":1}

        attackCount = levelData.spData.spCost;
        break;
      case 4:
        return;
      default:
        console.log(levelData.prefabId + ',' + levelData.spData.spType);
        return;
    }
    duration = attackCount * attackTime;
  }

  let hitDamage = finalFrame.atk;
  let emr = 1 - enemyMagicResistance / 100;
  if (damageType == 0 && enemy.def != 0) {
    let floorRate = 0.05;
    if (buffFrame["tachr_144_red_1"]) floorRate = buffFrame["tachr_144_red_1"].atk_scale; // 刺骨, 每次攻击至少造成33%<@ba.talpu>（+3%）</>攻击力的伤害, {"atk_scale":0.33}
    let def = enemy.def;
    if (buffFrame["tachr_106_franka_1"]) def *= buffFrame["tachr_106_franka_1"].prob; // 铝热剑, 攻击时有20%的几率无视目标的防御, {"prob":0.2}
    hitDamage = Math.max(finalFrame.atk - def, finalFrame.atk * floorRate);
  } else if (damageType == 1 && enemyMagicResistance != 0) {
    hitDamage *= emr;
  }

  let damagePool = [0, 0, 0];
  damagePool[damageType] += hitDamage * buffFrame.times * attackCount;

  if (isSkill && levelData.prefabId == "skchr_ifrit_2") {
    damagePool[1] += (basicFrame.atk+buffFrame.atk) * blackboard['burn.atk_scale'] * duration * emr;
  } else if (isSkill && buffFrame["tachr_129_bluep_1"]) { // 神经毒素, 攻击使目标中毒，在3秒内每秒受到85<@ba.talpu>（+10）</>点法术伤害, {"duration":3.1,"poison_damage":85}
    damagePool[1] += buffFrame["tachr_129_bluep_1"].poison_damage * duration * emr;
  } else if (!isSkill && (levelData.prefabId == "skchr_aglina_2" || levelData.prefabId == "skchr_aglina_3")) {
    damagePool = [0, 0, 0];
  }

  /*
  "tachr_215_mantic_1", // 隐匿的杀手·精英, 平时处于隐匿状态（不会被远程攻击选为目标），攻击时会解除隐匿状态，且当次攻击的攻击力+54%<@ba.talpu>（+4%）</>。停止攻击5秒后，重新进入隐匿状态, {"delay":5,"atk":0.54}
  "tachr_164_nightm_1", // 表里人格, 装备技能1时获得45%<@ba.talpu>（+5%）</>的物理和法术闪避，装备技能2时获得+18%<@ba.talpu>（+3%）</>攻击力, {"prob":0.45,"atk":0.18}
*/

  let totalDamage = damagePool[0] + damagePool[1] + damagePool[2];
  let dps = totalDamage / duration;

  return {
    dps,
    duration,
    hitDamage,
    totalDamage,
    damagePool,
    basicAtk: finalFrame.atk,
    attackSpeed: finalFrame.attackSpeed,
    attackTime,
    buff: buffFrame,
    frame: finalFrame,
    emr,
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
    target: 1,
    times: 1,
  };

  if (char.level == charData.phases[char.phase].maxLevel) {
    attributesKeyFrames = Object.assign(attributesKeyFrames, phaseData.attributesKeyFrames[1].data);
  } else {
    AttributeKeys.forEach(key => {
      attributesKeyFrames[key] = getAttribute(phaseData.attributesKeyFrames, char.level, key);
    });
  }

  let favorLevel = Math.floor(Math.min(char.favor, 100) / 2);
  AttributeKeys.forEach(key => {
    attributesKeyFrames[key] += getAttribute(charData.favorKeyFrames, favorLevel, key);
    buffs[key] = 0;
  });

  applyPotential(char.charId, charData, char.potentialRank, attributesKeyFrames);

  charData.talents.forEach(talentData => {
    for (let i = talentData.candidates.length - 1; i >= 0; i--) {
      if (char.phase >= talentData.candidates[i].unlockCondition.phase && char.level >= talentData.candidates[i].unlockCondition.level) {
        let blackboard = getBlackboard(talentData.candidates[i].blackboard);
        let prefabKey = 'tachr_' + char.charId.slice(5) + '_' + talentData.candidates[i].prefabKey;
        if ( !char.cond && CondList.includes(prefabKey) ) break;
        applyTalent(prefabKey, blackboard, attributesKeyFrames, buffs);
        break;
      }
    }
  });

  return {
    basic: attributesKeyFrames,
    buffs: buffs,
  };
}

function getBuffedAttributes(basic, buffs) {
  let final = {};
  AttributeKeys.forEach(key => {
    final[key] = basic[key] + buffs[key];
  });
  final.atk *= buffs.atk_scale;
  final.def *= buffs.def_scale;
  final.atk *= buffs.damage_scale;
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

function getAttribute(frames, level, attr) {
  return Math.ceil((level - 1) / (frames[1].level - frames[0].level) * (frames[1].data[attr] - frames[0].data[attr]) + frames[0].data[attr]);
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
  "tachr_286_cast3_1",
  "tachr_503_rang_1",
  "tachr_126_shotst_1",
  "tachr_198_blackd_1",
  "tachr_149_scave_1",
  "tachr_187_ccheal_1",
  "tachr_166_skfire_1",
  "tachr_158_milu_1",
  "tachr_173_slchan_1",
  "tachr_230_savage_1",


];

const HardcodeList = [
  "tachr_290_vigna_1", // 蛮力穿刺, 攻击时，10%几率当次攻击的攻击力+110%<@ba.talpu>（+10%）</>。技能中这个几率提高到30%, {"atk":1.1,"prob1":0.1,"prob2":0.3}
  "tachr_185_frncat_1", // 连击, 攻击时有23%<@ba.talpu>（+3%）</>的几率连续攻击两次, {"prob":0.23}
  "tachr_237_gravel_1+", // 小个子支援, 自身部署费用-1，所有部署费用不超过10的单位防御力提升8%<@ba.talpu>（+2%）</>, {"cost":-1,"def":0.08,"cond.cost":10}
  "tachr_196_sunbr_1", // 平底锅专精, 攻击时，18%<@ba.talpu>（+3%）</>几率当次攻击的攻击力提升至200%，并眩晕敌人1秒, {"prob":0.18,"atk_scale":2,"stun":1}
  "tachr_106_franka_1", // 铝热剑, 攻击时有20%的几率无视目标的防御, {"prob":0.2}
  "tachr_129_bluep_1", // 神经毒素, 攻击使目标中毒，在3秒内每秒受到85<@ba.talpu>（+10）</>点法术伤害, {"duration":3.1,"poison_damage":85}
  "tachr_219_meteo_1", // 爆破附着改装, 普通攻击和技能释放时，30%几率当次攻击的攻击力+60%, {"atk":0.6,"prob":0.3}
  "tachr_002_amiya_1", // 情绪吸收, 攻击敌人时额外回复3<@ba.talpu>（+1）</>点技力，消灭敌人后额外获得10<@ba.talpu>（+2）</>点技力, {"amiya_t_1[atk].sp":3,"amiya_t_1[kill].sp":10}
  "tachr_166_skfire_1", // 法术狙击, 在场时，所有被阻挡的敌人受到法术伤害时伤害提升18%<@ba.talpu>（+3%）</>, {"damage_scale":1.18}
  "tachr_144_red_1", // 刺骨, 每次攻击至少造成33%<@ba.talpu>（+3%）</>攻击力的伤害, {"atk_scale":0.33}
  "tachr_145_prove_1", // 狩猎箭头, 攻击时，20%几率当次攻击的攻击力提升至190%<@ba.talpu>（+10%）</>。当敌人在正前方一格时，该几率提升到50%, {"prob":0.2,"prob2":0.5,"atk_scale":1.9}
  "tachr_174_slbell_1", // 虚弱化, 攻击范围内的敌人生命少于40%时，其受到的伤害提升至133%<@ba.talpu>（+3%）</>, {"hp_ratio":0.4,"damage_scale":1.33}
  "tachr_215_mantic_1", // 隐匿的杀手·精英, 平时处于隐匿状态（不会被远程攻击选为目标），攻击时会解除隐匿状态，且当次攻击的攻击力+54%<@ba.talpu>（+4%）</>。停止攻击5秒后，重新进入隐匿状态, {"delay":5,"atk":0.54}
  "tachr_134_ifrit_2", // 莱茵回路, 每5.5<@ba.talpu>（-0.5）</>秒额外回复2点技力, {"sp":2,"interval":5.5}
  "tachr_010_chen_1", // 呵斥, 在场时每4秒回复全场友方角色1点攻击/受击技力, {"interval":4,"sp":1}
  "tachr_283_midn_1", // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
  "tachr_124_kroos_1",
  "tachr_164_nightm_1", // 表里人格, 装备技能1时获得45%<@ba.talpu>（+5%）</>的物理和法术闪避，装备技能2时获得+18%<@ba.talpu>（+3%）</>攻击力, {"prob":0.45,"atk":0.18}
];

function applyTalent(prefabKey, blackboard, basic, buffs) {
  if (false) {} // skip
  else if (prefabKey == "tachr_141_nights_1" || prefabKey == "tachr_134_ifrit_1") {
    buffs.enemyMagicResistance = blackboard.magic_resistance * 100;
    blackboard = {};
  } // 黑色迷雾, 攻击使目标法术抗性-23%<@ba.talpu>（+3%）</>，持续1秒, {"duration":1,"magic_resistance":-0.23}
  else if (prefabKey == "tachr_109_fmout_1") {
    blackboard = {};
  } // 占卜, 部署后随机永久获得下列一项增益：攻击力+15%<@ba.talpu>（+2%）</>；攻击速度+15<@ba.talpu>（+2）</>；生命上限+22%<@ba.talpu>（+2%）</>, {"attack_speed":15,"atk":0.15,"max_hp":0.22}
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
    blackboard = {};
  } // 莱茵充能护服, 每在场上停留20秒，攻击力+6%<@ba.talpu>（+1%）</>，防御力+5%<@ba.talpu>（+1%）</>，最多叠加5层, {"max_stack_cnt":5,"interval":20,"atk":0.06,"def":0.05}
  else if (prefabKey == "tachr_137_brownb_1") {
    buffs.atk += basic.atk * blackboard.atk * blackboard.max_stack_cnt;
    blackboard = {};
  } // 竞技专注, 攻击相同目标时每次攻击可提高自身攻击力6%<@ba.talpu>（+1%）</>，最多可叠加5层。更换目标会失去之前叠加的效果, {"max_stack_cnt":5,"atk":0.06}
  else if (HardcodeList.includes(prefabKey)) {
    buffs[prefabKey] = blackboard;
    blackboard = {};
  }

  if (blackboard.atk) buffs.atk += basic.atk * blackboard.atk;
  if (blackboard.def) buffs.def += basic.def * blackboard.def;
  if (blackboard.respawn_time) basic.respawnTime += blackboard.respawn_time;
  if (blackboard.cost) buffs.cost += blackboard.cost;
  if (blackboard.attack_speed) buffs.attackSpeed += blackboard.attack_speed;
  if (blackboard.base_attack_time) buffs.baseAttackTime += blackboard.base_attack_time;
  if (blackboard.sp_recovery_per_sec) buffs.spRecoveryPerSec += blackboard.sp_recovery_per_sec;

  if (blackboard.atk_scale) buffs.atk_scale *= blackboard.atk_scale;
  if (blackboard.def_scale) buffs.def_scale *= blackboard.def_scale;


  /*
    if (false) {} // skip
    else if (prefabKey == "tachr_286_cast3_1") {} // 战术整理·VI, 部署后20秒内所有友方【近战位】单位的攻击力和防御力+20%, {"duration":20,"atk":0.2,"def":0.2}
    else if (prefabKey == "tachr_502_nblade_1") {} // 快速重新部署, 再部署时间-30秒, {"respawn_time":-30}
    else if (prefabKey == "tachr_500_noirc_1") {} // 装甲改良, 生命上限和防御力各+12%, {"max_hp":0.12,"def":0.12}
    else if (prefabKey == "tachr_503_rang_1") {} // 空射大师, 攻击飞行目标时，攻击力+50%, {"atk_scale":1.5}
    else if (prefabKey == "tachr_501_durin_1") {} // 小个子的幸运, 获得50%的法术闪避, {"prob":0.5}
    else if (prefabKey == "tachr_009_12fce_1") {} // 闪避率提升, 获得50%的物理闪避, {"prob":0.5}
    else if (prefabKey == "tachr_281_popka_1") {} // 生命攻击提升, 生命上限+8%<@ba.talpu>（+2%）</>，攻击力+8%<@ba.talpu>（+2%）</>, {"atk":0.08,"max_hp":0.08}
    else if (prefabKey == "tachr_209_ardign_1") {} // 生命上限提升, 生命上限+12%, {"max_hp":0.12}
    else if (prefabKey == "tachr_122_beagle_1") {} // 防御提升, 防御力+10%, {"def":0.1}
    else if (prefabKey == "tachr_284_spot_1") {} // 烟雾加装, 治疗友方单位后为其提供持续3秒的25%<@ba.talpu>（+5%）</>物理闪避, {"prob":0.25,"duration":3}
    else if (prefabKey == "tachr_124_kroos_1") {} // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
    else if (prefabKey == "tachr_211_adnach_1") {} // 短板突破, 攻击速度+8，优先攻击使用远程武器的敌人, {"attack_speed":0.08}
    else if (prefabKey == "tachr_121_lava_1") {} // 快速技能使用, 部署后立即获得35<@ba.talpu>（+5）</>点技力, {"sp":35}
    else if (prefabKey == "tachr_120_hibisc_1") {} // 治疗力提升, 攻击力+8%, {"atk":0.08}
    else if (prefabKey == "tachr_212_ansel_1") {} // 附加治疗, 有18%<@ba.talpu>（+3%）</>的几率额外治疗一名友方单位, {"attack@prob":0.18}
    else if (prefabKey == "tachr_210_stward_1") {} // 铠甲突破, 攻击力+6%，优先攻击防御力最高的敌人, {"atk":0.06}
    else if (prefabKey == "tachr_278_orchid_1") {} // 施法速度提升, 攻击速度+9, {"attack_speed":9}
    else if (prefabKey == "tachr_141_nights_1") {} // 黑色迷雾, 攻击使目标法术抗性-23%<@ba.talpu>（+3%）</>，持续1秒, {"duration":1,"magic_resistance":-0.23}
    else if (prefabKey == "tachr_109_fmout_1") {} // 占卜, 部署后随机永久获得下列一项增益：攻击力+15%<@ba.talpu>（+2%）</>；攻击速度+15<@ba.talpu>（+2）</>；生命上限+22%<@ba.talpu>（+2%）</>, {"attack_speed":15,"atk":0.15,"max_hp":0.22}
    else if (prefabKey == "tachr_253_greyy_1") {} // 静电场, 攻击时对攻击目标造成0.6秒的停顿, {"sluggish":0.6}
    else if (prefabKey == "tachr_235_jesica_1") {} // 快速弹匣, 攻击速度+12, {"attack_speed":12}
    else if (prefabKey == "tachr_126_shotst_1") {} // 空射专精, 攻击飞行目标时，攻击力+40%<@ba.talpu>（+5%）</>, {"atk_scale":1.4}
    else if (prefabKey == "tachr_118_yuki_1") {} // 重型手里剑, 攻击间隔略微增大，但攻击力+20%, {"base_attack_time":0.2,"atk":0.2}
    else if (prefabKey == "tachr_198_blackd_1") {} // 雪境巡逻员, 阻挡两个及以上的敌人时，防御力+19%<@ba.talpu>（+3%）</>, {"cnt":2,"def":0.19}
    else if (prefabKey == "tachr_149_scave_1") {} // 单独行动者, 当周围四格内没有其他友方单位时，攻击力和防御力各+13%<@ba.talpu>（+2%）</>, {"atk":0.13,"def":0.13}
    else if (prefabKey == "tachr_290_vigna_1") {} // 蛮力穿刺, 攻击时，10%几率当次攻击的攻击力+110%<@ba.talpu>（+10%）</>。技能中这个几率提高到30%, {"atk":1.1,"prob1":0.1,"prob2":0.3}
    else if (prefabKey == "tachr_130_doberm_1") {} // 新人教官, 所有三星干员的攻击力+11%<@ba.talpu>（+1%）</>, {"atk":0.11}
    else if (prefabKey == "tachr_289_gyuki_1") {} // 恶鬼体质, 防御力-20%，但最大生命值+23%<@ba.talpu>（+3%）</>, {"def":-0.2,"max_hp":0.23}
    else if (prefabKey == "tachr_193_frostl_1") {} // 掩护打击, 攻击范围扩大，但攻击间隔略微增大, {"base_attack_time":0.15}
    else if (prefabKey == "tachr_127_estell_1") {} // 自愈能力, 周围8格内有敌人倒下时，恢复自身最大生命值14%<@ba.talpu>（+2%）</>的生命, {"hp_ratio":0.14}
    else if (prefabKey == "tachr_185_frncat_1") {} // 连击, 攻击时有23%<@ba.talpu>（+3%）</>的几率连续攻击两次, {"prob":0.23}
    else if (prefabKey == "tachr_237_gravel_1+") {} // 小个子支援, 自身部署费用-1，所有部署费用不超过10的单位防御力提升8%<@ba.talpu>（+2%）</>, {"cost":-1,"def":0.08,"cond.cost":10}
    else if (prefabKey == "tachr_236_rope_1") {} // 听觉训练, 获得34%<@ba.talpu>（+4%）</>的物理闪避, {"prob":0.34}
    else if (prefabKey == "tachr_117_myrrh_1") {} // 急救包, 部署后立刻恢复全体友方单位的生命值，恢复量为末药攻击力的160%<@ba.talpu>（+10%）</>, {"heal_scale":1.6}
    else if (prefabKey == "tachr_187_ccheal_1") {} // 战地医师, 部署后全体友方【医疗】职业干员攻击力+12%<@ba.talpu>（+2%）</>，防御力+120<@ba.talpu>（+20）</>，持续17<@ba.talpu>（+2）</>秒, {"atk":0.12,"def":120,"duration":17}
    else if (prefabKey == "tachr_181_flower_1") {} // 熏衣香, 在战场时全体友方单位每秒恢复相当于调香师攻击力5.5%<@ba.talpu>（+0.5%）</>的生命, {"atk_to_hp_recovery_ratio":0.055}
    else if (prefabKey == "tachr_199_yak_1") {} // 雪原卫士, 法术抗性+15, {"magic_resistance":15}
    else if (prefabKey == "tachr_150_snakek_1") {} // 防御专精, 防御力+12%, {"def":0.12}
    else if (prefabKey == "tachr_196_sunbr_1") {} // 平底锅专精, 攻击时，18%<@ba.talpu>（+3%）</>几率当次攻击的攻击力提升至200%，并眩晕敌人1秒, {"prob":0.18,"atk_scale":2,"stun":1}
    else if (prefabKey == "tachr_110_deepcl_1") {} // 召唤触手, 可以使用四个触手召唤物来协助作战, {"cnt":4}
    else if (prefabKey == "tachr_183_skgoat_1") {} // 地质勘探, 稍微延长特性停顿的持续时间, {"sluggish":0.13}
    else if (prefabKey == "tachr_277_sqrrel_1") {} // 防火护服, 法术抗性+15, {"magic_resistance":15}
    else if (prefabKey == "tachr_128_plosis_1") {} // 技力光环, 在场时较大提升全场友方单位的技力回复速度, {"sp_recovery_per_sec":0.3}
    else if (prefabKey == "tachr_115_headbr_1+") {} // 冲锋领袖, 编入队伍时所有【先锋】职业干员的部署费用-1, {"cost":-1}
    else if (prefabKey == "tachr_102_texas_1") {} // 战术快递, 编入队伍后，额外获得2点初始部署费用, {"cost":2}
    else if (prefabKey == "tachr_308_swire_1") {} // 近距离作战指导, 在场时周围8格内的近战友方单位攻击力+12%<@ba.talpu>（+2%）</>, {"atk":0.12}
    else if (prefabKey == "tachr_106_franka_1") {} // 铝热剑, 攻击时有20%的几率无视目标的防御, {"prob":0.2}
    else if (prefabKey == "tachr_155_tiger_1") {} // 虎拳迅击, 有33%<@ba.talpu>（+3%）</>的概率闪避敌人的近战物理攻击，成功闪避后自己的下一次攻击攻击力+100%, {"tiger_t_1[evade].prob":0.33,"charge_on_evade.atk":1}
    else if (prefabKey == "tachr_140_whitew_1") {} // 精神摧毁, 攻击使目标的特殊能力失效，持续6<@ba.talpu>（+1）</>秒, {"duration":6}
    else if (prefabKey == "tachr_143_ghost_1") {} // 深海再生力, 生命上限+12%<@ba.talpu>（+2%）</>，每秒回复最大生命2.5%<@ba.talpu>（+0.5%）</>的生命, {"max_hp":0.12,"hp_recovery_per_sec_by_max_hp_ratio":0.025}
    else if (prefabKey == "tachr_129_bluep_1") {} // 神经毒素, 攻击使目标中毒，在3秒内每秒受到85<@ba.talpu>（+10）</>点法术伤害, {"duration":3.1,"poison_damage":85}
    else if (prefabKey == "tachr_204_platnm_1") {} // 蓄力攻击, 距离上次攻击的间隔越长，下次攻击的攻击力就越高（最长2.5秒，攻击力190%<@ba.talpu>（+10%）</>）, {"attack@min_delta":1,"attack@max_delta":2.5,"attack@min_atk_scale":1,"attack@max_atk_scale":1.9}
    else if (prefabKey == "tachr_219_meteo_1") {} // 爆破附着改装, 普通攻击和技能释放时，30%几率当次攻击的攻击力+60%, {"atk":0.6,"prob":0.3}
    else if (prefabKey == "tachr_002_amiya_1") {} // 情绪吸收, 攻击敌人时额外回复3<@ba.talpu>（+1）</>点技力，消灭敌人后额外获得10<@ba.talpu>（+2）</>点技力, {"amiya_t_1[atk].sp":3,"amiya_t_1[kill].sp":10}
    else if (prefabKey == "tachr_166_skfire_1") {} // 法术狙击, 在场时，所有被阻挡的敌人受到法术伤害时伤害提升18%<@ba.talpu>（+3%）</>, {"damage_scale":1.18}
    else if (prefabKey == "tachr_242_otter_1") {} // 机械水獭, 可以使用5个机械水獭召唤物。攻击机械水獭的敌人攻击速度-25, {"cnt":5}
    else if (prefabKey == "tachr_108_silent_1") {} // 强化注射, 在场时，所有友方【医疗】职业干员攻速+14<@ba.talpu>（+2）</>, {"attack_speed":14}
    else if (prefabKey == "tachr_171_bldsk_1") {} // 血液样本回收, 攻击范围内有敌人倒下时，为自身和范围内随机一名友方单位回复2点技力, {"bldsk_t_1[self].sp":2,"bldsk_t_1[rand].sp":2}
    else if (prefabKey == "tachr_148_nearl_1+") {} // 天马光环, 在场时，全地图的友方单位医疗效果提高12%<@ba.talpu>（+2%）</>, {"heal_scale":1.12}
    else if (prefabKey == "tachr_144_red_1") {} // 刺骨, 每次攻击至少造成33%<@ba.talpu>（+3%）</>攻击力的伤害, {"atk_scale":0.33}
    else if (prefabKey == "tachr_107_liskam_1") {} // 战术防御, 受到攻击时，回复自己和周围一格内随机一名友方角色1点技力, {"sp":1}
    else if (prefabKey == "tachr_107_liskam_2") {} // 雷抗, 法术抗性+13<@ba.talpu>（+3）</>, {"magic_resistance":13}
    else if (prefabKey == "tachr_201_moeshd_1") {} // 奇迹力场, 有23%<@ba.talpu>（+3%）</>的几率抵挡物理和法术伤害。周围四格内的友方单位获得一半该效果, {"moeshd_t_1[self].prob":0.23,"moeshd_t_1[aura].prob":0.115}
    else if (prefabKey == "tachr_163_hpsts_1") {} // 自我防护, 技能开启时，每秒恢复最大生命值5%<@ba.talpu>（+1%）</>的生命，同时获得30%<@ba.talpu>（+4%）</>的近战物理闪避, {"hp_recovery_per_sec_by_max_hp_ratio":0.05,"prob":0.3}
    else if (prefabKey == "tachr_145_prove_1") {} // 狩猎箭头, 攻击时，20%几率当次攻击的攻击力提升至190%<@ba.talpu>（+10%）</>。当敌人在正前方一格时，该几率提升到50%, {"prob":0.2,"prob2":0.5,"atk_scale":1.9}
    else if (prefabKey == "tachr_158_milu_1") {} // 暗杀者, 攻击使用远程武器的敌人时，攻击力提升至145%<@ba.talpu>（+5%）</>, {"atk_scale":1.45}
    else if (prefabKey == "tachr_173_slchan_1") {} // 雪境猎手, 未阻挡敌人时，攻击力和防御力各+14%<@ba.talpu>（+2%）</>, {"atk":0.14,"def":0.14}
    else if (prefabKey == "tachr_174_slbell_1") {} // 虚弱化, 攻击范围内的敌人生命少于40%时，其受到的伤害提升至133%<@ba.talpu>（+3%）</>, {"hp_ratio":0.4,"damage_scale":1.33}
    else if (prefabKey == "tachr_174_slbell_2") {} // 双响, 攻击时同时攻击两个目标, {"attack@max_target":2}
    else if (prefabKey == "tachr_195_glassb_1") {} // 探知者, 防御力-35%，但攻击速度+21<@ba.talpu>（+3）</>, {"def":-0.35,"attack_speed":21}
    else if (prefabKey == "tachr_101_sora_1") {} // 安可, 技能结束后，50%几率立即回复50%的最大技力, {"prob":0.5,"sp":0.5}
    else if (prefabKey == "tachr_215_mantic_1") {} // 隐匿的杀手·精英, 平时处于隐匿状态（不会被远程攻击选为目标），攻击时会解除隐匿状态，且当次攻击的攻击力+54%<@ba.talpu>（+4%）</>。停止攻击5秒后，重新进入隐匿状态, {"delay":5,"atk":0.54}
    else if (prefabKey == "tachr_241_panda_1") {} // 功夫, 获得43%<@ba.talpu>（+3%）</>的物理闪避, {"prob":0.43}
    else if (prefabKey == "tachr_103_angel_1") {} // 快速弹匣, 攻击速度+15<@ba.talpu>（+3）</>, {"attack_speed":15}
    else if (prefabKey == "tachr_103_angel_2") {} // 天使的祝福, 攻击力+8%<@ba.talpu>（+2%）</>，生命上限+13%<@ba.talpu>（+3%）</>。置入战场后这个效果会同样赋予给一名随机友方单位, {"max_hp":0.13,"atk":0.08}
    else if (prefabKey == "tachr_112_siege_1") {} // 万兽之王, 所有【先锋】职业干员的攻击力和防御力各+10%<@ba.talpu>（+2%）</>, {"atk":0.1,"def":0.1}
    else if (prefabKey == "tachr_112_siege_2") {} // 粉碎, 周围四格内有敌人倒下时获得1点技力, {"sp":1}
    else if (prefabKey == "tachr_134_ifrit_1") {} // 精神融解, 攻击范围内的敌军法术抗性-44%<@ba.talpu>（+4%）</>, {"magic_resistance":-0.44}
    else if (prefabKey == "tachr_134_ifrit_2") {} // 莱茵回路, 每5.5<@ba.talpu>（-0.5）</>秒额外回复2点技力, {"sp":2,"interval":5.5}
    else if (prefabKey == "tachr_180_amgoat_1") {} // 炎息, 在场时，所有友方【术师】职业干员的攻击力+16%<@ba.talpu>（+2%）</>, {"atk":0.16}
    else if (prefabKey == "tachr_180_amgoat_2") {} // 乱火, 部署后立即随机获得较多的技力, {"sp_min":10,"sp_max":20}
    else if (prefabKey == "tachr_291_aglina_1") {} // 加速力场, 全场友方单位攻速+8<@ba.talpu>（+1）</>, {"attack_speed":8}
    else if (prefabKey == "tachr_291_aglina_2") {} // 兼职工作, 技能未开启时，全场友方单位每秒回复25<@ba.talpu>（+5）</>点生命, {"hp_recovery_per_sec":25}
    else if (prefabKey == "tachr_147_shining_1") {} // 黑恶魔的庇护, 攻击范围内的友方单位防御力+65<@ba.talpu>（+5）</>, {"def":65}
    else if (prefabKey == "tachr_147_shining_2") {} // 法典, 攻击速度+13<@ba.talpu>（+3）</>, {"attack_speed":13}
    else if (prefabKey == "tachr_179_cgbird_1") {} // 白恶魔的庇护, 攻击范围内的友方单位法术抗性+17<@ba.talpu>（+2）</>, {"magic_resistance":17}
    else if (prefabKey == "tachr_179_cgbird_2") {} // 转瞬即逝的幻影, 可以使用幻影。幻影无法攻击和阻挡敌人，拥有75法术抗性，30%的物理闪避，并且更容易吸引敌人的攻击，同时每秒损失3%的最大生命, {"cnt":2}
    else if (prefabKey == "tachr_136_hsguma_1") {} // 战术装甲, 获得28%<@ba.talpu>（+3%）</>的物理抵挡和法术抵挡, {"prob":0.28}
    else if (prefabKey == "tachr_136_hsguma_2") {} // 特种作战策略, 所有友方【重装】职业干员的防御力提升8%<@ba.talpu>（+2%）</>, {"def":0.08}
    else if (prefabKey == "tachr_202_demkni_1") {} // 莱茵充能护服, 每在场上停留20秒，攻击力+6%<@ba.talpu>（+1%）</>，防御力+5%<@ba.talpu>（+1%）</>，最多叠加5层, {"max_stack_cnt":5,"interval":20,"atk":0.06,"def":0.05}
    else if (prefabKey == "tachr_202_demkni_2") {} // 精神回复, 每次回复友方单位生命值时额外回复该单位1点技力, {"sp":1}
    else if (prefabKey == "tachr_172_svrash_1") {} // 领袖, 攻击力+12%<@ba.talpu>（+2%）</>，所有干员的再部署时间-12%<@ba.talpu>（+2%）</>, {"atk":0.12,"respawn_time":-0.12}
    else if (prefabKey == "tachr_172_svrash_2") {} // 鹰眼视觉, 攻击范围内敌人的隐匿效果失效, {}
    else if (prefabKey == "tachr_010_chen_1") {} // 呵斥, 在场时每4秒回复全场友方角色1点攻击/受击技力, {"interval":4,"sp":1}
    else if (prefabKey == "tachr_010_chen_2") {} // 持刀格斗术, 攻击力+6%<@ba.talpu>（+1%）</>，防御力+6%<@ba.talpu>（+1%）</>，物理闪避+13%<@ba.talpu>（+3%）</>, {"atk":0.06,"def":0.06,"prob":0.13}
    else if (prefabKey == "tachr_230_savage_1") {} // 山谷, 周围四格中有两格以上的高地地形时攻击力和防御力+10%, {"cnt":2,"atk":0.1,"def":0.1}
    else if (prefabKey == "tachr_282_catap_1") {} // 轻量化, 自身部署费用-1, {"cost":-1}
    else if (prefabKey == "tachr_283_midn_1") {} // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
    else if (prefabKey == "tachr_137_brownb_1") {} // 竞技专注, 攻击相同目标时每次攻击可提高自身攻击力6%<@ba.talpu>（+1%）</>，最多可叠加5层。更换目标会失去之前叠加的效果, {"max_stack_cnt":5,"atk":0.06}
    else if (prefabKey == "tachr_164_nightm_1") {} // 表里人格, 装备技能1时获得45%<@ba.talpu>（+5%）</>的物理和法术闪避，装备技能2时获得+18%<@ba.talpu>（+3%）</>攻击力, {"prob":0.45,"atk":0.18}
    else if (prefabKey == "tachr_220_grani_1") {} // 骑警, 在场时，所有【先锋】职业干员获得25%<@ba.talpu>（+5%）</>的物理闪避, {"prob":0.25}
    else if (prefabKey == "tachr_263_skadi_1") {} // 深海掠食者, 所有【深海猎人】干员的攻击力+16%<@ba.talpu>（+2%）</>, {"atk":0.16}
    else if (prefabKey == "tachr_263_skadi_2") {} // 迅捷出击, 自身再部署时间-10秒, {"respawn_time":-10}
    */
}


AKDATA.attributes = {
  getCharAttributes,
  calculateDps,
}