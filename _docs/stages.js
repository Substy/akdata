function init() {
  AKDATA.loadData([
    'excel/zone_table.json',
    'excel/stage_table.json',
  ], load);
}

function load() {
  let selector = {};
  let list = [];

  Object.entries(AKDATA.Data.zone_table.zones).forEach(([key, value]) => {
    let zoneName = value.zoneNameFirst ?
      `${value.zoneNameFirst} ${value.zoneNameSecond}` :
      value.zoneNameSecond;
    list.push([
      `<a href="#!/${value.zoneID}">${zoneName}</a>`,
    ]);
    selector[value.zoneID] = zoneName;
  });

  pmBase.content.build({
    pages: [{
      content: pmBase.content.create('list', list),
    }, {
      content: show,
      control: selector,
    }]
  });
}

function show(hash) {
  let zoneID = hash.value;

  let list = {
    type: 'list',

    list: Object.entries(AKDATA.Data.stage_table.stages)
      .filter(([key, value]) => value.zoneId == zoneID)
      .map(([key, value]) => [
        value.code,
        `<a href="${pmBase.url.getHref( 'levels', value.levelId)}">${value.name}</a>` + (value.stageId.includes('#f#') ? '<br><small>（突袭）</small>' : ''),
        value.dangerLevel,
        value.apCost,
        AKDATA.formatString(value.description).replace('附加条件：<br>', ''),
        value.stageType,
      ]),

    columns: [{
        header: '编号',
      },
      {
        header: '关卡',
      },
      {
        header: '推荐等级',
      },
      {
        header: '理智',
      },
      {
        header: '说明',
        width: '50%',
        class: 'text-left small ',
      },
      {
        header: '',
      },
    ],
  };

  let content = pmBase.component.create(list);
  return content;
}

function formatString(string) {
  return string;
}

pmBase.hook.on('init', init);