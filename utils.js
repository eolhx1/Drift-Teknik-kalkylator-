/**
* utils.js - Centraliserad logik för VVS, El och Styr-beräkningar.
*/

// --- 1. VALIDERING ---
export const valid = (...args) => args.every(val => typeof val === 'number' && !isNaN(val));

// --- 2. ENHETSKONVERTERING ---
export const toM3h = (val, unit) => (unit === "ls" ? val * 3.6: unit === "m3s" ? val * 3600: val);
export const toLs = (val, unit) => (unit === "m3h" ? val / 3.6: unit === "m3s" ? val * 1000: val);

// --- 3. SKALNING & PLC (Styr & Regler) ---
// Universell skalning för 4-20mA, 0-10V etc.
export const scale = (inVal, inMin, inMax, outMin, outMax) =>
((inVal - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;

// Beräknar vad PLC:n läser vid 0-signal (t.ex. vid kabelbrott)
export const calcFaultValue = (inMin, inMax, outMin, outMax) => scale(0, inMin, inMax, outMin, outMax);

// --- 4. TERMODYNAMIK & FLUIDMEKANIK ---
// Luft: 1.2 är värmekapacitet för luft (kJ/m³K)
export const calcEffektLuft = (flodeLs, dT) => (1.2 * flodeLs * dT) / 1000;
export const calcFlodeFranEffekt = (effektKW, dT) => dT !== 0 ? (effektKW * 1000) / (1.2 * dT): 0;

// Vatten: 1.16 är värmekapacitet för vatten (kW/m³K)
export const calcEffektVatten = (flodeM3h, dT) => 1.16 * flodeM3h * dT;

// Tryckfall (Förenklad kanalberäkning)
export const calcTryckfall = (flodeM3s, diameterMM, langdM) => {
    const area = Math.PI * Math.pow((diameterMM / 1000) / 2, 2);
    const v = flodeM3s / area; // Lufthastighet
    return (0.02 * (Math.pow(v, 2) / (diameterMM / 1000))) * langdM;
};

// --- 5. ELKRAFT ---
// Trefaseffekt: P = √3 * U * I
export const calcTrefasEffekt = (volt, ampere) => (Math.sqrt(3) * volt * ampere) / 1000;