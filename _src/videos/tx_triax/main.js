import { startApp } from '../../kit/app.js';
import { setAccent } from '../../kit/x_stab.js';
import { init, render } from './scene.js';
import { drawOverlay } from './script.js';
import { TOTAL } from './timeline.js';
import soundUrl from './music.mp3';
setAccent('#B48CFF');
startApp({ TOTAL, FILE: 'Triaxialis_vizsgalat', init, render, drawOverlay, soundUrl });
