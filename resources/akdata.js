const stringRegex = /<@(.+?)>(.+?)<\/>/g;
const variableRegex = /{(\-)*(.+?)(?:\:(.+?))?}/g;

let CacheList = null;

const useCache = true;
const cacheBeginTime = new Date(2019, 12, 10).getTime();

window.AKDATA = {
  akdata: "200924",   // 主程序Tag版本
  gamedata: "20-09-23-10-12-25-72c56a", // CDN游戏数据版本
  customdata: "200924", // 额外数据版本

  Data: {},

  checkVersion: function () {
    var result = ["akdata", "gamedata", "customdata"].reduce((x, y) => x && (this[y] == this.Data.version[y]), true);
    var reason = {};
    ["akdata", "gamedata", "customdata"].forEach(x => { reason[x] = [this.Data.version[x], this[x]]; });
    return {result, reason};
  },

  load: function (paths, callback, ...args) {

    for( let i=0;i<paths.length;i++) {
      if ( paths[i].endsWith('.json') ){
        let name = paths[i].split('/').pop().replace('.json', '');
        let path = `https://cdn.jsdelivr.net/gh/xulai1001/akdata@${window.AKDATA.akdata}/resources/gamedata/${paths[i].toLowerCase()}`;
        
        // custom json data: always use local copy
        if (!paths[i].includes("excel"))    // 本地调试开关
          path = `../resources/gamedata/${paths[i].toLowerCase()}`;
          
        paths[i] = loadJSON(path, data => AKDATA.Data[name] = data);
      }
    }

    pmBase.loader.using( paths, () => {
      if ( useCache ) {
        let string = JSON.stringify( CacheList );
        localStorage.setItem( 'CacheList', string);
      }

      if (callback){
        let result = callback(...args);
        if (result !== undefined) pmBase.content.show(result);
      }
    });
  },

  getLevel: function (phase, level) {
    // {phase: 1, level: 1}
    let s = '';
    if( phase > 1 ) s += `精英${phase} `;
    s += `Lv.${level}`;
    return s;
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

  getBadge: function (type, text, rarity, style) {
    let s = createBadge(type, text, rarity, style);
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

  formatString: function (string, small = false, params = null, deleteItem = false) {
    string = string || '';
    string = string.replace(stringRegex, formatStringCallback);
    string = string.replace(/\\n/g, '<br>');
    string = `<div class="${small?'small':''} text-left">${string}</div>`;
    if ( params ) {
      let params2 = deleteItem ? Object.assign({},params) : params;
      string = string.replace(variableRegex, (match, minus, key, format) => {
        key = key.toLowerCase();
        let value = params2[key];
        if ( deleteItem ) delete params[key];
        if (minus) value = value * -1;
        if (format === '0%') value = Math.round(value * 100) + '%';
        else if (format === '0.0%') value = Math.round(value * 1000) / 10 + '%';
        return value;
      });
    }
    return string;
  },
};

function getLocaStorageObject(key, compressed, def) {
  var raw = localStorage.getItem( key );
  if ( raw !== null ) {
    try {
      if (compressed) raw = LZString.decompress(raw);
      var obj = JSON.parse(raw);
      return obj;
    } catch (e) {
      return def;
    }
  } else {
    return def;
  }
}

function setLocaStorageObject(key, obj) {
  CacheList[key] = {
    time: cacheBeginTime,
    compressed: true,
    type: 'object',
  };

  let string = JSON.stringify( obj );
  string = LZString.compress(string);
  localStorage.setItem( key, string);
}

function loadJSON( url, callback ){
  let hasCache = false;
  let beginTime = performance.now();

  if (useCache){
    if ( CacheList === null ) {
      CacheList = getLocaStorageObject('CacheList', false, {});
    }
    hasCache = url in CacheList && CacheList[url].time >= cacheBeginTime;
  }

  if ( hasCache ) {
    let obj = getLocaStorageObject(url, CacheList[url].compressed);
    callback(obj);
    //console.log(`load json '${url} from localStorage in ${performance.now() - beginTime}ms.`);
    return true;
  }
  else {
    return $.getJSON(url, null, data => {
      callback(data);
      if (useCache) {
        setLocaStorageObject( url, data );
      }
      //console.log(`load json '${url} from server in ${performance.now() - beginTime}ms.`);
    });
  }
}

function formatStringCallback(match, name, value) {
  if (!!AKDATA.Data.gamedata_const) {
    return AKDATA.Data.gamedata_const.richTextStyles[name].replace('{0}', value).replace("color=", "span style=color:").replace("/color", "/span");
  } else {
    return value;
  }
}

function createBadge( type, text, rarity, style ) {
  return `<span class="o-badge o-badge--${type} o-badge--rarity-${rarity}" style="${style}">${text}</span>`;
}

export default AKDATA;
