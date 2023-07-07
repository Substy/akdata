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
    'excel/uniequip_table.json',
    'excel/battle_equip_table.json',
    'excel/gamedata_const.json',
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    '../customdata/dps_anim.json',
    '../resources/attributes.js'
  ], load);
}

function getSubName(sid) {
  return AKDATA.Data.uniequip_table["subProfDict"][sid].subProfessionName;
}

function getEquipName(eid) {
  if (eid) {
    console.log(eid);
    const ename = AKDATA.Data.uniequip_table["equipDict"][eid].uniEquipName;
    return `<a href="/akdata/equip/#${eid}" target="_blank">${ename}</a>`;
  } else return "-";
}

function getJobName(char) {
  return "<span style='font-weight: 600'>" + ProfessionNames[char.profession] + "</span><br>" + getSubName(char.subProfessionId);
}

function load() {

  let rankingList = [];
  let costList = [];
  let hpsList = [];
  AKDATA.patchAllChars();

  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;
    try {
      let perfectAttr = AKDATA.attributes.getCharAttributes({charId});
      let displayName = charData.name;
      let defaultChar = AKDATA.attributes.checkChar({charId});

      if (!charData.displayNumber) displayName = "[集成战略]" + displayName;
      rankingList.push([
        `<a href="../character/#!/${charId}" target="_blank">${displayName}</a>`,
        getJobName(charData),
        charData.rarity + 1,
        defaultChar.potentialRank + 1,
        getEquipName(defaultChar.equipId),
        Math.floor(perfectAttr.respawnTime),
        perfectAttr.cost,
        perfectAttr.blockCnt,
        (perfectAttr.baseAttackTime / perfectAttr.attackSpeed * 100).toPrecision(2),
        Math.floor(perfectAttr.maxHp),
        Math.floor(perfectAttr.atk),
        Math.floor(perfectAttr.def),
        perfectAttr.magicResistance + '%',
      ]);
  

      charData.skills.forEach(skill=>{
        let skillData = AKDATA.Data.skill_table[skill.skillId];

        [10].forEach( skillLevel => {
          if ( skillData.levels.length < skillLevel ) return;
          let levelData = skillData.levels[skillLevel-1];
          if ( !levelData.description.includes("费用") ) return;
          if ( !['pioneer', 'bearer', 'tactician'].includes(charData.subProfessionId)) return;
          let bb = {};
          levelData.blackboard.forEach(kv => bb[kv.key] = kv.value);
          let desc = AKDATA.formatString(levelData.description, true, bb);
          let cost = bb.value || bb.cost || 0;
          if( skill.skillId == "skchr_blackd_2") {
            cost = bb["blackd_s_2[once].cost"] + bb["blackd_s_2[period].cost"] * bb["blackd_s_2[period].trig_cnt"];
          }
          let count = 0;
          let totalTime = 100;
          totalTime -= levelData.spData.spCost - levelData.spData.initSp + levelData.duration;
          count ++;
          if (totalTime >= levelData.spData.spCost) {
            totalTime -= levelData.spData.spCost;
            count ++;
          }
          if (totalTime > 0) {
            count += Math.floor( totalTime / (levelData.spData.spCost + levelData.duration) );
          }

          let reqCost = 60;
          let reqTime = 0;
          reqCost += Math.ceil(perfectAttr.cost / 2);
          reqTime += levelData.spData.spCost - levelData.spData.initSp + levelData.duration;
          reqCost -= cost;
          reqTime += levelData.spData.spCost;
          reqCost -= cost;
          reqTime += Math.ceil( reqCost / cost ) * ( levelData.spData.spCost + levelData.duration );

          costList.push([
            `<a href="../character/#!/${charId}" target="_blank">${displayName}</a>`,
            charData.rarity + 1,
            levelData.name,
            skillLevel,
            desc,
            cost,
            (levelData.spData.spCost + levelData.duration) + 's',
            cost * count,
            reqTime + 's',
          ]);
        });


        if(true) {
          let skillLevel = skillData.levels.length;
          let char = {
            charId,
            skillId: skill.skillId,
            skillLevel: skillLevel-1,
            options: { cond: true, buff: true, crit: false, equip: true },
          };
          if (AKDATA.Data.dps_options.char[charId].includes("crit"))
            char.options.crit = true;
            
          let dps = AKDATA.attributes.calculateDps(char);
          if ( !dps ) return;
          if ( dps.skill.hps == 0 || !dps.skill.hps ) return;
          console.log(charData.name);
          let levelData = skillData.levels[skillLevel-1];
          let bb = {};
          levelData.blackboard.forEach(kv => bb[kv.key] = kv.value);
          let desc = AKDATA.formatString(levelData.description, true, bb);
          let hps = 0;
          let duration = 0;
          let underline = false;
          if(dps.skill.isInstant)
          {
            duration = dps.normal.dur.duration + dps.skill.dur.duration;
            hps = dps.skill.hps;
            underline = true;
          }
          else
          {
            duration = dps.skill.dur.duration;
            hps = dps.skill.hps;
          }
          let dur_text = `${Math.round(duration*100)/100}`;
          if (underline) dur_text = "<u>" + dur_text + "</u>";


          hpsList.push([
            `<a href="../character/#!/${charId}" target="_blank">${displayName}</a>`,
            charData.rarity + 1,
            levelData.name,
            skillLevel,
            getEquipName(defaultChar.equipId),
            desc,
            hps.toFixed(2),
            dur_text,
            bb.heal_scale || "-",
          ]);
        }

    });
  } catch (e) {
    console.log("error: ", charId, e);
  }
}


  let item = pmBase.component.create({
    type: 'list',

    header: ['干员', '职业', '星级', '潜能', '模组', '再部署', '部署费用', '阻挡数', '攻击速度', '生命上限', '攻击', '防御', '法术抗性'],

    list: rankingList,

    sortable: true,
    card: true,
  });

  let item2 = pmBase.component.create({
    type: 'list',

    columns: ['干员', '职业', '伤害', '技能攻击', '技能攻速', '技能', {header:'模组',width:'10%'}, {header:'说明',width:'25%'}, '普攻DPS', '技能DPS<br>理想情况', '平均DPS', '技能总伤害', "技能持续"],
    "class":  "dps-result",
    list: [],

    sortable: true,
    card: true,
  });

  item2 =`
  <div class="card mb-2">
    <div class="card-header" data-toggle="collapse" data-target="#collapse">
      <div class="card-title mb-0">设置</div>
    </div>
    <table class="table dps collapse" id="collapse" style="table-layout:fixed;">
      <tbody>
        <tr>
          <th>敌人防御力</th>
          <th>敌人法术抗性</th>
          <th>敌人数量</th>
        </tr>
        <tr>
        <td><input type="text" class="dps__enemy-def" value="0"></td>
        <td><input type="text" class="dps__enemy-mr" value="0"></td>
        <td><input type="text" class="dps__enemy-count" value="1"></td>
        </tr>
      </tbody>
    </table>
  </div>${item2}
  <!--
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
-->
`;

let item3 = pmBase.component.create({
  type: 'list',

  columns: ['干员', '星级', '技能', '技能等级',  {header:'说明',width:'25%'}, '技能费用回复', '技能周期', '100秒费用回复', '60费用需要时间'],
  "class":  "cost-result",
  list: costList,

  sortable: true,
  card: true,
});

let item4 = pmBase.component.create({
  type: 'list',

  columns: ['干员', '星级', '技能', '技能等级', '模组', {header:'说明',width:'30%'}, 'HPS', "技能持续", "heal_scale"],
  "class":  "hps-result",
  list: hpsList,

  sortable: true,
  card: true,
});

  let tabs = pmBase.component.create({
    type: 'tabs',

    tabs: [{
      text: '满配基础属性',
      content: item,
    },{
      text: 'DPS',
      content: item2,
    },{
      text: 'HPS',
      content: item4,
    },{
      text: '费用回复',
      content: item3,
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
    let displayName = charData.name;
    if (!charData.displayNumber) displayName = "[集成战略]" + displayName;

    charData.skills.forEach(skill=>{
      let char = {
        charId,
        skillId: skill.skillId,
        skillLevel: -1,
        options: { cond: true, buff: true, crit: true, equip: true },
      };
      let defaultChar = AKDATA.attributes.checkChar(char);
      let dps = null;
      try {
        dps = AKDATA.attributes.calculateDps(char, enemy);
      } catch {
        console.log("error dps:", char);
      }
      if ( dps && dps.skill.dps != Infinity && dps.normal.dps != dps.skill.dps) {
        let skillData = AKDATA.Data.skill_table[skill.skillId];
        let levelData = skillData.levels[skillData.levels.length-1];
        let bb = {};
        levelData.blackboard.forEach(kv => bb[kv.key] = kv.value);
        let desc = AKDATA.formatString(levelData.description, true, bb);

        let dur_text = `${dps.skill.dur.duration.toFixed(2)}s`;
        // 标记瞬发，永续和时间轴模拟类技能
        if (dps.skill.dur.duration < 5 || dps.skill.dur.duration > 999 || dps.skill.dur.tags.includes("sim")) {
          dur_text = "<u>" + dur_text + "</u>";
        }
        html += '<tr><td>' + [
          `<a href="../character/#!/${charId}" target="_blank">${displayName}</a>`,
          getJobName(charData),
          (charData.description.includes('法术伤害') || levelData.description.includes('伤害类型变为<@ba.vup>法术</>') ) ? '法术' : '物理',
          Math.round(dps.skill.atk),
          dps.skill.attackTime.toFixed(3),
          levelData.name,
          getEquipName(defaultChar.equipId),
          desc,
          Math.round(dps.normal.dps),
          //Math.round(dps.skill.isInstant ? dps.globalDps : dps.skill.dps),
          Math.round(dps.skill.dps),
          `<a href="../dps/#${charId}" target="_blank">${Math.round(dps.globalDps)}</a>`,
          Math.round(dps.skill.totalDamage),
          dur_text
        ].join('</td><td>') + '</td></tr>';
      }
    });
  } // for
  $('.dps-result tbody').html(html).trigger("updateAll", [ true ]);

}

pmBase.hook.on('init', init);
