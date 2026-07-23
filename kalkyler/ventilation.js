//
// Fil: js/ventilation.js
//

import { valid, formatResult, toM3h, toLs } from './hjalpmedel.js';

// --- Beräkningsfunktioner (Ventilation) ---
const beraknaOmsattning = (v) => {
    if (!v.volym || v.volym <= 0 || !v.flode) return "Fel";
    return toM3h(v.flode, v.flode_unit || "m3h") / v.volym;
};

const beraknaKyleffekt = (v) => {
    const flode_ls = toLs(v.flode, v.flode_unit || "ls");
    const dT = v.tRum - v.tTill;
    return (1.2 * flode_ls * dT) / 1000;
};

const beraknaFlodeKontinuitet = (v) => {
    if (!valid(v.hastighet, v.area)) return "Fel";
    return (v.hastighet * v.area) * 1000;
};

const beraknaKfaktor = (v) => {
    if (!valid(v.k_faktor, v.delta_p) || v.delta_p < 0) return "Fel";
    return v.k_faktor * Math.sqrt(v.delta_p);
};

const beraknaSFP = (v) => {
    if (!valid(v.p_tot, v.flode) || v.flode === 0) return "Fel";
    const enhet = v.flode_unit || "ls";
    let flode_m3s = enhet === "ls" ? v.flode / 1000 : v.flode / 3600;
    return v.p_tot / flode_m3s;
};

const beraknaAffinitet = (v) => {
    if (!valid(v.q1, v.n1, v.q2) || v.q1 === 0 || v.n1 === 0) return "Fyll i nuvarande flöde, varvtal och önskat flöde.";

    const n1 = v.n1;
    const q1 = v.q1;
    const q2 = v.q2;

    const n2 = n1 * (q2 / q1);
    let resultatText = `Nytt varvtal (n₂): ${n2.toFixed(1)} Hz/rpm\n`;

    if (v.p1 !== undefined && v.p1 !== null && !isNaN(v.p1) && v.p1 !== '') {
        const p2 = v.p1 * Math.pow(n2 / n1, 2);
        resultatText += `Nytt tryck (p₂): ${p2.toFixed(1)} Pa\n`;
    }

    if (v.P1 !== undefined && v.P1 !== null && !isNaN(v.P1) && v.P1 !== '') {
        const p2_effekt = v.P1 * Math.pow(n2 / n1, 3);
        resultatText += `Ny effekt (P₂): ${p2_effekt.toFixed(2)} kW\n`;
    }

    return resultatText;
};

const beraknaEkvivalentDiameter = (v) => {
    if (!valid(v.bredd, v.hojd) || (v.bredd + v.hojd) === 0) return "Fel";
    return (2 * v.bredd * v.hojd) / (v.bredd + v.hojd);
};

const beraknaGallerFlode = (v) => {
    if (!valid(v.hastighet, v.a_eff)) return "Fel";
    return (v.hastighet * v.a_eff) * 1000;
};

const beraknaTemperaturverkningsgrad = (v) => {
    if (!valid(v.t_till, v.t_ute, v.t_fran)) return "Fel";
    const nämnare = v.t_fran - v.t_ute;
    if (nämnare === 0) return "Fel (0-division)";
    return (v.t_till - v.t_ute) / nämnare;
};

const beraknaBlandningstemperatur = (v) => {
    if (!valid(v.q_ute, v.t_ute, v.q_ater, v.t_ater, v.q_total) || v.q_total === 0) return "Fel";
    return ((v.q_ute * v.t_ute) + (v.q_ater * v.t_ater)) / v.q_total;
};

// --- Kalkyl-array (Ventilation) ---
export const ventKalkyler = [
    {
        id: "vent_luft_omsattning",
        namn: "Luftomsättning",
        kategorier: ["vent"],
        unit: "h⁻¹",
        label: "Luftomsättning",
        decimaler: 1,
        inputs: [
            { id: "volym", label: "Rumsvolym (m³)" },
            { id: "flode", label: "Flöde", unit: ["ls", "m3h"], base: "m3h" }
        ],
        calc: beraknaOmsattning,
        info: { beskrivning: "Beräknar hur många gånger per timme rumsvolymen byts ut." }
    },
    {
        id: "vent_luft_kyleffekt",
        namn: "Kyleffekt luft",
        kategorier: ["vent"],
        unit: "kW",
        decimaler: 2,
        inputs: [
            { id: "flode", label: "Flöde", unit: ["ls", "m3h"], base: "ls" },
            { id: "tRum", label: "Rumstemperatur (°C)" },
            { id: "tTill", label: "Tilluftstemperatur (°C)" }
        ],
        calc: (v) => !valid(v.flode, v.tRum, v.tTill) ? "Fel" : beraknaKyleffekt(v),
        info: { beskrivning: "Beräknar kyleffekt i tilluft." }
    },
    {
        id: "vent_kontinuitet_flode",
        namn: "Flöde & Lufthastighet",
        kategorier: ["vent"],
        unit: "l/s",
        decimaler: 1,
        inputs: [
            { id: "hastighet", label: "Lufthastighet", unit: ["m/s"] },
            { id: "area", label: "Kanalarea", unit: ["m²"] }
        ],
        calc: beraknaFlodeKontinuitet,
        info: { beskrivning: "Flöde = Hastighet × Area." }
    },
    {
        id: "vent_kfaktor_flode",
        namn: "K-faktor flödesberäkning",
        kategorier: ["vent"],
        unit: "l/s",
        decimaler: 1,
        inputs: [
            { id: "k_faktor", label: "K-faktor (k)" },
            { id: "delta_p", label: "Differenstryck (Δp)", unit: ["Pa"] }
        ],
        calc: beraknaKfaktor,
        info: { beskrivning: "Flöde = K × √Δp" }
    },
    {
        id: "vent_proportionalitetsmetoden",
        namn: "Proportionalitetsmetoden",
        kategorier: ["vent"],
        unit: "",
        decimaler: 2,
        inputs: [
            { id: "q_matt", label: "Uppmätt flöde", unit: ["ls", "m3h"], base: "ls" },
            { id: "q_proj", label: "Projekterat flöde", unit: ["ls", "m3h"], base: "ls" }
        ],
        calc: (v) => {
            if (!valid(v.q_matt, v.q_proj) || v.q_proj === 0) return "Fel";
            const mattLs = toLs(v.q_matt, v.q_matt_unit || "ls");
            const projLs = toLs(v.q_proj, v.q_proj_unit || "ls");
            return mattLs / projLs;
        },
        info: { beskrivning: "Injusteringskvot." }
    },
    {
        id: "vent_sfp",
        namn: "Specifik Fläkteffekt (SFP)",
        kategorier: ["vent", "bygg"],
        unit: "kW/(m³/s)",
        decimaler: 1,
        inputs: [
            { id: "p_tot", label: "Total tillförd effekt (P_tot)", unit: ["kW"] },
            { id: "flode", label: "Största flöde", unit: ["ls", "m3h"], base: "ls" }
        ],
        calc: beraknaSFP,
        info: { beskrivning: "Energiaspekt för fläktar." }
    },
    {
        id: "vent_affinitetslagarna",
        namn: "Affinitetslagarna (Fläktlagar)",
        kategorier: ["vent", "styr"],
        unit: "",
        decimaler: 1,
        inputs: [
            { id: "q1", label: "Nuvarande flöde (q₁)", unit: ["l/s", "m³/h"] },
            { id: "n1", label: "Nuvarande frekvens/varvtal (n₁)", unit: ["Hz", "rpm"] },
            { id: "q2", label: "Önskat flöde (q₂)", unit: ["l/s", "m³/h"] },
            { id: "p1", label: "Nuvarande tryck (p₁) - Frivillig", unit: ["Pa"], optional: true },
            { id: "P1", label: "Nuvarande effekt (P₁) - Frivillig", unit: ["kW"], optional: true }
        ],
        calc: beraknaAffinitet,
        info: { beskrivning: "Fläkt- och pumplagar." }
    },
    {
        id: "vent_ekvivalent_diameter",
        namn: "Ekvivalent kanaldiameter",
        kategorier: ["vent"],
        unit: "mm",
        decimaler: 0,
        inputs: [
            { id: "bredd", label: "Kanalens bredd (a)", unit: ["mm", "m"] },
            { id: "hojd", label: "Kanalens höjd (b)", unit: ["mm", "m"] }
        ],
        calc: beraknaEkvivalentDiameter,
        info: { beskrivning: "Beräknar den ekvivalenta (hydrauliska) diametern för en rektangulär kanal." }
    },
    {
        id: "vent_galler_effektiv_area",
        namn: "Flöde via effektiv area (Don/Galler)",
        kategorier: ["vent"],
        unit: "l/s",
        decimaler: 1,
        inputs: [
            { id: "hastighet", label: "Uppmätt medelhastighet (v_medel)", unit: ["m/s"] },
            { id: "a_eff", label: "Effektiv area (A_eff)", unit: ["m²"] }
        ],
        calc: beraknaGallerFlode,
        info: { beskrivning: "Beräknar luftflödet genom ett don eller galler baserat på uppmätt lufthastighet." }
    },
    {
        id: "vent_temperaturverkningsgrad",
        namn: "Temperaturverkningsgrad (Värmeväxlare)",
        kategorier: ["vent"],
        unit: "",
        decimaler: 2,
        inputs: [
            { id: "t_till", label: "Tilluft efter växlare (t_till)", unit: ["celsius"] },
            { id: "t_ute", label: "Uteluft före växlare (t_ute)", unit: ["celsius"] },
            { id: "t_fran", label: "Frånluft före växlare (t_från)", unit: ["celsius"] }
        ],
        calc: beraknaTemperaturverkningsgrad,
        info: { beskrivning: "Beräknar värmeväxlarens temperaturverkningsgrad." }
    },
    {
        id: "ventil_blandningstemperatur",
        namn: "Blandningstemperatur (Recirkulation)",
        kategorier: ["vent", "styr"],
        unit: "°C",
        decimaler: 1,
        inputs: [
            { id: "q_ute", label: "Uteluftsflöde (q_ute)", unit: ["ls", "m3h"], base: "ls" },
            { id: "t_ute", label: "Uteluftstemperatur (t_ute)", unit: ["celsius"] },
            { id: "q_ater", label: "Återluftsflöde (q_åter)", unit: ["ls", "m3h"], base: "ls" },
            { id: "t_ater", label: "Återluftstemperatur (t_ater)", unit: ["celsius"] },
            { id: "q_total", label: "Totalt blandningsflöde (q_total)", unit: ["ls", "m3h"], base: "ls" }
        ],
        calc: beraknaBlandningstemperatur,
        info: { beskrivning: "Beräknar sluttemperaturen när uteluft blandas med återluft." }
    }
];
