function init() {
  AKDATA.load(['excel/building_data.json'],load);
}
/*
"furni_warehouse_storageshelf_01": {
  "id": "furni_warehouse_storageshelf_01",
  "name": "大号货架",
  "iconId": "furni_warehouse_storageshelf_01",
  "type": "DECORATION",
  "location": "FLOOR",
  "category": "FURNITURE",
  "rarity": 1,
  "themeId": "",
  "width": 6,
  "depth": 3,
  "height": 9,
  "comfort": 85,
  "usage": "能够用来装扮宿舍，提高宿舍的氛围",
  "description": "物流公司常用的大号货架，能摆放许多货物。",
  "obtainApproach": "初始配套",
  "processedProductId": "3401",
  "processedProductCount": 5,
  "processedByProductPercentage": 0,
  "processedByProductGroup": [],
  "canBeDestroy": true
},
*/

function load() {
  let furnitures = AKDATA.Data.building_data.customData.furnitures;
  let list = [];
  let header = ['name', 'type', 'location', 'category', 'rarity', 'size', 'comfort', ];
  $.each(furnitures, (key, value) => {
    let row = [
      value.name,
      value.description,
      value.type,
      value.location,
      value.category,
      value.rarity,
      `${value.width}×${value.depth}×${value.height}`,
      value.comfort,
      value.themeId
    ];
    list.push(row);
  });
  
	pmBase.content.build({
	  pages: [{
      content: pmBase.component.create('list', {list, header,
        card:true, sortable:true}),
    }]
	});
}

pmBase.hook.on( 'init', init );