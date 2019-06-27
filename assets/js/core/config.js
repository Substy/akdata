let configValues = {};

function get ( key, def = '' ) {
	return configValues[key.toLowerCase()] || def;
}

function set ( key, val ) {
	configValues[key.toLowerCase()] = val;
}

export default { get, set }