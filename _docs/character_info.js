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
    'excel/handbook_info_table.json',
  ], load);
}

const BasicInfo = {};

function load() {
  let listData1 = [];
  let listData2 = [];
  let keys = {};

  Object.values(AKDATA.Data.handbook_info_table.handbookDict).forEach( data => {
    let basic = data.storyTextAudio[0].stories[0].storyText;
    if(data.storyTextAudio[1]) basic += data.storyTextAudio[1].stories[0].storyText;
    let info = {};
    for(let m of basic.matchAll(/【(.+?)】(.+)/g)) {
      info[m[1]] = info[m[1]] || m[2];
      keys[m[1]] = true;
    }
    BasicInfo[data.charID] = info;
    if (!info['代号'] && !info['型号']) return;
    listData1.push([
      info['代号'] || info['型号'] || '',
      info['出身地'] || info['产地'] || '',
      info['性别'] || info['设定性别'] || '',
      info['战斗经验'] || '',
      info['生日'] || info['出厂日'] || '',
      info['种族'] || '',
      info['身高'] || info['高度'] || '',
      info['体重'] || info['重量'] || '',
    ]);
    listData2.push([
      info['代号'] || info['型号'] || '',
      info['物理强度'] || '',
      info['战场机动'] || '',
      info['生理耐受'] || '',
      info['战术规划'] || '',
      info['战斗技巧'] || '',
      info['源石技艺适应性'] || '',
    ]);
  });

  let list1 = pmBase.component.create({
    type: 'list',
    columns: [{header:'代号',width:'20%'}, '出身地', '性别', '战斗经验', '生日', '种族', '身高', '体重'],
    list: listData1,
    sortable: true,
    card:true,
  });
  let list2 = pmBase.component.create({
    type: 'list',
    columns: [{header:'代号',width:'20%'}, '物理强度', '战场机动', '生理耐受', '战术规划', '战斗技巧', '源石技艺适应性'],
    list: listData2,
    sortable: true,
    card:true,
  });
  let tab = pmBase.component.create({
    type: 'tabs',
    tabs: [{
      text: '基础档案',
      content: list1,
    },{
      text: '综合体检测试',
      content: list2,
    }],
  });

  console.log(keys);
  pmBase.content.build({
    pages: [{
      content: tab,
    }]
  });


/**/
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
  else if ( charId == "char_211_adnach" ) frame.attackSpeed += talent.attack_speed;
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
pmBase.hook.on('init', init);