import './style.css';
import { Game } from './game';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const game = new Game(canvas, ui);
game.start();

if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
