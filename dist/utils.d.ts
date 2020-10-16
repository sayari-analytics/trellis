export declare const noop: () => void;
export declare const throttle: <T extends unknown[]>(cb: (...args: T) => void, duration: number) => (...args: T) => void;
export declare const batch: <T extends unknown>(cb: (args: T[]) => void, duration: number) => (arg: T) => void;
export declare const animationFrameLoop: (cb: (time: number) => void) => () => void;
export declare const throttleAnimationFrame: <T extends unknown[]>(cb: (...args: T) => void) => (...args: T) => void;
export declare const identity: <T>(value: T) => T;
export declare const interpolateInterval: (count: number, duration: number) => (cb: (n: number) => void) => void;
export declare const interpolateDuration: (duration: number) => (cb: (n: number) => void) => void;
export declare const equals: <T>(a: T, b: T) => boolean;
