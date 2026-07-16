// Fil: kalkyler.js

// =================================================================
// 1. HJÄLPFUNKTIONER (Verktyg för beräkningar)
// =================================================================
const valid = (...values) => values.every(v => v !== undefined && v !== null && !isNaN(v) && v !== '');
const toM3h = (val, unit) => (unit === "ls" ? val * 3.6 : val);
const toLs = (val, unit) => (unit === "m3h" ? val / 3.6 : val);

export const UNIT_MAP = {
    "ls": "l/s", "m3h": "m³/h", "kw": "kW", "kpa": "kPa", 
    "pa": "Pa", "mm": "mm", "celsius": "°C"
};

export const KATEGORIER = {
    styr: "Styr & Regler", vent: "Ventilation", vs: "VS & Värme",
    el: "Elkraft", tele: "Tele & Data", gas: "Gas", bygg: "Bygg & Energi"
};

// =================================================================
// 2. MATEMATISK LOGIK
// =================================================================
// Här samlar vi funktionerna. De returnerar bara råa tal (eller strängar för fel).
const beraknaOmsattning = (v) => {
    if (!v.volym || v.volym <= 0 || !v.flode) return "Fel";
    return toM3h(v.flode, v.flode_unit || "m3h") / v.volym;
};

// Exempel på hur du kan lägga till fler...
// const beraknaKyleffekt = (v) => { ... }

// =================================================================
// 3. KALKYL-GRUPPER (Här lägger du till dina kalkyler)
// =================================================================

const ventKalkyler = [
    {
        id: "omsattning",
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
        info: "Används för att kontrollera hur många gånger per timme luften i ett rum byts ut."
    }
];

const elKalkyler = [
    // Lägg till el-kalkyler här efter samma mönster
];

// =================================================================
// 4. SAMMANSTÄLLNING (Den listan appen använder)
// =================================================================
// Här slår vi ihop alla grupper till en enda lista som App.js läser.
export const ALLA_KALKYLER = [
    ...ventKalkyler,
    ...elKalkyler
    // Lägg till fler grupper här, t.ex. ...vsKalkyler
];
