const apPerDay = 240;

function init() {
  AKDATA.loadData(['excel/gamedata_const.json'], () => {

    let header = ['等级', '理智', '升级所需经验', '升级需要理智', '需要天数', '总累计天数' ];
    let list = [];

    let totalAp = apPerDay;
    let totalDay = 1;
    let requireAp = 0;

    for(let level = 0;level < AKDATA.Data.gamedata_const.maxPlayerLevel; level ++ ){
      let ap = AKDATA.Data.gamedata_const.playerApMap[level];
      let exp = AKDATA.Data.gamedata_const.playerExpMap[level];
      let reqAp = Math.ceil(exp / 12);
      let reqDays = Math.max( 0, ( (reqAp - ap) / apPerDay) ).toFixed(1);

      totalAp += ap;
      requireAp += exp / 12;
      while (requireAp > totalAp) {
        totalDay += 1;
        totalAp += apPerDay;
        if ( totalAp % 7 == 1 ) totalAp += 200;
      }

      list.push([
        level+1,
        ap,
        exp,
        reqAp,
        `${reqDays}天`,
        `第${totalDay}天`,
      ]);
    }

    pmBase.content.build({
      pages: [{
        content: pmBase.component.create('list', {list, header, card:true}),
      }]
    });

  });
}

pmBase.init( init );