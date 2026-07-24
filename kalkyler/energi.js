// =================================================================
// ENERGI KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

// 1. Transmissionsförlust (Värmeförlust genom yta)
const beraknaTransmissionsforlust = (v) => {
    if (!valid(v.u_varde, v.area, v.inne_temp, v.ute_temp)) return "Fel";
    const deltaT = v.inne_temp - v.ute_temp;
    const effekt_W = v.u_varde * v.area * deltaT;
    const effekt_kW = effekt_W / 1000;
    
    return `Effektförlust: ${effekt_W.toFixed(0)} W\n` +
           `Vilket motsvarar: ${effekt_kW.toFixed(2)} kW`;
};

// 2. COP (Värmefaktor för värmepump)
const beraknaCOP = (v) => {
    if (!valid(v.avgiven_effekt, v.tillford_eleffekt) || v.tillford_eleffekt === 0) return "Fel";
    const cop = v.avgiven_effekt / v.tillford_eleffekt;
    return `Värmefaktor (COP): ${cop.toFixed(2)}\n` +
           `Snabbkoll: För varje kW el får du ut ${cop.toFixed(1)} kW värme.`;
};

// 3. EER (Verkningsgrad för kylmaskin / AC)
const beraknaEER = (v) => {
    if (!valid(v.kyleffekt, v.tillford_eleffekt) || v.tillford_eleffekt === 0) return "Fel";
    const eer = v.kyleffekt / v.tillford_eleffekt;
    return `Kylfaktor (EER): ${eer.toFixed(2)}\n` +
           `Snabbkoll: För varje kW el får ut ${eer.toFixed(1)} kW kyla.`;
};

export const energiKalkyler = [
    {
        id: "energi_transmission",
        namn: "Värmeförlust (Transmissionsförlust)",
        kategorier: ["energi"],
        decimaler: 0,
        inputs: [
            { id: "u_varde", label: "U-värde [W/(m²·K)]" },
            { id: "area", label: "Ytans area [m²]" },
            { id: "inne_temp", label: "Innetemperatur [°C]" },
            { id: "ute_temp", label: "Utetemperatur (t.ex. DUT) [°C]" }
        ],
        calc: beraknaTransmissionsforlust,
        info: {
            beskrivning: "Beräknar hur mycket värmeeffekt som läcker ut genom en specifik byggnadsdel (t.ex. en vägg eller ett fönster).",
            formel: { namn: "Transmissionsförlust", beskrivning: "P = U × A × ΔT" }
        }
    },
    {
        id: "energi_cop",
        namn: "Värmepumpens Verkningsgrad (COP)",
        kategorier: ["energi"],
        decimaler: 2,
        inputs: [
            { id: "avgiven_effekt", label: "Avgiven värmeeffekt [kW]" },
            { id: "tillford_eleffekt", label: "Tillförd eleffekt [kW]" }
        ],
        calc: beraknaCOP,
        info: {
            beskrivning: "Beräknar värmepumpens eller kylmaskinens aktuella verkningsgrad (Coefficient of Performance).",
            formel: { namn: "COP", beskrivning: "COP = Avgiven värmeeffekt / Tillförd eleffekt" }
        }
    },
    
    {
        id: "energi_eer",
        namn: "Kylmaskinens Verkningsgrad (EER)",
        kategorier: ["energi"],
        decimaler: 2,
        inputs: [
            { id: "kyleffekt", label: "Avgiven kyleffekt [kW]" },
            { id: "tillford_eleffekt", label: "Tillförd eleffekt [kW]" }
        ],
        calc: beraknaEER,
        info: {
            beskrivning: "Beräknar kylmaskinens aktuella verkningsgrad (Energy Efficiency Ratio).",
            formel: { namn: "EER", beskrivning: "EER = Avgiven kyleffekt / Tillförd eleffekt" }
        }
    }
];
