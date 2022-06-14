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

const EnemySeries = {
  "def": [...Array(26).keys()].map(x => x * 100),
  "magicResistance":  [...Array(11).keys()].map(x => x * 10),
  "count": [1,2,3,4,5,6,7,8,9,10]
};

const LabelNames = {
  "def": "防御",
  "magicResistance": "法抗",
  "count": "数量",
  "dps":  "平均DPS",
  "s_dps": "技能DPS",
  "s_dmg": "技能总伤害"
};

// build html
let page_html = `
<div id="vue_app">  
  <div class="card">
    <div class="card-header">
      <b>DPS曲线</b>
      <span class="float-right">
        <span class="mx-2"><b>敌人变量</b></span>
        <input type="radio" id="btn_def" value="def" v-model="enemyKey">
        <label for="btn_def">防御</label>
        <input type="radio" id="btn_emr" value="magicResistance" v-model="enemyKey">
        <label for="btn_avg">法抗</label>
        <input type="radio" id="btn_count" value="count" v-model="enemyKey">
        <label for="btn_avg">数量</label>
        <span class="mx-2"><b>统计量</b></span>
        <input type="radio" id="btn_avg" value="dps" v-model="chartKey">
        <label for="btn_avg">平均dps</label>
        <input type="radio" id="btn_skill" value="s_dps" v-model="chartKey">
        <label for="btn_avg">技能dps</label>
        <input type="radio" id="btn_dmg" value="s_dmg" v-model="chartKey">
        <label for="btn_avg">技能总伤害</label>
      </span>
    </div>
    <div class="card-body">
      <div id="chart"></div>
  <!--  <pre>{{ debugPrint(chartView) }}</pre> -->
  <!-- {{ columns }} -->
    
    </div>
  </div> <!-- card -->
  <div class="card">
    <div class="card-header">
      <div class="card-title mb-0">
        选择干员，之后点击添加
        <span class="float pl-4">
          <button class="btn btn-primary" type="button" v-on:click="addChar"><i class="fas fa-plus"></i></button>
        </span>
      </div>
    </div>
    <table class="table" style="table-layout:fixed">
      <tbody>
        <tr>
          <td align="center" rowspan="2">
          <figure class="figure">
            <img class="img_char figure-img" style="max-width: 70%; height: auto;" :src="img_char" @click="selChar"></img>
            <figcaption class="figure-caption" style="max-width: 70%; font-weight:600; font-size: 1vw; color: #000; text-align: center; text-weight: 600">{{ txt_char }}</figcaption>
          </figure>
          </td>
        <td><b>精英</b>
          <select id="sel_phase" class="form-control" v-model="details.phase" @change="setPhase">
            <option v-for="x in opt_phase" :value="x">{{ x }}</option>
          </select>
        </td>
        <td><b>等级</b>
          <select id="sel_level" class="form-control" v-model="details.level">
            <option v-for="x in opt_level" :value="x">{{ x }}</option>
          </select>
        </td>
        <td><b>潜能(满信赖)</b>
          <select id="sel_pot" class="form-control" v-model="details.potential">
            <option v-for="x in opt_pot" :value="x">{{ x+1 }}</option>
          </select>
        </td>
        </tr>
        <tr>
        <td><b>技能</b>
          <select id="sel_skill" class="form-control" v-model="details.skillId">
            <option v-for="x in opt_skill" :value="x.id">{{ x.name }}</option>
          </select>
        </td>
        <td><b>技能等级</b>
          <select id="sel_skilllv" class="form-control" v-model="details.skillLevel">
            <option v-for="x in opt_skillLv" :value="x">{{ x+1 }}</option>
          </select>
        </td>
        <td><b>模组</b>
          <select id="sel_equip" class="form-control" v-model="details.equipId">
            <option v-for="x in opt_equip" :value="x.id">{{ x.name }}</option>
          </select>
        </td>
        <td><b>模组等级</b>
          <select id="sel_equiplv" class="form-control" v-model="details.equipLevel">
            <option v-for="x in opt_equipLv" :value="x">{{ x }}</option>
          </select>
        </td>
        <td><b>条件</b><br>
          <label v-for="opt in opt_options" class="form-check-label" data-toggle="tooltip"
                 :title="opt.tooltip" style="margin-left: 30px" >
            <input class="form-check-input" type="checkbox" checked :value="opt.tag" :id="opt.tag" v-model="details.options">
            {{ opt.text }}
          </label>
        </td>
        </tr>
      </tbody>
    </table>
  </div> <!-- card -->
  <br>
  <div class="card">
    <div class="card-header">
      <button class="btn btn-block btn-success text-left" type="button" data-toggle="collapse" data-target="#plot_list" aria-expanded="true" aria-controls="plot_list">
        已添加的干员
      </button>
    </div>
    <div id="plot_list" class="collapse show">
      <div class="card-body">
        <div class="row">
          <div class="card col-md-3 p-2" v-for="(x, index) in plotList">
            <p class="card-title"><b>
              {{ explainChar(x).name }}
              <button type="button" class="btn btn-outline-danger float-right" @click="delChar(index)">删除</button>
            </b></p>
            <p class="card-text" v-html="explainChar(x).text"> </p>
            <p class="card-text"> {{ explainChar(x).option }} </p>
          </div>
        </div>
    </div>
  </div> <!-- card -->
  <br>
  <div class="card">
    <div class="card-body">
      <button class="button btn-primary" type="button" data-toggle="collapse" data-target="#tbl_enemy" aria-expanded="false" aria-controls="tbl_enemy">
        敌人属性设置
      </button>
      <button class="button btn-primary" type="button" data-toggle="collapse" data-target="#tbl_raidBuff" aria-expanded="false" aria-controls="tbl_raidBuff">
        团队Buff设置
      </button>
      <div class="collapse" id="tbl_enemy">
        <table class="table" style="table-layout:fixed">
          <tbody>
            <tr><th><b>敌人属性</b></th>
              <td><b>防御力</b><br>
                <input id="txt_edef" type="text" v-model="enemy.def">
              </td>
              <td><b>法抗</b><br>
                <input id="txt_emr" type="text" v-model="enemy.magicResistance">
              </td>
              <td><b>数量</b><br>
                <input id="txt_ecount" type="text" v-model="enemy.count">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="collapse" id="tbl_raidBuff">
        <table class="table" style="table-layout:fixed">
          <tbody>
            <tr><th><b>团队Buff</b></th>
              <td><b>攻击力(+x)</b><br>
                <input id="txt_atk" type="text" v-model="raidBuff.atk">
              </td>
              <td><b>攻击力(+x%)</b><br>
                <input id="txt_atkpct" type="text" v-model="raidBuff.atkpct">
              </td>
              <td><b>攻击速度(+x%)</b><br>
                <input id="txt_ats" type="text" v-model="raidBuff.ats">
              </td>
            </tr>
            <tr><th></th>
              <td><b>技力恢复(+x%)</b><br>
                <input id="txt_cdr" type="text" v-model="raidBuff.cdr">
              </td>
              <td><b>合约/保全攻击力(+/-x%)</b><br>
                <input id="txt_batk" type="text" v-model="raidBuff.base_atk">
              </td>
              <td><b>伤害倍率(damage_scale/x%)</b><br>
                <input id="txt_scale" type="text" v-model="raidBuff.damage_scale">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div> <!-- card-body -->
  </div> <!-- card -->

  <div class="card mt-2 col-12">
    <div class="card-header">
      <a class="card-title mb-0" data-toggle="collapse" data-target="#txt_json">JSON数据（点击展开）</a>
    </div>
    <div id="txt_json" class="collapse col-10">
      <pre style="white-space: pre-wrap; word-wrap: break-word; overflow:auto">{{ JSON.stringify(jsonResult) }}</pre>
    </div>
  </div>

</div>`;

function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/char_patch_table.json',
    'excel/skill_table.json',
    'excel/uniequip_table.json',
    'excel/battle_equip_table.json',
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    '../customdata/dps_anim.json',
    '../resources/attributes.js',
  ], load);
};

function getHashCode(obj) {
  var str = JSON.stringify(obj, null, 2);
  return str.split("").reduce(function(a, b) {a=((a<<5)-a)+b.charCodeAt(0); return a&a}, 0);
}

var charDB, skillDB, optionDB, equipDB;

// 载入vue需要的数据
function buildVueModel() {
  let version = AKDATA.Data.version;
  let plotList = [];  // 图表里的人物信息
  charDB = AKDATA.Data.character_table;
  skillDB = AKDATA.Data.skill_table;
  optionDB = AKDATA.Data.dps_options;
  equipDB = AKDATA.Data.uniequip_table["equipDict"];

  // exclude list
  var excludeList = [];
  for (let id in AKDATA.Data.character_table) {
    let data = AKDATA.Data.character_table[id];
      if (!data.skills || data.skills.length == 0)
        excludeList.push(id);
    }

  return {
    version,
    plotList,
    excludeList,
    opt_phase: [], // 下拉框选项
    opt_level: [],
    opt_pot: [0, 1, 2, 3, 4, 5],
    opt_skill: [],
    opt_skillLv: [],
    opt_options: [],
    opt_equip: [],
    opt_equipLv: [1, 2, 3],
    charId: "-",
    chartKey: "dps",
    enemyKey: "def",
    test: {},
    details: { phase: 2, level: 90, potential: 5, skillId: "-", skillLevel: 9, favor: 200, options: [], equipId: "", equipLevel: 3 },
    enemy: { def: 0, magicResistance: 0, count: 1 },
    raidBuff: { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0},
    resultCache: {},
    chartView: [],
    img_char: "/akdata/assets/images/char/char_504_rguard.png",
    txt_char: "请选择",
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
        if (charDB[this.charId]) {
          var charInfo = {charId: this.charId, ...this.details};
          var hash = getHashCode(charInfo);
          if (this.plotList.some(x => (getHashCode(x) == hash))) {
            alert("相同干员已经存在");
          }
          else 
            this.plotList.push(charInfo);
        }
      },
      delChar: function(index=-1) {
        this.plotList.splice(index, 1);
      },
      explainChar: function(char) {
        // { charId, phase: 2, level: 90, potential: 5, skillId: "-", skillLevel: 9, options: [] }
        var levelStr = `精${char.phase} ${char.level}级, 潜能${char.potential+1}, `;
        var skillStr = skillDB[char.skillId] ? `${skillDB[char.skillId].levels[0].name} 等级${char.skillLevel+1}` : "";
        var equipStr = (char.equipId.length>0) ? `${equipDB[char.equipId].uniEquipName} 等级${char.equipLevel}<br>` : "";
        var optionStr = char.options.map(x => optionDB.tags[x] ? 
          optionDB.tags[x].displaytext : 
          optionDB.cond_info[x.replace("cond", char.charId)].text
        ).join("/");
        return { name: charDB[char.charId].name, text: levelStr + equipStr + skillStr, option: optionStr }
      },
      explainArgs: function() {
        // enemy: { def: 0, magicResistance: 0, count: 1 },
        var line = `${LabelNames[this.enemyKey]} `;
        if (this.enemy.def) line += `/ 防御 ${this.enemy.def}`;
        if (this.enemy.magicResistance) line += `/ 法抗 ${this.enemy.magicResistance}`;
        if (this.enemy.count > 1) line += `/ ${this.enemy.count} 目标`;
        return line;
      },
      selChar: function(event) {
        AKDATA.selectCharCallback = function (id) { window.vue_app.charId = id; window.vue_app.setChar(); }
        AKDATA.showSelectCharDialog(this.excludeList, this.charId);
      },
      setChar: function(event) {
        let charData = charDB[this.charId];
        let phases = charData.phases.length;
        this.txt_char = charData.name;
        this.img_char = `/akdata/assets/images/char/${this.charId}.png`;
        this.opt_phase = [...Array(phases).keys()];
        this.details.phase = phases-1;
        this.setPhase();

        var opts = (optionDB.char[this.charId] || []).map(
          x => {
            if (x.startsWith("cond")) {
              // June 14: add wildcard cond support
              let suffix = x.replace("cond", "");
              let tooltip = "", text = "";
              if ((this.charId + suffix) in optionDB.cond_info) {
                let which = optionDB.cond_info[this.charId + suffix];
                
                let talent = null;
                if (typeof(which) == "number")
                  talent = charData.talents[which-1];
                else if (which == "trait")
                  talent = charData.trait;
                else if (which.text) {
                  text = "触发 - " + which.text;
                  tooltip = which.tooltip;
                }
      
                if (talent) {
                  text = "触发 - " + talent.candidates[0].name;
                  if (which == "trait") {
                    text = "触发 - 特性";
                  }
                }
              } else tooltip = `触发条件${suffix}`;
              return { tag: x, text, tooltip };
            } else {
              return { tag: x, text: optionDB.tags[x].displaytext, tooltip: optionDB.tags[x].explain };
            }
          });
        opts.push({ tag: "buff", text: "计算团辅", tooltip: ""});
        var sel_opts = [];
        opts.forEach(x => {
          if (x.tag != "token") sel_opts.push(x.tag);         
        });
        this.opt_options = opts;
        this.details.options = sel_opts;
        
        var equips = Object.keys(equipDB).filter(x => equipDB[x].charId == this.charId);
        this.opt_equip = equips.map(x => ({ id: x, name: equipDB[x].uniEquipName }));
        this.details.equipId = (equips.length > 0) ? equips[equips.length-1] : "";
      },
      setPhase: function(event) {
        let maxLv = charDB[this.charId].phases[this.details.phase].maxLevel;
        this.opt_level = [...Array(maxLv).keys()].map(x => x+1);
        this.details.level = maxLv;
        this.setSkill();
      },
      setSkill: function() {
        let skills=[], slv = 0;
        charDB[this.charId].skills.forEach((skill, sid) => {
          if (this.details.phase >= skill.unlockCond.phase) {
            let name = skillDB[skill.skillId].levels[0].name;
            skills.push({id: skill.skillId, name: name});
            slv = skillDB[skill.skillId].levels.length;
          }
        });
        slv = Math.min(slv, this.details.phase*3 + 4);
        if (slv == 0)
          this.details.skillId = "-";
        else
          this.details.skillId = skills[skills.length-1].id;
        this.opt_skill = skills;
        this.opt_skillLv = [...Array(slv).keys()];
        this.details.skillLevel = slv-1;
      },
      debugPrint: function(obj) {
        //console.log(JSON.stringify(obj, null, 2));
        return JSON.stringify(obj, null, 2);
      },
      goto: function(event) {
        window.open(`../character/#!/${this.charId}`, '_blank'); 
      },
      buildChartView: function() {
        this.chartView = this.results.map(x => {
          var d = {};
          Object.keys(x).forEach(k => {
            d[k] = {
              dps: x[k].globalDps,
              s_dps: Math.round(x[k].skill.dps * 100)/100,
              s_dmg: Math.round(x[k].skill.totalDamage * 100)/100
            };
          });
          return d;
        });
      }

    },
    computed: {
      results: {
        //cache: false,
        get: function() {
          var new_result = [];
          this.plotList.forEach(x => {
            var args = buildArgs(x, this.enemy, this.raidBuff, this.enemyKey);
            var hash = getHashCode(args);
            // console.log(args.enemyKey, EnemySeries[this.enemyKey]);
            if (!this.resultCache[hash]) {
              this.resultCache[hash] = AKDATA.attributes.calculateDpsSeries(args.char, args.enemy, args.raidBuff, args.enemyKey, EnemySeries[args.enemyKey]);
            }
            new_result.push(this.resultCache[hash]);
          });
          return new_result;
        }
      },
      columns: function () {
        var cols = [];
        var counts = {};
        cols.push(["x", ...EnemySeries[this.enemyKey]]);
        for (var i=0; i<this.plotList.length; ++i) {
          var info = this.explainChar(this.plotList[i]);
          var title = info.name + " " + info.text.replace(/<br>/g, " ");
          if (!counts[title]) counts[title] = 0;
          counts[title] += 1;
        }
        
        for (var i=0; i<this.plotList.length; ++i) {
          var info = this.explainChar(this.plotList[i]);
          var title = info.name + " " + info.text.replace(/<br>/g, " ");
          
          if (counts[title] >= 2) title += " " + info.option;
          var values = Object.keys(this.chartView[i]).map(k => this.chartView[i][k][this.chartKey]);
          cols.push([title, ...values]);
        }
        this.jsonResult = {
          chars: this.plotList,
          args: {enemyKey: this.enemyKey, chartKey: this.chartKey}, 
          result: cols};
        return cols;
      },
    },
    watch: {
      results: function() {
        this.buildChartView();
      },
      columns: function() {      
        window.chart.load({
          columns: this.columns,
          unload: true
        });
        window.chart.axis.labels({ x: this.explainArgs(), y: LabelNames[this.chartKey] });
      },
      chartKey: function() {  
        this.buildChartView();
        window.chart.load({
          columns: this.columns,
          unload: true
        });
        window.chart.axis.labels({x: this.explainArgs(), y: LabelNames[this.chartKey]});
      }, 
    }
  });

  // init chart
  window.chart = c3.generate({
    bindto: "#chart",
    size: { height: 600 },
    data: {
      x: "x",
      columns: [],
    },
    axis: {
      x: { label: {
              text: LabelNames[window.vue_app.enemyKey],
              position: "inner-center"
           },
         },
      y: { label: {
              text: LabelNames[window.vue_app.chartKey],
              position: "outer-middle"
           },
         }
    },
    grid: {
      x: { show: true },
      y: { show: true }
    },
    zoom: { enabled: false },
  });

}

// adapt info obj to calculateDps() function
function buildArgs(info, enemy, raidBuff, key) {
  let char_obj = {
    charId: info.charId,
    skillId: info.skillId,
    phase: info.phase,
    level: info.level,
    favor: info.favor,
    potentialRank: info.potential,
    skillLevel: info.skillLevel,
    options: {},
    equipId: info.equipId,
    equipLevel: info.equipLevel
  };
  info.options.forEach(x => { char_obj.options[x] = true; });
  let enemy_obj = {
    def: parseFloat(enemy.def) || 0,
    magicResistance: parseFloat(enemy.magicResistance) || 0 ,
    count: parseFloat(enemy.count) || 1
  };
  Object.keys(raidBuff).forEach(k => { raidBuff[k] = parseFloat(raidBuff[k]); });
  return {
    char: char_obj,
    enemy: enemy_obj,
    raidBuff,
    enemyKey: key
  };
}

pmBase.hook.on('init', init);
