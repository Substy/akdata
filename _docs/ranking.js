import AKDATA from './core.js';

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
  AKDATA.loadData([
    'excel/character_table.json',
  ], load);
}

function load() {

  let list = [];
  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;
    let perfectAttr = getPerfectAttribute(charId);
    list.push([
      `<a href="../character/#!/${charId}">${charData.name}</a>`,
      charData.displayNumber,
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

    ]);
  }

  let item = {
    type: 'list',

    header: ['干员', '编号', '职业', '星级', '再部署', '部署费用', '阻挡数', '攻击速度', '生命上限', '攻击', '防御', '法术抗性'],

    list: list,

    sortable: true,
  };

  pmBase.content.build({
    pages: [{
      content: pmBase.component.create(item),
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