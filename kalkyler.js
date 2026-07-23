//
// Fil: kalkyler.js
//

// =================================================================
// 1. IMPORTER
// =================================================================
import { valid, formatResult, UNIT_MAP, KATEGORIER } from './kalkyler/hjalpmedel.js';
import { ventKalkyler } from './kalkyler/ventilation.js';
import { vsKalkyler } from './kalkyler/vs.js';

// =================================================================
// 2. MATEMATISK LOGIK & BERÄKNINGAR
// =================================================================
const beraknaSkalning010V = (v) => (v.volt / 10) * (v.max - v.min) + v.min;

const beraknaOhmsLag = (v) => {
    if (!valid(v.varde1, v.varde2)) return "Fel";
    const läge = v.lage_unit || "U";
    if (läge === "U") return v.varde1 * v.varde2;
    if (läge === "I" || läge === "R") return v.varde1 / v.varde2;
    return "Fel";
};

const beraknaAnvandningstidGas = (v) => {
    if (!valid(v.volym, v.tryck, v.flode) || v.flode === 0) return "Fel";
    return (v.volym * v.tryck) / (v.flode * 60);
};

// =================================================================
// 3. KALKYL-GRUPPER
// =================================================================
const styrKalkyler = [{
    id: "styr_givar_skalning_0_10v",
    namn: "Givarskalning 0-10V",
    kategorier: ["styr"],
    label: "Resultat",
    unit: "",
    decimaler: 2,
    inputs: [
        { id: "volt", label: "Uppmätt spänning (V)" },
        { id: "min", label: "Minvärde" },
        { id: "max", label: "Maxvärde" }
    ],
    calc: (v) => !valid(v.volt, v.min, v.max) ? "Fel" : beraknaSkalning010V(v),
    info: {
        beskrivning: "Skalar om en 0-10V signal till ett fysiskt mätområde.",
        formel: { namn: "Linjär skalning", beskrivning: "Värde = (Volt / 10) * (Max - Min) + Min" }
    }
}];

const elKalkyler = [{
    id: "el_ohms_lag",
    namn: "Ohms lag",
    kategorier: ["el", "tele"],
    decimaler: 2,
    inputs: [
        { id: "lage", label: "Vad vill du räkna ut?", unit: ["U", "I", "R"], requiresInput: false },
        { id: "varde1", label: "Ström (I) [A]" },
        { id: "varde2", label: "Resistans (R) [Ω]" }
    ],
    calc: beraknaOhmsLag,
    info: { beskrivning: "Ohms lag." }
}];

const gasKalkyler = [{
    id: "gas_anvandningstid",
    namn: "Användningstid gasflaska",
    kategorier: ["gas"],
    decimaler: 1,
    inputs: [
        { id: "volym", label: "Flaskans volym", unit: ["L"] },
        { id: "tryck", label: "Tryck", unit: ["bar"] },
        { id: "flode", label: "Ordinerat flöde", unit: ["L/min"] }
    ],
    calc: beraknaAnvandningstidGas,
    info: { beskrivning: "Gasflaskberäkning." }
}];

const teleKalkyler = [];

export const ALLA_KALKYLER = [
    ...styrKalkyler,
    ...ventKalkyler,
    ...vsKalkyler,
    ...elKalkyler,
    ...gasKalkyler,
    ...teleKalkyler
];

// Exportera vidare så att app.js kommer åt dem via kalkyler.js
export { UNIT_MAP, KATEGORIER };
