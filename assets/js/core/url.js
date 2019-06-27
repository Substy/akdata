let oldHash;

const getHash = function () {
  let hash = window.location.hash;
  if (hash.startsWith('#!/')) {
    let value = hash.slice(3);
    return value;
  } else if (hash.startsWith('#?')) {
    return hash.slice(2).split('&').map(x => x.split('='));
  } else {
    return '';
  }
};

const getHashObject = function () {
  let hash = window.location.hash;
  return fromHashString(hash);
};

function fromHashString(hashString) {
  let obj;
  if (hashString.startsWith('#!/')) {
    let value = hashString.slice(3);
    //if (/^\d+$/.test(value)) value = ~~value;
    obj = {
      value: value,
      isHash: true,
    };
  } else if (hashString.startsWith('#?')) {
    let value = hashString
      .slice(2)
      .split('&')
      .filter(x => x.length > 0)
      .map(x => {
        let y = x.split('=');
        return {
          [y[0]]: y[1]
        }
      });
    obj = {
      value: value,
      isQuery: true,
    };
  } else {
    obj = {
      value: '',
      isEmpty: true,
    };
  }
  return obj;
}

function toHashString(hashObject) {
  if (typeof hashObject === 'object') {
    return `#?` + Object.entries(hashObject).map(x => x[0] + '=' + x[1]).join('&');
  } else {
    return `#!/` + hashObject;
  }
}

const setHash = function (hash) {
  if (hash !== oldHash) {
    window.location.hash = toHashString(hash);
    oldHash = hash;
  }
};

const getHref = function (...args) {
  if (args.length === 0) {
    return `#`;
  } else if (args.length === 1) {
    return toHashString(args[0]);
  } else if (args.length === 2) {
    return `../${args[0]}/${toHashString(args[1])}`;
  }
};

export default {
  getHash,
  setHash,
  getHref,
  getHashObject,
}