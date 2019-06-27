import AKDATA from './core.js';

function init() {
  AKDATA.loadData(['excel/favor_table.json'], () => {

    let head = ['信赖', '经验值', '百分比' ];
    
    let list = AKDATA.Data.favor_table.favorFrames.map( (data, index) =>{
      return [ index, data.level, data.data.percent ];
    });

    let html = '';

    html += '<canvas id="myChart" width="400" height="200"></canvas>';

    html += pmBase.content.create('sortlist', list, head);

    pmBase.content.build({
      pages: [{
        content: html,
      }]
    });

    let yList = AKDATA.Data.favor_table.favorFrames.map( data => data.level );
    let xList = AKDATA.Data.favor_table.favorFrames.map( data => data.data.percent );
    console.log();
    var ctx = document.getElementById('myChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: xList,
          datasets: [
              {
                data: yList,
                pointRadius: 0,
              }
          ]
        },
        options: {
            legend: {
                display: false,
            }
        }
    });

  });
}

pmBase.init( init );