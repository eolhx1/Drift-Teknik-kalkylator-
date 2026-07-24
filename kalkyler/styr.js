// =================================================================
// STYR & REGLER KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

const beraknaSkalning010V = (v) => (v.volt / 10) * (v.max - v.min) + v.min;

export const styrKalkyler = [{
    id: "styr_givar_skalning_0_10v",
    namn: "Givarskalning 0-10V",
    kategorier: ["styr"],
    label: "Resultat",
    unit: "",
    decimaler: 2,
    inputs: [
        { id: "volt", label: "Uppmätt spänning (V)" },
        { id: "min", label: "Minvärde" },
        { id: "max", label: "Maxvärde" }
    ],
    calc: (v) => !valid(v.volt, v.min, v.max) ? "Fel" : beraknaSkalning010V(v),
    info: {
        beskrivning: "Skalar om en 0-10V styrsignal till fysiskt mätvärde.",
        detaljer: "Används vid felsökning och injustering av styr- och reglersystem för att översätta insignaler från givare till korrekta fysiska storheter.",
        formel: { namn: "Linjär skalning", beskrivning: "Värde = (Volt / 10) * (Max - Min) + Min" }
    }
}];