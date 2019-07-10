function getCharAttributes(charId, phase, level) {
  let [basicFrame, buffFrame, skillFrame] = getAttributes(charId, phase, level);
  let normalFrame = getFinalAttributes(basicFrame, buffFrame);
  return normalFrame;
}

function calculateDps(charId, skillId, phase, level, skillLevel = -1) {
/*
  let char = Characters[index];
  let charId = getElement('char', index).val();
  let phase = ~~getElement('phase', index).val();
  let level = ~~getElement('level', index).val();
  let skillId = getElement('skill', index).val();
*/
  let [basicFrame, buffFrame, skillFrame] = getAttributes(charId, phase, level);

  // Normal
  let normalFrame = getFinalAttributes(basicFrame, buffFrame);
  let normalDps = normalFrame.atk / normalFrame.baseAttackTime * normalFrame.attackSpeed / 100;
  if ( charId == 'char_010_chen' ) normalDps *= 2;
  /*
  getElement('atk', index).html(Math.round(normalFrame.atk*10)/10);
  getElement('attackSpeed', index).html(Math.round(normalFrame.attackSpeed*10)/10);
  getElement('baseAttackTime', index).html(Math.round(normalFrame.baseAttackTime*100)/100);
*/
  // Skill
  //let peakResult = getFinalAttributes(basic, buff, skill);
  let skillData = AKDATA.Data.skill_table[skillId];
  if ( skillLevel == -1 ) skillLevel = skillData.levels.length - 1;
  let levelData = skillData.levels[skillLevel];
  let blackboard = {};
  levelData.blackboard.forEach(kv => blackboard[kv.key] = kv.value);
  if (blackboard['base_attack_time']) skillFrame.baseAttackTime += blackboard['base_attack_time'];
  if (levelData.prefabId == "skchr_texas_2") {
    blackboard.times = 2;
  } else if (levelData.prefabId == "skchr_slbell_1") {
    delete blackboard.attack_speed;
  } else if (levelData.prefabId == "skchr_amgoat_1") {
    skillFrame.atk += basicFrame.atk * blackboard['amgoat_s_1[b].atk'];
    skillFrame.attackSpeed += blackboard['amgoat_s_1[b].attack_speed'];
  } else if (levelData.prefabId == "skchr_amgoat_2") {
    blackboard['atk_scale'] += blackboard['atk_scale_2'];
  } else if (levelData.prefabId == "skchr_aglina_2") {
    basicFrame.baseAttackTime *= blackboard['base_attack_time'];
  }
  if (blackboard['atk']) skillFrame.atk += basicFrame.atk * blackboard['atk'];
  if (blackboard['attack_speed']) skillFrame.attackSpeed += blackboard['attack_speed'];
  if (levelData.prefabId == "skchr_aglina_2" || levelData.prefabId == "skchr_aglina_3") {
    normalDps = '0';
  }

  let skillFinalFrame = getFinalAttributes(basicFrame, buffFrame, skillFrame);
  let skillDps = 0;
  let skillAtk = skillFinalFrame.atk;
  let skillDamage = 0;
  let skillDuration = 0;
  let skillAttackCount = 0;
  let skillAttackTime = skillFinalFrame.baseAttackTime / skillFinalFrame.attackSpeed * 100;
  if (levelData.duration <= 0) {
    skillDuration = skillAttackTime;
    skillAttackCount = 1;
  } else {
    if (levelData.prefabId == "skchr_ifrit_3") skillAttackTime = 1;
    skillAttackCount = Math.floor(levelData.duration / skillAttackTime);
    skillDuration = skillAttackCount * skillAttackTime;
  }
  if (blackboard['attack@atk_scale']) skillAtk *= blackboard['attack@atk_scale'];
  if (blackboard['atk_scale']) skillAtk *= blackboard['atk_scale'];
  if (blackboard['attack@times']) skillAtk *= blackboard['attack@times'];
  if (blackboard['times']) skillAtk *= blackboard['times'];
  if (blackboard['damage_scale']) skillAtk *= blackboard['damage_scale'];
  skillDamage = skillAtk * skillAttackCount;

  if (levelData.prefabId == "skchr_ifrit_2") {
    skillDamage += skillAtk * blackboard['burn.atk_scale'] * Math.ceil(skillDuration);
  } else if (levelData.prefabId == "skchr_ifrit_3") {
    skillDamage *= 1 - blackboard['magic_resistance'] / 100;
  } else if (levelData.prefabId == "skchr_amgoat_2") {
    skillDamage *= 1 - blackboard['magic_resistance'];
  } else if (levelData.prefabId == "skchr_yuki_2") {
    skillDamage += skillAtk * Math.ceil(skillDuration);
  }
  skillDps = skillDamage / skillDuration;
  
  let globalDps = 0;
  let chargeDps = 0;
  let chargeDuration = 0;
  let chargeAttackCount = 0;
  let chargeDamage = 0;
  let chargeAttackTimes = normalFrame.baseAttackTime / normalFrame.attackSpeed * 100;
  if (levelData.spData.spType == 1) {
    chargeAttackCount = Math.ceil(levelData.spData.spCost / chargeAttackTimes);
  } else if (levelData.spData.spType == 2) {
    chargeAttackCount = levelData.spData.spCost;
  } else if (levelData.spData.spType == 4) {
    return;
  } else {
    console.log(levelData.prefabId + ',' + levelData.spData.spType);
  }
  chargeDuration = chargeAttackCount * chargeAttackTimes;
  chargeDamage += chargeAttackCount * normalFrame.atk;
  if ( charId == 'char_010_chen' ) chargeDamage *= 2;

  let waitDuration = 0;
  if (levelData.prefabId == "skchr_fmout_2") {
    waitDuration += blackboard.time;
  } else if (levelData.prefabId == "skchr_amiya_2") {
    waitDuration += blackboard.stun;
  } else if (levelData.prefabId == "skchr_liskam_2") {
    waitDuration += blackboard.stun;
  } else if (levelData.prefabId == "skchr_aglina_2" || levelData.prefabId == "skchr_aglina_3") {
    chargeDamage = 0;
  }

  globalDps = Math.round((skillDamage + chargeDamage) / (skillDuration + chargeDuration + waitDuration));

  if (levelData.duration <= 0) skillDps = globalDps;
  /*
  if (levelData.prefabId == "skchr_skadi_2" || levelData.prefabId == "skchr_amiya_3") {
    globalDps = '0';
  } else 
*/
  return {
    normalDps: Math.round(normalDps*10)/10,
    normalAtk: Math.round(normalFrame.atk*10)/10,
    normalAttackSpeed: Math.round(normalFrame.attackSpeed*10)/10,
    normalAttackTime: Math.round(normalFrame.baseAttackTime*100)/100,
    skillAtk: Math.round(skillAtk*10)/10,
    skillAttackTime: Math.round(skillAttackTime*100)/100,
    skillDamage: Math.round(skillDamage*100)/100,
    skillDps: Math.round(skillDps*10)/10,
    globalDps: Math.round(globalDps*10)/10,
  };
/*
  */
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

function getAttributes(charId, phase = -1, level = -1) {
  let charData = AKDATA.Data.character_table[charId];
  if (phase == -1) phase = charData.phases.length - 1;
  if (level == -1) level = charData.phases[phase].maxLevel;
  let favor = 50;
  let potentialRank = 5;
  let phaseData = charData.phases[phase];

  let attributesKeyFrames = {},
    buffKeyFrames = {},
    skillKeyFrames = {};

  if (level == charData.phases[phase].maxLevel) {
    attributesKeyFrames = Object.assign(attributesKeyFrames, phaseData.attributesKeyFrames[1].data);
  } else {
    AttributeKeys.forEach(key => {
      attributesKeyFrames[key] = getAttribute(phaseData.attributesKeyFrames, level, key);
    });
  }

  AttributeKeys.forEach(key => {
    attributesKeyFrames[key] += getAttribute(charData.favorKeyFrames, favor, key);
    buffKeyFrames[key] = 0;
    skillKeyFrames[key] = 0;
  });

  applyPotential(charId, charData, potentialRank, attributesKeyFrames);

  charData.talents.forEach(talentData => {
    for (let i = talentData.candidates.length - 1; i >= 0; i--) {
      if (phase >= talentData.candidates[i].unlockCondition.phase && level >= talentData.candidates[i].unlockCondition.level) {
        let blackboard = getBlackboard(talentData.candidates[i].blackboard);
        let prefabKey = charId + '_' + talentData.candidates[i].prefabKey;
        applyTalent(prefabKey, blackboard, attributesKeyFrames, buffKeyFrames, skillKeyFrames);
        break;
      }
    }
  });

  return [
    attributesKeyFrames,
    buffKeyFrames,
    skillKeyFrames,
  ];
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

function getBlackboard(blackboard) {
  let obj = {};
  blackboard.forEach(kv => obj[kv.key] = kv.value);
  return obj;
}

function applyPotential(charId, charData, rank, basic) {
  if ( !charData.potentialRanks || charData.potentialRanks.length == 0 ) return;
  for (let i = 0; i < rank; i++) {
    let potentialData = charData.potentialRanks[i];
    if (!potentialData.buff) continue;
    let y = potentialData.buff.attributes.attributeModifiers[0];
    let key = PotentialAttributeTypeList[y.attributeType];
    let value = y.value;
    basic[key] += value;
  }
}

function applyTalent(prefabKey, blackboard, basic, buff, skill) {
  if (false) {} else if (prefabKey == "char_285_medic2_1") {} // 救援喷雾·VI, 部署后立即恢复全场友方单位500点生命, {"value":500}
  else if (prefabKey == "char_286_cast3_1") {} // 战术整理·VI, 部署后20秒内所有友方【近战位】单位的攻击力和防御力+20%, {"duration":20,"atk":0.2,"def":0.2}
  else if (prefabKey == "char_502_nblade_1") {
    buff.respawnTime += blackboard.respawn_time;
  } // 快速重新部署, 再部署时间-30秒, {"respawn_time":-30}
  else if (prefabKey == "char_500_noirc_1") {
    buff.maxHp += basic.maxHp * blackboard.max_hp;
    buff.def += basic.def * blackboard.def;
  } // 装甲改良, 生命上限和防御力各+12%, {"max_hp":0.12,"def":0.12}
  else if (prefabKey == "char_503_rang_1") {} // 空射大师, 攻击飞行目标时，攻击力+50%, {"atk_scale":1.5}
  else if (prefabKey == "char_501_durin_1") {} // 小个子的幸运, 获得50%的法术闪避, {"prob":0.5}
  else if (prefabKey == "char_009_12fce_1") {} // 闪避率提升, 获得50%的物理闪避, {"prob":0.5}
  else if (prefabKey == "char_123_fang_1") {
    buff.cost += blackboard.cost;
  } // 轻量化, 自身部署费用-1, {"cost":-1}
  else if (prefabKey == "char_240_wyvern_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 攻击提升, 攻击力+8%, {"atk":0.08}
  else if (prefabKey == "char_192_falco_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 攻击提升, 攻击力+8%, {"atk":0.08}
  else if (prefabKey == "char_208_melan_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 攻击提升, 攻击力+8%, {"atk":0.08}
  else if (prefabKey == "char_281_popka_1") {
    buff.atk += basic.atk * blackboard.atk;
    buff.maxHp += basic.maxHp * blackboard.max_hp;
  } // 生命攻击提升, 生命上限+8%<@ba.talpu>（+2%）</>，攻击力+8%<@ba.talpu>（+2%）</>, {"atk":0.08,"max_hp":0.08}
  else if (prefabKey == "char_209_ardign_1") {
    buff.maxHp += basic.maxHp * blackboard.max_hp;
  } // 生命上限提升, 生命上限+12%, {"max_hp":0.12}
  else if (prefabKey == "char_122_beagle_1") {
    buff.def += basic.def * blackboard.def;
  } // 防御提升, 防御力+10%, {"def":0.1}
  else if (prefabKey == "char_284_spot_1") {} // 烟雾加装, 治疗友方单位后为其提供持续3秒的25%<@ba.talpu>（+5%）</>物理闪避, {"prob":0.25,"duration":3}
  else if (prefabKey == "char_124_kroos_1") {
    buff.atk += basic.atk * blackboard.atk_scale * blackboard.prob;
  } // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
  else if (prefabKey == "char_211_adnach_1") {
    buff.attackSpeed += blackboard.attack_speed;
  } // 短板突破, 攻击速度+8，优先攻击使用远程武器的敌人, {"attack_speed":0.08}
  else if (prefabKey == "char_121_lava_1") {} // 快速技能使用, 部署后立即获得35<@ba.talpu>（+5）</>点技力, {"sp":35}
  else if (prefabKey == "char_120_hibisc_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 治疗力提升, 攻击力+8%, {"atk":0.08}
  else if (prefabKey == "char_212_ansel_1") {} // 附加治疗, 有18%<@ba.talpu>（+3%）</>的几率额外治疗一名友方单位, {"attack@prob":0.18}
  else if (prefabKey == "char_210_stward_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 铠甲突破, 攻击力+6%，优先攻击防御力最高的敌人, {"atk":0.06}
  else if (prefabKey == "char_278_orchid_1") {
    buff.attackSpeed += blackboard.attack_speed;
  } // 施法速度提升, 攻击速度+9, {"attack_speed":9}
  else if (prefabKey == "char_141_nights_1") {
    buff.enemyMagicResistance += blackboard.magic_resistance;
  } // 黑色迷雾, 攻击使目标法术抗性-23%<@ba.talpu>（+3%）</>，持续1秒, {"duration":1,"magic_resistance":-0.23}
  else if (prefabKey == "char_109_fmout_1") {} // 占卜, 部署后随机永久获得下列一项增益：攻击力+15%<@ba.talpu>（+2%）</>；攻击速度+15<@ba.talpu>（+2）</>；生命上限+22%<@ba.talpu>（+2%）</>, {"attack_speed":15,"atk":0.15,"max_hp":0.22}
  else if (prefabKey == "char_253_greyy_1") {} // 静电场, 攻击时对攻击目标造成0.6秒的停顿, {"sluggish":0.6}
  else if (prefabKey == "char_235_jesica_1") {
    buff.attackSpeed += blackboard.attack_speed;
  } // 快速弹匣, 攻击速度+12, {"attack_speed":12}
  else if (prefabKey == "char_126_shotst_1") {} // 空射专精, 攻击飞行目标时，攻击力+40%<@ba.talpu>（+5%）</>, {"atk_scale":1.4}
  else if (prefabKey == "char_118_yuki_1") {
    buff.baseAttackTime += blackboard.base_attack_time;
    buff.atk += blackboard.atk;
  } // 重型手里剑, 攻击间隔略微增大，但攻击力+20%, {"base_attack_time":0.2,"atk":0.2}
  else if (prefabKey == "char_198_blackd_1") {} // 雪境巡逻员, 阻挡两个及以上的敌人时，防御力+19%<@ba.talpu>（+3%）</>, {"cnt":2,"def":0.19}
  else if (prefabKey == "char_149_scave_1") {
    buff.atk += basic.atk * blackboard.atk;
    buff.def += basic.def * blackboard.def;
  } // 单独行动者, 当周围四格内没有其他友方单位时，攻击力和防御力各+13%<@ba.talpu>（+2%）</>, {"atk":0.13,"def":0.13}
  else if (prefabKey == "char_290_vigna_1") {
    buff.atk += basic.atk * blackboard.atk * blackboard.prob1;
    skill.atk += basic.atk * blackboard.atk * blackboard.prob2;
  } // 蛮力穿刺, 攻击时，10%几率当次攻击的攻击力+110%<@ba.talpu>（+10%）</>。技能中这个几率提高到30%, {"atk":1.1,"prob1":0.1,"prob2":0.3}
  else if (prefabKey == "char_130_doberm_1") {} // 新人教官, 所有三星干员的攻击力+11%<@ba.talpu>（+1%）</>, {"atk":0.11}
  else if (prefabKey == "char_289_gyuki_1") {
    buff.def += basic.def * blackboard.def;
    buff.maxHp += basic.maxHp * blackboard.max_hp;
  } // 恶鬼体质, 防御力-20%，但最大生命值+23%<@ba.talpu>（+3%）</>, {"def":-0.2,"max_hp":0.23}
  else if (prefabKey == "char_193_frostl_1") {
    buff.baseAttackTime += blackboard.base_attack_time;
  } // 掩护打击, 攻击范围扩大，但攻击间隔略微增大, {"base_attack_time":0.15}
  else if (prefabKey == "char_127_estell_1") {} // 自愈能力, 周围8格内有敌人倒下时，恢复自身最大生命值14%<@ba.talpu>（+2%）</>的生命, {"hp_ratio":0.14}
  else if (prefabKey == "char_185_frncat_1") {
    buff.atk += basic.atk * blackboard.prob;
  } // 连击, 攻击时有23%<@ba.talpu>（+3%）</>的几率连续攻击两次, {"prob":0.23}
  else if (prefabKey == "char_237_gravel_1+") {
    buff.cost += blackboard.cost;
    if (buff.cost + basic.cost <= blackboard['cond.cost']) buff.def += basic.def * blackboard.def;
  } // 小个子支援, 自身部署费用-1，所有部署费用不超过10的单位防御力提升8%<@ba.talpu>（+2%）</>, {"cost":-1,"def":0.08,"cond.cost":10}
  else if (prefabKey == "char_236_rope_1") {} // 听觉训练, 获得34%<@ba.talpu>（+4%）</>的物理闪避, {"prob":0.34}
  else if (prefabKey == "char_117_myrrh_1") {} // 急救包, 部署后立刻恢复全体友方单位的生命值，恢复量为末药攻击力的160%<@ba.talpu>（+10%）</>, {"heal_scale":1.6}
  else if (prefabKey == "char_187_ccheal_1") {} // 战地医师, 部署后全体友方【医疗】职业干员攻击力+12%<@ba.talpu>（+2%）</>，防御力+120<@ba.talpu>（+20）</>，持续17<@ba.talpu>（+2）</>秒, {"atk":0.12,"def":120,"duration":17}
  else if (prefabKey == "char_181_flower_1") {} // 熏衣香, 在战场时全体友方单位每秒恢复相当于调香师攻击力5.5%<@ba.talpu>（+0.5%）</>的生命, {"atk_to_hp_recovery_ratio":0.055}
  else if (prefabKey == "char_199_yak_1") {
    buff.magicResistance += blackboard.magic_resistance;
  } // 雪原卫士, 法术抗性+15, {"magic_resistance":15}
  else if (prefabKey == "char_150_snakek_1") {
    buff.def += basic.def * blackboard.def;
  } // 防御专精, 防御力+12%, {"def":0.12}
  else if (prefabKey == "char_196_sunbr_1") {
    buff.atk += basic.atk * blackboard.prob * (blackboard.atk_scale - 1);
  } // 平底锅专精, 攻击时，18%<@ba.talpu>（+3%）</>几率当次攻击的攻击力提升至200%，并眩晕敌人1秒, {"prob":0.18,"atk_scale":2,"stun":1}
  else if (prefabKey == "char_110_deepcl_1") {} // 召唤触手, 可以使用四个触手召唤物来协助作战, {"cnt":4}
  else if (prefabKey == "char_183_skgoat_1") {} // 地质勘探, 稍微延长特性停顿的持续时间, {"sluggish":0.13}
  else if (prefabKey == "char_277_sqrrel_1") {
    buff.magicResistance += blackboard.magic_resistance;
  } // 防火护服, 法术抗性+15, {"magic_resistance":15}
  else if (prefabKey == "char_128_plosis_1") {} // 技力光环, 在场时较大提升全场友方单位的技力回复速度, {"sp_recovery_per_sec":0.3}
  else if (prefabKey == "char_115_headbr_1+") {
    buff.cost += blackboard.cost;
  } // 冲锋领袖, 编入队伍时所有【先锋】职业干员的部署费用-1, {"cost":-1}
  else if (prefabKey == "char_102_texas_1") {} // 战术快递, 编入队伍后，额外获得2点初始部署费用, {"cost":2}
  else if (prefabKey == "char_308_swire_1") {} // 近距离作战指导, 在场时周围8格内的近战友方单位攻击力+12%<@ba.talpu>（+2%）</>, {"atk":0.12}
  else if (prefabKey == "char_106_franka_1") {
    buff.prob += blackboard.prob;
  } // 铝热剑, 攻击时有20%的几率无视目标的防御, {"prob":0.2}
  else if (prefabKey == "char_155_tiger_1") {} // 虎拳迅击, 有33%<@ba.talpu>（+3%）</>的概率闪避敌人的近战物理攻击，成功闪避后自己的下一次攻击攻击力+100%, {"tiger_t_1[evade].prob":0.33,"charge_on_evade.atk":1}
  else if (prefabKey == "char_140_whitew_1") {} // 精神摧毁, 攻击使目标的特殊能力失效，持续6<@ba.talpu>（+1）</>秒, {"duration":6}
  else if (prefabKey == "char_143_ghost_1") {
    buff.maxHp += basic.maxHp * blackboard.max_hp;
  } // 深海再生力, 生命上限+12%<@ba.talpu>（+2%）</>，每秒回复最大生命2.5%<@ba.talpu>（+0.5%）</>的生命, {"max_hp":0.12,"hp_recovery_per_sec_by_max_hp_ratio":0.025}
  else if (prefabKey == "char_129_bluep_1") {
    buff.poisonDamage += blackboard.poisonDamage;
  } // 神经毒素, 攻击使目标中毒，在3秒内每秒受到85<@ba.talpu>（+10）</>点法术伤害, {"duration":3.1,"poison_damage":85}
  else if (prefabKey == "char_204_platnm_1") {} // 蓄力攻击, 距离上次攻击的间隔越长，下次攻击的攻击力就越高（最长2.5秒，攻击力190%<@ba.talpu>（+10%）</>）, {"attack@min_delta":1,"attack@max_delta":2.5,"attack@min_atk_scale":1,"attack@max_atk_scale":1.9}
  else if (prefabKey == "char_219_meteo_1") {
    buff.atk += basic.atk * blackboard.atk * blackboard.prob;
  } // 爆破附着改装, 普通攻击和技能释放时，30%几率当次攻击的攻击力+60%, {"atk":0.6,"prob":0.3}
  else if (prefabKey == "char_002_amiya_1") {} // 情绪吸收, 攻击敌人时额外回复3<@ba.talpu>（+1）</>点技力，消灭敌人后额外获得10<@ba.talpu>（+2）</>点技力, {"amiya_t_1[atk].sp":3,"amiya_t_1[kill].sp":10}
  else if (prefabKey == "char_166_skfire_1") {} // 法术狙击, 在场时，所有被阻挡的敌人受到法术伤害时伤害提升18%<@ba.talpu>（+3%）</>, {"damage_scale":1.18}
  else if (prefabKey == "char_242_otter_1") {} // 机械水獭, 可以使用5个机械水獭召唤物。攻击机械水獭的敌人攻击速度-25, {"cnt":5}
  else if (prefabKey == "char_108_silent_1") {
    buff.attack_speed += blackboard.attack_speed;
  } // 强化注射, 在场时，所有友方【医疗】职业干员攻速+14<@ba.talpu>（+2）</>, {"attack_speed":14}
  else if (prefabKey == "char_171_bldsk_1") {} // 血液样本回收, 攻击范围内有敌人倒下时，为自身和范围内随机一名友方单位回复2点技力, {"bldsk_t_1[self].sp":2,"bldsk_t_1[rand].sp":2}
  else if (prefabKey == "char_148_nearl_1+") {} // 天马光环, 在场时，全地图的友方单位医疗效果提高12%<@ba.talpu>（+2%）</>, {"heal_scale":1.12}
  else if (prefabKey == "char_144_red_1") {
    buff.atkScale += blackboard.atk_scale;
  } // 刺骨, 每次攻击至少造成33%<@ba.talpu>（+3%）</>攻击力的伤害, {"atk_scale":0.33}
  else if (prefabKey == "char_107_liskam_1") {} // 战术防御, 受到攻击时，回复自己和周围一格内随机一名友方角色1点技力, {"sp":1}
  else if (prefabKey == "char_107_liskam_2") {
    buff.magicResistance += blackboard.magic_resistance;
  } // 雷抗, 法术抗性+13<@ba.talpu>（+3）</>, {"magic_resistance":13}
  else if (prefabKey == "char_201_moeshd_1") {} // 奇迹力场, 有23%<@ba.talpu>（+3%）</>的几率抵挡物理和法术伤害。周围四格内的友方单位获得一半该效果, {"moeshd_t_1[self].prob":0.23,"moeshd_t_1[aura].prob":0.115}
  else if (prefabKey == "char_163_hpsts_1") {} // 自我防护, 技能开启时，每秒恢复最大生命值5%<@ba.talpu>（+1%）</>的生命，同时获得30%<@ba.talpu>（+4%）</>的近战物理闪避, {"hp_recovery_per_sec_by_max_hp_ratio":0.05,"prob":0.3}
  else if (prefabKey == "char_145_prove_1") {
    buff.atk += basic.atk * (blackboard.atk_scale - 1) * blackboard.prob2;
  } // 狩猎箭头, 攻击时，20%几率当次攻击的攻击力提升至190%<@ba.talpu>（+10%）</>。当敌人在正前方一格时，该几率提升到50%, {"prob":0.2,"prob2":0.5,"atk_scale":1.9}
  else if (prefabKey == "char_158_milu_1") {
    buff.atk += basic.atk * (blackboard.atk_scale - 1);
  } // 暗杀者, 攻击使用远程武器的敌人时，攻击力提升至145%<@ba.talpu>（+5%）</>, {"atk_scale":1.45}
  else if (prefabKey == "char_173_slchan_1") {
    buff.def += basic.def * blackboard.def;
  } // 雪境猎手, 未阻挡敌人时，攻击力和防御力各+14%<@ba.talpu>（+2%）</>, {"atk":0.14,"def":0.14}
  else if (prefabKey == "char_174_slbell_1") {
    buff.atk += basic.atk * (blackboard.damage_scale - 1);
  } // 虚弱化, 攻击范围内的敌人生命少于40%时，其受到的伤害提升至133%<@ba.talpu>（+3%）</>, {"hp_ratio":0.4,"damage_scale":1.33}
  else if (prefabKey == "char_174_slbell_2") {} // 双响, 攻击时同时攻击两个目标, {"attack@max_target":2}
  else if (prefabKey == "char_195_glassb_1") {
    buff.def += basic.def * blackboard.def;
    buff.attackSpeed += blackboard.attack_speed;
  } // 探知者, 防御力-35%，但攻击速度+21<@ba.talpu>（+3）</>, {"def":-0.35,"attack_speed":21}
  else if (prefabKey == "char_101_sora_1") {} // 安可, 技能结束后，50%几率立即回复50%的最大技力, {"prob":0.5,"sp":0.5}
  else if (prefabKey == "char_215_mantic_1") {} // 隐匿的杀手·精英, 平时处于隐匿状态（不会被远程攻击选为目标），攻击时会解除隐匿状态，且当次攻击的攻击力+54%<@ba.talpu>（+4%）</>。停止攻击5秒后，重新进入隐匿状态, {"delay":5,"atk":0.54}
  else if (prefabKey == "char_241_panda_1") {} // 功夫, 获得43%<@ba.talpu>（+3%）</>的物理闪避, {"prob":0.43}
  else if (prefabKey == "char_103_angel_1") {
    buff.attackSpeed += blackboard.attack_speed;
  } // 快速弹匣, 攻击速度+15<@ba.talpu>（+3）</>, {"attack_speed":15}
  else if (prefabKey == "char_103_angel_2") {
    buff.maxHp += blackboard.max_hp;
    buff.atk += basic.atk * blackboard.atk;
  } // 天使的祝福, 攻击力+8%<@ba.talpu>（+2%）</>，生命上限+13%<@ba.talpu>（+3%）</>。置入战场后这个效果会同样赋予给一名随机友方单位, {"max_hp":0.13,"atk":0.08}
  else if (prefabKey == "char_112_siege_1") {
    buff.atk += basic.atk * blackboard.atk;
    buff.def += basic.def * blackboard.def;
  } // 万兽之王, 所有【先锋】职业干员的攻击力和防御力各+10%<@ba.talpu>（+2%）</>, {"atk":0.1,"def":0.1}
  else if (prefabKey == "char_112_siege_2") {} // 粉碎, 周围四格内有敌人倒下时获得1点技力, {"sp":1}
  else if (prefabKey == "char_134_ifrit_1") {
    buff.enemyMagicResistance += blackboard.magic_resistance;
  } // 精神融解, 攻击范围内的敌军法术抗性-44%<@ba.talpu>（+4%）</>, {"magic_resistance":-0.44}
  else if (prefabKey == "char_134_ifrit_2") {
    buff.spRecovery += blackboard.sp;
    buff.spRecoveryInterval += blackboard.interval;
  } // 莱茵回路, 每5.5<@ba.talpu>（-0.5）</>秒额外回复2点技力, {"sp":2,"interval":5.5}
  else if (prefabKey == "char_180_amgoat_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 炎息, 在场时，所有友方【术师】职业干员的攻击力+16%<@ba.talpu>（+2%）</>, {"atk":0.16}
  else if (prefabKey == "char_180_amgoat_2") {} // 乱火, 部署后立即随机获得较多的技力, {"sp_min":10,"sp_max":20}
  else if (prefabKey == "char_291_aglina_1") {
    buff.attackSpeed += blackboard.attack_speed;
  } // 加速力场, 全场友方单位攻速+8<@ba.talpu>（+1）</>, {"attack_speed":8}
  else if (prefabKey == "char_291_aglina_2") {} // 兼职工作, 技能未开启时，全场友方单位每秒回复25<@ba.talpu>（+5）</>点生命, {"hp_recovery_per_sec":25}
  else if (prefabKey == "char_147_shining_1") {
    buff.def += blackboard.def;
  } // 黑恶魔的庇护, 攻击范围内的友方单位防御力+65<@ba.talpu>（+5）</>, {"def":65}
  else if (prefabKey == "char_147_shining_2") {
    buff.attackSpeed += blackboard.attack_speed;
  } // 法典, 攻击速度+13<@ba.talpu>（+3）</>, {"attack_speed":13}
  else if (prefabKey == "char_179_cgbird_1") {
    buff.magicResistance += blackboard.magic_resistance;
  } // 白恶魔的庇护, 攻击范围内的友方单位法术抗性+17<@ba.talpu>（+2）</>, {"magic_resistance":17}
  else if (prefabKey == "char_179_cgbird_2") {} // 转瞬即逝的幻影, 可以使用幻影。幻影无法攻击和阻挡敌人，拥有75法术抗性，30%的物理闪避，并且更容易吸引敌人的攻击，同时每秒损失3%的最大生命, {"cnt":2}
  else if (prefabKey == "char_136_hsguma_1") {} // 战术装甲, 获得28%<@ba.talpu>（+3%）</>的物理抵挡和法术抵挡, {"prob":0.28}
  else if (prefabKey == "char_136_hsguma_2") {
    buff.def += basic.def * blackboard.def;
  } // 特种作战策略, 所有友方【重装】职业干员的防御力提升8%<@ba.talpu>（+2%）</>, {"def":0.08}
  else if (prefabKey == "char_202_demkni_1") {
    buff.def += basic.def * blackboard.def * blackboard.max_stack_cnt;
  } // 莱茵充能护服, 每在场上停留20秒，攻击力+6%<@ba.talpu>（+1%）</>，防御力+5%<@ba.talpu>（+1%）</>，最多叠加5层, {"max_stack_cnt":5,"interval":20,"atk":0.06,"def":0.05}
  else if (prefabKey == "char_202_demkni_2") {} // 精神回复, 每次回复友方单位生命值时额外回复该单位1点技力, {"sp":1}
  else if (prefabKey == "char_172_svrash_1") {
    buff.atk += basic.atk * blackboard.atk;
    buff.respawnRime += basic.respawnRime * blackboard.respawn_time;
  } // 领袖, 攻击力+12%<@ba.talpu>（+2%）</>，所有干员的再部署时间-12%<@ba.talpu>（+2%）</>, {"atk":0.12,"respawn_time":-0.12}
  else if (prefabKey == "char_172_svrash_2") {} // 鹰眼视觉, 攻击范围内敌人的隐匿效果失效, {}
  else if (prefabKey == "char_010_chen_1") {
    buff.spRecovery += blackboard.sp;
    buff.spRecoveryInterval += blackboard.interval;
  } // 呵斥, 在场时每4秒回复全场友方角色1点攻击/受击技力, {"interval":4,"sp":1}
  else if (prefabKey == "char_010_chen_2") {
    buff.atk += basic.atk * blackboard.atk;
    buff.def += basic.def * blackboard.def;
  } // 持刀格斗术, 攻击力+6%<@ba.talpu>（+1%）</>，防御力+6%<@ba.talpu>（+1%）</>，物理闪避+13%<@ba.talpu>（+3%）</>, {"atk":0.06,"def":0.06,"prob":0.13}
  else if (prefabKey == "char_230_savage_1") {
    buff.atk += basic.atk * blackboard.atk;
    buff.def += basic.def * blackboard.def;
  } // 山谷, 周围四格中有两格以上的高地地形时攻击力和防御力+10%, {"cnt":2,"atk":0.1,"def":0.1}
  else if (prefabKey == "char_282_catap_1") {
    buff.cost += blackboard.cost;
  } // 轻量化, 自身部署费用-1, {"cost":-1}
  else if (prefabKey == "char_283_midn_1") {
    buff.atk += basic.atk * (blackboard.atk_scale - 1) * blackboard.prob;
  } // 要害瞄准·初级, 攻击时，20%几率当次攻击的攻击力提升至160%<@ba.talpu>（+10%）</>, {"prob":0.2,"atk_scale":1.6}
  else if (prefabKey == "char_137_brownb_1") {
    buff.atk += basic.atk * blackboard.atk * blackboard.max_stack_cnt;
  } // 竞技专注, 攻击相同目标时每次攻击可提高自身攻击力6%<@ba.talpu>（+1%）</>，最多可叠加5层。更换目标会失去之前叠加的效果, {"max_stack_cnt":5,"atk":0.06}
  else if (prefabKey == "char_164_nightm_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 表里人格, 装备技能1时获得45%<@ba.talpu>（+5%）</>的物理和法术闪避，装备技能2时获得+18%<@ba.talpu>（+3%）</>攻击力, {"prob":0.45,"atk":0.18}
  else if (prefabKey == "char_220_grani_1") {} // 骑警, 在场时，所有【先锋】职业干员获得25%<@ba.talpu>（+5%）</>的物理闪避, {"prob":0.25}
  else if (prefabKey == "char_263_skadi_1") {
    buff.atk += basic.atk * blackboard.atk;
  } // 深海掠食者, 所有【深海猎人】干员的攻击力+16%<@ba.talpu>（+2%）</>, {"atk":0.16}
  else if (prefabKey == "char_263_skadi_2") {
    buff.respawnRime += blackboard.respawn_time;
  } // 迅捷出击, 自身再部署时间-10秒, {"respawn_time":-10}
}


AKDATA.attributes = {
  getCharAttributes,
  calculateDps,
}