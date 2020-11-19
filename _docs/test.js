// UA test
let ua = navigator.userAgent;
document.getElementById("user_agent").innerText = ua;

$("#jquery").text($.fn.jquery);
$("#vue").html("Vue: {{ error }} <br> <div v-html='content'></div>");

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
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    //'../resources/dpsv2.js',
    '../resources/attributes.js'
  ], load);
}

function load() {
  AKDATA.patchAllChars();
  //test_dps();
  find_skills(x => x.indexOf("instant") >= 0);
}

pmBase.hook.on('init', init);

// dpsv2 test
function test_dps() {
  var charId = "char_290_vigna";
  var skillId = 'skchr_vigna_2';
  var dps = new AKDATA.Dps.DpsState();
  dps.setChar({ charId, skillId });
  dps.setEnemy();
  dps.setRaidBuff();
  dps.basicFrame = dps.calcBasicFrame();
  dps.addTalents();
  dps.test();
  console.log(dps);
  vue_app.content = dps.log.toString().replace(new RegExp('\n', "g"), "<br>");
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