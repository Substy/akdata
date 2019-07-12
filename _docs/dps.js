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
  selectOptions += `<option value="">-</option>`;

  /*
  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.profession == "TOKEN" || charData.profession == "TRAP") continue;
    if (charData.skills.length ==0 )continue;
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
  }
    */
  Object.keys(ProfessionNames).forEach(key => {
    selectOptions += `<optgroup label="${ProfessionNames[key]}">`;
    for (let charId in AKDATA.Data.character_table) {
      let charData = AKDATA.Data.character_table[charId];
      if (charData.profession != key) continue;
      if (charData.skills.length == 0) continue;

      selectOptions += `<option value="${charId}">${charData.name}</option>`;
    }
    selectOptions += `</optgroup">`;
  });



  if (toCopy) window.toCopy = toCopy;
  // copy(toCopy);

  let html = `
<div class="card mb-2">
  <div class="card-header">
    <div class="card-title mb-0">干员</div>
  </div>
  <table class="table dps" style="table-layout:fixed;">
  <tbody>
  <tr class="dps__row-select" style="width:20%;"> <th>干员</th> </tr>
  <tr class="dps__row-level"> <th>等级</th> </tr>
  <tr class="dps__row-potentialrank"> <th>潜能</th> </tr>
  <tr class="dps__row-favor"> <th>信赖</th> </tr>
  <tr class="dps__row-skill"> <th>技能</th> </tr>
  </tbody>
  <tbody>
  <tr class="dps__row-atk"> <th>普通/技能攻击力</th> </tr>
  <tr class="dps__row-attackSpeed"> <th>普通/技能攻击速度</th> </tr>
  <tr class="dps__row-baseAttackTime"> <th>普通/技能攻击间隔</th> </tr>
  </tbody>
  <tbody>
  <tr class="dps__row-dps"> <th>普通DPS</th> </tr>
  <tr class="dps__row-s_dps"> <th>技能DPS</th> </tr>
  <tr class="dps__row-g_dps"> <th>周期DPS</th> </tr>
  <tr class="dps__row-e_time"> <th>技能击杀时间</th> </tr>
  </tbody>
  </table>
</div>
<div class="card">
  <div class="card-header">
    <div class="card-title mb-0">敌人</div>
  </div>
  <table class="table dps" style="table-layout:fixed;">
    <tbody>
      <tr>
        <th>防御力</th>
        <th>法术抗性</th>
        <th>HP</th>
        <th>数量</th>
      </tr>
      <tr>
      <td><input type="text" class="dps__enemy-def" value="0"></td>
      <td><input type="text" class="dps__enemy-mr" value="0"></td>
      <td><input type="text" class="dps__enemy-hp" value="0"></td>
      <td><input type="text" class="dps__enemy-count" value="1" disabled></td>
      </tr>
    </tbody>
  </table>
</div>
<!--
  <tr class="dps__row-damage"> <th>普通/技能瞬时伤害</th> </tr>
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
    $dps.find('.dps__row-level').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control form-control-sm col-7 dps__phase" data-index="${i}"></select><select class="form-control form-control-sm col-5 dps__level" data-index="${i}"></select></div></div></td>`);
    $dps.find('.dps__row-atk').append(`<td><div class="dps__atk" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-damage').append(`<td><div class="dps__damage" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-attackSpeed').append(`<td><div class="dps__attackSpeed" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-baseAttackTime').append(`<td><div class="dps__baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-dps').append(`<td><div class="dps__dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-skill').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control form-control-sm col-7 dps__skill" data-index="${i}"></select><select class="form-control form-control-sm col-5 dps__skilllevel" data-index="${i}"></select></div></div></td>`);
    //$dps.find('.dps__row-s_atk').append(`<td><div class="dps__s_atk" data-index="${i}"></div></td>`);
    //$dps.find('.dps__row-s_attackSpeed').append(`<td><div class="dps__s_attackSpeed" data-index="${i}"></div></td>`);
    //$dps.find('.dps__row-s_baseAttackTime').append(`<td><div class="dps__s_baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_dps').append(`<td><div class="dps__s_dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-g_dps').append(`<td><div class="dps__g_dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-e_time').append(`<td><div class="dps__e_time" data-index="${i}"></div></td>`);

    $dps.find('.dps__row-potentialrank').append(`<td><select class="form-control form-control-sm dps__potentialrank" data-index="${i}">${[0,1,2,3,4,5].map(x=>`<option value="${x}">${x+1}</option>`).join('')}</select></td>`);
    $dps.find('.dps__row-favor').append(`<td><select class="form-control form-control-sm dps__favor" data-index="${i}">${Object.keys(new Array(101).fill(0)).map(x=>`<option value="${x*2}">${x*2}</option>`).join('')}</select></td>`);
  }

  pmBase.content.build({
    pages: [{
      content: $dps,
    }]
  });

  $('.dps__potentialrank').val(5);
  $('.dps__favor').val(200);

  $('.dps__char').change(chooseChar);
  $('.dps__phase').change(choosePhase);
  $('.dps__level').change(chooseLevel);
  $('.dps__skill, .dps__skilllevel, .dps__row-potentialrank, .dps__row-favor').change(chooseSkill);
  $('.dps__enemy-def, .dps__enemy-mr, .dps__enemy-count, .dps__enemy-hp').change(calculateAll);
}

function setSelectValue(name, index, value) {
  let $e = getElement(name, index);
  $e.val(value);
  //if ( $e.val() === null ) {
  //  let last = $e.find('option:last-child').val();
  //  $e.val( last );
  //}
  //if (index > 0) {
  //  let $prev = getElement(name, index - 1);
  //  value = Math.min( $e[0].length, $prev.val() );
  //}
}

function chooseChar() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let charId = $this.val();
  if (!charId) return;

  let charData = AKDATA.Data.character_table[charId];
  let phaseCount = charData.phases.length;
  let html = [...Array(phaseCount).keys()].map(x => `<option value="${x}">精英${x}</option>`).join('');
  let $phase = getElement('phase', index);
  $phase.html(html);
  setSelectValue('phase', index, phaseCount - 1);

  let skillHtml = '',
    skillLevelHtml = '',
    skillId, skillData;
  charData.skills.forEach((skill, skillIndex) => {
    if (phaseCount - 1 >= skill.unlockCond.phase) {
      skillId = skill.skillId;
      skillData = AKDATA.Data.skill_table[skill.skillId];
      skillHtml += `<option value="${skill.skillId}">${skillData.levels[0].name}</option>`;
    }
  });
  let $skill = getElement('skill', index);
  $skill.html(skillHtml);
  setSelectValue('skill', index, skillId);
  for (let j = 0; j < skillData.levels.length; j++) {
    skillLevelHtml += `<option value="${j}">${j+1}</option>`;
  }
  let $skillLevel = getElement('skilllevel', index);
  let skillLevel = skillData.levels.length - 1;
  $skillLevel.html(skillLevelHtml);
  setSelectValue('skilllevel', index, skillLevel);

  Characters[index] = {
    charId,
    skillId,
    skillLevel,
  };
  $phase.change();
}

function setCharValue(e, key) {
  let $e = $(e);
  let val = ~~$this.val();
  let index = ~~$e.data('index');
  Characters[index][key] = val;
}

function choosePhase() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let phase = ~~$this.val();

  let charId = Characters[index].charId;
  let charData = AKDATA.Data.character_table[charId];
  let maxLevel = charData.phases[phase].maxLevel;
  let html = [...Array(maxLevel).keys()].map(x => `<option value="${x+1}">${x+1}</option>`).join('');
  let $level = getElement('level', index);
  $level.html(html);
  setSelectValue('level', index, maxLevel);

  Characters[index].phase = phase;
  $level.change();
}

function chooseLevel() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let level = ~~$this.val();

  Characters[index].level = level;
  Characters[index].potentialRank = ~~(getElement('potentialrank', index).val());
  Characters[index].favor = ~~(getElement('favor', index).val());

  calculate(index);
}

function calculate(index) {
  let char = Characters[index];
  let enemy = {
    def: ~~$('.dps__enemy-def').val(),
    magicResistance: ~~$('.dps__enemy-mr').val(),
    count: ~~$('.dps__enemy-count').val(),
    hp: ~~$('.dps__enemy-hp').val(),
  };

  let dps = AKDATA.attributes.calculateDps(char, enemy);

  if ( dps.instant ) dps.skillDps = 0;

  getElement('atk', index).html(Math.round(dps.normalAtk) + ' / ' + Math.round(dps.skillAtk));
  getElement('attackSpeed', index).html(dps.normalAttackSpeed + '% / ' + Math.round(dps.skillAttackSpeed) + '%');
  getElement('baseAttackTime', index).html(dps.normalAttackTime + ' / ' + dps.skillAttackTime);
  //getElement('damage', index).html(Math.round(dps.normalAtk) + ' / ' + Math.round(dps.skillAtk));


  getElement('dps', index).html(dps.normalDps);
  getElement('s_damage', index).html(dps.skillDamage);
  getElement('s_dps', index).html(dps.skillDps || '-');
  getElement('g_dps', index).html(dps.globalDps);
  getElement('e_time', index).html(dps.killTime ?  `${dps.killTime}秒` : '-');
}

function calculateAll() {
  Characters.forEach((x, i) => calculate(i));
}

function chooseSkill() {
  let index = ~~$(this).data('index');
  Characters[index].skillId = getElement('skill', index).val();
  Characters[index].skillLevel = ~~(getElement('skilllevel', index).val());
  Characters[index].potentialRank = ~~(getElement('potentialrank', index).val());
  Characters[index].favor = ~~(getElement('favor', index).val());
  calculate(index);
}

pmBase.hook.on('init', init);