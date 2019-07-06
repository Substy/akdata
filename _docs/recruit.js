import recruitData from './resources/customdata/recruit.js';

function init() {
  recruitData.charTagData = recruitData.charTagData.map(([id, name, rarity, tags]) => {
    return {
      id,
      name,
      rarity,
      tags
    };
  });
  load();
}

function load() {
  let calc = `
<div class="card mb-3 bg-light">
  <div class="card-body">
    <form>` +
    Object.entries(recruitData.tagGroups).map(([name, list]) => `
    <div class="form-group row mb-1">
      <!--<label class="col-1 col-form-label">${name}</label>-->
      <div class="col-12">
        <div class="btn-groupx btn-group-toggle" data-toggle="buttons">
          ${list.map(i=>`<label class="btn btn-outline-primary btn-sm mr-2 mb-2" style="width:100px;background:white;"><input class="p-tag" type="checkbox" name="options" value="${i}"> ${recruitData.tagNames[i]}</label>`).join('')}
        </div>
      </div>
    </div>
    `).join('') +
    `
      <hr>
      <div class="row">
        <div class="col-12 offset-0">
          <div class="btn-groupx btn-group-toggle" data-toggle="buttons">
            <label class="btn btn-primary btn-sm mr-2 mb-2"><input class="p-reset" type="checkbox" >重置</label>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>
<div class=" p-result">
</div>
`;

  pmBase.content.build({
    pages: [{
      content: calc,
    }]
  });

  $('.p-tag').change(change);
  $('.p-reset').change(reset);
}

function getTagHtml(tags) {
  return tags.map(x => recruitData.tagNames[x]).join('、');
  return tags.map(x => `<span class="badge badge-primary mr-2 text-large">${tagNames[x]}</span>`).join('');
}

function reset() {
  $('.p-tag').prop('checked', false);
  $('.p-tag').parent().removeClass('active');
  change();
}

function change() {
  let selectedTags = $('.p-tag:checked').map(function () {
    return parseInt(this.value, 10);
  }).get();

  let query =
    new Array(1 << selectedTags.length).fill().map((e1, i) => selectedTags.filter((e2, j) => i & 1 << j))
    .slice(1)
    .map(tags => {
      let isSpecialTag = tags.indexOf(11) >= 0;
      let chars = recruitData.charTagData
        .filter(data => tags.every(x => data.tags.indexOf(x) >= 0))
        .filter(data => !(!isSpecialTag && data.rarity == 5))
        .sort((a, b) => b.rarity - a.rarity);
      let bestRarity = chars.length > 0 ? chars[chars.length - 1].rarity : 0;
      let isGoodResult = chars.some(x => x.rarity >= 3) && !chars.some(x => x.rarity == 2);

      return {
        tags,
        chars,
        bestRarity,
        isGoodResult
      };
    })
    .filter(data => data.chars.length > 0)
    .sort((a, b) => b.isGoodResult - a.isGoodResult);

  let html = "";

  html += '<table class="table table-sm">';
  query.forEach((value, index) => {
    let htmlTag = value.tags.map(x => `<span class="badge badge-${value.isGoodResult?'danger':'primary'} mr-2">${recruitData.tagNames[x]}</span>`).join('');
    let htmlList = '';

    for (let char of value.chars) {
      let name = char.name;
      htmlList += `<div class="c-rare c-rare--${char.rarity}">${name}</div>`;
    }

    html += `
    <tr>
    <td style="width: 20%;font-size:large;">${htmlTag}</td>
    <td>${htmlList}</td>
    </tr>
    `;
  });
  html += '</table>';

  /*
    html +='<div class="accordion">';
    query.forEach( (value, index) => {
      let isGoodResult = value.chars[value.chars.length-1].rarity >= 3;

      let htmlTag = value.tags.map(x=> `<span class="badge badge-primary mr-2">${tagNames[x]}</span>`).join('');
      let htmlList = '';

      for (let char of value.chars) {
        let name = char.name;
        let rarity = '★'.repeat(char.rarity+1);
        let ctag = char.tags.map(x=> `<span class="badge  mr-2 ${value.tags.indexOf(x) >= 0 ? 'badge-primary' : 'badge-secondary'}">${tagNames[x]}</span>`).join('');
        let color = ['dark', 'light', 'light', 'info', 'warning', 'danger'][char.rarity];
        htmlList += `<tr class="table-${color}">
          <td style="width:30%;">${name}</td>
          <td style="width:20%;">${rarity}</td>
          <td>${ctag}</td>
        </tr>`;
      }
      html +=`
      <div class="card">
      <div class="card-header" id="headingOne" data-toggle="collapse" data-target="#collapse${index}">
        ${htmlTag}
      </div>
      <div id="collapse${index}" class="collapse ${isGoodResult?'show':''}">
        <table class="table table-sm card-body p-0 m-0">${htmlList}</table>
      </div>
      </div>
      `;
    });
  */
  html += '</div>';
  $('.p-result').html(html);
}


pmBase.hook.on('init', init);

pmBase.util.addCSS(`
  .c-rare {
    display: block;
    float: left;
    width: 80px;
    padding: 3px 0;
    margin: 3px;
    border-radius: 3px;
    color: white;
    font-size: small;

    text-align: center;
  }
  .c-rare--5 {
    background-color: rgb(161,72,5);
    color: rgb(250,195,95);
  }
  .c-rare--4 {
    background-color: rgb(250,198,2);
    color: rgb(46,41,5);
  }
  .c-rare--3 {
    background-color: rgb(214,197,214);
    color: rgb(46,33,63);
  }
  .c-rare--2 {
    background-color: rgb(0,179,252);
    color: black;
  }
  .c-rare--1 {
    background-color: rgb(220,229,55);
    color: black;
  }
  .c-rare--0 {
    background-color: rgb(160,160,160);
    color: black;
  }
`);