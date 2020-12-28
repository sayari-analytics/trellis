"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Control = void 0;
var DEFAULT_TOP = '100px';
var DEFAULT_LEFT = '20px';
var DEFAULT_BG = '#fff';
var DEFAULT_BG_HOVER = '#eee';
var DEFAULT_BG_SELECTED = '#ccc';
var DEFAULT_BG_HOVER_SELECTED = '#ccc';
// const DEFAULT_DISABLED = '#eee'
var DEFAULT_COLOR = '#666';
// const DEFAULT_COLOR_HOVER = '#666'
var DEFAULT_COLOR_SELECTED = '#222';
var styleButton = function (button) {
    button.style.border = '1px solid #aaa';
    button.style.borderRadius = '4px';
    button.style.background = DEFAULT_BG;
    button.style.cursor = 'pointer';
    button.style.width = '30px';
    button.style.height = '30px';
    button.style.display = 'block';
    button.style.padding = '0';
    button.style.outline = 'none';
    button.style.boxSizing = 'border-box';
    button.style.fontWeight = 'bold';
    button.style.color = DEFAULT_COLOR;
    return button;
};
var Control = function (_a) {
    var container = _a.container;
    var selected = false;
    var selectionStartX;
    var selectionStartY;
    var controlContainer = document.createElement('div');
    controlContainer.style.position = 'absolute';
    controlContainer.style.display = 'none';
    var toggleSelection = styleButton(document.createElement('button'));
    toggleSelection.textContent = '●';
    toggleSelection.setAttribute('aria-label', 'Select');
    toggleSelection.setAttribute('title', 'Select');
    toggleSelection.onmouseenter = function () { return toggleSelection.style.background = selected ? DEFAULT_BG_HOVER_SELECTED : DEFAULT_BG_HOVER; };
    toggleSelection.onmouseleave = function () { return toggleSelection.style.background = selected ? DEFAULT_BG_SELECTED : DEFAULT_BG; };
    toggleSelection.onfocus = function () { return toggleSelection.style.boxShadow = '0px 0px 0px 1px #aaa inset'; };
    toggleSelection.onblur = function () { return toggleSelection.style.boxShadow = 'none'; };
    toggleSelection.onpointerdown = function () {
        if (selected) {
            toggleSelection.style.background = DEFAULT_BG;
            toggleSelection.style.color = DEFAULT_COLOR;
            selected = false;
            selectionStartX = undefined;
            selectionStartY = undefined;
        }
        else {
            toggleSelection.style.background = DEFAULT_BG_SELECTED;
            toggleSelection.style.color = DEFAULT_COLOR_SELECTED;
            selected = true;
        }
    };
    controlContainer.appendChild(toggleSelection);
    container.style.position = 'relative';
    container.appendChild(controlContainer);
    return function (options) {
        var _a;
        controlContainer.style.display = 'block';
        controlContainer.className = (_a = options.className) !== null && _a !== void 0 ? _a : 'selection-container';
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
        return {
            onViewportPointerDown: function (event) {
                var _a;
                if (selected) {
                    container.style.cursor = 'copy';
                    selectionStartX = event.x;
                    selectionStartY = event.y;
                }
                else {
                    container.style.cursor = 'move';
                }
                (_a = options.onViewportPointerDown) === null || _a === void 0 ? void 0 : _a.call(options, event);
            },
            onViewportDrag: function (event) {
                var _a, _b;
                if (selected && selectionStartX !== undefined && selectionStartY !== undefined && event.type === 'viewportDrag') {
                    console.log("x0: " + selectionStartX.toFixed(2) + " y0: " + selectionStartY.toFixed(2) + " x1: " + event.x.toFixed(2) + " y1: " + event.y.toFixed(2) + " radius: " + Math.hypot(event.x - selectionStartX, event.y - selectionStartY).toFixed(2));
                    /**
                     * TODO -
                     * - calculate selected nodes
                     * - inject circle annotation
                     */
                    (_a = options.onSelection) === null || _a === void 0 ? void 0 : _a.call(options, event);
                }
                else {
                    (_b = options.onViewportDrag) === null || _b === void 0 ? void 0 : _b.call(options, event);
                }
            },
            onViewportPointerUp: function (event) {
                var _a;
                container.style.cursor = 'auto';
                (_a = options.onViewportPointerUp) === null || _a === void 0 ? void 0 : _a.call(options, event);
            },
        };
    };
};
exports.Control = Control;
//# sourceMappingURL=selection.js.map