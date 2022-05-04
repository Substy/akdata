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
    '../customdata/dps_options.json',
    '../customdata/dps_anim.json',
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
        title: "有新数据，请点击[清除缓存]更新",
        show: true,
      });
      $('#update_prompt').html(["有新数据，请更新", remote, local].join("<br>"));
    } else {
      local = `新增干员：`;
      AKDATA.new_op.forEach(op => {
        local += `<a href='#${op}'>${AKDATA.Data.character_table[op].name}</a>   `;
      });
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

  var charId_hash = window.location.hash.replaceAll("#", "");
  //console.log(charId_hash);

  for (let charId in AKDATA.Data.character_table) {
    let charData = AKDATA.Data.character_table[charId];
    if (charData.skills.length == 0) excludeChars.push(charId);
  }


  let html = `
<div class="card mb-2">
  <div class="card-header">
    <div class="card-title mb-0">干员（点击头像选择）</div>
  </div>
  <table class="table dps" style="table-layout:fixed;">
  <tbody>
    <tr class="dps__row-select" style="width:20%;"> <th style="width:240px;">干员</th> </tr>
    <tr class="dps__row-level"> <th>等级</th> </tr>
    <tr class="dps__row-potentialrank"> <th>潜能</th> </tr>
    <tr class="dps__row-favor"> <th>信赖</th> </tr>
    <tr class="dps__row-equip"> <th>模组(精二生效)</th> </tr>
    <tr class="dps__row-skill"> <th>技能</th> </tr>
    <tr class="dps__row-option"> <th>选项</th> </tr>
    <tr class="dps__row-prts"> <th>PRTS干员页面</th> </tr>
  </tbody>
  <tbody>
    <tr class="dps__row-period"> 
      <th>技能周期
        <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-html="true" data-placement="right"
           title="普攻时间 + 技能持续时间 [ + 眩晕时间 ]"></i>
      </th></tr>
    <tr class="dps__row-s_atk"> <th>技能攻击力 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="角色攻击力（计算技能倍数）"></i></th> </tr>
    <tr class="dps__row-s_damage"> <th>技能总伤害 <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="单次伤害 x 命中数"></i></th> </tr>
    <tr class="dps__row-s_dps"> <th><font color="blue"><span>技能DPS</span></font><i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="技能总伤害 / 持续时间（包括罚站时间）"></i></th></tr>
  <!--  <tr class="dps__row-a_dps"> <th><font color="silver"><span>技能DPS(攻击)</span></font><i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="技能单次伤害 / 攻击间隔，不考虑攻击力变化和暴击"></i></th></tr> -->
    <tr class="dps__row-n_dps"> <th>普攻</th> </tr>
    <tr class="dps__row-g_dps"> <th>平均</th> </tr>
    <tr class="dps__row-s_att"> <th>技能攻击间隔</th> </tr>
    <tr class="dps__row-n_att"> <th>普攻攻击间隔</th> </tr>
    <tr class="dps__row-s_diff"> <th>技能总伤害提升% <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="对比首列 +/-%"></i></th> </tr>
    <tr class="dps__row-g_diff"> <th>平均DPS提升% <i class="fas fa-info-circle pull-right" data-toggle="tooltip" data-placement="right" title="对比首列 +/-%"></i></th> </tr>
  </tbody>
  <tbody class="">
    <tr class="dps__row-damagepool"> <th>伤害表<i class="fas fa-info-circle pull-right" data-toggle="tooltip" title="详细的伤害表格"></i></th></tr>
    <tr class="dps__row-anim"> <th>动画帧数</th></tr>
    <tr class="dps__row-results"> <th>计算过程(用于验算)</th> </tr>
    <tr class="dps__row-note"> <th>说明</th> </tr>
  </tbody>
  </table>
</div>
<div class="card">
  <div class="card-header">
    <div class="card-title mb-0">敌人</div>
  </div>
  <table class="table dps" style="table-layout:fixed;">
    <tbody>
      <tr>
        <th>防御力</th>
        <th>法术抗性</th>
      <!--  <th>HP</th> -->
        <th>数量</th>
      </tr>
      <tr>
      <td><input type="text" class="dps__enemy-def" value="0"></td>
      <td><input type="text" class="dps__enemy-mr" value="0"></td>
    <!--  <td><input type="text" class="dps__enemy-hp" value="0"></td> -->
      <td><input type="text" class="dps__enemy-count" value="1"></td>
      </tr>
    </tbody>
  </table>
</div>
<div class="card">
  <div class="card-header">
    <div class="card-title mb-0">团辅（输入整数）</div>
  </div>
  <table class="table dps" style="table-layout:fixed;">
    <tbody>
      <tr>
        <th>攻击力(+x)</th>
        <th>攻击力(+x%)</th>
        <th>攻速(+x)</th>
        <th>技力恢复(+x%)</th>
        <th>原本攻击力变化<br>(危机合约Tag +/-%)</th>
        <th>伤害倍率<br>(damage_scale + x%)</th>
      </tr>
      <tr>
      <td><input type="text" class="dps__buff-atk" value="0"></td>
      <td><input type="text" class="dps__buff-atkpct" value="0"></td>
      <td><input type="text" class="dps__buff-ats" value="0"></td>
      <td><input type="text" class="dps__buff-cdr" value="0"></td>
      <td><input type="text" class="dps__buff-batk" value="0"></td>
      <td><input type="text" class="dps__buff-scale" value="0"></td>
      </tr>
    </tbody>
  </table>
</div>
  `;
  let $dps = $(html);

  for (let i = 0; i < charColumnCount; i++) {
    $dps.find('.dps__row-select').append(`<td>
      <div class="input-group">
        <table style="table-layout: fixed; width: 100%">
          <tr>
            <td rowspan="3" style="padding: 0; width: 50%">
              <figure class="figure">
                <img class="img_char figure-img" style="max-width: 75%; height: auto" data-index="${i}" src="/akdata/assets/images/char/char_504_rguard.png"></img>
                <figcaption class="figure-caption txt_char" style="max-width: 75%; font-weight:600; font-size: 1vw; color: #000; text-align: center;" data-index="${i}">-</figcaption>
              </figure>
            </td>
            <td style="padding: 0">
              <button class="btn btn-outline-secondary dps__goto p-2 visible-desktop" style="float:right" data-index="${i}" type="button">
                详细属性<i class="fa fa-info-circle"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td style="padding: 0">
              <button class="btn btn-outline-secondary dps__mastery p-2 visible-desktop" style="float:right" data-index="${i}" type="button">
                专精收益<i class="fa fa-cubes"></i>
              </button>
            </td>
          </tr>
          <tr>
            <td style="padding: 0"><button class="dps__copy btn btn-outline-info p-2 visible-desktop" style="float:right" data-index="${i}">复制到右侧</button></td>
          </tr>
        </table>
      </div>
    </td>`);

    $dps.find('.dps__row-level').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control form-control-sm col-7 dps__phase" data-index="${i}"></select><select class="form-control form-control-sm col-5 dps__level" data-index="${i}"></select></div></div></td>`);
    $dps.find('.dps__row-atk').append(`<td><div class="dps__atk" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-attackSpeed').append(`<td><div class="dps__attackSpeed" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-baseAttackTime').append(`<td><div class="dps__baseAttackTime" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-dps').append(`<td><div class="dps__dps" data-index="${i}"></div></td>`);
    $dps.find('.dps__row-skill').append(`<td><div class="container"><div class="form-group row mb-0"><select class="form-control form-control-sm col-7 dps__skill" data-index="${i}"></select><select class="form-control form-control-sm col-5 dps__skilllevel" data-index="${i}"></select></div></div></td>`);
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
    $dps.find('.dps__row-prts').append(`<td></td>`);  
    $dps.find('.dps__row-option').append(`<td></td>`);
    $dps.find('.dps__row-damagepool').append(`<td><a class="dps__damagepool" data-index="${i}" href="###">[点击显示]</a></td>`);
    $dps.find('.dps__row-anim').append(`<td><a class="dps__anim" data-index="${i}" href="###">[点击显示]</a></td>`);
    $dps.find('.dps__row-potentialrank').append(`<td><select class="form-control form-control-sm dps__potentialrank" data-index="${i}">${[0,1,2,3,4,5].map(x=>`<option value="${x}">${x+1}</option>`).join('')}</select></td>`);
    $dps.find('.dps__row-favor').append(`<td><select class="form-control form-control-sm dps__favor" data-index="${i}">${Object.keys(new Array(51).fill(0)).map(x=>`<option value="${x*2}">${x*2}</option>`).join('')}</select></td>`);
    $dps.find('.dps__row-equip').append(`<td><select class="form-control form-control-sm dps__equip" data-index="${i}"></select>
                                             <a class="dps__equip_info" data-index="${i}" href="###">模组信息</a></td>`);
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
  $('.dps__skill, .dps__skilllevel, .dps__potentialrank, .dps__favor').change(chooseSkill);
  $('.dps__enemy-def, .dps__enemy-mr, .dps__enemy-count, .dps__enemy-hp').change(calculateAll);
  $('.dps__buff-atk, .dps__buff-atkpct, .dps__buff-ats, .dps__buff-cdr, .dps__buff-batk, .dps__buff-scale').change(calculateAll);

  $('.dps__results').click(showDetail);
  $('.dps__damagepool').click(showDamage);
  $('.dps__anim').click(showAnim);
  $('.dps__goto').click(goto);
  $('.dps__mastery').click(gotoMastery);
  $('.dps__copy').click(copyChar);
  $('.img_char').click(showSelectChar);
  
  if (charId_hash.length > 0) selectChar(charId_hash, 0);
  
}

window.onhashchange = function () {
  var charId_hash = window.location.hash.replaceAll("#", "");
  //console.log(charId_hash);
  if (charId_hash.length > 0) selectChar(charId_hash, 0);  
}

function selectChar(charId, i) {
  //console.log(charId);
  if (charId && charId != "-") {
    var name = AKDATA.Data.character_table[charId].name;
    $(`.txt_char:eq(${i})`).text(name);
    $(`.img_char:eq(${i})`).attr("src", `/akdata/assets/images/char/${charId}.png`);
    updateChar(charId, i);
  }
}

function showSelectChar() {
  let __this=$(this);
  let index = ~~__this.data("index");
  AKDATA.selectCharCallback = function (id) { selectChar(id, index); }
  AKDATA.showSelectCharDialog(excludeChars, Characters[0] ? Characters[0].charId : null);
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
    content: markdown.makeHtml(Characters[index].dps.log).replace(/table/g, 'table class="table"'),
    width: 750,
    title: name + " - " + Characters[index].dps.skillName,
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
    
    let pool = [0, 1, 2, 3].map(x => Math.round(d.damagePool[x] + d.extraDamagePool[x]), 0);
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
  //if ( $e.val() === null ) {
  //  let last = $e.find('option:last-child').val();
  //  $e.val( last );
  //}
  //if (index > 0) {
  //  let $prev = getElement(name, index - 1);
  //  value = Math.min( $e[0].length, $prev.val() );
  //}
}

function updateChar(charId, index) {
  if (!charId) return;

  let charData = AKDATA.Data.character_table[charId];
  let phaseCount = charData.phases.length;
  let html = [...Array(phaseCount).keys()].map(x => `<option value="${x}">精英${x}</option>`).join('');
  let $phase = getElement('phase', index);
  $phase.html(html);
  setSelectValue('phase', index, phaseCount - 1);

  let skillHtml = '',
    skillLevelHtml = '',
    skillId, skillData;
  charData.skills.forEach((skill, skillIndex) => {
    if (phaseCount - 1 >= skill.unlockCond.phase) {
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

  updateOptions(charId, index);
  $(`.dps__row-prts td:nth-child(${index+2})`).html(`<a href="http://prts.wiki/w/${charData.name}#.E6.8A.80.E8.83.BD" target="_blank">点击打开</a>`);

  // equip
  let edb = AKDATA.Data.uniequip_table;
  let equips = [];
  Object.keys(edb["equipDict"]).forEach(key => {
    let item = edb["equipDict"][key];
    if (item.charId == charId)
      equips.push({ id: key, name: item.uniEquipName });
  });
  let equipHtml = equips.map(e => `<option value="${e.id}">${e.name}</option>`).join();
  getElement("equip", index).html(equipHtml);
  let equipId = "";
  if (equips.length > 0) {
    equipId = equips[equips.length-1].id;
    setSelectValue('equip', index, equipId);
    $(`.dps__equip_info:eq(${index})`).attr("href", `/akdata/equip/#${equipId}`).attr("target", "_blank");
  } else 
    $(`.dps__equip_info:eq(${index})`).attr("href", `###`).attr("target", "");

  Characters[index] = {
    name: charData.name,
    charId,
    skillId,
    skillLevel,
    equipId
  };
  $phase.change();
}

function updateOptions(charId, index) {
  let opts = AKDATA.Data.dps_options;
  let charData = AKDATA.Data.character_table[charId];
  let html = `    
  <div class="form-check">
    <label class="form-check-label" data-toggle="tooltip" data-placement="right" title="${opts.tags['buff'].explain}">
      <input class="form-check-input dps__buff" type="checkbox" value="" data-index="${index}" checked>
        计算团辅
    </label> </div>`;   // 默认计算团辅
    
  if (opts.char[charId]) {
    for (var t of opts.char[charId]) {
      let checked = opts.tags[t].off ? "" : "checked";
      let text = opts.tags[t].displaytext;
      let tooltip = opts.tags[t].explain;

      if (t == "cond" && opts.cond_info[charId]) {
        let which = opts.cond_info[charId];
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
          text = "触发 - " + talent.candidates[0].name;
          if (which == "trait") {
            text = "触发 - 特性";
          }
          console.log(text);
        }
      }

      let html_bool = `
      <div class="form-check">
        <label class="form-check-label" data-toggle="tooltip" data-placement="right" title="${tooltip}">
          <input class="form-check-input dps__${t}" type="checkbox" value="" data-index="${index}" ${checked}>
            ${text}
        </label> </div>`;
      html += html_bool;
    }
  }
  $(`.dps__row-option td:nth-child(${index+2})`).html(html);
  getElement("buff", index).change(calculateColumn);
  if (opts.char[charId])
    for (var t of opts.char[charId]) {
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
  let html = [...Array(maxLevel).keys()].map(x => `<option value="${x+1}">${x+1}</option>`).join('');
  let $level = getElement('level', index);
  $level.html(html);
  setSelectValue('level', index, maxLevel);

  Characters[index].phase = phase;
  $level.change();
}

function chooseLevel() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let level = ~~$this.val();
  let pot_elem = getElement('potentialrank', index);

  // 暴行
  if (Characters[index].charId == "char_230_savage" && ~~(pot_elem.val()) > 1) {
    pot_elem.val(1);
  }

  // 九色鹿
  if (Characters[index].charId == "char_4019_ncdeer" && ~~(pot_elem.val()) > 0) {
    pot_elem.val(0);
  }

  Characters[index].level = level;
  Characters[index].potentialRank = ~~(pot_elem.val());
  Characters[index].favor = ~~(getElement('favor', index).val());

  calculate(index);
}

function chooseEquip() {
  let $this = $(this);
  let index = ~~$this.data('index');
  let eid = $this.val();

  Characters[index].equipId = eid;
  if (eid) {
    $(`.dps__equip_info:eq(${index})`).attr("href", `/akdata/equip/#${eid}`);
  } else 
    $(`.dps__equip_info:eq(${index})`).attr("href", `###`).attr("target", "");
  if (index == 0) calculateAll();
  else calculate(index);
}

const DamageColors = ['black','blue','limegreen','gold','aqua'];

function calculate(index) {
  let char = Characters[index];
  let enemy = {
    def: parseFloat($('.dps__enemy-def').val()),
    magicResistance: parseFloat($('.dps__enemy-mr').val()),
    count: $('.dps__enemy-count').val(),
  //  hp: ~~$('.dps__enemy-hp').val(),
    hp: 0,
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
  char.options = {};
  if (opts.char[char.charId]) {
    for (var t of opts.char[char.charId]) {
      if (opts.tags[t].type == "bool") {
        char.options[t] = getElement(t, index).is(':checked');
      }
    }
  }
  // 团辅
  char.options["buff"] = getElement("buff", index).is(':checked');
  //console.log(char.options);

  // calc dps
  let dps = AKDATA.attributes.calculateDps(char, enemy, raidBuff);
  let s = dps.skill;
  char.dps = dps;
  let sdiff = 0;
  let gdiff = 0;
  let dps0 = Characters[0].dps;

  getElement('s_atk', index).html(`<b>${Math.round(s.atk)}</b>`).css("color", DamageColors[s.damageType]);
  
  if (dps.normal.damageType != 2) {
    $(".dps__row-n_dps th").text("普攻DPS");
    $(".dps__row-g_dps th").text("平均DPS");
  } else {
    $(".dps__row-n_dps th").text("普攻HPS");
    $(".dps__row-g_dps th").text("平均HPS");
  }

  let line = `${s.hitDamage.toFixed(2)} * ${s.dur.hitCount}`;
  if (s.damageType != 2) {
    $(".dps__row-s_damage th").text("技能总伤害");
    $("dps__row-s_dps span").text("技能DPS(均摊)");
    $("dps__row-a_dps span").text("技能DPS(攻击)");
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
    $("dps__row-s_dps span").text("技能HPS(均摊)");
    $("dps__row-a_dps span").text("技能HPS(攻击)");
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
  var color = (s.dps == 0) ? DamageColors[2] : DamageColors[s.damageType];  
  if (s.hps == 0 || s.dps == 0) {                       
    getElement('s_dps', index).html(Math.round(s.dps || s.hps)).css("color", color);
  } else {
    getElement('s_dps', index).html(`DPS: ${Math.round(s.dps)}, HPS: ${Math.round(s.hps)}`).css("color", color);
  }
  // attack dps
  if (s.attackTime > 0) {
    getElement('a_dps', index).html(Math.round(s.hitDamage / s.attackTime)).css("color", color);
  } else {
    getElement('a_dps', index).text("瞬发");
  }
  // normal dps
  if (dps.normal.hps == 0 || dps.normal.dps == 0) {
    color = (dps.normal.dps == 0) ? DamageColors[2] : DamageColors[dps.normal.damageType];
    getElement('n_dps', index).html(Math.round(dps.normal.dps || dps.normal.hps)).css("color", color);
  } else {
    getElement('n_dps', index).html(`DPS: ${Math.round(dps.normal.dps)}, HPS: ${Math.round(dps.normal.hps)}`).css("color", color);
  }
  // period
  if (dps.normal.dur.stunDuration > 0)
    getElement('period', index).html(`眩晕${dps.normal.dur.stunDuration}s + ${Math.round(dps.normal.dur.duration*100)/100}s + ${Math.round(s.dur.duration*100)/100}s`);
  else if (dps.skill.dur.prepDuration > 0)
    getElement('period', index).html(`${Math.round(dps.normal.dur.duration*100)/100}s + 准备${dps.skill.dur.prepDuration}s + ${Math.round(s.dur.duration*100)/100}s`);
  else
    getElement('period', index).html(`${Math.round(dps.normal.dur.duration*100)/100}s + ${Math.round(s.dur.duration*100)/100}s`);

 // console.log(s.dur.tags);
  if (s.dur.tags.includes("infinity"))
    getElement('period', index).html(`${Math.round(dps.normal.dur.duration*100)/100}s + 持续时间无限(记为${dps.skill.dur.duration.toFixed(1)}s)`);
  if (s.dur.tags.includes("instant"))
    getElement('s_dps', index).append(" / 瞬发");
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

    // globalDps
  if (dps.globalDps == 0 || dps.globalHps == 0)
    getElement('g_dps', index).html(Math.round(dps.globalDps || dps.globalHps)).css("color", DamageColors[dps.normal.damageType]);  
  else 
    getElement('g_dps', index).html(`DPS: ${dps.globalDps.toFixed(1)}, HPS: ${dps.globalHps.toFixed(1)}`);
//  getElement('e_time', index).html(dps.killTime ?  `${Math.ceil(dps.killTime)}秒` : '-');
  getElement("note", index).html(dps.note.replace(/\n/g,'<br>').replace(/ /g,'&nbsp;'));

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
  Characters[index].potentialRank = ~~(getElement('potentialrank', index).val());
  Characters[index].favor = ~~(getElement('favor', index).val());
  if (index == 0) calculateAll();
  else calculate(index);
}

pmBase.hook.on('init', init);
