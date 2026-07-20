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
    activeCategory: null,
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
    const navSearch = document.getElementById("navSearch");

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

        if (id === "clearDataBtn") {
            showConfirmModal("Är du säker på att du vill rensa all sparad data?", () => {
                localStorage.clear();
                location.reload();
            });
        }

        if (id === "favoriteBtn") {
            toggleFavorite(calcId);
            renderCalc("favoriter", calcId); // Uppdatera stjärnan
        }

        if (id === "resetBtn") {
            smartReset(calcId);
        }

    });


    state.container.addEventListener("focus",
        (e) => {
            if (e.target.tagName === "INPUT" && e.target.type === "number") {
                setTimeout(() => {
                    e.target.select();
                }, 50);
            }
        },
        true);

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

    // Ser till att menyn visas
    state.mainNav.classList.remove("hidden");
    state.subNav.classList.remove("hidden");

    // Tömmer mainNav
    state.mainNav.innerHTML = "";

    Object.entries(KATEGORIER).forEach(([key, cat]) => {
        // Säker kontroll: Om det är ett objekt, använd ikon + namn.
        // Annars använd bara strängen (bakåtkompatibilitet).
        const isObject = typeof cat === 'object';
        const displayName = isObject ? `${cat.ikon} ${cat.namn}`: cat;

        const btn = createButton(displayName, "nav-btn", () => showSubMenu(key));
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

    const calc = findCalc(calcId);
    if (!calc) return;

    // Hämta namnet på kategorin för att visa i breadcrumb
    // Kollar om det är ett objekt eller sträng
    const catData = KATEGORIER[category];
    const categoryName = (typeof catData === 'object') ? catData.namn: (catData || "Kalkyl");

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
    <div class="result" id="resultDisplay" onclick="copyResult()"></div>


    <div class="calc-info-title" onclick="toggleInfo()">
    <span>ℹ️ Info om beräkningen</span>
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


// ==========================================================================
//  5. INSTÄLLNINGAR (kugghjulet)
// ==========================================================================
async function showSettings() {
    clear(state.container);
    state.mainNav.classList.add("hidden");
    state.subNav.classList.add("hidden");

    const info = await getAppInfo();

    state.container.innerHTML = `
    <div class="calc-page">
    <button id="backBtn" class="back-btn">Tillbaka</button>
    <h2>Inställningar</h2>

    <div class="settings-section">
    <h3>⚙️ App-kontroller</h3>
    <div class="settings-row">
    <span>🌙 Mörkt läge</span>
    <label class="switch">
<input type="checkbox" id="darkModeToggle" ${localStorage.getItem("darkMode") === "enabled" ? "checked" : ""}>
    <span class="slider"></span>
    </label>
    </div>
    <div class="settings-row">
    <span>📳 Haptik</span>
    <label class="switch">
    <input type="checkbox" id="hapticToggle" ${localStorage.getItem("hapticEnabled") === "enabled" ? "checked": ""}>
    <span class="slider"></span>
    </label>
    </div>
    </div>

    <div class="settings-section">
    <h3>ℹ️ Om appen</h3>
    <p style="font-size: 0.9rem; color: var(--text-muted);">${info.om_appen}</p>
    <p style="font-size: 0.9rem; color: var(--text-muted);">
    <strong>Kontakt:</strong> <a href="mailto:${info.kontakt.email}" style="color: var(--primary-color); text-decoration: none;">${info.kontakt.email}</a>
    </p>
    <p style="font-size: 0.8rem; color: var(--text-muted);">Version: ${info.version}</p>
    </div>

    <div class="settings-section">
    <h3>💾 Data</h3>
    <button id="clearDataBtn" class="nav-btn" style="color: var(--primary-color); width: 100%;">🗑️ Rensa all sparad data</button>
    </div>
    </div>`;

    // HÄR ÄR ÄNDRINGEN: Koppla lyssnarna direkt efter att HTML satts
    setupSettingsListeners();

}

async function getAppInfo() {
    try {
        const response = await fetch('./info.json');
        if (!response.ok) throw new Error("Kunde inte ladda info.json");
        return await response.json();
    } catch (error) {
        console.error("Fel vid laddning av info:", error);
        return {
            om_appen: "Information saknas.",
            kontakt: "",
            version: "N/A"
        };
    }
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
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");

    // Uppdatera switchen visuellt om vi råkar vara på inställningssidan
    const toggle = document.getElementById("darkModeToggle");
    if (toggle) {
        toggle.checked = isDark;
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
    const next = current === "enabled" ? "disabled" : "enabled";
    localStorage.setItem("hapticEnabled", next);

    // Uppdatera switchen visuellt direkt
    const toggle = document.getElementById("hapticToggle");
    if (toggle) {
        toggle.checked = (next === "enabled");
    }

    triggerHaptic(50);
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
    <div class="calc-header-nav">
    <button id="backFromSearch" class="back-btn">Tillbaka</button>
    </div>
    <h2>Sök kalkyler</h2>
    <div class="search-input-wrapper">
    <input type="text" id="floatingSearch" placeholder="Skriv för att söka...">
    <button id="clearSearch" aria-label="Rensa sökfält" style="display:none;">
    <span aria-hidden="true">&times;</span>
    </button>
    </div>
    <div id="searchResults" style="margin-top: 15px;"></div>
    </div>
    `;

    // Kopplingar
    const searchInput = document.getElementById("floatingSearch");
    const clearBtn = document.getElementById("clearSearch");
    const resultsContainer = document.getElementById("searchResults");

    document.getElementById("backFromSearch").addEventListener("click", () => {
        showMainMenu();
        setActiveNav("navHome");
    });

    searchInput.focus();

    // Logik för input och X-knappen
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();

        // Visa/dölj X
        clearBtn.style.display = query ? "block": "none";

        resultsContainer.innerHTML = "";
        if (!query) return;

        const matches = ALLA_KALKYLER.filter(c => c.namn.toLowerCase().includes(query));
        matches.forEach(calc => {
            const btn = createButton(calc.namn, "sub-btn", () => {
                renderCalc(calc.kategorier[0], calc.id);
            });
            resultsContainer.appendChild(btn);
        });
    });

    // Stänger tangentbordet med enter
    searchInput.addEventListener("keypress",
        (e) => {
            if (e.key === 'Enter') {
                searchInput.blur();
            }
        });


    // Rensa-logik
    clearBtn.addEventListener("click",
        () => {
            searchInput.value = "";
            searchInput.focus();
            clearBtn.style.display = "none";
            resultsContainer.innerHTML = "";
        });
}

// ?
function setupSettingsListeners() {
    const darkToggle = document.getElementById("darkModeToggle");
    const hapticToggle = document.getElementById("hapticToggle");

    if (darkToggle) {
        darkToggle.addEventListener("change", (e) => {
            toggleDarkMode();
            // Switchen är redan "checked" eftersom användaren klickade på den,
            // så vi behöver bara trigga haptik
            triggerHaptic(20);
        });
    }

    if (hapticToggle) {
        hapticToggle.addEventListener("change", (e) => {
            toggleHaptic();
            // Även här, switchen ändrar läge av sig själv
        });
    }
}



// ==========================================================================
// 6. KOPIERINGSFUNKTION & TOAST
// ==========================================================================

// Gör funktionen tillgänglig för din HTML (inline onclick)
window.copyResult = function() {
    const resultBox = document.getElementById("resultDisplay");
    // Kontrollera att rutan finns och inte visar felmeddelande
    if (!resultBox || resultBox.innerText.includes("Fyll i") || resultBox.innerText.includes("fel")) return;

    // Rensa texten från "Resultat: " så bara värdet kopieras
    const textToCopy = resultBox.innerText.replace("Resultat: ", "");

    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Kopierat till urklipp!");
    }).catch(err => {
        console.error("Kunde inte kopiera: ", err);
    });
};

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.opacity = "1";

    // Göm toasten efter 2 sekunder
    setTimeout(() => {
        toast.style.opacity = "0";
    }, 2000);
}

// ==========================================================================
// ?. modal-ruta
// ==========================================================================
//
function showConfirmModal(message, onConfirm) {
    // Skapa modal-overlay
    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `
    <div class="confirm-box">
    <p>${message}</p>
    <div class="confirm-actions">
    <button id="cancelBtn" class="nav-btn">Avbryt</button>
    <button id="okBtn" class="nav-btn" style="background: var(--primary-color); color: white;">OK</button>
    </div>
    </div>
    `;
    document.body.appendChild(modal);

    // Lyssna på knappar
    modal.querySelector("#okBtn").addEventListener("click", () => {
        onConfirm();
        document.body.removeChild(modal);
    });
    modal.querySelector("#cancelBtn").addEventListener("click", () => {
        document.body.removeChild(modal);
    });
}