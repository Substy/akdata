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

const charColumnCount = 4;
const Characters = new Array(charColumnCount);

function getElement(classPart, index) {
  return $(`.dps__${classPart}[data-index="${index}"]`);
}

function load() {
  let selectOptions = '';
  let charFinalData = [];

  let toCopy = '';

  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;

    selectOptions += `<option value="${charId}">${charData.name}</option>`;
    /*
    charData.talents.forEach(talentData => {
      let obj = talentData.candidates.last();
      obj.blackboard = getBlackboard(obj.blackboard);
      obj.prefabKey = charId + '_' + obj.prefabKey;
      delete obj.rangeId;
      delete obj.requiredPotentialRank;
      delete obj.unlockCondition;
      toCopy += `else if ( prefabKey == "${obj.prefabKey}") { } // ${obj.name}, ${obj.description}, ${JSON.stringify(obj.blackboard)}\n`;
      console.log(obj);
    });
    */
  }

  if (toCopy) window.toCopy = toCopy;
  // copy(toCopy);

  let html = `
<table class="table dps" style="table-layout:fixed;">
<tbody>
<tr class="dps__row-select" style="width:20%;"> <th>干员</th> </tr>
<tr class="dps__row-level"> <th>等级</th> </tr>
</tbody>
<tbody>
<tr class="dps__row-atk"> <th>攻击力</th> </tr>
<tr class="dps__row-attackSpeed"> <th>攻击速度</th> </tr>
<tr class="dps__row-baseAttackTime"> <th>基础攻击间隔</th> </tr>
<tr class="dps__row-dps"> <th>DPS</th> </tr>
</tbody>
<tbody>
<tr class="dps__row-skill"> <th>技能</th> </tr>
<tr class="dps__row-s_damage"> <th>技能伤害总量</th> </tr>
<tr class="dps__row-s_dps"> <th>技能DPS</th> </tr>
<tr class="dps__row-g_dps"> <th>周期DPS</th> </tr>
</tbody>
</table>
<!--
<tr class="dps__row-phase"> <th>精英化</th> </tr>
<tr class="dps__row-s_atk"> <th>技能攻击力</th> </tr>
<tr class="dps__row-s_attackSpeed"> <th>技能攻击速度</th> </tr>
<tr class="dps__row-s_baseAttackTime"> <th>技能基础攻击间隔</th> </tr>
-->
  `;
  let $dps = $(html);

  for (let i = 0; i < charColumnCount; i++) {
    $dps.find('.dps__row-select').append(`<td><select class="form-control dps__char" data-index="${i}">${selectOptions}</select></td>`);
    //$dps.find('.dps__row-phase').append(`<td><select class="form-control dps__phase" data-index="${i}"></select></td>`);
    //$dps.find('.dps__row-level').append(`<td><select class="form-control dps__level" data-index="${i}"></select></td>`);
    $dps.find('.dps__row-level').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control col-7 dps__phase" data-index="${i}"></select><select class="form-control col-5 dps__level" data-index="${i}"></select></div></div></td>`);
    $dps.find('.dps__row-atk').append(`<td><div class="dps__atk" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-attackSpeed').append(`<td><div class="dps__attackSpeed" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-baseAttackTime').append(`<td><div class="dps__baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-dps').append(`<td><div class="dps__dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-skill').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control col-7 dps__skill" data-index="${i}"></select><select class="form-control col-5 dps__skilllevel" data-index="${i}"></select></div></div></td>`);
    $dps.find('.dps__row-s_atk').append(`<td><div class="dps__s_atk" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_attackSpeed').append(`<td><div class="dps__s_attackSpeed" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_baseAttackTime').append(`<td><div class="dps__s_baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_damage').append(`<td><div class="dps__s_damage" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_dps').append(`<td><div class="dps__s_dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-g_dps').append(`<td><div class="dps__g_dps" data-index="${i}"></div></td>`);
  }

  pmBase.content.build({
    pages: [{
      content: $dps,
    }]
  });

  $('.dps__char').change(chooseChar);
  $('.dps__phase').change(choosePhase);
  $('.dps__level').change(chooseLevel);
  $('.dps__skill').change(chooseSkill);
  $('.dps__skilllevel').change(changeThis);
}

function changeThis() {
  let $this = $(this);
  let index = ~~$this.data('index');
  calculate(index);
}

function setSelectValue(name, index, value) {
  let $e = getElement(name, index);
  //if (index > 0) {
  //  let $prev = getElement(name, index - 1);
  //  value = Math.min( $e[0].length, $prev.val() );
  //}
  $e.val(value);
}

function chooseChar() {
  let $this = $(this);
  let i = ~~$this.data('index');
  let charId = $this.val();
  Characters[i] = {
    charId,
  };
  let charData = AKDATA.Data.character_table[charId];
  let phaseCount = charData.phases.length;
  let html = [...Array(phaseCount).keys()].map(x => `<option value="${x}">精英${x}</option>`).join('');
  let $phase = getElement('phase', i);
  $phase.html(html);
  setSelectValue('phase', i, phaseCount - 1);

  let skillHtml = '', skillLevelHtml = '', skillData;
  charData.skills.forEach((skill,skillIndex) => {
    if (phaseCount - 1 >= skill.unlockCond.phase) {
      skillData = AKDATA.Data.skill_table[skill.skillId];
      skillHtml += `<option value="${skill.skillId}">${skillData.levels[0].name}</option>`;
    }
  });
  for(let j=0;j< skillData.levels.length; j++){
    skillLevelHtml += `<option value="${j}">${j+1}</option>`;
  }
  let $skillLevel = getElement('skilllevel', i);
  $skillLevel.html(skillLevelHtml);
  setSelectValue('skilllevel', i, skillData.levels.length - 1);
  let $skill = getElement('skill', i);
  $skill.html(skillHtml);
  $skill.val(charData.skills.last().skillId);

  $phase.change();
}

function choosePhase() {
  let $this = $(this);
  let i = ~~$this.data('index');
  let charId = Characters[i].charId;
  let charData = AKDATA.Data.character_table[charId];
  let phase = ~~$this.val();
  let maxLevel = charData.phases[phase].maxLevel;
  let html = [...Array(maxLevel).keys()].map(x => `<option value="${x+1}">${x+1}</option>`).join('');
  let $level = getElement('level', i);
  $level.html(html);
  setSelectValue('level', i, maxLevel);
  Characters[i].phase = phase;

  $level.change();
}

function chooseLevel() {
  let $this = $(this);
  let i = ~~$this.data('index');
  let phase = ~~getElement('phase', i).val();
  let level = ~~$this.val();
  let char = Characters[i];
  char.level = level;

  calculate(i);
}

function calculate(index) {
  let char = Characters[index];
  let charId = getElement('char', index).val();
  let phase = ~~getElement('phase', index).val();
  let level = ~~getElement('level', index).val();
  let skillId = getElement('skill', index).val();
  let skillLevel = ~~getElement('skilllevel', index).val();

  let dps = AKDATA.attributes.calculateDps(charId, skillId, phase, level, skillLevel);

  getElement('atk', index).html(dps.normalAtk);
  getElement('attackSpeed', index).html(dps.normalAttackSpeed);
  getElement('baseAttackTime', index).html(dps.normalAttackTime);

  getElement('dps', index).html(dps.normalDps);
  getElement('s_atk', index).html(dps.skillAtk);
  getElement('s_attackSpeed', index).html(dps.skillAttackSpeed);
  getElement('s_baseAttackTime', index).html(dps.skillAttackTime);
  getElement('s_damage', index).html(dps.skillDamage);
  getElement('s_dps', index).html(dps.skillDps);
  getElement('g_dps', index).html(dps.globalDps);
}


function chooseSkill() {
  let $this = $(this);
  let i = ~~$this.data('index');
  let skillId = $this.val();

  let char = Characters[i];
  char.skillId = skillId;
  console.log(char);
  calculate(i);
}



pmBase.hook.on('init', init);