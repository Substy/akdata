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

var html = `
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

var charDB = AKDATA.Data.character_table;
var skillDB = AKDATA.Data.skill_table;

// global register component
Vue.component("char_select", {
  props: [],
  data: function (){
    return {
      charList: loadChar(),
      phaseList: [],
      levelList: [],
      potList: [],
      skillList: {},
      skillLvList: [],
      result: {
        charId: "-",
        phase: 2, 
        level: 90, 
        potential: 5, 
        skillId: "-", 
        skillLevel: 9,
        options: {}
      }
    };
  },
  methods: {
    setChar: function (){}
  },
  template: html
});

function loadChar() {
  var ret = {};
  Object.keys(ProfessionNames).forEach(key => {
      var arr = [];
      for (let charId in charDB) {
          var char = charDB[charId];
          if (char.profession == key) arr.push({"name": char.name, "charId": charId});
      }
      ret[ProfessionNames[key]] = arr;
  });
  return ret;
}

AKDATA.char_select_html = html;