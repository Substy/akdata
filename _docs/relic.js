function init() {
  AKDATA.load([
    'excel/roguelike_topic_table.json',
  ], load);
}

function getBlackboard(blackboardArray) {
  let blackboard = {};
  blackboardArray.forEach(kv => blackboard[kv.key] = kv.value);
  return blackboard;
}

function rank(x) {
  if (x.orderId)
    return parseInt(x.orderId.replace("PCS", "9")); // PCS01 -> 901
  else 
    return x.sortId*100+x.value;
}

var DisplayType = {
  RELIC:    "收藏品",
  UPGRADE_TICKET: "进阶券",
  CAPSULE:  "剧目",
  RECRUIT_TICKET: "招募券",
  ACTIVE_TOOL: "战术道具",
  CUSTOM_TICKET: "净化券",
  LOCKED_TREASURE: "上锁的宝箱",
  TOTEM: "密文板",
  TOTEM_UPPER: "布局",
  TOTEM_LOWER: "本因",
  VISION: "抗干扰"
};

function makeList(which=1) {
  let rogue = AKDATA.Data.roguelike_topic_table.details[`rogue_${which}`];
  
  let relicArchive = rogue.archiveComp.relic.relic;
  let relicBlackboard = rogue.relics;
  let rogueItems = rogue.items;
  let relics = {};
  let modules = AKDATA.Data.roguelike_topic_table.modules[`rogue_${which}`];

  // join
  Object.values(rogueItems).forEach(item => {
    if (item.value > 0) // 排除奇怪的东西
      relics[item.id] = item;
  });
  Object.values(relicArchive).forEach(item => {
    Object.assign(relics[item.relicId], item);
  });
  Object.values(relicBlackboard).forEach(item => {
    var buf = {};
    item.buffs.forEach(b => {
      buf[b.key] ||= [];
      buf[b.key].push(getBlackboard(b.blackboard));
    });
    Object.keys(buf).forEach(k => {
      if (buf[k].length == 1)
        buf[k] = buf[k][0]; // flatten
    });
    if (relics[item.id])
      relics[item.id].blackboard = buf;
  });
  
  let list = pmBase.component.create({
    type: 'list',
    columns: [ "编号", {header:'道具',width:'12%'}, {header:'类别',width:'8%'},
              {header:'价值',width:'8%'}, {header:"效果/描述",width:"30%"}, {header:"解锁方式", width: "25%"}, {header:'数值',width:'15%'} ],
    list: Object.values(relics).orderby(x=>rank(x)).map( item=> {
      let listView = [
        item.orderId || "-",
        (item.orderId ? `<img class="figure" loading="lazy" src="/akdata/assets/images/relic/${which}/${item.orderId}.png" /><br>` : "")
        + "<strong>" + item.name + "</strong>",
        DisplayType[item.type] || item.type,
        item.value || "-",
        item.usage + "<br><i><small>" + (item.description || "") + "</small></i>",
        item.unlockCondDesc || "-",
        JSON.stringify(item.blackboard, null, 2)
      ];
      if (item.type == "TOTEM") {
        let totemBuffs = modules.totemBuff.totemBuffDatas[item.id];
        let color = totemBuffs.color.toLowerCase();
        listView[2] += `<br><i><small>${DisplayType[item.subType]}<small></i>`;
        listView[4] = totemBuffs.archiveDesc.replace("（", "<br>（")
                    + `<br><span style="font-style: italic; font-size: 80%; font-weight: 300; color: ${color}">
                        ${totemBuffs.rhythm}
                      </span>`;
      }
      return listView;
  }),
    sortable: true,
    card: true,
  });

  return list;
}

function load() {
  let tabs = pmBase.component.create({
    type: 'tabs',
    tabs: [{
      text: '傀影与猩红孤钻',
      content: makeList(1),
    },{
      text: '水月与深蓝之树',
      content: makeList(2),
    },{
      text: '探索者的银凇止境',
      content: makeList(3),
    }],
    active: 2
  });

  pmBase.content.build({
	  pages: [{
      content: tabs
    }]
	});
}

pmBase.hook.on( 'init', init );