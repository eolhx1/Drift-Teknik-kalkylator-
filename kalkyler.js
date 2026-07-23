// Fil: kalkyler.js

// =================================================================
// 1. HJÄLPFUNKTIONER (Verktyg för beräkningar)
// =================================================================
const valid = (...values) => values.every(v => v !== undefined && v !== null && !isNaN(v) && v !== '');
const toM3h = (val, unit) => (unit === "ls" ? val * 3.6: val);
const toLs = (val, unit) => (unit === "m3h" ? val / 3.6: val);

export const UNIT_MAP = {
    "ls": "l/s",
    "m3h": "m³/h",
    "kw": "kW",
    "kpa": "kPa",
    "pa": "Pa",
    "mm": "mm",
    "celsius": "°C"
};

export const KATEGORIER = {
    styr: {
        namn: "Styr & Regler",
        ikon: "⚙️"
    },
    vent: {
        namn: "Ventilation",
        ikon: "💨"
    },
    vs: {
        namn: "VS & Värme",
        ikon: "💧"
    },
    el: {
        namn: "Elkraft",
        ikon: "⚡"
    },
    tele: {
        namn: "Tele & Data",
        ikon: "📡"
    },
    gas: {
        namn: "Gas",
        ikon: "🔥"
    },
    bygg: {
        namn: "Bygg & Energi",
        ikon: "🧱"
    }
};

// =================================================================
// 2. MATEMATISK LOGIK
// =================================================================
const beraknaSkalning010V = (v) => (v.volt / 10) * (v.max - v.min) + v.min;

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
    let flode_m3s = enhet === "ls" ? v.flode / 1000: v.flode / 3600;
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

// Ekvivalent kanaldiameter för rektangulära kanaler
const beraknaEkvivalentDiameter = (v) => {
    if (!valid(v.bredd, v.hojd) || (v.bredd + v.hojd) === 0) return "Fel";
    // Formel: de = (2 * a * b) / (a + b)
    const de = (2 * v.bredd * v.hojd) / (v.bredd + v.hojd);
    return de;
};



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
    inputs: [{
        id: "volt",
        label: "Uppmätt spänning (V)"
    },
        {
            id: "min",
            label: "Minvärde"
        },
        {
            id: "max",
            label: "Maxvärde"
        }],
    calc: (v) => !valid(v.volt, v.min, v.max) ? "Fel": beraknaSkalning010V(v),
    info: {
        beskrivning: "Skalar om en 0-10V signal till ett fysiskt mätområde.",
        formel: {
            namn: "Linjär skalning",
            beskrivning: "Värde = (Volt / 10) * (Max - Min) + Min"
        }
    }
}];

const ventKalkyler = [{
    id: "vent_luft_omsattning",
    namn: "Luftomsättning",
    kategorier: ["vent"],
    unit: "h⁻¹",
    label: "Luftomsättning",
    decimaler: 1,
    inputs: [{
        id: "volym",
        label: "Rumsvolym (m³)"
    },
        {
            id: "flode",
            label: "Flöde",
            unit: ["ls",
                "m3h"],
            base: "m3h"
        }],
    calc: beraknaOmsattning,
    info: {
        beskrivning: "Beräknar hur många gånger per timme rumsvolymen byts ut."
    }
},
    {
        id: "vent_luft_kyleffekt",
        namn: "Kyleffekt luft",
        kategorier: ["vent"],
        unit: "kW",
        decimaler: 2,
        inputs: [{
            id: "flode",
            label: "Flöde",
            unit: ["ls",
                "m3h"],
            base: "ls"
        },
            {
                id: "tRum",
                label: "Rumstemperatur (°C)"
            },
            {
                id: "tTill",
                label: "Tilluftstemperatur (°C)"
            }],
        calc: (v) => !valid(v.flode, v.tRum, v.tTill) ? "Fel": beraknaKyleffekt(v),
        info: {
            beskrivning: "Beräknar kyleffekt i tilluft."
        }
    },
    {
        id: "vent_kontinuitet_flode",
        namn: "Flöde & Lufthastighet",
        kategorier: ["vent"],
        unit: "l/s",
        decimaler: 1,
        inputs: [{
            id: "hastighet",
            label: "Lufthastighet",
            unit: ["m/s"]
        },
            {
                id: "area",
                label: "Kanalarea",
                unit: ["m²"]
            }],
        calc: beraknaFlodeKontinuitet,
        info: {
            beskrivning: "Flöde = Hastighet × Area."
        }
    },
    
    {
        id: "vent_kfaktor_flode",
        namn: "K-faktor flödesberäkning",
        kategorier: ["vent"],
        unit: "l/s",
        decimaler: 1,
        inputs: [{
            id: "k_faktor",
            label: "K-faktor (k)"
        },
            {
                id: "delta_p",
                label: "Differenstryck (Δp)",
                unit: ["Pa"]
            }],
        calc: beraknaKfaktor,
        info: {
            beskrivning: "Flöde = K × √Δp"
        }
    },
    {
        id: "vent_proportionalitetsmetoden",
        namn: "Proportionalitetsmetoden",
        kategorier: ["vent"],
        unit: "",
        decimaler: 2,
        inputs: [{
            id: "q_matt",
            label: "Uppmätt flöde",
            unit: ["ls",
                "m3h"],
            base: "ls"
        },
            {
                id: "q_proj",
                label: "Projekterat flöde",
                unit: ["ls",
                    "m3h"],
                base: "ls"
            }],
        calc: (v) => {
            if (!valid(v.q_matt, v.q_proj) || v.q_proj === 0) return "Fel";
            const mattLs = toLs(v.q_matt, v.q_matt_unit || "ls");
            const projLs = toLs(v.q_proj, v.q_proj_unit || "ls");
            return mattLs / projLs;
        },
        info: {
            beskrivning: "Injusteringskvot."
        }
    },
    {
        id: "vent_sfp",
        namn: "Specifik Fläkteffekt (SFP)",
        kategorier: ["vent",
            "bygg"],
        unit: "kW/(m³/s)",
        decimaler: 1,
        inputs: [{
            id: "p_tot",
            label: "Total tillförd effekt (P_tot)",
            unit: ["kW"]
        },
            {
                id: "flode",
                label: "Största flöde",
                unit: ["ls",
                    "m3h"],
                base: "ls"
            }],
        calc: beraknaSFP,
        info: {
            beskrivning: "Energiaspekt för fläktar."
        }
    },
    {
        id: "vent_affinitetslagarna",
        namn: "Affinitetslagarna (Fläktlagar)",
        kategorier: ["vent",
            "styr",
            "vs"],
        unit: "",
        decimaler: 1,
        inputs: [{
            id: "q1",
            label: "Nuvarande flöde (q₁)",
            unit: ["l/s",
                "m³/h"]
        },
            {
                id: "n1",
                label: "Nuvarande frekvens/varvtal (n₁)",
                unit: ["Hz",
                    "rpm"]
            },
            {
                id: "q2",
                label: "Önskat flöde (q₂)",
                unit: ["l/s",
                    "m³/h"]
            },
            {
                id: "p1",
                label: "Nuvarande tryck (p₁) - Frivillig",
                unit: ["Pa"],
                optional: true
            },
            {
                id: "P1",
                label: "Nuvarande effekt (P₁) - Frivillig",
                unit: ["kW"],
                optional: true
            }],
        calc: beraknaAffinitet,
        info: {
            beskrivning: "Fläkt- och pumplagar."
        }
    },

    {
        id: "vent_ekvivalent_diameter",
        namn: "Ekvivalent kanaldiameter",
        kategorier: ["vent"],
        unit: "mm",
        // Standardvisning i mm (eller m beroende på vad man matar in)
        decimaler: 0,
        inputs: [{
            id: "bredd",
            label: "Kanalens bredd (a)",
            unit: ["mm",
                "m"]
        },
            {
                id: "hojd",
                label: "Kanalens höjd (b)",
                unit: ["mm",
                    "m"]
            }],
        calc: beraknaEkvivalentDiameter,
        info: {
            beskrivning: "Beräknar den ekvivalenta (hydrauliska) diametern för en rektangulär kanal så att den kan jämföras med cirkulära kanaler i tabeller.",
            formel: {
                namn: "Ekvivalent diameter",
                beskrivning: "d_e = (2 × a × b) / (a + b)"
            },
            riktvarden: "Används för att bestämma tryckfall och lufthastighet i rektangulära kanaler via diagram för cirkulära kanaler.",
            tips: "Se till att båda måtten anges i samma enhet (både i mm eller båda i m)."
        }
    }];

const vsKalkyler = [];

const elKalkyler = [{
    id: "el_ohms_lag",
    namn: "Ohms lag",
    kategorier: ["el",
        "tele"],
    decimaler: 2,
    inputs: [{
        id: "lage",
        label: "Vad vill du räkna ut?",
        unit: ["U",
            "I",
            "R"],
        requiresInput: false
    },
        {
            id: "varde1",
            label: "Ström (I) [A]"
        },
        {
            id: "varde2",
            label: "Resistans (R) [Ω]"
        }],
    calc: beraknaOhmsLag,
    info: {
        beskrivning: "Ohms lag."
    }
}];

const gasKalkyler = [{
    id: "gas_anvandningstid",
    namn: "Användningstid gasflaska",
    kategorier: ["gas"],
    decimaler: 1,
    inputs: [{
        id: "volym",
        label: "Flaskans volym",
        unit: ["L"]
    },
        {
            id: "tryck",
            label: "Tryck",
            unit: ["bar"]
        },
        {
            id: "flode",
            label: "Ordinerat flöde",
            unit: ["L/min"]
        }],
    calc: beraknaAnvandningstidGas,
    info: {
        beskrivning: "Gasflaskberäkning."
    }
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