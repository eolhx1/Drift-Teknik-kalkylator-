// Fil: kalkyler.js

// =================================================================
// 1. HJÄLPFUNKTIONER (Verktyg för beräkningar)
// =================================================================
const valid = (...values) => values.every(v => v !== undefined && v !== null && !isNaN(v) && v !== '');
const toM3h = (val, unit) => (unit === "ls" ? val * 3.6: val);
const toLs = (val, unit) => (unit === "m3h" ? val / 3.6: val);

export const UNIT_MAP = {
    "ls": "l/s",
    "m3h": "m³/h",
    "kw": "kW",
    "kpa": "kPa",
    "pa": "Pa",
    "mm": "mm",
    "celsius": "°C"
};

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

// -----------------------------------------------------------------
// Styr kalkyler
// -----------------------------------------------------------------
// 0-10 voltsgivarens värde vid en Uppmätt spänning
const beraknaSkalning010V = (v) => (v.volt / 10) * (v.max - v.min) + v.min;


// TODO: Fortsätt hä med styr kalkyler

// -----------------------------------------------------------------
// Ventilations kalkyler
// -----------------------------------------------------------------
// Luftomsättning i ett rum vid ett givet tilluftsflöde
const beraknaOmsattning = (v) => {
    if (!v.volym || v.volym <= 0 || !v.flode) return "Fel";
    return toM3h(v.flode, v.flode_unit || "m3h") / v.volym;
};


const beraknaKyleffekt = (v) => {
    const flode_ls = toLs(v.flode, v.flode_unit || "ls");
    const dT = v.tRum - v.tTill;
    return (1.2 * flode_ls * dT) / 1000;
};

const beraknaFlodeKontinuitet = (v) => {
    if (!valid(v.hastighet, v.area)) return "Fel";
    return (v.hastighet * v.area) * 1000;
};

const beraknaKfaktor = (v) => {
    if (!valid(v.k_faktor, v.delta_p) || v.delta_p < 0) return "Fel";
    return v.k_faktor * Math.sqrt(v.delta_p);
};

const beraknaSFP = (v) => {
    if (!valid(v.p_tot, v.flode) || v.flode === 0) return "Fel";
    const enhet = v.flode_unit || "ls";
    let flode_m3s = enhet === "ls" ? v.flode / 1000: v.flode / 3600;
    return v.p_tot / flode_m3s;
};

const beraknaAffinitet = (v) => {
    if (!valid(v.q1, v.n1, v.q2) || v.q1 === 0 || v.n1 === 0) return "Fyll i nuvarande flöde, varvtal och önskat flöde.";

    const n1 = v.n1;
    const q1 = v.q1;
    const q2 = v.q2;

    const n2 = n1 * (q2 / q1);
    let resultatText = `Nytt varvtal (n₂): ${n2.toFixed(1)} Hz/rpm\n`;

    if (v.p1 !== undefined && v.p1 !== null && !isNaN(v.p1) && v.p1 !== '') {
        const p2 = v.p1 * Math.pow(n2 / n1, 2);
        resultatText += `Nytt tryck (p₂): ${p2.toFixed(1)} Pa\n`;
    }

    if (v.P1 !== undefined && v.P1 !== null && !isNaN(v.P1) && v.P1 !== '') {
        const p2_effekt = v.P1 * Math.pow(n2 / n1, 3);
        resultatText += `Ny effekt (P₂): ${p2_effekt.toFixed(2)} kW\n`;
    }

    return resultatText;
};

// Ekvivalent kanaldiameter för rektangulära kanaler
const beraknaEkvivalentDiameter = (v) => {
    if (!valid(v.bredd, v.hojd) || (v.bredd + v.hojd) === 0) return "Fel";
    // Formel: de = (2 * a * b) / (a + b)
    const de = (2 * v.bredd * v.hojd) / (v.bredd + v.hojd);
    return de;
};

// Strömningshastighet över don och galler (Effektiv area)
const beraknaGallerFlode = (v) => {
    if (!valid(v.hastighet, v.a_eff)) return "Fel";

    // Formel: q = v_medel * A_eff (Resultat i m³/s, omvandlar till l/s genom att multiplicera med 1000)
    const flode_m3s = v.hastighet * v.a_eff;
    const flode_ls = flode_m3s * 1000;

    return flode_ls;
};

// Temperaturverkningsgrad på värmeväxlare
const beraknaTemperaturverkningsgrad = (v) => {
    if (!valid(v.t_till, v.t_ute, v.t_fran)) return "Fel";
    const nämnare = v.t_fran - v.t_ute;
    if (nämnare === 0) return "Fel (0-division)";

    // Formel: η_t = (t_till - t_ute) / (t_från - t_ute)
    const verkningsgrad = (v.t_till - v.t_ute) / nämnare;
    return verkningsgrad;
};

// Blandningstemperatur vid recirkulation (Shuntluft)
const beraknaBlandningstemperatur = (v) => {
    if (!valid(v.q_ute, v.t_ute, v.q_ater, v.t_ater, v.q_total) || v.q_total === 0) return "Fel";

    // Konvertera flöden till samma enhet om de skiljer sig åt, eller använd direkt eftersom kvoten behåller proportionen
    // Formel: t_bland = ((q_ute * t_ute) + (q_åter * t_åter)) / q_total
    const t_bland = ((v.q_ute * v.t_ute) + (v.q_ater * v.t_ater)) / v.q_total;
    return t_bland;
};

// -----------------------------------------------------------------
// VS kalkyler
// -----------------------------------------------------------------
// 1. Grundläggande Effekt- och Flödesformel (VS)
const beraknaVsFlode = (v) => {
    if (!valid(v.effekt, v.dt)) return "Fel";
    if (v.dt === 0) return "Fel (0-division)";

    // Omvandlar effekt (W) och ΔT till l/h via formeln: q_lh = P * faktor (0.86 vid ΔT=10, 0.43 vid ΔT=20, annars allmän beräkning)
    // Standardformel: q (m³/s) = P / (4180 * 1000 * ΔT) => omvandlat till l/h: q (l/h) = (P / (4180 * 1000 * ΔT)) * 3600 * 1000 = P / (4180 * ΔT) * 3600 = P * 0.8612 / ΔT
    const flode_lh = (v.effekt / (4180 * v.dt)) * 3600;

    let resultatText = `Flöde: ${formatResult(flode_lh, 1)} l/h\n`;
    resultatText += `Flöde: ${formatResult(flode_lh / 3600, 4)} l/s`;
    return resultatText;
};

// 2. Beräkning av K-värde (Ventilinställning)
const beraknaKvVarde = (v) => {
    if (!valid(v.flode_m3h, v.tryckfall) || v.tryckfall <= 0) return "Fel";
    // Formel: kv = q / √Δp (q i m³/h, Δp i bar)
    const kv = v.flode_m3h / Math.sqrt(v.tryckfall);
    return kv;
};

// 3. Värmeavgivning vid andra temperaturer
const beraknaNyRadiatoreffekt = (v) => {
    if (!valid(v.p_proj, v.dt_ny, v.dt_gammal, v.exponent) || v.dt_gammal === 0) return "Fel";
    // Formel: P_ny = P_projekterad * (ΔT_ny / ΔT_gammal)^n
    const p_ny = v.p_proj * Math.pow(v.dt_ny / v.dt_gammal, v.exponent);
    return p_ny;
};

// 4. Proportionalitetsmetoden (VS-stammar)
const beraknaVsProportionalitet = (v) => {
    if (!valid(v.q_matt, v.q_proj) || v.q_proj === 0) return "Fel";
    return v.q_matt / v.q_proj;
};

// 5. Tryckfall i rör (Darcy-Weisbachs förenkling / linjärt tryckfall)
const beraknaTryckfallRor = (v) => {
    if (!valid(v.R, v.L)) return "Fel";
    // Formel: Δp_rör = R * L (Resultat i Pa, omvandlar gärna till kPa för tydlighet)
    const delta_p_pa = v.R * v.L;

    // Lägg till 40% tillägg för kopplingar/böjar (medelvärde av 30-50%)
    const delta_p_total = delta_p_pa * 1.4;

    let resultatText = `Rörns tryckfall: ${formatResult(delta_p_total, 0)} Pa\n`;
    resultatText += `Inkl. kopplingar (~40%): ${formatResult(delta_p_total / 1000, 2)} kPa`;
    return resultatText;
};

// 6. Pumplagarna / Affinitetslagarna för cirkulationspumpar
const beraknaPumplagar = (v) => {
    if (!valid(v.q1, v.n1, v.n2) || v.n1 === 0) return "Fel";

    const q1 = v.q1;
    const n1 = v.n1;
    const n2 = v.n2;

    // 1. Nytt flöde: q2 = q1 * (n2 / n1)
    const q2 = q1 * (n2 / n1);
    let resultatText = `Nytt flöde (q₂): ${formatResult(q2, 1)}\n`;

    // 2. Nytt tryck (H) om H1 är angivet (frivillig)
    if (v.H1 !== undefined && v.H1 !== null && !isNaN(v.H1) && v.H1 !== '') {
        const H2 = v.H1 * Math.pow(n2 / n1, 2);
        resultatText += `Nytt tryck (H₂): ${formatResult(H2, 1)} kPa\n`;
    }

    // 3. Ny effekt (P) om P1 är angivet (frivillig)
    if (v.P1 !== undefined && v.P1 !== null && !isNaN(v.P1) && v.P1 !== '') {
        const P2 = v.P1 * Math.pow(n2 / n1, 3);
        resultatText += `Ny effekt (P₂): ${formatResult(P2, 2)} kW\n`;
    }

    return resultatText;
};

// 7. Framledningstemperatur i ettrörssystem
const beraknaEttrorTemp = (v) => {
    if (!valid(v.t_fram, v.effekt, v.q_slinga) || v.q_slinga === 0) return "Fel";

    // Vattnets värmekapacitet c_p ≈ 4180 J/(kg·K), densitet ρ ≈ 1000 kg/m³
    // q_slinga i l/h omvandlas till m³/s genom delning med (3600 * 1000)
    const flode_m3s = v.q_slinga / 3600000;
    const namnare = flode_m3s * 4180 * 1000;

    if (namnare === 0) return "Fel (0-division)";

    // T_fram,nästa = T_fram - (P / (q * c_p * ρ))
    const t_nasta = v.t_fram - (v.effekt / namnare);
    return t_nasta;
};



// -----------------------------------------------------------------
// El kalkyler
// -----------------------------------------------------------------
const beraknaOhmsLag = (v) => {
    if (!valid(v.varde1, v.varde2)) return "Fel";
    const läge = v.lage_unit || "U";
    if (läge === "U") return v.varde1 * v.varde2;
    if (läge === "I" || läge === "R") return v.varde1 / v.varde2;
    return "Fel";
};


// -----------------------------------------------------------------
// Gas kalkyler
// -----------------------------------------------------------------
const beraknaAnvandningstidGas = (v) => {
    if (!valid(v.volym, v.tryck, v.flode) || v.flode === 0) return "Fel";
    return (v.volym * v.tryck) / (v.flode * 60);
};

// =================================================================
// 3. KALKYL-GRUPPER
// =================================================================
// -----------------------------------------------------------------
// Sty kalkyler
// -----------------------------------------------------------------
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
        }
    }
}];

// -----------------------------------------------------------------
// Ventilations kalkyler
// -----------------------------------------------------------------
const ventKalkyler = [{
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
        beskrivning: "Beräknar hur många gånger per timme rumsvolymen byts ut."
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
            beskrivning: "Beräknar kyleffekt i tilluft."
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
            beskrivning: "Flöde = Hastighet × Area."
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
        },
            {
                id: "delta_p",
                label: "Differenstryck (Δp)",
                unit: ["Pa"]
            }],
        calc: beraknaKfaktor,
        info: {
            beskrivning: "Flöde = K × √Δp"
        }
    },
    {
        id: "vent_proportionalitetsmetoden",
        namn: "Proportionalitetsmetoden",
        kategorier: ["vent"],
        unit: "",
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
            const mattLs = toLs(v.q_matt, v.q_matt_unit || "ls");
            const projLs = toLs(v.q_proj, v.q_proj_unit || "ls");
            return mattLs / projLs;
        },
        info: {
            beskrivning: "Injusteringskvot."
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
                label: "Största flöde",
                unit: ["ls",
                    "m3h"],
                base: "ls"
            }],
        calc: beraknaSFP,
        info: {
            beskrivning: "Energiaspekt för fläktar."
        }
    },
    {
        id: "vent_affinitetslagarna",
        namn: "Affinitetslagarna (Fläktlagar)",
        kategorier: ["vent",
            "styr"],
        unit: "",
        decimaler: 1,
        inputs: [{
            id: "q1",
            label: "Nuvarande flöde (q₁)",
            unit: ["l/s",
                "m³/h"]
        },
            {
                id: "n1",
                label: "Nuvarande frekvens/varvtal (n₁)",
                unit: ["Hz",
                    "rpm"]
            },
            {
                id: "q2",
                label: "Önskat flöde (q₂)",
                unit: ["l/s",
                    "m³/h"]
            },
            {
                id: "p1",
                label: "Nuvarande tryck (p₁) - Frivillig",
                unit: ["Pa"],
                optional: true
            },
            {
                id: "P1",
                label: "Nuvarande effekt (P₁) - Frivillig",
                unit: ["kW"],
                optional: true
            }],
        calc: beraknaAffinitet,
        info: {
            beskrivning: "Fläkt- och pumplagar."
        }
    },

    {
        id: "vent_ekvivalent_diameter",
        namn: "Ekvivalent kanaldiameter",
        kategorier: ["vent"],
        unit: "mm",
        // Standardvisning i mm (eller m beroende på vad man matar in)
        decimaler: 0,
        inputs: [{
            id: "bredd",
            label: "Kanalens bredd (a)",
            unit: ["mm",
                "m"]
        },
            {
                id: "hojd",
                label: "Kanalens höjd (b)",
                unit: ["mm",
                    "m"]
            }],
        calc: beraknaEkvivalentDiameter,
        info: {
            beskrivning: "Beräknar den ekvivalenta (hydrauliska) diametern för en rektangulär kanal så att den kan jämföras med cirkulära kanaler i tabeller.",
            formel: {
                namn: "Ekvivalent diameter",
                beskrivning: "d_e = (2 × a × b) / (a + b)"
            },
            riktvarden: "Används för att bestämma tryckfall och lufthastighet i rektangulära kanaler via diagram för cirkulära kanaler.",
            tips: "Se till att båda måtten anges i samma enhet (både i mm eller båda i m)."
        }
    },

    {
        id: "vent_galler_effektiv_area",
        namn: "Flöde via effektiv area (Don/Galler)",
        kategorier: ["vent"],
        unit: "l/s",
        decimaler: 1,
        inputs: [{
            id: "hastighet",
            label: "Uppmätt medelhastighet (v_medel)",
            unit: ["m/s"]
        },
            {
                id: "a_eff",
                label: "Effektiv area (A_eff)",
                unit: ["m²"]
            }],
        calc: beraknaGallerFlode,
        info: {
            beskrivning: "Beräknar luftflödet genom ett don eller galler baserat på uppmätt lufthastighet och tillverkarens effektiva area.",
            formel: {
                namn: "q = v_medel × A_eff",
                beskrivning: "Flöde (m³/s) = Medelhastighet (m/s) × Effektiv area (m²)"
            },
            riktvarden: "Den effektiva arean är alltid mindre än gallrets yttermått och hämtas från tillverkarens produktblad eller tryckfallstabell.",
            tips: "Försök att föra mätinstrumentet jämnt över hela gallrets yta (sökmetoden) för att få ett korrekt medelvärde."
        }
    },

    {
        id: "vent_temperaturverkningsgrad",
        namn: "Temperaturverkningsgrad (Värmeväxlare)",
        kategorier: ["vent"],
        unit: "",
        // Visas i procent eller decimal via formatering, vi sätter decimaler till 2 (t.ex. 0,80 eller 80%)
        decimaler: 2,
        inputs: [{
            id: "t_till",
            label: "Tilluft efter växlare (t_till)",
            unit: ["celsius"]
        },
            {
                id: "t_ute",
                label: "Uteluft före växlare (t_ute)",
                unit: ["celsius"]
            },
            {
                id: "t_fran",
                label: "Frånluft före växlare (t_från)",
                unit: ["celsius"]
            }],
        calc: beraknaTemperaturverkningsgrad,
        info: {
            beskrivning: "Beräknar värmeväxlarens temperaturverkningsgrad baserat på uppmätta temperaturer.",
            formel: {
                namn: "η_t = (t_till - t_ute) / (t_från - t_ute)",
                beskrivning: "Visar andelen av frånluftens värme som återvinns till tilluften."
            },
            riktvarden: "Roterande växlare brukar ligga kring 70-85%, plattväxlare runt 50-75%.",
            tips: "Mät när aggregatet är i stabil drift och uteluftstemperaturen är markant lägre än frånluftstemperaturen."
        }
    },
    {
        id: "vent_blandningstemperatur",
        namn: "Blandningstemperatur (Recirkulation)",
        kategorier: ["vent",
            "styr"],
        unit: "°C",
        decimaler: 1,
        inputs: [{
            id: "q_ute",
            label: "Uteluftsflöde (q_ute)",
            unit: ["ls",
                "m3h"],
            base: "ls"
        },
            {
                id: "t_ute",
                label: "Uteluftstemperatur (t_ute)",
                unit: ["celsius"]
            },
            {
                id: "q_ater",
                label: "Återluftsflöde (q_åter)",
                unit: ["ls",
                    "m3h"],
                base: "ls"
            },
            {
                id: "t_ater",
                label: "Återluftstemperatur (t_åter)",
                unit: ["celsius"]
            },
            {
                id: "q_total",
                label: "Totalt blandningsflöde (q_total)",
                unit: ["ls",
                    "m3h"],
                base: "ls"
            }],
        calc: beraknaBlandningstemperatur,
        info: {
            beskrivning: "Beräknar sluttemperaturen när uteluft blandas med återluft (shuntluft) före värmebatteriet.",
            formel: {
                namn: "t_bland = ((q_ute × t_ute) + (q_åter × t_åter)) / q_total",
                beskrivning: "Viktad medelvärdesberäkning av temperatur och flöden."
            },
            riktvarden: "Används för att säkerställa att luften inte blir för kall så att risken för frysning i efterföljande batterier minimeras.",
            tips: "Kontrollera att flödesenheterna (l/s eller m³/h) är konsekvent ifyllda i alla tre flödesfälten."
        }
    }];

// -----------------------------------------------------------------
// VS kalkyler
// -----------------------------------------------------------------
const vsKalkyler = [{
    id: "vs_effekt_flode",
    namn: "Radiatorflöde & Effekt (VS)",
    kategorier: ["vs"],
    unit: "l/h",
    decimaler: 1,
    inputs: [{
        id: "effekt",
        label: "Radiatoreffekt (P)",
        unit: ["W"]
    },
        {
            id: "dt",
            label: "Temperaturskillnad (ΔT)",
            unit: ["°C"]
        }],
    calc: beraknaVsFlode,
    info: {
        beskrivning: "Beräknar det erforderliga vattenflödet för en given radiatoreffekt och temperaturdifferens.",
        formel: {
            namn: "q = P / (c_p × ρ × ΔT)",
            beskrivning: "Flöde baserat på vattnets värmekapacitet och densitet."
        },
        riktvarden: "Vanliga system har ΔT 10°C (t.ex. 50/40) eller ΔT 20°C (t.ex. 60/40).",
        tips: "Vid ΔT 10°C kan du tumregelsmässigt multiplicera effekten i Watt med 0,86 för att få l/h."
    }
},
    {
        id: "vs_kv_varde",
        namn: "K_v-värde (Ventilinställning)",
        kategorier: ["vs"],
        unit: "",
        decimaler: 2,
        inputs: [{
            id: "flode_m3h",
            label: "Flöde (q)",
            unit: ["m³/h"]
        },
            {
                id: "tryckfall",
                label: "Tryckfall över ventil (Δp)",
                unit: ["bar"]
            }],
        calc: beraknaKvVarde,
        info: {
            beskrivning: "Beräknar ventilens K_v-värde för inställning av rätt flöde vid ett specifikt tryckfall.",
            formel: {
                namn: "k_v = q / √Δp",
                beskrivning: "Kapacitetsfaktor vid 1 bars tryckfall."
            },
            riktvarden: "Jämför det framräknade K_v-värdet med ventilfabrikantens förinställningstabell.",
            tips: "Se till att enheten för tryckfallet är omvandlad till bar (t.ex. 10 kPa = 0,1 bar)."
        }
    },
    {
        id: "vs_radiator_ny_temp",
        namn: "Radiatoreffekt vid ny temperatur",
        kategorier: ["vs"],
        unit: "W",
        decimaler: 0,
        inputs: [{
            id: "p_proj",
            label: "Projekterad effekt",
            unit: ["W"]
        },
            {
                id: "dt_ny",
                label: "Ny övertemperatur (ΔT_ny)",
                unit: ["°C"]
            },
            {
                id: "dt_gammal",
                label: "Gammal övertemperatur (ΔT_gammal)",
                unit: ["°C"]
            },
            {
                id: "exponent",
                label: "Radiatorexponent (n)",
                // Ingen enhet, standardvärde kan användas
            }],
        calc: beraknaNyRadiatoreffekt,
        info: {
            beskrivning: "Beräknar hur mycket effekten på en radiator förändras om man sänker framledningstemperaturen (t.ex. vid värmepumpskonvertering).",
            formel: {
                namn: "P_ny = P_proj × (ΔT_ny / ΔT_gammal)ⁿ",
                beskrivning: "Overtemperatur är medel vattentemperatur minus rumstemperatur."
            },
            riktvarden: "Moderna panelradiatorer har ofta en exponent n ≈ 1,3.",
            tips: "Om effekten inte räcker till vid lägre temperatur kan man behöva komplettera med fläktkonvektorer eller större radiatorer."
        }
    },
    {
        id: "vs_proportionalitetsmetoden",
        namn: "Proportionalitetsmetoden (VS)",
        kategorier: ["vs"],
        unit: "",
        decimaler: 2,
        inputs: [{
            id: "q_matt",
            label: "Uppmätt flöde",
            unit: ["l/h",
                "m³/h"]
        },
            {
                id: "q_proj",
                label: "Projekterat flöde",
                unit: ["l/h",
                    "m³/h"]
            }],
        calc: beraknaVsProportionalitet,
        info: {
            beskrivning: "Beräknar injusteringskvoten för stammar och radiatorer för att säkerställa proportionell balans.",
            formel: {
                namn: "q_mätt / q_projekterat = konstant",
                beskrivning: "Kvoten används för att justera in kretsarna i rätt ordning."
            },
            riktvarden: "Sträva efter en kvot på 1,0 för samtliga terminaler i stammen.",
            tips: "Justera alltid huvudstammar i ordning från sämst balanserad till bäst balanserad."
        }
    },

    // Tryckfall i rör (Darcy-Weisbachs förenkling / linjärt tryckfall)
    const beraknaTryckfallRor = (v) => {
        if (!valid(v.R, v.L)) return "Fel";
        // Formel: Δp_rör = R * L (Resultat i Pa, omvandlar gärna till kPa för tydlighet)
        const delta_p_pa = v.R * v.L;

        // Lägg till 40% tillägg för kopplingar/böjar (medelvärde av 30-50%)
        const delta_p_total = delta_p_pa * 1.4;

        let resultatText = `Rörns tryckfall: ${formatResult(delta_p_total, 0)} Pa\n`;
        resultatText += `Inkl. kopplingar (~40%): ${formatResult(delta_p_total / 1000, 2)} kPa`;
        return resultatText;
    };

    // Pumplagarna / Affinitetslagarna för cirkulationspumpar
    const beraknaPumplagar = (v) => {
        if (!valid(v.q1, v.n1, v.n2) || v.n1 === 0) return "Fel";

        const q1 = v.q1;
        const n1 = v.n1;
        const n2 = v.n2;

        // 1. Nytt flöde: q2 = q1 * (n2 / n1)
        const q2 = q1 * (n2 / n1);
        let resultatText = `Nytt flöde (q₂): ${formatResult(q2, 1)}\n`;

        // 2. Nytt tryck (H) om H1 är angivet (frivillig)
        if (v.H1 !== undefined && v.H1 !== null && !isNaN(v.H1) && v.H1 !== '') {
            const H2 = v.H1 * Math.pow(n2 / n1, 2);
            resultatText += `Nytt tryck (H₂): ${formatResult(H2, 1)} kPa\n`;
        }

        // 3. Ny effekt (P) om P1 är angivet (frivillig)
        if (v.P1 !== undefined && v.P1 !== null && !isNaN(v.P1) && v.P1 !== '') {
            const P2 = v.P1 * Math.pow(n2 / n1, 3);
            resultatText += `Ny effekt (P₂): ${formatResult(P2, 2)} kW\n`;
        }

        return resultatText;
    };

    // Framledningstemperatur i ettrörssystem
    const beraknaEttrorTemp = (v) => {
        if (!valid(v.t_fram, v.effekt, v.q_slinga) || v.q_slinga === 0) return "Fel";

        // Vattnets värmekapacitet c_p ≈ 4180 J/(kg·K), densitet ρ ≈ 1000 kg/m³
        // q_slinga i l/h omvandlas till m³/s genom delning med (3600 * 1000)
        const flode_m3s = v.q_slinga / 3600000;
        const namnare = flode_m3s * 4180 * 1000;

        if (namnare === 0) return "Fel (0-division)";

        // T_fram,nästa = T_fram - (P / (q * c_p * ρ))
        const t_nasta = v.t_fram - (v.effekt / namnare);
        return t_nasta;
    };
];





// -----------------------------------------------------------------
// El kalkyler
// -----------------------------------------------------------------
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
        beskrivning: "Ohms lag."
    }
}];

// -----------------------------------------------------------------
// Gas kalkyler
// -----------------------------------------------------------------
const gasKalkyler = [{
    id: "gas_anvandningstid",
    namn: "Användningstid gasflaska",
    kategorier: ["gas"],
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
        beskrivning: "Gasflaskberäkning."
    }
}];

// -----------------------------------------------------------------
// Tele Data kalkyler
// -----------------------------------------------------------------
const teleKalkyler = [];



export const ALLA_KALKYLER = [
    ...styrKalkyler,
    ...ventKalkyler,
    ...vsKalkyler,
    ...elKalkyler,
    ...gasKalkyler,
    ...teleKalkyler
];