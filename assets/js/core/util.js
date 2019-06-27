let cssSheet;
function addCSS(rule) {
  if ( !cssSheet ) {
    cssSheet = document.createElement("style");
    document.head.appendChild(cssSheet);
  }
  cssSheet.textContent += rule;
}

function decompress(text) {
  return JSON.parse(LZString.decompressFromBase64(text));
}

function getUniqueID() {
  return new Date().getTime().toString(36);
}

export default {
  addCSS,
  decompress,
  getUniqueID,
}