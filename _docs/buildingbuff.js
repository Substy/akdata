function init() {
  AKDATA.loadData([
    'excel/character_table.json',
    'excel/building_data.json',
    'excel/gamedata_const.json',
  ], load);
}
/*

    "control_tra_spd[000]": {
      "buffId": "control_tra_spd[000]",
      "buffName": "合作协议",
      "buffIcon": "control",
      "buffColor": "#005752",
      "textColor": "#ffffff",
      "buffCategory": "OUTPUT",
      "roomType": "CONTROL",
      "description": "进驻控制中枢时，所有贸易站订单效率<@cc.vup>+7%</>"
    },
*/

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
        AKDATA.formatString(buffData.description),
        charList[buffData.buffId].map(x=>AKDATA.getChar(x[0], x[1], x[2])).join('、'),
      ];
    }),
    sortable: true,
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