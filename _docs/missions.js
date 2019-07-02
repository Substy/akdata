function init() {
  AKDATA.loadData([
    'excel/activity_table.json',
    'excel/item_table.json',
    'excel/building_data.json',
  ], load);
}

function load() {
  let activity_table = AKDATA.Data.activity_table;
  let missionKeys = activity_table.missionGroup.map(x=>x.id);

  let list = {
    header: ['任务', '开始时间', '结束时间'],
    list: missionKeys.map( x=> {
      let data = activity_table.basicInfo[x];
      return [
        `<a href="#!/${data.id}">${data.name}</a>`,
        new Date(data.startTime*1000).toLocaleString("default",{ hour12: false }),
        new Date(data.endTime*1000).toLocaleString("default",{ hour12: false }),
      ];
    }),
  };

  pmBase.content.build({
    pages: [{
      content: pmBase.component.create('list', list),
    }, {
      content: show
    }]
  });
}

function show(hash) {
  let groupID = hash.value;
  let missionGroup = AKDATA.Data.activity_table.missionGroup.find(x=>x.id==groupID);
  let missionList = missionGroup.missionIds.map( x=> AKDATA.Data.activity_table.missionData.find(y=>y.id==x) );
  
  let list = {
    header: [ '任务说明', '奖励' ],
    list: missionList.map( x=> [
      x.description,
      x.rewards.map( y=> AKDATA.getItemBadge(y.type, y.id, y.count) ).join('<br>'),
    ]),
  };

  return pmBase.component.create('list', list);
}

pmBase.hook.on('init', init);