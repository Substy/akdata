import recruitData from './resources/customdata/recruit.js';

function init() {
  recruitData.charTagData = recruitData.charTagData.map(([id, name, rarity, tags]) => {
    return {
      id,
      name,
      rarity,
      tags,
      results: [],
    };
  });
  load();
}

function load() {
  for (let char of recruitData.charTagData) {
    let otherChars = recruitData.charTagData.filter(x => x.id != char.id);
    let combinations = getCombinations(char.tags).orderby(x => x.length);
    let success = [];
    for (let combo of combinations) {
      if ( success.every(x=>!containsArray(combo, x) ) && otherChars.every(x=>!containsArray(x.tags, combo))) {
        char.results.push(combo);
        success.push(combo);
      }
    }
  }

  let list = pmBase.component.create('list', {
    list: recruitData.charTagData.map( char=> [
        char.name,
        char.results.filter(y=>char.rarity<5||y.includes(11)).map(y=>getTagHtml(y)).join('<br>'),
    ]),
  });

  pmBase.content.build({
    pages: [{
      content: list,
    }]
  });
}

function getCombinations(arr) {
  let results = [];
  let get = function (cache, arr2) {
    for (var i = 0; i < arr2.length; i++) {
      let arr3 = [...cache, arr2[i]];
      results.push(arr3);
      get(arr3, arr2.slice(i + 1));
    }
  };
  get([], arr);
  return results;
}

function containsArray(arr1, arr2) {
  return arr2.every(x => arr1.indexOf(x) !== -1);
}


function getTagHtml(tags) {
  return tags.map(x => recruitData.tagNames[x]).join('、');
  return tags.map(x => `<span class="badge badge-primary mr-2 text-large">${tagNames[x]}</span>`).join('');
}


pmBase.hook.on('init', init);
