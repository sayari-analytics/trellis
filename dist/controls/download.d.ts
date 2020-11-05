export declare type Options = {
    className?: string;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    fileName?: string;
    onClick?: () => Promise<string>;
};
export declare const Control: ({ container }: {
    container: HTMLDivElement;
}) => (options: Options) => void;
