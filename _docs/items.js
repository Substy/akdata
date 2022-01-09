function init() {
  AKDATA.load([
    'excel/item_table.json',
  ], load);
}

function load() {
  let selector = {};
  let body = [];
/*
  let itemList = Object.values(AKDATA.Data.item_table.items).orderby(x=>x.sortId);
  let groups = {
    '道具' : [],
    '理智' : [],
    '寻访凭证' : [],
    '作战记录' : [],
    '材料' : [vMTL_SL_],
    '建筑材料' : [MTL_BASE_],
    '技能材料' : [MTL_SKILL],
    '芯片' : [MTL_ASC_],
    '通用信物' : [tier],
    '干员信物' : [p_char_],

  };
  */
/*
  "5001": {
    "itemId": "5001",
    "name": "声望",
    "description": "做得很好，就这样继续变强吧。只要坚持不懈，所有的心血都不会白费的。",
    "rarity": 4,
    "iconId": "EXP_PLAYER",
    "overrideBkg": null,
    "stackIconId": null,
    "sortId": -1,
    "usage": "战斗结束后获得的经验。足以见证博士的成长。",
    "obtainApproach": "战斗获取",
    "itemType": "EXP_PLAYER",
    "stageDropList": [],
    "buildingProductList": []
  },
*/
  let list = pmBase.component.create({
    type: 'list',
    columns: [ {header:'道具',width:'20%'}, '说明', '使用途径' ],
    list: Object.values(AKDATA.Data.item_table.items).orderby(x=>x.sortId).map( itemData=> [
      itemData.name,
      AKDATA.formatString(itemData.description,true),
      AKDATA.formatString(itemData.usage,true),
      itemData.itemType,
      itemData.iconId,
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