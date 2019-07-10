Array.prototype.count = function (selector) {
  if (selector) {
    return this.reduce((acc, cur) => acc + selector(cur), 0);
  } else {
    return this.length;
  }
}

Array.prototype.sum = function (selector) {
  if (selector) {
    return this.map(selector).reduce((acc, cur) => acc + cur, 0);
  } else {
    return this.reduce((acc, cur) => acc + cur);
  }
}

Array.prototype.max = function (selector) {
  if (selector) {
    return Math.max(...this.map(selector));
  } else {
    return Math.max(...this);
  }
}

Array.prototype.min = function (selector) {
  if (selector) {
    return Math.min(...this.map(selector));
  } else {
    return Math.min(...this);
  }
}

Array.prototype.orderby = function (selector, comparer, descending = false) {
  let array = [...this].map(x => {
    return {
      sort: selector(x),
      value: x
    };
  });

  let result;
  if (comparer) {
    result = array.sort(comparer);
  } else {
    result = array.sort((a, b) => a.sort - b.sort);
  }
  if (descending) result.reverse();
  return result.map(x => x.value);
}

Array.prototype.includesArray = function (array) {
  return array.every(x => this.indexOf(x) !== -1);
}

Array.prototype.distinct = function () {
  let t={};
  return this.filter(e=>!(t[e]=e in t));
}

Array.prototype.last = function () {
  return this[this.length-1];
}