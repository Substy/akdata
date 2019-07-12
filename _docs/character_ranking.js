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
    'excel/skill_table.json',
    '../resources/attributes.js'
  ], load);
}

function load() {

  let rankingList = [];
  let charFinalData = [];

  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;
    let perfectAttr = AKDATA.attributes.getCharAttributes({charId});
    rankingList.push([
      `<a href="../character/#!/${charId}">${charData.name}</a>`,
      ProfessionNames[charData.profession],
      charData.rarity + 1,
      Math.floor(perfectAttr.respawnTime),
      perfectAttr.cost,
      perfectAttr.blockCnt,
      (perfectAttr.baseAttackTime / perfectAttr.attackSpeed * 100).toPrecision(2),
      Math.floor(perfectAttr.maxHp),
      Math.floor(perfectAttr.atk),
      Math.floor(perfectAttr.def),
      perfectAttr.magicResistance + '%',
    ]);
/*
    charData.skills.forEach(skill=>{
      if ( charData.profession == 'MEDIC' ) return;
      let dps = AKDATA.attributes.calculateDps(charId, skill.skillId);

      if (!dps) return;
      if (dps.normalDps == dps.skillDps) return;

      let skillData = AKDATA.Data.skill_table[skill.skillId];
      let levelData = skillData.levels[skillData.levels.length-1];
      let bb = {};
      levelData.blackboard.forEach(kv => bb[kv.key] = kv.value);
      let desc = AKDATA.formatString(levelData.description, true, bb);

      charFinalData.push( [
        `<a href="../character/#!/${charId}">${charData.name}</a>`,
        ProfessionNames[charData.profession],
        (charData.description.includes('法术伤害') || levelData.description.includes('伤害类型变为<@ba.vup>法术</>') ) ? '法术' : '物理',
        //Math.round(perfectAttr.atk),
        //Math.round(perfectAttr.attackSpeed*100)/100 + '%',
        //Math.round(perfectAttr.baseAttackTime*100)/100,
        Math.round(dps.skillAtk),
        Math.round(dps.skillAttackTime*100)/100,
        levelData.name,// + '<br>' + levelData.prefabId,
        desc,// + `<ul class="small text-left mb-0 muted">${Object.entries(bb).map(k=>`<li>${k[0]}: ${k[1]}</li>`).join('')}</ul>`,
        Math.round(dps.normalDps),
        Math.round(dps.skillDps),
        Math.round(dps.globalDps),
      ]);
    });
*/
  }

  let item = pmBase.component.create({
    type: 'list',

    header: ['干员', '职业', '星级', '再部署', '部署费用', '阻挡数', '攻击速度', '生命上限', '攻击', '防御', '法术抗性'],


    list: rankingList,

    sortable: true,
    card: true,
  });

  let item2 = pmBase.component.create({
    type: 'list',

    columns: ['干员', '职业', '伤害', 'S_ATK', 'S_BAT', '技能', {header:'说明',width:'40%'}, '攻击DPS', '技能DPS', '平均DPS'],
    "class":  "dps-result",
    list: charFinalData,

    sortable: true,
    card: true,
  });

  item2 +=`
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">敌人</div>
    </div>
    <table class="table dps" style="table-layout:fixed;">
      <tbody>
        <tr>
          <th>防御力</th>
          <th>法术抗性</th>
          <th>数量</th>
        </tr>
        <tr>
        <td><input type="text" class="dps__enemy-def" value="0"></td>
        <td><input type="text" class="dps__enemy-mr" value="0"></td>
        <td><input type="text" class="dps__enemy-count" value="1"></td>
        </tr>
      </tbody>
    </table>
  </div>
<div class="alert alert-primary small">
  <ul class="m-0">
    <li>这个表格仅收录干员的攻击技能，干员属性取自第一页的极限值。</li>
    <li>这个表格不考虑敌人的防御力，实际战斗中根据敌人防御的不同，攻击力越低的干员与表中的出入越大。</li>
    <li>“强力击”类的技能以充能+攻击为一个周期计算技能DPS。</li>
    <li>平均DPS由充能时间+技能持续时间+硬直时间为一个周期计算，暂不考虑初始技力因素。</li>
    <li>艾雅法拉的“二重咏唱”、塞雷娅的“莱茵充能护服”等根据条件增长的技能或天赋，取最大值计算。</li>
    <li>阿米娅的“奇美拉”、斯卡蒂的“跃浪击”等限定发动条件技能，不计算平均DPS。</li>
  </ul>
</div>
`;

  let tabs = pmBase.component.create({
    type: 'tabs',

    tabs: [{
      text: '极限属性',
      content: item,
    },{
      text: '单体DPS',
      content: item2,
    }],
  });

  pmBase.content.build({
    pages: [{
      content: tabs,
    }]
  });

  calculate();
  $('.dps__enemy-def, .dps__enemy-mr, .dps__enemy-count').change(calculate);
}

function calculate() {
  let enemy = {
    def: ~~$('.dps__enemy-def').val(),
    magicResistance: ~~$('.dps__enemy-mr').val(),
    count: ~~$('.dps__enemy-count').val(),
  };

  let html = '';
  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP" || charData.profession == "MEDIC") continue;

    charData.skills.forEach(skill=>{
      let char = {
        charId,
        skillId: skill.skillId,
        skillLevel: -1,
      };
      let dps = AKDATA.attributes.calculateDps(char, enemy);
      if ( !dps ) return;
      if (dps.normalDps == dps.skillDps) return;

      let skillData = AKDATA.Data.skill_table[skill.skillId];
      let levelData = skillData.levels[skillData.levels.length-1];
      let bb = {};
      levelData.blackboard.forEach(kv => bb[kv.key] = kv.value);
      let desc = AKDATA.formatString(levelData.description, true, bb);

      if ( dps.instant ) dps.skillDps = dps.globalDps;

      html += '<tr><td>' + [
        `<a href="../character/#!/${charId}">${charData.name}</a>`,
        ProfessionNames[charData.profession],
        (charData.description.includes('法术伤害') || levelData.description.includes('伤害类型变为<@ba.vup>法术</>') ) ? '法术' : '物理',
        Math.round(dps.skillAtk),
        Math.round(dps.skillAttackTime*100)/100,
        levelData.name,
        desc,
        Math.round(dps.normalDps),
        Math.round(dps.skillDps),
        Math.round(dps.globalDps),
      ].join('</td><td>') + '</td></tr>';
    });
  }
  $('.dps-result tbody').html(html).trigger("updateAll", [ true ]);

}

pmBase.hook.on('init', init);