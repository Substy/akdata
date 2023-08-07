function init() {
  $('#update_prompt').text("正在载入角色数据，请耐心等待......");
  AKDATA.load([
    'excel/character_table.json',
    'excel/char_patch_table.json',
    'excel/skill_table.json',
    'excel/skin_table.json',
    'excel/uniequip_table.json',
    'excel/battle_equip_table.json',
    '../version.json',
    '../customdata/dps_specialtags.json',
    '../customdata/enums.json',
    '../customdata/dps_options.json',
    '../customdata/dps_anim.json',
    '../customdata/mastery.json',
    '../resources/attributes.js'
  ], load);
}

const charColumnCount = $(document).width() <= 1400 ? 2 : 4;
const Characters = new Array(charColumnCount);

let excludeChars = [];

let markdown = new window.showdown.Converter();
markdown.setOption("simpleLineBreaks", true);
markdown.setOption("headerLevelStart", 4);
markdown.setOption("tables", true);
markdown.setOption("tablesHeaderId", true);

function getElement(classPart, index) {
  return $(`.dps__${classPart}[data-index="${index}"]`);
}

function showVersion() {
  AKDATA.checkVersion(function (ok, v) {
    var remote = `最新版本: ${v.akdata}, 游戏数据: ${v.gamedata} (${v.customdata})`;
    var local = `当前版本: ${AKDATA.Data.version.akdata}, 游戏数据: ${AKDATA.Data.version.gamedata} (${AKDATA.Data.version.customdata})`;
    var whatsnew = `更新内容: ${v.whatsnew} <br> <a href='/akdata/whatsnew'>查看更新日志</a>`;
    if (!ok) {
      pmBase.component.create({
        type: 'modal',
        id: "update_prompt_modal",
        content: [remote, local, whatsnew].join("<br>"),
        width: 800,
        title: "有新数据，请点击[手动刷新]更新数据",
        show: true,
      });
      $('#update_prompt').html(["有新数据，请更新", remote, local].join("<br>"));
    } else {
      try {
        local = `新增干员：`;
        AKDATA.new_op.forEach(op => {
          local += `<a href='#${op}'>${AKDATA.Data.character_table[op].name}</a>   `;
        });
      } catch (e) {
        local = "有新数据，请点击[手动刷新]更新数据";
      }
      $('#update_prompt').html(local);
      $("#btn_update_data").text("手动刷新");
      $("#btn_update_data").attr("class", "btn btn-success");
    }
    console.log(v);
  });
}

function load() {
  showVersion();
  $("#btn_report").click(AKDATA.showReport);
  $("#btn_whatsnew").click(AKDATA.showNews);
  AKDATA.patchAllChars();

  var charId_hash = window.location.hash.replace(/\#/g, "");
  //console.log(charId_hash);

  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.skills.length == 0) excludeChars.push(charId);
  }

  window.hashChangedBySelect = false; // 防止重入
  let html = `
<div class="card mb-2">
  <div class="card-header">
    <div class="card-title mb-0">干员（点击头像选择）</div>
  </div>
  <table class="table dps" style="table-layout:fixed;">
  <tbody>
    <tr class="dps__row-select"> <th class="dps_table_header">干员</th> </tr>
    <tr class="dps__row-level"> <th>等级</th> </tr>
    <tr class="dps__row-potentialrank"> <th>潜能</th> </tr>
    <tr class="dps__row-favor"> <th>信赖</th> </tr>
    <tr class="dps__row-equip"> <th>模组 (精二生效)</th> </tr>
    <tr class="dps__row-option"> <th>选项</th> </tr>
  </tbody>
  <tbody>
    <tr class="dps__row-skill"> <th><font color="blue">技能</font></th> </tr>
    <tr class="dps__row-s_atk"> <th>技能攻击力 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="角色攻击力（计算技能倍数）"></i></th> </tr>
    <tr class="dps__row-period"> 
      <th>技能周期
        <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-html="true" data-placement="right"
          title="普攻时间 + 技能持续时间 [ + 眩晕时间 ]"></i>
      </th>
    </tr>
    <tr class="dps__row-s_damage"> <th>技能总伤害 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="单次伤害 x 命中数"></i></th> </tr>
    <tr class="dps__row-s_dps"> <th><font color="blue"><span>技能DPS</span></font><i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="技能总伤害（攻击+额外伤害）÷持续时间（包括罚站时间）"></i></th></tr>
    <tr class="dps__row-n_dps"> <th>普攻</th> </tr>
    <tr class="dps__row-g_dps"> <th>平均</th> </tr>
    <tr class="dps__row-s_att"> <th>技能攻击间隔</th> </tr>
    <tr class="dps__row-n_att"> <th>普攻攻击间隔</th> </tr>
    <tr class="dps__row-note"> <th>注记</th> </tr>  
  </tbody>
  <tbody>
  <!--  <tr class="dps__row-a_dps"> <th>技能DPS(攻击)</th> </tr> -->
    <tr class="dps__row-s_diff"> <th>技能总伤害 提升% <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="和【第一列】结果相比的提升比例 +/-%"></i></th> </tr>
    <tr class="dps__row-g_diff"> <th>平均DPS 提升% <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="和【第一列】结果相比的提升比例 +/-%"></i></th> </tr>
    </tbody>
  <tbody class="">
    <tr class="dps__row-damagepool"> <th>伤害表<i class="fas fa-info-circle pull-right" data-toggle="tooltip" title="详细的伤害表格"></i></th></tr>
    <tr class="dps__row-anim"> <th>动画帧数</th></tr>
    <tr class="dps__row-results"> <th><font color="blue">计算过程（用于验算）</font></th> </tr>
    <tr class="dps__row-prts"> <th><font color="blue">PRTS干员页面</font></th> </tr>
  <!--  <tr class="dps__row-explain"> <th>算法解释（筹备中）</th></tr> -->
  </tbody>
  </table>
</div>
<div class="card">
  <div class="card-header">
    <div class="card-title mb-0">敌人</div>
  </div>
  <table class="table dps dps_responsive" style="table-layout:fixed;">
    <tbody>
      <tr>
        <th>防御力</th>
        <th>法术抗性</th>
        <th>敌人/我方数量</th>
        <th>
          元素抗性
          <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
             title="元素类型伤害的抗性(削减HP槽)；一般为0"></i>
        </th>
        <th>
          元素损伤抗性
          <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
             title="元素损伤的抗性(削减元素槽)一般为0"></i>
        </th>
        <th>
          物理/法术减伤%
          <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
             title="乘算，百分比减少物理/法术伤害，一般为0"></i>
        </th>
      </tr>
      <tr>
      <td data-th="防御"><input type="text" class="dps__enemy-def" value="0" style="width: 80%"></td>
      <td data-th="法抗"><input type="text" class="dps__enemy-mr" value="0" style="width: 80%"></td>
      <td data-th="敌人/我方数量"><input type="text" class="dps__enemy-count" value="1" style="width: 80%"></td>
      <td data-th="元素抗性"><input type="text" class="dps__enemy-er" value="0" style="width: 80%"></td>
      <td data-th="元素损伤抗性"><input type="text" class="dps__enemy-edr" value="0" style="width: 80%"></td>
      <td data-th="物法减伤%"><input type="text" class="dps__enemy-dr" value="0" style="width: 80%"></td>
      </tr>
    </tbody>
  </table>
</div>
<div class="card">
  <div class="card-header">
    <div class="card-title mb-0">团辅（详见选项内说明）</div>
  </div>
  <table class="table dps dps_responsive" style="table-layout:fixed;">
    <tbody>
      <tr>
        <th>攻击力/最终加算
         <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
            title="加算的攻击力，如：吟游者"></i>
        </th>
        <th>攻击力%/直接乘算
          <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
            title="乘算后相加的攻击力百分比，如：华法琳"></i>
        </th>
        <th>基础攻击%/直接加算
        <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
            title="按【百分比】加算到基础攻击力上"></i>
        </th>
        <th>攻速/加算</th>
        <th>技力%/直接乘算
          <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
          title="乘算后相加的技力百分比，如：白面鸮"></i>
        </th>
        <th>增伤%/最终乘算
          <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right"
             title="连乘区，包括增伤、脆弱和法术脆弱，仅能增强物理、法术、真伤；不能增加元素伤害"></i></th>
      </tr>
      <tr>
      <td data-th="攻击力-加算"><input type="text" class="dps__buff-atk" value="0" style="width: 90%" ></td>
      <td data-th="攻击力%-加乘"><input type="text" class="dps__buff-atkpct" value="0" style="width: 90%" ></td>
      <td data-th="基础攻击力%"><input type="text" class="dps__buff-batk" value="0" style="width: 90%"></td>
      <td data-th="攻速-加算"><input type="text" class="dps__buff-ats" value="0" style="width: 90%"></td>
      <td data-th="技力%-加乘"><input type="text" class="dps__buff-cdr" value="0" style="width: 90%"></td>
      <td data-th="增伤%-乘算"><input type="text" class="dps__buff-scale" value="0" style="width: 90%"></td>
      </tr>
    </tbody>
  </table>
</div>
  `;
  let $dps = $(html);

  for (let i = 0; i < charColumnCount; i++) {
    let copy_html = `<div class="p-0">
                      <button class="dps__copy btn btn-outline-info p-2 visible-desktop" data-index="${i}">复制到右侧</button>
                     </div>`;
    let _html = `<td>
    <div class="input-group dps_menu_item">
      <div class="dps_menu_item_50 pr-1">
        <figure class="figure">
          <img class="img_char figure-img" style="max-width: 100%; height: auto" data-index="${i}" src="/akdata/assets/images/char/char_504_rguard.png"></img>
          <figcaption class="figure-caption txt_char" style="font-weight:600; font-size: 1vw; color: #000; text-align: center;" data-index="${i}">-</figcaption>
        </figure>
      </div>
      <div class="d-flex flex-column justify-content-start">
        <div class="p-0">
          <button class="btn btn-outline-secondary dps__goto p-2 visible-desktop" data-index="${i}" type="button">
            详细属性<i class="fa fa-info-circle"></i>
          </button>
        </div>
        <div class="p-0">
          <button class="btn btn-outline-secondary dps__mastery p-2 visible-desktop" data-index="${i}" type="button">
            专精收益<i class="fa fa-cubes"></i>
          </button>
        </div>
        ${i < charColumnCount-1 ? copy_html : ""}
      </div>
    </div>
  </td>`;
    
    $dps.find('.dps__row-select').append(_html);
    $dps.find('.dps__row-level').append(`
    <td>
      <div class="form-group dps_menu_item">
        <select class="form-control form-control-sm dps__phase dps_menu_item_50" data-index="${i}"></select>
        <select class="form-control form-control-sm dps__level dps_menu_item_50" data-index="${i}"></select>
      </div>
    </td>`);
    $dps.find('.dps__row-atk').append(`<td><div class="dps__atk" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-attackSpeed').append(`<td><div class="dps__attackSpeed" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-baseAttackTime').append(`<td><div class="dps__baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-dps').append(`<td><div class="dps__dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-skill').append(`
    <td>
      <div class="form-group dps_menu_item">
        <select class="form-control form-control-sm dps__skill dps_menu_item_50" data-index="${i}"></select>
        <select class="form-control form-control-sm dps__skilllevel dps_menu_item_50" data-index="${i}"></select>
      </div>
    </td>`);
    $dps.find('.dps__row-s_atk').append(`<td><div class="dps__s_atk" data-index="${i}"></div></td>`);

    $dps.find('.dps__row-s_dps').append(`<td><div class="dps__s_dps font-weight-bold" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-a_dps').append(`<td><div class="dps__a_dps font-weight-bold" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-n_dps').append(`<td><div class="dps__n_dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-g_dps').append(`<td><div class="dps__g_dps font-weight-bold" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_att').append(`<td><div class="dps__s_att font-weight-bold" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-n_att').append(`<td><div class="dps__n_att" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_diff').append(`<td><div class="dps__s_diff " data-index="${i}"></div></td>`);
    $dps.find('.dps__row-g_diff').append(`<td><div class="dps__g_diff " data-index="${i}"></div></td>`);
   // $dps.find('.dps__row-e_time').append(`<td><div class="dps__e_time" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-s_damage').append(`<td><div class="dps__s_damage" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-period').append(`<td><div class="dps__period" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-results').append(`<td><a class="dps__results" data-index="${i}" href="#">[点击显示]</a></td>`);
    $dps.find('.dps__row-note').append(`<td><div class="dps__note" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-explain').append(`<td><a class="dps__explain" data-index="${i}" href="###">[点击显示]</a></td>`);
    $dps.find('.dps__row-prts').append(`<td></td>`);  
    $dps.find('.dps__row-option').append(`<td></td>`);
    $dps.find('.dps__row-damagepool').append(`<td><a class="dps__damagepool" data-index="${i}" href="###">[点击显示]</a></td>`);
    $dps.find('.dps__row-anim').append(`<td><a class="dps__anim" data-index="${i}" href="###">[点击显示]</a></td>`);
    $dps.find('.dps__row-potentialrank').append(`<td><select class="form-control form-control-sm dps__potentialrank" data-index="${i}">${[0,1,2,3,4,5].map(x=>`<option value="${x}">${x+1}</option>`).join('')}</select></td>`);
    $dps.find('.dps__row-favor').append(`<td><select class="form-control form-control-sm dps__favor" data-index="${i}">${Object.keys(new Array(51).fill(0)).map(x=>`<option value="${x*2}">${x*2}</option>`).join('')}</select></td>`);
    $dps.find('.dps__row-equip').append(`<td><div class="form-group dps_menu_item">
      <select class="dps__equip form-control form-control-sm dps_menu_item_70" data-index="${i}"></select>
      <select class="dps__equip_level form-control form-control-sm dps_menu_item_30" data-index="${i}"></select>
      <a class="dps__equip_info" data-index="${i}" href="###">模组信息</a>
    </div></td>`);
  }

  pmBase.content.build({
    pages: [{ content: $dps }],    
  });
  $('[data-toggle="tooltip"]').tooltip();  

  $('.dps__potentialrank').val(5);
  $('.dps__favor').val(100);

 // $('.dps__char').change(chooseChar);
  $('.dps__phase').change(choosePhase);
  $('.dps__level').change(chooseLevel);
  $('.dps__equip').change(chooseEquip);
  $('.dps__equip_level').change(chooseEquip);
  $('.dps__skill, .dps__skilllevel, .dps__potentialrank, .dps__favor').change(chooseSkill);
  $('.dps__enemy-def, .dps__enemy-mr, .dps__enemy-count, .dps__enemy-hp').change(calculateAll);
  $('.dps__buff-atk, .dps__buff-atkpct, .dps__buff-ats, .dps__buff-cdr, .dps__buff-batk, .dps__buff-scale').change(calculateAll);
  $('.dps__enemy-er, .dps__enemy-edr, .dps__enemy-dr').change(calculateAll);

  $('.dps__results').click(showDetail);
  $('.dps__explain').click(showExplain);
  $('.dps__damagepool').click(showDamage);
  $('.dps__anim').click(showAnim);
  $('.dps__goto').click(goto);
  $('.dps__mastery').click(gotoMastery);
  $('.dps__copy').click(copyChar);
  $('.img_char').click(showSelectChar);
  
  if (charId_hash.length > 0)
    onhashchange();
  
}

window.onhashchange = function () {
    var charId_hash = window.location.hash.replace(/\#/g, "");
    console.log("hash: ", charId_hash);
    if (charId_hash.length > 0 && !window.hashChangedBySelect) {
      selectChar(charId_hash, 0);
    }
    setTimeout(() => { window.hashChangedBySelect = false;}, 500);
}

function selectChar(charId, i) {
  //console.log(charId);
  if (charId && charId != "-") {
    let name = AKDATA.Data.character_table[charId].name;
    let imgUrl = `https://akdata-site.oss-cn-guangzhou.aliyuncs.com/assets/images/char/${charId}.png`;
    if (AKDATA.useLocal)
      imgUrl = `/akdata/assets/images/char/${charId}.png`;

    $(`.txt_char:eq(${i})`).text(name);
    $(`.img_char:eq(${i})`).attr("src", imgUrl);
    
    window.hashChangedBySelect = true;
    setTimeout((x) => { location.hash = "#" + x; }, 500, charId);

    // 弹框提示消息设置
    if (AKDATA.attributes.checkSpecs(charId, "alert")) {
      pmBase.component.create({
        type: 'modal',
        id: charId,
        content: markdown.makeHtml(AKDATA.attributes.checkSpecs(charId, "alert")),
        width: 750,
        title: "计算器提示",
        show: true
      });
    }
    updateChar(charId, i);
  }
}

function showSelectChar() {
  let __this=$(this);
  let index = ~~__this.data("index");
  AKDATA.selectCharCallback = function (id) { selectChar(id, index); }
  AKDATA.showSelectCharDialog(excludeChars, Characters[0] ? Characters[0].charId : null);
}

function showOptionDialog() {
  let __this=$(this);
  let index = ~~__this.data("index");
  let tag = __this.data("tag");
  switch (tag) {
    case "char_dialog":
      AKDATA.selectCharCallback = function (id) { 
        Characters[index].options[tag] = id;
        calculateColumn();
      }
      AKDATA.showSelectCharDialog(excludeChars, null);
      break;
  }

}

function goto() {
  let $this = $(this);
  let index = ~~$this.data('index');
  if ( Characters[index].charId ) {
    window.open(`../character/#!/${Characters[index].charId}`, '_blank'); 
  }
}

function gotoMastery() {
  let $this = $(this);
  let index = ~~$this.data('index');
  if ( Characters[index].charId ) {
    window.open(`../mastery/#${Characters[index].charId}`, '_blank'); 
  }
}


function showDetail() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let name = Characters[index].name;
  //console.log(Characters[index].dps.log);
  pmBase.component.create({
    type: 'modal',
    id: Characters[index].charId,
    content: markdown.makeHtml(Characters[index].dps.log).replace(/<table/g, '<table class="table"'),
    width: 750,
    title: name + " - " + Characters[index].dps.skillName,
    show: true,
  });
  return false;
}

function showExplain() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let name = Characters[index].name;
  //console.log(Characters[index].dps.log);
  pmBase.component.create({
    type: 'modal',
    id: Characters[index].charId,
    content: "筹备中，敬请期待",
    width: 750,
    title: "算法解释 - " + name + "/" + Characters[index].dps.skillName,
    show: true,
  });
  return false;
}

function showDamage() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let html = `  
<table class="table damage" style="table-layout:fixed;">
  <tbody>
    <tr>
    <th></th>
    <th>攻击力</th>
    <th width="100px">攻击间隔</th>
    <th>命中数</th>
    <th>计时/s</th>
    <th>物理</th>
    <th>法术</th>
    <th>治疗</th>
    <th width="100px">真伤/护盾</th>
    <th>元素伤害</th>
    <th>元素损伤</th>
    <th>元素治疗</th>
    </tr>
    <tr>
    <th>普攻</th>
    </tr>
    <tr>
    <th>技能</th>
    </tr>
  </tbody>
</table>
说明: <span id="damage_note_${index}"></span>
`;

  let name = Characters[index].name;

  pmBase.component.create({
    type: 'modal',
    id: Characters[index].charId + "_" + Characters[index].skillId,
    content: html,
    width: 850,
    title: name + " - " + Characters[index].dps.skillName,
    show: true,
  });

  let dps = [Characters[index].dps.normal, Characters[index].dps.skill];
  $(`#damage_note_${index}`).text(Characters[index].dps.note);
  for (let row=0; row<2; ++row){
    let d = dps[row];
    let row_html = $(`.damage tr:nth-child(${row+2})`);
    
    let pool = [0, 1, 2, 3, 5, 6, 7].map(x => Math.round(d.damagePool[x] + d.extraDamagePool[x]), 0);
    pool[3] += d.damagePool[4] + d.extraDamagePool[4];

    let data = [Math.round(d.atk), `${d.attackTime.toFixed(3)}s<br>${Math.round(d.attackTime * 30)}帧`, Math.round(d.dur.hitCount), d.dur.duration.toFixed(2), ...pool];
    //console.log(row_html.html(), data);
    data.forEach(x => {
      if (x==0) x="-";
      row_html.append(`<td>${x}</td>`);
    });
  }
  return false;
}

function showAnim() {
  let $this = $(this);
  let index = ~~$this.data('index');
  
  let charId = Characters[index].charId;
  let name = AKDATA.Data.character_table[charId].name;
  let animdb = AKDATA.Data.dps_anim;
  let skindb = AKDATA.Data.skin_table["charSkins"];

  let skins = Object.keys(animdb).filter(x => x.startsWith(charId));
  let rows = [];
  let headers = ["暂无动画数据"];
  if (skins.length > 0) {

    let skinNames = skins.map(x => {
      let db_name = x.replace(`${charId}_`, `${charId}@`);
      return skindb[db_name] ? skindb[db_name].displaySkin.skinName : "原皮"
    });
    headers = ["动作", ...skinNames];
    let h = {};
    skins.forEach(sk => {
      Object.keys(animdb[sk]).forEach(key => {
        h[key] = true;
      });
    })
    delete h.version;
    let line_headers = Object.keys(h);

    
    line_headers.forEach(key => {
      let r = [key];
      skins.forEach(sk => {
        let item = animdb[sk][key];
        if (!item) {
          r.push("");
        } else if (item.duration) {
          let d = item.duration;
          let n = Object.keys(item).filter(x => x!="duration")[0];
          r.push(`动画: ${d} <br> 判定[${n}]: ${item[n]}`);
        } else {
          r.push(item);
        }
      });
      rows.push(r);
    });
  }

  let table = pmBase.component.create({
    type: 'list',
    header: headers,
    list: rows,
    sortable: true,
    card: false,
  });

  let html = `  
${table}
<b>说明: </b><br>
- <b>帧数数据来源为解包，目前暂未加入DPS计算，如果计算结果与这里显示的不一致，应以这里为准</b> <br>
- 此处列出动画的默认帧数，游戏中的实际帧数可能会根据内部设定进行<b>缩放</b><br>
- 【判定】指触发攻击事件的帧数，而非命中的帧数。远程攻击的投射物/特效还要经过一段时间才能命中目标<br>
- <b>如果计算缩放后的动画帧数小于理论攻击间隔0.5帧以上，实际攻击间隔会比理论值大1-2帧</b>（参见计算过程） <br>
`;

  pmBase.component.create({
    type: 'modal',
    id: `${charId}_anim`,
    content: html,
    width: 850,
    title: `${name} - 动画帧数`,
    show: true,
  });

}

function setSelectValue(name, index, value) {
  let $e = getElement(name, index);
  $e.val(value);
}

function updateChar(charId, index) {
  if (!charId) return;

  let charData = AKDATA.Data.character_table[charId];
  let phaseCount = charData.phases.length;
  let html = [...Array(phaseCount-1).keys()].map(x => `<option value="${x+1}">精英${x+1}</option>`).join('');
  let $phase = getElement('phase', index);
  $phase.html(html);
  setSelectValue('phase', index, phaseCount - 1);

  let skillHtml = '',
    skillLevelHtml = '',
    skillId, skillData;
  console.log(charData);
  charData.skills.forEach((skill, skillIndex) => {
    if (phaseCount - 1 >= AKDATA.checkEnum("phase", skill.unlockCond.phase)) {
      skillId = skill.skillId;
      skillData = AKDATA.Data.skill_table[skill.skillId];
      skillHtml += `<option value="${skill.skillId}">${skillData.levels[0].name}</option>`;
    }
  });
  let $skill = getElement('skill', index);
  $skill.html(skillHtml);
  setSelectValue('skill', index, skillId);
  for (let j = 0; j < skillData.levels.length; j++) {
    skillLevelHtml += `<option value="${j}">${j+1}</option>`;
  }
  let $skillLevel = getElement('skilllevel', index);
  let skillLevel = skillData.levels.length - 1;
  $skillLevel.html(skillLevelHtml);
  setSelectValue('skilllevel', index, skillLevel);

  $(`.dps__row-prts td:nth-child(${index+2})`).html(`
    <a href="http://prts.wiki/w/${charData.name}#.E6.8A.80.E8.83.BD" target="_blank">
    [点击打开]
    </a>`);

  // equip
  let edb = AKDATA.Data.uniequip_table;
  let equips = [];
  Object.keys(edb["equipDict"]).forEach(key => {
    let item = edb["equipDict"][key];
    if (item.charId == charId)
      equips.push({ id: key, name: item.uniEquipName });
  });
  let equipHtml = equips.map(e => `<option value="${e.id}">${e.name}</option>`).join();
  let equipLevels = [1, 2, 3].map(x => `<option value="${x}">Lv ${x}</option>`).join();
  getElement("equip", index).html(equipHtml);
  getElement("equip_level", index).html(equipLevels);
  let equipId = "";
  let equipLevel = 3;
  if (equips.length > 0) {
    equipId = equips[equips.length-1].id;
    setSelectValue('equip', index, equipId);
    setSelectValue('equip_level', index, 3);
    $(`.dps__equip_info:eq(${index})`).attr("href", `/akdata/equip/#${equipId}`).attr("target", "_blank");
  } else 
    $(`.dps__equip_info:eq(${index})`).attr("href", `###`).attr("target", "");

  Characters[index] = {
    name: charData.name,
    charId,
    skillId,
    skillLevel,
    equipId,
    equipLevel,
    options: {}
  };
  updateOptions(charId, index);
  $phase.change();
}

function updateOptions(charId, index) {
  let opts = AKDATA.Data.dps_options;
  let charData = AKDATA.Data.character_table[charId];
  let scroll_evts = [];
  let html = `    
  <div class="form-check">
    <label class="form-check-label">
      <input class="form-check-input dps__buff" type="checkbox" value="" data-index="${index}" checked>
        计算团辅
        <i class="fas fa-question-circle pull-right" data-toggle="tooltip" data-placement="right"
           title="${opts.tags['buff'].explain}">
        </i>
    </label> </div>`;   // 默认计算团辅
    
  if (opts.char[charId]) {
    let optIndex = 0; // 选项顺序号，用于对象ID
    for (var t of opts.char[charId]) {
      ++optIndex;

      let u = (t.startsWith("cond") ? "cond" : t);  // wildcard cond
      let checked = opts.tags[u].off ? "" : "checked";
      let disabled = (u == "crit" ? "disabled" : "");
      let text = opts.tags[u].displaytext;
      let tooltip = opts.tags[u].explain;

      // June 9: add wildcard cond desciption support
      if (t.startsWith("cond")) {
        let suffix = t.replace("cond", "");
        if ((charId + suffix) in opts.cond_info) {
          let which = opts.cond_info[charId + suffix];
          
          let talent = null;
          if (typeof(which) == "number")
            talent = charData.talents[which-1];
          else if (which == "trait")
            talent = charData.trait;
          else if (which.text) {
            text = "触发 - " + which.text;
            tooltip = which.tooltip;
          }

          if (talent) {
            text = `触发天赋[${which}] - ${talent.candidates[0].name}`;
            if (talent.candidates[0].description)
              tooltip = talent.candidates[0].description.replace(/<.*?>/g, '').replace(/\d+/g, "[x]");
              tooltip += " 　 (效果可能被模组改变)";
            if (which == "trait") {
              text = "触发 - 特性";
            }
            // console.log(text);
          }
        } else tooltip = `触发条件${suffix}`;
      } // if

      switch (opts.tags[u].type) {
        case "bool":
          let html_bool = `
          <div class="form-check">
            <label class="form-check-label">
              <input class="form-check-input dps__${t}" type="checkbox" value="" data-index="${index}" ${checked} ${disabled}>
                ${text}
                <i class="fas fa-question-circle pull-right" data-toggle="tooltip" data-placement="right" title="${tooltip}"></i>
            </label> </div>`;
          html += html_bool;
          break;
        case "scroll":
          let optId = `scr_${index}_${optIndex}`;
          scroll_evts.push({
            optId,  // 滚动条ID
            index,  // 第几排
            tag: t  // 选项名称
          }); // 对应 Characters[index].options[tag] = parseInt($(optId).val())
          let html_scr = pmBase.component.create({
            type: 'scroll',
            id: optId,
            attr: `data-index="${index}" data-tag="${t}"`,
            label: opts.tags[u].displaytext || "",
            min: opts.tags[u].min || 0,
            max: opts.tags[u].max || 3,
            value: opts.tags[u].value || opts.tags[u].max,
            step: opts.tags[u].step || 1,
            style: "width: 40%"
          });
          html += html_scr;
          Characters[index].options[t] = opts.tags[u].value || opts.tags[u].max;
          break;
        case "dialog":
          // 将index和tag保存在data字段，从而在公共的点击事件中定位到具体的Characters[index].options[tag]
          let html_link = `<a href="#" class="opt_dialog" data-index="${index}" data-tag="${t}">
                            ${opts.tags[u].displaytext}
                           </a>`;
          html += html_link;
          // 设置选项的默认值
          Characters[index].options[t] = opts.tags[u].default;
          break;
      }
    } // for
  } // if
  $(`.dps__row-option td:nth-child(${index+2})`).html(html);
  // 绑定scroll事件
  scroll_evts.forEach(x => {
    pmBase.component.create({
      type: 'scroll-event',
      id: x.optId,
      callback: function (value) {
        Characters[index].options[x.tag] = parseFloat(value);
        calculateColumn();
      }
    });
  });
  // 绑定dialog事件
  $(".opt_dialog").click(showOptionDialog);

  getElement("buff", index).change(calculateColumn);
  if (opts.char[charId])
    for (var t of opts.char[charId]) {
      let u = (t.startsWith("cond") ? "cond" : t);  // wildcard cond
      if (opts.tags[u].type == "bool")
        getElement(t, index).change(calculateColumn);
    }
  $('[data-toggle="tooltip"]').tooltip(); 
}

function chooseChar() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let charId = $this.val();
  if (!charId) return;

  updateChar(charId, index);
}

function copyChar() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let charId = Characters[index].charId;
  while (index < charColumnCount-1) {
    ++index;
   // updateChar(charId, index);
   // setSelectValue("char", index, charId);
   selectChar(charId, index);
  }
}

function choosePhase() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let phase = ~~$this.val();

  let charId = Characters[index].charId;
  let charData = AKDATA.Data.character_table[charId];
  let maxLevel = charData.phases[phase].maxLevel;
  let maxSkillLevel = (phase+1)*3;
  let html = [...Array(maxLevel).keys()].map(x => `<option value="${x+1}">${x+1}</option>`).join('');
  let $level = getElement('level', index);
  $level.html(html);
  getElement('skilllevel', index).html(
    [...Array(maxSkillLevel+1).keys()].map(x =>`<option value="${x}">${x+1}</option>`).join(''))
  setSelectValue('level', index, maxLevel);
  setSelectValue('skilllevel', index, maxSkillLevel);

  Characters[index].phase = phase;
  $level.change();
  getElement('skilllevel', index).change();
}

function chooseLevel() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let level = ~~$this.val();
  let pot_elem = getElement('potentialrank', index);

  let max_pot = AKDATA.Data.character_table[Characters[index].charId].maxPotentialLevel;
  if (pot_elem.val() > max_pot)
    pot_elem.val(max_pot);

  Characters[index].level = level;
  Characters[index].potentialRank = parseInt(pot_elem.val());
  Characters[index].favor = ~~(getElement('favor', index).val());
  calculate(index);
}

function chooseEquip() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let eid = $(`.dps__equip:eq(${index})`).val();
  let elv = ~~$(`.dps__equip_level:eq(${index})`).val();

  Characters[index].equipId = eid;
  Characters[index].equipLevel = elv;
  if (eid) {
    $(`.dps__equip_info:eq(${index})`).attr("href", `/akdata/equip/#${eid}`);
  } else 
    $(`.dps__equip_info:eq(${index})`).attr("href", `###`).attr("target", "");
  if (index == 0) calculateAll();
  else calculate(index);
}

// 物理，魔法，治疗，真伤，盾，元素，元素损伤，元素治疗
const DamageColors = ['black','blue','limegreen','gold','#43c6db','#f70d1a','gray','#40e0d0'];

function _fmt(x) {
  return isFinite(x) ? Math.round(x) : "-";
}

function formatDps(dps, damageType, tag=null, precision=0, bold=true) {
  let dpsText = isFinite(dps) ? dps.toFixed(precision) : "-";
  let tagText = tag ? `${tag}: `: "";
  let line = tagText+dpsText;
  if (bold) line = `<b>${line}</b>`;
  return `<span style="color: ${DamageColors[damageType]}">${line}</span>`;
}

// x = { dps, hps, ehps, (extraDamagePool) }
function formatDpsList(x, precision=0, bold=false) {
  let hasTag = ([x.dps, x.hps, x.ehps].count(x => x!=0) > 1);
  let lines = [];
  if (x.dps != 0)
    lines.push(formatDps(x.dps, x.damageType, (hasTag ? "DPS" : null), precision, bold));
  if (x.hps != 0) {
    let hpsColor = x.hps<0 ? 5 : 2;
    if (x.extraDamagePool && x.extraDamagePool[4] > 0) hpsColor = 4;
    lines.push(formatDps(x.hps, hpsColor, (hasTag ? "HPS" : null), precision, bold));
  }
  if (x.ehps != 0)
    lines.push(formatDps(x.ehps, 7, (hasTag ? "EHPS" : null), precision, bold));
  return lines.length == 0 ? "-" : lines.join(", ");
}

function calculate(index) {
  let char = Characters[index];
  let enemy = {
    def: parseFloat($('.dps__enemy-def').val()),
    magicResistance: parseFloat($('.dps__enemy-mr').val()),
    count: $('.dps__enemy-count').val(),
  //  hp: ~~$('.dps__enemy-hp').val(),
    hp: 0,
    epResistance: $('.dps__enemy-er').val(),
    epDamageResistance: $('.dps__enemy-edr').val(),
    dr: $('.dps__enemy-dr').val()
  };
  let raidBuff = {
    atk: parseFloat($('.dps__buff-atk').val()),
    atkpct: parseFloat($('.dps__buff-atkpct').val()),
    ats: parseFloat($('.dps__buff-ats').val()),
    cdr: parseFloat($('.dps__buff-cdr').val()),
    base_atk: parseFloat($('.dps__buff-batk').val()),
    damage_scale: parseFloat($('.dps__buff-scale').val()),
  };
  //console.log(raidBuff);

  // get option info
  let opts = AKDATA.Data.dps_options;

  if (opts.char[char.charId]) {
    for (var t of opts.char[char.charId]) {
      let u = (t.startsWith("cond") ? "cond" : t);  // wildcard cond
      switch (opts.tags[u].type) {
        case "bool":
          char.options[t] = getElement(t, index).is(':checked');
          break;
      }
    }
  }
  // 团辅
  char.options["buff"] = getElement("buff", index).is(':checked');
  // 缪缪: 把第一列的数据传进去
  if (char.charId == "char_249_mlyss" && char.options.token) {
    char.options.tokenChar = Characters[0];
  }
  //console.log(char);
  // calc dps
  let dps = AKDATA.attributes.calculateDps(char, enemy, raidBuff);
  let s = dps.skill;
  char.dps = dps;
  let sdiff = 0;
  let gdiff = 0;
  let defaultDps0 = {
    skill: {
      totalDamage : 0,
      totalHeal: 0
    }
  };
  let dps0 = Characters[0] ? Characters[0].dps : defaultDps0;

  getElement('s_atk', index).html(formatDps(s.atk, s.damageType));
  
  if (dps.normal.damageType != 2) {
    $(".dps__row-n_dps th").text("普攻DPS");
    $(".dps__row-g_dps th").text("平均DPS");
    $(".dps__row-s_dps th").text("技能DPS");
  //  $(".dps__row-a_dps th").text("技能DPS(攻击)");
  } else {
    $(".dps__row-n_dps th").text("普攻HPS");
    $(".dps__row-g_dps th").text("平均HPS");
    $(".dps__row-s_dps th").text("技能HPS");
  //  $(".dps__row-a_dps th").text("技能HPS(攻击)");
  }

  let line = `${s.hitDamage.toFixed(2)} * ${Math.round(s.dur.hitCount*100)/100}`;
  if (s.damageType != 2) {
    $(".dps__row-s_damage th").text("技能总伤害");
   // $("dps__row-s_dps span").text("技能DPS(均摊)");

    var skillDamage = s.totalDamage;    
    if (s.critDamage > 0) line += ` + ${s.critDamage.toFixed(2)} * ${s.dur.critHitCount}`;
    if (s.extraDamage > 0) line += ` + ${s.extraDamage.toFixed(2)}`;
    var tmp = s.hitDamage * s.dur.hitCount + ((s.critDamage * s.dur.critHitCount) || 0) + s.extraDamage;
    if (Math.abs(skillDamage - tmp) > 10) line = "";
    line += ` = ${skillDamage.toFixed(2)}`;
    if (dps0.skill.totalDamage > 0) {
      sdiff = skillDamage / dps0.skill.totalDamage - 1;
      gdiff = dps.globalDps / dps0.globalDps - 1;
     // console.log(sdiff, gdiff);
    }
  } else {
    $(".dps__row-s_damage th").text("技能总治疗");
    var skillDamage = s.totalHeal;
    if (s.extraHeal > 0) line += ` + ${s.extraHeal.toFixed(2)}`;
    var tmp = s.hitDamage * s.dur.hitCount + s.extraHeal;
    if (Math.abs(skillDamage - tmp) > 10) line = "";
    line += ` = ${skillDamage.toFixed(2)}`;
    if (dps0.skill.totalHeal > 0) {
      sdiff = skillDamage / dps0.skill.totalHeal - 1;
      gdiff = dps.globalHps / dps0.globalHps - 1;
     // console.log(sdiff, gdiff);
    }
  }
  // damage
  getElement('s_damage', index).html(line);
  getElement('s_diff', index).text((sdiff*100).toFixed(1));
  getElement('g_diff', index).text((gdiff*100).toFixed(1));
  
  // skill dps
  getElement('s_dps', index).html(formatDpsList(s));

  // normal dps
  getElement('n_dps', index).html(formatDpsList(dps.normal));

  // globalDps
  getElement('g_dps', index).html(formatDpsList({
    dps: dps.globalDps, 
    hps: dps.globalHps, 
    ehps: dps.globalEhps, 
    damageType: dps.skill.damageType
  }));

  // period
  if (dps.normal.dur.stunDuration > 0)
    getElement('period', index).html(`眩晕${dps.normal.dur.stunDuration}s + ${Math.round(dps.normal.dur.duration*100)/100}s + ${Math.round(s.dur.duration*100)/100}s`);
  else if (dps.skill.dur.prepDuration > 0)
    getElement('period', index).html(`${Math.round(dps.normal.dur.duration*100)/100}s + 准备${dps.skill.dur.prepDuration.toFixed(3)}s + ${Math.round(s.dur.duration*100)/100}s`);
  else
    getElement('period', index).html(`${Math.round(dps.normal.dur.duration*100)/100}s + ${Math.round(s.dur.duration*100)/100}s`);

 // console.log(s.dur.tags);
  if (s.dur.tags.includes("infinity"))
    getElement('period', index).html(`${Math.round(dps.normal.dur.duration*100)/100}s + 持续时间无限(记为${Math.floor(dps.skill.dur.duration)}s)`);
  if (s.dur.tags.includes("instant"))
    getElement('s_dps', index).append(" / 瞬发");
  if (s.dur.tags.includes("diff"))
    getElement('s_dps', index).append(` / 持续 ${s.dur.dpsDuration.toFixed(3)}s`);
  if (s.dur.tags.includes("passive")) {
    getElement('s_damage', index).html("-");
    getElement('g_dps', index).html("-");
    getElement('period', index).html("被动");
  }
  if (s.dur.tags.includes("reflect")) {
    getElement('s_dps', index).html("技能伤害为反射伤害");
    getElement("s_damage", index).html(line);
  }
  if (s.dur.tags.includes("auto")) {
    if (s.dur.tags.includes("instant"))
      getElement('period', index).html("落地点火/瞬发");
    else 
      getElement('period', index).append(" / 落地点火");
  }
  if (s.dur.tags.includes("hit"))
    getElement('period', index).append(" / 受击回复");

  let equip_prompt = "";
  if (!(char.charId in AKDATA.Data.mastery) && char.equipId.length > 0 && char.equipLevel > 1)
    equip_prompt = "暂未更新2-3级模组计算结果<br>(结果无效)";
  getElement("note", index).html(dps.note.replace(/\n/g,'<br>').replace(/ /g,'&nbsp;') + equip_prompt);

  // attack time
  getElement("s_att", index).text(`${dps.skill.attackTime.toFixed(3)} s / ${dps.skill.frame} 帧`);
  getElement("n_att", index).text(`${dps.normal.attackTime.toFixed(3)} s / ${dps.normal.frame} 帧`);
  console.log(dps);
}

function calculateAll() {
  Characters.forEach((x, i) => calculate(i));
}

function calculateColumn() {
  let index = ~~($(this).data('index'));
  if (index == 0) calculateAll();
  else calculate(index);
}

function chooseSkill() {
  let index = ~~$(this).data('index');
  Characters[index].skillId = getElement('skill', index).val();
  Characters[index].skillLevel = ~~(getElement('skilllevel', index).val());

  let pot_elem = getElement('potentialrank', index);
  let max_pot = AKDATA.Data.character_table[Characters[index].charId].maxPotentialLevel;
  if (pot_elem.val() > max_pot)
    pot_elem.val(max_pot);
  Characters[index].potentialRank = parseInt(pot_elem.val());

  Characters[index].favor = ~~(getElement('favor', index).val());
  if (index == 0) calculateAll();
  else calculate(index);
}

pmBase.hook.on('init', init);
