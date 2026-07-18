/**
* APP.JS - Drift Teknik
* Huvudlogik för applikationen.
*/
import {
    ALLA_KALKYLER,
    KATEGORIER,
    UNIT_MAP
} from './kalkyler.js';

// --- 1. GLOBAL STATE & DOM-REFERENSER ---
const state = {
    container: document.getElementById("calcContainer"),
    mainNav: document.getElementById("mainNav"),
    subNav: document.getElementById("subNav"),
    searchBox: document.getElementById("searchBox"),
    activeCategory: null,
    //
    clearSearchBtn: document.getElementById("clearSearchBtn")
};

// --- 2. INITIALISERING ---
document.addEventListener("DOMContentLoaded", () => {
    // 2.0 Definierar debounce funktionen
    const debouncedRunCalc = debounce((calcId) => {
        runCalc(null, calcId);
    }, 250);

    // 2.1 Inställningar vid start
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // 2.2 Sökfunktion (med rensa-knapp logik)
    if (state.searchBox && state.clearSearchBtn) {
        state.searchBox.addEventListener("input", () => {
            // Visa/dölj X baserat på om fältet är tomt
            state.clearSearchBtn.classList.toggle("hidden", state.searchBox.value === "");
            // Kör sökningen med debounce89
            debounce(searchCalculations, 200)();
        });

        state.clearSearchBtn.addEventListener("click", () => {
            state.searchBox.value = "";
            state.clearSearchBtn.classList.add("hidden");
            // Återgå till menyn för aktuell kategori eller huvudmenyn
            state.activeCategory ? showSubMenu(state.activeCategory): showMainMenu();
            state.searchBox.focus();
        });
    }

    // 2.3 Koppla kugghjulet (statiskt element i headern)
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            triggerHaptic(20);
            showSettings();
        });
    }

    // Koppling av bottenmeny
    const navHome = document.getElementById("navHome");
    const navFav = document.getElementById("navFav");
    const navRecent = document.getElementById("navRecent");
    const navSearch = document.getElementById("navSearch"); // Lägg till denna

    if (navHome) navHome.addEventListener("click", () => {
        setActiveNav("navHome");
        showMainMenu();
    });
    if (navFav) navFav.addEventListener("click", () => {
        setActiveNav("navFav");
        showSubMenu("favoriter");
    });
    if (navRecent) navRecent.addEventListener("click", () => {
        setActiveNav("navRecent");
        showSubMenu("recent");
    });
    if (navSearch) navSearch.addEventListener("click", () => {
        // Och denna
        setActiveNav("navSearch");
        showSearchModal();
    });



    // 2.4 GLOBAL LYSSNARE för alla dynamiska knappar
    state.container.addEventListener("click", (event) => {
        const id = event.target.id;
        const calcId = event.target.dataset.calcId; // Hämtar värdet från data-calc-id

        if (!id) return; // Om man klickar utanför en knapp

        triggerHaptic(20); // Haptik på ALLA klick i containern

        // Routa klick baserat på ID
        if (id === "backBtn") showMainMenu();
        if (id === "darkModeToggle") toggleDarkMode();
        if (id === "hapticToggle") toggleHaptic();
        if (id === "clearDataBtn") {
            if (confirm("Rensa all data?")) {
                localStorage.clear(); location.reload();
            }
        }
        if (id === "favoriteBtn") {
            toggleFavorite(calcId);
            renderCalc("favoriter", calcId); // Uppdatera stjärnan
        }

        if (id === "resetBtn") {
            smartReset(calcId);
        }
    });

    // 2.5 UPPDATERAD INPUT-LYSSNARE
    state.container.addEventListener("input",
        (e) => {
            if (e.target.matches("input, select")) {
                // Vi hämtar calcId från det element som har attributet
                const calcId = state.container.querySelector("[data-calc-id]")?.dataset.calcId;
                if (calcId) {
                    debouncedRunCalc(calcId); // Använd den debounced-versionen här!
                }
            }
        });

    // 2.6 Klick på rubriken för att gå hem
    const appTitle = document.getElementById("appTitle");
    if (appTitle) {
        appTitle.addEventListener("click", (e) => {
            e.preventDefault(); // Stoppar eventuella standardbeteenden
            triggerHaptic(20);
            showMainMenu();
            setActiveNav("navHome");
        });
    }

    showMainMenu();
    setActiveNav("navHome");
});



// Hantera webbläsarens bakåt-knapp
window.addEventListener("popstate", (event) => {
    if (!event.state || event.state.page === "home") showMainMenu();
    else if (event.state.category && event.state.calcId) renderCalc(event.state.category, event.state.calcId);
});

// --- 3. BERÄKNINGSMOTOR ---
function runCalc(category, calcId) {
    const calc = findCalc(calcId);
    const page = state.container.querySelector(".calc-page");
    if (!page || !calc) return;

    const resultBox = page.querySelector(".result");
    const inputs = page.querySelectorAll("input[data-id]");
    const selects = page.querySelectorAll("select[data-unit]");

    const values = {};
    let allFilled = true;

    selects.forEach(s => values[s.dataset.unit + "_unit"] = s.value);
    inputs.forEach(i => {
        const val = parseFloat(i.value.replace(",", "."));
        if (isNaN(val)) allFilled = false;
        else values[i.dataset.id] = val;
    });

    localStorage.setItem(`calc_${calcId}`,
        JSON.stringify(values));

    if (!allFilled) {
        resultBox.innerText = "Fyll i alla fält...";
        return;
    }

    try {
        const rawResult = calc.calc(values);

        // Om kalkylen returnerar en sträng, visa den direkt (för gamla kalkyler)
        if (typeof rawResult === 'string') {
            resultBox.innerHTML = rawResult.replace(/\n/g, "<br>");
        }
        // Om kalkylen returnerar ett tal, använd den nya formateringen
        else if (typeof rawResult === 'number') {
            const decimalPrecision = calc.decimaler !== undefined ? calc.decimaler: 2;
            const unit = calc.unit || "";
            const label = calc.label ? `${calc.label}: `: "";

            const formattedNum = formatResult(rawResult, decimalPrecision);
            resultBox.innerHTML = `${label}${formattedNum} ${unit}`;
        }
    } catch (err) {
        // Om något går fel, visa ett meddelande men krascha inte resten av appen
        resultBox.innerText = "Ett fel uppstod i beräkningen.";
    }
}


// --- 4. MENYHANTERING & RENDERING ---
function showMainMenu() {
    state.activeCategory = null;
    clear(state.container);
    clear(state.subNav);

    // Vi ser till att menyn visas
    state.mainNav.classList.remove("hidden");
    state.subNav.classList.remove("hidden");

    if (state.searchBox) {
        state.searchBox.value = "";
        state.searchBox.style.display = "block";
    }

    // Vi tömmer mainNav för att fylla på med rätt saker
    state.mainNav.innerHTML = "";

    // Kategorier - VIKTIGT: Kontrollera att KATEGORIER finns och har data!
    Object.entries(KATEGORIER).forEach(([key, name]) => {
        const btn = createButton(name, "nav-btn", () => showSubMenu(key));
        btn.dataset.category = key;
        state.mainNav.appendChild(btn);
    });
}


function showSubMenu(categoryKey) {
    state.activeCategory = categoryKey; // Spara kategorin

    // 1. Ta bort 'active-nav' från alla
    state.mainNav.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
    });

    // 2. Hitta rätt knapp via data-attributet och markera
    const activeBtn = state.mainNav.querySelector(`[data-category="${categoryKey}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active-nav');
    }

    // Göm huvudmenyn helt när man valt en kategori för att frigöra plats
    state.mainNav.classList.add("hidden");

    // Töm sökfältet och dölj eventuella sökresultat
    if (state.searchBox) {
        state.searchBox.value = "";
    }

    clear(state.container);
    clear(state.subNav);
    state.subNav.classList.add("active");

    const list = (categoryKey === "recent") ? getRecent():
    (categoryKey === "favoriter") ? getFavorites(): null;

    if (list) {
        if (list.length === 0) {
            state.subNav.innerHTML = "<p style='padding:14px; color:var(--text-muted);'>Ingen data hittades.</p>";
            return;
        }
        list.forEach(calcId => {
            const calc = findCalc(calcId);
            if (calc) state.subNav.appendChild(createButton(calc.namn, "sub-btn", () => renderCalc(categoryKey, calc.id)));
        });
    } else {
        ALLA_KALKYLER.filter(c => c.kategorier.includes(categoryKey)).forEach(calc => {
            state.subNav.appendChild(createButton(calc.namn, "sub-btn", () => renderCalc(categoryKey, calc.id)));
        });
    }
}

function renderCalc(category, calcId) {
    addRecent(calcId);
    clear(state.container);
    state.mainNav.classList.add("hidden");
    state.subNav.classList.add("hidden");
    if (state.searchBox) state.searchBox.style.display = "none";

    const calc = findCalc(calcId);
    if (!calc) return;

    // Hämta namnet på kategorin för att visa i breadcrumb
    const categoryName = KATEGORIER[category] || "Kalkyl";
    // Hämtar spatad data: Försöker hämta objektet för denna kalkyl, annars tomt objekt
    const savedData = JSON.parse(localStorage.getItem(`calc_${calcId}`) || "{}");

    state.container.innerHTML = `
    <div class="calc-page" data-calc-id="${calcId}">
    <div class="calc-header-nav">
    <button id="backBtn" class="back-btn">${categoryName}</button>
    </div>
    <h2>${calc.namn}
    <button id="favoriteBtn" class="favorite-btn" data-calc-id="${calcId}">
    ${isFavorite(calcId) ? "⭐": "☆"}
    </button>
    </h2>

    ${calc.inputs.map(i => {
        // Hämta sparade värden för just denna input
        const savedValue = savedData[i.id] || "";
        const savedUnit = savedData[i.id + "_unit"] || (i.unit ? i.unit[0]: "");

        return i.unit ? `
        <div class="input-group">
        <label>${i.label}</label>
        <div style="display:flex; gap:8px;">
        <input type="number" inputmode="decimal" step="any" data-id="${i.id}" value="${savedValue}">
        <select data-unit="${i.id}">
        ${i.unit.map(u => {
            // Om nyckeln 'u' inte finns i UNIT_MAP, fall tillbaka på 'u' själv
            const display = UNIT_MAP[u] || u;
            return `<option value="${u}" ${savedUnit === u ? "selected": ""}>${display}</option>`;
        }).join("")}
        </select>

        </div>
        </div>`: `
        <div class="input-group">
        <label>${i.label}</label>
        <input type="number" inputmode="decimal" step="any" data-id="${i.id}" value="${savedValue}">
        </div>`;
    }).join("")}

    <button id="resetBtn" class="reset-btn" data-calc-id="${calcId}">Nollställ</button>
    <div class="result"></div>

    <div class="calc-info-title" onclick="toggleInfo()">
    <span>Info om beräkningen</span>
    <span id="infoIcon">▼</span>
    </div>
    <div id="calcInfo" class="calc-info-content">
    ${typeof calc.info === 'string' ? `<p>${calc.info}</p>`: `
    ${calc.info?.beskrivning ? `<p>${calc.info.beskrivning}</p>`: ""}
    ${calc.info?.formel ? `<p><strong>Formel:</strong> ${calc.info.formel.namn} (${calc.info.formel.beskrivning})</p>`: ""}
    ${calc.info?.riktvarden ? `<p><strong>Riktvärden:</strong> ${calc.info.riktvarden}</p>`: ""}
    ${calc.info?.tips ? `<p><strong>Tips:</strong> ${calc.info.tips}</p>`: ""}
    `}
    </div>

    </div>`;

    // Kör en beräkning direkt när sidan laddats så att resultatet visas omedelbart
    runCalc(null, calcId);
}

// ShowSettings-funktionen
function showSettings() {
    clear(state.container);
    state.mainNav.classList.add("hidden");
    state.subNav.classList.add("hidden");
    if (state.searchBox) state.searchBox.style.display = "none";

    const hapticStatus = localStorage.getItem("hapticEnabled") || "enabled";

    state.container.innerHTML = `
    <div class="calc-page">
    <button id="backBtn" class="back-btn">Tillbaka</button>
    <h2>Inställningar</h2>
    <div class="settings-section">
    <button id="darkModeToggle" class="nav-btn">🌙 Växla mörkt läge</button>
    <button id="hapticToggle" class="nav-btn">📳 Haptik: ${hapticStatus === "enabled" ? "PÅ": "AV"}</button>
    <button id="clearDataBtn" class="nav-btn">Rensa all sparad data</button>
    </div>
    </div>`;
}

// ==========================================================================
//  5. HJÄLPFUNKTIONER
// ==========================================================================
function clear(el) {
    if (el) el.innerHTML = "";
}

function createButton(text, className, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = className;
    btn.onclick = () => {
        triggerHaptic(20); // Vibrera lite lätt vid varje klick
        onClick(); // Kör den vanliga funktionen
    };
    return btn;
}

function findCalc(calcId) {
    return ALLA_KALKYLER.find(c => c.id === calcId);
}

function getFavorites() {
    return JSON.parse(localStorage.getItem("favorites") || "[]");
}

function isFavorite(calcId) {
    return getFavorites().includes(calcId);
}

function toggleFavorite(calcId) {
    let fav = getFavorites();
    fav = fav.includes(calcId) ? fav.filter(id => id !== calcId): [...fav,
        calcId];
    localStorage.setItem("favorites", JSON.stringify(fav));
    renderCalc("favoriter", calcId); // Uppdatera ikon
}

function getRecent() {
    return JSON.parse(localStorage.getItem("recent") || "[]");
}

function addRecent(calcId) {
    let recent = getRecent().filter(id => id !== calcId);
    recent.unshift(calcId);
    localStorage.setItem("recent", JSON.stringify(recent.slice(0, 10)));
}

function smartReset(calcId) {
    state.container.querySelectorAll("input").forEach(i => i.value = "");
    state.container.querySelector(".result").innerHTML = "";
    localStorage.removeItem(`calc_${calcId}`);
}

function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}


function searchCalculations() {
    // Om sökfältet saknas så, avbryt
    if (!state.searchBox) return;

    const search = state.searchBox.value.toLowerCase();
    clear(state.container);
    clear(state.subNav);

    if (!search) {
        // Om sökfältet är tomt, återgå till det normala menyläget
        state.activeCategory ? showSubMenu(state.activeCategory): showMainMenu();
        return;
    }

    state.subNav.classList.add("active");

    // Filtrera baserat på både söksträng OCH aktiv kategori
    ALLA_KALKYLER.filter(c => {
        const matchesSearch = c.namn.toLowerCase().includes(search);
        const matchesCategory = state.activeCategory ? c.kategorier.includes(state.activeCategory): true;
        return matchesSearch && matchesCategory;
    }).forEach(calc => {
        state.subNav.appendChild(createButton(calc.namn, "sub-btn", () => {
            renderCalc(state.activeCategory || calc.kategorier[0], calc.id);
        }));
    });
}

// "Info" onclick
window.toggleInfo = function () {
    const info = document.getElementById("calcInfo");
    const icon = document.getElementById("infoIcon");
    if (!info || !icon) return;

    if (info.style.display === "block") {
        info.style.display = "none";
        icon.textContent = "▼";
    } else {
        info.style.display = "block";
        icon.textContent = "▲";
    }
};

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    // Spara inställningen så den kommer ihåg valet nästa gång appen öppnas
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("darkMode", "enabled");
    } else {
        localStorage.setItem("darkMode", "disabled");
    }
}

// --- HAPTISK HJÄLPFUNKTION ---
// Kollar om webbläsaren stöder vibration och om användaren valt att ha det på
function triggerHaptic(duration = 20) {
    // 1. Hämta inställningen först
    const hapticSetting = localStorage.getItem("hapticEnabled") || "enabled";

    // 2. Kontrollera inställning OCH om navigator.vibrate finns
    if (hapticSetting === "enabled" && navigator.vibrate) {
        navigator.vibrate([duration]);
    }
}

// --- Funktion för att växla mellan Vibration och inte Vibration ---
function toggleHaptic() {
    const current = localStorage.getItem("hapticEnabled") || "enabled";
    const next = current === "enabled" ? "disabled": "enabled";
    localStorage.setItem("hapticEnabled", next);

    // Ge feedback direkt när man ändrar inställningen
    triggerHaptic([50]);

    // Uppdatera inställningssidan (vi kör showSettings igen för att rita om knappen)
    showSettings();
}

// --- ? ---
function formatResult(value, precision = 2) {
    if (isNaN(value)) return "0";
    return new Intl.NumberFormat('sv-SE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision
    }).format(value);
}

function setActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showSearchModal() {
    clear(state.container);
    state.mainNav.classList.add("hidden");
    state.subNav.classList.add("hidden");

    state.container.innerHTML = `
    <div class="calc-page">
    <h3>Sök</h3>
    <input type="text" id="floatingSearch" placeholder="Sök i alla kalkyler...">
    </div>
    `;

    const searchInput = document.getElementById("floatingSearch");
    searchInput.focus();

    // Koppla söklogiken till det temporära fältet
    searchInput.addEventListener("input", (e) => {
        const val = e.target.value;
        // Här kan du återanvända din befintliga searchCalculations-logik
        // eller skapa en enkel filtrering direkt här.
    });
}