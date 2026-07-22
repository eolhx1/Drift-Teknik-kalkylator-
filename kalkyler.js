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

// ?
const beraknaSkalning010V = (v) => {
    return (v.volt / 10) * (v.max - v.min) + v.min;
};

// ?
const beraknaOmsattning = (v) => {
    if (!v.volym || v.volym <= 0 || !v.flode) return "Fel";
    return toM3h(v.flode, v.flode_unit || "m3h") / v.volym;
};
// ?
const beraknaKyleffekt = (v) => {
    const flode_ls = toLs(v.flode, v.flode_unit || "ls");
    const dT = v.tRum - v.tTill;
    // Returnera bara talet, formateringen sköts av runCalc
    return (1.2 * flode_ls * dT) / 1000;
};

// Ohms lag
const beraknaOhmsLag = (v) => {
    if (!valid(v.varde1, v.varde2)) return "Fel";
    const läge = v.lage_unit || "U";

    if (läge === "U") return v.varde1 * v.varde2; // U = I * R (Värde 1 * Värde 2)
    if (läge === "I") return v.varde1 / v.varde2; // I = U / R (Spänning / Resistans)
    if (läge === "R") return v.varde1 / v.varde2; // R = U / I (Spänning / Ström)
    return "Fel";
};

// Beräkning av användningstid (Gasflaskor)
const beraknaAnvandningstidGas = (v) => {
    // v.volym = flaska (liter), v.tryck = tryck (bar), v.flode = ordinerat flöde (liter/minut)
    if (!valid(v.volym, v.tryck, v.flode) || v.flode === 0) return "Fel";

    // Formel: (Volym * Tryck) / (Flöde * 60)
    const tidTimmar = (v.volym * v.tryck) / (v.flode * 60);
    return tidTimmar;
};



// Lägg till fler beräkningar


// =================================================================
// 3. KALKYL-GRUPPER (Här ligger kalkylerna)
// =================================================================
const styrKalkyler = [{
    id: "givar_skalning_0_10v",
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


const ventKalkyler = [
    //
    {
        id: "luft_omsattning",
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
    // ?
    {
        id: "luft_kyleffekt",
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
        // Logik anropas här
        calc: (v) => !valid(v.flode, v.tRum, v.tTill) ? "Fel": beraknaKyleffekt(v),

        // Den nya strukturerade infon
        info: {
            beskrivning: "Beräknar hur mycket kyleffekt (kW) som tillförs ett rum via tilluften.",
            formel: {
                namn: "Värme/Kyl-formeln för luft",
                beskrivning: "Q = 1,2 * q * ΔT / 1000"
            },
            riktvarden: "Vanlig ΔT (tRum - tTill) ligger ofta mellan 5-10°C för att undvika drag.",
            tips: "Kontrollera att flödet är inställt på aktuellt drifläge. Vid för stor temperaturskillnad (ΔT > 10°C) ökar risken för kalldrag markant."
        }
    }];

const vsKalkyler = [
    // Lägg till vs-kalkyler här efter samma mönster
];

const elKalkyler = [
    // Ohms lag
    {
        id: "ohms_lag",
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
            // Vi sätter korta koder här
            requiresInput: false
        },
            {
                id: "varde1",
                label: "Ström (I) [A]" // Standardetikett
            },
            {
                id: "varde2",
                label: "Resistans (R) [Ω]" // Standardetikett
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

const gasKalkyler = [
    // Beräkning av användningstid (Gasflaskor) {
        id: "gas_anvandningstid",
        namn: "Användningstid gasflaska",
        kategorier: ["gas",
            "medicin",
            "teknik"],
        decimaler: 1,
        // Visar t.ex. 3.3 timmar
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

const teleKalkyler = [
    // Lägg till tele-kalkyler här efter samma mönster
];






// =================================================================
// 4. SAMMANSTÄLLNING (Den listan appen använder)
// =================================================================
// Slår ihop alla grupper till en enda lista som App.js läser.
export const ALLA_KALKYLER = [
    ...styrKalkyler,
    ...ventKalkyler,
    ...vsKalkyler,
    ...elKalkyler,
    ...gasKalkyler,
    ...teleKalkyler
    // Lägg till fler grupper här
];