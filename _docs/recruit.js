import AKDATA from './core.js';

const tagNames = [
  "",
  "近卫干员",
  "狙击干员",
  "重装干员",
  "医疗干员",
  "辅助干员",
  "术师干员",
  "特种干员",
  "先锋干员",
  "近战位",
  "远程位",
  "高级资深干员",
  "男性干员",
  "女性干员",
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
var charTagData = [
  [ "char_285_medic2", "Lancet-2", 0, [4,10,13,15] ],
  [ "char_286_cast3", "Castle-3", 0, [1,9,12,16] ],
  [ "char_502_nblade", "夜刀", 1, [8,9,13,17] ],
  [ "char_500_noirc", "黑角", 1, [3,9,12,17] ],
  [ "char_503_rang", "巡林者", 1, [2,10,12,17] ],
  [ "char_501_durin", "杜林", 1, [6,10,13,17] ],
  [ "char_009_12fce", "12F", 1, [6,10,12,17] ],
  [ "char_123_fang", "芬", 2, [8,9,13,18] ],
  [ "char_240_wyvern", "香草", 2, [8,9,13,18] ],
  [ "char_192_falco", "翎羽", 2, [8,9,13,18,19] ],
  [ "char_208_melan", "玫兰莎", 2, [1,9,13,19,20] ],
  [ "char_122_beagle", "米格鲁", 2, [3,9,13,21] ],
  [ "char_124_kroos", "克洛丝", 2, [2,10,13,19] ],
  [ "char_211_adnach", "安德切尔", 2, [2,10,12,19] ],
  [ "char_121_lava", "炎熔", 2, [6,10,13,22] ],
  [ "char_120_hibisc", "芙蓉", 2, [4,10,13,15] ],
  [ "char_212_ansel", "安赛尔", 2, [4,10,12,15] ],
  [ "char_210_stward", "史都华德", 2, [6,10,12,19] ],
  [ "char_278_orchid", "梓兰", 2, [5,10,13,23] ],
  [ "char_141_nights", "夜烟", 3, [6,10,13,19,24] ],
  [ "char_109_fmout", "远山", 3, [6,10,13,22] ],
  [ "char_235_jesica", "杰西卡", 3, [2,10,13,19,20] ],
  [ "char_126_shotst", "流星", 3, [2,10,13,19,24] ],
  [ "char_118_yuki", "白雪", 3, [2,10,13,22,23] ],
  [ "char_149_scave", "清道夫", 3, [8,9,13,18,19] ],
  [ "char_290_vigna", "红豆", 3, [8,9,13,18,19] ],
  [ "char_130_doberm", "杜宾", 3, [1,9,13,16,19] ],
  [ "char_289_gyuki", "缠丸", 3, [1,9,13,19,20] ],
  [ "char_193_frostl", "霜叶", 3, [1,9,13,19,23] ],
  [ "char_127_estell", "艾丝黛尔", 3, [1,9,13,20,22] ],
  [ "char_185_frncat", "慕斯", 3, [1,9,13,19] ],
  [ "char_237_gravel", "砾", 3, [7,9,13,21,25] ],
  [ "char_236_rope", "暗索", 3, [7,9,13,26] ],
  [ "char_117_myrrh", "末药", 3, [4,10,13,15] ],
  [ "char_181_flower", "调香师", 3, [4,10,13,15] ],
  [ "char_199_yak", "角峰", 3, [3,9,12,21] ],
  [ "char_150_snakek", "蛇屠箱", 3, [3,9,13,21] ],
  [ "char_196_sunbr", "古米", 3, [3,9,13,15,21] ],
  [ "char_183_skgoat", "地灵", 3, [5,10,13,23] ],
  [ "char_277_sqrrel", "阿消", 3, [7,9,13,26] ],
  [ "char_128_plosis", "白面鸮", 4, [4,10,13,14,15,16] ],
  [ "char_115_headbr", "凛冬", 4, [8,9,13,14,16,18] ],
  [ "char_102_texas", "德克萨斯", 4, [8,9,13,14,18,28] ],
  [ "char_155_tiger", "因陀罗", 4, [1,9,13,14,19,20] ],
  [ "char_143_ghost", "幽灵鲨", 4, [1,9,13,14,20,22] ],
  [ "char_129_bluep", "蓝毒", 4, [2,10,13,14,19] ],
  [ "char_204_platnm", "白金", 4, [2,10,13,14,19] ],
  [ "char_219_meteo", "陨星", 4, [2,10,13,14,22,24] ],
  [ "char_242_otter", "梅尔", 4, [5,10,13,14,27,28] ],
  [ "char_108_silent", "赫默", 4, [4,10,13,14,15] ],
  [ "char_171_bldsk", "华法琳", 4, [4,10,13,14,15,16] ],
  [ "char_148_nearl", "临光", 4, [3,9,13,14,15,21] ],
  [ "char_144_red", "红", 4, [7,9,13,14,25,28] ],
  [ "char_107_liskam", "雷蛇", 4, [3,9,13,14,19,21] ],
  [ "char_201_moeshd", "可颂", 4, [3,9,13,14,21,26] ],
  [ "char_163_hpsts", "火神", 4, [3,9,13,14,19,20,21] ],
  [ "char_145_prove", "普罗旺斯", 4, [2,10,13,14,19] ],
  [ "char_158_milu", "守林人", 4, [2,10,13,14,19,29] ],
  [ "char_173_slchan", "崖心", 4, [7,9,13,14,19,26] ],
  [ "char_174_slbell", "初雪", 4, [5,10,13,14,24] ],
  [ "char_195_glassb", "真理", 4, [5,10,13,14,19,23] ],
  [ "char_215_mantic", "狮蝎", 4, [7,9,13,14,19,20] ],
  [ "char_241_panda", "食铁兽", 4, [7,9,13,14,23,26] ],
  [ "char_103_angel", "能天使", 5, [2,10,11,13,19] ],
  [ "char_112_siege", "推进之王", 5, [8,9,11,13,18,19] ],
  [ "char_134_ifrit", "伊芙利特", 5, [6,10,11,13,22,24] ],
  [ "char_147_shining", "闪灵", 5, [4,10,11,13,15,16] ],
  [ "char_179_cgbird", "夜莺", 5, [4,10,11,13,15,16] ],
  [ "char_136_hsguma", "星熊", 5, [3,9,11,13,19,21] ],
  [ "char_202_demkni", "塞雷娅", 5, [3,9,11,13,15,16,21] ],
  [ "char_172_svrash", "银灰", 5, [1,9,11,12,16,19] ],
];

const tagGroups = {
  "A" : [1,2,3,4,5,6,7,8],
  "B" : [9,10],
  "C" : [12,13],
  "D" : [11,14,17],
  "E" : [15,16,18,19,20,21,22,23,24,25,26,27,28,29],
}

function init() {
  charTagData = charTagData.map( ([id, name, rarity, tags]) => { return { id, name, rarity, tags }; });
  load();
  /*
  AKDATA.loadData([
    '../excel/character_table.json'
  ], load);
  */
}

function load() {
  let html = `
<div class="card mb-3 bg-light">
  <div class="card-body">
    <form>`
+ Object.entries(tagGroups).map( ([name, list]) => `
    <div class="form-group row mb-1">
      <!--<label class="col-1 col-form-label">${name}</label>-->
      <div class="col-12">
        <div class="btn-groupx btn-group-toggle" data-toggle="buttons">
          ${list.map(i=>`<label class="btn btn-outline-primary btn-sm mr-2 mb-2"><input class="p-tag" type="checkbox" name="options" value="${i}"> ${tagNames[i]}</label>`).join('')}
        </div>
      </div>
    </div>
    `).join('')
+`
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
      content: html,
    }]
  });
  
  $('.p-tag').change(change);
  $('.p-reset').change(reset);
}

function reset() {
  $('.p-tag').prop('checked', false);
  $('.p-tag').parent().removeClass('active');
  change();
}

function change() {

  let selectedTags = $('.p-tag:checked').map(function() {
    return parseInt(this.value,10);
  }).get();

  let query =
    new Array(1 << selectedTags.length).fill().map((e1,i) => selectedTags.filter((e2, j) => i & 1 << j))
    .slice(1)
    .map( tags => {
      let isSpecialTag = tags.indexOf(11) >= 0;
      let chars =charTagData
        .filter( data => tags.every( x => data.tags.indexOf(x) >= 0 ) )
        .filter( data => !(!isSpecialTag && data.rarity == 5))
        .sort((a, b) => b.rarity - a.rarity);
      let bestRarity = chars.length > 0 ? chars[chars.length-1].rarity : 0;
      let isGoodResult = chars.some(x=>x.rarity>=3) && !chars.some(x=>x.rarity==2);

      return { tags, chars, bestRarity, isGoodResult };
    })
    .filter( data=> data.chars.length > 0 )
    .sort((a, b) => b.isGoodResult - a.isGoodResult)
    ;
  
  let html = "";

  html +='<table class="table table-sm">';
  query.forEach( (value, index) => {
    let htmlTag = value.tags.map(x=> `<span class="badge badge-${value.isGoodResult?'danger':'primary'} mr-2">${tagNames[x]}</span>`).join('');
    let htmlList = '';

    for (let char of value.chars) {
      let name = char.name;
      htmlList += `<div class="c-rare c-rare--${char.rarity}">${name}</div>`;
    }

    html +=`
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


pmBase.hook.on( 'init', init );

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