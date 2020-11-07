export declare const Loader: <T>(resolver: (resolve: (result: T) => void) => void, cb: (result: T) => void) => () => void;
export declare const FontLoader: (family: string, cb: (family: string) => void) => () => void;
export declare const ImageLoader: (url: string, cb: (url: string) => void) => () => void;
