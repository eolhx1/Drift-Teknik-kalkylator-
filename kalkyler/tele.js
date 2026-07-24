// =================================================================
// TELE & DATA KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

const beraknaFiberDampning = (v) => {
    if (!valid(v.langd_km, v.antal_svetsar, v.antal_kontakter)) return "Fel";
    
    const dampningFiber = v.langd_km * 0.4;
    const dampningSvetsar = v.antal_svetsar * 0.05;
    const dampningKontakter = v.antal_kontakter * 0.5;
    const totalDampning = dampningFiber + dampningSvetsar + dampningKontakter;
    
    return `Max tillåten dämpning: ${totalDampning.toFixed(2)} dB\n` +
           `- Fiber (${v.langd_km} km): ${dampningFiber.toFixed(2)} dB\n` +
           `- Svetsar (${v.antal_svetsar} st): ${dampningSvetsar.toFixed(2)} dB\n` +
           `- Kontakter (${v.antal_kontakter} st): ${dampningKontakter.toFixed(2)} dB`;
};

const beraknaPoE = (v) => {
    if (!valid(v.kabellangd_m, v.effekt_w)) return "Fel";
    
    const utspänningV = 48;
    const resistansOhm = v.kabellangd_m * 0.1;
    const stromA = v.effekt_w / utspänningV;
    const spanningsfallV = resistansOhm * stromA;
    const slutSpanningV = utspänningV - spanningsfallV;
    
    let status = "OK - Spänningen räcker till enheten.";
    if (v.kabellangd_m > 100) {
        status = "Varning: Kabeln är längre än 100 m (Ethernet-gräns)!";
    } else if (slutSpanningV < 37) {
        status = "Varning: För stort spänningsfall! Enheten riskerar att inte starta.";
    }

    return `Framme vid enhet: ${slutSpanningV.toFixed(1)} V\n` +
           `Spänningsfall: ${spanningsfallV.toFixed(2)} V\n` +
           `Status: ${status}`;
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
            beskrivning: "Beräknar maximalt tillåten dämpning för en fiberlänk.",
            detaljer: "Används för att säkerställa att optiska länkar klarar dämpningskraven baserat på standardvärden för fiberkablar, svetsar och anslutningskontakter.",
            formel: { namn: "Loss Budget", beskrivning: "Totalt = (Längd × 0.4) + (Svetsar × 0.05) + (Kontakter × 0.5)" }
        }
    },
    {
        id: "tele_poe_koll",
        namn: "PoE Spänningsfall & Längdkoll",
        kategorier: ["tele"],
        decimaler: 2,
        inputs: [
            { id: "kabellangd_m", label: "Kabellängd [m]" },
            { id: "effekt_w", label: "Enhetens effektförbrukning [W]" }
        ],
        calc: beraknaPoE,
        info: {
            beskrivning: "Kollar spänning och kabellängd för PoE-matade nätverksenheter.",
            detaljer: "Beräknar spänningsfallet i kopparkabeln (AWG24) för att säkerställa att spänningen framme vid enheten (t.ex. IP-kamera eller accesspunkt) inte understiger kritiska nivåer.",
            formel: { namn: "Spänningsfall i tråd", beskrivning: "U_fall = R × (P / U_ut)" }
        }
    }
];