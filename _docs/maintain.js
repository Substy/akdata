function init() {
  $('#p-recruit').click(()=>{
    AKDATA.loadData([
      'excel/character_table.json',
      'excel/handbook_info_table.json',
      'excel/gacha_table.json',
    ], createRecruitTable);
  });

}

const tagNames = [
  "",
  "WARRIOR",
  "SNIPER",
  "TANK",
  "MEDIC",
  "SUPPORT",
  "CASTER",
  "SPECIAL",
  "PIONEER",
  "近战位",
  "远程位",
  "高级资深干员",
  "男",
  "女",
  "资深干员",
  "治疗",
  "支援",
  "新手",
  "费用回复",
  "输出",
  "生存",
  "防护",
  "群攻",
  "减速",
  "削弱",
  "快速复活",
  "位移",
  "召唤",
  "控场",
  "爆发",
];

function createRecruitTable() {
  let s = '';
  for (let charId in AKDATA.Data.character_table) {
    if (!charId.startsWith("char")) continue;
    let charData = AKDATA.Data.character_table[charId];
    if (!AKDATA.Data.gacha_table.recruitDetail.includes(charData.name)) continue;
    let gender = AKDATA.Data.handbook_info_table.handbookDict[charId].storyTextAudio[0].stories[0].storyText.match(/性别】(.)/)[1];
    let tags = [].concat(charData.position, charData.tagList, charData.profession, gender);
    if (charData.rarity == 5) tags.push("高级资深干员");
    else if (charData.rarity == 4) tags.push("资深干员");
    for (var i=0;i<tags.length;i++) {
      tags[i] = tagNames.indexOf(tags[i]);
    }
    tags.sort((a, b) => a - b);
    s += `[ "${charId}", "${charData.name}", ${charData.rarity}, [${tags}] ],\n`;
  }
  $('#p-result').val(s);
}

pmBase.hook.on( 'init', init );