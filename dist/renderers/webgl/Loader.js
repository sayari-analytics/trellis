"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageLoader = exports.FontLoader = exports.Loader = void 0;
var PIXI = __importStar(require("pixi.js"));
var fontfaceobserver_1 = __importDefault(require("fontfaceobserver"));
var font_cache = {};
var image_cache = {};
exports.Loader = function (resolver, cb) {
    var cancelled = false;
    resolver(function (result) {
        if (!cancelled) {
            cb(result);
        }
    });
    return function () {
        cancelled = true;
    };
};
exports.FontLoader = function (family, cb) {
    var _a, _b;
    if (font_cache[family]) {
        return exports.Loader(function (resolve) { return resolve(family); }, cb);
    }
    else if ((_b = (_a = document) === null || _a === void 0 ? void 0 : _a.fonts) === null || _b === void 0 ? void 0 : _b.load) {
        return exports.Loader(function (resolve) {
            document.fonts.load("1em " + family).then(function () {
                font_cache[family] = true;
                resolve(family);
            });
        }, cb);
    }
    else {
        return exports.Loader(function (resolve) {
            new fontfaceobserver_1.default(family).load().then(function () {
                font_cache[family] = true;
                resolve(family);
            });
        }, cb);
    }
};
exports.ImageLoader = function (url, cb) {
    if (image_cache[url]) {
        return exports.Loader(function (resolve) { return resolve(url); }, cb);
    }
    return exports.Loader(function (resolve) {
        new PIXI.Loader().add(url).load(function () {
            image_cache[url] = true;
            resolve(url);
        });
    }, cb);
};
//# sourceMappingURL=Loader.js.map