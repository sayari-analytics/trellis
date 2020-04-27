import { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { LayoutOptions } from '.';
import { Node, Edge, PositionedNode } from '../../types';
export declare const LAYOUT_OPTIONS: LayoutOptions;
export declare type SimulationNode = {
    id: string;
    radius: number;
} & SimulationNodeDatum;
export declare type SimulationEdge = SimulationLinkDatum<SimulationNode>;
export declare type TypedMessageEvent<T = unknown> = {
    [K in keyof MessageEvent]: K extends 'data' ? T : MessageEvent[K];
};
export declare type RunEvent = {
    type: 'run';
    nodes: Node[];
    edges: Edge[];
    options?: Partial<LayoutOptions>;
};
export declare type UpdateEvent = {
    type: 'update';
    nodes: PositionedNode[];
};
export declare type Event = RunEvent | UpdateEvent;
export declare type LayoutResultEvent = {
    nodes: {
        id: string;
        radius: number;
        x: number;
        y: number;
        subGraph?: {
            nodes: PositionedNode[];
            edges: Edge[];
            options?: Partial<LayoutOptions>;
        };
    }[];
};
export declare const Simulation: () => {
    worker: Worker;
    dispose: () => void;
};
