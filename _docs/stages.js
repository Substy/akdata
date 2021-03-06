function init() {
  AKDATA.load([
    'excel/zone_table.json',
    'excel/stage_table.json',
  ], show);
}

function show() {
  let selector = {};
  let list = [];
  let html = '<div class="row">';

  Object.entries(AKDATA.Data.zone_table.zones).forEach(([key, value]) => {
    let zoneName = value.zoneNameFirst ?
      `${value.zoneNameFirst} ${value.zoneNameSecond}` :
      value.zoneNameSecond;
    list.push([
      `<a href="#!/${value.zoneID}">${zoneName}</a>`,
    ]);
    selector[value.zoneID] = zoneName;
    html += `<div class="col-6 col-sm-3"><div class="card m-3">
    <a class="card-block stretched-link text-decoration-none" href>
      <div class="card-header">
      <div class="card-title">${zoneName}</div>
      </div>
        ...
    </a>
</div></div>`;
  });
  html += '</div>';

  pmBase.content.build({
    pages: [{
      content: pmBase.content.create('list', list),
    }, {
      content: parse,
      control: selector,
    }]
  });
}

function parse(hash) {
  let zoneID = hash.value;

  let list = {
    type: 'list',

    list: Object.entries(AKDATA.Data.stage_table.stages)
      .filter(([key, value]) => value.zoneId == zoneID && value != null)
      .map(([key, value]) => [
        value.code,
        `<a href="${pmBase.url.getHref( 'levels', value.levelId||'')}">${value.name}</a>` + (value.stageId.includes('#f#') ? '<small>（突袭）</small>' : ''),
        value.dangerLevel,
        value.apCost,
        AKDATA.formatString(value.description, true).replace('附加条件：<br>', ''),
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
      },
      {
        header: '',
      },
    ],
  };

  return {
    content: pmBase.component.create(list),
  };
}

pmBase.hook.on('init', init);