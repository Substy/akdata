function init() {
  AKDATA.loadData([
    'excel/item_table.json',
    'excel/building_data.json',
  ], load);
}

function createOutcomeTable(group){
  let totalWeight = group.sum(x=>x.weight);
  return group.map(x=>AKDATA.Data.item_table.items[x.itemId].name + '(' + Math.round(x.weight /totalWeight*10000)/100 + '%)').join('<br>')
}
function createCostTable(costs){
  return costs.map(x=>AKDATA.Data.item_table.items[x.id].name + '(' + x.count + ')').join('<br>')
}
function load() {
  let list = pmBase.component.create({
    type: 'list',
    columns: [ '道具', '材料', '金币', '副产物几率', '副产物内容' ],
    list: Object.values(AKDATA.Data.building_data.workshopFormulas).map( formula=>[
      `${AKDATA.Data.item_table.items[formula.itemId].name}(${formula.count})`,
      formula.goldCost,
      createCostTable(formula.costs),
      formula.extraOutcomeRate * 100 + '%',
      createOutcomeTable(formula.extraOutcomeGroup),
    ]),
    sortable: true,
  });

	pmBase.content.build({
	  pages: [{
      content: list,
    }]
	});
}

pmBase.hook.on( 'init', init );