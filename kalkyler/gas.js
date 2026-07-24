// =================================================================
// GAS KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

const beraknaAnvandningstidGas = (v) => {
    if (!valid(v.volym, v.tryck, v.flode) || v.flode === 0) return "Fel";
    return (v.volym * v.tryck) / (v.flode * 60);
};

export const gasKalkyler = [{
    id: "gas_anvandningstid",
    namn: "Användningstid gasflaska",
    kategorier: ["gas"],
    decimaler: 1,
    inputs: [
        { id: "volym", label: "Flaskans volym", unit: ["L"] },
        { id: "tryck", label: "Tryck", unit: ["bar"] },
        { id: "flode", label: "Ordinerat flöde", unit: ["L/min"] }
    ],
    calc: beraknaAnvandningstidGas,
    info: {
        beskrivning: "Beräknar uppskattad räcker-tid för en gasflaska vid givet uttag.",
        detaljer: "Används för att beräkna hur länge en gasol- eller gasflaska räcker baserat på flaskans vattenvolym, aktuellt tryck och det uttagna flödet."
    }
}];