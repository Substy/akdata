const ProfessionNames = {
  "PIONEER": "先锋",
  "WARRIOR": "近卫",
  "SNIPER": "狙击",
  "TANK": "重装",
  "MEDIC": "医疗",
  "SUPPORT": "辅助",
  "CASTER": "术师",
  "SPECIAL": "特种"
};


function init() {
  AKDATA.loadData([
    'excel/character_table.json',
    'excel/gacha_table.json',
  ], load);
}

function load() {
  let upCharNames = [];
  let nowTime = new Date().getTime() / 1000;
  AKDATA.Data.gacha_table.gachaPoolClient
    .filter(x => x.endTime > nowTime)
    .forEach(data => {
      let m6 = data.gachaPoolDetail.match( /\n★★★★★★\\n(.+?)（/);
      let m5 = data.gachaPoolDetail.match( /\n★★★★★\\n(.+?)（/);
      let m4 = data.gachaPoolDetail.match( /\n★★★★\\n(.+?)（/);
      let m3 = data.gachaPoolDetail.match( /\n★★★\\n(.+?)（/);
      if (m6) upCharNames.push(...m6[1].split(' / '));
      if (m5) upCharNames.push(...m5[1].split(' / '));
      if (m4) upCharNames.push(...m4[1].split(' / '));
      if (m3) upCharNames.push(...m3[1].split(' / '));
    });
  
  let upCharHtml = '';
  let proKeys = Object.keys(ProfessionNames);
  let charPools = Array.from(Array(6), () => Array(proKeys.length).fill(''));
  Object.entries(AKDATA.Data.character_table).map( ([charId, charData]) => {
    let proIndex = proKeys.indexOf(charData.profession);
    if ( proIndex > -1 ) {
      let isUp = upCharNames.includes(charData.name);
      let a = `<a href="${pmBase.url.getHref('character', charId)}">${charData.name}</a>`;
      charPools[5-charData.rarity][proIndex] += `<div>
        ${AKDATA.getBadge('placeholder', '&nbsp;', '', 'min-width:16px;' )}
        ${AKDATA.getBadge('char', a, charData.rarity)}
        ${AKDATA.getBadge('placeholder', isUp ? 'UP' : '&nbsp;', '', 'min-width:16px;' )}
      </div>`;
    }
  });
  console.log(charPools);

  let list = pmBase.component.create({
    type: 'table',
    bordered: true,
    card: true,
    columns: Object.values(ProfessionNames),
    body: charPools,
    style: "table-layout:fixed;"
  });

  /*
  let upHtml = pmBase.component.create({
    type: 'card',
    title: '当前UP干员',
    body: upCharNames.map(x=>)
  })
  console.log(upCharNames);

*/
  pmBase.content.build({
    pages: [{
      content: list,
    }]
  });
}


pmBase.hook.on('init', init);