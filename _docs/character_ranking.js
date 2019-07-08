const ProfessionNames = {
  "PIONEER": "先锋",
  "WARRIOR": "近卫",
  "SNIPER": "狙击",
  "TANK": "重装",
  "MEDIC": "医疗",
  "SUPPORT": "辅助",
  "CASTER": "术师",
  "SPECIAL": "特种"
};

function init() {
  AKDATA.load([
    'excel/character_table.json',
    'excel/skill_table.json',
  ], load);
}

function load() {

  let rankingList = [];
  let charFinalData = [];

  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;
    let perfectAttr = getPerfectAttribute(charId);
    rankingList.push([
      `<a href="../character/#!/${charId}">${charData.name}</a>`,
      ProfessionNames[charData.profession],
      charData.rarity + 1,
      Math.floor(perfectAttr.respawnTime),
      perfectAttr.cost,
      perfectAttr.blockCnt,
      (perfectAttr.baseAttackTime / perfectAttr.attackSpeed * 100).toPrecision(2),
      Math.floor(perfectAttr.maxHp),
      Math.floor(perfectAttr.atk),
      Math.floor(perfectAttr.def),
      perfectAttr.magicResistance + '%',
     // Math.round(1 / ( perfectAttr.baseAttackTime / perfectAttr.attackSpeed * 100 ) * perfectAttr.atk),
    ]);
    charData.skills.forEach(skillData=>{
      if ( charData.profession == 'MEDIC' ) return;
      let data = parseSkillEffect(charId, charData, perfectAttr, skillData.skillId);
      if(data) charFinalData.push(data);
    });
  }

  let item = pmBase.component.create({
    type: 'list',

    header: ['干员', '职业', '星级', '再部署', '部署费用', '阻挡数', '攻击速度', '生命上限', '攻击', '防御', '法术抗性'],


    list: rankingList,

    sortable: true,
    card: true,
  });

  let item2 = pmBase.component.create({
    type: 'list',

    columns: ['干员', '职业', '伤害', 'S_ATK', 'S_BAT', '技能', {header:'说明',width:'40%'}, '攻击DPS', '技能DPS', '平均DPS'],
    list: charFinalData,

    sortable: true,
    card: true,
  });

  item2 +=`
<div class="alert alert-primary small">
  <ul class="m-0">
    <li>这个表格仅收录干员的攻击技能，干员属性取自第一页的极限值。</li>
    <li>这个表格不考虑敌人的防御力，实际战斗中根据敌人防御的不同，攻击力越低的干员与表中的出入越大。</li>
    <li>“强力击”类的技能以充能+攻击为一个周期计算技能DPS。</li>
    <li>平均DPS由充能时间+技能持续时间+硬直时间为一个周期计算，暂不考虑初始技力因素。</li>
    <li>艾雅法拉的“二重咏唱”、塞雷娅的“莱茵充能护服”等根据条件增长的技能或天赋，取最大值计算。</li>
    <li>阿米娅的“奇美拉”、斯卡蒂的“跃浪击”等限定发动条件技能，不计算平均DPS。</li>
  </ul>
</div>
`;

  let tabs = pmBase.component.create({
    type: 'tabs',

    tabs: [{
      text: '极限属性',
      content: item,
    },{
      text: '单体DPS',
      content: item2,
    }],
  });

  pmBase.content.build({
    pages: [{
      content: tabs,
    }]
  });
}

let attrList;
let attributeTypeList = {
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

function getPerfectAttribute(charId) {
  let charData = AKDATA.Data.character_table[charId];
  let attrKeyFrame = charData.phases[charData.phases.length - 1].attributesKeyFrames[1].data;
  let favorKeyFrame = charData.favorKeyFrames[1].data;
  if (attrList == null) attrList = Object.keys(attrKeyFrame).filter(x => typeof (attrKeyFrame[x]) === 'number');
  attrList.forEach(key => {
    attrKeyFrame[key] += favorKeyFrame[key];
  });
  charData.potentialRanks.forEach(x => {
    if (!x.buff) return true;
    let y = x.buff.attributes.attributeModifiers[0];
    let key = attributeTypeList[y.attributeType];
    let value = y.value;
    attrKeyFrame[key] += value;
  });
  //console.log(charId + ' ' + charData.name);
  let talentKeyFrame = {};
  charData.talents.forEach(x => {
    //console.log(x.candidates[x.candidates.length - 1].description);
    x.candidates[x.candidates.length - 1].blackboard.forEach(kv => talentKeyFrame[kv.key] = kv.value);
  });
  //console.log(talentKeyFrame);
  applyTalent(charId, attrKeyFrame, talentKeyFrame);
  return attrKeyFrame;
}

function applyTalent(charId, frame, talent) {
  if (charId == "char_502_nblade") { frame.respawnTime += talent.respawn_time;}
  else if (charId == "char_500_noirc") { frame.maxHp *= 1 + talent.max_hp; frame.def *= 1 + talent.def; }
  else if ( charId == "char_240_wyvern" ) frame.atk *= 1 + talent.atk;
  else if ( charId == "char_192_falco" ) frame.atk *= 1 + talent.atk;
  else if ( charId == "char_208_melan" ) frame.atk *= 1 + talent.atk;
  else if ( charId == "char_209_ardign" ) frame.maxHp *= 1 + talent.max_hp;
  else if ( charId == "char_122_beagle" ) frame.def *= 1 + talent.def;
  else if ( charId == "char_211_adnach" ) frame.attackSpeed += talent.attack_speed * 100;
  else if ( charId == "char_120_hibisc" ) frame.atk *= 1 + talent.atk;
  else if ( charId == "char_210_stward" ) frame.atk *= 1 + talent.atk;
  else if ( charId == "char_278_orchid" ) frame.attackSpeed += talent.attack_speed;
  else if ( charId == "char_109_fmout" ) { frame.attackSpeed += talent.attack_speed; frame.atk *= 1 + talent.atk; frame.maxHp *= 1 + talent.max_hp;}
  else if ( charId == "char_235_jesica" ) frame.attackSpeed += talent.attack_speed;
  else if ( charId == "char_118_yuki" ) { frame.baseAttackTime += talent.base_attack_time; frame.atk *= 1 + talent.atk;}
  else if ( charId == "char_289_gyuki" ) { frame.def *= 1 + talent.def; frame.maxHp *= 1 + talent.max_hp;}
  else if ( charId == "char_193_frostl" ) frame.baseAttackTime += talent.base_attack_time;
  else if ( charId == "char_237_gravel" ) { frame.cost += talent.cost; frame.def *= 1 + talent.def;}
  else if ( charId == "char_199_yak" ) frame.magicResistance += talent.magic_resistance;
  else if ( charId == "char_150_snakek" ) frame.def *= 1 + talent.def;
  else if ( charId == "char_277_sqrrel" ) frame.magicResistance += talent.magic_resistance;
  else if ( charId == "char_102_texas" ) {}
  else if ( charId == "char_143_ghost" ) frame.maxHp *= 1 + talent.max_hp;
  else if ( charId == "char_108_silent" ) frame.attackSpeed += talent.attack_speed;
  else if ( charId == "char_107_liskam" ) frame.magicResistance += talent.magic_resistance;
  else if ( charId == "char_173_slchan" ) { frame.atk *= 1 + talent.atk; frame.def *= 1 + talent.def;}
  else if ( charId == "char_195_glassb" ) { frame.def *= 1 + talent.def; frame.attackSpeed += talent.attack_speed;}
  else if ( charId == "char_103_angel" ) { frame.attackSpeed += talent.attack_speed; frame.atk *= 1 + talent.atk; frame.maxHp *= 1 + talent.max_hp;}
  else if ( charId == "char_112_siege" ) { frame.atk *= 1 + talent.atk; frame.def *= 1 + talent.def;}
  else if ( charId == "char_180_amgoat" ) frame.atk *= 1 + talent.atk;
  else if ( charId == "char_291_aglina" ) frame.attackSpeed += talent.attack_speed;
  else if ( charId == "char_147_shining" ) { frame.def += talent.def; frame.attackSpeed += talent.attack_speed;}
  else if ( charId == "char_179_cgbird" ) frame.magicResistance += talent.magic_resistance;
  else if ( charId == "char_136_hsguma" ) frame.def *= 1 + talent.def;
  else if ( charId == "char_202_demkni" ) { frame.atk *= 1 + talent.atk * talent.max_stack_cnt; frame.def *= 1 + talent.def * talent.max_stack_cnt;}
  else if ( charId == "char_172_svrash" ) { frame.atk *= 1 + talent.atk; frame.respawnTime *= 1 + talent.respawn_time;}
  else if ( charId == "char_164_nightm" ) frame.atk *= 1 + talent.atk;
  else if ( charId == "char_263_skadi" ) { frame.atk *= 1 + talent.atk; frame.respawnTime += talent.respawn_time;}
  else {
    if ( talent.cost ) frame.cost += talent.cost;
  }
}


function parseSkillEffect (charId, charData, perfectAttr, skillId) {
  let skillData = AKDATA.Data.skill_table[skillId];
  let levelData = skillData.levels[skillData.levels.length-1];

  if (levelData.prefabId == "skchr_sunbr_2"
   || levelData.prefabId == "skchr_deepcl_1"
   || levelData.prefabId == "skchr_nearl_2"
   || levelData.prefabId == "skchr_red_1"
   || levelData.prefabId == "skchr_red_2"
   || levelData.prefabId == "skchr_sora_2"
  ) return;

  let bb = {};
  levelData.blackboard.forEach(kv => bb[kv.key] = kv.value);
  let desc = AKDATA.formatString(levelData.description, true, bb);

  let dps = checkSkillEffect(perfectAttr, skillData,levelData,bb);
  if (!dps) return;
  return [
    `<a href="../character/#!/${charId}">${charData.name}</a>`,
    ProfessionNames[charData.profession],
    (charData.description.includes('法术伤害') || levelData.description.includes('伤害类型变为<@ba.vup>法术</>') ) ? '法术' : '物理',
    //Math.round(perfectAttr.atk),
    //Math.round(perfectAttr.attackSpeed*100)/100 + '%',
    //Math.round(perfectAttr.baseAttackTime*100)/100,
    Math.round(dps[3]),
    Math.round(dps[4]*100)/100,
    levelData.name,// + '<br>' + levelData.prefabId,
    desc,// + `<ul class="small text-left mb-0 muted">${Object.entries(bb).map(k=>`<li>${k[0]}: ${k[1]}</li>`).join('')}</ul>`,
    dps[0],
    dps[1],
    dps[2],
  ];
}

function checkSkillEffect(perfectAttr,skillData,levelData,blackboard){
  let normalDps = Math.round(1 / ( perfectAttr.baseAttackTime / perfectAttr.attackSpeed * 100 ) * perfectAttr.atk);

  let peakResult = Object.assign({}, perfectAttr);
  if ( blackboard['base_attack_time'] ) peakResult.baseAttackTime += blackboard['base_attack_time'];
  if (levelData.prefabId == "skchr_texas_2") { blackboard.times = 2; }
  else if (levelData.prefabId == "skchr_slbell_1") { delete blackboard.attack_speed; }
  else if (levelData.prefabId == "skchr_amgoat_1") { peakResult.atk *= 1 + blackboard['amgoat_s_1[b].atk']; peakResult.attack_speed += blackboard['amgoat_s_1[b].attack_speed']; }
  else if (levelData.prefabId == "skchr_amgoat_2") { blackboard['atk_scale'] += blackboard['atk_scale_2']; }
  else if (levelData.prefabId == "skchr_aglina_2") { peakResult.baseAttackTime *= blackboard['base_attack_time']; }
  if ( blackboard['atk'] ) peakResult.atk *= 1 + blackboard['atk'];
  if ( blackboard['attack_speed'] ) peakResult.attackSpeed += blackboard['attack_speed'];
  if (levelData.prefabId == "skchr_aglina_2" || levelData.prefabId == "skchr_aglina_3") { normalDps = '0'; }

  
  let peakDps = 0;
  let peakAtk = peakResult.atk;
  let peakDamage = 0;
  let peakDuration = 0;
  let peakAttackCount = 0;
  let peakBAT = peakResult.baseAttackTime / peakResult.attackSpeed * 100;
  if ( levelData.duration <= 0 ) {
    peakDuration = peakBAT;
    peakAttackCount = 1;
  }
  else
  {
    if (levelData.prefabId == "skchr_ifrit_3") { peakBAT = 1; }
    peakAttackCount = Math.floor(levelData.duration / peakBAT);
    peakDuration = peakAttackCount * peakBAT;
  }
  if ( blackboard['attack@atk_scale'] ) peakAtk *= blackboard['attack@atk_scale'];
  if ( blackboard['atk_scale'] ) peakAtk *= blackboard['atk_scale'];
  if ( blackboard['attack@times'] ) peakAtk *= blackboard['attack@times'];
  if ( blackboard['times'] ) peakAtk *= blackboard['times'];
  if ( blackboard['damage_scale'] ) peakAtk *= blackboard['damage_scale'];
  peakDamage = peakAtk * peakAttackCount;

  if (levelData.prefabId == "skchr_ifrit_2" ) { peakDamage += peakAtk * blackboard['burn.atk_scale'] * Math.ceil(peakDuration); }
  else if (levelData.prefabId == "skchr_ifrit_3") { peakDamage *= 1 - blackboard['magic_resistance']/100; }
  else if (levelData.prefabId == "skchr_amgoat_2") { peakDamage *= 1 - blackboard['magic_resistance']; }
  else if (levelData.prefabId == "skchr_yuki_2") { peakDamage += peakAtk * Math.ceil(peakDuration); }
  peakDps = Math.round(peakDamage / peakDuration);

  if (levelData.prefabId == "skchr_aglina_2" ) { 
    let a = 0; }

  let globalDps = 0;
  let footDps = 0;
  let footDuration = 0;
  let footAttackTimes = 0;
  let footDamage = 0;
  let footAttackSpeed = perfectAttr.baseAttackTime / perfectAttr.attackSpeed * 100;
  if(levelData.spData.spType==1) {
    footAttackTimes = Math.ceil(levelData.spData.spCost / footAttackSpeed);
  }
  else if (levelData.spData.spType ==2 ){
    footAttackTimes = levelData.spData.spCost;
  }
  else if (levelData.spData.spType ==4 ){
    return;
  }
  else {
    console.log(levelData.prefabId  + ',' + levelData.spData.spType);
  }
  footDuration = footAttackTimes * footAttackSpeed;
  footDamage += footAttackTimes * perfectAttr.atk;

  let waitDuration = 0;

  if (levelData.prefabId == "skchr_fmout_2") { waitDuration += blackboard.time; }
  else if (levelData.prefabId == "skchr_amiya_2") { waitDuration += blackboard.stun; }
  else if (levelData.prefabId == "skchr_liskam_2") { waitDuration += blackboard.stun; }
  else if (levelData.prefabId == "skchr_aglina_2" || levelData.prefabId == "skchr_aglina_3") { footDamage = 0; }

  globalDps = Math.round((peakDamage+footDamage) / (peakDuration+footDuration+waitDuration));

  if ( normalDps == peakDps ) return;

  if (levelData.prefabId == "skchr_skadi_2" || levelData.prefabId == "skchr_amiya_3") { globalDps = '0'; }
  else if ( levelData.duration <= 0 ) peakDps = globalDps;

  return [normalDps, peakDps, globalDps,peakAtk,peakBAT];
}

pmBase.hook.on('init', init);