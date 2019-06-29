import AKDATA from './core.js';

function init() {
  pmBase.content.build({
    pages: [{
      content: show,
    }]
  });
}

function intersect(l1_p1_x, l1_p1_y, l1_p2_x, l1_p2_y, l2_p1_x, l2_p1_y, l2_p2_x, l2_p2_y) {
  let s1_x = l1_p2_x - l1_p1_x;
  let s1_y = l1_p2_y - l1_p1_y;
  let s2_x = l2_p2_x - l2_p1_x;
  let s2_y = l2_p2_y - l2_p1_y;
  let s = (-s1_y * (l1_p1_x - l2_p1_x) + s1_x * (l1_p1_y - l2_p1_y)) / (-s2_x * s1_y + s1_x * s2_y);
  let t = (s2_x * (l1_p1_y - l2_p1_y) - s2_y * (l1_p1_x - l2_p1_x)) / (-s2_x * s1_y + s1_x * s2_y);
  return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
}

function extractEnemyData(source, target) {
  for (let key in target) {
    if (target[key] && target[key].m_defined) source[key] = target[key].m_value;
  }
  for (let key in target.attributes) {
    if (target.attributes[key] && target.attributes[key].m_defined) source[key] = target.attributes[key].m_value;
  }
}

function createMap(map, tiles, texts, rates, size){
  let html = '<table class="p-map"><tbody>';
  map.forEach( row => {
    html+='<tr>';
    row.forEach(tileIndex => {
      let tileData = tiles[tileIndex];
      let type = tileData.tileKey.slice(5);
      let text = texts ? texts[tileIndex] : '';
      if(!!rates) text = `<div style="width:${size};height:${size};line-height:${size};background-color: rgba(255,0,0,${rates[tileIndex]});color:#600;">${text}</div>`;
      html+= `<td class="p-map__tile p-map__tile--${type} p-map__tile--height-${tileData.heightType} p-map__tile--buildable-${tileData.buildableType}">${text}</td>`;
    });
    html+='</tr>';
  });
  html +='</tbody></table>';
  return html;
}

function show(hash) {
  if (hash.isEmpty) return;
  let levelId = hash.value;
  AKDATA.loadData([
    `excel/item_table.json`,
    `excel/building_data.json`,
    `excel/stage_table.json`,
    `levels/enemydata/enemy_database.json`,
    `levels/${levelId}.json`,
  ], showCallback, levelId);
}

function showCallback(levelId) {
  let html = '';
  let levelData = AKDATA.Data[levelId.split('/').pop()];
  let stageData = Object.values(AKDATA.Data.stage_table.stages).find(x=>x.levelId==levelId);
  let hardStageData;
  if (stageData.hardStagedId) hardStageData = AKDATA.Data.stage_table.stages[stageData.hardStagedId];
  console.log(levelData);
  console.log(stageData);
  console.log(hardStageData);
  // Enemy
  let finalEnemyData = {};
  levelData.enemyDbRefs.forEach(item => {
    let query = AKDATA.Data.enemy_database.enemies
      .find(x => x.Key == item.id)
      .Value;
    let data = {
      count: 0,
    };
    extractEnemyData(data, query[0].enemyData);
    if (item.level > 0) extractEnemyData(data, query[item.level].enemyData);
    if (!!item.overwrittenData) extractEnemyData(data, item.overwrittenData);

    finalEnemyData[item.id] = data;
  });

  // Map
  let mapWidth = levelData.mapData.width;
  let mapHeight = levelData.mapData.height;
  let mapReindex = new Array(mapWidth*mapHeight).fill("");
  let startIndex = 0, endIndex = 0;
  levelData.mapData.tiles.forEach((tile, index) => {
    if (tile.tileKey == 'tile_start' || tile.tileKey == 'tile_flystart') mapReindex[index] = ++startIndex;
    else if (tile.tileKey == 'tile_end') mapReindex[index] = ++endIndex;
  });
  console.log(finalEnemyData);

  let mapTable = createMap( levelData.mapData.map,  levelData.mapData.tiles, mapReindex);

  // Routes
  let routeList = levelData.routes.map(data => {
    if (!data) return null;

    let checkpoints = [];
    checkpoints.push([data.startPosition.col, data.startPosition.row, data.startPosition.col + 0.5, data.startPosition.row + 0.5]);
    data.checkpoints.forEach(x => {
      if (x.type == 0)
        checkpoints.push([x.position.col, x.position.row, x.position.col + 0.5 + x.reachOffset.x, x.position.row + 0.5 + x.reachOffset.y]);
    });
    checkpoints.push([data.endPosition.col, data.endPosition.row, data.endPosition.col + 0.5, data.endPosition.row + 0.5]);

    let tiles = [];
    for (let i = 0; i < checkpoints.length - 1; i++) {
      let [c0, r0, x0, y0] = checkpoints[i];
      let [c1, r1, x1, y1] = checkpoints[i + 1];

      if (c0 > c1)[c0, c1] = [c1, c0];
      if (r0 > r1)[r0, r1] = [r1, r0];

      let checker = [];
      for (let x = c0; x < c1; x++)
        for (let y = r0; y <= r1; y++) {
          checker.push([x + 1, y, x + 1, y + 1, x, y, x + 1, y]);
        }
      for (let x = c0; x <= c1; x++)
        for (let y = r0; y < r1; y++) {
          checker.push([x, y + 1, x + 1, y + 1, x, y, x, y + 1]);
        }

      for (let line of checker) {
        if (intersect(x0, y0, x1, y1, line[0], line[1], line[2], line[3])) {
          tiles.push(line[4] + line[5] * mapWidth);
          tiles.push(line[6] + line[7] * mapWidth);
        }
      }
    }
    tiles = [...new Set(tiles)];
    return {
      start: data.startPosition.col + data.startPosition.row * mapWidth,
      end: data.endPosition.col + data.endPosition.row * mapWidth,
      tiles
    };
  });

  // Enemy
  let htmlWave = '';
  let enemyIndex = 0;
  let enemyIndexBegin = 0;
  let totalDelay = 0;
  let totalEnemyCount = 0;
  let totalEnemyHP = 0;
  let totalEnemyAtk = 0;
  let atkHeatmap = new Array(levelData.mapData.tiles.length).fill(0);
  let hpHeatmap = new Array(levelData.mapData.tiles.length).fill(0);
  let numberHeatmap = new Array(levelData.mapData.tiles.length).fill(0);
  levelData.waves.forEach((waveData, waveIndex) => {
    let waveDelay = 0;
    let htmlBody = '';
    enemyIndexBegin = enemyIndex + 1;
    waveData.fragments.forEach((fragmentData, fragmentIndex) => {
      let lastDelay = 0;
      let extendActions = [];
      fragmentData.actions.forEach((actionData, actionIndex) => {
        if (actionData.actionType != 0) return true;
        totalEnemyCount += actionData.count;
        for (let i = 0; i < actionData.count; i++) {
          let preDelay = waveDelay + fragmentData.preDelay + actionData.preDelay + actionData.interval * i;
          // actionData.blockFragment !! care
          let action = {
            key: actionData.key,
            routeIndex: actionData.routeIndex,
            preDelay: preDelay,
          };
          extendActions.push(action);
          lastDelay = Math.max(lastDelay, preDelay);
        }
      });
      extendActions.sort((a, b) => a.preDelay - b.preDelay);
      waveDelay = lastDelay;

      htmlBody += '<thead><tr><th>序号</th><th style="width:20%;">敌人</th><th>时间</th><th>出口</th><th>入口</th><th>HP</th><th>攻击</th><th>防御</th><th>魔抗</th></tr></thead>';
      htmlBody += '<tbody>';
      extendActions.forEach((actionData, j) => {
        let number = ++enemyIndex;
        let enemyData = finalEnemyData[actionData.key];
        if (!enemyData) return true;
        totalEnemyHP += enemyData.maxHp;
        totalEnemyAtk += enemyData.atk;
        let routeData = routeList[actionData.routeIndex];
        routeData.tiles.forEach( i=> {
          hpHeatmap[i] += enemyData.maxHp;
          atkHeatmap[i] += enemyData.atk;
          numberHeatmap[i]++;
        });
        enemyData.count++;
        htmlBody += `<tr>
        <td>${number}</td>
        <td>${enemyData.name}</td>
        <td>${actionData.preDelay}</td>
        <td>${mapReindex[routeData.start] || routeData.start}</td>
        <td>${mapReindex[routeData.end] || routeData.end}</td>
        <td>${enemyData.maxHp}</td>
        <td>${enemyData.atk}</td>
        <td>${enemyData.def}</td>
        <td>${enemyData.magicResistance}%</td>
        </tr>`;
      });
      htmlBody += '</tbody>';
    });
    totalDelay += waveDelay;
    if (enemyIndex < enemyIndexBegin) return true;
    htmlWave += `
    <div class="card">
    <div class="card-header" id="headingOne" data-toggle="collapse" data-target="#collapse${waveIndex}">
      阶段${waveIndex+1}：${waveData.name || enemyIndexBegin + '-' + enemyIndex}
    </div>
    <div id="collapse${waveIndex}" class="collapse ${levelData.waves.length == 1?'show':''}">
      <table class="table table-sm card-body p-0 m-0 text-center">
        ${htmlBody}
      </table>
    </div>
    </div>
    `;
  });
  
  let hpHeatmapRates = hpHeatmap.map(x=> (x / totalEnemyHP).toFixed(2));
  let hpHeatmapText = hpHeatmapRates.map(x=> x>0?(x*100).toFixed(0)+'%':'');
  let hpHeatmapTable = createMap(levelData.mapData.map, levelData.mapData.tiles, hpHeatmapText, hpHeatmapRates, '32px' );

  let countHeatmapRates = numberHeatmap.map(x=> (x / totalEnemyCount).toFixed(2));
  let countHeatmapText = numberHeatmap.map(x=> x>0?x:'');
  let countHeatmapTable = createMap(levelData.mapData.map, levelData.mapData.tiles, countHeatmapText, countHeatmapRates, '32px' );

  let atkHeatmapRates = atkHeatmap.map(x=> (x / totalEnemyAtk).toFixed(2));
  let atkHeatmapText = atkHeatmapRates.map(x=> x>0?(x*100).toFixed(0)+'%':'');
  let atkHeatmapTable = createMap(levelData.mapData.map, levelData.mapData.tiles, atkHeatmapText, atkHeatmapRates, '32px' );


  let enemyHead = ['敌人', '数量', 'HP', '攻击', '防御', '魔抗', '移速', '攻速', 'BAT', '体重'];
  let enemyTable = Object.entries(finalEnemyData).map(([enemyId, enemyData]) => [
    enemyData.name,
    enemyData.count,
    enemyData.maxHp,
    enemyData.atk,
    enemyData.def,
    enemyData.magicResistance + '%',
    (enemyData.moveSpeed * 100).toFixed(0) + '%',
    enemyData.attackSpeed + '%',
    enemyData.baseAttackTime,
    enemyData.massLevel,
  ]);

  let htmlDrop;
  if ( !!stageData.stageDropInfo.displayDetailRewards ) {
    let dropTypes = ['', '首次掉落', '常规掉落', '特殊掉落', '额外物资', '', '', '幸运掉落' ];
    let dropList = {
      type: 'list',
      header: ['道具','掉落类型','掉落概率'],
      list: stageData.stageDropInfo.displayDetailRewards.map(x=>[
        AKDATA.getItem(x.type, x.id),
        dropTypes[x.dropType],
        x.occPercent,
      ]),
    };
    htmlDrop=pmBase.component.create(dropList);
  }

  let infoTable = [
    ['关卡', ''],
    ['配置上限', levelData.options.characterLimit],
    ['初始部署费用', levelData.options.initialCost],
    ['部署费用回复', levelData.options.costIncreaseTime == 999999 ? '0' : levelData.options.costIncreaseTime + '秒/点'],
    ['部署费用上限', levelData.options.maxCost],
    ['生命值', levelData.options.maxLifePoint],
    ['敌人数量', totalEnemyCount],
    ['最短耗时', Math.floor(totalDelay / 60) + ':' + Math.ceil(totalDelay % 60).toString().padStart(2, '0')],
  ];
  let tabs = pmBase.component.create({
    type: 'tabs',
    tabs: [{
      text: '基础信息',
      content: '',
    },{
      text: '掉落道具',
      content: htmlDrop,
    },{
      text: '敌人',
      content: pmBase.content.create('list', enemyTable, enemyHead),
    },{
      text: '时间线',
      content: htmlWave,
    },{
      text: '热度<small>（测试）</small>',
      content: `<div class="row">
        <div class="col-12 col-lg-12">按HP：${hpHeatmapTable}</div>
        <div class="col-12 col-lg-12">按数量：${countHeatmapTable}</div>
        <div class="col-12 col-lg-12">按攻击力：${atkHeatmapTable}</div>
      </div>`,
    }]
  });

  html += `
  <div class="row">
    <div class="col-12 col-lg-7">${pmBase.content.create('info', infoTable)}</div>
    <div class="col-12 col-lg-5">${mapTable}</div>
  </div>
  ${tabs}
  `;
  
  return {content: html, title: stageData.name};
}

pmBase.hook.on('init', init);