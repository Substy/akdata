const DamageColors = ['black','blue','limegreen','gold','aqua'];

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

// build html
let page_html = `
<div id="vue_app">  
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">
        干员
        <span class="float-right">
          <button class="btn btn-outline-secondary" type="button" v-on:click="addChar"><i class="fas fa-plus"></i></button>
          <button class="btn btn-outline-secondary" type="button" v-on:click="delChar"><i class="fas fa-minus"></i></button>
        </span>
      </div>
    </div>
    <table class="table dps" style="table-layout:fixed;">
    <tbody>
      <tr class="dps__row-select" v-for="(item, index) in plotList">
        <th style="width:100px;"><a href="#" @click="showDetail(index)">选择干员</a></th>
        <td>
          <span id="txt_detail" :data-index="index"></span>
        </td>
      </tr>
    </tbody>
    </table>
  </div>
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">调试信息</div>
    </div>
    <pre>{{ debugPrint(test) }}</pre>
  <!--  <div><char_select /></div> -->
  </div>
</div>`;

var char_select_html = `
<div id="char_select_component">
<table class="table" style="table-layout:fixed;">
<tbody>
  <tr>
  <th style="width:100px;">角色</th>
  <td><select class="form-control" @change="setChar">
    <option value="-">-</option>
    <optgroup v-for="(v, k) in charList" :label="k">
      <option v-for="char in v" :value="char.charId">
        {{ char.name }}
      </option>
    </optgroup> 
  </select></td>
  </tr>
  <tr>
    <th style="width:100px;">精英</th>
    <td><select id="sel_phase" class="form-control" :value="result.phase"></select></td>
  </tr>
  <tr>
    <th style="width:100px;">等级</th>
    <td><select id="sel_level" class="form-control" :value="result.level"></select></td>
  </tr>
  <tr>
    <th style="width:100px;">潜能</th>
    <td><select id="sel_potential" class="form-control" :value="result.potential"></select></td>
  </tr>
  <tr>
    <th style="width:100px;">技能</th>
    <td><select id="sel_skill" class="form-control" :value="result.skillId"></select></td>
  </tr>
  <tr>
    <th style="width:100px;">技能等级</th>
    <td><select id="sel_skilllv" class="form-control" :value="result.skillLevel"></select></td>
  </tr>
  <tr>
    <th style="width:100px;">条件</th>
    <td><div id="sel_options">特殊条件</div></td>
  </tr>
</tbody>
</table>
</div>
`;

function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/skill_table.json',
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    '../resources/attributes.js',
  ], load);
}

var charDB = AKDATA.Data.character_table;
var skillDB = AKDATA.Data.skill_table;

// 载入vue需要的数据
function buildVueModel() {
  let version = AKDATA.Data.version;
  let charList = {};  
  let plotList = [{ charId: "-"}];

  Object.keys(ProfessionNames).forEach(key => {
    var arr = [];
    for (let charId in charDB) {
        var char = charDB[charId];
        if (char.profession == key) arr.push({"name": char.name, "charId": charId});
    }
    charList[ProfessionNames[key]] = arr;
  });

  return {
    version,
    charList,
    plotList,
    charId: "-",
    chartKey: "dps",
    resultView: {},
    test: {},
    plannerResponse: {},
    jobs: 0,
    details: { phase: 2, level: 90, potential: 5, skillId: "-", skillLevel: 9, options: {} }
  };
}

function load() {
  let version = AKDATA.Data.version;
  if (version.gamedata != AKDATA.currentVersion || version.akdata != AKDATA.akVersion) {
    $('#vue_version').text(`有新数据，请点击[清除缓存]更新`);
  } else {
    $("#vue_version").html("程序版本: {{ version.akdata }}, 数据版本: {{ version.gamedata }}");
  }
  

  let $dps = $(page_html);

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
      addChar: function() {
        this.plotList.push({charId: "-"});
      },
      delChar: function() {
        this.plotList.splice(-1, 1);
      },
      setChar: function(index) {
        
      },
      showDetail: function(index) {
        pmBase.component.create({
          type: 'modal',
          id: `dlg_details_${index}`,
          content: char_select_html,
          title: index,
          show: true,
        });
        this.$mount("#vue-dialog");
      },
      debugPrint: function(obj) {
        //console.log(JSON.stringify(obj, null, 2));
        return JSON.stringify(obj, null, 2);
      },
      goto: function(event) {
        window.open(`../character/#!/${this.charId}`, '_blank'); 
      },
      updateMats: function(result) {
        let matsView = {};
        let rv = this.resultView;
        let pr = this.plannerResponse;
        for (var sk in rv.skill) {
          matsView[sk] = {title: rv.skill[sk]};
          matsView[sk].list = [];
          for (var lv in pr[sk]) {
            var items = [];
            for (var x in pr[sk][lv].mats) {
            //  items.push(` ${x} × ${pr[sk][lv].mats[x]}`);
              items.push(AKDATA.getItemBadge("MATERIAL", itemCache[x].id, pr[sk][lv].mats[x]));
            }
            matsView[sk].list.push([
              `${lv} <i class="fas fa-angle-right"></i> ${parseInt(lv)+1}`,
              items,
              pr[sk][lv].cost
            ]);
          }
        }
        // this.test = matsView;
        let matsHtml = "";
        for (var sk in matsView) {
          matsHtml += pmBase.component.create({
            type: 'list',
            card: true,
            title: `${matsView[sk].title}`,
            header: ['等级', '素材', '等效理智'],
            list: matsView[sk].list
          });
        }
        $("#mats_table").html(matsHtml);
      },
      jobCallback: function() {
        console.log("- all jobs finished");
        console.timeEnd("calcMats");
        this.updateMats(this.plannerResponse);
      }
    },
    watch: {
      resultView: function(_new, _old) {
        let cv = buildChartView(_new, this.chartKey);
        plot(cv);
      },
      chartKey: function(_new, _old) {
        let cv = buildChartView(this.resultView, _new);
        updatePlot(cv);
      },
      jobs: function(_new, _old) {
        if (this.charId != "-" && this.jobs == 0)
          this.jobCallback();
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
  //console.log(char);
  return char;
}

function calculate(charId) {
  let db = AKDATA.Data.character_table[charId];
  let itemdb = AKDATA.Data.item_table.items;
  let recipe = DefaultAttribute;
  let enemy = DefaultEnemy;
  let stages = Stages;
  let raidBuff = { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0 };
  let result = {}, mats = {};

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

    mats[skill.skillId] = skill.levelUpCostCond.map(x => x.levelUpCost);
  });
  // window.model.test = result;

  // extract result, making it more readable
  // name, skill, stage, damageType, avg, skill, skilldamage, cdr
  let resultView = {
    id: charId,
    name: db.name,
    skill: {},
    stages: stages,
    dps: {},
    notes: {},
    mats: {}
  };
  for (let k in result) {
    resultView.skill[k] = result[k]["满潜"].skillName;
    resultView.notes[k] = result[k]["满潜"].dps.note;
    resultView.dps[k] = {};
    for (let st in stages) {
      var entry = result[k][st].dps;
      resultView.dps[k][st] = {
        damageType: entry.skill.damageType,
        spType: entry.skill.spType,
        dps: entry.globalDps,
        hps: entry.globalHps,
        s_dps: entry.skill.dps,
        s_hps: entry.skill.hps,
        s_dmg: entry.skill.totalDamage,
        s_heal: entry.skill.totalHeal,
        s_ssp: entry.skill.dur.startSp,
      };
     // console.log(k, st, entry.skill.dur.startSp);
    };
    resultView.mats[k] = [];
    mats[k].forEach(level => {
      var i = {};
      level.forEach(x => {
        i[itemdb[x.id].name] = x.count;
        itemCache[itemdb[x.id].name] = {id: x.id, name: itemdb[x.id].name, rarity: itemdb[x.id].rarity};
      });
      resultView.mats[k].push(i);
    });
  };

 //console.log(window.vue_app.debugPrint(resultView.mats));
  return resultView;
}

const HealKeys = {
  dps: "hps",
  s_dps: "s_hps",
  s_dmg: "s_heal"
};

// calculate() -> resultView -> build(key) -> chartView -> plot()
function buildChartView(resultView, key) {
  // rotate data for plot columns
  let view = resultView;
  let k = key;
  let columns = [], groups = [], skill_names = [], notes = [];
  var last = {};
  for (let stg in view.stages) {
    var entry = [stg];
    for (let skill in view.skill) {
      k = (view.dps[skill][stg].damageType == 2) ? HealKeys[key] : key; 
      var value = view.dps[skill][stg][k];
      if (skill in last)
        entry.push((value - last[skill]).toFixed(2));
      else
        entry.push(value.toFixed(2));
      last[skill] = value;
    }
    columns.push(entry);
    groups.push(stg);
  }
  var x = 0.02, i = 0;
  for (let skill in view.skill) {
    skill_names.push(view.skill[skill]);
    let line = view.notes[skill];
    
    if (view.dps[skill]["满潜"].spType != 8) {
      if (line != "") line += "\n";
      line += `点火时间 ${view.dps[skill]["基准"].s_ssp}s -> ${view.dps[skill]["满潜"].s_ssp}s`;
      console.log(view.dps[skill]["满潜"].spType);
      if (view.dps[skill]["满潜"].s_ssp <= 0)
        line += " （落地点火）";
    }
    notes.push({x: x, y: 20, content: line});
    x+=1;
  }
  // console.log(columns, groups, skill_names, notes);

  return { columns, groups, skill_names, notes };
}

function plot(chartView) {  
  window.chart = c3.generate({
    bindto: "#chart",
    size: { height: 400 },
    data: {
      type: "bar",
      columns: [],
      groups: [chartView.groups],
      order: null,
    },
    axis: {
      rotated: true,
      x: {
        type: "category",
        categories: chartView.skill_names
      },
      y: {
        tick: { fit: false },
      }
    },
    bar: {
      width: { ratio: 0.4 }
    },
    stanford: {
      texts: chartView.notes
    },
    grid: {
      y: { show: true }
    },
    zoom: { enabled: true },
    color: {
      pattern: [ "#cccccc", "#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ee82ee", "#e6e6fa" ]
    }
  });

  window.chart.load({ columns: chartView.columns });
  setTimeout(function() {
    $(".c3-chart-bar.c3-target-基准").css("opacity", 0.4);
  }, 100);
}

function updatePlot(chartView) {
  window.chart.load({ columns: chartView.columns, groups: chartView.groups });
  setTimeout(function() {
    $(".c3-chart-bar.c3-target-基准").css("opacity", 0.4);
  }, 200);
}

// use ajax post to invoke ArkPlanner
// use vue var as semaphore to cooperate requests
// when all request jobs are done (jobs == 0), the vue watch invokes jobDoneCallback()
function beginCalcMats(resultView) {
  console.time("calcMats");
  window.vue_app.jobs = Object.keys(resultView.mats).length * 3;  // semaphore
  var delay = 300;
  for (var sk in resultView.mats) {
    let level = 7;  // 7->8
    resultView.mats[sk].forEach(m => {
      (function (_m, _s, _l) {  // closure to bind args to setTimeout
        setTimeout(function () {
          queryArkPlanner(_m, matsCallback, {mats: _m, id: resultView.id, skill: _s, level: _l});
        }, delay);
      }(m, sk, level));
      level += 1; delay += 300;
    });
  }
}

function matsCallback(result, kwargs) {
  console.log(result.cost, kwargs);
  if (!window.vue_app.plannerResponse[kwargs.skill])
    window.vue_app.plannerResponse[kwargs.skill] = {};
//  window.vue_app.plannerResponse[kwargs.skill][`${kwargs.level}`] = { mats: kwargs.mats, result: result };
  window.vue_app.plannerResponse[kwargs.skill][`${kwargs.level}`] = { mats: kwargs.mats, cost: result.cost };

  if (kwargs.id == window.vue_app.charId)  // filter old (slow) calls
    window.vue_app.jobs -= 1;
}

pmBase.hook.on('init', init);
