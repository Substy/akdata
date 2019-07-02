function init() {
  AKDATA.loadData([
    'excel/building_data.json',
  ], load);
}

function load() {
  let list = [];
  let selector = {};

  let groupComforts = {};
  $.each(AKDATA.Data.building_data.customData.groups, (key, value) => {
    groupComforts[value.themeId] = (groupComforts[value.themeId] || 0) + value.comfort;
  });

  $.each(AKDATA.Data.building_data.customData.themes, (key, value) => {
    let totalComfort = value.quickSetup.map(x => AKDATA.Data.building_data.customData.furnitures[x.furnitureId].comfort).reduce((a, b) => a + b);
    totalComfort += groupComforts[key];

    let row = [
      `<a href="#!/${value.id}">${value.name}</a>`,
      value.desc,
      totalComfort,
    ];
    list.push(row);
    selector[value.id] = value.name;
  });

  pmBase.content.build({
    pages: [{
      content: pmBase.component.create('list', {
        header: [ '家具', '说明', '舒适度总和' ],
        list,
        sortable: true
      }),
    }, {
      content: show,
      control: selector,
    }]
  });
}

function show(hash) {
  let themeId = hash.value;
  let totalComfort = 0;
  let html = `<table class="table table-sm">`;
  html += `<tbody><tr>
    <th>家具</th>
    <th>氛围</th>
    <th>数量</th>
  </tr></tbody>`;
  let setupList = AKDATA.Data.building_data.customData.themes[themeId].quickSetup.map(x => x.furnitureId);

  $.each(AKDATA.Data.building_data.customData.groups, (key, value) => {
    if (value.themeId == themeId) {
      totalComfort += value.comfort;
      html += `<tbody><tr>
        <th>${value.name}</th>
        <th>${value.comfort}</th>
        <th></th>
      </tr>`;

      value.furniture
        .forEach(x => {
          let data = AKDATA.Data.building_data.customData.furnitures[x];
          let count = setupList.filter(y => y == x).length;
          totalComfort += data.comfort * count;
          html += `<tr><td class="pl-4">${data.name}</td><td>${data.comfort}</td><td>${count}</td></tr>`;
        });

      html += `</tbody>`;
    }
  });

  html += `<tbody><tr>
    <th>总计</th>
    <th>${totalComfort}</th>
    <th></th>
  </tr></tbody>`;
  html += `</table>`;

  return html;
}

pmBase.hook.on('init', init);