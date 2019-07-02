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
    let head = '', body = '';
    let tableClass = config['class'] || '';
    let tableAttr = config.attr || '';
    let columns = config.columns || [];

    if (config.header) {
      columns.push(...config.header);
    }

    for (let i = 0; i < columns.length; i++) {
      if (typeof columns[i] === 'string') columns[i] = { header: columns[i] };
    }
    
    if ( columns.length > 0 ) {
      head += '<tr>' + columns.map( x => `<th style="${x.width?'width:'+x.width:''}"">${x.header}</th>`).join(''); + '</tr>';
    }

    if (config.sortable) {
      tableClass += ' sortable';
    }

    if (config.sortlist) {
      tableAttr += ` data-sortlist="[${config.sortlist}]"`;
    }

    config.list.map( tr => {
      body += '<tr>';
      tr.map( (cell,col) => {
        body += `<td class="${columns[col]?columns[col]['class']||'':''}">${cell}</td>`;
      });
      body += '</tr>';
    });

    return `<table class="table table-sm table-hover text-center c-listtable ${tableClass}" ${tableAttr}>
      <thead>${head}</thead>
      <tbody>${body}</tbody>
    </table>`;
  },

  'tabs': function (config) {
    config.active = config.active || 0;
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

    let id = util.getUniqueID();
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