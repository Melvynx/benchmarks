import {loadFont as loadGeist} from '@remotion/google-fonts/Geist';
import {loadFont as loadGeistMono} from '@remotion/google-fonts/GeistMono';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';

export const FONT = loadGeist('normal', {
	weights: ['400', '500', '600', '700'],
	subsets: ['latin'],
}).fontFamily;
export const MONO = loadGeistMono('normal', {
	weights: ['400', '500'],
	subsets: ['latin'],
}).fontFamily;
export const HAND = loadCaveat('normal', {
	weights: ['500', '600'],
	subsets: ['latin'],
}).fontFamily;

export const FPS = 60;
export const W = 1920;
export const H = 1080;
export const DURATION_S = 45;

// Tokens lifted from lumail.io `.marketing` / `.dark` theme.
export const C = {
	paper: '#f8f7f4',
	ink: '#1a1614',
	card: '#ffffff',
	flare: '#ff3300',
	accentDark: '#ff633d',
	accentDeep: '#c4320a',
	coral: '#f26a4b',
	blush: '#ffe3d9',
	wash: '#fbeee7',
	border: '#e6e1da',
	muted: '#5f5853',
	secondary: '#f0ede8',
	soft: '#f2f0ec',
	green: '#1f9e63',
	void: '#08090a',
	darkBg: '#161412',
	darkCard: '#1e1b19',
	darkFg: '#f7f6f4',
	darkMuted: '#a59d95',
	darkBorder: 'rgba(255,255,255,0.09)',
	tileTop: '#ff360f',
	tileBottom: '#ed4541',
};

export const SHADOW_CHIP =
	'0 1px 2px rgba(26,22,20,0.05), 0 6px 18px -10px rgba(26,22,20,0.2)';
export const SHADOW_CARD =
	'0 1px 2px rgba(26,22,20,0.04), 0 24px 60px -30px rgba(26,22,20,0.28)';

// Scene boundaries (seconds), all on the 120 BPM beat grid.
export const SCENES = {
	intro: [0, 4],
	problem: [4, 8.5],
	hero: [8, 13.5],
	agent: [13, 19.5],
	editor: [19, 24.5],
	workflow: [24, 29.5],
	transactional: [29, 33.5],
	pricing: [33, 38.5],
	outro: [38, 45],
} as const;
