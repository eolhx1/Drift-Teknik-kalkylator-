// =================================================================
// 1. IMPORTER
// =================================================================
import { valid, formatResult, UNIT_MAP, KATEGORIER } from './kalkyler/hjalpmedel.js';
import { styrKalkyler } from './kalkyler/styr.js';
import { ventKalkyler } from './kalkyler/ventilation.js';
import { vsKalkyler } from './kalkyler/vs.js';
import { elKalkyler } from './kalkyler/el.js';
import { gasKalkyler } from './kalkyler/gas.js';
import { byggKalkyler } from './kalkyler/bygg.js';
import { energiKalkyler } from './kalkyler/energi.js'; // <-- Ny import

const teleKalkyler = [];
const energiKalkyler = [];


export const ALLA_KALKYLER = [
    ...styrKalkyler,
    ...ventKalkyler,
    ...vsKalkyler,
    ...elKalkyler,
    ...gasKalkyler,
    ...teleKalkyler,
    ...byggKalkyler,
];

export { UNIT_MAP, KATEGORIER };
