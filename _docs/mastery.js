const DamageColors = ['black','blue','limegreen','gold','aqua'];
const DefaultAttribute = {
  phase: 2,
  level: "max",
  favor: 200,
  potential: 5,  // 0-5
  skillLevel: 9,  // 0-9,
  equip: false,
  options: { cond: true, crit: true, stack: true, warmup: true, charge: true, equip: true, far: true}
};
const DefaultEnemy = { def: 0, magicResistance: 0, count: 1, hp: 0 };

const Stages = {
  "基准": { level: 1, potential: 0, skillLevel: 6, desc: "精2 1级 潜能1 技能7级" },
  "满级": { level: "max", desc: "精2 满级 潜能1 技能7级" },
  "专1": { skillLevel: 7, desc: "满级 潜能1 专精1" },
  "专2": { skillLevel: 8, desc: "满级 潜能1 专精2" },
  "专3": { skillLevel: 9, desc: "满级 潜能1 专精3" },
  "模组": { equip: true },
  "满潜": { potential: 5, desc: "满级 满潜 专精3"},
};

const CostStages = [
  { level: 1, potential: 0, skillLevel: 6, desc: "2017" },
  { level: 80, desc: "28010" },
  { level: "max", desc: "满级" },
  { potential: 5, desc: "满潜" }
];

const ChartKeys = {
  dps: "平均DPS/HPS",
  s_dps: "技能DPS/HPS",
  s_dmg: "技能总伤害/治疗"
};

const LevelingCost = {4: [2391, 9], 5: [3699, 13], 6: [5874, 21] };

let itemCache = {};

function checkSpecs(tag, spec) {
  let specs = AKDATA.Data.dps_specialtags;
  if ((tag in specs) && (spec in specs[tag]))
    return specs[tag][spec];
  else return false;
}

function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/char_patch_table.json',
    'excel/skill_table.json',
    'excel/item_table.json',
    'excel/uniequip_table.json',
    'excel/battle_equip_table.json',
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    '../customdata/leveling_cost.json',
    '../resources/attributes.js',
    '../customdata/green.json',
    '../customdata/dps_anim.json',
    '../customdata/subclass.json'
  ], load);
}

function queryArkPlanner(mats, callback, ...args) {
  var url = "https://planner.penguin-stats.io/plan";
  var data = {
    required: mats,
    owned: {},
    extra_outc: true,
    exp_demand: false,
    gold_demand: true,
    exclude: ["main_07-13"]
  };
  //console.log("query ArkPlanner ->", JSON.stringify(data, null, 2));
  
  $.ajax({
    type: "post",
    url: url,
    data: JSON.stringify(data, null, 2),
    dataType: "json",
    crossDomain: true,  // 跨域
    success: function (result) {
    //  console.log("<-", result, args);
      callback(result, ...args);
    },
    error: alert
  });
}
 //queryArkPlanner({"赤金": 100});

function buildVueModel() {
  let version = AKDATA.Data.version;
  
  // exclude list
  var excludeList = [];
  for (let id in AKDATA.Data.character_table) {
    let data = AKDATA.Data.character_table[id];
      if (!data.phases || data.phases.length <= 2)
        excludeList.push(id);
    }

  return {
    version,
    excludeList,
    charId: "-",
    chartKey: "dps",
    resultView: {},
    test: {},
    plannerResponse: {},
    recom: {},
    jobs: 0,
    test: "",
    img_char: "/akdata/assets/images/char/char_504_rguard.png",
    txt_char: "请选择",
    txt_gain_title: "提升率分布图 - 平均DPS",
    hash_args: "",
    jsonResult: {}
  };
}

function showVersion() {
  AKDATA.checkVersion(function (ok, v) {
    var remote = `最新版本: ${v.akdata}, 游戏数据: ${v.gamedata} (${v.customdata})`;
    var local = `当前版本: ${AKDATA.Data.version.akdata}, 游戏数据: ${AKDATA.Data.version.gamedata} (${AKDATA.Data.version.customdata})`;
    var whatsnew = `更新内容: ${v.whatsnew} <br> <a href='/akdata/whatsnew'>查看更新日志</a>`;
    if (!ok) {
      pmBase.component.create({
        type: 'modal',
        id: "update_prompt_modal",
        content: [remote, local, whatsnew].join("<br>"),
        width: 800,
        title: "有新数据，请更新",
        show: true,
      });
      $('#vue_version').html(["有新数据，请更新", remote, local].join("<br>"));
    } else {
      $('#vue_version').text(local);
      $("#btn_update_data").text("手动刷新");
      $("#btn_update_data").attr("class", "btn btn-success");
    }
    console.log(v);
  });
}

function load() {
  showVersion();
  $("#btn_report").click(AKDATA.showReport);
  $("#btn_whatsnew").click(AKDATA.showNews);
  AKDATA.patchAllChars();
  
  // build html
  let html = `
<div id="vue_app" class="row">  
  <div class="card mb-2 col-md-12 col-lg-3">
    <div class="card-header">
      <div class="card-title mb-0">干员</div>
    </div>
    <table class="table dps" style="table-layout:fixed; margin-bottom: 0px;">
    <tbody>
      <tr class="dps__row-select"> </tr>
    </tbody>
    </table>
  </div>
  <div class="card mb-2 col-lg-6 col-md-12">
    <div class="card-header">
      <div class="card-title mb-0">升级收益（精2 1级~满级）</div>
    </div>
    <div id="level_table" style="font-size: 1.2vw"></div>
  </div>
  <div class="card mb-2 col-lg-3 col-md-6">
    <div class="card-header">
      <div class="card-title mb-0">子职业模板分析</div>
    </div>
    <div id="subclass"></div>
    <div style="text-align: center">（百分比为和参考干员的属性相似度）</div>
  </div>
  <div class="card mb-2 col-12">
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
   <!-- <div id="chart"></div> -->
   <div id="echarts_chart"> </div>
  </div>
  <div class="card mb-2 col-12">
    <div class="card-header">
      <div class="card-title mb-0">精英化/专精材料（绿票算法）
        <a href="http://ark.yituliu.site/" target="_blank">绿票材料一图流</a>
      </div>
    </div>
    <div id="mats_table"></div>
  </div>
<!--
  <div class="card mb-2 col-12">
    <div class="card-header">
      <div class="card-title mb-0">{{ txt_gain_title }}</div>
    </div>
    <div id="pie_chart" class="row">
    </div>
  </div>    
-->
  <div class="card mb-2 col-12">
    <div class="card-header">
      <a class="card-title mb-0" data-toggle="collapse" data-target="#txt_json">JSON数据（点击展开）</a>
    </div>
    <div id="txt_json" class="col-10 collapse">
      <pre style="white-space: pre-wrap; word-wrap: break-word;">{{ JSON.stringify(jsonResult) }}</pre>
    </div>
  </div>
</div>`;
  let $dps = $(html);

  $dps.find('.dps__row-select').append(`<td>
    <table style="table-layout:fixed; width: 100%; margin-bottom: 0px;">
      <tr>
        <td rowspan="2" style="padding: 0; width: 50%">
          <figure class="figure">
            <img class="img_char figure-img" style="max-width: 80%; height: auto" :src="img_char" @click="selChar"></img>
            <figcaption class="figure-caption" style="max-width: 80%; font-weight:600; font-size: 1vw; color: #000; text-align: center; text-weight: 600">{{ txt_char }}</figcaption>
          </figure>
        </td>
        <td style="padding: 0">
          <button class="btn btn-outline-secondary dps__goto float-right" type="button" v-on:click="goto"><i class="fas fa-search"></i> 详细属性</button>
        </td>
      </tr>
      <tr>
        <td style="padding: 0">
          <button class="btn btn-outline-secondary dps__godps float-right" type="button" v-on:click="godps"><i class="fas fa-calculator"></i> DPS计算</button>
        </td>
      </tr>
    </table>
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
        if (AKDATA.Data.character_table[this.charId]) {
          this.resultView = calculate(this.charId);
          this.img_char = `/akdata/assets/images/char/${this.charId}.png`;
          this.txt_char = AKDATA.Data.character_table[this.charId].name;
          if (this.resultView.rhodes) {
            $("#mats_table").text("集成战略临时干员");
          }
          this.updateLevelingTable();
        }
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
      selChar: function(event) {
        AKDATA.selectCharCallback = function (id) { window.vue_app.charId = id; window.vue_app.changeChar(); }
        AKDATA.showSelectCharDialog(this.excludeList, this.charId);
      },
      updateMats: function() {
        let matsView = {};
        let rv = this.resultView;
        let i = 0, tot = 0;

        /*let costResult = calculateCost(this.charId, pr, this.resultView);
        //this.test = costResult;
        updateCostPlot(costResult, this.chartKey);
*/
        for (var sk in rv.cost) {
          matsView[sk] = {title: rv.skill[sk] || `精英化/模组材料(不含龙门币)`};
          matsView[sk].list = [];
          tot = 0;  
          let base_lv = sk.includes("elite") ? 0 : 7;
          for (i=0; i<rv.mats[sk].length; ++i) {
            var items = Object.keys(rv.mats[sk][i]).map(x => 
              AKDATA.getItemBadge("MATERIAL", itemCache[x].id, rv.mats[sk][i][x])
            );
            let lineTitle = `${base_lv + i} <i class="fas fa-angle-right"></i> ${base_lv + i + 1}`;
            if (sk.includes("elite") && i>=2) {// 专武材料，非等级
              lineTitle = rv.equipName + ` Lv${i-1} (测试)`;
            }
            matsView[sk].list.push([ lineTitle, items, Math.round(rv.cost[sk][i]) ]);
            tot += Math.round(rv.cost[sk][i]);
          }
          console.log(rv.skill[sk], tot);
        }

        // this.test = matsView;
        let matsHtml = "";
        for (var sk in matsView) {
          matsHtml += pmBase.component.create({
            type: 'list',
            card: true,
            title: `${matsView[sk].title}`,
            header: ['等级', '素材', "绿票"],
            list: matsView[sk].list
          });
        }
        $("#mats_table").html(matsHtml);

      },
      updateLevelingTable: function () {
        var db = AKDATA.Data.character_table[this.charId];
        var r = {}; $.extend(r, DefaultAttribute); $.extend(r, Stages["基准"]);
        var ch0 = buildChar(this.charId, db.skills[0].skillId, r);
        r.level = "max";
        var ch1 = buildChar(this.charId, db.skills[0].skillId, r);
        var a0 = AKDATA.attributes.getCharAttributes(ch0), a1 = AKDATA.attributes.getCharAttributes(ch1);

        var gain_pct = [(a1.maxHp - a0.maxHp)/a0.maxHp, (a1.atk - a0.atk)/a0.atk, (a1.def - a0.def)/a0.def];
        var gain = [(a1.maxHp - a0.maxHp), (a1.atk - a0.atk), (a1.def - a0.def)];
        var result = [0, 1, 2].map(x => `+${Math.round(gain[x])} (+${(gain_pct[x]*100).toFixed(1)}%)`);
        result.push(`${a0.baseAttackTime.toFixed(3)} s`);

        let html = pmBase.component.create({
            type: 'list',
            card: false,
            title: `升级属性提升（精二1级->满级）`,
            header: ['HP', '攻击力', '防御力', '基础攻击间隔'],
            list: [result]
          });
        $("#level_table").html(html);
        this.jsonResult["levelUpGain"] = {gain, gain_pct};

        // 模板分析
        var scalar = [...gain_pct.map(x => x*100), a0.baseAttackTime * 1000];
        var sc_result = calcSubClass(scalar, db.profession);
        this.jsonResult["subclass"] = { result: sc_result.view, scalar };

        var chart = c3.generate({
          bindto: "#subclass",
          size: { height: 180 },
          data: {
            type: "gauge",
            columns: sc_result.view
          }
        });
      }
    },
    watch: {
      resultView: function(_new, _old) {
        let cv = buildChartView(_new, this.chartKey);
        //plot(cv);
        plot2(cv);
        let pv = buildPieView(cv);
        //plotPie(pv);
        this.updateMats()
        Object.assign(this.jsonResult, buildJsonView(this, cv, pv));
      },
      chartKey: function(_new, _old) {
        let cv = buildChartView(this.resultView, _new);
        plot2Update(cv);
        let pv = buildPieView(cv);
        //plotPie(pv);
        //updatePlot(cv);
        this.txt_gain_title = `提升率分布图 - ${ChartKeys[_new]}`;
      },

    }
  });

  window.vue_app.hash_args = window.location.hash.replace("#", "").split("/");
  var args = window.vue_app.hash_args;
  console.log("args:", args);
  if (args[0]) {
    window.vue_app.charId = args[0]; window.vue_app.changeChar();
  }
  if (args[1] && Object.keys(ChartKeys).includes(args[1])) {
    window.vue_app.chartKey = args[1];
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

  if (charId == "char_230_savage")
    char.potentialRank = Math.min(char.potentialRank, 2);
  if (charId == "char_4019_ncdeer")
    char.potentialRank = Math.min(char.potentialRank, 0);

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
  if (checkSpecs(charId, "use_token_for_mastery") || checkSpecs(skillId, "use_token_for_mastery"))
    char.options.token = true;
  else char.options.token = false;

  // 模组
  if (recipe.equip) {
    let edb = AKDATA.Data.uniequip_table["equipDict"];
    let equips = Object.keys(edb).filter(x => edb[x].charId == charId && edb[x].unlockLevel > 0);
    // console.log(equips);
    if (equips.length > 0) {
      let eid = equips[equips.length - 1];
      char.equipId = eid;
      char.equipName = edb[eid].uniEquipName;
      window.vue_app.equipId = eid;
      console.log(`equip -> ${eid} ${char.equipName}`);
    }
  }

  return char;
}

function calculate(charId) {
  let db = AKDATA.Data.character_table[charId];
  let itemdb = AKDATA.Data.item_table.items;
  let edb = AKDATA.Data.uniequip_table["equipDict"];
  let recipe = {};
  let enemy = DefaultEnemy;
  let stages = Stages;
  let raidBuff = { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0 };
  let result = {}, mats = {};
  let equipId = null, equipName = null;
  let extraNote = "";

  if (['char_306_leizi', 'char_472_pasngr', 'char_4004_pudd', "char_4025_aprot2"].includes(charId)) {
    enemy.count = 2;
    extraNote = "按2目标计算";
  }

  // calculate dps for each recipe case.
  db.skills.forEach(skill => {
    var entry = {};
    recipe = {}; $.extend(recipe, DefaultAttribute);
    console.log(recipe);
    for (let st in stages) {
      $.extend(recipe, stages[st]);
      var ch = buildChar(charId, skill.skillId, recipe);
      ch.dps = AKDATA.attributes.calculateDps(ch, enemy, raidBuff);
      entry[st] = ch;
      if (ch.equipId) {
        equipId = ch.equipId; equipName = ch.equipName;
      }
    };
    result[skill.skillId] = entry;

    mats[skill.skillId] = skill.levelUpCostCond.map(x => x.levelUpCost);
  });
  mats[1] = db.phases[1].evolveCost;
  mats[2] = db.phases[2].evolveCost;

  // extract result, making it more readable
  // name, skill, stage, damageType, avg, skill, skilldamage, cdr
  let resultView = {
    id: charId,
    name: db.name,
    equipId,
    equipName,
    skill: {},
    stages: stages,
    dps: {},
    notes: {},
    mats: {},
    cost: {},
    extraNote
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
      if (level) {
        level.forEach(x => {
		  var _n = itemdb[x.id].name.replace(" ", "");
          i[_n] = x.count;
          itemCache[_n] = {id: x.id, name: _n, rarity: itemdb[x.id].rarity};
        });
        resultView.mats[k].push(i);
      }
      else resultView["rhodes"] = true;
    });
  };

  resultView.mats[`${charId}_elite`] = [];
  for (let elite=1; elite<=2; elite+=1) {
    if (mats[elite]) {
      let m = {};
      mats[elite].forEach(x => {
        let _nm = itemdb[x.id].name.replace(" ", "");
        itemCache[_nm] = { id: x.id, name: _nm, rarity: itemdb[x.id].rarity };
        m[_nm] = x.count;
      });
      resultView.mats[`${charId}_elite`].push(m);
    }
  }
  if (resultView.equipId) {
    let m = {};
    for (var lv=0; lv < 3; ++lv) {
      edb[resultView.equipId]["itemCost"].forEach(x => {
        if (x.id != "4001") {
          let _nm = itemdb[x.id].name.replace(" ", "");
          itemCache[_nm] = { id: x.id, name: _nm, rarity: itemdb[x.id].rarity };
          m[_nm] = x.count;
          if (x.id != 'mod_unlock_token') m[_nm] = Math.floor(x.count * (1+lv/2));
        }
      });
      resultView.mats[`${charId}_elite`].push({...m});
    }
  }

  // 绿票算法
  var greenTable = AKDATA.Data.green;
  Object.keys(resultView.mats).forEach(k => {
    resultView.cost[k] = resultView.mats[k].map(item => [0, ...Object.keys(item)].reduce((sum, x) => sum + greenTable[x] * item[x]));
  });

  // console.log(window.vue_app.debugPrint(resultView.mats));
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
        entry.push((value - last[skill]).toFixed(1));
      else
        entry.push(value.toFixed(1));
      last[skill] = value;
    }
    columns.push(entry);
    groups.push(stg);
  }
  var x = 0.02, i = 0;
  for (let skill in view.skill) {
    skill_names.push(view.skill[skill]);
    let line = view.notes[skill];
    if (resultView.extraNote.length > 0)
      line += "\n" + resultView.extraNote;
    
    if (view.dps[skill]["满潜"].spType != 8) {
      if (line != "") line += "\n";
      line += `启动技力 ${view.dps[skill]["基准"].s_ssp}s -> ${view.dps[skill]["满潜"].s_ssp}s`;
      console.log(view.dps[skill]["满潜"].spType);
      if (view.dps[skill]["满潜"].s_ssp <= 0)
        line += " （落地点火）";
    }
    notes.push({x: x, y: 20, content: line});
    x+=1;
  }
  //console.log(columns, groups, skill_names, notes);

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
      pattern: [ "#cccccc", "#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ba55d3", "#eea0ee"]
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

function buildPieView(chartView) {
  var view = {};
  for (var i=0; i<chartView.skill_names.length; i+=1) {
    let sk = chartView.skill_names[i];
    view[sk] = [];
    for (var j=1; j<chartView.groups.length; j+=1) {  // skip base value
      view[sk].push([chartView.groups[j], chartView.columns[j][i+1]]);
    }
  }
  return view;
}

function plotPie(pieView) {
  if (!window.chart) window.chart = {};
  window.chart.pie = {};
  var i=0;
  $(`#pie_chart`).html("");
  Object.keys(pieView).forEach(sk => {
    $(`#pie_chart`).append(`
      <div class="text-center col-sm-12 col-md-6 col-lg-4">
        ${sk}
        <div id="pie_${i}"> </div>
      </div>
    `);

    window.chart.pie[sk] = c3.generate({
      bindto: `#pie_${i}`,
      size: { height: 400 },
      data: {
        type: "pie",
        columns: [],
      },
      pie: {
        label: {
          format: function(value, ratio, id) {
            return `${id}\n\n+${Math.round(value)}`;
          }
        }
      },
      zoom: { enabled: false },
      color: {
        pattern: ["#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ba55d3", "#eea0ee"]
      },
      title: sk
    });

    window.chart.pie[sk].load({ columns: pieView[sk] });

    i+=1;
  });
}

function buildJsonView(app, chartView, pieView) {
  return {
    args: { charId: app.charId, chartKey: app.chartKey },
    mats: app.resultView.mats,
    cost: app.resultView.cost,
    base: chartView.columns[0],
    gain: pieView,
    notes: chartView.notes
  }
}

function _dist(x, y) {
  var d = 0;
  for (var i=0; i<x.length; i+=1) {
    d += (x[i] - y[i]) * (x[i] - y[i]);
  }
  return Math.sqrt(d);
}

function calcSubClass(x, prof) {
  var sub_db = AKDATA.Data.subclass;
  var dists = Object.keys(sub_db).filter(
    k => sub_db[k].prof == prof).map(
    k => [k, _dist(x, sub_db[k].feat)]).sort(
      (x, y) => x[1] - y[1]
    );
  var d_1 = dists.map(x => 1 / (x[1] + 0.0001));
  var s = d_1.reduce((sum, x) => sum + x);
  var rate = dists.map((x, index) => [x[0], d_1[index] / s]);
  console.log(rate);
  var view = [];
  var groups = [];
  var patterns = [ "#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ee82ee", "#e6e6fa" ];
  s = 1;
  rate.forEach(x => {
    if (x[1] >= 0.1) {
      view.push([x[0], (x[1]*100).toFixed(2)]);
      groups.push(x[0]);
      s -= x[1];
    }
  });
  var pats = patterns.slice(0, view.length);
  /*
  if (s>0) {
    view.push(["其他", (s*100).toFixed(2)]);
    groups.push("其他");
    pats.push("#cccccc");
  }*/

  return {
    rate, view, groups, pats
  };
}

var _baseValue = null;
var _lineCount = 0;

function plot2(chartView) {
  var myChart = echarts.init($("#echarts_chart")[0]);
  /* chartView是按行的
  技能 1 2 3 skill_names
  groups
  基准 * * * columns[i]
  满级 * * *
  专1  * * *
  专2  * * *
  专3  * * *
  模组 * * *
  满潜 * * *
  */
  var dataset = { 
    source: [
      ["技能", ...chartView.skill_names],
      ...chartView.columns,
      ["注记", ...(chartView.notes.map(x => x.content))]  // 把注记也放在这里，使用自定义数据系列显示
    ]
  };
  console.log(dataset);
  //console.log(chartView);

  var seriesTemplate = {
    type: 'bar',
    stack: 'total',
    label: {
      show: true,
      //fontWeight: 'bold',
      fontSize: 14,
      formatter: function (args) {
        //console.log(args); return "";
        var v = parseFloat(args.value[args.seriesIndex+1]);
        return v > 80 ? `${args.seriesName}\n+${Math.round(v)}`: "";
      }
    },
    emphasis: { focus: 'series' },
    blur: { itemStyle: { opacity: 0.3 } },
    seriesLayoutBy: 'row',
    barWidth: '50%',
    itemStyle: {
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowBlur: 3,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
    }
  };
  var series = [];
  for (var i=0; i<chartView.groups.length; ++i)
    series.push(seriesTemplate);

  // notes
  var notesTemplate = {
    type: 'custom',
    seriesLayoutBy: 'row',
    encode: {x: null, y: 0, tooltip: 0},  // x 不映射，y 对应表头(第0行)
    renderItem: function (params, api) {
      var value = api.value(8).replace(/\n/g, "; ").replace(/; ; /g, "\n"); // 第8行为注记值
      var index = params.dataIndex;  // 第几行
      //console.log({params, api, ids, value});

      var barLayout = api.barLayout({   // 计算系列高度
        barGap: '30%',
        barCategoryGap: '20%',
        barWidth: '50%',
        count: params.dataInsideLength
      });
      var point = api.coord([20, api.value(0)]);  // 放在坐标轴的对应位置
      //console.log(barLayout[index].bandWidth);
      return {
        type: 'text',
        x: point[0],
        y: point[1] - 10,
        style: { text: value, font: '14px sans-serif' }
      }
    },
    z: 10
  };
  series.push(notesTemplate);

  // 指定图表的配置项和数据
  var option = {
    toolbox: {
      show: true,
      feature: {
        dataView: {},
        saveAsImage: {}
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        // Use axis to trigger tooltip
        type: 'shadow' // 'shadow' as default; can also be 'line' or 'shadow'
      }, 
      valueFormatter: function (value) {
        var v = parseFloat(value);
        if (!_baseValue && v>=0) {
          _baseValue = v; // 暂存第一个值作为基准值
          _lineCount = 0;
          return value;
        } else {
          if (isNaN(v)) {  // 最后一行
            _baseValue = null;
            return "";
          } else if (_lineCount < 4) {
            var pct = v*100/_baseValue;
            ++_lineCount;  // 只显示前四行的百分比
            return `${value} / ${pct.toFixed(1)}%`;
          } else {
            ++_lineCount;
            return value;
          }
        }
      },
    },
    legend: { top: 'bottom' },
    grid: {
      left: '0px',
      right: '5%',
      top: '3%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: ChartKeys[window.vue_app.chartKey],
      axisLine: { show: true },
      axisLabel: {
        fontSize: 14,
        margin: 5
      }
    },
    yAxis: {
      type: 'category',
      axisLine: { show: true },
      axisLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        margin: 5,
        formatter: function (v, i) {
          return `${["I", "II", "III"][i]}-${v}`;
        }
      }
    },
    dataset: dataset,
    series: series,
    color: [ "#eeeeee", "#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ba55d3", "#eea0ee"]
  };

  // 使用刚指定的配置项和数据显示图表。
  myChart.setOption(option);
  myChart.resize({height: chartView.skill_names.length * 180});

  window.eChart = myChart;
}

function plot2Update(chartView) {
  var dataset = { 
    source: [
      ["技能", ...chartView.skill_names],
      ...chartView.columns,
      ["注记", ...(chartView.notes.map(x => x.content))]  // 把注记也放在这里，使用自定义数据系列显示
    ]
  };
  window.eChart.setOption({
    dataset: dataset,
    xAxis: { name: ChartKeys[window.vue_app.chartKey] }
 });
}

pmBase.hook.on('init', init);
