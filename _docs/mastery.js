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
  options: { cond: true, crit: true, stack: true, warmup: true }
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

const CostStages = [
  { level: 1, potential: 0, skillLevel: 6, desc: "2017" },
  { level: 80, desc: "28010" },
  { level: "max", desc: "满级" },
  { potential: 5, desc: "满潜" }
];

const LevelingCost = {4: [2391, 9], 5: [3699, 13], 6: [5874, 21] };

let itemCache = {};

function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/skill_table.json',
    'excel/item_table.json',
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    '../customdata/leveling_cost.json',
    '../resources/attributes.js'
  ], load);
}

function queryArkPlanner(mats, callback, ...args) {
  var url = "https://planner.penguin-stats.io/plan";
  var data = {
    required: mats,
    owned: {},
    extra_outc: true,
    exp_demand: false,
    gold_demand: true
  };
  //console.log("query ArkPlanner ->", JSON.stringify(data, null, 2));
  
  $.ajax({
    type: "post",
    url: url,
    data: JSON.stringify(data, null, 2),
    dataType: "json",
    crossDomain: true,  // 跨域
    success: function (result) {
//      console.log("<-", result, args);
      callback(result, ...args);
    },
    error: alert
  });
}
 //queryArkPlanner({"赤金": 100});

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
    test: {},
    plannerResponse: {},
    recom: {},
    jobs: 0,
    test: "",
  };
}

function load() {
  let version = AKDATA.checkVersion();
  if (!version.result) {
    $('#vue_version').text(`有新数据，请更新`);
    console.log(version.reason);
  } else {
    $("#vue_version").html("程序版本: {{ version.akdata }}, 数据版本: {{ version.gamedata }} ({{ version.customdata }}), 如有问题请点击");
    $("#btn_update_data").text("手动刷新");
    $("#btn_update_data").attr("class", "btn btn-success");
  }
  
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
      <div class="card-title mb-0">升级收益（精2 1级~满级）</div>
    </div>
    <div id="level_table"></div>
  </div>
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title">
        专精收益（以精2 1级 7级技能为基准计算）
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
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">专精材料（ × <a href="https://planner.penguin-stats.io/" target="_blank">ArkPlanner</a>）</div>
    </div>
    <div id="mats_table"></div>
  </div>
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">理智消耗效率</div>
    </div>
    <div id="cost_chart" class="row"></div>
  </div>    
<!--
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">调试信息</div>
    </div>
    <pre>{{ debugPrint(test) }}</pre>
    <div id="_post"></div>
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
        <button class="btn btn-outline-secondary dps__godps" type="button" v-on:click="godps"><i class="fas fa-calculator"></i></button>
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
        $("#mats_table").text("正在计算...");
        beginCalcMats(this.resultView);
        this.updateLevelingTable();
      },
      debugPrint: function(obj) {
        //console.log(JSON.stringify(obj, null, 2));
        return JSON.stringify(obj, null, 2);
      },
      goto: function(event) {
        window.open(`../character/#!/${this.charId}`, '_blank'); 
      },
      godps: function(event) {
        window.open(`../dps/#${this.charId}`, '_blank'); 
      },
      updateMats: function(result) {
        let matsView = {};
        let rv = this.resultView;
        let pr = this.plannerResponse;

        let costResult = calculateCost(this.charId, pr, this.resultView);
        //this.test = costResult;
        updateCostPlot(costResult, this.chartKey);

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
              pr[sk][lv].cost,
              this.recom[sk][lv-7]
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
            header: ['等级', '素材', '等效理智', '推荐等级(测试)'],
            list: matsView[sk].list
          });
        }
        $("#mats_table").html(matsHtml);
      },
      jobCallback: function() {
        console.log("- all jobs finished");
        console.timeEnd("calcMats");
        this.updateMats(this.plannerResponse);
      },
      updateLevelingTable: function () {
        var db = AKDATA.Data.character_table[this.charId];
        var r = DefaultAttribute; $.extend(r, Stages["基准"]);
        var ch0 = buildChar(this.charId, db.skills[0].skillId, r);
        r.level = "max";
        var ch1 = buildChar(this.charId, db.skills[0].skillId, r);
        var a0 = AKDATA.attributes.getCharAttributes(ch0), a1 = AKDATA.attributes.getCharAttributes(ch1);

        var gain = [(a1.maxHp - a0.maxHp)/a0.maxHp, (a1.atk - a0.atk)/a0.atk, (a1.def - a0.def)/a0.def];
        var result = gain.map(x => (x*100).toFixed(1) + "%");
        result.push(...LevelingCost[db.rarity + 1]);
        //console.log(result);
        //console.log(ch0, ch1);
        //console.log(a0, a1);

        let html = pmBase.component.create({
            type: 'list',
            card: false,
            title: `升级属性提升（精二1级->满级）`,
            header: ['HP', '攻击力', '防御力', '等效理智(按CE5/LS5计算)', '需要天数(按基建+自回体+月卡计算)'],
            list: [result]
          });
        $("#level_table").html(html);
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
      },
    }
  });

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
  if (recipe.level == "max" || recipe.level > maxLevel)
    char.level = maxLevel;
  else
    char.level = recipe.level;
  char.name = db.name;
  char.skillName = skilldb.levels[char.skillLevel].name;
  //console.log(char);
  var _opts = AKDATA.Data.dps_options.char[charId];
  if (_opts && _opts.indexOf("token") >= 0)
    char.options.token = true;
  return char;
}

function calculate(charId) {
  let db = AKDATA.Data.character_table[charId];
  let itemdb = AKDATA.Data.item_table.items;
  let recipe = DefaultAttribute;
  let enemy = DefaultEnemy;
  let stages = Stages;
  let raidBuff = { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
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
  if (!window.chart) window.chart = {};  
  window.chart["chart"] = c3.generate({
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
    zoom: { enabled: false },
    color: {
      pattern: [ "#cccccc", "#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ee82ee", "#e6e6fa" ]
    }
  });

  window.chart["chart"].load({ columns: chartView.columns });
  setTimeout(function() {
    $(".c3-chart-bar.c3-target-基准").css("opacity", 0.4);
  }, 100);
}

function updatePlot(chartView) {
  window.chart["chart"].load({ columns: chartView.columns, groups: chartView.groups });
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

function calculateCost(charId, masteryCost, resultView) {
  let result = {};
  let db = AKDATA.Data.character_table[charId];
  let costdb = AKDATA.Data.leveling_cost;
  var perLevelSanity = costdb.map((x, idx) => (idx==0) ? 0 : x - costdb[idx-1]);

  let recipe = DefaultAttribute;
  let enemy = DefaultEnemy;
  let stages = [];
  let raidBuff = { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };

  var chartView = buildChartView(resultView, "s_dps");
  var i=0;
  // calculate dps for each recipe case.
  db.skills.forEach(skill => {
    var entry = [];
    stages = [...CostStages];
    // calculate efficiency. base: 0, level: 1, m1:2, m2:3, m3:4, skill:i+1
    var base = chartView.columns[0][i+1];
    var mc = masteryCost[skill.skillId];
    var perLevelGain = chartView.columns[1][i+1] / base / (db.rarity * 10 + 39);  // per level dps gain rate
    var mg = [2, 3, 4].map(x => chartView.columns[x][i+1] / base);  // mastery dps gain rate
    mg[1] += mg[0];
    mg[2] += mg[1]; // accumulate

    var perLevelEffInv = perLevelSanity.map(x => x / perLevelGain);  // inverse of efficiency
    var masteryEffInv = [mc[7].cost, mc[7].cost + mc[8].cost, mc[7].cost + mc[8].cost + mc[9].cost].map((x, idx) => x / mg[idx]);
    var recom = masteryEffInv.map(x => perLevelEffInv.findIndex(y => y > x)).map(x => (x <= 0) ? (db.rarity*10+40) : x);
    recom[2] = Math.min(80, recom[2]);
    recom[1] = Math.min(recom[1]+5, recom[2]);  // tweak result
    recom[0] = Math.min(recom[0]+5, recom[1]);
    // console.log(perLevelEffInv, masteryEffInv);
    //console.log(recom);
    window.vue_app.recom[skill.skillId] = recom;

    // set stages
    var j=1;
    for (var k=0; k<3; ++k) {
   //   if (k==0 || recom[k] > recom[k-1]) {
   //     stages.splice(j, 0, { level: recom[k], desc: `2${recom[k]}${k+7}` }); ++j;
   //   }
      stages.splice(j, 0, { level: recom[k], skillLevel: k+7, desc: `2${recom[k]}${k+8}` }); ++j;
    }
    if (recom[2] < 60)
      stages.splice(j, 0, {level: 60, desc: "26010"}); ++j;

    //console.log(stages);
    // calculate stage dps
    stages.forEach(st => {
      var item = {};
      if (!(st.level == 80 && db.rarity < 5)) {
        $.extend(recipe, st);
        var ch = buildChar(charId, skill.skillId, recipe);
        ch.dps = AKDATA.attributes.calculateDps(ch, enemy, raidBuff);
        
        item = {
          desc: st.desc,
          dps: ch.dps.globalDps,
          hps: ch.dps.globalHps,
          s_dps: ch.dps.skill.dps,
          s_hps: ch.dps.skill.hps,
          s_dmg: ch.dps.skill.totalDamage,
          s_heal: ch.dps.skill.totalHeal,
          levelingCost: costdb[ch.level - 1],
          damageType: ch.dps.skill.damageType,
          skillName: ch.skillName
        };

        let mcost = 0, slv = ch.skillLevel;
        while (slv > 6) {
          mcost += masteryCost[skill.skillId][slv].cost;
          --slv;
        }
        item.masteryCost = mcost;
        
        entry.push(item);
      }
    });
    result[skill.skillId] = entry;
    i+=1;
  });
  return result;
}

function updateCostPlot(result, chartKey) {
  $("#cost_chart").html("");
  var idx = 1;
  Object.keys(result).forEach(key => {
    var idstr = `skill_${idx}`;
    $("#cost_chart").append(`
<div class="col-md-6">
  <p class="text-center"><b>${result[key][0].skillName} - DPS提升与理智消耗</b></p>
  <div id="${idstr}"></div>
</div>`);
    var ck = chartKey;
    if (result[key][0].damageType == 2) ck = HealKeys[chartKey];
    let x_arr = result[key].map(x => x.desc);
    let dps_arr = result[key].map(x => x[ck]);
    let cost_arr = result[key].map(x => x.masteryCost + x.levelingCost);
    $(`#${idstr}`).append(window.vue_app.debugPrint({x_arr, dps_arr, cost_arr}));
    window.chart[idstr] = c3.generate({
      bindto: `#${idstr}`,
      size: { height: 400 },
      data: {
        columns: [
          ["dps", ...dps_arr],
          ["理智消耗", ...cost_arr]
        ],
        axes: {
          dps: "y",
          "理智消耗": "y2"
        }
      },
      axis: {
        x: {
          type: "category",
          categories: x_arr,
        },
        y: {
          min: dps_arr[0],
          padding: 0,
          label: { text: chartKey, position: 'outer-middle' }
        },
        y2: {
          show: true, 
          min: 0,
         // max: cost_arr[cost_arr.length-1], 
          padding: 0, 
          label: { text: "理智消耗", position: 'outer-middle' }
        }
      },
      tooltip: {
        format: { value: function(value, ratio, id) {
          if (id == "dps") return `${value.toFixed(1)} (${(value * 100 / dps_arr[dps_arr.length-1]).toFixed(1)}%)`;
          else return Math.round(value);
        } }
      },
      grid: {
        y: { show: true }
      },
      zoom: { enabled: false },
    });

    ++idx;
  });
}

pmBase.hook.on('init', init);
