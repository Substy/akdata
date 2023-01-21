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
let equipList = [];

const BasicEquipInfo = [{
  attr: { max_hp: 0, atk: 0, def: 0 }, 
  blackboard: {},
  rawBlackboard: {},
  description: { talent: '', trait: '' }
}];

const BBLabels = {
  attr: '属性',
  token: '召唤物',
  talent: '天赋',
  trait: '特性'
};

function getBlackboard(blackboardArray) {
  let blackboard = {};
  blackboardArray.forEach(kv => blackboard[kv.key] = kv.value);
  return blackboard;
}

function getEquipInfo(eid) {
  var phases = [];
  var phase = 0;  // 默认取第一个
  var cand = 0;
  var attr = {};
  var description = null;

  if (bedb[eid]) {
    for (phase = 0; phase < bedb[eid].phases.length; ++phase) {
      var item = bedb[eid].phases[phase];
      var rawBlackboard = {};
      attr = getBlackboard(item.attributeBlackboard);

      if (Object.keys(attr).length>0) rawBlackboard.attr = attr;

      if (item.tokenAttributeBlackboard) {
        var tb = {};
        Object.keys(item.tokenAttributeBlackboard).forEach(tok => {
          tb[tok] = getBlackboard(item.tokenAttributeBlackboard[tok]);
        })
        if (tb && Object.keys(tb).length > 0) rawBlackboard.token = tb;
      }

      var desc = {};
      item.parts.forEach(pt => {
        let talentBundle = pt.addOrOverrideTalentDataBundle;
        let traitBundle = pt.overrideTraitDataBundle;
        // 天赋变更
        if (talentBundle && talentBundle.candidates) {
          cand = talentBundle.candidates.length - 1;  // 取满潜数值
          let entry = talentBundle.candidates[cand];
          let value = getBlackboard(entry.blackboard);
          let d = entry.upgradeDescription;
          if (d && d.length>0) desc['talent'] = d;
          if (value && Object.keys(value).length>0) {
            if (!("talent" in rawBlackboard)) rawBlackboard.talent = {};
            $.extend(rawBlackboard.talent, value);
          }
        }
        // 特性变更
        if (traitBundle && traitBundle.candidates) {
          cand = traitBundle.candidates.length - 1;  // 取满潜数值
          let entry = traitBundle.candidates[cand];
          let value = getBlackboard(entry.blackboard);
          let d = (entry.additionalDescription || "") + (entry.overrideDescripton || "");
          if (d.length>0) desc['trait'] = d;
          if (value && Object.keys(value).length>0) {
            if (!("trait" in rawBlackboard)) rawBlackboard.trait = {};
            $.extend(rawBlackboard.trait, value);
          }
        }
        
      });
      description = desc;

      phases.push({ attr, description, rawBlackboard });
    } // for
  } // if

  return phases;

}

function showDesc(key) {
  var item = AKDATA.Data.uniequip_table["equipDict"][key];
  if (item) {
   // console.log(item.uniEquipDesc);
    pmBase.component.create({
      type: 'modal',
      id: "equip_desc_dialog",
      content: item.uniEquipDesc.replace(/\n/g, "<br>"),
      width: 600,
      title: `${item.uniEquipName} - 故事`,
      show: true
    });
  }
}

function joinAttrPhases(info, key) {
  return info.map(x => (key in x.attr ? x.attr[key] : 0)).join(" / ");
}

function rawbHtml(info) {
  if (info.length == 1)
    return "-";
  else {
    let columns = ['等级', '目标', {header: '数值', width: "60%"}];
    let table = [];
    for (var lv=0; lv<info.length; ++lv) {
      let first = true;
      Object.keys(info[lv].rawBlackboard).forEach(k => {
        if (first) {
          table.push([ 
            { rowspan: Object.keys(info[lv].rawBlackboard).length, text: lv+1 },
            BBLabels[k], 
            JSON.stringify(info[lv].rawBlackboard[k])
          ]);
          first = false;
        } else 
          table.push([
            BBLabels[k],
            JSON.stringify(info[lv].rawBlackboard[k])
          ]);
      });
    }
    return pmBase.component.create({
      type: 'list',
      columns,
      list: table,
      class: "table_equip_blackboard"
    });
  }
}

function descHtml(info) {
  if (info.length == 1)
    return "-";
  else {
    let columns = ['等级', '', {header: '描述（满潜）', width: "70%"}];
    let table = [];
    for (var lv=0; lv<info.length; ++lv) {
      let first = true;
      Object.keys(info[lv].description).forEach(k => {
        let value = info[lv].description[k];
        if (value && value.length>0)
          if (first) {
            table.push([ 
              { text: lv+1, rowspan: Object.keys(info[lv].description).length },
              BBLabels[k],
              AKDATA.formatString(value, false, info[lv].rawBlackboard[k])
            ]);
            first = false;
          } else {
            table.push([ BBLabels[k], AKDATA.formatString(value, false, info[lv].rawBlackboard[k]) ]);
          }
          
      });
    }
    return pmBase.component.create({
      type: 'list',
      columns,
      list: table,
      class: "table_equip_blackboard"
    });
  }
}

function buildEquipList() {
  edb = AKDATA.Data.uniequip_table;
  bedb = AKDATA.Data.battle_equip_table;
  chardb = AKDATA.Data.character_table;

  let list = Object.keys(edb["equipDict"]).map( key => {
    let item = edb["equipDict"][key];
    let info = getEquipInfo(key);
    if (info.length == 0) info = BasicEquipInfo;
    let missions = "<ul>" + item.missionList.map(x => `<li> ${edb["missionList"][x].desc} </li>`).join() + "</ul>";
    let charName = `
    <figure class="figure">
      <a href='/akdata/character/#!/${item.charId}' name='${key}' target='_blank'>
        <img class="figure-img" loading="lazy" style="max-width: 60px; height: auto;" src="https://akdata-site.oss-cn-guangzhou.aliyuncs.com/akdata/assets/images/char/${item.charId}.png"></img>
        <figcaption>${chardb[item.charId].name}</figcaption>
      </a>
    </figure>`;
    let subName = `
    <figure class="figure">
        <img class="figure-img" style="max-width: 36px; height: auto; filter: invert(100%);" 
             src="/akdata/assets/images/subclass/sub_${chardb[item.charId].subProfessionId}_icon.png"></img>
        <figcaption>${edb["subProfDict"][chardb[item.charId].subProfessionId].subProfessionName}</figcaption>
    </figure>`;

    return [
      subName,
      charName,
      `<a href="###" onclick='showDesc("${key}")'> ${item.uniEquipName} </a>`,
      // item.uniEquipDesc
      item.unlockLevel,
      joinAttrPhases(info, 'max_hp'),
      joinAttrPhases(info, 'atk'),
      joinAttrPhases(info, 'def'),
      missions,
      descHtml(info),
      rawbHtml(info)
    ];
  });

  return list;
}

function showSubclassDialog() {
  edb = AKDATA.Data.uniequip_table;
  let excludeKeys = ["notchar1", "notchar2", "none1", "none2"];
  let names = {};
  Object.keys(edb["subProfDict"]).filter(x => !excludeKeys.includes(x))
        .forEach(x => {
          names[x] = edb["subProfDict"][x].subProfessionName;
        });
  
  let href_list = Object.keys(names).map(x => `<div class="col-3"><a href="#${x}" onclick="$('#subclass_dialog').modal('hide');">${names[x]}</a></div>`)
  let html = '<div class="row">' + href_list.join("\n") + '</div>';
  
  pmBase.component.create({
    type: 'modal',
    id: "subclass_dialog",
    content: html,
    width: 600,
    title: "选择分支职业",
    show: true,
  });
}

window.showSubclassDialog = showSubclassDialog;

function updateView() {
  var subList = equipList;
  var eid = window.location.hash.replace(/\#/g, "");
  //console.log(eid);
  if (eid) {
    if (eid in edb["equipDict"]) {
      // 过滤干员名字
      var charName = chardb[edb["equipDict"][eid].charId].name;
      subList = equipList.filter(x => x[1].includes(charName));
    } else if (eid in edb["subProfDict"]) {
      // 过滤子职业名字
      let subName = edb["subProfDict"][eid].subProfessionName;
      subList = equipList.filter(x => x[0].includes(subName));
      $(".l-page__title a").text(`专用模组 - ${subName}`);
    }
  }
  if ($("#opt_hidebase").is(":checked"))
    subList = subList.filter(x => x[3] != 0);  
  //console.log(subList);

  let list = pmBase.component.create({
    type: 'list',
    columns: [ '子职业', {header:'干员',width:'6%'}, {header: '模组名称', width: '6%'}, '解锁等级', 
                '  生命值  ', '  攻击力  ', '  防御力  ', {header:'解锁任务',width:'15%'}, 
                {header:'特性/天赋变更',width:'25%'}, {header:'具体数值',width:'20%'} ],
    list: subList,
    sortable: true,
    card: true,
    class: "tablesorter table-striped"
  });

  $("#equip_list").html(list);
  $(".tablesorter").tablesorter();
}

function load() {
  window.showDesc = showDesc;

	pmBase.content.build({
	  pages: [{
      content: "<div id='equip_list'></div>"
    }]
	});

  equipList = buildEquipList();
  updateView();  

  $("#opt_hidebase").change(updateView);
  $("th:nth-child(4)").trigger("click");
  $("th:nth-child(4)").trigger("click");
}

pmBase.hook.on( 'init', init );
window.onhashchange = updateView;

