"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
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
    var container = _a.container, render = _a.render;
    var selected = false;
    var selectionStartX;
    var selectionStartY;
    var selectionAnnotation;
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
    var toggleSelectionControlButton = function () {
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
    toggleSelection.onpointerdown = toggleSelectionControlButton;
    controlContainer.appendChild(toggleSelection);
    container.style.position = 'relative';
    container.appendChild(controlContainer);
    // TODO - combine options and controlOptions? in the very least, need to add onSelection to options
    return function (_a) {
        var _b, _c;
        var _d = _a.controlOptions, controlOptions = _d === void 0 ? {} : _d, graph = __rest(_a, ["controlOptions"]);
        controlContainer.style.display = 'block';
        controlContainer.className = (_b = controlOptions.className) !== null && _b !== void 0 ? _b : 'selection-container';
        if (controlOptions.top !== undefined) {
            controlContainer.style.top = controlOptions.top + "px";
        }
        else if (controlOptions.bottom !== undefined) {
            controlContainer.style.bottom = controlOptions.bottom + "px";
        }
        else {
            controlContainer.style.top = DEFAULT_TOP;
        }
        if (controlOptions.left !== undefined) {
            controlContainer.style.left = controlOptions.left + "px";
        }
        else if (controlOptions.right !== undefined) {
            controlContainer.style.right = controlOptions.right + "px";
        }
        else {
            controlContainer.style.left = DEFAULT_LEFT;
        }
        /**
         * TODO - is it possible to initialize this once in the containing closure?
         */
        var options = __assign(__assign({}, graph.options), { onViewportPointerDown: function (event) {
                var _a, _b;
                if (selected) {
                    selectionStartX = event.x;
                    selectionStartY = event.y;
                    container.style.cursor = 'copy';
                }
                else {
                    container.style.cursor = 'move';
                }
                (_b = (_a = graph.options) === null || _a === void 0 ? void 0 : _a.onViewportPointerDown) === null || _b === void 0 ? void 0 : _b.call(_a, event); // should these always fire, or just when not selected? state changes initiated by ViewportPointerUp/Down probably shouldn't trigger on a selection start/end
            }, onViewportDrag: function (event) {
                var _a, _b, _c;
                if (selected) {
                    if (event.type === 'viewportDrag') {
                        // TODO - define style via controlOptions
                        selectionAnnotation = {
                            type: 'circle',
                            id: 'selection',
                            x: selectionStartX,
                            y: selectionStartY,
                            radius: Math.hypot(event.x - selectionStartX, event.y - selectionStartY),
                            style: {
                                color: '#eee',
                                stroke: {
                                    width: 2,
                                    color: '#ccc'
                                }
                            }
                        };
                        // controlOptions.onSelection?.(nodes.filter(within(selectionStartX, selectionStartY, r)))
                        (_a = controlOptions.onSelection) === null || _a === void 0 ? void 0 : _a.call(controlOptions, event);
                    }
                }
                else {
                    (_c = (_b = graph.options) === null || _b === void 0 ? void 0 : _b.onViewportDrag) === null || _c === void 0 ? void 0 : _c.call(_b, event);
                }
            }, onViewportPointerUp: function (event) {
                var _a, _b;
                container.style.cursor = 'auto';
                if (selected) {
                    toggleSelectionControlButton();
                    selectionAnnotation = undefined;
                }
                (_b = (_a = graph.options) === null || _a === void 0 ? void 0 : _a.onViewportPointerUp) === null || _b === void 0 ? void 0 : _b.call(_a, event); // should these always fire, or just when not selected? state changes initiated by ViewportPointerUp/Down probably shouldn't trigger on a selection start/end
            } });
        render({
            nodes: graph.nodes,
            edges: graph.edges,
            options: options,
            annotations: selectionAnnotation === undefined ? graph.annotations : __spread((_c = graph.annotations) !== null && _c !== void 0 ? _c : [], [selectionAnnotation]),
        });
    };
    // return (options: Options) => {
    //   controlContainer.style.display = 'block'
    //   controlContainer.className = options.className ?? 'selection-container'
    //   if (options.top !== undefined) {
    //     controlContainer.style.top = `${options.top}px`
    //   } else if (options.bottom !== undefined) {
    //     controlContainer.style.bottom = `${options.bottom}px`
    //   } else {
    //     controlContainer.style.top = DEFAULT_TOP
    //   }
    //   if (options.left !== undefined) {
    //     controlContainer.style.left = `${options.left}px`
    //   } else if (options.right !== undefined) {
    //     controlContainer.style.right = `${options.right}px`
    //   } else {
    //     controlContainer.style.left = DEFAULT_LEFT
    //   }
    //   return {
    //     onViewportPointerDown: (event: ViewportPointerEvent) => {
    //       if (selected) {
    //         container.style.cursor = 'copy'
    //         selectionStartX = event.x
    //         selectionStartY = event.y
    //       } else {
    //         container.style.cursor = 'move'
    //       }
    //       options.onViewportPointerDown?.(event)
    //     },
    //     onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
    //       if (selected && selectionStartX !== undefined && selectionStartY !== undefined && event.type === 'viewportDrag') {
    //         /**
    //          * TODO -
    //          * - calculate selected nodes
    //          * - inject circle annotation
    //          */
    //         options.onSelection?.(event)
    //       } else {
    //         options.onViewportDrag?.(event)
    //       }
    //     },
    //     onViewportPointerUp: (event: ViewportPointerEvent) => {
    //       container.style.cursor = 'auto'
    //       options.onViewportPointerUp?.(event)
    //     },
    //   }
    // }
};
exports.Control = Control;
//# sourceMappingURL=selection.js.map