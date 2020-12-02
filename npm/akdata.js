var fs = require("fs");
var loader = require("./loader");
var dpsv2 = require("./dpsv2");
var actions = require("./dps_actions");
var attributes = require("./attributes");

module.exports = {
    ...loader,
    Dps: dpsv2,
    Actions: actions,
    Attributes: attributes,
};