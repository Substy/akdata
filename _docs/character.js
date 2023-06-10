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
    'excel/skill_table.json',
    'excel/range_table.json',
    'excel/gamedata_const.json',
    'excel/item_table.json',
    '../customdata/enums.json'
  ], load);
}
/*0.78 非常快
0.93 1 快
1.05 1.2 中等
1.25 1.3 1.5 1.6 较慢
1.8 2.85 慢 */
function load() {
  let selector = {};
  let body = [];
  AKDATA.patchAllChars();
  for (let char in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[char];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;
    let phaseData = charData.phases[0].attributesKeyFrames[0].data;
    selector[char] = (charData.displayNumber || "-")+ ' ' + charData.name;
    var displayName = charData.name;
    if (!charData.displayNumber) displayName = "[集成战略]" + displayName;
    body.push([
      charData.displayNumber,
      `<a href="#!/${char}">${displayName}</a>`,
      ProfessionNames[charData.profession],
      AKDATA.checkEnum("rarity", charData.rarity) + 1,
      AKDATA.formatString(charData.itemUsage, true) + AKDATA.formatString(charData.itemDesc, true),
      AKDATA.formatString(charData.description, true),
    ]);
  }

  let list = pmBase.component.create({
    type: 'list',
    columns: ['编号', '干员', '职业', '星级', {
      header: '说明',
      width: '40%'
    }, {
      header: '特性',
      width: '30%'
    }],
    list: body,
    sortable: true,
    card: true,
  });

  pmBase.content.build({
    pages: [{
      content: list,
    }, {
      selector: selector,
      content: show,
    }]
  });
}

function parseMinMax(min, max) {
  if (min == 0 && max == 0) {
    return '0';
  } else if (min == max) {
    return min;
  } else {
    return min + ' - ' + max;
  }
}

function createPhaseTable(charData) {
  let phaseCount = charData.phases.length;
  let phaseTableHelper = [
    ['生命上限', (n, m) => parseMinMax(n.maxHp, m.maxHp)],
    ['攻击', (n, m) => parseMinMax(n.atk, m.atk)],
    ['防御', (n, m) => parseMinMax(n.def, m.def)],
    ['法术抗性', (n, m) => parseMinMax(n.magicResistance, m.magicResistance) + '%'],
    ['再部署', (n, m) => parseMinMax(n.respawnTime, m.respawnTime) + '秒'],
    ['部署费用', (n, m) => parseMinMax(n.cost, m.cost)],
    ['阻挡数', (n, m) => parseMinMax(n.blockCnt, m.blockCnt)],
    ['基础攻击间隔', (n, m) => parseMinMax(n.baseAttackTime, m.baseAttackTime) + '秒'],
  ];
  let phaseTableList = phaseTableHelper.map(x => [
    x[0],
    x[1](charData.phases[0].attributesKeyFrames[0].data, charData.phases[0].attributesKeyFrames[1].data),
    charData.phases[1] ? x[1](charData.phases[1].attributesKeyFrames[0].data, charData.phases[1].attributesKeyFrames[1].data) : '',
    charData.phases[2] ? x[1](charData.phases[2].attributesKeyFrames[0].data, charData.phases[2].attributesKeyFrames[1].data) : '',
    (charData.favorKeyFrames && charData.profession != "TOKEN") ? x[1](charData.favorKeyFrames[0].data, charData.favorKeyFrames[1].data) : '',
  ]);

  let rangeRow = [];
  for (let i = 0; i < phaseCount; i++) {
    rangeRow[i] = charData.phases[i].rangeId ? createRangeTable(charData.phases[i].rangeId) : '';
  }
  phaseTableList.push(['攻击范围', ...rangeRow, '']);

  return pmBase.component.create({
    type: 'info',
    card: true,
    header: [
      '',
      `LV.1-${charData.phases[0].maxLevel}`,
      phaseCount >= 2 ? `精英1 LV.1-${charData.phases[1].maxLevel}` : '-',
      phaseCount >= 3 ? `精英2 LV.1-${charData.phases[2].maxLevel}` : '-',
      '信赖'
    ],
    list: phaseTableList,
  });
}

function show(hash) {
  var charId = hash.value;
  var charData = AKDATA.Data.character_table[charId];

  console.log(charData);
  let dataInfo = [
    ['特性', AKDATA.formatString(charData.description)],
    ['编号', charData.displayNumber],
    ['位置', charData.position],
    ['星级', '<i class="fas fa-star"></i>'.repeat(AKDATA.checkEnum("rarity", charData.rarity)+1)],
    ['职业', ProfessionNames[charData.profession]],
    ['标签', charData.tagList],
  ];
  let dataHtml = pmBase.component.create({
    type: 'info',
    list: dataInfo,
    card: true,
    title: charData.name,
    ignoreNull: true,
    image: `<img class='img_char' src='https://akdata-site.oss-cn-guangzhou.aliyuncs.com/assets/images/char/${charId}.png' />`,
    imageCol: 3
  });
  
  let phaseTable = createPhaseTable(charData);
  //////////////////////////////////////////
  let skillHtml = '';
  let variableRegex = /{(\-)*(.+?)(?:\:(.+?))?}/g;
  for (let i = 0; i < charData.skills.length; i++) {
    let skillInfo = charData.skills[i];
    let skillId = skillInfo.skillId;
    let skillData = AKDATA.Data.skill_table[skillId];
    console.log(skillData.levels[0]);
    let spType = [
      '',
      '<span class="o-badge" style="font-size:xx-small;width:60px;color:white;background-color:#F2763F;">自动回复</span>',
      '<span class="o-badge" style="font-size:xx-small;width:60px;color:white;background-color:#88BA20;">攻击回复</span>',
      '', 
      '<span class="o-badge" style="font-size:xx-small;width:60px;color:white;background-color:#FFB400;">受击回复</span>',
      '', '', '',
      '<span class="o-badge" style="font-size:xx-small;width:60px;color:white;background-color:#6F6F6F;">被动</span>',
    ][AKDATA.checkEnum('spType', skillData.levels[0].spData.spType)];
    let skillType = [
      '',
      '<span class="o-badge" style="font-size:xx-small;width:60px;color:white;background-color:#6F6F6F;">手动触发</span>',
      '<span class="o-badge" style="font-size:xx-small;width:60px;color:white;background-color:#6F6F6F;">自动触发</span>',
    ][AKDATA.checkEnum('skillType', skillData.levels[0].skillType)];
    skillHtml += pmBase.component.create({
      type: 'list',
      card: true,
      title: ['初始：', '精英1：', '精英2：'][i] + skillData.levels[0].name + `<div class="float-right">${spType}${skillType}</div>`,

      columns: [{
          header: '等级',
          width: '10%'
        },
        {
          header: '说明'
        },
        {
          header: '需要技力',
          width: '10%'
        },
        {
          header: '初始技力',
          width: '10%'
        },
        {
          header: '持续时间',
          width: '10%'
        },
        {
          header: '其他参数',
          width: '20%'
        },
      ],

      list: skillData.levels.map((levelData, l) => {
        let spData = levelData.spData;
        let blackboard = Object.fromEntries(levelData.blackboard.map(x => [x.key.toLowerCase(), x.value]));
        let desc = AKDATA.formatString(levelData.description, true, blackboard, true);

        if ( levelData.rangeId && (l == 0 || levelData.rangeId != skillData.levels[l-1].rangeId ) ) desc += '<hr>' + createRangeTable(levelData.rangeId);
        let bbtext = `<ul class="small text-left mb-0 muted">${Object.entries(blackboard).map(k=>`<li>${k[0]}: ${k[1]}</li>`).join('')}</ul>`;

        return [
          l + 1,
          desc,
          spData.spCost,
          spData.initSp,
          levelData.duration > 0 ? `${levelData.duration}秒` : '-',
          bbtext,
        ];
      })
    });
  }
  ///////////////////////////////////////////////
  let skillLvlupHtml = '';
  if (charData.phases.length > 1 && charData.phases[0].evolveCost) {
    skillLvlupHtml += pmBase.component.create({
      type: 'list',
      card: true,
      title: '精英化',
      header: ['阶段', '素材', '-'],
      list: [1,2].filter(x=>charData.phases[x]).map((x) => [
        `${x - 1} <i class="fas fa-angle-right"></i> ${x}`,
        charData.phases[x].evolveCost.map(y => AKDATA.getItemBadge(y.type, y.id, y.count))
      ]),
    });
  }

  if (charData.allSkillLvlup.length > 0 && charData.allSkillLvlup[0].lvlUpCost) {
    skillLvlupHtml += pmBase.component.create({
      type: 'list',
      card: true,
      title: '通用技能',
      header: ['等级', '素材', '-'],
      list: charData.allSkillLvlup.map((x, i) => [
        `${i + 1} <i class="fas fa-angle-right"></i> ${i+2}`,
        x.lvlUpCost.map(y => AKDATA.getItemBadge(y.type, y.id, y.count))
      ]),
    });
    if (charData.skills[0].levelUpCostCond.length > 0) {
      charData.skills.forEach((skillInfo, i) => {
        let skillName = AKDATA.Data.skill_table[skillInfo.skillId].levels[0].name;
        skillLvlupHtml += pmBase.component.create({
          type: 'list',
          card: true,
          title: `技能${i+1}：${skillName}`,
          header: ['等级', '素材', '升级时间'],
          list: skillInfo.levelUpCostCond.map((x, i) => [
            `${i + 7} <i class="fas fa-angle-right"></i> ${i+8}`,
            x.levelUpCost.map(y => AKDATA.getItemBadge(y.type, y.id, y.count)),
            x.lvlUpTime / 60 / 60 + ':00'
          ]),
        });
      });
    }
  }


  /////////////////////////////////////////////
  let potentialHtml = '';

  potentialHtml += pmBase.component.create({
    type: 'list',
    card: true,
    title: '潜能',
    header: ['等级', '效果'],
    list: charData.potentialRanks.map((x, i) => [
      i + 2,
      x.description,
    ]),
  });

  /////////////////////////////////////////////
  let talentHtml = '';
  if (charData.talents) {
  charData.talents.forEach((talentInfo, i) => {
    let talentName = talentInfo.candidates[0].name;
    talentHtml += pmBase.component.create({
      type: 'list',
      card: true,
      title: `天赋${i+1}：${talentInfo.candidates[0].name}`,
      columns: [{
          header: '解锁条件',
          span: 3,
          width: '20%'
        },
        '说明'
      ],
      list: talentInfo.candidates.map((x, i) => {
        let desc = AKDATA.formatString(x.description);
        if ( x.rangeId && (i == 0 || x.rangeId != talentInfo.candidates[i-1].rangeId ) ) desc += '<hr>' + createRangeTable(x.rangeId);
        return [
          x.unlockCondition.phase ? `精英${AKDATA.checkEnum('phase', x.unlockCondition.phase)}` : '',
          `Lv.${x.unlockCondition.level}`,
          x.requiredPotentialRank ? `潜能${x.requiredPotentialRank+1}` : '',
          desc,
        ];
      }),
    });
  });
    
}

  ////////////////////////////////////////////////
  let tokenHtml = '';
  let tokenKeys = [];
  if (charData.tokenKey) {
    tokenKeys.push(charData.tokenKey);
  }
  charData.skills.forEach((skillInfo, i) => {
    if ( skillInfo.overrideTokenKey && !tokenKeys.includes(skillInfo.overrideTokenKey) ) {
      tokenKeys.push(skillInfo.overrideTokenKey);
    }
  });
  tokenKeys.forEach((key, i) => {
    tokenHtml += createPhaseTable(AKDATA.Data.character_table[key]);
  });



  ////////////////////////////////////////////////

  let html = `
    <h2>属性</h2>
    ${dataHtml}
    <h2>精英化</h2>
    ${phaseTable}
    ${tokenHtml ? '<h2>召唤物</h2>' + tokenHtml : ''}
    ${skillHtml ? '<h2>技能</h2>' + skillHtml : ''}
    <h2>天赋</h2>
    ${talentHtml}
    <h2>潜能</h2>
    ${potentialHtml}
    ${skillLvlupHtml ? '<h2>强化</h2>' + skillLvlupHtml : ''}
  `;

  return {
    content: html,
    title: charData.name
  };
}

function createRangeTable(rangeId) {
  let grids = AKDATA.Data.range_table[rangeId].grids;
  let xs = grids.map(x => x.row);
  let ys = grids.map(x => x.col);
  let xm = Math.abs(Math.max(...xs));
  let xn = Math.abs(Math.min(...xs));
  let ym = Math.abs(Math.max(...ys));
  let yn = Math.abs(Math.min(...ys));
  let rowCount = xm + xn + 1;
  let colCount = ym + yn + 1;
  let table = Array.from(Array(colCount), () => Array(rowCount).fill('null'));
  let xo = xn;
  let yo = yn;
  grids.forEach(item => {
    table[yo + item.col][xo + item.row] = 'true';
  });
  table[yo][xo] = 'origin';

  let html = '<table class="p-range"><tbody>';
  for (let r = rowCount - 1; r >= 0; r--) {
    html += '<tr>';
    for (let c = 0; c < colCount; c++) {
      html += `<td class="p-range__cell p-range__cell--${table[c][r]}"></td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  return html;
}

pmBase.hook.on('init', init);
