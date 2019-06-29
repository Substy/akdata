import AKDATA from './core.js';

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
    'excel/skill_table.json',
    'excel/range_table.json',
  ], load);
}
/*0.78 非常快
0.93 1 快
1.05 1.2 中等
1.25 1.3 1.5 1.6 较慢
1.8 2.85 慢 */
function load() {
  let selector = {};
  let list = [];
  let head = [ '干员', '编号', '星级', '职业', '特性' ];
  for (let char in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[char];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;
    let phaseData = charData.phases[0].attributesKeyFrames[0].data;
    selector[char] = charData.displayNumber + ' ' + charData.name;
    list.push([
      `<a href="#!/${char}">${charData.name}</a>`,
      charData.rarity + 1,
      charData.displayNumber,
      ProfessionNames[charData.profession],
      AKDATA.formatString(charData.description),
    ]);
  }
  
	pmBase.content.build({
	  pages: [{
      content: pmBase.content.create('sortlist', list, head),
    },{
      selector: selector,
      content: show,
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
  console.log(table);
  grids.forEach(item=>{
    table[yo + item.col][xo + item.row] = 'true';
  });
  table[yo][xo] = 'origin';
  //table = table.map((col, i) => table.map(row => row[i]));
  let html = '<table class="p-range"><tbody>'
    + table.map(row => {
      return '<tr>'
        + row.map(cell=> `<td class="p-range__cell p-range__cell--${cell}"></td>`).join('')
        + '</tr>';
    }).join('')
    + '</tbody></table>';

  return html;
}

pmBase.hook.on( 'init', init );