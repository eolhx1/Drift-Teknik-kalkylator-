// Fil: kalkyler.js

// =================================================================
// 1. HJÄLPFUNKTIONER (Verktyg för beräkningar)
// =================================================================
// Kontrollerar att alla angivna värden är giltiga tal (inte tomma eller odefinierade)
const valid = (...values) => values.every(v => v !== undefined && v !== null && !isNaN(v) && v !== '');
// Konverterar flödesenheter till m³/h eller l/s
const toM3h = (val, unit) => (unit === "ls" ? val * 3.6: val);
const toLs = (val, unit) => (unit === "m3h" ? val / 3.6: val);

// Mappning för att visa läsbara enheter i UI
export const UNIT_MAP = {
    "ls": "l/s",
    "m3h": "m³/h",
    "kw": "kW",
    "kpa": "kPa",
    "pa": "Pa",
    "mm": "mm",
    "celsius": "°C"
};

// Kategorier för navigering och filtrering
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
// Funktionerna returnerar bara råa tal (eller strängar för fel).
// Styr och regler
const beraknaSkalning010V = (v) => {
    return (v.volt / 10) * (v.max - v.min) + v.min;
};

// Ventilation
const beraknaOmsattning = (v) => {
    if (!v.volym || v.volym <= 0 || !v.flode) return "Fel";
    return toM3h(v.flode, v.flode_unit || "m3h") / v.volym;
};

const beraknaKyleffekt = (v) => {
    const flode_ls = toLs(v.flode, v.flode_unit || "ls");
    const dT = v.tRum - v.tTill;
    return (1.2 * flode_ls * dT) / 1000;
};

// Kontinuitetsekvationen (Flöde = Hastighet × Area)
const beraknaFlodeKontinuitet = (v) => {
    if (!valid(v.hastighet, v.area)) return "Fel";
    const flode_m3s = v.hastighet * v.area;
    return flode_m3s * 1000; // Returnerar l/s som standard
};

// K-faktor beräkning (Flöde = K × √Δp)
const beraknaKfaktor = (v) => {
    if (!valid(v.k_faktor, v.delta_p) || v.delta_p < 0) return "Fel";

    // Formel: q = k × √Δp_i
    const flode = v.k_faktor * Math.sqrt(v.delta_p);
    return flode;
};

// Proportionalitetsmetoden (Beräknar kvot och avvikelse eller nytt flöde)
const beraknaProportionalitet = (v) => {
    if (!valid(v.q_matt, v.q_proj) || v.q_proj === 0) return "Fel";

    // Kvoten mellan uppmätt och projekterat flöde
    const kvot = v.q_matt / v.q_proj;
    return kvot;
};



// Elkraft
// Ohms lag
const beraknaOhmsLag = (v) => {
    if (!valid(v.varde1, v.varde2)) return "Fel";
    const läge = v.lage_unit || "U";

    if (läge === "U") return v.varde1 * v.varde2;
    if (läge === "I") return v.varde1 / v.varde2;
    if (läge === "R") return v.varde1 / v.varde2;
    return "Fel";
};

// Gas
// Beräkning av användningstid (Gasflaskor)
const beraknaAnvandningstidGas = (v) => {
    if (!valid(v.volym, v.tryck, v.flode) || v.flode === 0) return "Fel";
    const tidTimmar = (v.volym * v.tryck) / (v.flode * 60);
    return tidTimmar;
};


// =================================================================
// 3. KALKYL-GRUPPER (Här ligger kalkylerna)
// =================================================================

// Styr och regler kalkyler
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
        },
        riktvarden: "Kontrollera att givaren är korrekt strömsatt (24V AC/DC).",
        tips: "Om värdet fladdrar kan du behöva kontrollera att nollan är gemensam för givare och styrdator."
    }
}];

// Ventilationskalkyler
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
        beskrivning: "Beräknar hur många gånger per timme rumsvolymen byts ut.",
        formel: {
            namn: "Omsättningsformeln",
            beskrivning: "n = Flöde (m³/h) / Volym (m³)"
        },
        riktvarden: "Kontor: 0.5 - 1.5 h⁻¹. Skolor: 2.0 - 4.0 h⁻¹.",
        tips: "Tänk på att använda faktiskt uppmätt flöde vid kontrollmätning."
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
            beskrivning: "Beräknar hur mycket kyleffekt (kW) som tillförs ett rum via tilluften.",
            formel: {
                namn: "Värme/Kyl-formeln för luft",
                beskrivning: "Q = 1,2 * q * ΔT / 1000"
            },
            riktvarden: "Vanlig ΔT (tRum - tTill) ligger ofta mellan 5-10°C för att undvika drag.",
            tips: "Kontrollera att flödet är inställt på aktuellt driftläge."
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
            beskrivning: "Beräknar luftflödet genom en kanal baserat på lufthastighet och tvärsnittsarea (kontinuitetsekvationen).",
            formel: {
                namn: "q = v × A",
                beskrivning: "Flöde (l/s) = Lufthastighet (m/s) × Area (m²) × 1000"
            },
            riktvarden: "Normal lufthastighet i ventilationskanaler ligger ofta mellan 3-6 m/s för att undvika oljud.",
            tips: "För en rund kanal räknas area ut som π × r² (eller d² × π / 4)."
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
            // Ingen unit här, vilket gör att app.js ritar ut ett rent inmatningsfält utan select
        },
            {
                id: "delta_p",
                label: "Differenstryck (Δp)",
                unit: ["Pa"]
            }],
        calc: beraknaKfaktor,
        info: {
            beskrivning: "Beräknar luftflödet genom ett don eller mätuttag baserat på dess tillverkarspecifika K-faktor och uppmätt signaltryck.",
            formel: {
                namn: "q = k × √Δp_i",
                beskrivning: "Flöde (l/s) = K-faktor × Kvadratroten ur signaltrycket (Pa)"
            },
            riktvarden: "K-faktorn finns angiven i tillverkarens produktdokumentation eller på märkskylten på donet.",
            tips: "Kontrollera att mätinstrumentet är anslutet till rätt mätuttag (plus/minus) för att undvika felaktiga tryckvärden."
        }
    },

    {
        id: "vent_proportionalitetsmetoden",
        namn: "Proportionalitetsmetoden",
        kategorier: ["vent"],
        unit: "", // Kvot (dimensionslös)
        decimaler: 2,
        inputs: [
            {
                id: "q_matt",
                label: "Uppmätt flöde",
                unit: ["ls", "m3h"],
                base: "ls"
            },
            {
                id: "q_proj",
                label: "Projekterat flöde",
                unit: ["ls", "m3h"],
                base: "ls"
            }
        ],
        calc: beraknaProportionalitet,
        info: {
            beskrivning: "Beräknar kvoten mellan uppmätt och projekterat flöde (injusteringsfaktor) enligt proportionalitetsmetoden.",
            formel: {
                namn: "q_mätt / q_projekterat = konstant",
                beskrivning: "Eftersträva att kvoten är så nära 1,0 som möjligt för god balans i systemet."
            },
            riktvarden: "En kvot under 1,0 betyder att flödet är för lågt, och över 1,0 att det är för högt.",
            tips: "Använd kvoten för att räkna ut hur mycket spjället eller ventilen behöver justeras för att nå det projekterade målet."
        }
    }



];

// VS kalkyler
const vsKalkyler = [
    // Lägg till vs-kalkyler här efter samma mönster (t.ex. vs_...)
];

// Elkraftkalkyler
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
        beskrivning: "Beräknar spänning, ström eller resistans med Ohms lag.",
        formel: {
            namn: "U = R × I",
            beskrivning: "Sambandet mellan spänning, ström och resistans."
        },
        riktvarden: "Grundläggande formel för all el- och teknikberäkning.",
        tips: "Kontrollera enheterna så att du räknar i Volt, Ampere och Ohm."
    }
}];

// Gas kalkyler
const gasKalkyler = [{
    id: "gas_anvandningstid",
    namn: "Användningstid gasflaska",
    kategorier: ["gas",
        "medicin",
        "teknik"],
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
        beskrivning: "Beräknar hur länge en medicinsk gasflaska räcker vid ett visst flöde.",
        formel: {
            namn: "Tid = (Volym × Tryck) / (Flöde × 60)",
            beskrivning: "Ger den beräknade användningstiden i timmar."
        },
        riktvarden: "Observera att denna formel primärt gäller för komprimerad syrgas och medicinsk luft.",
        tips: "Kontrollera att flödet är angivet i liter per minut och trycket i bar."
    }
}];

// Tele och data kalkyler
const teleKalkyler = [
    // Lägg till tele-kalkyler här efter samma mönster (t.ex. tele_...)
];

// =================================================================
// 4. SAMMANSTÄLLNING (Den listan appen använder)
// =================================================================
export const ALLA_KALKYLER = [
    ...styrKalkyler,
    ...ventKalkyler,
    ...vsKalkyler,
    ...elKalkyler,
    ...gasKalkyler,
    ...teleKalkyler
];