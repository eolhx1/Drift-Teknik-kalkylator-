// =================================================================
// BYGG & ENERGI KALKYLER
// =================================================================
import { valid } from './hjalpmedel.js';

const beraknaTrappa = (v) => {
    if (!valid(v.totalhojd, v.stegdjup)) return "Fel";
    if (v.totalhojd <= 0 || v.stegdjup <= 0) return "Måtten måste vara större än 0";

    // Rekommenderad stigningshöjd för en normal bekväm trappa (ca 170-190 mm)
    // Vi räknar ut lämpligt antal steg baserat på en uppskattad höjd på 180 mm per steg
    const uppskattatAntalSteg = Math.round(v.totalhojd / 180);
    const antalSteg = uppskattatAntalSteg > 0 ? uppskattatAntalSteg : 1;
    
    const exaktSteghojd = v.totalhojd / antalSteg;
    
    // Blondels formel: 2 * höjd + djup (i mm)
    const blondelMått = (2 * exaktSteghojd) + v.stegdjup;
    
    let komfort = "Godkänd / Bekväm trappa";
    if (blondelMått < 600) {
        komfort = "⚠️ Trappan kan upplevas som brant / korta steg";
    } else if (blondelMått > 630) {
        komfort = "⚠️ Trappan kan upplevas som långsam / långa steg";
    }

    return `Antal steg: ${antalSteg st}
Steghöjd: ${exaktSteghojd.toFixed(1)} mm
Stegdjup: ${v.stegdjup} mm
Blondels mått (2H + B): ${blondelMått.toFixed(0)} mm
Status: ${komfort}`;
};

export const byggKalkyler = [{
    id: "bygg_trappa",
    namn: "Trappberäkning (Stigning & Steg)",
    kategorier: ["bygg"],
    decimaler: 1,
    inputs: [
        { id: "totalhojd", label: "Total höjd (golv till golv) [mm]" },
        { id: "stegdjup", label: "Plansteg / Stegdjup (B) [mm]" }
    ],
    calc: beraknaTrappa,
    info: {
        beskrivning: "Beräknar lämplig steghöjd och kontrollerar gångkomforten enligt Blondels formel (2H + B = 600-630 mm).",
        formel: { namn: "Blondels formel", beskrivning: "2 * Steghöjd (H) + Stegdjup (B) bör ligga mellan 600 och 630 mm." }
    }
}];
