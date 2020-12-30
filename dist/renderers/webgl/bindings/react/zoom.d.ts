import { FunctionComponent } from 'react';
export { clampZoom } from '../../../../controls/zoom';
export declare type Props = {
    onZoomIn?: () => void;
    onZoomOut?: () => void;
};
export declare const Zoom: FunctionComponent<Props>;
