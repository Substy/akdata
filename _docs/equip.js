function init() {
  AKDATA.load([
    'excel/gamedata_const.json',
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

function showDesc(key) {
  var item = AKDATA.Data.uniequip_table["equipDict"][key];
  if (item) {
    console.log(item.uniEquipDesc);
    pmBase.component.create({
      type: 'modal',
      id: "equip_desc_dialog",
      content: item.uniEquipDesc.replaceAll("\n", "<br>"),
      width: 600,
      title: `${item.uniEquipName} - 故事`,
      show: true
    });
  }
}

function load() {
  let selector = {};
  let body = [];
  window.showDesc = showDesc;
 
  edb = AKDATA.Data.uniequip_table;
  bedb = AKDATA.Data.battle_equip_table;
  chardb = AKDATA.Data.character_table;

  let view = Object.keys(edb["equipDict"]).map( key => {
    let item = edb["equipDict"][key];
    let info = getEquipInfo(key);
    let missions = "<ul>" + item.missionList.map(x => `<li> ${edb["missionList"][x].desc} </li>`).join() + "</ul>";
    let charName = `
    <figure class="figure">
      <a href='/akdata/character/#!/${item.charId}' target='_blank'>
        <img class="figure-img" style="max-width: 80%; height: auto" src="/akdata/assets/images/char/${item.charId}.png"></img>
        <figcaption>${chardb[item.charId].name}</figcaption>
      </a>
    </figure>`;
    let subName = edb["subProfDict"][chardb[item.charId].subProfessionId].subProfessionName;
    // 三围以外的属性补正
    Object.keys(info.attr).forEach(k => {
      if (!["max_hp", "atk", "def"].includes(k))
        info.blackboard[k] = info.attr[k];
    });
    return [
      subName,
      charName,
      `<a href="###" onclick='showDesc("${key}")'> ${item.uniEquipName} </a>`,
      // item.uniEquipDesc
      item.unlockLevel,
      info.attr.max_hp || 0,
      info.attr.atk || 0,
      info.attr.def || 0,
      AKDATA.formatString(info.description, false, info.blackboard),
      missions,
      JSON.stringify(info.blackboard).replace(/,/g, ",<br>")
    ];
  });

  let list = pmBase.component.create({
    type: 'list',
    columns: [ '子职业', {header:'干员',width:'6%'}, '模组名称', '解锁等级', 
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

  $("th:nth-child(4)").trigger("click");
  $("th:nth-child(4)").trigger("click");
}

pmBase.hook.on( 'init', init );