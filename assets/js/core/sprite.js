let modules = {
  default: {
    url: '',
    width: 0,
    height: 0,
    col: 0,
    indexList: [],
  }
}

function add(key, opt) {
  modules[key] = opt;
}

function get(key, value, displayWidth) {
  let opt = modules[key];
  if (!opt) return '';
  let index = value;
  if (opt.indexList) {
    index = opt.indexList.indexOf(value);
  } else if (opt.toIndex) {
    index = opt.toIndex(value);
  }
  let scale = displayWidth ? displayWidth / opt.width : 1;
  let width = opt.width * scale;
  let height = opt.height * scale;
  let x = width * (index % opt.col);
  let y = height * Math.floor(index / opt.col);
  let bgWidth = opt.width * scale * opt.col;

  let html = `<div class="c-sprite" style="display:inline-block;vertical-align:bottom;
    background:url(${opt.url}) no-repeat -${x}px -${y}px;
    background-size: ${bgWidth}px auto;
    height: ${height}px;
    width: ${width}px;
    " data-value="${value}" title="${value}"></div>`;
  return html;
}

export default {
  add,
  get
}