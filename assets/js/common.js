import hook from './core/hook.js';
import util from './core/util.js';
import sprite from './core/sprite.js';
import url from './core/url.js';
import content from './core/content.js';
import config from './core/config.js';
import loader from './core/loader.js';
import component from './core/component.js';
import './extensions/array.js';

window.pmBase = {
  config,
  hook,
  content,
  sprite,
  url,
  util,
  loader,
  component,
};

pmBase.init = function (func) {
  hook.on('init', func);
}

/********** init ***********/

window.onload = function () {
  document.documentElement.className = document.documentElement.className.replace('js-loading', 'js-loaded');
  //$('.c-loading').attr('class', 'c-loading c-loading--step-3');
  hook.keepAlive('init');
};

window.debug = function (obj) {
  console.log(JSON.stringify(obj));
};