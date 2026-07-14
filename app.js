/**
* APP.JS - Drift Teknik
* Huvudlogik för applikationen.
*/
import {
    ALLA_KALKYLER,
    KATEGORIER
} from './kalkyler.js';

// --- 1. GLOBAL STATE & DOM-REFERENSER ---
const state = {
    container: document.getElementById("calcContainer"),
    mainNav: document.getElementById("mainNav"),
    subNav: document.getElementById("subNav"),
    searchBox: document.getElementById("searchBox")
};

// --- 2. INITIALISERING ---
document.addEventListener("DOMContentLoaded", () => {
    // 2.1 Inställningar vid start
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // 2.2 Sökfunktion (behåller vi som den är då den är unik)
    if (state.searchBox) {
        state.searchBox.addEventListener("input", debounce(searchCalculations, 200));
    }

    // 2.3 Koppla kugghjulet (statiskt element i headern)
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            triggerHaptic(20);
            showSettings();
        });
    }

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


    state.container.addEventListener("input",
        (e) => {
            if (e.target.matches("input, select")) {
                const calcId = state.container.querySelector("[data-calc-id]")?.dataset.calcId;
                if (calcId) runCalc(null, calcId); // 'category' behövs oftast inte för själva uträkningen
            }
        });

    showMainMenu();
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
        resultBox.innerHTML = calc.calc(values).replace(/\n/g, "<br>");
    } catch (err) {
        resultBox.innerText = "Ett fel uppstod.";
    }
}

// --- 4. MENYHANTERING & RENDERING ---
function showMainMenu() {
    clear(state.container);
    clear(state.subNav);
    state.mainNav.classList.remove("hidden");
    state.subNav.classList.remove("hidden");
    if (state.searchBox) {
        state.searchBox.value = "";
        state.searchBox.style.display = "block";
    }

    state.mainNav.innerHTML = "";
    state.mainNav.appendChild(createButton("⭐ Favoriter", "nav-btn", () => showSubMenu("favoriter")));
    state.mainNav.appendChild(createButton("🕒 Senast", "nav-btn", () => showSubMenu("recent")));

    Object.entries(KATEGORIER).forEach(([key, name]) => {
        state.mainNav.appendChild(createButton(name, "nav-btn", () => showSubMenu(key)));
    });
}

function showSubMenu(categoryKey) {
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

    state.container.innerHTML = `
    <div class="calc-page">
    <button id="backBtn" class="back-btn">← Tillbaka</button>
    <h2>${calc.namn}
    <button id="favoriteBtn" class="favorite-btn" data-calc-id="${calcId}">
    ${isFavorite(calcId) ? "⭐": "☆"}
    </button>
    </h2>

${calc.inputs.map(i => i.unit ? `
    <div class="input-group">
        <label>${i.label}</label>
        <div style="display:flex; gap:8px;">
            <input type="number" inputmode="decimal" step="any" data-id="${i.id}">
            <select data-unit="${i.id}">
                ${i.unit.map(u => {
                    // Skapa en snyggare visning men behåll originalvärdet för kalkylen
                    let display = u;
                    if (u === "ls") display = "l/s";
                    if (u === "m3h") display = "m³/h";
                    return `<option value="${u}">${display}</option>`;
                }).join("")}
            </select>
        </div>
    </div>` : `<div class="input-group"><label>${i.label}</label><input type="number" inputmode="decimal" step="any" data-id="${i.id}"></div>`
).join("")}


    <button id="resetBtn" class="reset-btn" data-calc-id="${calcId}">Nollställ</button>
    <div class="result"></div>

    <div class="calc-info-title" onclick="toggleInfo()">
    <span>Tips och riktvärden</span>
    <span id="infoIcon">▼</span>
    </div>
    <div id="calcInfo" class="calc-info-content">
    ${calc.info || ""}
    </div>
    </div>`;

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
    <button id="backBtn" class="back-btn">← Tillbaka</button>
    <h2>Inställningar</h2>
    <div class="settings-section">
    <button id="darkModeToggle" class="nav-btn">🌙 Växla mörkt läge</button>
    <button id="hapticToggle" class="nav-btn">📳 Haptik: ${hapticStatus === "enabled" ? "PÅ": "AV"}</button>
    <button id="clearDataBtn" class="nav-btn">Rensa all sparad data</button>
    </div>
    </div>`;
}


// --- 5. HJÄLPFUNKTIONER ---
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
    const search = state.searchBox.value.toLowerCase();
    clear(state.container);
    clear(state.subNav);
    if (!search) return showMainMenu();
    state.subNav.classList.add("active");
    ALLA_KALKYLER.filter(c => c.namn.toLowerCase().includes(search)).forEach(calc => {
        state.subNav.appendChild(createButton(calc.namn, "sub-btn", () => renderCalc(calc.kategorier[0], calc.id)));
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

// --- Funktin för att växla mellan Vibration och inte Vibration ---
function toggleHaptic() {
    const current = localStorage.getItem("hapticEnabled") || "enabled";
    const next = current === "enabled" ? "disabled": "enabled";
    localStorage.setItem("hapticEnabled", next);

    // Ge feedback direkt när man ändrar inställningen
    triggerHaptic([50]);

    // Uppdatera inställningssidan (vi kör showSettings igen för att rita om knappen)
    showSettings();
}


