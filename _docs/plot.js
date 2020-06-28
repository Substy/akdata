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
  "count": [...Array(11).keys()]
};

// build html
let page_html = `
<div id="vue_app">  
  <div class="card">
    <div class="card-header">
      <b>DPS曲线</b>
      <span class="float-right">
        <span class="mx-2"><b>变量</b></span>
        <input type="radio" id="btn_def" value="def" v-model="enemyKey">
        <label for="btn_def">敌人护甲</label>
        <input type="radio" id="btn_emr" value="magicResistance" v-model="enemyKey">
        <label for="btn_avg">法抗</label>
        <input type="radio" id="btn_count" value="count" v-model="enemyKey">
        <label for="btn_avg">数量</label>
        <span class="mx-2"><b>统计量</b></span>
        <input type="radio" id="btn_avg" value="dps" v-model="chartKey">
        <label for="btn_avg">平均dps</label>
        <input type="radio" id="btn_skill" value="s_dps" v-model="chartKey">
        <label for="btn_avg">技能dps</label>
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
          <button class="btn btn-outline-secondary" type="button" v-on:click="addChar"><i class="fas fa-plus"></i></button>
        </span>
      </div>
    </div>
    <table class="table" style="table-layout:fixed">
      <tbody>
        <tr>
          <td><b>角色</b>
            <select class="form-control" v-model="charId" @change="setChar">
              <option value="-">-</option>
              <optgroup v-for="(v, k) in charList" :label="k">
                <option v-for="char in v" :value="char.charId">
                  {{ char.name }}
                </option>
              </optgroup> 
            </select>
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
        <td><b>条件</b><br>
          <label class="form-check-label" style="margin-left: 30px" v-for="opt in opt_options">
            <input class="form-check-input" type="checkbox" checked :value="opt.tag" :id="opt.tag" v-model="details.options">
            {{ opt.text }}
          </label>
        </td>
        </tr>
      </tbody>
    </table>
    <div class="card m-3">
      <div class="card-header">
        <button class="btn btn-block btn-light text-left" type="button" data-toggle="collapse" data-target="#plot_list" aria-expanded="true" aria-controls="plot_list">
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
              <p class="card-text"> {{ explainChar(x).text }} </p>
              <p class="card-text"> {{ explainChar(x).option }} </p>
            </div>
          </div>
      </div>
    </div> <!-- card -->
  </div> <!-- card -->
  
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
              <td><b>合约攻击力Tag(+/-x%)</b><br>
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
  <!--
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">调试信息</div>
    </div>
    <pre>{{ resultCache }}</pre>
    <pre>{{ chartKey }}</pre>
    <pre>{{ raidBuff }}</pre>
    <pre>{{ enemy }}</pre>

    ------
    已添加的干员
    <pre>{{ plotList.map(x => explainChar(x)) }}</pre>
  </div>
  -->
</div>`;

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
};

function getHashCode(obj) {
  var str = JSON.stringify(obj, null, 2);
  return str.split("").reduce(function(a, b) {a=((a<<5)-a)+b.charCodeAt(0); return a&a}, 0);
}

var charDB, skillDB, optionDB;

// 载入vue需要的数据
function buildVueModel() {
  let version = AKDATA.Data.version;
  let charList = {}; // 选人菜单内容
  let plotList = [];  // 图表里的人物信息
  charDB = AKDATA.Data.character_table;
  skillDB = AKDATA.Data.skill_table;
  optionDB = AKDATA.Data.dps_options;

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
    opt_phase: [], // 下拉框选项
    opt_level: [],
    opt_pot: [0, 1, 2, 3, 4, 5],
    opt_skill: [],
    opt_skillLv: [],
    opt_options: [],
    charId: "-",
    chartKey: "dps",
    enemyKey: "def",
    test: {},
    details: { phase: 2, level: 90, potential: 5, skillId: "-", skillLevel: 9, favor: 200, options: [] },
    enemy: { def: 0, magicResistance: 0, count: 1 },
    raidBuff: { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0},
    resultCache: {},
    chartView: [],
  };
}

function load() {
  let version = AKDATA.Data.version;
  if (version.gamedata != AKDATA.currentVersion || version.akdata != AKDATA.akVersion) {
    $('#vue_version').text(`有新数据，请点击[更新数据]更新`);
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
        // console.log(char, char.options);
        var levelStr = `精${char.phase} ${char.level}级, 潜能${char.potential+1}, `;
        var skillStr = skillDB[char.skillId] ? `${skillDB[char.skillId].levels[0].name} 等级${char.skillLevel+1}` : "";
        var optionStr = char.options.map(x => optionDB.tags[x].displaytext).join("/");
        return { name: charDB[char.charId].name, text: levelStr + skillStr, option: optionStr }
      },
      setChar: function(event) {
        let phases = charDB[this.charId].phases.length;
        this.opt_phase = [...Array(phases).keys()];
        this.details.phase = phases-1;
        this.setPhase();

        var opts = (optionDB.char[this.charId] || []).map(
          x => ({ tag: x, text: optionDB.tags[x].displaytext })
        );
        opts.push({ tag: "buff", text: "计算团辅"});
        var sel_opts = [];
        opts.forEach(x => {
          if (x.tag != "token") sel_opts.push(x.tag);         
        });
        this.opt_options = opts;
        this.details.options = sel_opts;
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
              s_dps: x[k].skill.dps
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
          var title = info.name + " " + info.text;
          if (!counts[title]) counts[title] = 0;
          counts[title] += 1;
        }
        
        for (var i=0; i<this.plotList.length; ++i) {
          var info = this.explainChar(this.plotList[i]);
          var title = info.name + " " + info.text;
          
          if (counts[title] >= 2) title += " " + info.option;
          var values = Object.keys(this.chartView[i]).map(k => this.chartView[i][k][this.chartKey]);
          cols.push([title, ...values]);
        }
        return cols;
      },
    },
    watch: {
      results: function() {
        this.buildChartView();
      },
      columns: function() {      
        window.chart.load({ columns: this.columns, unload: true });
      },
      chartKey: function() {      
        window.chart.load({ columns: this.columns, unload: true });
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
    },
    grid: {
      x: { show: true },
      y: { show: true }
    },
    zoom: { enabled: true },
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
    options: {}
  };
  info.options.forEach(x => { char_obj.options[x] = true; });
  let enemy_obj = {
    def: parseFloat(enemy.def),
    magicResistance: parseFloat(enemy.magicResistance),
    count: parseFloat(enemy.count)
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
