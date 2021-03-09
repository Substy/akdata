// UA test
let ua = navigator.userAgent;
document.getElementById("user_agent").innerText = ua;

$("#jquery").text($.fn.jquery);
$("#vue").html("Vue: {{ error }} <br> <div v-html='content' class='row'></div>");

let vue_app = new Vue({
  el: "#vue",
  data: { error: Vue.version, content: "test content" }
});

// AKDATA load test
function init() {
  AKDATA.load([
    'excel/character_table.json',
    'excel/skill_table.json',
    'excel/char_patch_table.json',
    'excel/skill_table.json',
    '../version.json',
    '../customdata/dps_specialtags_v2.json',
    '../customdata/dps_options.json',
    '../resources/dps_actions.js',
    '../resources/dpsv2.js',
    //'../resources/attributes.js'
  ], load);
}

function load() {
  AKDATA.patchAllChars();
  //test_dps_all();
  //find_skills(x => x.indexOf("instant") >= 0);
}

pmBase.hook.on('init', init);

function card(title, str) {
  return `
  <div class="card col-3">
    <div class="card-header">
      <div class="card-title mb-0">${title}</div>
    </div>
    ${str}
  </div>`;
}

// dpsv2 test
function test_dps() {
  var ch = "char_126_shotst";
  var sk = 'skchr_shotst_1';
  var options = { cond: true };
  var dps = new AKDATA.Dps.DpsCalculator();
  var char = { charId: ch, skillId: sk, options };
  var enemy = { def: 200, magicResistance: 20, count: 1 };
  vue_app.content = "";
  console.log (`-- ${ch} - ${sk}`);
  dps.calculateDps(char, enemy);
  vue_app.content += card(`${ch} - ${sk}`, "<pre>" + JSON.stringify(dps.summary, null, 2) + "</pre>");
}

function test_dps_all() {
  vue_app.content = "";
    Object.keys(AKDATA.Data.character_table).forEach(ch => {
    var charData = AKDATA.Data.character_table[ch];
    charData.skills.map(x => x.skillId).forEach(sk => {
      var options = { cond: true };
      var char = { charId: ch, skillId: sk, options };
      var enemy = { def: 200, magicResistance: 20, count: 1 };
      var dps = new AKDATA.Dps.DpsCalculator();
      if (ch.startsWith("char")) { 
        console.log (`-- ${ch} - ${sk}`);
        dps.calculateDps(char, enemy);
        vue_app.content += card(`${ch} - ${sk}`, "<pre>" + JSON.stringify(dps.summary, null, 2) + "</pre>");
      }
    });
  });
}

function find_skills(filter) {
  var results = [];
  Object.keys(AKDATA.Data.character_table).forEach(ch => {
    var charData = AKDATA.Data.character_table[ch];
    charData.skills.map(x => x.skillId).forEach(sk => {
      var skillData = AKDATA.Data.skill_table[sk];
      var char = { charId: ch, skillId: sk, skillLevel: 0 };
      try {
        var result = AKDATA.attributes.calculateDps(char, null, null).skill;
        var tag = result.dur.tags;
        if (filter(tag)) results.push({
          charId: ch,
          skillId: sk,
          name: charData.name,
          skillName: skillData.levels[0].name
        });
      } catch {
        console.log("Error ->", charData.name, sk);
      }
    });
  });

  //vue_app.content = JSON.stringify(results).replace(new RegExp('\n', "g"), "<br>");
  var lines = ["charId, charName, skillId, skillName"];
  results.forEach(x => {
    lines.push([x.charId, x.name, x.skillId, x.skillName].join(', '));
  });
  vue_app.content = lines.join("<br>");
}