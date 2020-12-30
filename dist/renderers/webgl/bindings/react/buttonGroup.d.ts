import { FunctionComponent, ReactNode } from 'react';
export declare type Props = {
    children: {
        selected?: boolean;
        disabled?: boolean;
        title?: string;
        onClick?: () => void;
        body: ReactNode;
    }[];
};
export declare const ButtonGroup: FunctionComponent<Props>;
