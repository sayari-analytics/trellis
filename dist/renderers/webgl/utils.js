"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RADIANS_PER_DEGREE = exports.THREE_HALF_PI = exports.TWO_PI = exports.HALF_PI = exports.clientPositionFromEvent = exports.angle = exports.length = exports.midPoint = exports.movePoint = exports.parentInFront = exports.colorToNumber = void 0;
var d3_color_1 = require("d3-color");
var colorToNumber = function (colorString) {
    var c = d3_color_1.color(colorString);
    if (c === null) {
        return 0x000000;
    }
    return parseInt(c.hex().slice(1), 16);
};
exports.colorToNumber = colorToNumber;
var parentInFront = function (renderer, parent) {
    while (parent) {
        if (renderer.hoveredNode === parent) {
            return true;
        }
        parent = parent.parent;
    }
    return false;
};
exports.parentInFront = parentInFront;
var movePoint = function (x, y, angle, distance) { return [x + Math.cos(angle) * distance, y + Math.sin(angle) * distance]; };
exports.movePoint = movePoint;
var midPoint = function (x0, y0, x1, y1) { return [(x0 + x1) / 2, (y0 + y1) / 2]; };
exports.midPoint = midPoint;
var length = function (x0, y0, x1, y1) { return Math.hypot(x1 - x0, y1 - y0); };
exports.length = length;
var angle = function (x0, y0, x1, y1) {
    var angle = Math.atan2(y0 - y1, x0 - x1);
    return angle < 0 ? angle + exports.TWO_PI : angle;
};
exports.angle = angle;
var clientPositionFromEvent = function (event) { return (event instanceof TouchEvent ?
    { x: event.touches[0].clientX, y: event.touches[0].clientY } :
    { x: event.clientX, y: event.clientY }); };
exports.clientPositionFromEvent = clientPositionFromEvent;
exports.HALF_PI = Math.PI / 2;
exports.TWO_PI = Math.PI * 2;
exports.THREE_HALF_PI = exports.HALF_PI * 3;
exports.RADIANS_PER_DEGREE = Math.PI / 180;
//# sourceMappingURL=utils.js.map