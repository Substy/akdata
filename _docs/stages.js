import AKDATA from './core.js';

function init() {
  AKDATA.loadData([
    'excel/zone_table.json',
    'excel/stage_table.json',
  ], load);
}

function load() {
  let selector = {};
  let list = [];

  Object.entries(AKDATA.Data.zone_table.zones).forEach( ([key, value]) => {
    let zoneName = value.zoneNameFirst
      ? `${value.zoneNameFirst} ${value.zoneNameSecond}`
      : value.zoneNameSecond;
    list.push([
      `<a href="#!/${value.zoneID}">${zoneName}</a>`,
    ]);
    selector[value.zoneID] = zoneName;
  });

	pmBase.content.build({
	  pages: [{
      content: pmBase.content.create('list', list),
    },{
      content: show,
      control: selector,
    }]
	});
}

function show(hash) {
  let zoneID = hash.value;
  let totalComfort = 0;

  let head = [ '编号', '关卡', '推荐等级', '演习', '理智', 'Exp', 'Gold', '信赖' ];
  let list = Object.entries(AKDATA.Data.stage_table.stages)
    .filter( ([key, value]) => value.zoneId == zoneID)
    .map( ([key, value]) => [
      value.code,
      `<a href="${pmBase.url.getHref( 'levels', value.levelId)}">${value.name}</a>` + (value.stageId.includes('#f#')?' <small>（突袭）</small>':''),
      value.dangerLevel,
      value.practiceTicketCost == -1 ? '-' : value.practiceTicketCost,
      value.apCost,
      value.expGain,
      value.goldGain,
      value.completeFavor,
    ]);
    
  let content = pmBase.content.create('list', list, head);
  return content;
}

function formatString(string) {
  return string;
}

pmBase.hook.on( 'init', init );