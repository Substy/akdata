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
const DefaultAttribute = {
  phase: 2,
  level: "max",
  favor: 200,
  potential: 5,  // 0-5
  skillLevel: 9,  // 0-9
  options: { cond: true, crit: true, stack: true }
};
const DefaultEnemy = { def: 0, magicResistance: 0, count: 1, hp: 0 };

const Stages = {
  "基准": { level: 1, potential: 0, skillLevel: 6, desc: "精2 1级 潜能1 技能7级" },
  "满级": { level: "max", desc: "精2 满级 潜能1 技能7级" },
  "专1": { skillLevel: 7, desc: "满级 潜能1 专精1" },
  "专2": { skillLevel: 8, desc: "满级 潜能1 专精2" },
  "专3": { skillLevel: 9, desc: "满级 潜能1 专精3" },
  "满潜": { potential: 5, desc: "满级 满潜 专精3"},
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
    chartKey: "dps",
    resultView: {},
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
  </div>
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title">
        专精收益
        <span class="float-right">
          <input type="radio" id="btn_avg" value="dps" v-model="chartKey">
          <label for="btn_avg">平均dps/hps</label>
          <input type="radio" id="btn_skill" value="s_dps" v-model="chartKey">
          <label for="btn_skill">技能dps/hps</label>
          <input type="radio" id="btn_total" value="s_dmg" v-model="chartKey">
          <label for="btn_total">技能总伤害/治疗</label>
        </span>
      </div>
    </div>
    <div id="chart"></div>
  </div>
  <!--
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">调试信息</div>
    </div>
    <pre>{{ debugPrint(test) }}</pre>
  </div>
  -->
</div>`;
  let $dps = $(html);

  $dps.find('.dps__row-select').append(`<td>
    <div class="input-group">
      <select class="form-control" v-model="charId" v-on:change="changeChar">
        <optgroup v-for="(v, k) in charList" :label="k">
          <option v-for="char in v" :value="char.id">
            {{ char.name }}
          </option>
        </optgroup> 
      </select>
      <div class="input-group-append">
        <button class="btn btn-outline-secondary dps__goto" type="button" v-on:click="goto"><i class="fas fa-search"></i></button>
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
      changeChar: function(event) {
        this.resultView = calculate(this.charId);
      },
      debugPrint: function(obj) {
        //console.log(JSON.stringify(obj, null, 2));
        return JSON.stringify(obj, null, 2);
      },
      goto: function(event) {
        window.open(`../character/#!/${this.charId}`, '_blank'); 
      }
    },
    watch: {
      resultView: function(_new, _old) {
        plot(_new, this.chartKey);
      },
      chartKey: function(_new, _old) {
        updatePlot(this.resultView, _new);
      }
    }
  });

  // test c3.js
  // var chart = c3.generate({
  //   bindto: '#chart',
  //   data: {
  //     columns: [
  //       ['data1', 30, 200, 100, 400, 150, 250],
  //       ['data2', 50, 20, 10, 40, 15, 25]
  //     ]
  //   } 
  // });
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
  //console.log(char);
  return char;
}

function calculate(charId) {
  let db = AKDATA.Data.character_table[charId];
  let recipe = DefaultAttribute;
  let enemy = DefaultEnemy;
  let stages = Stages;
  let raidBuff = { atk: 0, atkpct: 0, ats: 0, cdr: 0 };
  let result = {};

  // calculate dps for each recipe case.
  db.skills.forEach(skill => {
    var entry = {};
    for (let st in stages) {
      $.extend(recipe, stages[st]);
      var ch = buildChar(charId, skill.skillId, recipe);
      ch.dps = AKDATA.attributes.calculateDps(ch, enemy, raidBuff);
      entry[st] = ch;
    };
    result[skill.skillId] = entry;
  });
  // window.model.test = result;

  // extract result, making it more readable
  // name, skill, stage, damageType, avg, skill, skilldamage, cdr
  let resultView = {
    name: db.name,
    skill: {},
    stages: stages,
    dps: {},
    notes: {}
  };
  for (let k in result) {
    resultView.skill[k] = result[k]["满潜"].skillName;
    resultView.notes[k] = result[k]["满潜"].dps.note;
    resultView.dps[k] = {};
    for (let st in stages) {
      var entry = result[k][st].dps;
      resultView.dps[k][st] = {
        damageType: entry.skill.damageType,
        dps: entry.globalDps,
        hps: entry.globalHps,
        s_dps: entry.skill.dps,
        s_hps: entry.skill.hps,
        s_dmg: entry.skill.totalDamage,
        s_heal: entry.skill.totalHeal,
      };
    };
  };

  return resultView;
}

const HealKeys = {
  dps: "hps",
  s_dps: "s_hps",
  s_dmg: "s_heal"
};

function plot(view, key) {
  // rotate data for plot columns
  let columns = [], groups = [], skill_names = [], notes = [];
  var last = {};
  for (let stg in view.stages) {
    var entry = [stg];
    for (let skill in view.skill) {
      var value = view.dps[skill][stg][key];
      if (view.dps[skill][stg].damageType == 2) {
        value = view.dps[skill][stg][HealKeys[key]];
      }
      if (skill in last)
        entry.push(value - last[skill]);
      else
        entry.push(value);
      last[skill] = value;
    }
    columns.push(entry);
    groups.push(stg);
  }
  var x = 0.02;
  for (let skill in view.skill) {
    skill_names.push(view.skill[skill]);
    notes.push({x: x, y: 20, content: view.notes[skill]});
    x+=1;
  }
  window.chart = c3.generate({
    bindto: "#chart",
    size: { height: 400 },
    data: {
      type: "bar",
      columns: [],
      groups: [groups],
      order: null,
    },
    axis: {
      rotated: true,
      x: {
        type: "category",
        categories: skill_names
      },
      y: {
        tick: { fit: false },
      }
    },
    bar: {
      width: { ratio: 0.4 }
    },
    stanford: {
      texts: notes
    },
    grid: {
      y: { show: true }
    },
    zoom: { enabled: true },
    color: {
      pattern: [ "#cccccc", "#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ee82ee" ]
    }
  });

  window.chart.load({ columns: columns });
  setTimeout(function() {
    $(".c3-chart-bar.c3-target-基准").css("opacity", 0.4);
  }, 100);
}

function updatePlot(view, key) {
  // rotate data for plot columns
  let columns = [], groups = [], skill_names = [];
  var last = {};
  for (let stg in view.stages) {
    var entry = [stg];
    for (let skill in view.skill) {
      var value = view.dps[skill][stg][key];
      if (view.dps[skill][stg].damageType == 2) {
        value = view.dps[skill][stg][HealKeys[key]];
      }
      if (skill in last)
        entry.push((value - last[skill]).toFixed(2));
      else
        entry.push(value.toFixed(2));
      last[skill] = value;
    }
    columns.push(entry);
    groups.push(stg);
  }
  for (let skill in view.skill)
    skill_names.push(view.skill[skill]);

    window.chart.load({ columns: columns, groups: groups });
    setTimeout(function() {
      $(".c3-chart-bar.c3-target-基准").css("opacity", 0.4);
    }, 200);
}

pmBase.hook.on('init', init);
