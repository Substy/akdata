import AKDATA from './core.js';

function init() {
  AKDATA.loadData(['../excel/gamedata_const.json'], () => {

    let head = ['等级', '理智', '升级所需经验', '升级需要理智', '升级需要天数' ];
    let list = [];
    for(let level = 0;level < AKDATA.Data.gamedata_const.maxPlayerLevel; level ++ ){
      let ap = AKDATA.Data.gamedata_const.playerApMap[level];
      let exp = AKDATA.Data.gamedata_const.playerExpMap[level];
      let reqAp = Math.ceil(exp / 12);
      let reqDays = Math.max( 0, ( (reqAp - ap) / 240) ).toFixed(1);
      list.push([
        level+1,
        ap,
        exp,
        reqAp,
        reqDays + '（天）',
      ])
    }

    let html = '';
    html += pmBase.content.create('list', list, head);

    pmBase.content.build({
      pages: [{
        content: html,
      }]
    });

  });
}

pmBase.init( init );