function init() {
  AKDATA.load([
    'excel/gacha_table.json',
  ], load);
}

function load() {
  console.log(AKDATA.Data.gacha_table.gachaPoolClient);
  let list = {
    type: 'list',
    header: ['寻访内容', '开始时间', '结束时间', '六星', '五星', '四星', '三星'],

    list: AKDATA.Data.gacha_table.gachaPoolClient.sort(x=>x.endTime).map( data=> {
      let m6 = data.gachaPoolDetail.match( /\n★★★★★★\\n(.+?)（/);
      let m5 = data.gachaPoolDetail.match( /\n★★★★★\\n(.+?)（/);
      let m4 = data.gachaPoolDetail.match( /\n★★★★\\n(.+?)（/);
      let m3 = data.gachaPoolDetail.match( /\n★★★\\n(.+?)（/);
      return [
        `<a href="#!/${data.gachaPoolId}">${data.gachaPoolName}</a>`,
        new Date(data.openTime*1000).toLocaleString("default",{ hour12: false }),
        new Date(data.endTime*1000).toLocaleString("default",{ hour12: false }),
        m6 ? m6[1] : '',
        m5 ? m5[1] : '',
        m4 ? m4[1] : '',
        m3 ? m3[1] : '',
      ];
    }),
    card:true,
  };

  pmBase.content.build({
    pages: [{
      content: pmBase.component.create('list', list),
    }]
  });
}

pmBase.hook.on('init', init);

