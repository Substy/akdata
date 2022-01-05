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
  AKDATA.load([
    'excel/character_table.json',
    'excel/char_patch_table.json',
    'excel/gacha_table.json',
  ], load);
}

function load() {
  let upCharNames = [];
  let nowTime = new Date().getTime() / 1000;
  AKDATA.patchAllChars();

  let upCharHtml = '';
  let proKeys = Object.keys(ProfessionNames);
  let charPools = Array.from(Array(6), () => Array(proKeys.length).fill(''));
  Object.entries(AKDATA.Data.character_table).map( ([charId, charData]) => {
    let proIndex = proKeys.indexOf(charData.profession);
    if ( proIndex > -1 ) {
      let isUp = upCharNames.includes(charData.name);
      var displayName = charData.name;
      if (!charData.displayNumber) displayName = "[集成战略]" + displayName;

      let a = `<a href="${pmBase.url.getHref('character', charId)}">${displayName}</a>`;
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