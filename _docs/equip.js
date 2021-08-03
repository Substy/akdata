function init() {
  AKDATA.load([
    'excel/character_table.json',
    'excel/uniequip_table.json',
    'excel/battle_equip_table.json',
  ], load);
}

let edb = null;
let bedb = null;
let chardb = null;

function getBlackboard(blackboardArray) {
  let blackboard = {};
  blackboardArray.forEach(kv => blackboard[kv.key] = kv.value);
  return blackboard;
}

function getEquipInfo(eid) {
  var phase = 0;  // 默认取第一个
  var cand = 0;
  var blackboard = {};
  var attr = {};
  var description = "基础模组";

  if (bedb[eid]) {
    var item = bedb[eid].phases[phase];
    attr = getBlackboard(item.attributeBlackboard);
    description = "";
    if (item.tokenAttributeBlackboard) {
      var tb = {};
      Object.keys(item.tokenAttributeBlackboard).forEach(tok => {
        tb[tok] = getBlackboard(item.tokenAttributeBlackboard[tok]);
      })
      Object.assign(blackboard, tb);
    }

    item.parts.forEach(pt => {
      let talentBundle = pt.addOrOverrideTalentDataBundle;
      let traitBundle = pt.overrideTraitDataBundle;
      // 天赋变更
      if (talentBundle && talentBundle.candidates) {
        // 目前只有杜宾一个人
        let entry = talentBundle.candidates[cand];
        Object.assign(blackboard, getBlackboard(entry.blackboard));
      }
      // 特性变更
      if (traitBundle && traitBundle.candidates) {
        let entry = traitBundle.candidates[cand];
        Object.assign(blackboard, getBlackboard(entry.blackboard));
        description = (entry.additionalDescription || "") + (entry.overrideDescripton || "");
      }
      
    });
  }

  return {
    attr,
    blackboard,
    description
  };

}

function load() {
  let selector = {};
  let body = [];
 
  edb = AKDATA.Data.uniequip_table;
  bedb = AKDATA.Data.battle_equip_table;
  chardb = AKDATA.Data.character_table;

  let view = Object.keys(edb["equipDict"]).map( key => {
    let item = edb["equipDict"][key];
    let info = getEquipInfo(key);
    let missions = "<ul>" + item.missionList.map(x => `<li> ${edb["missionList"][x].desc} </li>`).join() + "</ul>";
    return [
      chardb[item.charId].name,
      item.uniEquipName,
      // item.uniEquipDesc
      item.unlockLevel,
      info.attr.max_hp || 0,
      info.attr.atk || 0,
      info.attr.def || 0,
      info.description,
      missions,
      JSON.stringify(info.blackboard)
    ];
  });

  let list = pmBase.component.create({
    type: 'list',
    columns: [ '干员', '模组名称', '解锁等级', 
               '生命值', '攻击力', ' 防御力', 
               {header:'特性变更',width:'20%'}, {header:'解锁任务',width:'20%'}, {header:'具体数值',width:'10%'} ],
    list: view,
    sortable: true,
    card: true,
  });

	pmBase.content.build({
	  pages: [{
      content: list,
    }]
	});
}

pmBase.hook.on( 'init', init );