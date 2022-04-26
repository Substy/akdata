"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateDpsSeries = exports.calculateDps = exports.getCharAttributes = undefined;

var _loaderEsm = require("./loader.esm.js");

var Loader = _interopRequireWildcard(_loaderEsm);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

if (typeof AKDATA == "undefined") {
  global.AKDATA = Object.assign({}, Loader);
}

// attributes.js

// generated with attributes.stub.js
exports.getCharAttributes = getCharAttributes;
exports.calculateDps = calculateDps;
exports.calculateDpsSeries = calculateDpsSeries;