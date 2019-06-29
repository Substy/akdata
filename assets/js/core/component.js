import util from './util.js';

let create = function (key, config) {
  if ( typeof key == 'object' ) {
    config = key;
    key = config.type;
  }
  key = key.toLowerCase();
  if (key in createFunctions) {
    return createFunctions[key](config);
  } else {
    return '[err]';
  }
};

let createFunctions = {
  'info': function (config) {
    let header, body, image;
    if (skipNull) {
      config.data = config.data.filter(x => (x !== null) && (x[1] !== false));
    }
    body = config.data.map((x, i) => `<tr><td>${x.join('</td><td>')}</td></tr>`).join('');
    if (config.image) {
      image = `<div class="col-12 col-lg-3 order-xs-first order-first order-lg-last d-flex">
        <div class="align-self-center flex-grow-1 text-center">${config.image}<hr class="d-lg-none"></div>
      </div>`;
    }
    let html = `<div class="row">
      <div class="col-12 col-lg-${image?9:12} order-lg-first">
        <table class="table table-sm c-infotable">
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${image}
    </div>`;
    return html;
  },

  'list': function (config) {
    let header, body, image;
    let classes = config.class || '';
    let attr = config.attr || '';
    if (config.header) {
      let styles = new Array(config.header.length).fill('');
      if (config.widths) {
        config.widths.forEach((x, i) => {
          if (x) styles[i] += ` width:${x};`;
        });
      }
      header = config.header.map((x, i) => `<th style="${styles[i]}">${x}</th>`).join('');
    }
    if (config.sortable) {
      classes += ' sortable';
    }
    if (config.sortlist) {
      attr += ` data-sortlist="[${config.sortlist}]"`;
    }
    body = config.list.map((x, i) => `<tr><td>${x.join('</td><td>')}</td></tr>`).join('');

    return `<table class="table table-sm table-hover text-center c-listtable ${classes}" ${attr}>
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
  },

  'tabs': function (config) {
    config.active = config.active || 0;
    let id = util.getUniqueID();
    let html = '<ul class="nav nav-tabs">';
    config.tabs.forEach((tab,i)=>{
      html += `<li class="nav-item"><a class="nav-link ${i==config.active?'active':''}" data-toggle="tab" href="#" data-target="#tab${i}">${tab.text}</a></li>`;
    });
    html += '</ul>';
    html += '<div class="tab-content pt-3">';
    config.tabs.forEach((tab,i)=>{
      html += `<div class="tab-pane  ${i==config.active?'active':''}" id="tab${i}">${tab.content}</div>`;
    });
    html += '</div>';
    return html;
    html = '<div class="c-tabs">';
    for (let i = 0; i < names.length; i++) {
      html += `
        <input type="radio" id="js-tabs-${id}-${i}" class="c-tabs__input c-tabs__input--${i}" name="${id}" ${i===0?'checked':''}>
        <label class="c-tabs__label" for="js-tabs-${id}-${i}">${names[i]}</label>
      `;
    }
    for (let i = 0; i < names.length; i++) {
      html += `<div class="c-tabs__content c-tabs__content--${i}">${contents[i]}</div>`;
    }
    html += '</div>';
    return html;
  },

  'stack': function (x1, x2) {
    return `<span class="fa-stack">
      <i class="far fa-${x1} fa-stack-2x"></i>
      <strong class="fa-stack-1x">${x2}</strong>
    </span>`;
  },
}

export default {
  create,
}