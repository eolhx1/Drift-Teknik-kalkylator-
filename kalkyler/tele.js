// =================================================================
// TELE & DATA KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

// Beräkning av tillåten dämpning i fiberlänk
const beraknaFiberDampning = (v) => {
    if (!valid(v.langd_km, v.antal_svetsar, v.antal_kontakter)) return "Fel";
    
    // Standardvärden per enhet: Fiber ca 0.4 dB/km (vid 1310nm), Svets 0.05 dB/st, Kontaktpar 0.5 dB/st
    const dampningFiber = v.langd_km * 0.4;
    const dampningSvetsar = v.antal_svetsar * 0.05;
    const dampningKontakter = v.antal_kontakter * 0.5;
    
    const totalDampning = dampningFiber + dampningSvetsar + dampningKontakter;
    
    return `Max tillåten dämpning: ${totalDampning.toFixed(2)} dB\n` +
           `- Fiber (${v.langd_km} km): ${dampningFiber.toFixed(2)} dB\n` +
           `- Svetsar (${v.antal_svetsar} st): ${dampningSvetsar.toFixed(2)} dB\n` +
           `- Kontakter (${v.antal_kontakter} st): ${dampningKontakter.toFixed(2)} dB`;
};

export const teleKalkyler = [
    {
        id: "tele_fiber_dampning",
        namn: "Dämpningsbudget Fiberlänk",
        kategorier: ["tele"],
        decimaler: 2,
        inputs: [
            { id: "langd_km", label: "Fiberlängd [km]" },
            { id: "antal_svetsar", label: "Antal svetsar" },
            { id: "antal_kontakter", label: "Antal kontaktpar (hane/hona)" }
        ],
        calc: beraknaFiberDampning,
        info: {
            beskrivning: "Beräknar maximalt tillåten dämpning för en fiberlänk baserat på standardriktlinjer (0.4 dB/km, 0.05 dB/svets, 0.5 dB/kontakt).",
            formel: { namn: "Loss Budget", beskrivning: "Totalt = (Längd × 0.4) + (Svetsar × 0.05) + (Kontakter × 0.5)" }
        }
    }
];
