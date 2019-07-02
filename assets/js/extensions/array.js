Array.prototype.sum = function (selector) {
  if (selector) {
    return this.map(selector).reduce((acc, cur) => acc + cur, 0);
  } else {
    return this.reduce((acc, cur) => acc + cur);
  }
}

Array.prototype.count = function (selector) {
  if (selector) {
    return this.reduce((acc, cur) => acc + selector(cur), 0);
  } else {
    return this.length;
  }
}

Array.prototype.orderby = function (selector, comparer) {
  if (!selector) {
    return this.concat().sort();
  } else if (!comparer) {
    return this.sort((a, b) => selector(a) - selector(b));
  } else {
    return this.sort(comparer);
  }
}

Array.prototype.orderbyDescending = function (selector, comparer) {
  if (!selector) {
    return [...this].sort();
  } else if (!comparer) {
    return this.sort((a, b) => selector(b) - selector(a));
  } else {
    return this.map(selector).sort(comparer);
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
