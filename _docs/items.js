function init() {
  AKDATA.loadData([
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
  });

	pmBase.content.build({
	  pages: [{
      content: list,
    }]
	});
}

function show(hash) {
  var charId = hash.value;
  var charData = AKDATA.Data.character_table[charId];

  let dataInfo = [
    [ 'name', charData.name ],
    [ 'description', AKDATA.formatString(charData.description) ],
    [ 'displayNumber', charData.displayNumber ],
    [ 'position', charData.position ],
    [ 'rarity', charData.rarity ],
    [ 'profession', charData.profession ],
    [ 'tagList', charData.tagList ],
  ];

  let phaseCount = charData.phases.length;

  let phaseTable = [];

  let attributeKeys = Object.keys(charData.phases[0].attributesKeyFrames[0].data);
  attributeKeys.forEach( (key) => {
    let row = [ key, '', '', '', '' ];
    for(let i = 0; i <= phaseCount; i++ ){
      if ( i == phaseCount ) {
        var min = charData.favorKeyFrames[0].data[key];
        var max = charData.favorKeyFrames[1].data[key];
      } else {
        var min = charData.phases[i].attributesKeyFrames[0].data[key];
        var max = charData.phases[i].attributesKeyFrames[1].data[key];
      }
      if ( min == max ) {
        row[i+1] = min;
      } else {
        row[i+1] = min + ' - ' + max;
      }
    }
    phaseTable.push(row);
  });

  let rangeRow = [];
  for(let i = 0; i < phaseCount; i++ ){
    rangeRow[i] = createRangeTable(charData.phases[i].rangeId);
  }
  phaseTable.push( ['range', ...rangeRow ]);

  let skillHtml = '';
  for(let i=0; i< charData.skills.length; i++){
    let skillInfo = charData.skills[i];
    let skillId = skillInfo.skillId;
    let skillData = AKDATA.Data.skill_table[skillId];

    let spNames = ['spType', 'maxChargeTime', 'spCost', 'initSp', 'increment'];
    let blackboardNames = skillData.levels[0].blackboard.map((x)=>x.key);

    let tableHead = [ '' ].concat(spNames).concat(blackboardNames);
    let tableList = [];
    
    for( let l =0;l<skillData.levels.length;l++){
      let row = [
        l + 1,
        skillData.levels[l].spData.spType,
        skillData.levels[l].spData.maxChargeTime,
        skillData.levels[l].spData.spCost,
        skillData.levels[l].spData.initSp,
        skillData.levels[l].spData.increment,
      ];
      for(let j=0;j<blackboardNames.length;j++){
        row.push(skillData.levels[l].blackboard.filter((x)=>x.key==blackboardNames[j])[0].value);
      }
      tableList.push(row);
    }

    skillHtml += `<h4>${skillData.levels[0].name}</h4>` + pmBase.content.create('list', tableList, tableHead);

    let rangeId = skillData.levels[0].rangeId;
    if ( rangeId ) {
      skillHtml += createRangeTable(rangeId);
    }

  }

  let html = `
    <h3>属性</h3>
    ${pmBase.content.create('info', dataInfo)}
    <h3>Phases</h3>
    ${pmBase.content.create('info', phaseTable)}
    <h3>Skills</h3>
    ${skillHtml}
  `;

  return html;
}

function createRangeTable(rangeId) {
  let grids = AKDATA.Data.range_table[rangeId].grids;
  let xs = grids.map(x=>x.row);
  let ys = grids.map(x=>x.col);
  let xm = Math.abs(Math.max(...xs));
  let xn = Math.abs(Math.min(...xs));
  let ym = Math.abs(Math.max(...ys));
  let yn = Math.abs(Math.min(...ys));
  let rowCount = xm + xn + 1;
  let colCount = ym + yn + 1;
  let table = Array.from(Array(colCount), () => Array(rowCount).fill('null'));
  let xo = xn;
  let yo = yn;
  grids.forEach(item=>{
    table[yo + item.col][xo + item.row] = 'true';
  });
  table[yo][xo] = 'origin';

  
  let html = '<table class="p-range"><tbody>';
  for( let r = colCount-1;r>=0;r--){
    html += '<tr>';
    for( let c = 0;c<rowCount;c++){
      html += `<td class="p-range__cell p-range__cell--${table[c][r]}"></td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

pmBase.hook.on( 'init', init );