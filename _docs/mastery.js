
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

function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/skill_table.json',
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    '../resources/attributes.js'
  ], load);
}

const charColumnCount = $(document).width() <= 1400 ? 2 : 4;
const Characters = new Array(charColumnCount);

function getElement(classPart, index) {
  return $(`.dps__${classPart}[data-index="${index}"]`);
}

function load() {
  let version = AKDATA.Data.version;
  $('#update_prompt').text(`程序版本: ${version.akdata}, 数据版本: ${version.gamedata}`);
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
    <tr class="dps__row-select" style="width:20%;"> <th style="width:200px;">干员</th> </tr>
  </tbody>
  </table>
</div>
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
      <a class="dps__copy" data-index="${i}" href="#">[复制到右侧]</a>
    </td>`);

    $dps.find('.dps__row-level').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control form-control-sm col-7 dps__phase" data-index="${i}"></select><select class="form-control form-control-sm col-5 dps__level" data-index="${i}"></select></div></div></td>`);
  }

  pmBase.content.build({
    pages: [{
      content: $dps,
    }]
  });

  $('.dps__char').change(chooseChar);
  $('.dps__goto').click(goto);
  $('.dps__copy').click(copyChar);
}

function goto() {
  let $this = $(this);
  let index = ~~$this.data('index');
  if ( Characters[index].charId ) {
    window.open(`../character/#!/${Characters[index].charId}`, '_blank'); 
  }
}

function setSelectValue(name, index, value) {
  let $e = getElement(name, index);
  $e.val(value);
}

function updateChar(charId, index) {
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

  updateOptions(charId, index);

  Characters[index] = {
    charId,
    skillId,
    skillLevel,
  };
  $phase.change();
}

function chooseChar() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let charId = $this.val();
  if (!charId) return;

  updateChar(charId, index);
}

function copyChar() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let charId = Characters[index].charId;
  while (index < charColumnCount-1) {
    ++index;
    updateChar(charId, index);
    setSelectValue("char", index, charId);
  }
}

const DamageColors = ['black','blue','limegreen','gold','aqua'];

function calculate(index) {
  let char = Characters[index];
 
}

function calculateAll() {
  Characters.forEach((x, i) => calculate(i));
}

function calculateColumn() {
  let index = ~~($(this).data('index'));
  if (index == 0) calculateAll();
  else calculate(index);
}

pmBase.hook.on('init', init);
