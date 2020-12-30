"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zoom = exports.clampZoom = void 0;
var react_1 = require("react");
var buttonGroup_1 = require("./buttonGroup");
var zoom_1 = require("../../../../controls/zoom");
Object.defineProperty(exports, "clampZoom", { enumerable: true, get: function () { return zoom_1.clampZoom; } });
// TODO - memoize, disable on min/max zoom
var Zoom = function (props) {
    return (react_1.createElement(buttonGroup_1.ButtonGroup, {
        children: [{
                body: '＋',
                title: 'Zoom In',
                onClick: props.onZoomIn
            }, {
                body: '－',
                title: 'Zoom Out',
                onClick: props.onZoomOut
            }]
    }));
};
exports.Zoom = Zoom;
//# sourceMappingURL=zoom.js.map