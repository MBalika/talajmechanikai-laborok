import { audioEvents } from './timeline.js';
import { SHOTS } from './shots.js';
import fs from 'fs';
fs.writeFileSync('events.json', JSON.stringify(audioEvents(SHOTS.map(s => s.t0).filter(t => t > 0.1))));
