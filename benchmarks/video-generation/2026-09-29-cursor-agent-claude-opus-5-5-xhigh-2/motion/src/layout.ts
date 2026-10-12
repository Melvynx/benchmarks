import {ICON} from './lib';

export const NODE_W = 262;
export const NODE_H = 100;
export const ROW_Y = 712;

export type WfNode = {
	x: number;
	y: number;
	title: string;
	sub: string;
	icon: string;
	w?: number;
};

export const NODES: WfNode[] = [
	{x: 186, y: ROW_Y, title: 'Tag added', sub: 'newsletter', icon: ICON.tag},
	{x: 480, y: ROW_Y, title: 'Send email', sub: 'Welcome, start here', icon: ICON.envelope},
	{x: 774, y: ROW_Y, title: 'Wait', sub: '2 days', icon: ICON.clock},
	{x: 1068, y: ROW_Y, title: 'If opened', sub: 'the welcome email', icon: ICON.branch},
	{x: 1450, y: ROW_Y - 108, title: 'Send email', sub: 'Your first win', icon: ICON.envelope, w: 270},
	{x: 1450, y: ROW_Y + 108, title: 'Send email', sub: 'Did you miss this?', icon: ICON.envelope, w: 270},
];

// Editor card inner rect, used as the morph origin into NODES[1].
export const EDITOR_RECT = {x: 174, y: 184, w: 792, h: 772};
