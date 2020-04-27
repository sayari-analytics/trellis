"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var d3_color_1 = require("d3-color");
exports.colorToNumber = function (colorString) {
    var c = d3_color_1.color(colorString);
    if (c === null) {
        return 0x000000;
    }
    return parseInt(c.hex().slice(1), 16);
};
exports.parentInFront = function (renderer, parent) {
    while (parent) {
        if (renderer.hoveredNode === parent) {
            return true;
        }
        parent = parent.parent;
    }
    return false;
};
//# sourceMappingURL=utils.js.map