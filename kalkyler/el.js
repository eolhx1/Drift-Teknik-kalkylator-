// =================================================================
// EL KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

const beraknaOhmsLag = (v) => {
    if (!valid(v.varde1, v.varde2)) return "Fel";
    const läge = v.lage_unit || "U";
    if (läge === "U") return v.varde1 * v.varde2;
    if (läge === "I" || läge === "R") return v.varde1 / v.varde2;
    return "Fel";
};

export const elKalkyler = [{
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
    info: {
        beskrivning: "Räknar ut spänning, ström eller resistans med Ohms lag.",
        detaljer: "Grundläggande el-beräkning för att snabbt ta reda på saknade värden i en elektrisk krets."
    }
}];
