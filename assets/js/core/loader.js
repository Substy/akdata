import hook from './hook.js';
import config from './config.js';

const Libs = {
  'bootstrap-slider': {
    js: [
      'https://unpkg.zhimg.com/bootstrap-slider@10.6.1/dist/bootstrap-slider.min.js'
    ],
    css: [
      'https://unpkg.zhimg.com/bootstrap-slider@10.6.1/dist/css/bootstrap-slider.min.css'
    ],
  },

  'lz-string': {
    js: [
    'https://unpkg.zhimg.com/lz-string@1.4.4/libs/lz-string.min.js',
    ],
  },

  'chart.js': {
    js: [
      'https://unpkg.zhimg.com/chart.js@2.8.0/dist/Chart.min.js',
    ],
  },

  'debug': {
    js: [
      'http://127.0.0.1:4000/akdata/assets/js/debug.js',
    ],
  },

};

function loadItem ( item ) {
  let queue = [];

  if ( item.js ) {
    if ( typeof item.js == 'string' ) item.js = [item.js];
    item.js.map( url=> {
      let request = $.getScript(url);
      queue.push(request);
    });
  }

  if ( item.css ) {
    if ( typeof item.css == 'string' ) item.css = [item.css];
    item.css.map( url=> {
      $('<link>')
      .attr({
          type: 'text/css', 
          rel: 'stylesheet',
          href: url
      })
      .appendTo('head');
    });
    queue.push(true);
  }

  if ( item.json ) {
    if ( typeof item.json == 'string' ) item.css = [item.json];
    item.json.map( url=> {
      let request = $.getJSON(url);
      queue.push(request);
    });
  }

  if ( item.request ) {
    queue.push(...request);
  }

  return queue;
}

function using( arr, callback) {
  if ( typeof arr === 'string' || arr.constructor === Object ) arr = [arr];

  let queue = [];
  arr.map( item => {
    if ( typeof item.then === 'function' ){
      queue.push(item);
    }
    else if ( typeof item === 'object' ) {
      queue.push(...loadItem(item));
    }
    else if ( item in Libs ) {
      queue.push(...loadItem(Libs[item]));
    }
    else {
      queue.push(...loadItem({
        js: item,
      }));
    }
  });

  if ( callback ) {
    $.when(...queue).then(() => {
      callback();
    });
  }
}

function getJSON(url, callback) {
  let xhr = new XMLHttpRequest();
  xhr.onload = function () {
    let data = JSON.parse(this.responseText);
    callback(data)
  };
  xhr.open('GET', url, true);
  xhr.send();
}

hook.on('load', function () {
  $('.c-loading').attr('class', 'c-loading c-loading--step-4');
});

export default {
  using,
}