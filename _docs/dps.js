
const ProfessionNames = {
  "PIONEER": "先锋",
  "WARRIOR": "近卫",
  "SNIPER": "狙击",
  "TANK": "重装",
  "MEDIC": "医疗",
  "SUPPORT": "辅助",
  "CASTER": "术师",
  "SPECIAL": "特种",
//  "TOKEN": "召唤物",
//  "TRAP": "装置",
};

const currentVersion = "19-12-28-08-02-55-e463c0";

function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/skill_table.json',
    '../version.json',
    '../resources/attributes.js'
  ], load);
}

const charColumnCount = window.screen.width <= 1280 ? 2 : 4;
const Characters = new Array(charColumnCount);

function getElement(classPart, index) {
  return $(`.dps__${classPart}[data-index="${index}"]`);
}

function load() {
  let version = AKDATA.Data.version.perfare;
  if (version != currentVersion) {
    $('#update_prompt').text(`有新数据，请点击[清除缓存]更新`);
  } else {
    $('#update_prompt').text(`当前版本: ${version}`);
  }

  let selectOptions = '';
  let charFinalData = [];

  let toCopy = '';
  selectOptions += `<option value="">-</option>`;

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
    <tr class="dps__row-option"> <th>设置</th> </tr>
  </tbody>
  <tbody>
    <tr class="dps__row-period"> <th>技能周期 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" title="技力回复时间+技能持续时间[+眩晕时间]"></i></th> </tr>
    <tr class="dps__row-s_atk"> <th>技能攻击力 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" title="角色攻击力（计算技能加成）×单次攻击次数"></i></th> </tr>
    <tr class="dps__row-s_damage"> <th>技能伤害期望 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" title="单次攻击总伤害（计算防御力）×技能持续时间内攻击次数"></i></th> </tr>
    <tr class="dps__row-s_dps"> <th>技能</th> </tr>
    <tr class="dps__row-n_dps"> <th>普通攻击</th> </tr>
    <tr class="dps__row-g_dps"> <th>周期DPS</th> </tr>
  </tbody>
  <tbody class="">
  <tr class="dps__row-e_time"> <th>技能击杀时间 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" title="敌人HP/技能DPS（存在较大问题）"></i></th> </tr>
  <tr class="dps__row-results"> <th>计算过程(dev)</th> </tr>
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
      <td><input type="text" class="dps__enemy-count" value="1"></td>
      </tr>
    </tbody>
  </table>
</div>
<!--
  <tr class="dps__row-damage"> <th>普通/技能瞬时伤害</th> </tr>
<tr class="dps__row-s_atk"> <th>技能攻击力</th> </tr>
<tr class="dps__row-s_attackSpeed"> <th>技能攻击速度</th> </tr>
<tr class="dps__row-s_baseAttackTime"> <th>技能基础攻击间隔</th> </tr>
<tbody>
  <tr class="dps__row-atk"> <th>普通/技能攻击力 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" title="计算攻击次数与敌人防御力"></i></th> </tr>
  <tr class="dps__row-attackSpeed"> <th>普通/技能攻击速度</th> </tr>
  <tr class="dps__row-baseAttackTime"> <th>普通/技能攻击间隔</th> </tr>
  <tr class="dps__row-damage"> <th>技能伤害期望</th> </tr>
</tbody>
-->
  `;
  let $dps = $(html);

  for (let i = 0; i < charColumnCount; i++) {
    $dps.find('.dps__row-select').append(`<td>
    <div class="input-group">
      <select class="form-control dps__char" data-index="${i}">${selectOptions}</select>
      <div class="input-group-append">
        <button class="btn btn-outline-secondary dps__goto" data-index="${i}" type="button"><i class="fas fa-search"></i></button>
      </div>
    </div>
    </td>`);
    //$dps.find('.dps__row-phase').append(`<td><select class="form-control dps__phase" data-index="${i}"></select></td>`);
    //$dps.find('.dps__row-level').append(`<td><select class="form-control dps__level" data-index="${i}"></select></td>`);
    $dps.find('.dps__row-level').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control form-control-sm col-7 dps__phase" data-index="${i}"></select><select class="form-control form-control-sm col-5 dps__level" data-index="${i}"></select></div></div></td>`);
    $dps.find('.dps__row-atk').append(`<td><div class="dps__atk" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-attackSpeed').append(`<td><div class="dps__attackSpeed" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-baseAttackTime').append(`<td><div class="dps__baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-dps').append(`<td><div class="dps__dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-skill').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control form-control-sm col-7 dps__skill" data-index="${i}"></select><select class="form-control form-control-sm col-5 dps__skilllevel" data-index="${i}"></select></div></div></td>`);
    $dps.find('.dps__row-s_atk').append(`<td><div class="dps__s_atk" data-index="${i}"></div></td>`);
    //$dps.find('.dps__row-s_attackSpeed').append(`<td><div class="dps__s_attackSpeed" data-index="${i}"></div></td>`);
    //$dps.find('.dps__row-s_baseAttackTime').append(`<td><div class="dps__s_baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_dps').append(`<td><div class="dps__s_dps font-weight-bold" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-n_dps').append(`<td><div class="dps__n_dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-g_dps').append(`<td><div class="dps__g_dps font-weight-bold" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-e_time').append(`<td><div class="dps__e_time" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_damage').append(`<td><div class="dps__s_damage" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-period').append(`<td><div class="dps__period" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-results').append(`<td><a class="dps__results" data-index="${i}" href="#">[显示]</a></td>`);
    $dps.find('.dps__row-option').append(`<td>
    <div class="form-check">
    <label class="form-check-label">
    <input class="form-check-input dps__cond" type="checkbox" value="" data-index="${i}" checked>
      天赋增伤(远卫减伤)
    </label>
    </div>
    <div class="form-check">
    <label class="form-check-label">
    <input class="form-check-input dps__crit" type="checkbox" value="" data-index="${i}" checked>
      计算暴击
    </label>
    </div>
    <div class="form-check d-none">
    <label class="form-check-label">
    <input class="form-check-input dps__buff" type="checkbox" value="" data-index="${i}">
      Buff
    </label>
    </div>
    </td>`);

    $dps.find('.dps__row-potentialrank').append(`<td><select class="form-control form-control-sm dps__potentialrank" data-index="${i}">${[0,1,2,3,4,5].map(x=>`<option value="${x}">${x+1}</option>`).join('')}</select></td>`);
    $dps.find('.dps__row-favor').append(`<td><select class="form-control form-control-sm dps__favor" data-index="${i}">${Object.keys(new Array(51).fill(0)).map(x=>`<option value="${x*2}">${x*2}</option>`).join('')}</select></td>`);
  }

  pmBase.content.build({
    pages: [{
      content: $dps,
    }]
  });

  $('.dps__potentialrank').val(5);
  $('.dps__favor').val(100);

  $('.dps__char').change(chooseChar);
  $('.dps__phase').change(choosePhase);
  $('.dps__level').change(chooseLevel);
  $('.dps__skill, .dps__skilllevel, .dps__potentialrank, .dps__favor').change(chooseSkill);
  $('.dps__enemy-def, .dps__enemy-mr, .dps__enemy-count, .dps__enemy-hp, .dps__cond, .dps__crit, .dps__buff').change(calculateAll);
  $('.dps__results').click(showDetail);
  $('.dps__goto').click(goto);
}

function goto() {
  let $this = $(this);
  let index = ~~$this.data('index');
  if ( Characters[index].charId ) {
    window.open(`../character/#!/${Characters[index].charId}`, '_blank'); 
  }
}

function showDetail() {
  let $this = $(this);
  let index = ~~$this.data('index');
  pmBase.component.create({
    type: 'modal',
    id: Characters[index].charId,
    content: Characters[index].log.replace(/\n/g,'<br>').replace(/ /g,'&nbsp;'),
    title: Characters[index].charId,
    show: true,
  });
  return false;
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
  char.buff = getElement('buff', index).is(':checked');
  char.cond = getElement('cond', index).is(':checked');
  char.crit = getElement('crit', index).is(':checked');
  let dps = AKDATA.attributes.calculateDps(char, enemy);
/*
  if ( dps.isInstant ) dps.skillDps = 0;
  getElement('atk', index).html(Math.round(dps.normalAtk) + ' / ' + Math.round(dps.skillAtk));
  getElement('attackSpeed', index).html(dps.normalAttackSpeed + '% / ' + Math.round(dps.skillAttackSpeed) + '%');
  getElement('baseAttackTime', index).html(dps.normalAttackTime + ' / ' + dps.skillAttackTime);

  getElement('dps', index).html(dps.normalDps);
  getElement('damage', index).html(dps.skillAttackDamage + ' × ' + dps.skillAttackCount);
*/

  getElement('s_atk', index).html(`<b style="color:${['brown','blue','green'][dps.skill.damageType-100]};">${Math.round(dps.skill.atk)}</b> × ${dps.skill.hitNumber}`);
  
  let skillDamage = (dps.skill.hitDamage * dps.skill.attackCount + dps.skill.critDamage * dps.skill.critCount) * dps.skill.hitNumber;
  let line = `${(dps.skill.hitDamage*dps.skill.hitNumber).toFixed(1)} * ${dps.skill.attackCount}`;
  if (dps.skill.critCount > 0) line += ` + ${(dps.skill.critDamage*dps.skill.hitNumber).toFixed(1)} * ${dps.skill.critCount}`;
  if (dps.skill.totalDamage > skillDamage+1) line += ` + ${(dps.skill.totalDamage - skillDamage).toFixed(1)}`;
  line += ` = ${Math.round(dps.skill.totalDamage)}`;
  getElement('s_damage', index).html(line);

  if (dps.skill.isInstant){
    getElement('s_dps', index).html("-");
  } else if (dps.skill.damagePool[2] == 0) {
    getElement('s_dps', index).html(Math.round(dps.skill.dps));
  } else {
    getElement('s_dps', index).html(`DPS: ${Math.round(dps.skill.dps)}, HPS: ${Math.round(dps.skill.damagePool[2] / dps.skill.duration)}`);
  }
  if (dps.normal.damagePool[2] == 0) {
    getElement('n_dps', index).html(Math.round(dps.normal.dps));
  } else {
    getElement('n_dps', index).html(`DPS: ${Math.round(dps.normal.dps)}, HPS: ${Math.round(dps.normal.damagePool[2] / dps.normal.duration)}`);
  }
  if (dps.skill.spType < 4) {
    getElement('period', index).html(`${Math.round(dps.normal.duration*100)/100}s + ${Math.round(dps.skill.duration*100)/100}s`);
  } else {
    if (dps.skill.spType == 4)
      getElement('period', index).html(`${dps.skill.duration.toFixed(1)}s, 受击回复`);
    else 
      getElement('period', index).html(`被动`);
  }
  getElement('g_dps', index).html(dps.globalDps);
  getElement('e_time', index).html(dps.killTime ?  `${Math.ceil(dps.killTime)}秒` : '-');
  char.log = dps.log;

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