"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zoom = exports.zoomTo = exports.fit = exports.clampZoom = void 0;
var react_1 = require("react");
var zoom_1 = require("../../../../controls/zoom");
var zoom_2 = require("../../../../controls/zoom");
Object.defineProperty(exports, "clampZoom", { enumerable: true, get: function () { return zoom_2.clampZoom; } });
Object.defineProperty(exports, "fit", { enumerable: true, get: function () { return zoom_2.fit; } });
Object.defineProperty(exports, "zoomTo", { enumerable: true, get: function () { return zoom_2.zoomTo; } });
exports.Zoom = function (props) {
    var ref = react_1.useRef(null);
    var control = react_1.useRef();
    react_1.useEffect(function () {
        control.current = zoom_1.Control({ container: ref.current });
    }, []);
    react_1.useEffect(function () {
        control.current(props);
    }, [props]);
    return (react_1.createElement('div', { ref: ref }, props.children));
};
// export const Zoom = forwardRef<HTMLDivElement, Props>((props, ref) => {
//   // const ref = useRef<HTMLDivElement>(null)
//   const control = useRef<(options: Partial<Options>) => void>()
//   useEffect(() => {
//     control.current = Control({ container: ref.current! })
//   }, [ref?.current])
//   useEffect(() => {
//     control.current!(props)
//   }, [props])
//   return (
//     createElement('div', { ref })
//   )
// })
//# sourceMappingURL=zoom.js.map