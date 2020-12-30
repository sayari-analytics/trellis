import { FunctionComponent } from 'react';
export declare type Props = {
    selected?: boolean;
    disabled?: boolean;
    group?: 'top' | 'middle' | 'bottom';
    title?: string;
    onClick?: () => void;
};
export declare const Button: FunctionComponent<Props>;
