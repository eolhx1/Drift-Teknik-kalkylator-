// =================================================================
// ENERGI KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

const beraknaTransmissionsforlust = (v) => {
    if (!valid(v.u_varde, v.area, v.inne_temp, v.ute_temp)) return "Fel";
    const deltaT = v.inne_temp - v.ute_temp;
    const effekt_W = v.u_varde * v.area * deltaT;
    const effekt_kW = effekt_W / 1000;
    
    return `Effektförlust: ${effekt_W.toFixed(0)} W\n` +
           `Vilket motsvarar: ${effekt_kW.toFixed(2)} kW`;
};

const beraknaCOP = (v) => {
    if (!valid(v.avgiven_effekt, v.tillford_eleffekt) || v.tillford_eleffekt === 0) return "Fel";
    const cop = v.avgiven_effekt / v.tillford_eleffekt;
    return `Värmefaktor (COP): ${cop.toFixed(2)}\n` +
           `Snabbkoll: För varje kW el får du ut ${cop.toFixed(1)} kW värme.`;
};

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
            beskrivning: "Beräknar värmeeffekt som läcker ut genom byggnadsdelar.",
            detaljer: "Används för att uppskatta transmissionsförluster genom väggar, tak och fönster baserat på materialets U-värde, ytarea och temperaturskillnad.",
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
            beskrivning: "Beräknar värmepumpens aktuella verkningsgrad (COP).",
            detaljer: "Visar förhållandet mellan producerad värmeenergi och tillförd elektrisk energi under driftförhållanden.",
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
            beskrivning: "Beräknar kylmaskinens aktuella verkningsgrad (EER).",
            detaljer: "Visar effektiviteten för kylanläggningar genom att ställa levererad kyleffekt i relation till tillförd driftel.",
            formel: { namn: "EER", beskrivning: "EER = Avgiven kyleffekt / Tillförd eleffekt" }
        }
    }
];