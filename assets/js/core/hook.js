let funcPool = {
  foo: [
    function bar() {},
  ],

};
let alivEvents = {};

const on = function (eventName, func) {
  if (alivEvents[eventName]) {
    func();
  } else {
    if (!(eventName in funcPool)) funcPool[eventName] = [];
    funcPool[eventName].push(func);
  }
};

const trigger = function (eventName) {
  run(eventName);
};

const keepAlive = function (eventName) {
  run(eventName, true);
  alivEvents[eventName] = true;
};

const run = function (eventName, clearPool = false) {
  if (eventName in funcPool) funcPool[eventName].forEach(x => x());
  if (clearPool) delete funcPool[eventName];
}

export default {
  on,
  trigger,
  keepAlive,
}