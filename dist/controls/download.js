"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Control = void 0;
var DEFAULT_TOP = '20px';
var DEFAULT_LEFT = '20px';
var DEFAULT_BG = '#fff';
var DEFAULT_BG_HOVER = '#eee';
// const DEFAULT_DISABLED = '#eee'
var DEFAULT_COLOR = '#666';
// const DEFAULT_COLOR_HOVER = '#666'
// const DEFAULT_COLOR_HOVER_SELECTED = '#222'
// const DEFAULT_DISABLED = '#aaa'
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
    var controlContainer = document.createElement('div');
    controlContainer.style.position = 'absolute';
    controlContainer.style.display = 'none';
    var download = styleButton(document.createElement('button'));
    download.textContent = 'd';
    download.setAttribute('aria-label', 'Download');
    download.setAttribute('title', 'Download');
    download.onmouseenter = function () { return DEFAULT_BG_HOVER; };
    download.onmouseleave = function () { return DEFAULT_BG; };
    download.onfocus = function () { return download.style.boxShadow = '0px 0px 0px 1px #aaa inset'; };
    download.onblur = function () { return download.style.boxShadow = 'none'; };
    download.onpointerdown = function () {
        download.style.background = DEFAULT_BG;
        download.style.color = DEFAULT_COLOR;
    };
    controlContainer.appendChild(download);
    container.style.position = 'relative';
    container.appendChild(controlContainer);
    return function (options) {
        var _a;
        controlContainer.style.display = 'block';
        controlContainer.className = (_a = options.className) !== null && _a !== void 0 ? _a : 'download-container';
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
        download.onclick = function () {
            var _a, _b;
            (_b = (_a = options.onClick) === null || _a === void 0 ? void 0 : _a.call(options)) === null || _b === void 0 ? void 0 : _b.then(function (url) {
                var _a;
                var link = document.createElement('a');
                link.setAttribute('download', (_a = options.fileName) !== null && _a !== void 0 ? _a : 'download');
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        };
    };
};
exports.Control = Control;
//# sourceMappingURL=download.js.map