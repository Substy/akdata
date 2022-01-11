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
  UPGRADE_TICKET: "进阶卷",
  CAPSULE:  "剧目",
  RECRUIT_TICKET: "招募卷",
  ACTIVE_TOOL: "战术道具"
};

function load() {
  let rogue1 = AKDATA.Data.roguelike_topic_table.details.rogue_1;
  let relicArchive = rogue1.archiveComp.relic.relic;
  let relicBlackboard = rogue1.relics;
  let rogueItems = rogue1.items;
  let relics = {};

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
              {header:'价值',width:'8%'}, "效果/描述", "解锁方式", {header:'数值',width:'15%'} ],
    list: Object.values(relics).orderby(x=>rank(x)).map( item=> [
      item.orderId || "-",
      (item.orderId ? `<img class="figure" src="/akdata/assets/images/relic/${item.orderId}.png" /><br>` : "")
       + "<strong>" + item.name + "</strong>",
      DisplayType[item.type],
      item.value || "-",
      item.usage + "<br><i><small>" + (item.description || "") + "</small></i>",
      item.unlockCondDesc || "-",
      JSON.stringify(item.blackboard, null, 2)
    ]),
    sortable: true,
    card:true,
  });

	pmBase.content.build({
	  pages: [{
      content: list,
    }]
	});
}

pmBase.hook.on( 'init', init );