const DamageColors = ['black','blue','limegreen','gold','aqua'];
const DefaultAttribute = {
  phase: 2,
  level: "max",
  favor: 200,
  potential: 5,  // 0-5
  skillLevel: 9,  // 0-9,
  equip: false,
  equipLevel: 1,
  options: { cond: true, crit: true, stack: true, warmup: true, charge: true, equip: true, far: true, block: true }
};
const DefaultEnemy = { def: 0, magicResistance: 0, count: 1, hp: 0 };

const Stages = {
  "2017": { level: 1, potential: 0, skillLevel: 6, desc: "精2 1级 潜能1 技能7级" },
  "满级": { level: "max", desc: "精2 满级 潜能1 技能7级" },
  "专1": { skillLevel: 7, desc: "满级 潜能1 专精1" },
  "专2": { skillLevel: 8, desc: "满级 潜能1 专精2" },
  "专3": { skillLevel: 9, desc: "满级 潜能1 专精3" },
  "模组1": { equip: true, desc: "满级 潜能1 专精3 模组1级" },
  "模组2": { equipLevel: 2, desc: "满级 潜能1 专精3 模组2级" },
  "模组3": { equipLevel: 3, desc: "满级 潜能1 专精3 模组3级" },
  "满潜": { potential: 5, desc: "满级 满潜 专精3 模组3级"},
};

//const StageSeq = ['基准', '满级', '专1', '专2', '专3', '模组1', '模组2', '模组3', '满潜'];

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
const EliteLMB = {3: [10000], 4: [15000, 60000], 5: [20000, 120000], 6: [30000, 180000]};

let itemCache = {};

function checkSpecs(tag, spec, filename="dps_specialtags") {
  let specs = AKDATA.Data[filename];
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
    '../customdata/itemValue.json',
    '../customdata/dps_anim.json',
    '../customdata/subclass.json',
    '../customdata/mastery.json'
  ], load);
}

function queryArkPlanner(mats, callback, ...args) {
  let url = "https://planner.penguin-stats.io/plan";
  let data = {
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
  let excludeList = [];
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
    jsonResult: {},
    equipId: null,
    equipList: [],
    equip_hint: "",
    calculating: false,
    pivotStageId: 0,
    stageKeys: [0, ...Object.keys(Stages)]
  };
}

function showVersion() {
  AKDATA.checkVersion(function (ok, v) {
    let remote = `最新版本: ${v.akdata}, 游戏数据: ${v.gamedata} (${v.customdata})`;
    let local = `当前版本: ${AKDATA.Data.version.akdata}, 游戏数据: ${AKDATA.Data.version.gamedata} (${AKDATA.Data.version.customdata})`;
    let whatsnew = `更新内容: ${v.whatsnew} <br> <a href='/akdata/whatsnew'>查看更新日志</a>`;
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
      try {
        local = `新增干员：`;
        AKDATA.new_op.forEach(op => {
          local += `<a href='#${op}'>${AKDATA.Data.character_table[op].name}</a>   `;
        });
      } catch (e) {
        local = "请点击[手动刷新]更新数据";
      }
      $('#vue_version').html(local);
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
        专精收益（以精2 1级 7级技能为基准计算）{{ equip_hint }}
        <span class="float-right">
          <input type="radio" id="btn_avg" value="dps" v-model="chartKey">
          <label for="btn_avg" style="margin: 5px">平均dps/hps</label>
          <input type="radio" id="btn_skill" value="s_dps" v-model="chartKey">
          <label for="btn_skill" style="margin: 5px">技能dps/hps</label>
          <input type="radio" id="btn_total" value="s_dmg" v-model="chartKey">
          <label for="btn_total" style="margin: 5px">技能总伤害/治疗</label>
        </span>
        <span class="float-right" style="padding-right: 50px">
          <template v-for="e in equipList">
            <input type="radio" :id="'btn_' + e.id" :value="e.id" v-model="equipId">
            <label :for="'btn_' + e.id" style="margin: 5px">{{ e.name }}</label>
          </template>
        </span>
      </div>
    </div>
   <div id="echarts_chart"> </div>
  </div>
  <div class="card mb-2 col-12">
    <div class="card-header">
      <div class="card-title mb-0">专精提升率对比</div>
    </div>
    <div class="toolbar mb-2" role="toolbar">
      <span class="ml-2">选择比较基准练度</span>
      <div class="btn-group ml-4 btn-group-toggle" data-toggle="buttons">
        <template v-for="st in Array(stageKeys.length).keys()">
          <label class="btn btn-outline-primary">
            <input type="radio" name="btn_comp" :value="st" v-model="pivotStageId">
            {{ stageKeys[st] }}          
          </label> 
        </template>
      </div>
    </div>
    <div id="echarts_chart_2"> </div>
  </div>
  <div class="card mb-2 col-12">
    <div class="card-header">
      <div class="card-title mb-0">专精材料（绿票算法）
        <a href="http://yituliu.site/" target="_blank">绿票材料一图流</a>
      </div>
    </div>
    <div id="mats_table"></div>
  </div>
  <div class="card mb-2 col-12">
    <div class="card-header">
      <div class="card-title mb-0">精英化/模组材料（不含模组升级材料）</div>
    </div>
    <div id="elite_table"></div>
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
        <td rowspan="4" style="padding: 0; width: 50%">
          <figure class="figure">
            <img class="img_char figure-img" style="max-width: 80%; height: auto" :src="img_char" @click="selChar"></img>
            <figcaption class="figure-caption" style="max-width: 80%; font-weight:600; font-size: 1vw; color: #000; text-align: center; text-weight: 600">{{ txt_char }}</figcaption>
          </figure>
        </td>
        <td style="padding: 0">
          <button class="btn btn-outline-secondary dps__goto float-right w-75" type="button" v-on:click="goto"><i class="fas fa-address-card"></i> 详细属性</button>
        </td>
      </tr>
      <tr>
        <td style="padding: 0">
          <button class="btn btn-outline-secondary dps__goequip float-right w-75" type="button" v-on:click="goequip"><i class="fas fa-share-alt"></i> 模组信息</button>
        </td>
      </tr>
      <tr>
        <td style="padding: 0">
          <button class="btn btn-outline-secondary dps__godps float-right w-75" type="button" v-on:click="godps"><i class="fas fa-calculator"></i> DPS计算</button>
        </td>
      </tr>
      <tr>
        <td style="padding: 0">
          <button class="btn btn-outline-secondary dps__goprts float-right w-75" type="button" v-on:click="goprts"><i class="fas fa-search"></i>　PRTS　</button>
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
          this.img_char = `https://akdata-site.oss-cn-guangzhou.aliyuncs.com/assets/images/char/${this.charId}.png`;
          this.txt_char = AKDATA.Data.character_table[this.charId].name;
          if (this.resultView.rhodes) {
            $("#mats_table").text("集成战略临时干员");
            $("#elite_table").text("集成战略临时干员");
          }
          this.updateLevelingTable();
          let uptime = checkSpecs(this.charId, "mod_update_time", "mastery");
          this.equip_hint = (uptime ? `模组升级收益已更新: ${uptime}` : "(模组升级收益暂未更新)");
          if (!this.equipId) this.equip_hint = ""; 
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
      goequip: function(event) {
        window.open(`../equip/#${this.equipId}`, '_blank'); 
      },
      goprts: function(event) {
        window.open(`http://prts.wiki/w/${this.txt_char}`, '_blank'); 
      },
      selChar: function(event) {
        AKDATA.selectCharCallback = function (id) { window.vue_app.charId = id; window.vue_app.changeChar(); }
        AKDATA.showSelectCharDialog(this.excludeList, this.charId);
      },
      updateMats: function() {
        let matsView = {};
        let rv = this.resultView;
        let i = 0;

        //let costResult = calculateCost(this.charId, pr, this.resultView);
        //updateCostPlot(costResult, this.chartKey);

        for (let sk in rv.cost) {
          matsView[sk] = {title: rv.skill[sk] };
          matsView[sk].list = [];
          let base_lv = sk.includes("elite") ? 0 : 7;
          for (i=0; i<rv.mats[sk].length; ++i) {
            let items = Object.keys(rv.mats[sk][i]).map(x => 
              AKDATA.getItemBadge("MATERIAL", itemCache[x].id, rv.mats[sk][i][x])
            );
            let lineTitle = `${base_lv + i} <i class="fas fa-angle-right"></i> ${base_lv + i + 1}`;
            matsView[sk].list.push([ lineTitle, items, Math.round(rv.cost[sk][i]) ]);
          }
        }

        let matsHtml = "";
        for (let sk in matsView) {
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
      updateEliteMats: function() {
        let list = [];
        let rv = this.resultView;
        let i = 0;
        let edb = AKDATA.Data.uniequip_table["equipDict"];

        for (let key in rv.cost_e) { 
          for (i=0; i<rv.mats_e[key].length; ++i) {
            let items = [];
            let lmb = 0;
            let lineTitle = key == "elite" ? `${i} - ${i+1}` : `${edb[key].uniEquipName} Lv${i+1}`;
            Object.keys(rv.mats_e[key][i]).forEach(k => {
              if (k == "龙门币")
                lmb = rv.mats_e[key][i][k];
              else
                items.push(AKDATA.getItemBadge("MATERIAL", itemCache[k].id, rv.mats_e[key][i][k]));
            });
            list.push([ lineTitle, items, lmb, Math.round(rv.cost_e[key][i]) ]);
          }
        }

        let html = pmBase.component.create({
            type: 'list',
            card: true,
            title: ``,
            header: ['等级', '素材', '龙门币', '绿票'],
            list
        });
        $("#elite_table").html(html);
      },
      updateLevelingTable: function () {
        let db = AKDATA.Data.character_table[this.charId];
        let r = {}; $.extend(r, DefaultAttribute); $.extend(r, Stages["2017"]);
        let ch0 = buildChar(this.charId, db.skills[0].skillId, r);
        r.level = "max";
        let ch1 = buildChar(this.charId, db.skills[0].skillId, r);
        let a0 = AKDATA.attributes.getCharAttributes(ch0), a1 = AKDATA.attributes.getCharAttributes(ch1);

        let gain_pct = [(a1.maxHp - a0.maxHp)/a0.maxHp, (a1.atk - a0.atk)/a0.atk, (a1.def - a0.def)/a0.def];
        let gain = [(a1.maxHp - a0.maxHp), (a1.atk - a0.atk), (a1.def - a0.def)];
        let result = [0, 1, 2].map(x => `+${Math.round(gain[x])} (+${(gain_pct[x]*100).toFixed(1)}%)`);
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
        let scalar = [...gain_pct.map(x => x*100), a0.baseAttackTime * 1000];
        let sc_result = calcSubClass(scalar, db.profession);
        this.jsonResult["subclass"] = { result: sc_result.view, scalar };

        let chart = c3.generate({
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
        plotPivotCompare(cv);
        let pv = buildPieView(cv);
        //plotPie(pv);
        this.updateMats();
        this.updateEliteMats();
        Object.assign(this.jsonResult, buildJsonView(this, cv, pv));
      },
      chartKey: function(_new, _old) {
        let cv = buildChartView(this.resultView, _new);
        plot2Update(cv);
        //let pv = buildPieView(cv);
        //plotPie(pv);
        //updatePlot(cv);
        //this.txt_gain_title = `提升率分布图 - ${ChartKeys[_new]}`;
      },
      equipId: function(_new, _old) {
        if (!this.calculating)  // 避免嵌套
          this.resultView = calculate(this.charId);
      },
      pivotStageId: function(_new, _old) {
        let cv = buildChartView(this.resultView, this.chartKey);
        plotPivotCompare(cv);
      }
    }
  });

  window.vue_app.hash_args = window.location.hash.replace("#", "").split("/");
  let args = window.vue_app.hash_args;
  console.log("args:", args);
  if (args[0]) {
    window.vue_app.charId = args[0]; window.vue_app.changeChar();
  }
  if (args[1] && Object.keys(ChartKeys).includes(args[1])) {
    window.vue_app.chartKey = args[1];
  }
  
}

window.onhashchange = function () {
  var charId_hash = window.location.hash.replace(/\#/g, "");
  //console.log(charId_hash);
  if (charId_hash.length > 0) {
    window.vue_app.charId = charId_hash; window.vue_app.changeChar(); 
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
  if (recipe.level == "max" || recipe.level > maxLevel)
    char.level = maxLevel;
  else
    char.level = recipe.level;
  char.name = db.name;
  char.skillName = skilldb.levels[char.skillLevel].name;
  char.potentialRank = Math.min(char.potentialRank, db.maxPotentialLevel);
  //console.log(char);
  let _opts = AKDATA.Data.dps_options.char[charId];
  if (checkSpecs(charId, "use_token_for_mastery") || checkSpecs(skillId, "use_token_for_mastery")
      || checkSpecs(charId, "token", "mastery"))
    char.options.token = true;
  else char.options.token = false;

  // 模组
  let edb = AKDATA.Data.uniequip_table["equipDict"];
  let equips = Object.keys(edb).filter(x => edb[x].charId == charId);
  if (equips.length > 0) {
    window.vue_app.equipList = equips.filter(x => edb[x].unlockLevel > 0)
                                    .map(x => ({ id: x, name: edb[x].uniEquipName }));
    // 默认equipId
    if (!window.vue_app.equipId || edb[window.vue_app.equipId].charId != charId)
      window.vue_app.equipId = equips[equips.length-1];
    let eid = (recipe.equip ? window.vue_app.equipId : equips[0]);
    char.equipId = eid;
    char.equipName = edb[eid].uniEquipName;
    char.equipLevel = recipe.equipLevel;
    //console.log(`equip -> ${eid} ${char.equipName}`);
  } else {
    window.vue_app.equipId = null;
    window.vue_app.equipList = [];
  }

  //console.log(JSON.stringify({char, recipe}));

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
  let extraNotes = [];

  let masterySpecs = AKDATA.Data.mastery[charId] || {};

  if ("ecount" in masterySpecs) {
    enemy.count = masterySpecs.ecount;
    extraNotes.push(`${enemy.count}目标`);
  } else enemy.count = 1;

  if ("emr" in masterySpecs) {
    enemy.magicResistance = masterySpecs.emr;
    extraNotes.push(`${enemy.magicResistance}法抗`);
  }

  if ("edef" in masterySpecs) {
    enemy.def = masterySpecs.edef;
    extraNotes.push(`${enemy.def}防御`);
  }

  window.vue_app.calculating = true;

  // calculate dps for each recipe case.
  db.skills.forEach(skill => {
    let entry = {};
    recipe = {}; $.extend(recipe, DefaultAttribute);
    for (let st in Stages) {
      $.extend(recipe, stages[st]);
      let ch = buildChar(charId, skill.skillId, recipe);
      ch.dps = AKDATA.attributes.calculateDps(ch, enemy, raidBuff);
      if (ch.options.token && !extraNotes.includes("召唤物")) {
        extraNotes.push("召唤物");
      }
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
    mats_e: {},
    cost: {},
    cost_e: {},
    extraNotes
  };
  for (let k in result) {
    resultView.skill[k] = result[k]["满潜"].skillName;
    resultView.notes[k] = result[k]["满潜"].dps.note;
    resultView.dps[k] = {};
    for (let st in Stages) {
      let entry = result[k][st].dps;
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
    }
    resultView.mats[k] = [];
    mats[k].forEach(level => {
      let i = {};
      if (level) {
        level.forEach(x => {
		  let _n = itemdb[x.id].name.replace(" ", "");
          i[_n] = x.count;
          itemCache[_n] = {id: x.id, name: _n, rarity: itemdb[x.id].rarity};
        });
        resultView.mats[k].push(i);
      }
      else resultView["rhodes"] = true;
    });
  };

  resultView.mats_e = { elite: [] };
  for (let elite=1; elite<=2; elite+=1) {
    if (mats[elite]) {
      let m = {};
      mats[elite].forEach(x => {
        let _nm = itemdb[x.id].name.replace(" ", "");
        itemCache[_nm] = { id: x.id, name: _nm, rarity: itemdb[x.id].rarity };
        m[_nm] = x.count;
      });
      m["龙门币"] = EliteLMB[db.rarity+1][elite-1];
      resultView.mats_e.elite.push({...m});
    }
  }
  if (window.vue_app.equipList) {
    window.vue_app.equipList.forEach(entry => {
      let eid = entry.id;
      resultView.mats_e[eid] = [];
      for (let lv=1; lv <= 3; ++lv) {
        let m = {};
        edb[eid]["itemCost"][lv].forEach(x => {
          if (!["mod_update_token_1", "mod_update_token_2"].includes(x.id)) {
            let _nm = itemdb[x.id].name.replace(" ", "");
            itemCache[_nm] = { id: x.id, name: _nm, rarity: itemdb[x.id].rarity };
            m[_nm] = x.count;
          }
        });
        resultView.mats_e[eid].push({...m});
      }
    })
  }

  // 绿票算法
  let greenTable = {};
  AKDATA.Data.itemValue.forEach(item => {
    if (item.version == "auto0.625")
      greenTable[item.itemName] = item.itemValueGreen;
  });
  //console.log(greenTable);
  const calculateGreen = (matObj) => 
    [0, ...Object.keys(matObj)].reduce((sum, x) =>
      (x!=0 && x!="龙门币" && x in greenTable) ? sum + greenTable[x] * matObj[x] : sum
    );

  Object.keys(resultView.mats).forEach(k => {
    resultView.cost[k] = resultView.mats[k].map(calculateGreen);
  });
  
  Object.keys(resultView.mats_e).forEach(k => {
    resultView.cost_e[k] = resultView.mats_e[k].map(calculateGreen);
  });
  // console.log(JSON.stringify(resultView.mats_e), JSON.stringify(resultView.cost_e));
  window.vue_app.calculating = false;
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
  let columns = [], groups = [], skill_names = [], notes = [], pivots = [];
  let last = {};
  for (let stg in Stages) {
    let entry = [stg];
    for (let skill in view.skill) {
      k = (view.dps[skill][stg].damageType == 2) ? HealKeys[key] : key; 
      let value = view.dps[skill][stg][k];
      if (skill in last)
        entry.push((value - last[skill]).toFixed(1));
      else
        entry.push(value.toFixed(1));
      last[skill] = value;
      if (stg == window.vue_app.stageKeys[window.vue_app.pivotStageId])
        pivots.push(value);
    }
    columns.push(entry);
    groups.push(stg);
  }
  let x = 0.02, i = 0;
  for (let skill in view.skill) {
    skill_names.push(view.skill[skill]);
    let line = view.notes[skill];
    if (resultView.extraNotes.length > 0)
      line += "\n" + resultView.extraNotes.join("/");
    
    if (view.dps[skill]["满潜"].spType != 8) {
      if (line != "") line += "\n";
      line += `启动技力 ${view.dps[skill]["2017"].s_ssp}s -> ${view.dps[skill]["满潜"].s_ssp}s`;
      if (view.dps[skill]["满潜"].s_ssp <= 0)
        line += " （落地点火）";
    }
    notes.push({x: x, y: 20, content: line});
    x+=1;
  }
  //console.log(columns, groups, skill_names, notes);

  return { columns, groups, skill_names, notes, pivots };
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
    $(".c3-chart-bar.c3-target-2017").css("opacity", 0.4);
  }, 100);
}

function updatePlot(chartView) {
  window.chart["chart"].load({ columns: chartView.columns, groups: chartView.groups });
  setTimeout(function() {
    $(".c3-chart-bar.c3-target-2017").css("opacity", 0.4);
  }, 200);
}

function buildPieView(chartView) {
  let view = {};
  for (let i=0; i<chartView.skill_names.length; i+=1) {
    let sk = chartView.skill_names[i];
    view[sk] = [];
    for (let j=1; j<chartView.groups.length; j+=1) {  // skip base value
      view[sk].push([chartView.groups[j], chartView.columns[j][i+1]]);
    }
  }
  return view;
}

function plotPie(pieView) {
  if (!window.chart) window.chart = {};
  window.chart.pie = {};
  let i=0;
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
        pattern: ["#7c1f66",
        "#a03989", "#c558be", "#e9adce",
        "#ff7e5a", "#fdaa67", "#ffc78f",
        "#aaaaaa"].reverse()
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
  let d = 0;
  for (let i=0; i<x.length; i+=1) {
    d += (x[i] - y[i]) * (x[i] - y[i]);
  }
  return Math.sqrt(d);
}

function calcSubClass(x, prof) {
  let sub_db = AKDATA.Data.subclass;
  let dists = Object.keys(sub_db).filter(
    k => sub_db[k].prof == prof).map(
    k => [k, _dist(x, sub_db[k].feat)]).sort(
      (x, y) => x[1] - y[1]
    );
  let d_1 = dists.map(x => 1 / (x[1] + 0.0001));
  let s = d_1.reduce((sum, x) => sum + x);
  let rate = dists.map((x, index) => [x[0], d_1[index] / s]);
  //console.log(rate);
  let view = [];
  let groups = [];
  let patterns = [ "#4169e1", "#ff7f50", "#ffd700", "#dc143c", "#ee82ee", "#e6e6fa" ];
  s = 1;
  rate.forEach(x => {
    if (x[1] >= 0.1) {
      view.push([x[0], (x[1]*100).toFixed(2)]);
      groups.push(x[0]);
      s -= x[1];
    }
  });
  let pats = patterns.slice(0, view.length);
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

let _baseValue = null;
let _lineCount = 0;

function plot2(chartView) {
  let myChart = echarts.init($("#echarts_chart")[0]);
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
  let dataset = { 
    source: [
      ["技能", ...chartView.skill_names],
      ...chartView.columns,
      ["注记", ...(chartView.notes.map(x => x.content))]  // 把注记也放在这里，使用自定义数据系列显示
    ]
  };
  //console.log(dataset);
  //console.log(chartView);

  let seriesTemplate = {
    type: 'bar',
    stack: 'total',
    label: {
      show: true,
      //fontWeight: 'bold',
      fontSize: 15,
      formatter: function (args) {
        let sum = args.value.map(x => parseFloat(x) || 0).reduce((s, x) => s+x);
        let v = parseFloat(args.value[args.seriesIndex+1]);
        return v/sum > 0.04 ? `${args.seriesName}\n+${Math.round(v)}`: "";
      }
    },
    emphasis: { focus: 'series' },
    blur: { itemStyle: { opacity: 0.3 } },
    seriesLayoutBy: 'row',
    barWidth: '35%',
    itemStyle: {
      shadowColor: 'rgba(0, 0, 0, 0.4)',
      shadowBlur: 3,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
    }
  };
  let series = [];
  for (let i=0; i<chartView.groups.length; ++i)
    series.push(seriesTemplate);

  // notes
  let notesTemplate = {
    type: 'custom',
    seriesLayoutBy: 'row',
    encode: {x: null, y: 0, tooltip: 0},  // x 不映射，y 对应表头(第0行)
    renderItem: function (params, api) {
      let value = api.value(10).replace(/\n/g, "; ").replace(/; ; /g, "\n"); // 第10行为注记值
      let index = params.dataIndex;  // 第几行
      //console.log({params, api, ids, value});

      let barLayout = api.barLayout({   // 计算系列高度
        barGap: '30%',
        barCategoryGap: '20%',
        barWidth: '50%',
        count: params.dataInsideLength
      });
      let point = api.coord([20, api.value(0)]);  // 放在坐标轴的对应位置
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

  let extraNotes = window.vue_app.resultView.extraNotes;
  let extraTitle = (extraNotes.length > 0 ? `- ${extraNotes.join(" ")}` : "");

  // 指定图表的配置项和数据
  let option = {
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
        let v = parseFloat(value);
        if (!_baseValue && v>=0) {
          _baseValue = { base: v, total: v }; // 暂存第一个值作为基准值
          _lineCount = 0;
          return value;
        } else {
          if (isNaN(v)) {  // 最后一行
            let total = _baseValue.total;
            _baseValue = null;
            return `总 ${Math.round(total)}`;
          } else if (_lineCount < 8) {
            let pct = v*100/_baseValue.base;
            let prefix = (v>0 ? "+" : "");
            _baseValue.total += v;
            ++_lineCount;  // 只显示前8行的百分比
            return `${prefix}${Math.round(v)} / ${Math.round(pct)}%`;
          } else {
            ++_lineCount;
            return Math.round(v);
          }
        }
      },
    },
    legend: {
      top: 'bottom',
    },
    grid: {
      left: '0px',
      right: '5%',
      top: '3%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: `${window.vue_app.txt_char} - ${ChartKeys[window.vue_app.chartKey]} ${extraTitle}`,
      nameLocation: "middle",
      nameGap: -24,
      nameTextStyle: {
        fontSize: 24,
        fontWeight: 600
      },
      axisLine: { show: true },
      minorTick: { show: true },
      splitLine: {
        lineStyle: { color: "#e0e0e0" }
      },
      minorSplitLine: {
        show: true,
        lineStyle: { color: "#f4f4f4" }
      },
      axisLabel: {
        fontSize: 16,
        fontWeight: 600,
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
    color: ["#7c1f66",
            "#a03989", "#c558be", "#e9adce",
            "#ff7e5a", "#fdaa67", "#ffc78f",
            "#fff8bc","#eeeeee"].reverse()
  };

  // 使用刚指定的配置项和数据显示图表。
  myChart.setOption(option);
  myChart.resize({height: chartView.skill_names.length * 200});

  window.eChart = myChart;
}

function plot2Update(chartView) {
  let dataset = { 
    source: [
      ["技能", ...chartView.skill_names],
      ...chartView.columns,
      ["注记", ...(chartView.notes.map(x => x.content))]  // 把注记也放在这里，使用自定义数据系列显示
    ]
  };
  let extraNotes = window.vue_app.resultView.extraNotes;
  let extraTitle = (extraNotes.length > 0 ? `- ${extraNotes.join(" ")}` : "");
  window.eChart.setOption({
    dataset: dataset,
    xAxis: { name: `${window.vue_app.txt_char} - ${ChartKeys[window.vue_app.chartKey]} ${extraTitle}` }
 });
}

function plotPivotCompare(chartView) {
  let colors = ["#7c1f66", "#a03989", "#c558be", "#e9adce", "#ff7e5a",
                "#fdaa67", "#ffc78f", "#fff8bc", "#eeeeee"].reverse();

  // 处理chartView基于pivot的平移
  // pivotStageId == 0时不进行平移
  if (window.vue_app.pivotStageId > 0) {
    console.log(window.vue_app.resultView);
    let part = window.vue_app.pivotStageId - 1;
    for (let col=1; col<=3; ++col) {
      let pivot = chartView.pivots[col-1];
      for (let i=0; i<part; ++i)
        chartView.columns[i][col] = -chartView.columns[i+1][col];
      chartView.columns[part][col] = 0;
      for (let i=0; i<chartView.columns.length; ++i)
        chartView.columns[i][col] /= pivot;
    }
    // 倒置
    // (把前半部分拆下来倒置再插入回去)
    chartView.columns.splice(0, 0, ...chartView.columns.splice(0, part).reverse());
    chartView.groups.splice(0, 0, ...chartView.groups.splice(0, part).reverse());
    colors.splice(0, 0, ...colors.splice(0, part).reverse());
    console.log("New ->", chartView);
  }

  let myChart = echarts.init($("#echarts_chart_2")[0]);
  myChart.clear();
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
  let dataset = { 
    source: [
      ["技能", ...chartView.skill_names],
      ...chartView.columns,
      ["注记", ...(chartView.notes.map(x => x.content))]  // 把注记也放在这里，使用自定义数据系列显示
    ]
  };
  //console.log(dataset);
  console.log(chartView);

  let seriesTemplate = {
    type: 'bar',
    stack: 'total',
    label: {
      show: true,
      //fontWeight: 'bold',
      fontSize: 15,
      formatter: function (args) {
        if (window.vue_app.pivotStageId == 0) {
          let sum = args.value.map(x => parseFloat(x) || 0).reduce((s, x) => s+x);
          let v = parseFloat(args.value[args.seriesIndex+1]);
          return v/sum > 0.04 ? `${args.seriesName}\n+${Math.round(v)}`: "";
        } else {
          let v = parseFloat(args.value[args.seriesIndex+1]) * 100;
          let prefix = (v>0) ? "+" : "";
          args.seriesName = args.dimensionNames[args.seriesIndex+1];
        // return Math.abs(v/sum) > 0.04 ? `${args.seriesName}\n${prefix}${Math.round(v)}`: "";
          return Math.abs(v) > 1 ? `${args.seriesName}\n${prefix}${Math.round(v)}%`: "";
        }
      }
    },
    emphasis: { focus: 'series' },
    blur: { itemStyle: { opacity: 0.3 } },
    seriesLayoutBy: 'row',
    barWidth: '35%',
    itemStyle: {
      shadowColor: 'rgba(0, 0, 0, 0.4)',
      shadowBlur: 3,
      shadowOffsetX: 1,
      shadowOffsetY: 2,
    }
  };
  let series = [];
  for (let i=0; i<chartView.groups.length; ++i)
    series.push(seriesTemplate);

  // notes
  let notesTemplate = {
    type: 'custom',
    seriesLayoutBy: 'row',
    encode: {x: null, y: 0, tooltip: 0},  // x 不映射，y 对应表头(第0行)
    renderItem: function (params, api) {
      let value = api.value(10).replace(/\n/g, "; ").replace(/; ; /g, "\n"); // 第10行为注记值
      let index = params.dataIndex;  // 第几行
      //console.log({params, api, ids, value});

      let barLayout = api.barLayout({   // 计算系列高度
        barGap: '30%',
        barCategoryGap: '20%',
        barWidth: '50%',
        count: params.dataInsideLength
      });
      let point = api.coord([20, api.value(0)]);  // 放在坐标轴的对应位置
      //console.log(barLayout[index].bandWidth);
      return {
        type: 'text',
        x: point[0],
        y: point[1] - 10,
        style: { text: "", font: '14px sans-serif' }  // 不显示note
      }
    },
    z: 10
  };
  series.push(notesTemplate); 

  let extraNotes = [...window.vue_app.resultView.extraNotes];
  if (window.vue_app.pivotStageId > 0) {
    extraNotes.push(`与${window.vue_app.stageKeys[window.vue_app.pivotStageId]}相比的提升率`);
  }
  let extraTitle = (extraNotes.length > 0 ? `- ${extraNotes.join(" ")}` : "");

  // 指定图表的配置项和数据
  let option = {
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
        if (!isNaN(value)) {
          if (window.vue_app.pivotStageId == 0) {
            return Math.round(value);
          } else {
            let v = Math.round(parseFloat(value) * 1000)/10;
            let prefix = (v>0 ? "+" : "");
            return `${prefix}${v}%`;
          }
        } else return "";
      },
    },
    legend: {
      top: 'bottom',
    },
    grid: {
      left: '0px',
      right: '5%',
      top: '3%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: `${window.vue_app.txt_char} - ${ChartKeys[window.vue_app.chartKey]} ${extraTitle}`,
      nameLocation: "middle",
      nameGap: -24,
      nameTextStyle: {
        fontSize: 24,
        fontWeight: 600
      },
      axisLine: { show: true },
      minorTick: { show: true },
      majorTick: { show: false },
      splitLine: {
        lineStyle: { color: "#e0e0e0" }
      },
      minorSplitLine: {
        show: true,
        lineStyle: { color: "#f4f4f4" }
      },
      axisLabel: {
        fontSize: 16,
        fontWeight: 600,
        margin: 5,
        formatter: function (value, index) {
          return window.vue_app.pivotStageId == 0 ? value : (Math.round(value*100) + "%");
        }
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
    color: colors
  };

  // 使用刚指定的配置项和数据显示图表。
  myChart.setOption(option);
  myChart.resize({height: chartView.skill_names.length * 200});

  window.eChart2 = myChart;
}

pmBase.hook.on('init', init);
