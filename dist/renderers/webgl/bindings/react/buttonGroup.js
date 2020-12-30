"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonGroup = void 0;
var react_1 = require("react");
var button_1 = require("./button");
var ButtonGroup = function (props) {
    return react_1.createElement(react_1.Fragment, {}, props.children.map(function (_a, idx) {
        var selected = _a.selected, disabled = _a.disabled, title = _a.title, onClick = _a.onClick, body = _a.body;
        return (react_1.createElement(button_1.Button, {
            key: idx,
            group: props.children.length === 0 ? (undefined) : idx === 0 ? ('top') : idx === props.children.length - 1 ? ('bottom') : 'middle',
            selected: selected,
            disabled: disabled,
            title: title,
            onClick: onClick,
        }, body));
    }));
};
exports.ButtonGroup = ButtonGroup;
//# sourceMappingURL=buttonGroup.js.map