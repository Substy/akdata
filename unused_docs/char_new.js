function init() {
  AKDATA.load([
    'excel/character_table.json',
    'excel/char_patch_table.json',
  ], load);
}

function load() {
  AKDATA.patchAllChars();
  let charPools = {};
  Object.entries(AKDATA.Data.character_table).forEach( ([charId, charData]) => {
    let profKey = AKDATA.professionNames[charData.profession];
    if (profKey) {
      if (!charPools[profKey]) charPools[profKey] = [];
      charPools[profKey].push({"name": charData.name, "id": charId, "rarity": charData.rarity});
    }
  });
  console.log(charPools);

  let html = "";
  Object.keys(charPools).forEach(k => {
    let entry = `<h2>${k}</h2>`;
    charPools[k].sort((a, b) => b.rarity - a.rarity).forEach(x => {
      entry += `<a class="btn-outline-light p-2" href="../character/#!/${x.id}" role="button">${x.name}</a>
                `;
    });
    html += entry;
  });

  pmBase.content.build({ pages: [ { content: html } ] });
}

pmBase.hook.on('init', init);