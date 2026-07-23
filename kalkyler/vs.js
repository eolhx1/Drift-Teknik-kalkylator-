//
//Fil: kalkyler/vs.js
//

import { valid, formatResult } from './hjalpmedel.js';

// --- Beräkningsfunktioner (VS & Värme) ---
const beraknaVsFlode = (v) => {
    if (!valid(v.effekt, v.dt)) return "Fel";
    if (v.dt === 0) return "Fel (0-division)";
    const flode_lh = (v.effekt / (4180 * v.dt)) * 3600;
    
    let resultatText = `Flöde: ${formatResult(flode_lh, 1)} l/h\n`;
    resultatText += `Flöde: ${formatResult(flode_lh / 3600, 4)} l/s`;
    return resultatText;
};

const beraknaKvVarde = (v) => {
    if (!valid(v.flode_m3h, v.tryckfall) || v.tryckfall <= 0) return "Fel";
    const kv = v.flode_m3h / Math.sqrt(v.tryckfall);
    return kv;
};

const beraknaNyRadiatoreffekt = (v) => {
    if (!valid(v.p_proj, v.dt_ny, v.dt_gammal, v.exponent) || v.dt_gammal === 0) return "Fel";
    const p_ny = v.p_proj * Math.pow(v.dt_ny / v.dt_gammal, v.exponent);
    return p_ny;
};

const beraknaVsProportionalitet = (v) => {
    if (!valid(v.q_matt, v.q_proj) || v.q_proj === 0) return "Fel";
    return v.q_matt / v.q_proj;
};

const beraknaTryckfallRor = (v) => {
    if (!valid(v.R, v.L)) return "Fel";
    const delta_p_pa = v.R * v.L;
    const delta_p_total = delta_p_pa * 1.4;

    let resultatText = `Rörns tryckfall: ${formatResult(delta_p_total, 0)} Pa\n`;
    resultatText += `Inkl. kopplingar (~40%): ${formatResult(delta_p_total / 1000, 2)} kPa`;
    return resultatText;
};

const beraknaPumplagar = (v) => {
    if (!valid(v.q1, v.n1, v.n2) || v.n1 === 0) return "Fel";

    const q1 = v.q1;
    const n1 = v.n1;
    const n2 = v.n2;

    const q2 = q1 * (n2 / n1);
    let resultatText = `Nytt flöde (q₂): ${formatResult(q2, 1)}\n`;

    if (v.H1 !== undefined && v.H1 !== null && !isNaN(v.H1) && v.H1 !== '') {
        const H2 = v.H1 * Math.pow(n2 / n1, 2);
        resultatText += `Nytt tryck (H₂): ${formatResult(H2, 1)} kPa\n`;
    }

    if (v.P1 !== undefined && v.P1 !== null && !isNaN(v.P1) && v.P1 !== '') {
        const P2 = v.P1 * Math.pow(n2 / n1, 3);
        resultatText += `Ny effekt (P₂): ${formatResult(P2, 2)} kW\n`;
    }

    return resultatText;
};

const beraknaEttrorTemp = (v) => {
    if (!valid(v.t_fram, v.effekt, v.q_slinga) || v.q_slinga === 0) return "Fel";
    const flode_m3s = v.q_slinga / 3600000;
    const namnare = flode_m3s * 4180 * 1000;

    if (namnare === 0) return "Fel (0-division)";
    const t_nasta = v.t_fram - (v.effekt / namnare);
    return t_nasta;
};

// --- Kalkyl-array (VS) ---
export const vsKalkyler = [
    {
        id: "vs_effekt_flode",
        namn: "Radiatorflöde & Effekt (VS)",
        kategorier: ["vs"],
        unit: "l/h",
        decimaler: 1,
        inputs: [
            { id: "effekt", label: "Radiatoreffekt (P)", unit: ["W"] },
            { id: "dt", label: "Temperaturskillnad (ΔT)", unit: ["°C"] }
        ],
        calc: beraknaVsFlode,
        info: { beskrivning: "Beräknar det erforderliga vattenflödet för en given radiatoreffekt." }
    },
    {
        id: "vs_kv_varde",
        namn: "K_v-värde (Ventilinställning)",
        kategorier: ["vs"],
        unit: "",
        decimaler: 2,
        inputs: [
            { id: "flode_m3h", label: "Flöde (q)", unit: ["m³/h"] },
            { id: "tryckfall", label: "Tryckfall över ventil (Δp)", unit: ["bar"] }
        ],
        calc: beraknaKvVarde,
        info: { beskrivning: "Beräknar ventilens K_v-värde för inställning av rätt flöde." }
    },
    {
        id: "vs_radiator_ny_temp",
        namn: "Radiatoreffekt vid ny temperatur",
        kategorier: ["vs"],
        unit: "W",
        decimaler: 0,
        inputs: [
            { id: "p_proj", label: "Projekterad effekt", unit: ["W"] },
            { id: "dt_ny", label: "Ny övertemperatur (ΔT_ny)", unit: ["°C"] },
            { id: "dt_gammal", label: "Gammal övertemperatur (ΔT_gammal)", unit: ["°C"] },
            { id: "exponent", label: "Radiatorexponent (n)" }
        ],
        calc: beraknaNyRadiatoreffekt,
        info: { beskrivning: "Beräknar hur mycket effekten på en radiator förändras." }
    },
    {
        id: "vs_proportionalitetsmetoden",
        namn: "Proportionalitetsmetoden (VS)",
        kategorier: ["vs"],
        unit: "",
        decimaler: 2,
        inputs: [
            { id: "q_matt", label: "Uppmätt flöde", unit: ["l/h", "m³/h"] },
            { id: "q_proj", label: "Projekterat flöde", unit: ["l/h", "m³/h"] }
        ],
        calc: beraknaVsProportionalitet,
        info: { beskrivning: "Beräknar injusteringskvoten för stammar och radiatorer." }
    },
    {
        id: "vs_tryckfall_ror",
        namn: "Tryckfall i rör (VS)",
        kategorier: ["vs"],
        unit: "",
        decimaler: 0,
        inputs: [
            { id: "R", label: "Friktionsmotstånd (R) [Pa/m]", unit: ["Pa/m"] },
            { id: "L", label: "Rörsatsens totala längd (fram + retur)", unit: ["m"] }
        ],
        calc: beraknaTryckfallRor,
        info: { beskrivning: "Beräknar tryckfallet i rörnätet inklusive tillägg för kopplingar." }
    },
    {
        id: "vs_pumplagar",
        namn: "Pumplagarna (Affinitetslagarna)",
        kategorier: ["vs", "styr"],
        unit: "",
        decimaler: 1,
        inputs: [
            { id: "q1", label: "Nuvarande flöde (q₁)", unit: ["l/h", "m³/h"] },
            { id: "n1", label: "Nuvarande varvtal / frekvens (n₁)", unit: ["Hz", "rpm"] },
            { id: "n2", label: "Önskat nytt varvtal / frekvens (n₂)", unit: ["Hz", "rpm"] },
            { id: "H1", label: "Nuvarande tryck (H₁) - Frivillig", unit: ["kPa", "bar"], optional: true },
            { id: "P1", label: "Nuvarande effekt (P₁) - Frivillig", unit: ["kW"], optional: true }
        ],
        calc: beraknaPumplagar,
        info: { beskrivning: "Beräknar hur flöde, tryck och effekt förändras för cirkulationspumpar." }
    },
    {
        id: "vs_ettror_temp",
        namn: "Framledningstemperatur Ettrörssystem",
        kategorier: ["vs"],
        unit: "°C",
        decimaler: 1,
        inputs: [
            { id: "t_fram", label: "Ingående framledningstemp (T_fram)", unit: ["celsius"] },
            { id: "effekt", label: "Radiatoreffekt (P)", unit: ["W"] },
            { id: "q_slinga", label: "Slingans totala vattenflöde", unit: ["l/h"] }
        ],
        calc: beraknaEttrorTemp,
        info: { beskrivning: "Beräknar avkylningen per radiator i en seriekopplad slinga." }
    }
];
