// Fil: kalkyler.js

// 1. HJÄLPFUNKTIONER
const valid = (...values) => values.every(v => v !== undefined && v !== null && !isNaN(v) && v !== '');
const calcKyleffektLuft = (flode_ls, dT) => (1.2 * flode_ls * dT) / 1000;
const calcFlodeFranEffekt = (effekt_kW, dT) => (effekt_kW * 1000) / (1.2 * dT);
const toM3h = (val, unit) => (unit === "ls" ? val * 3.6: val);
const toLs = (val, unit) => (unit === "m3h" ? val / 3.6: val);

// 2. KATEGORIER
export const KATEGORIER = {
    vent: "Ventilation",
    vs: "VS & Värme",
    el: "Elkraft",
    tele: "Tele & Data",
    gas: "Gas",
    styr: "Styr & Regler",
    bygg: "Bygg & Energi"
};

// 3. LOGIKFUNKTIONER
const beraknaOmsattning = (v) => {
    const unit = v.flode_unit || "m3h";
    const flode_m3h = toM3h(v.flode, unit);
    const oms = flode_m3h / v.volym;
    return `Luftomsättning: ${oms.toFixed(2)} h⁻¹`;
};

const beraknaKyleffekt = (v) => {
    const unit = v.flode_unit || "ls";
    const flode_ls = toLs(v.flode, unit);
    const dT = v.tRum - v.tTill;
    const effekt_kW = calcKyleffektLuft(flode_ls, dT);
    return `Kyleffekt: ${effekt_kW.toFixed(2)} kW\nΔT: ${dT.toFixed(1)} °C`;
};

const beraknaFlodeFranKyla = (v) => {
    const dT = v.tRum - v.tTill;
    if (dT <= 0) return "Tilluften måste vara kallare än rumsluften";

    const flode_ls = calcFlodeFranEffekt(v.effekt, dT);
    return `Luftflöde: ${flode_ls.toFixed(1)} l/s\nLuftflöde: ${(flode_ls * 3.6).toFixed(0)} m³/h`;
};

const beraknaVerkningsgrad = (v) => {
    const diff = v.tFran - v.tUte;
    if (diff === 0) return "Kan ej beräknas (ΔT är 0)";

    const eta = ((v.tTill - v.tUte) / diff) * 100;
    return `Verkningsgrad: ${eta.toFixed(1)}%`;
};

const beraknaTryckfall = (v) => {
    // 1. Konvertera flöde till m³/s
    const unit = v.flode_unit || "m3h";
    const flode_m3s = (unit === "ls") ? (v.flode / 1000): (v.flode / 3600);

    // 2. Beräkna area i m² (A = π * r²)
    const radie = (v.diameter / 1000) / 2;
    const area = Math.PI * Math.pow(radie, 2);

    // 3. Beräkna lufthastighet (v = Q / A)
    const hastighet = flode_m3s / area;

    // 4. Uppskattat tryckfall per meter
    const dp_per_meter = 0.02 * (Math.pow(hastighet, 2) / (v.diameter / 1000));

    return `Lufthastighet: ${hastighet.toFixed(1)} m/s\nTryckfall: ${dp_per_meter.toFixed(2)} Pa/m`;
};

const beraknaFlodeFranOms = (v) => {
    const flode_m3h = v.volym * v.oms;
    const flode_ls = flode_m3h / 3.6;
    return `Flöde: ${flode_m3h.toFixed(0)} m³/h\nFlöde: ${flode_ls.toFixed(1)} l/s`;
};

const beraknaSpecFlode = (v) => {
    // Använd enheten som skickas med i v (fallback till 'ls')
    const unit = v.flode_unit || "ls";
    const flode_ls = toLs(v.flode, unit);

    const specFlode = flode_ls / v.area;
    return `Specifikt flöde: ${specFlode.toFixed(2)} l/s·m²`;
};

const beraknaCo2Flode = (v) => `Rekommenderat flöde: ${(v.antal * 7).toFixed(0)} l/s`;

const beraknaTryckfallKanal = (v) => {
    const unit = v.flode_unit || "m3h";
    const flode_m3s = (unit === "ls") ? (v.flode / 1000): (v.flode / 3600);
    const radie = (v.diameter / 1000) / 2;
    const area = Math.PI * Math.pow(radie, 2);
    const hastighet = flode_m3s / area;
    const dp_per_meter = 0.02 * (Math.pow(hastighet, 2) / (v.diameter / 1000));
    return `Lufthastighet: ${hastighet.toFixed(1)} m/s\nTotalt tryckfall: ${(dp_per_meter * v.langd).toFixed(1)} Pa`;
};

const beraknaSfp = (v) => {
    const unit = v.flode_unit || "m3s";
    const flode_m3s = (unit === "ls") ? (v.flode / 1000): (unit === "m3h") ? (v.flode / 3600): v.flode;
    return `SFP-tal: ${(v.effekt / flode_m3s).toFixed(2)} kW/(m³/s)`;
};

const beraknaFlodePerPerson = (v) => {
    const unit = v.flode_unit || "ls";
    return `Flöde per person: ${(toLs(v.flode, unit) / v.antal).toFixed(1)} l/s·person`;
};

const beraknaBlandning = (v) => {
    const t_mix = (v.flode1 * v.temp1 + v.flode2 * v.temp2) / (v.flode1 + v.flode2);
    return `Blandningstemperatur: ${t_mix.toFixed(1)} °C`;
};

const beraknaFlaktLagar = (v) => {
    const ratio = v.varv2 / v.varv1;
    return `Nytt flöde: ${(v.flode1 * ratio).toFixed(1)}\nNytt tryck: ${(v.tryck1 * Math.pow(ratio, 2)).toFixed(1)}`;
};

const beraknaVarmeeffekt = (v) => {
    const unit = v.flode_unit || "m3h";
    const flode_m3h = toM3h(v.flode, unit);
    const effekt_kW = 1.16 * flode_m3h * v.dT;
    return `Värmeeffekt: ${effekt_kW.toFixed(2)} kW`;
};

const beraknaOhmsLag = (v) => `Effekt: ${(v.volt * v.ampere).toFixed(0)} W`;

const beraknaTrefasEffekt = (v) => `Effekt: ${(Math.sqrt(3) * v.volt * v.ampere / 1000).toFixed(2)} kW`;

const beraknaTransmissionsforlust = (v) => `Förlust: ${(v.uVarde * v.area * v.dT).toFixed(0)} W`;

const beraknaSkalning010V = (v) => {
    const resultat = (v.volt / 10) * (v.max - v.min) + v.min;
    return `Värde: ${resultat.toFixed(2)}`;
};

const beraknaSkalning420mA = (v) => `Värde: ${(((v.ma - 4) / 16) * (v.max - v.min) + v.min).toFixed(2)}`;

const beraknaPband = (v) => `P-band (Xp): ${(v.utgang / v.fel).toFixed(2)}`;

const beraknaTidskonstant = (v) => `Tidskonstant: ${((v.volym / v.flode) * 60).toFixed(1)} minuter`;

const beraknaOmvandling020Till420 = (v) => {
    if (v.input_ma < 4) return "Värde under 4mA (Fel/Kabelbrott)";
    return `Värde: ${(((v.input_ma - 4) / 16) * (v.max - v.min) + v.min).toFixed(2)}`;
};

const beraknaPlcSkalning420 = (v) => {
    let res = ((v.input_ma - 4) / 16) * 100;
    return `Skalat värde i PLC: ${Math.max(0, Math.min(100, res)).toFixed(1)} %`;
};

// Hjälpfunktion för att räkna ut teoretiskt värde vid 0 för alla skalningsverktyg
const getTeoretisktNoll = (inMin, inMax, fysMin, fysMax) => {
    return ((0 - inMin) / (inMax - inMin)) * (fysMax - fysMin) + fysMin;
};











// 4. ALLA KALKYLER
export const ALLA_KALKYLER = [
    //
    {
        id: "omsattning",
        namn: "Luftomsättning",
        kategorier: ["vent"],
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
        calc: (v) => (!valid(v.volym, v.flode) || v.volym <= 0) ? "Fel": beraknaOmsattning(v),
        info: `Används för att kontrollera hur många gånger per timme luften i ett rum byts ut.`
    },

    {
        id: "kyleffekt_luft",
        namn: "Kyleffekt luft",
        kategorier: ["vent"],
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
        calc: (v) => !valid(v.flode, v.tRum, v.tTill) ? "Felaktiga värden": beraknaKyleffekt(v),
        info: "Kyleffekt (kW) = (1,2 × Flöde (l/s) × ΔT) / 1000"
    },

    {
        id: "flode_fran_kyla",
        namn: "Luftflöde från kyleffekt",
        kategorier: ["vent"],
        inputs: [{
            id: "effekt",
            label: "Kyleffekt (kW)"
        },
            {
                id: "tRum",
                label: "Rumstemperatur (°C)"
            },
            {
                id: "tTill",
                label: "Tilluftstemperatur (°C)"
            }],
        calc: (v) => !valid(v.effekt, v.tRum, v.tTill) ? "Felaktiga värden": beraknaFlodeFranKyla(v),
        info: `Flödesbehovet utifrån kylbehovet.`
    },

    {
        id: "verkningsgrad",
        namn: "Temperaturverkningsgrad",
        kategorier: ["vent"],
        inputs: [{
            id: "tUte",
            label: "Utetemp (°C)"
        },
            {
                id: "tTill",
                label: "Tilluft (°C)"
            },
            {
                id: "tFran",
                label: "Frånluft (°C)"
            }],
        calc: (v) => !valid(v.tUte, v.tTill, v.tFran) ? "Felaktiga värden": beraknaVerkningsgrad(v),
        info: `Temperaturverkningsgrad för värmeåtervinnare (FTX).`
    },

    {
        id: "tryckfall",
        namn: "Tryckfall",
        kategorier: ["vent"],
        inputs: [{
            id: "flode",
            label: "Flöde",
            unit: ["ls",
                "m3h"],
            base: "m3h"
        },
            {
                id: "diameter",
                label: "Diameter (mm)"
            }],
        calc: (v) => (!valid(v.flode, v.diameter) || v.diameter <= 0) ? "Fyll i giltiga värden": beraknaTryckfall(v),
        info: `Beräknar ungefärligt tryckfall per meter kanal baserat på lufthastighet. Gäller för släta cirkulära stålplåtskanaler.`
    },

    {
        id: "flode_fran_oms",
        namn: "Luftflöde från omsättning",
        kategorier: ["vent"],
        inputs: [{
            id: "volym",
            label: "Rumsvolym (m³)"
        },
            {
                id: "oms",
                label: "Omsättning (h⁻¹)"
            }],
        calc: (v) => (!valid(v.volym, v.oms) || v.volym <= 0 || v.oms <= 0) ? "Felaktiga värden": beraknaFlodeFranOms(v),
        info: `Totalt luftflöde baserat på volym och önskad omsättning.`
    },

    {
        id: "spec_flode",
        namn: "Specifikt flöde (l/s per m²)",
        kategorier: ["vent",
            "energi"],
        inputs: [{
            id: "flode",
            label: "Flöde",
            unit: ["ls",
                "m3h"],
            base: "ls"
        },
            {
                id: "area",
                label: "Area (m²)"
            }],
        calc: (v) => (!valid(v.flode, v.area) || v.area <= 0 || v.flode <= 0) ? "Felaktiga värden": beraknaSpecFlode(v),
        info: `Kontrollera BBR-krav.`
    },

    {
        id: "co2_flode",
        namn: "CO₂ luftflödesbehov",
        kategorier: ["vent"],
        inputs: [{
            id: "antal",
            label: "Antal personer"
        }],
        calc: (v) => !valid(v.antal) || v.antal < 0 ? "Felaktiga värden": beraknaCo2Flode(v),
        info: "Schablon: 7 l/s per person."
    },
    {
        id: "tryckfall_kanal",
        namn: "Tryckfall kanal",
        kategorier: ["vent"],
        inputs: [{
            id: "flode",
            label: "Flöde",
            unit: ["ls",
                "m3h"],
            base: "m3h"
        },
            {
                id: "diameter",
                label: "Diameter (mm)"
            },
            {
                id: "langd",
                label: "Längd (m)"
            }],
        calc: (v) => !valid(v.flode, v.diameter, v.langd) || v.diameter <= 0 ? "Fyll i giltiga värden": beraknaTryckfallKanal(v),
        info: "Beräknar det totala friktionstryckfallet i en rak cirkulär kanal."
    },
    {
        id: "sfp_tal",
        namn: "SFP-tal",
        kategorier: ["vent",
            "energi"],
        inputs: [{
            id: "effekt",
            label: "Eleffekt (kW)"
        },
            {
                id: "flode",
                label: "Flöde",
                unit: ["m3s",
                    "ls",
                    "m3h"],
                base: "m3s"
            }],
        calc: (v) => !valid(v.effekt, v.flode) ? "Fyll i alla fält": beraknaSfp(v),
        info: "SFP (Specific Fan Power) anger energieffektivitet."
    },
    {
        id: "flode_person",
        namn: "Flöde per person",
        kategorier: ["vent"],
        inputs: [{
            id: "flode",
            label: "Totalt flöde",
            unit: ["ls",
                "m3h"],
            base: "ls"
        },
            {
                id: "antal",
                label: "Antal personer"
            }],
        calc: (v) => !valid(v.flode, v.antal) || v.antal <= 0 ? "Felaktiga värden": beraknaFlodePerPerson(v),
        info: "Flöde per person = Totalt friskluftsflöde / Antal personer"
    },
    {
        id: "blandningstemperatur",
        namn: "Blandningstemperatur",
        kategorier: ["vent",
            "vs"],
        inputs: [{
            id: "flode1",
            label: "Flöde 1"
        },
            {
                id: "temp1",
                label: "Temperatur 1"
            },
            {
                id: "flode2",
                label: "Flöde 2"
            },
            {
                id: "temp2",
                label: "Temperatur 2"
            }],
        calc: (v) => !valid(v.flode1, v.temp1, v.flode2, v.temp2) ? "Fyll i alla fält": beraknaBlandning(v),
        info: "Resultat när två flöden blandas."
    },
    {
        id: "flakt_pumplagar",
        namn: "Fläkt- & Pumplagarna",
        kategorier: ["vent",
            "vs"],
        inputs: [{
            id: "flode1",
            label: "Nuvarande flöde"
        },
            {
                id: "tryck1",
                label: "Nuvarande tryck"
            },
            {
                id: "varv1",
                label: "Nuvarande Hz"
            },
            {
                id: "varv2",
                label: "Nytt Hz"
            }],
        calc: (v) => !valid(v.flode1, v.tryck1, v.varv1, v.varv2) || v.varv1 === 0 ? "Felaktiga värden": beraknaFlaktLagar(v),
        info: "Ändra flöde/tryck via varvtal."
    },

    {
        id: "effekt",
        namn: "Värmeeffekt",
        kategorier: ["vs"],
        inputs: [{
            id: "flode",
            label: "Flöde",
            unit: ["ls",
                "m3h"],
            base: "m3h"
        },
            {
                id: "dT",
                label: "ΔT (°C)"
            }],
        calc: (v) => !valid(v.flode, v.dT) ? "Fyll i alla fält": beraknaVarmeeffekt(v),
        info: "Formel: Effekt (kW) = 1,16 × Flöde (m³/h) × ΔT."
    },
    {
        id: "ohms_lag",
        namn: "Ohms lag & Effekt (1-fas)",
        kategorier: ["el"],
        inputs: [{
            id: "volt",
            label: "Volt"
        },
            {
                id: "ampere",
                label: "Ampere"
            }],
        calc: (v) => !valid(v.volt, v.ampere) ? "Fyll i alla fält": beraknaOhmsLag(v),
        info: "P = U * I"
    },
    {
        id: "trefaseffekt",
        namn: "Trefaseffekt (3-fas)",
        kategorier: ["el"],
        inputs: [{
            id: "volt",
            label: "Volt (L-L)"
        },
            {
                id: "ampere",
                label: "Ampere"
            }],
        calc: (v) => !valid(v.volt, v.ampere) ? "Fyll i alla fält": beraknaTrefasEffekt(v),
        info: "P = √3 * U * I"
    },
    {
        id: "transmissionsforlust",
        namn: "Transmissionsförlust",
        kategorier: ["energi",
            "bygg"],
        inputs: [{
            id: "uVarde",
            label: "U-värde"
        },
            {
                id: "area",
                label: "Area"
            },
            {
                id: "dT",
                label: "ΔT"
            }],
        calc: (v) => !valid(v.uVarde, v.area, v.dT) ? "Fyll i alla fält": beraknaTransmissionsforlust(v),
        info: "Q = U * A * ΔT"
    },
    {
        id: "skalning_0_10v",
        namn: "Givarskalning 0-10V",
        kategorier: ["styr"],
        inputs: [{
            id: "volt",
            label: "Uppmätt volt (V)"
        },
            {
                id: "min",
                label: "Minvärde"
            },
            {
                id: "max",
                label: "Maxvärde"
            }],
        calc: (v) => !valid(v.volt, v.min, v.max) ? "Fyll i alla fält": beraknaSkalning010V(v),
        info: "Skalar om 0-10V till ett mätområde.\nFormel: (U/10) * (Max - Min) + Min"
    },
    {
        id: "skalning_4_20ma",
        namn: "Givarskalning 4-20mA",
        kategorier: ["styr"],
        inputs: [{
            id: "ma",
            label: "mA"
        },
            {
                id: "min",
                label: "Min"
            },
            {
                id: "max",
                label: "Max"
            }],
        calc: (v) => !valid(v.ma, v.min, v.max) ? "Fyll i alla fält": beraknaSkalning420mA(v),
        info: "4mA motsvarar minvärdet, 20mA maxvärdet."
    },
    {
        id: "p_band",
        namn: "P-bandsberäkning (Xp)",
        kategorier: ["styr"],
        inputs: [{
            id: "utgang",
            label: "% Utsignal"
        },
            {
                id: "fel",
                label: "Δ Ärvärde"
            }],
        calc: (v) => !valid(v.utgang, v.fel) || v.fel === 0 ? "Felaktiga värden": beraknaPband(v),
        info: "P-bandet (Xp) anger proportionalitetsområdet."
    },
    {
        id: "tidskonstant",
        namn: "Tidskonstant (Värme)",
        kategorier: ["styr"],
        inputs: [{
            id: "volym",
            label: "Volym (m³)"
        },
            {
                id: "flode",
                label: "Flöde (m³/h)"
            }],
        calc: (v) => !valid(v.volym, v.flode) || v.flode === 0 ? "Fel": beraknaTidskonstant(v),
        info: "Tumregel för systemrespons."
    },
    {
        id: "plc_skalning_proffs",
        namn: "PLC Skalningsverktyg",
        kategorier: ["styr"],
        inputs: [{
            id: "givar_min_ma",
            label: "In Min (mA)"
        },
            {
                id: "givar_max_ma",
                label: "In Max (mA)"
            },
            {
                id: "fys_min",
                label: "Fys Min"
            },
            {
                id: "fys_max",
                label: "Fys Max"
            }],
        calc: (v) => !valid(v.givar_min_ma, v.givar_max_ma, v.fys_min, v.fys_max) ? "Fyll i fält":
        `PLC KONFIGURATION:\nIn: ${v.givar_min_ma}-${v.givar_max_ma}mA\nUt: ${v.fys_min}-${v.fys_max}\n\nDIAGNOS VID 0mA:\nPLC visar: ${getTeoretisktNoll(v.givar_min_ma, v.givar_max_ma, v.fys_min, v.fys_max).toFixed(2)}`,
        info: "Mappar givarens område till fysiska enheter med inbyggd larmdiagnos."
    }];