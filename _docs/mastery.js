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

const DamageColors = ['black','blue','limegreen','gold','aqua'];
const DefaultRecipe = {
  phase: 2,
  level: "max",
  favor: 200,
  potential: 5,  // 0-5
  skillLevel: 9,  // 0-9
  options: { cond: true }
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

function buildVueModel() {
  let version = AKDATA.Data.version;
  
  // select char list
  let charList = {};
  Object.keys(ProfessionNames).forEach(key => {
    var opts = [];
    for (let id in AKDATA.Data.character_table) {
      let data = AKDATA.Data.character_table[id];
      if (data.profession == key && data.phases.length > 2)
        opts.push({"name": data.name, "id": id});
    }
    charList[ProfessionNames[key]] = opts;
  });

  return {
    version,
    charList,
    charId: "-",
    test: "test"
  };
}

function load() {
  $("#vue_version").html("程序版本: {{ version.akdata }}, 数据版本: {{ version.gamedata }}");

  // build html
  let html = `
<div id="vue_app">  
<div class="card mb-2">
  <div class="card-header">
    <div class="card-title mb-0">干员</div>
  </div>
  <table class="table dps" style="table-layout:fixed;">
  <tbody>
    <tr class="dps__row-select" style="width:20%;"> <th style="width:200px;">干员</th> </tr>
  </tbody>
  </table>
</pre>{{ JSON.stringify(test, null, 2) }}</pre>
  `;
  let $dps = $(html);

  $dps.find('.dps__row-select').append(`<td>
    <div class="input-group">
      <select class="form-control" v-model="charId" v-on:change="change">
        <optgroup v-for="(v, k) in charList" :label="k">
          <option v-for="char in v" :value="char.id">
            {{ char.name }}
          </option>
        </optgroup> 
      </select>
      <div class="input-group-append">
        <button class="btn btn-outline-secondary dps__goto" type="button"><i class="fas fa-search"></i></button>
      </div>
    </div>
  </td>`);

  pmBase.content.build({
    pages: [{
      content: $dps,
    }]
  });

  // setup vue
  window.model = buildVueModel();
  let vue_version = new Vue({
    el: '#vue_version',
    data: { 
      version: window.model.version,
    }
  });  
  window.vue_app = new Vue({
    el: '#vue_app',
    data: window.model,
    methods: {
      change: function(event) {
      //  window.model.test = this.charId;  // bind test
        calculate(this.charId);
      }
    }
  });
}

function goto() {
  let $this = $(this);
  let index = ~~$this.data('index');
  if ( Characters[index].charId ) {
    window.open(`../character/#!/${Characters[index].charId}`, '_blank'); 
  }
}

function buildChar(charId, skillId, recipe) {
  let char = {
    charId,
    skillId,
    phase: recipe.phase,
    favor: recipe.favor,
    potentialRank: recipe.potential,
    skillLevel: recipe.skillLevel,
    options: recipe.options
  };

  let db = AKDATA.Data.character_table[charId];
  let skilldb = AKDATA.Data.skill_table[skillId];
  let maxLevel = db.phases[recipe.phase].maxLevel;
  if (recipe.level == "max")
    char.level = maxLevel;
  else
    char.level = recipe.level;
  char.name = db.name;
  char.skillName = skilldb.levels[char.skillLevel].name;
  console.log(char);
  return char;
}

function calculate(charId) {
  let recipe = DefaultRecipe;
  let db = AKDATA.Data.character_table[charId];
  let cases = [];

  let enemy = { def: 0, magicResistance: 0, count: 1, hp: 0 };
  let raidBuff = { atk: 0, atkpct: 0, ats: 0, cdr: 0 };

  db.skills.forEach((skill, i) => {
    var ch = buildChar(charId, skill.skillId, recipe);
    ch.dps = AKDATA.attributes.calculateDps(ch, enemy, raidBuff);
    cases.push(ch);
  });
  window.model.test = cases;
}

pmBase.hook.on('init', init);
