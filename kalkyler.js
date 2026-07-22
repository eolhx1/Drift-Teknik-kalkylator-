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

// Specifik Fläkteffekt (SFP) = P_tot (kW) / q_max (m³/s)
const beraknaSFP = (v) => {
    if (!valid(v.p_tot, v.flode) || v.flode === 0) return "Fel";

    // Användaren kan mata in flödet i l/s eller m³/h.
    // Om enheten är l/s omvandlar vi till m³/s (dividera med 1000).
    // Om enheten är m³/h omvandlar vi till m³/s (dividera med 3600).
    const enhet = v.flode_unit || "ls";
    let flode_m3s = v.flode;

    if (enhet === "ls") {
        flode_m3s = v.flode / 1000;
    } else if (enhet === "m3h") {
        flode_m3s = v.flode / 3600;
    }

    const sfp = v.p_tot / flode_m3s;
    return sfp;
};

// Affinitetslagarna (Fläkt- och pumplagar)
const beraknaAffinitet = (v) => {
    // Kräver minst q1, n1 och q2 för att kunna räkna ut n2.
    if (!valid(v.q1, v.n1, v.q2) || v.q1 === 0 || v.n1 === 0) return "Fyll i nuvarande flöde, varvtal och önskat flöde.";

    const n1 = v.n1;
    const q1 = v.q1;
    const q2 = v.q2;

    // 1. Beräkna nytt varvtal (n2)
    const n2 = n1 * (q2 / q1);
    let resultatText = `Nytt varvtal (n₂): ${formatResult(n2, 1)} Hz/rpm\n`;

    // 2. Beräkna nytt tryck (p2) om p1 är ifyllt
    if (valid(v.p1)) {
        const p2 = v.p1 * Math.pow(n2 / n1, 2);
        resultatText += `Nytt tryck (p₂): ${formatResult(p2, 1)} Pa\n`;
    }

    // 3. Beräkna ny effekt (P2) om P1 är ifyllt
    if (valid(v.P1)) {
        const p2_effekt = v.P1 * Math.pow(n2 / n1, 3);
        resultatText += `Ny effekt (P₂): ${formatResult(p2_effekt, 2)} kW\n`;
    }

    return resultatText;
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
const ventKalkyler = [
    //
    {
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
        unit: "",
        // Kvot (dimensionslös)
        decimaler: 2,
        inputs: [{
            id: "q_matt",
            label: "Uppmätt flöde",
            unit: ["ls",
                "m3h"],
            base: "ls"
        },
            {
                id: "q_proj",
                label: "Projekterat flöde",
                unit: ["ls",
                    "m3h"],
                base: "ls"
            }],
        calc: (v) => {
            if (!valid(v.q_matt, v.q_proj) || v.q_proj === 0) return "Fel";
            // Konvertera båda till samma enhet (l/s via toLs) för att kvoten ska bli korrekt oavsett vad användaren väljer i rullistan
            const mattLs = toLs(v.q_matt, v.q_matt_unit || "ls");
            const projLs = toLs(v.q_proj, v.q_proj_unit || "ls");
            return mattLs / projLs;
        },
        info: {
            beskrivning: "Beräknar kvoten mellan uppmätt och projekterat flöde (injusteringsfaktor) enligt proportionalitetsmetoden.",
            formel: {
                namn: "q_mätt / q_projekterat = konstant",
                beskrivning: "Eftersträva att kvoten är så nära 1,0 som möjligt för god balans i systemet."
            },
            riktvarden: "En kvot under 1,0 betyder att flödet är för lågt, och över 1,0 att det är för högt.",
            tips: "Använd kvoten för att räkna ut hur mycket spjället eller ventilen behöver justeras för att nå det projekterade målet."
        }
    },

    {
        id: "vent_sfp",
        namn: "Specifik Fläkteffekt (SFP)",
        kategorier: ["vent",
            "bygg"],
        unit: "kW/(m³/s)",
        decimaler: 1,
        inputs: [{
            id: "p_tot",
            label: "Total tillförd effekt (P_tot)",
            unit: ["kW"]
        },
            {
                id: "flode",
                label: "Största flöde (tilluft/frånluft)",
                unit: ["ls",
                    "m3h"],
                base: "ls"
            }],
        calc: beraknaSFP,
        info: {
            beskrivning: "Kontrollerar fläktarnas energieffektivitet genom att relatera totalförbrukningen till det största luftflödet.",
            formel: {
                namn: "SFP = P_tot / q_max",
                beskrivning: "Specifik fläkteffekt = Total effekt (kW) / Största flöde (m³/s)"
            },
            riktvarden: "Enligt BBR (Boverkets byggregler) ställs höga krav på SFP-tal för aggregat, ofta under 1,5–2,0 kW/(m³/s) beroende på systemtyp.",
            tips: "Kom ihåg att använda det största av antingen tillufts- eller frånluftsflödet vid beräkningen."
        }
    },
    
        {
        id: "vent_affinitetslagarna",
        namn: "Affinitetslagarna (Fläktlagar)",
        kategorier: ["vent", "styr"],
        unit: "", // Hanteras i beräkningsfunktionen
        decimaler: 1,
        inputs: [
            {
                id: "q1",
                label: "Nuvarande flöde (q₁)",
                unit: ["l/s", "m³/h"] // Bara för visuell tydlighet
            },
            {
                id: "n1",
                label: "Nuvarande frekvens/varvtal (n₁)",
                unit: ["Hz", "rpm"]
            },
            {
                id: "q2",
                label: "Önskat flöde (q₂)",
                unit: ["l/s", "m³/h"]
            },
             {
                id: "p1",
                label: "Nuvarande tryck (p₁) - Frivillig",
                unit: ["Pa"]
            },
             {
                id: "P1",
                label: "Nuvarande effekt (P₁) - Frivillig",
                unit: ["kW"]
            }
        ],
        calc: beraknaAffinitet,
        info: {
            beskrivning: "Beräknar nytt varvtal/frekvens för att nå ett önskat flöde. Fyll i tryck och effekt för att även se hur dessa påverkas.",
            formel: {
                namn: "Affinitetslagarna",
                beskrivning: "Flöde: n₂ = n₁ × (q₂ / q₁)\nTryck: p₂ = p₁ × (n₂ / n₁)²\nEffekt: P₂ = P₁ × (n₂ / n₁)³"
            },
            riktvarden: "Vid fördubbling av varvtalet: Flödet dubbleras, trycket fyrdubblas, och effektbehovet åttadubblas.",
            tips: "Säkerställ att den nya beräknade effekten inte överstiger motorns märkeffekt."
        }
    }

    
    
    
    // Slutet på ventilationsstycket
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