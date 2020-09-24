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
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/dps_options.json',
    '../resources/dpsv2.js'
  ], load);
}

function load() {
  test_dps();
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