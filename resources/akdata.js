const stringRegex = /<@(.+?)>(.+?)<\/>/g;
const variableRegex = /{(\-)*(.+?)(?:\:(.+?))?}/g;

let CacheList = null;

const useCache = true;
const cacheBeginTime = new Date(2019, 12, 10).getTime();

window.AKDATA = {
  akdata: "210810", // jsdelivr tag version

  Data: {},

  new_op: ["char_1013_chen2", "char_437_mizuki", "char_421_crow", "char_486_takila"],

  professionNames: {
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
  },

  checkVersion: function (callback) {
    $.getJSON(`../resources/version.json?_=${Math.round(Math.random()*1e8)}`, function(v) {
      var result = ["akdata", "gamedata", "customdata"].reduce((x, y) => x && (v[y] == window.AKDATA.Data.version[y]), true);
      callback(result, v);
    });    
  },

  reload: function () {
    localStorage.clear();
    location.reload();
  },

  load: function (paths, callback, ...args) {

    for( let i=0;i<paths.length;i++) {
      if ( paths[i].endsWith('.json') ){
        let name = paths[i].split('/').pop().replace('.json', '');
        let path = `https://cdn.jsdelivr.net/gh/xulai1001/akdata@${window.AKDATA.akdata}/resources/gamedata/${paths[i].toLowerCase()}`;
        
        // custom json data: always use local copy
        if (!(paths[i].includes("excel") || paths[i].includes("levels")))    // excel/levels使用cdn数据 其他使用本地数据
          path = `../resources/gamedata/${paths[i].toLowerCase()}?_=${Math.round(Math.random()*1e8)}`;
        console.log(`Loading -> ${name}`);
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

  patchChar: function (charId, patchId, suffix) {
    if (!AKDATA.Data.character_table[charId]) {
      AKDATA.Data.character_table[charId] = AKDATA.Data.char_patch_table["patchChars"][patchId];
      AKDATA.Data.character_table[charId].name += suffix;
      console.log("patch char", charId, AKDATA.Data.character_table[charId]);
    }
  },

  patchAllChars: function() {
    AKDATA.patchChar("char_1001_amiya2", "char_1001_amiya2", "（近卫 Ver.）");
  },

  selChar: "",

  showSelectCharDialog: function(excludeChars=[]) {
    let charPools = {"新干员": []};
    AKDATA.new_op.forEach(x => {
      let d = AKDATA.Data.character_table[x];
      charPools["新干员"].push({"name": d.name, "id": x, "rarity": d.rarity});
    });

    Object.entries(AKDATA.Data.character_table).forEach( ([charId, charData]) => {
      if (!excludeChars.includes(charId)) {
        let profKey = AKDATA.professionNames[charData.profession];
        if (profKey) {
          if (!charPools[profKey]) charPools[profKey] = [];
          charPools[profKey].push({"name": charData.name, "id": charId, "rarity": charData.rarity});
        }
      } 
    });
   // console.log(charPools);

    let html = "";
    ["新干员", ...Object.values(AKDATA.professionNames)].forEach(k => {
      let entry = `<h2>${k}</h2>`;
      charPools[k].sort((a, b) => b.rarity - a.rarity).forEach(x => {
        entry += `<a class="btn-outline-light p-2" href="#" onclick="AKDATA.selectChar('${x.id}')" role="button">${x.name}</a>`;
      });
      html += entry;
    });

    pmBase.component.create({
      type: 'modal',
      id: "select_char_dialog",
      content: html,
      width: 600,
      title: "选择角色",
      show: true,
    });
  },

  selectChar: function(id) {
    AKDATA.selChar = id;
    $("#select_char_dialog").modal("hide");
    if (AKDATA.selectCharCallback) AKDATA.selectCharCallback(id);
  },
  selectCharCallback: null,

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
