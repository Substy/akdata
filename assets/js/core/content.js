import url from './url.js';
import util from './util.js';

let createFunctions = {

  'select': function (html) {
    return `<select class="form-control p-selector">${html}</select>`;
  },

  'info': function (data, image) {
    let imageTD = image ? `<div class="col-12 col-lg-3 order-xs-first order-first order-lg-last d-flex"><div class="align-self-center flex-grow-1 text-center">${image}<hr class="d-lg-none"></div></div>` : '';
    if (typeof data !== 'string') data = data.filter(x => (x !== null) && (x[1] !== false)).map((x, i) => `<tr><td>${x.join('</td><td>')}</td></tr>`).join('');
    return `<div class="row">
      <div class="col-12 col-lg-${imageTD?9:12} order-lg-first">
        <table class="table table-sm p-infotable">
          <tbody>${data}</tbody>
        </table>
      </div>
      ${imageTD}
    </div>`;
  },

  'list': function (dataTable, header = '', classes = '', attr = '') {
    if (typeof dataTable !== 'string') dataTable = dataTable.map(x => `<tr><td>${x.join('</td><td>')}</td></tr>`).join('');
    if (typeof header !== 'string') header = '<tr>' + header.map(x => {
      if (x.includes('|')) {
        let y = x.split('|');
        return `<th style="width:${y[0]}">${y[1]}</th>`;
      } else {
        return `<th>${x}</th>`;
      }
    }).join('') + '</tr>';

    return `<table class="table table-sm table-hover text-center p-listtable ${classes}" ${attr}>
      <thead>${header}</thead>
      <tbody>${dataTable}</tbody>
    </table>`;
  },

  'sortlist': function (data, header = '', defaultSortColumn = '') {
    let attr = defaultSortColumn === '' ?
      '' :
      typeof defaultSortColumn === 'number' ?
      `data-sortlist="[[${defaultSortColumn},0]]"` :
      `data-sortlist="[${defaultSortColumn}]"`;
    return create('list', data, header, 'sortable', attr);
  },

  'tabs': function (names, contents) {
    let id = util.getUniqueID();
    let html = '<div class="c-tabs">';
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

let create = function (key, ...args) {
  key = key.toLowerCase();
  if (key in createFunctions) {
    return createFunctions[key].apply(null, args);
  } else {
    return '[err]';
  }
};

const BuildOptions = {
  defaultPageIndex: 0,
  currentPageIndex: 0,
  hashDetecter: detectHash,
  pages: [],
};

const PAGEMODE_STATIC = 0,
  PAGEMODE_HASHBANG = 1,
  PAGEMODE_HASHQUERY = 2,
  PAGEMODE_CODE = 3;

let build = function (options) {
  $('.c-loading').attr('class', 'c-loading c-loading--step-4');

  Object.assign(BuildOptions, options);
  let html = '';

  BuildOptions.pages.forEach((page, pageIndex) => {
    if (page.content instanceof Function) {
      page.isDynamic = true;
      BuildOptions.isListen = true;
    }
    page.index = pageIndex;

    html += `
      <input class="js-tab-trigger" type="radio" name="layouttab" ${pageIndex==0?'checked_':''} />
      <div class="p-page p-page--${pageIndex}">
        <div class="p-page__control"></div>
        <div class="p-page__content"></div>
      </div>
    `;
  });
  $('.l-dynamic').html(html);

  parseHash();

  if (BuildOptions.isListen) {
    window.addEventListener("hashchange", parseHash);
  }

  $('.c-loading').remove();
};


function getPageElement(pageIndex) {
  return $(`.p-page--${pageIndex}`);
}

const initPage = function (pageIndex) {
  let page = BuildOptions.pages[pageIndex];
  if (page.isInited) return;

  if (page.selector) {
    page.hasSelector = true;
    let $page = getPageElement(pageIndex);
    let htmlControls = createSelector(page.selector);
    $page.find('.p-page__control').html(htmlControls);
    $page.find('.p-select-prev').click(function () {
      url.setHash($(this).parents('.p-page__control').find('.p-selector option:selected').prev().val());
    });
    $page.find('.p-select-next').click(function () {
      url.setHash($(this).parents('.p-page__control').find('.p-selector option:selected').next().val());
    });
    $page.find('.p-selector').change(function () {
      url.setHash(this.value);
    });
  }

  if (typeof page.content === 'string') {
    getPageElement(pageIndex).find('.p-page__content').html(page.content);
    delete page.content;
  }

  page.isInited = true;
};

function detectHash(hash) {
  if (hash === '') {
    return BuildOptions.defaultPageIndex;
  }

  for (let page of BuildOptions.pages) {
    if (page.hashDetecter && page.hashDetecter(hash)) {
      return page.index;
    } else if (page.isDynamic) {
      return page.index;
    }
  }

  return BuildOptions.defaultPageIndex;
}

const createContent = function (pageIndex, hash) {
  let result;
  let page = BuildOptions.pages[pageIndex];
  if (page.isDynamic) {
    result = page.content(hash);
  } else {
    result = page.content;
  }

  if (result === undefined) {
    return true;
  } else if (result === false) {
    return false;
  } else if (typeof result === 'string') {
    result = {
      content: result,
    };
  }
  result.index = pageIndex;
  result.hash = hash.value;
  return result;
  // false: not match
  // true: not change
  // object: change
}

function show(obj) {
  if ( obj === false ) {
    return;
  } else if ( obj === true ) {
    changeTab(BuildOptions.currentPageIndex);
  } else {
    let pageIndex = 'index' in obj
      ? obj.index
      : BuildOptions.currentPageIndex;
    changeTab(obj.index);
    let $page = getPageElement(pageIndex);
    $page.find('.p-page__content').html(obj.content);
    if (obj.hash) $page.find('.p-selector').val(obj.hash);
    $('.c-listtable.sortable').removeClass('sortable').tablesorter();
    setTitle(obj.title);
  }
}

const parseHash = function () {
  let hash = url.getHashObject();
  debug(`Hash change event {${hash.value}}`);

  let targetPageIndex = detectHash(hash.value);
  let result = createContent(targetPageIndex, hash);
  if (result === false) {
    targetPageIndex = BuildOptions.defaultPageIndex;
    result = createContent(targetPageIndex, hash);
  }
  BuildOptions.currentPageIndex = targetPageIndex;

  show(result);
}



let createSelector = function (obj) {
  var html = '';
  if (typeof obj === 'string') {
    html = obj.trim();
  } else {
    for (var value in obj) {
      html += `<option value="${value}">${obj[value]}</option>`;
    }
  }

  if (html.startsWith('<option')) {
    html = `<div class="input-group">
      <div class="input-group-prepend">
      </div>
      <select class="form-control p-selector">${html}</select>
      <div class="input-group-append">
        <button class="btn p-select-prev d-none d-lg-block d-xl-block" type="button"><i class="fas fa-angle-left"></i></button>
        <button class="btn p-select-next d-none d-lg-block d-xl-block" type="button"><i class="fas fa-angle-right"></i></button>
      </div>
    </div><div class="input-group">
        <button class="btn w-50 d-sm-block d-md-block d-lg-none p-select-prev" type="button"><i class="fas fa-angle-left"></i></button>
        <button class="btn w-50 d-sm-block d-md-block d-lg-none p-select-next" type="button"><i class="fas fa-angle-right"></i></button>
    </div>`;
  }

  return html;
};

/*******************/

const setTitle = function (subtitle) {
  let separater = siteInfo.separater || ' - ';
  if ( subtitle ) {
    document.title =`${subtitle}${separater}${pageInfo.title}${separater}${siteInfo.title}`;
    $('.l-page__title a').html(subtitle);
  } else {
    document.title =`${pageInfo.title}${separater}${siteInfo.title}`;
    $('.l-page__title a').html(pageInfo.title);
  }
};

const changeTab = function (pageIndex) {
  pageIndex = pageIndex || 0;
  $('.js-tab-trigger')[pageIndex].checked = true;
  initPage(pageIndex);
};

export default {
  create,
  build,
  show,
}