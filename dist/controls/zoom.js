"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Control = exports.clampZoom = exports.fit = exports.zoomTo = void 0;
var DEFAULT_TOP = '20px';
var DEFAULT_LEFT = '20px';
var styleButton = function (button) {
    button.style.border = '1px solid #aaa';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.style.width = '30px';
    button.style.height = '30px';
    button.style.display = 'block';
    button.style.padding = '0';
    button.style.outline = 'none';
    button.style.boxSizing = 'border-box';
    button.style.fontWeight = 'bold';
    button.style.color = '#666';
    button.onmouseenter = function () { return button.style.background = '#eee'; };
    button.onmouseleave = function () { return button.style.background = '#fff'; };
    button.onfocus = function () { return button.style.boxShadow = '0px 0px 0px 1px #aaa inset'; };
    button.onblur = function () { return button.style.boxShadow = 'none'; };
    return button;
};
var zoomTo = function (nodes, options) {
    var e_1, _a;
    var result = {
        zoom: 1,
        position: [0, 0]
    };
    try {
        for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
            var node = nodes_1_1.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return result;
};
exports.zoomTo = zoomTo;
var fit = function (zoom, position, nodes, options) {
    var e_2, _a;
    var result = {
        zoom: 1,
        position: [0, 0]
    };
    try {
        for (var nodes_2 = __values(nodes), nodes_2_1 = nodes_2.next(); !nodes_2_1.done; nodes_2_1 = nodes_2.next()) {
            var node = nodes_2_1.value;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (nodes_2_1 && !nodes_2_1.done && (_a = nodes_2.return)) _a.call(nodes_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return result;
};
exports.fit = fit;
var clampZoom = function (min, max, zoom) { return Math.max(min, Math.min(max, zoom)); };
exports.clampZoom = clampZoom;
/**
 * TODO
 * - disable on min/max zoom
 * - tooltips
 */
var Control = function (_a) {
    var container = _a.container;
    var controlContainer = document.createElement('div');
    controlContainer.style.position = 'absolute';
    controlContainer.style.display = 'none';
    var zoomIn = styleButton(document.createElement('button'));
    zoomIn.setAttribute('aria-label', 'Zoom in');
    zoomIn.setAttribute('title', 'Zoom in');
    zoomIn.textContent = '＋';
    zoomIn.style.borderTopLeftRadius = '4px';
    zoomIn.style.borderTopRightRadius = '4px';
    controlContainer.appendChild(zoomIn);
    var zoomOut = styleButton(document.createElement('button'));
    zoomOut.setAttribute('aria-label', 'Zoom out');
    zoomOut.setAttribute('title', 'Zoom out');
    zoomOut.style.borderTop = 'none';
    zoomOut.style.borderBottomLeftRadius = '4px';
    zoomOut.style.borderBottomRightRadius = '4px';
    zoomOut.textContent = '－';
    controlContainer.appendChild(zoomOut);
    container.style.position = 'relative';
    container.appendChild(controlContainer);
    return function (options) {
        var _a, _b, _c;
        controlContainer.style.display = 'block';
        controlContainer.className = (_a = options.className) !== null && _a !== void 0 ? _a : 'zoom-container';
        if (options.top !== undefined) {
            controlContainer.style.top = options.top + "px";
        }
        else if (options.bottom !== undefined) {
            controlContainer.style.bottom = options.bottom + "px";
        }
        else {
            controlContainer.style.top = DEFAULT_TOP;
        }
        if (options.left !== undefined) {
            controlContainer.style.left = options.left + "px";
        }
        else if (options.right !== undefined) {
            controlContainer.style.right = options.right + "px";
        }
        else {
            controlContainer.style.left = DEFAULT_LEFT;
        }
        zoomIn.onpointerdown = (_b = options.onZoomIn) !== null && _b !== void 0 ? _b : null;
        zoomOut.onpointerdown = (_c = options.onZoomOut) !== null && _c !== void 0 ? _c : null;
    };
};
exports.Control = Control;
//# sourceMappingURL=zoom.js.map