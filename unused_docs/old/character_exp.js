function init() {
  AKDATA.load(['excel/gamedata_const.json', 'chart.js'], () => {
    let html = '';

    html += '<canvas id="myChart" width="400" height="200"></canvas>';

    pmBase.content.build({
      pages: [{
        content: html,
      }]
    });

    let yList1 = AKDATA.Data.gamedata_const.characterExpMap[0].filter(x=>x>0).map( (data,i) => data );
    let yList2 = AKDATA.Data.gamedata_const.characterExpMap[1].filter(x=>x>0).map( (data,i) => data );
    let yList3 = AKDATA.Data.gamedata_const.characterExpMap[2].filter(x=>x>0).map( (data,i) => data );
    let xList1 = AKDATA.Data.gamedata_const.characterExpMap[2].map( (data,i) => i+1 );

    let yList4 = AKDATA.Data.gamedata_const.characterUpgradeCostMap[0].map( (data,i) => data ).filter(x=>x>0);
    let yList5 = AKDATA.Data.gamedata_const.characterUpgradeCostMap[1].map( (data,i) => data ).filter(x=>x>0);
    let yList6 = AKDATA.Data.gamedata_const.characterUpgradeCostMap[2].map( (data,i) => data ).filter(x=>x>0);
    let xList2 = AKDATA.Data.gamedata_const.characterUpgradeCostMap[2].map( (data,i) => i );
    
    var ctx = document.getElementById('myChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: xList1,
          datasets: [
            {
              label: '精英化0',
              data: yList1,
              pointRadius: 0,
            },
            {
              label: '精英化1',
              data: yList2,
              pointRadius: 0,
            },
            {
              label: '精英化2',
              data: yList3,
              pointRadius: 0,
            }
          ]
        },
        options: {

        }
    });

  });
}

pmBase.init( init );