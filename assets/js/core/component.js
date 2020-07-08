import util from './util.js';

let create = function (key, config) {
  if (typeof key == 'object') {
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

  'card': function (config) {
    let html = `<div class="card mb-3">`;

    if (config.title) {
      html += `<div class="card-header"><div class="card-title m-0 font-weight-bold">${config.title}</div></div>`;
    }

    if (config.body) {
      html += `<div class="card-body">${config.body}</div>`;
    }

    if (config.table) {
      html += config.table;
    }

    if (config.list) {
      html += `<ul class="list-group list-group-flush">${config.list.map(x=>`<li class="list-group-item">${x}</li>`).join('')}</ul>`;
    }

    html += `</div>`;
    return html;
  },

  'info': function (config) {
    let headerHtml = '',
      bodyHtml = '',
      imageHtml = '';
    let imageCol = 0;

    if (config.image) {
      imageCol = config.imageCol || 3;
      imageHtml = `<div class="col-12 col-lg-${imageCol} order-xs-first order-first order-lg-last d-flex">
        <div class="align-self-center flex-grow-1 text-center">${config.image}<hr class="d-lg-none"></div>
      </div>`;
    }

    if (config.header) {
      headerHtml = '<thead><tr>' + config.header.map(x => `<th>${x}</th>`).join('') + '</tr></thead>';
    }

    if (config.ignoreNull) {
      config.list = config.list.filter(x => (x !== null) && (!!x[1] !== false) );
    }

    let labelWidth = 100 * 0.6 / (0.6 + config.list[0].length - 1);

    config.list.forEach((x, i) => {
      bodyHtml += `<tr><td class="c-infotable__label" style="width:${labelWidth}%">${x[0]}</td>`;
      for (let j = 1; j < x.length; j++) {
        bodyHtml += `<td class="c-infotable__data">${x[j]}</td>`;
      }
      bodyHtml += `</tr>`;
    });

    let html = `<div class="row">
      <div class="col-12 col-lg-${12-config.imageCol} order-lg-first">
        <table class="table table-sm c-infotable" style="table-layout:fixed;">
          ${headerHtml}
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
      ${imageHtml}
    </div>`;

    if (config.card) {
      html = create({
        type: 'card',
        table: html,
        title: config.title,
      });
    }

    return html;
  },

  'table': function (config) {
    let headHtml = '',
      bodyHtml = '',
      colHtml = '';
    let tableClass = config['class'] || '';
    let tableAttr = config.attr || '';
    let tableStyle = config.style || '';
    let columns = config.columns || [];
    let bodies = config.bodies || [];
    if (config.body) bodies.push(config.body);

    if (config.small) tableClass += ' table-sm';
    if (config.hover) tableClass += 'table-hover';
    if (config.bordered) tableClass += 'table-bordered';
    if (config.sortable) tableClass += ' sortable';
    if (config.sortlist) tableAttr += ` data-sortlist="[${config.sortlist}]"`;

    if (config.header) columns.push(...config.header);
    for (let i = 0; i < columns.length; i++) {
      if (typeof columns[i] === 'string') columns[i] = {
        header: columns[i]
      };
    }

    if (columns.length > 0) {
      colHtml += '<colgroup>';
      columns.forEach(col => {
        colHtml += '<col';
        if (col.width) colHtml += ` style="width:${col.width};"`;
        if (col.span) colHtml += ` colspan="${col.span};"`;
        colHtml += ` />`;
      });
      colHtml += '</colgroup>';
    }

    if (columns.length > 0) {
      headHtml += '<thead><tr>';
      columns.forEach(col => {
        headHtml += '<th';
        if (col.width) headHtml += ` style="width:${col.width};"`;
        if (col.span) headHtml += ` colspan="${col.span};"`;
        headHtml += `>${col.header}</th>`;
      });
      headHtml += '</tr></thead>';
    }

    bodies.map(body => {
      bodyHtml += '<tbody>';
      body.map(tr => {
        bodyHtml += '<tr>';
        tr.map((cell, col) => {
          bodyHtml += `<td>${cell}</td>`;
        });
        bodyHtml += '</tr>';
      });
      bodyHtml += '</tbody>';
    });

    let html = `<table class="table text-center ${tableClass}" style="${tableStyle}" ${tableAttr}>
      ${colHtml}
      ${headHtml}
      ${bodyHtml}
    </table>`;

    if (config.card) {
      html = create({
        type: 'card',
        table: html,
      });
    }

    return html;
  },


  'list': function (config) {
    let head = '',
      body = '';
    let tableClass = config['class'] || '';
    let tableAttr = config.attr || '';
    let columns = config.columns || [];

    if (config.header) {
      columns.push(...config.header);
    }

    for (let i = 0; i < columns.length; i++) {
      if (typeof columns[i] === 'string') columns[i] = {
        header: columns[i]
      };
    }

    if (columns.length > 0) {
      head += '<tr>';
      columns.forEach(col => {
        head += '<th';
        if (col.width) head += ` style="width:${col.width};"`;
        if (col.span) head += ` colspan="${col.span};"`;
        head += `>${col.header}</th>`;
      });
      head += '</tr>';
    }

    if (config.sortable) {
      tableClass += ' sortable';
    }

    if (config.sortlist) {
      tableAttr += ` data-sortlist="[${config.sortlist}]"`;
    }

    config.list.map(tr => {
      body += '<tr>';
      tr.map((cell, col) => {
        body += `<td class="${columns[col]?columns[col]['class']||'':''}">${cell}</td>`;
      });
      body += '</tr>';
    });

    let html = `<table class="table table-sm table-hover text-center c-listtable ${tableClass}" ${tableAttr}>
      <thead>${head}</thead>
      <tbody>${body}</tbody>
    </table>`;

    if (config.card) {
      html = create({
        type: 'card',
        title: config.title,
        table: html,
      });
    }

    return html;
  },

  'tabs': function (config) {
    config.active = config.active || 0;
    let html = '<ul class="nav nav-tabs">';
    config.tabs.forEach((tab, i) => {
      html += `<li class="nav-item"><a class="nav-link ${i==config.active?'active':''}" data-toggle="tab" href="#" data-target="#tab${i}">${tab.text}</a></li>`;
    });
    html += '</ul>';
    html += '<div class="tab-content pt-3">';
    config.tabs.forEach((tab, i) => {
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

  'modal': function (config) {
    let $e = $('#' + config.id);
    if ($e.length == 0 ){
      let html =`
        <div class="modal fade" id="${config.id}" tabindex="-1" role="dialog" aria-labelledby="exampleModalLongTitle" aria-hidden="true">
        <div class="modal-dialog" role="document" style="max-width:${config.width || 750}px;">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="exampleModalLongTitle">${config.title}</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body" id="vue-dialog">
            </div>
          </div>
        </div>
      </div>
      `;
      $e = $(html);
      $('body').append($e);
    }
    $e.find('.modal-body').html(config.content);
    if (config.show) $e.modal();
  },

}

export default {
  create,
}