import { audioEvents } from './timeline.js';
import fs from 'fs';
const cuts = JSON.parse(process.argv[2] || '[]');
fs.writeFileSync('events.json', JSON.stringify(audioEvents(cuts)));
