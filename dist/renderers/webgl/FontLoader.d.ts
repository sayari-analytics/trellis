export declare class CancellablePromise<T> {
    private thenCallback?;
    private result?;
    private cancelled;
    constructor(resolver: (resolve: (result: T) => void) => void);
    then(cb: (result: T) => void): void;
    cancel(): void;
}
export declare const FontLoader: (family: string) => CancellablePromise<string>;
