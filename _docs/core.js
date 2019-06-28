const stringRegex = /<@(.+?)>(.+?)<\/>/g;

const AKDATA = {
  Data: {},

  loadData: function (paths, callback, ...args) {
    let requests = paths.map(path => {
      let name = path.split('/').pop().replace('.json', '');
      path = '../resources/gamedata/' + path.toLowerCase();
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
    return string.replace(stringRegex, formatStringCallback);
  },
};

function formatStringCallback(match, name, value) {
  if (!!AKDATA.Data.gamedata_const) {
    return AKDATA.Data.gamedata_const.richTextStyles[name].replace('{0}', value).replace("color=", "span style=color:").replace("/color", "/span");
  } else {
    return value;
  }

}

window.AKDATA = AKDATA;
export default AKDATA;