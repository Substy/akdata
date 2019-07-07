function init() {
  AKDATA.load([
    'excel/character_table.json',
    'excel/building_data.json',
    'excel/gamedata_const.json',
  ], load);
}

function load() {
  let buffs = AKDATA.Data.building_data.buffs;
  let rooms = AKDATA.Data.building_data.rooms;

  let charList = {};
  Object.values(AKDATA.Data.building_data.chars).map( charData => {
    charData.buffChar.flatMap(x=>x.buffData).map( buffData=> {
      if(charList[buffData.buffId] == null) charList[buffData.buffId] = [];
      charList[buffData.buffId].push([charData.charId, buffData.cond.phase, buffData.cond.level]);
    });
  });
  console.log(charList);
  let list = {
    type: 'list',
    header: ['技能', '设施', '效果', '干员'],
    widths: ['20%','20%','40%','20%'],
    list: Object.values(buffs).map( buffData => {
      return [
        buffData.buffName,
        //buffData.buffIcon,
        //buffData.buffColor,
        //buffData.textColor,
        //buffData.buffCategory,
        `<div style="margin:auto;width:80px;font-size:xx-small;background-color:${buffData.buffColor};color:${buffData.textColor}">${rooms[buffData.roomType].name}</div>`,
        AKDATA.formatString(buffData.description, true),
        charList[buffData.buffId].map(x=>AKDATA.getChar(x[0], x[1], x[2])).join('、'),
      ];
    }),
    sortable: true,
    card:true,
  };
console.log(list);
	pmBase.content.build({
	  pages: [{
      content: pmBase.component.create(list),
    }]
	});
}

function formatString(string) {
  return string;
}

pmBase.hook.on( 'init', init );