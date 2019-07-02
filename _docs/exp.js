const LevelRanges = [
  [
    [1, 30]
  ],
  [
    [1, 30]
  ],
  [
    [1, 40],
    [1, 55]
  ],
  [
    [1, 45],
    [1, 60],
    [1, 70]
  ],
  [
    [1, 50],
    [1, 70],
    [1, 80]
  ],
  [
    [1, 50],
    [1, 80],
    [1, 90]
  ],
];

function init() {
  AKDATA.load([
    'bootstrap-slider',
    'excel/gamedata_const.json'
  ], load);
}

function load() {
  let html = `
<div class="card mb-3 bg-light">
  <div class="card-body">
    <form>
      <div class="form-group row mb-3">
        <label class="col-2 col-form-label">星级</label>
        <div class="col-10">
          <div class="btn-group btn-group-toggle" data-toggle="buttons">
            <label class="btn btn-info"><input class="p-star" type="radio" name="star" value="0">1</label>
            <label class="btn btn-info"><input class="p-star" type="radio" name="star" value="1">2</label>
            <label class="btn btn-info"><input class="p-star" type="radio" name="star" value="2">3</label>
            <label class="btn btn-info"><input class="p-star" type="radio" name="star" value="3">4</label>
            <label class="btn btn-info"><input class="p-star" type="radio" name="star" value="4">5</label>
            <label class="btn btn-info active"><input class="p-star" type="radio" name="star" value="5" checked>6</label>
          </div>
        </div>
      </div>
      <div class="form-group row mb-1 p-begin">
        <label class="col-2 col-form-label">当前等级</label>
        <div class="col-4 input-group mb-3">
          <div class="input-group-prepend btn-group-toggle" data-toggle="buttons">
            <label class="btn btn-info active"><input class="p-phase-begin" type="radio" name="begin" value="0" checked>0</label>
            <label class="btn btn-info"><input class="p-phase-begin" type="radio" name="begin" value="1">1</label>
            <label class="btn btn-info"><input class="p-phase-begin" type="radio" name="begin" value="2">2</label>
          </div>
          <input type="text" class="p-phase-begin-value">
        </div>
        <div class="col-4">
          <input type="text" class="p-range-begin" value="" data-slider-step="10" data-slider-value="1" style="width:100%;"/>
        </div>
      </div>
      <div class="form-group row mb-1 p-end">
        <label class="col-2 col-form-label">目标等级</label>
        <div class="col-4 input-group mb-3">
          <div class="input-group-prepend btn-group-toggle" data-toggle="buttons">
            <label class="btn btn-info active"><input class="p-phase-end" type="radio" name="end" value="0" checked>0</label>
            <label class="btn btn-info"><input class="p-phase-end" type="radio" name="end" value="1">1</label>
            <label class="btn btn-info"><input class="p-phase-end" type="radio" name="end" value="2">2</label>
          </div>
          <input type="text" class="p-phase-end-value">
        </div>
        <div class="col-4">
          <input type="text" class="p-range-end" value="" data-slider-step="10" data-slider-value="1" style="width:100%;"/>
        </div>
      </div>
      <hr>
      <div class="form-group row mb-1 p-end">
        <label class="col-2 col-form-label">所需经验</label>
        <div class="col-10 mb-3 p-totalExp"></div>
      </div>
      <div class="form-group row mb-1 p-end">
        <label class="col-2 col-form-label">升级金币</label>
        <div class="col-10 mb-3 p-expGold"></div>
      </div>
      <div class="form-group row mb-1 p-end">
        <label class="col-2 col-form-label">精英化金币</label>
        <div class="col-10 mb-3 p-evoGold"></div>
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

  $('.p-star, .p-phase-begin, .p-phase-end').change(setStar);
  $(".p-range-begin, .p-range-end").slider({});

  $(".p-begin .slider-track-high").css({
    'background': '#17a2b8'
  });
  $(".p-end .slider-selection").css({
    'background': '#17a2b8'
  });



  //$(".p-range-begin, p-range-end").on('change', onSlide);

  $(".p-range-begin").change(() => $('.p-phase-begin-value').val($(".p-range-begin").val()));
  $(".p-range-end").change(() => $('.p-phase-end-value').val($(".p-range-end").val()));
  $(".p-phase-begin, .p-phase-end, .p-phase-begin-value, .p-phase-end-value").change(change);
  $(".p-range-begin, .p-range-end").bind('slideStop', change);
  setStar();
}

function setStar() {
  let star = $('.p-star:checked').val();
  let phaseBegin = $('.p-phase-begin:checked').val();
  let phaseEnd = $('.p-phase-end:checked').val();
  let ranges = LevelRanges[star];

  for (let i = 0; i < 3; i++) {
    let enabled = i >= ranges.length;
    $(`.p-phase-begin:nth(${i}), .p-phase-end:nth(${i})`).prop('disabled', enabled).parent().toggleClass('disabled', enabled);
  }

  $(".p-range-begin").slider({
    min: ranges[phaseBegin][0],
    max: ranges[phaseBegin][1],
    value: ranges[phaseBegin][0],
  }).slider('refresh');

  $(".p-range-end").slider({
    min: ranges[phaseEnd][0],
    max: ranges[phaseEnd][1],
    value: ranges[phaseEnd][1],
  }).slider('refresh');

  $('.p-phase-begin-value').val(ranges[phaseBegin][0]);
  $('.p-phase-end-value').val(ranges[phaseEnd][1]);
}

function onSlide() {
  let [min, max] = $('.p-range').val().split(',');
  $(".p-range-min").html(min);
  $(".p-range-max").html(max);
}

function reset() {
  $('.p-tag').prop('checked', false);
  $('.p-tag').parent().removeClass('active');
  change();
}

function change() {
  let star = ~~$('.p-star:checked').val();
  let minPhase = ~~$('.p-phase-begin:checked').val();
  let minLevel = ~~$('.p-phase-begin-value').val();
  let maxPhase = ~~$('.p-phase-end:checked').val();
  let maxLevel = ~~$('.p-phase-end-value').val();

  //let minPhaseLevel = minLevel, maxPhaseLevel = LevelRanges[minPhase][star][1];
  let totalExp = 0, expGold = 0, evoGold = 0;
  for (let p = minPhase; p <= maxPhase; p++) {
    let minPhaseLevel = p == minPhase ? minLevel : 1;
    let maxPhaseLevel = p == maxPhase ? maxLevel : LevelRanges[star][p][1];
    for (let l = minPhaseLevel; l < maxPhaseLevel; l++) {
      let exp = AKDATA.Data.gamedata_const.characterExpMap[p][l - 1];
      let gold = AKDATA.Data.gamedata_const.characterUpgradeCostMap[p][l - 1];
      totalExp += exp;
      expGold += gold;
    }
    if ( p > minPhase ) evoGold += AKDATA.Data.gamedata_const.evolveGoldCost[star][p-1];
  }
  $('.p-totalExp').html(totalExp.toLocaleString());
  $('.p-expGold').html(expGold.toLocaleString());
  $('.p-evoGold').html(evoGold.toLocaleString());
}


pmBase.hook.on('init', init);