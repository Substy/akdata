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

function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/char_patch_table.json',
    'excel/skill_table.json',
    '../version.json',
    '../customdata/dps_specialtags_v2.json',
    '../customdata/dps_options.json',
    '../resources/dps_actions.js',
    '../resources/dpsv2.js'
  ], load);
}

const charColumnCount = $(document).width() <= 1400 ? 2 : 4;
const Characters = new Array(charColumnCount);

let markdown = new window.showdown.Converter();
markdown.setOption("simpleLineBreaks", true);
markdown.setOption("headerLevelStart", 4);
markdown.setOption("tables", true);
markdown.setOption("tablesHeaderId", true);

pmBase.hook.on('init', init);

// build html
let page_html = `
<div id="vue_app">  
  <div class="card">
    <div class="card-header">
      <div class="card-title mb-0">
        选择干员，之后点击
        <span class="float"><button class="button btn-primary" type="button" v-on:click="addChar"><i class="fas fa-plus"></i></button></span>
        添加
        <span class="float-right pl-4">
          <button class="button btn-primary" type="button" data-toggle="collapse" data-target="#tbl_enemy" aria-expanded="false" aria-controls="tbl_enemy">
            敌人属性设置
          </button>
          <button class="button btn-primary" type="button" data-toggle="collapse" data-target="#tbl_raidBuff" aria-expanded="false" aria-controls="tbl_raidBuff">
            团队Buff设置
          </button>
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
    </div> <!-- collapse -->
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
    </div> <!-- collapse -->
  </div> <!-- card -->

  <div class="card">
    <div class="card-header" data-toggle="collapse" data-target="#plot_list" aria-expanded="true" aria-controls="plot_list">
        <h5>计算结果</h5>
        (测试版本可能有错误，请以原版计算结果为准)
    </div>
    <div id="plot_list" class="collapse show">
      <div class="card-body row">
          <div class="form-inline mb-2 mt-2" style="width: 100%" v-for="(x, index) in plotList">
            <div class="media" style="width: 22%">
              <img class="media-object rounded mr-2" style="width: 35%" :src="charImgUrl(x.charId)">
              <div class="media-body">
                <h5>
                  {{ explainChar(x).name }}
                  <button type="button" class="button btn-outline-danger ml-2 rounded" style="font-size: small" @click="delChar(index)">删除</button>
                </h5>
                <b>{{ explainChar(x).skillStr }}</b><br>
                {{ explainChar(x).levelStr }}<br>
                
                <div v-html="explainChar(x).option"></div>
              </div>
            </div>  <!-- media -->
            <div style="flex: 0 0 78%">
              <table class="table mb-0" style="width: 100%; text-align: center"><tbody>
                <tr>
                  <th>{{ getResult(x).g_dps_title }}</th>
                  <th>{{ getResult(x).s_dps_title }}</th>
                  <th>{{ getResult(x).n_dps_title }}</th>
                  <th>{{ getResult(x).s_dmg_title }}</th>
                  <th>技能攻击</th>               
                  <th>循环周期</th>
                  <th>攻击间隔</th> 
                  <th>启动时间</th>
                  <th>计算过程</th>
                </tr>
                <tr>
                  <td><h5><font :color="getResult(x).s_color">
                    <span v-html="getResult(x).g_dps_text"></span>
                  </font></h5></td>
                  <td><h5><font :color="getResult(x).s_color">
                    <span v-html="getResult(x).s_dps_text"></span>
                  </font></h5></td>
                  <td><h5><font :color="getResult(x).n_color">
                    <span v-html="getResult(x).n_dps_text"></span>
                  </font></h5></td>
                  <td><h5><font :color="getResult(x).s_color">
                    <span v-html="getResult(x).s_dmg_text"></span>
                  </font></h5></td>
                  <td><font :color="getResult(x).s_color">
                    <span v-html="getResult(x).s_atk_text"></span>
                  </font></td>
                  <td><span v-html="getResult(x).period_text"></span></td>
                  <td>
                    <h5>{{ getResult(x).s_time.frameTime.toFixed(3) }} s</h5>
                    {{ getResult(x).s_time.frame }} 帧
                  </td>
                  <td>
                    <h5>{{ getResult(x).start.toFixed(1) }} s</h5>
                    {{ getResult(x).s_rot.startSp }} sp
                  </td>
                  <td><a href="#" @click="showDetail(x)">点击显示</a></td>
                </tr>
              </tbody></table>
              <div v-if="getResult(x).note.length>0" class="ml-4">说明：<span v-html="getResult(x).note.join('; ')"></span></div>
            </div>
          </div> <!-- v-for -->
    </div>
  </div> <!-- card -->
    
  <!--
  <div class="card mb-2">
    <div class="card-header">
      <div class="card-title mb-0">调试信息</div>
    </div>
    <pre>{{ enemy }}</pre>

    ------
    已添加的干员
    <pre>{{  }}</pre>
  </div>
  -->
</div>`;

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
    test: {},
    details: { phase: 2, level: 90, potential: 5, skillId: "-", skillLevel: 9, favor: 200, options: [] },
    enemy: { def: 0, magicResistance: 0, count: 1 },
    raidBuff: { atk: 0, atkpct: 0, ats: 0, cdr: 0, base_atk: 0, damage_scale: 0},
    resultCache: {},
    calcCache: {},
    chartView: [],
  };
}

function showVersion() {
  AKDATA.checkVersion(function (ok, v) {
    var remote = `最新版本: ${v.akdata}, 游戏数据: ${v.gamedata} (${v.customdata})`;
    var local = `当前版本: ${AKDATA.Data.version.akdata}, 游戏数据: ${AKDATA.Data.version.gamedata} (${AKDATA.Data.version.customdata})`;
    if (!ok) {
      pmBase.component.create({
        type: 'modal',
        id: "update_prompt_modal",
        content: [remote, local].join("<br>"),
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
        // console.log(char, char.options);
        var levelStr = `精${char.phase} ${char.level}级, 潜能${char.potential+1} `;
        var skillStr = skillDB[char.skillId] ? `${skillDB[char.skillId].levels[0].name} 等级${char.skillLevel+1}` : "";
        var arr = char.options.map(x => optionDB.tags[x].displaytext);
        if (arr.includes("计算团辅"))
          arr.splice(arr.indexOf("计算团辅"));
        else arr.push("不计算团辅");
        var colorKey = arr.map(x => (
          ["不计算团辅", "计算召唤物数据", "距离惩罚"].includes(x) ? "warning" : "info"));
        return { name: charDB[char.charId].name, levelStr, skillStr,
                 option: [...Array(arr.length).keys()].map(x =>
                          `<span class="badge badge-${colorKey[x]}">${arr[x]}</span>`
                          ).join("\n") };
      },
      setChar: function(event) {
        let phases = charDB[this.charId].phases.length;
        this.opt_phase = [...Array(phases).keys()];
        this.details.phase = phases-1;
        this.setPhase();

        var opts = [];
        optionDB.char[this.charId].forEach(x => {
          if (x != "crit")
            opts.push({ tag: x, text: optionDB.tags[x].displaytext });
        });
        opts.push({ tag: "buff", text: "计算团辅"});
        var sel_opts = [];
        opts.forEach(x => {
          if (x.tag != "token") sel_opts.push(x.tag);         
        });
        sel_opts.push("crit");
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
      charImgUrl: function (charId) {
        return `../assets/images/char/${charId}.png`;
      },
      calculate: function () {
        this.plotList.forEach(x => {
          var args = buildArgs(x, this.enemy, this.raidBuff, this.enemyKey);
          var hash = getHashCode(args);
          if (!this.resultCache[hash]) {
            console.log(`-- ${args.char.charId} | ${args.char.skillId} | #${hash} --`);
            let calc = new AKDATA.Dps.DpsCalculator();
            calc.calculateDps(args.char, args.enemy, args.raidBuff);
            this.resultCache[hash] = calc.explain();
            this.calcCache[hash] = calc;

            var ret = this.resultCache[hash];
            // add dps/hps string
            ret.g_dps_title = "平均DPS";
            ret.s_dps_title = "技能DPS";
            ret.n_dps_title = "普攻DPS";
            ret.s_dmg_title = "技能伤害";
            ret.g_dps_text = Math.round(ret.g_dps);
            ret.s_dps_text = Math.round(ret.s_dps);
            ret.n_dps_text = Math.round(ret.n_dps);
            ret.s_dmg_text = Math.round(ret.s_dmg);
            ret.s_color = DamageColors[ret.s_type];
            ret.n_color = DamageColors[ret.n_type];

            if (ret.g_hps != 0) {
              ret.g_dps_title = (ret.g_dps == 0 ? "平均HPS" : "平均DPS/HPS");
              ret.g_dps_text = (ret.g_dps == 0 ? Math.round(ret.g_hps) : `DPS: ${Math.round(ret.g_dps)}<br>HPS: ${Math.round(ret.g_hps)}`);

              ret.s_dps_title = (ret.s_dps == 0 ? "技能HPS" : "技能DPS/HPS");
              ret.s_dps_text = (ret.s_dps == 0 ? Math.round(ret.s_hps) : `DPS: ${Math.round(ret.s_dps)}<br>HPS: ${Math.round(ret.s_hps)}`);

              ret.n_dps_title = (ret.n_dps == 0 ? "普攻HPS" : "普攻DPS/HPS");
              ret.n_dps_text = (ret.n_dps == 0 ? Math.round(ret.n_hps) : `DPS: ${Math.round(ret.n_dps)}<br>HPS: ${Math.round(ret.n_hps)}`);

              ret.s_dmg_title = (ret.s_dmg == 0 ? "技能治疗" : "技能伤害/治疗");
              ret.s_dmg_text = (ret.s_dmg == 0 ? Math.round(ret.s_heal) : `伤害: ${Math.round(ret.s_dmg)}<br>治疗: ${Math.round(ret.s_heal)}`);
            }
            
            ret.period_text = `技能: ${ret.s_rot.duration.toFixed(1)} s`;
            if (ret.s_rot.flags.warmup)
              ret.period_text = `技能: 永续<br>(以1800s计算)`;
            else if (ret.s_rot.flags.passive)
              ret.period_text = `技能: 被动`;
            if (ret.s_rot.flags.auto)
              ret.period_text += "<br>落地点火";
            if (ret.s_rot.flags.instant)
              ret.period_text += "<br>瞬发";
            ret.period_text += `<br>普攻: ${ret.n_rot.duration.toFixed(1)} s`;
            if (ret.n_rot.flags.attack)
              ret.period_text += `<br>(${ret.n_rot.totalAttackCount} 次攻击)`;
            else if (ret.n_rot.flags.hit)
              ret.period_text += `<br>受击回复`;
            if (ret.prep > 0) ret.period_text += `<br>准备: ${ret.prep} s`;
            if (ret.stun > 0) ret.period_text += `<br>晕眩: ${ret.stun} s`;

            ret.s_atk_text = `攻击力: ${Math.round(ret.s_atk)}<br>攻击次数: ${ret.s_rot.totalAttackCount}`;
            if (ret.s_rot.critAttackCount > 0)
              ret.s_atk_text += `<br>暴击: ${ret.s_rot.critAttackCount}`;
            ret.n_atk_text = `攻击力: ${Math.round(ret.n_atk)}<br>攻击次数: ${ret.n_rot.totalAttackCount}`;
            if (ret.n_rot.critAttackCount > 0)
              ret.n_atk_text += `<br>暴击: ${ret.n_rot.critAttackCount}`;
          }
        });
      },
      getResult: function (x) {
        var args = buildArgs(x, this.enemy, this.raidBuff, this.enemyKey);
        var hash = getHashCode(args);
        if (!this.resultCache[hash])
          this.calculate();
        return this.resultCache[hash];
      },
      showDetail: function(x) {
        var args = buildArgs(x, this.enemy, this.raidBuff, this.enemyKey);
        var hash = getHashCode(args);
        pmBase.component.create({
          type: 'modal',
          id: `detail_${hash}`,
          content: `<pre>${this.debugPrint(this.calcCache[hash].explainGlossary())}</pre>`,
          width: 650,
          title: x.charId + " - " + x.skillId,
          show: true
        });
      }
    },
    computed: {
    },
    watch: {
    }
  });

}

// adapt info obj to calculateDps() function
function buildArgs(info, enemy, raidBuff) {
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
    def: parseFloat(enemy.def) || 0,
    magicResistance: parseFloat(enemy.magicResistance) || 0,
    count: parseFloat(enemy.count) || 1
  };
  Object.keys(raidBuff).forEach(k => { raidBuff[k] = parseFloat(raidBuff[k]); });
  return {
    char: char_obj,
    enemy: enemy_obj,
    raidBuff
  };
}