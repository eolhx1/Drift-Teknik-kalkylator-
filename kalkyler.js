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
    styr: "Styr & Regler",
    vent: "Ventilation",
    vs: "VS & Värme",
    el: "Elkraft",
    tele: "Tele & Data",
    gas: "Gas",
    bygg: "Bygg & Energi"
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


// Lägg till fler beräkningar


// =================================================================
// 3. KALKYL-GRUPPER (Här lägger du till dina kalkyler)
// =================================================================
const styrKalkyler = [{
    id: "skalning_0_10v",
    namn: "Givarskalning 0-10V",
    kategorier: ["styr"],
    label: "Värde",
    // Etiketten för resultatet
    unit: "",
    // Ingen enhet här
    decimaler: 2,
    inputs: [{
        id: "volt",
        label: "Uppmätt spänning (V)"
    },
        {
            id: "min",
            label: "Minvärdet för givare"
        },
        {
            id: "max",
            label: "Maxvärdet för givaren"
        }],
    calc: (v) => !valid(v.volt, v.min, v.max) ? "Fel": beraknaSkalning010V(v),
    info: "Skalar om 0-10V till ett mätområde."
}];


const ventKalkyler = [
    //
    {
    id: "omsattning",
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
    info: "Används för att kontrollera hur många gånger per timme luften i ett rum byts ut."
},
    // ?
    {
    id: "kyleffekt_luft",
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
}
];

const vsKalkyler = [
    // Lägg till vs-kalkyler här efter samma mönster    
];

const elKalkyler = [
    // Lägg till el-kalkyler här efter samma mönster
];

// =================================================================
// 4. SAMMANSTÄLLNING (Den listan appen använder)
// =================================================================
// Slår ihop alla grupper till en enda lista som App.js läser.
export const ALLA_KALKYLER = [
    ...styrKalkyler,
    ...ventKalkyler,
    ...vsKalkyler,
    ...elKalkyler
    // Lägg till fler grupper här
];