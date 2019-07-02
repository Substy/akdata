const stringRegex = /<@(.+?)>(.+?)<\/>/g;

window.AKDATA = {
  Data: {},

  load: function (paths, callback, ...args) {
    for( let i=0;i<paths.length;i++) {
      if ( paths[i].endsWith('.json') ){
        let name = paths[i].split('/').pop().replace('.json', '');
        let path = `${siteInfo.baseurl}/resources/gamedata/${paths[i].toLowerCase()}`;
        paths[i] =  $.getJSON(path, data => AKDATA.Data[name] = data);
      }
    }
    pmBase.loader.using( paths, () => {
      if (callback){

        let result = callback(...args);
        if (result !== undefined) pmBase.content.show(result);
      }
    });
  },

  loadData: function (paths, callback, ...args) {
    let requests = paths.map(path => {
      let name = path.split('/').pop().replace('.json', '');
      path = `${siteInfo.baseurl}/resources/gamedata/${path.toLowerCase()}`;
      return $.getJSON(path, data => AKDATA.Data[name] = data);
    });
    $.when(...requests).then(() => {
      let result = callback(...args);
      if (result !== undefined) pmBase.content.show(result);
    });
  },

  getItem: function (type, id, count = 0) {
    let s;
    if (type == "FURN") {
      s = AKDATA.Data.building_data.customData.furnitures[id].name;
    } else if (type == "CHAR") {
      s = AKDATA.Data.item_table.items['p_' + id].name.replace('的信物', '');
    } else {
      s = AKDATA.Data.item_table.items[id].name;
    }
    if (count > 0) s += '×' + count;
    return s;
  },

  getItemBadge: function (type, id, count = null) {
    let text, rarity;
    if (type == "FURN") {
      let data = AKDATA.Data.building_data.customData.furnitures[id];
      text = data.name;
      rarity = data.rarity;
    } else if (type == "CHAR") {
      let data = AKDATA.Data.item_table.items['p_' + id];
      text = data.name.replace('的信物', '');
      rarity = data.rarity;
    } else {
      let data = AKDATA.Data.item_table.items[id];
      text = data.name;
      rarity = data.rarity;
    }
    let s = createBadge('item', text, rarity);
    if ( count !== null ) s += createBadge('count', '×' + count);
    return s;
  },

  getChar: function ( charId, phase = 0, level = 0) {
    let s = AKDATA.Data.character_table[charId].name;
    if (phase > 0) {
      s += `<sup>${['','Ⅰ', 'Ⅱ'][phase]}</sup>`;
    }
    if (level > 1) {
      s += `<sup>${level}</sup>`;
    }
    return s;
  },

  formatString: function (string) {
    return string.replace(stringRegex, formatStringCallback).replace(/\\n/g, '<br>');
  },
};

function formatStringCallback(match, name, value) {
  if (!!AKDATA.Data.gamedata_const) {
    return AKDATA.Data.gamedata_const.richTextStyles[name].replace('{0}', value).replace("color=", "span style=color:").replace("/color", "/span");
  } else {
    return value;
  }
}

function createBadge( type, text, rarity ) {
  return `<span class="o-badge o-badge--${type} o-badge--rarity-${rarity}">${text}</span>`;
}

export default AKDATA;