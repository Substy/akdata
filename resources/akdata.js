const stringRegex = /<[@\$](.+?)>(.+?)<\/>/g;
const variableRegex = /{(\-)*(.+?)(?:\:(.+?))?}/g;

let CacheList = null;
let _use_local = true;

const useCache = true;
const cacheBeginTime = new Date(2019, 12, 10).getTime();

window.AKDATA = {
  akdata: "220705", // jsdelivr tag version

  Data: {},

  new_op: ["char_4048_doroth", "char_1027_greyy2", "char_135_halo"],

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

  showReport: function () {
    var text = `
    - <a href="https://space.bilibili.com/274013" target="_blank">私信作者（B站）</a><br>
    - <a href="https://github.com/xulai1001/akdata/issues" target="_blank">Github Issue</a><br>
    感谢您的热心反馈！`;
    pmBase.component.create({
      type: 'modal',
      id: "modal_report",
      content: text,
      width: 800,
      title: "您可以通过以下途径反馈遇到的问题:",
      show: true,
    });
  },
  
  showNews: function() {
    let markdown = new window.showdown.Converter();
    markdown.setOption("simpleLineBreaks", true);
    markdown.setOption("headerLevelStart", 4);
    markdown.setOption("tables", true);
    markdown.setOption("tablesHeaderId", true);

    var lines = $.ajax({url: `https://cdn.jsdelivr.net/gh/xulai1001/akdata@${window.AKDATA.akdata}/_docs/whatsnew.md`, async: false}
               ).responseText.split("\n");
    var text = lines.slice(7).join("\n");
  
    pmBase.component.create({
      type: 'modal',
      id: "whatsnew",
      content: markdown.makeHtml(text),
      width: 750,
      title: "更新日志",
      show: true,
    });
  },

  reload: function () {
    localStorage.clear();
    location.reload();
  },
  progress: 0,
  prog_n: 0,

  incProgress: function() {
    this.progress += 1;
    if ($("#prg_load").length > 0)
      $("#prg_load").attr("style", `width: ${this.progress*100/this.prog_n}%`);
  },

  completeProgress: function() {
    this.progress = this.prog_n;
    if ($("#prg_load").length > 0) {
      $("#prg_load").attr("style", `width: 100%`).addClass("bg-success");
    }
  },

  load: function (paths, callback, ...args) {
    var t0 = performance.now();
    this.progress = 0;
    this.prog_n = paths.length;
    for( let i=0;i<paths.length;i++) {
      if ( paths[i].endsWith('.json') ){
        let name = paths[i].split('/').pop().replace('.json', '');
        let path = `resources/gamedata/${paths[i].toLowerCase()}`;
        let isGamedata = (paths[i].includes("excel") || paths[i].includes("levels"));

        // mirrors
        let jsdelivr = `https://cdn.jsdelivr.net/gh/xulai1001/akdata@${window.AKDATA.akdata}/` + path;
        let local = `/akdata/` + path;
        let github = "https://raw.githubusercontent.com/xulai1001/akdata/master/" + path;

        let urlList = [];
        if (_use_local)
          urlList = [local];
        else if (isGamedata)
          urlList = [jsdelivr, github, local];
        else
          urlList = [github, local];

        // convert path to Promise.race()
        paths[i] = loadJSONFromSources(name, urlList, !isGamedata, result => {
          AKDATA.Data[name] = result;
        });
      }
      else 
        this.incProgress();
    }

    pmBase.loader.using( paths, () => {
      if ( useCache ) {
        let string = JSON.stringify( CacheList );
        localStorage.setItem( 'CacheList', string);
      }

      console.log(`Load time: ${(performance.now() - t0).toFixed(1)} ms.`);
      this.completeProgress();
      
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
      if (id == "30145") rarity = "crystal";
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
    AKDATA.patchChar("char_1001_amiya2", "char_1001_amiya2", "(近卫)");
  },

  selChar: "",

  showSelectCharDialog: function(excludeChars=[], selectedChar=null) {
    let charPools = {"新干员": [], "同分支干员": []};
    AKDATA.new_op.forEach(x => {
      let d = AKDATA.Data.character_table[x];
      charPools["新干员"].push({"name": d.name, "id": x, "rarity": d.rarity});
    });

    Object.entries(AKDATA.Data.character_table).forEach( ([charId, charData]) => {
      if (!excludeChars.includes(charId)) {
        let profKey = AKDATA.professionNames[charData.profession];
        if (profKey) {
          if (!charPools[profKey]) charPools[profKey] = [];
          var displayName = charData.name;
          if (!charData.displayNumber) displayName = "[集成战略]" + displayName;
          charPools[profKey].push({"name": displayName, "id": charId, "rarity": charData.rarity});
        }
        if (AKDATA.Data.character_table[selectedChar]) {
          let subProfId = AKDATA.Data.character_table[selectedChar].subProfessionId;
          if (charData.subProfessionId == subProfId && !charId.startsWith("token"))
            charPools["同分支干员"].push({"name": displayName, "id": charId, "rarity": charData.rarity});
        }
      } 
    });
   // console.log(charPools);

    let html = "";
    ["新干员", "同分支干员", ...Object.values(AKDATA.professionNames)].forEach(k => {
      let entry = `<h2>${k}</h2>`;
      var r = 6;
      charPools[k].sort((a, b) => b.rarity - a.rarity).forEach(x => {
        if (x.rarity < r && !k.endsWith("干员")) { entry += `<br>☆${r} `; r-=1; }
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
    string = `<div class="${small?'small':''} ">${string}</div>`;
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

function ajaxPromise(url) {
  return new Promise(function(resolve, reject){
    var t0 = performance.now();
    $.ajax(url, {
      async: true,
      timeout: 30000,
      success: function(response) {
                  if (typeof response === 'string')
                    response = JSON.parse(response);
                  resolve({
                    url,
                    response,
                    time: performance.now() - t0
                  });
                },
      error: function(xhr) {
        //console.log("ajaxPromise error pending @",url); 
        // prevent rejecting too early. use race() to mimic Promise.any() functionality.
        setTimeout(function (){ reject(xhr.statusText);}, 30000);
      } 
    });
  });
}

// returns Promise.race() predicate
function loadJSONFromSources( tag, urlList, bypassCache, callback ){
  let hasCache = false;
  let beginTime = performance.now();
  let elapsed = 0;
  let obj = null;
  let salt = `?_=${Math.round(Math.random()*1e8)}`;
  if (useCache){
    if ( CacheList === null ) {
      CacheList = getLocaStorageObject('CacheList', false, {});
    }
    hasCache = tag in CacheList && CacheList[tag].time >= cacheBeginTime;
  }

  if ( hasCache && !bypassCache ) {
    obj = getLocaStorageObject(tag, CacheList[tag].compressed);
    callback(obj);
    elapsed = performance.now() - beginTime;
    console.log(`Loading ${tag} (cached) -> ${elapsed.toFixed(1)} ms.`);
    AKDATA.incProgress();
    return true;
  }
  else {
    return Promise.race(urlList.map(x => ajaxPromise(x+salt))).then(r => {
      if (useCache) setLocaStorageObject(tag, r.response);
      elapsed = performance.now() - beginTime;
      console.log(`Loading ${tag} @ ${r.url} -> ${elapsed.toFixed(1)} ms.`);
      obj = r.response;
      AKDATA.incProgress();
      callback(obj);
    }, e => {
      console.log(e);
    });
  }
}

function formatStringCallback(match, name, value) {
  //console.log(name,value);
  if (!!AKDATA.Data.gamedata_const) {
    if (AKDATA.Data.gamedata_const.richTextStyles[name]) // 效果
      return AKDATA.Data.gamedata_const.richTextStyles[name].replace('{0}', value).replace("color=", "span style=color:").replace("/color", "/span");
    else { // 术语（新增）
      var term_desc = AKDATA.Data.gamedata_const.termDescriptionDict[name].description;
      term_desc = term_desc.replace(stringRegex, (m, n, v) => { return v; });
      return `<a href="/akdata/terms/#${name}" style="color: #0000ff" title="${term_desc}">${value}</a>`;
    }
  } else {
    return value;
  }
}

function createBadge( type, text, rarity, style ) {
  return `<span class="o-badge o-badge--${type} o-badge--rarity-${rarity}" style="${style}">${text}</span>`;
}

export default AKDATA;
