/**
* APP.JS - Drift Teknik
* Huvudlogik för applikationen.
*/
import {
    ALLA_KALKYLER,
    KATEGORIER,
    UNIT_MAP
} from './kalkyler.js';

// ==========================================================================
// 1. GLOBAL STATE & DOM-REFERENSER
// ==========================================================================
const state = {
    container: document.getElementById("calcContainer"),
    mainNav: document.getElementById("mainNav"),
    subNav: document.getElementById("subNav"),
    activeCategory: null,
};

// ==========================================================================
// 2. INITIALISERING & Händelselyssnare vid start
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 2.0 Fördröjningsfunktion (så beräkningen inte körs för ofta vid snabb inmatning)
    const debouncedRunCalc = debounce((calcId) => {
        runCalc(null, calcId);
    }, 250);

    // 2.1 Startinställningar (t.ex. mörkt läge om det sparats tidigare)
    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // 2.2 Koppla kugghjulet i headern (Öppnar inställningar)
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            triggerHaptic(20);
            showSettings();
        });
    }

    // 2.3 Koppling av bottenmeny (Hem, Favoriter, Jobb, Senaste, Sök)
    const navHome = document.getElementById("navHome");
    const navFav = document.getElementById("navFav");
    const navJobs = document.getElementById("navJobs"); // NY
    const navRecent = document.getElementById("navRecent");
    const navSearch = document.getElementById("navSearch");

    if (navHome) navHome.addEventListener("click", () => {
        setActiveNav("navHome");
        showMainMenu();
    });

    if (navFav) navFav.addEventListener("click", () => {
        setActiveNav("navFav");
        state.container.innerHTML = "";
        state.mainNav.classList.add("hidden");
        state.subNav.classList.remove("hidden");
        showSubMenu("favoriter");
    });

    // NY: Koppling för "Jobb"-fliken
    if (navJobs) navJobs.addEventListener("click", () => {
        setActiveNav("navJobs");
        state.container.innerHTML = "";
        state.mainNav.classList.add("hidden");
        state.subNav.classList.remove("hidden");
        showSubMenu("jobb");
    });

    if (navRecent) navRecent.addEventListener("click", () => {
        setActiveNav("navRecent");
        state.container.innerHTML = "";
        state.mainNav.classList.add("hidden");
        state.subNav.classList.remove("hidden");
        showSubMenu("recent");
    });

    if (navSearch) navSearch.addEventListener("click", () => {
        setActiveNav("navSearch");
        showSearchModal();
    });

    // 2.4 Global klicklyssnare för dynamiska knappar (bakåt, stjärna, nollställ, spara jobb osv)
    state.container.addEventListener("click", (event) => {
        const id = event.target.id;
        const calcId = event.target.dataset.calcId;

        if (!id) return;

        triggerHaptic(20);

        if (id === "backBtn") showMainMenu();

        if (id === "clearDataBtn") {
            showConfirmModal("Är du säker på att du vill rensa all sparad data?", () => {
                localStorage.clear();
                location.reload();
            });
        }

        if (id === "favoriteBtn") {
            toggleFavorite(calcId);
            renderCalc("favoriter", calcId);
        }

        if (id === "resetBtn") {
            smartReset(calcId);
        }

        // NY: Klick för att öppna spar-modalen från kalkylen
        if (id === "saveJobBtn") {
            showSaveJobModal(calcId);
        }
    });

    // Välj text automatiskt i inmatningsfält när man klickar på dem
    state.container.addEventListener("focus",
        (e) => {
            if (e.target.tagName === "INPUT" && e.target.type === "number") {
                setTimeout(() => {
                    e.target.select();
                }, 50);
            }
        },
        true);

    // 2.5 Lyssna på förändringar i kalkylfälten för att köra direktberäkning
    state.container.addEventListener("input",
        (e) => {
            if (e.target.matches("input, select")) {
                const calcId = state.container.querySelector("[data-calc-id]")?.dataset.calcId;
                if (calcId) {
                    debouncedRunCalc(calcId);
                }
            }
        });

    // 2.6 Klick på appens huvudrubrik för att gå till start
    const appTitle = document.getElementById("appTitle");
    if (appTitle) {
        appTitle.addEventListener("click", (e) => {
            e.preventDefault();
            triggerHaptic(20);
            showMainMenu();
            setActiveNav("navHome");
        });
    }

    // Starta i hemläge
    showMainMenu();
    setActiveNav("navHome");
});

// Hantera webbläsarens bakåt/framåt-knappar
window.addEventListener("popstate", (event) => {
    if (!event.state || event.state.page === "home") showMainMenu();
    else if (event.state.category && event.state.calcId) renderCalc(event.state.category, event.state.calcId);
});

// ==========================================================================
// 3. BERÄKNINGSMOTOR (Hanterar matematiska uträkningar och sparar tillstånd)
// ==========================================================================
function runCalc(category, calcId) {
    const calc = findCalc(calcId);
    const page = state.container.querySelector(".calc-page");
    if (!page || !calc) return;

    const resultBox = page.querySelector(".result");
    const inputs = page.querySelectorAll("input[data-id]");
    const selects = page.querySelectorAll("select[data-unit]");

    const values = {};
    let allFilled = true;

    // Hämta enheter och indata
    selects.forEach(s => values[s.dataset.unit + "_unit"] = s.value);
    inputs.forEach(i => {
        const val = parseFloat(i.value.replace(",", "."));
        if (isNaN(val)) allFilled = false;
        else values[i.dataset.id] = val;
    });

    // Spara det användaren skrivit i enhetens minne (localStorage)
    localStorage.setItem(`calc_${calcId}`,
        JSON.stringify(values));

    if (!allFilled) {
        document.getElementById("resultText").innerText = "Fyll i alla fält...";
        return;
    }

    try {
        const rawResult = calc.calc(values);

        if (typeof rawResult === 'string') {
            document.getElementById("resultText").innerHTML = rawResult.replace(/\n/g, "<br>");
        } else if (typeof rawResult === 'number') {
            const decimalPrecision = calc.decimaler !== undefined ? calc.decimaler: 2;
            const unit = calc.unit || "";
            const label = calc.label ? `${calc.label}: `: "";

            const formattedNum = formatResult(rawResult, decimalPrecision);
            document.getElementById("resultText").innerHTML = `${label}${formattedNum} ${unit}`;
        }
    } catch (err) {
        resultBox.innerText = "Ett fel uppstod i beräkningen.";
    }
}

// ==========================================================================
// 4. MENYHANTERING & RENDERING (Huvudmeny, undermeny, favoriter och jobb)
// ==========================================================================

// Visar kategorierna på startsidan
function showMainMenu() {
    state.activeCategory = null;
    clear(state.container);
    clear(state.subNav);

    state.mainNav.classList.remove("hidden");
    state.subNav.classList.remove("hidden");
    state.mainNav.innerHTML = "";

    Object.entries(KATEGORIER).forEach(([key, cat]) => {
        const isObject = typeof cat === 'object';
        const displayName = isObject ? `${cat.ikon} ${cat.namn}`: cat;

        const btn = createButton(displayName, "nav-btn", () => showSubMenu(key));
        btn.dataset.category = key;
        state.mainNav.appendChild(btn);
    });
}

// Visar listan över kalkyler i en specifik kategori (eller senast/favoriter/jobb)
function showSubMenu(categoryKey) {
    state.activeCategory = categoryKey;

    state.mainNav.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
    });

    const activeBtn = state.mainNav.querySelector(`[data-category="${categoryKey}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active-nav');
    }

    state.mainNav.classList.add("hidden");
    clear(state.container);
    clear(state.subNav);
    state.subNav.classList.add("active");

    // Om användaren klickar på favoriter
    if (categoryKey === "favoriter") {
        renderFavoritesManagement();
        return;
    }

    // NY: Om användaren klickar på "Jobb"
    if (categoryKey === "jobb") {
        renderSavedJobsList();
        return;
    }

    const list = (categoryKey === "recent") ? getRecent(): null;

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

// NY: Visar listan över sparade fältjobb i undermenyn
function renderSavedJobsList() {
    const jobs = getSavedJobs();
    state.subNav.innerHTML = "";

    if (jobs.length === 0) {
        state.subNav.innerHTML = "<p style='padding:14px; color:var(--text-muted);'>Inga sparade jobb ännu. Utför en beräkning i fält och klicka på 'Spara till jobb' för att spara hit!</p>";
        return;
    }

    const listContainer = document.createElement("div");
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "8px";
    listContainer.style.padding = "4px";

    jobs.forEach((job) => {
        const card = document.createElement("div");
        card.style.background = "var(--card-bg, #fff)";
        card.style.border = "1px solid var(--border-color, #ccc)";
        card.style.borderRadius = "8px";
        card.style.padding = "12px";
        card.style.cursor = "pointer";

        card.innerHTML = `
        <div style="font-weight: bold; font-size: 1rem; color: var(--text-color);">${job.projectName}</div>
        <div style="font-size: 0.85rem; color: var(--primary-color); margin-top: 2px;">${job.calcName}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">📅 ${job.date}</div>
        ${job.notes ? `<div style="font-size: 0.85rem; color: var(--text-color); margin-top: 6px; font-style: italic; background: rgba(0,0,0,0.03); padding: 6px; border-radius: 4px;">"${job.notes}"</div>`: ""}
        <div style="font-size: 0.9rem; font-weight: bold; margin-top: 8px; color: var(--text-color);">Resultat: ${job.resultText}</div>
        `;

        // Klicka på kortet för att se detaljer / öppna upp i kalkylatorn
        card.onclick = () => {
            showJobDetailsModal(job);
        };

        listContainer.appendChild(card);
    });

    state.subNav.appendChild(listContainer);
}

// NY: Detaljmodal för ett sparat jobb (med alternativ att öppna, kopiera eller radera)
function showJobDetailsModal(job) {
    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `
    <div class="confirm-box" style="max-width: 400px; width: 90%;">
    <h3 style="margin-top:0; color:var(--primary-color);">${job.projectName}</h3>
    <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Kalkyl:</strong> ${job.calcName}</p>
    <p style="margin: 4px 0; font-size: 0.85rem; color:var(--text-muted);">Sparad: ${job.date}</p>

    ${job.notes ? `<div style="margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.04); border-radius: 4px; font-size: 0.9rem;"><strong>Anteckning:</strong><br>${job.notes}</div>`: ""}

    <div style="margin: 10px 0; padding: 8px; background: var(--card-bg, #f9f9f9); border: 1px solid var(--border-color, #eee); border-radius: 4px;">
    <strong>Resultat:</strong> <span style="font-size: 1.05rem; font-weight:bold;">${job.resultText}</span>
    </div>

    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
    <button id="loadValuesBtn" class="nav-btn" style="background: var(--primary-color); color: white;">Fyll i värden i kalkyl</button>
    <button id="copyJobBtn" class="nav-btn">Kopiera rapport</button>
    <button id="deleteJobBtn" class="nav-btn" style="color: #d9534f; border-color: #d9534f;">Ta bort jobb</button>
    <button id="closeJobModalBtn" class="nav-btn" style="background: transparent; border: none; color: var(--text-muted);">Stäng</button>
    </div>
    </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#loadValuesBtn").onclick = () => {
        // Återställ sparade värden till localStorage för kalkylen och öppna den
        localStorage.setItem(`calc_${job.calcId}`, JSON.stringify(job.inputs));
        document.body.removeChild(modal);
        renderCalc("jobb", job.calcId);
    };

    modal.querySelector("#copyJobBtn").onclick = () => {
        const reportText = `Projekt: ${job.projectName}\nKalkyl: ${job.calcName}\nDatum: ${job.date}\nAnteckning: ${job.notes || "Ingen"}\nResultat: ${job.resultText}`;
        navigator.clipboard.writeText(reportText).then(() => {
            showToast("Rapporten kopierad till urklipp!");
        });
    };

    modal.querySelector("#deleteJobBtn").onclick = () => {
        showConfirmModal("Vill du radera detta sparade jobb?", () => {
            let jobs = getSavedJobs();
            jobs = jobs.filter(j => j.id !== job.id);
            localStorage.setItem("saved_jobs", JSON.stringify(jobs));
            document.body.removeChild(modal);
            renderSavedJobsList();
        });
    };

    modal.querySelector("#closeJobModalBtn").onclick = () => {
        document.body.removeChild(modal);
    };
}

// NY: Modal för att skriva in projektnamn och fältanteckningar vid sparande
function showSaveJobModal(calcId) {
    const calc = findCalc(calcId);
    const resultTextEl = document.getElementById("resultText");
    const resultText = resultTextEl ? resultTextEl.innerText: "";

    if (!resultText || resultText.includes("Fyll i")) {
        showToast("Fyll i kalkylen först innan du sparar!");
        return;
    }

    const modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.innerHTML = `
    <div class="confirm-box" style="max-width: 400px; width: 90%;">
    <h3 style="margin-top:0;">Spara till fältjobb</h3>
    <p style="font-size: 0.85rem; color: var(--text-muted);">${calc.namn}</p>

    <div class="input-group" style="margin-bottom: 10px; text-align: left;">
    <label style="font-size: 0.9rem; font-weight: bold;">Projektnamn / Fastighet:</label>
    <input type="text" id="modalProjectName" placeholder="t.ex. Brf Solbacken Centralen" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 4px; margin-top: 4px;">
    </div>

    <div class="input-group" style="margin-bottom: 15px; text-align: left;">
    <label style="font-size: 0.9rem; font-weight: bold;">Anteckning i fält:</label>
    <textarea id="modalNotes" placeholder="t.ex. Mätt på tilloppet, ventilen glappar något..." style="width: 100%; height: 80px; padding: 8px; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 4px; margin-top: 4px; font-family: inherit;"></textarea>
    </div>

    <div style="font-size: 0.9rem; margin-bottom: 15px; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 4px;">
        ${resultText}
    </div>

    <div class="confirm-actions" style="display: flex; gap: 8px;">
    <button id="cancelSaveJob" class="nav-btn" style="flex: 1;">Avbryt</button>
    <button id="confirmSaveJob" class="nav-btn" style="flex: 1; background: var(--primary-color); color: white;">Spara</button>
    </div>
    </div>
    `;
    document.body.appendChild(modal);

    const nameInput = modal.querySelector("#modalProjectName");
    nameInput.focus();

    modal.querySelector("#confirmSaveJob").onclick = () => {
        const projectName = nameInput.value.trim() || `Jobb - ${calc.namn}`;
        const notes = modal.querySelector("#modalNotes").value.trim();
        const inputsData = JSON.parse(localStorage.getItem(`calc_${calcId}`) || "{}");

        const newJob = {
            id: 'job_' + Date.now(),
            calcId: calcId,
            calcName: calc.namn,
            projectName: projectName,
            notes: notes,
            resultText: resultText,
            inputs: inputsData,
            date: new Date().toLocaleDateString('sv-SE') + ' ' + new Date().toLocaleTimeString('sv-SE', {
                hour: '2-digit', minute: '2-digit'
            })
        };

        const jobs = getSavedJobs();
        jobs.unshift(newJob); // Lägg till först
        localStorage.setItem("saved_jobs", JSON.stringify(jobs));

        document.body.removeChild(modal);
        showToast("Jobbet sparades framgångsrikt!");
    };

    modal.querySelector("#cancelSaveJob").onclick = () => {
        document.body.removeChild(modal);
    };
}

// Hjälpfunktion för att hämta sparade jobb ur localStorage
function getSavedJobs() {
    return JSON.parse(localStorage.getItem("saved_jobs") || "[]");
}

// Skapar gränssnittet för att hantera, sortera och ta bort favoriter
function renderFavoritesManagement() {
    const favorites = getFavorites();

    state.subNav.innerHTML = "";

    if (favorites.length === 0) {
        state.subNav.innerHTML = "<p style='padding:14px; color:var(--text-muted);'>Inga favoriter sparade än. Klicka på stjärnan i en kalkyl för att spara den här!</p>";
        return;
    }

    const listContainer = document.createElement("div");
    listContainer.className = "favorites-manage-list";
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "8px";
    listContainer.style.padding = "4px";

    favorites.forEach((calcId, index) => {
        const calc = findCalc(calcId);
        if (!calc) return;

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "4px";

        const calcBtn = createButton(calc.namn, "sub-btn", () => {
            renderCalc("favoriter", calc.id);
        });
        calcBtn.style.flexGrow = "1";
        calcBtn.style.margin = "0";

        const btnStyle = "background:var(--card-bg, #fff); border:1px solid var(--border-color, #ccc); border-radius:4px; padding:8px; cursor:pointer; font-size:0.9rem;";

        const upBtn = document.createElement("button");
        upBtn.innerHTML = "⬆️";
        upBtn.title = "Flytta upp";
        upBtn.style = btnStyle;
        upBtn.disabled = index === 0;
        if (index === 0) upBtn.style.opacity = "0.3";
        upBtn.onclick = () => {
            moveFavorite(index, index - 1);
        };

        const downBtn = document.createElement("button");
        downBtn.innerHTML = "⬇️";
        downBtn.title = "Flytta ner";
        downBtn.style = btnStyle;
        downBtn.disabled = index === favorites.length - 1;
        if (index === favorites.length - 1) downBtn.style.opacity = "0.3";
        downBtn.onclick = () => {
            moveFavorite(index, index + 1);
        };

        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "❌";
        removeBtn.title = "Ta bort från favoriter";
        removeBtn.style = btnStyle;
        removeBtn.onclick = () => {
            let favs = getFavorites();
            favs = favs.filter(id => id !== calcId);
            localStorage.setItem("favorites", JSON.stringify(favs));
            renderFavoritesManagement();
        };

        row.appendChild(calcBtn);
        row.appendChild(upBtn);
        row.appendChild(downBtn);
        row.appendChild(removeBtn);

        listContainer.appendChild(row);
    });

    state.subNav.appendChild(listContainer);
}

function moveFavorite(fromIndex, toIndex) {
    let favorites = getFavorites();
    if (toIndex < 0 || toIndex >= favorites.length) return;
    const item = favorites.splice(fromIndex, 1)[0];
    favorites.splice(toIndex, 0, item);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavoritesManagement();
}

// Bygger upp själva kalkylsidan med fält, resultat, info-sektion OCH spara-knapp
function renderCalc(category, calcId) {
    addRecent(calcId);
    clear(state.container);
    state.mainNav.classList.add("hidden");
    state.subNav.classList.add("hidden");

    const calc = findCalc(calcId);
    if (!calc) return;

    const catData = KATEGORIER[category];
    const categoryName = (typeof catData === 'object') ? catData.namn : (catData || "Kalkyl");
    const savedData = JSON.parse(localStorage.getItem(`calc_${calcId}`) || "{}");

    state.container.innerHTML = `
    <div class="calc-page" data-calc-id="${calcId}">
        <div class="calc-header-nav">
            <button id="backBtn" class="back-btn">${categoryName}</button>
        </div>
        <h2>${calc.namn}
            <button id="favoriteBtn" class="favorite-btn" data-calc-id="${calcId}">
                ${isFavorite(calcId) ? "⭐" : "☆"}
            </button>
        </h2>

        ${calc.inputs.map(i => {
            // FIX: Kontrollera att värdet inte är undefined/null så att nollor (0) sparas och visas korrekt
            const savedValue = (savedData[i.id] !== undefined && savedData[i.id] !== null) ? savedData[i.id] : "";
            const savedUnit = savedData[i.id + "_unit"] || (i.unit ? i.unit[0] : "");

            return i.unit ? `
            <div class="input-group">
                <label>${i.label}</label>
                <div style="display:flex; gap:8px;">
                    <input type="number" inputmode="decimal" step="any" data-id="${i.id}" value="${savedValue}">
                    <select data-unit="${i.id}">
                        ${i.unit.map(u => {
                            const display = UNIT_MAP[u] || u;
                            return `<option value="${u}" ${savedUnit === u ? "selected" : ""}>${display}</option>`;
                        }).join("")}
                    </select>
                </div>
            </div>` : `
            <div class="input-group">
                <label>${i.label}</label>
                <input type="number" inputmode="decimal" step="any" data-id="${i.id}" value="${savedValue}">
            </div>`;
        }).join("")}

        <button id="resetBtn" class="reset-btn" data-calc-id="${calcId}">Nollställ</button>

        <div class="result" id="resultDisplay">
            <span id="resultText"></span>
            <button id="copyBtn" class="copy-icon">📋</button>
        </div>

        <!-- Spara till fältjobb-knapp -->
        <button id="saveJobBtn" class="nav-btn" style="background: var(--primary-color); color: white; width: 100%; margin-top: 10px; margin-bottom: 5px;">💾 Spara till jobb</button>

        <div class="calc-info-title" onclick="toggleInfo()">
            <span>ℹ️ Info om beräkningen</span>
            <span id="infoIcon">▼</span>
        </div>

        <div id="calcInfo" class="calc-info-content">
            ${typeof calc.info === 'string' ? `<p>${calc.info}</p>` : `
                ${calc.info?.beskrivning ? `<p>${calc.info.beskrivning}</p>` : ""}
                ${calc.info?.formel ? `<p><strong>Formel:</strong> ${calc.info.formel.namn} (${calc.info.formel.beskrivning})</p>` : ""}
                ${calc.info?.riktvarden ? `<p><strong>Riktvärden:</strong> ${calc.info.riktvarden}</p>` : ""}
                ${calc.info?.tips ? `<p><strong>Tips:</strong> ${calc.info.tips}</p>` : ""}
            `}
        </div>
    </div>`;

    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => { copyResult(false); });
        copyBtn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            copyResult(true);
        });
    }

    const saveJobBtn = document.getElementById("saveJobBtn");
    if (saveJobBtn) {
        saveJobBtn.addEventListener("click", () => {
            triggerHaptic(20);
            showSaveJobModal(calcId);
        });
    }

    runCalc(null, calcId);
}


// ==========================================================================
// 5. INSTÄLLNINGAR & APPLÅDA (Kugghjulet)
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
    <input type="checkbox" id="darkModeToggle" ${localStorage.getItem("darkMode") === "enabled" ? "checked": ""}>
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
// 6. HJÄLPFUNKTIONER (LocalStorage, sökning, formatering & effekter)
// ==========================================================================
function clear(el) {
    if (el) el.innerHTML = "";
}

function createButton(text, className, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = className;
    btn.onclick = () => {
        triggerHaptic(20);
        onClick();
    };
    return btn;
}

function findCalc(calcId) {
    return ALLA_KALKYLER.find(c => c.id === calcId);
}

function getFavorites() {
    const rawFavs = JSON.parse(localStorage.getItem("favorites") || "[]");
    return [...new Set(rawFavs)];
}

function isFavorite(calcId) {
    return getFavorites().includes(calcId);
}

function toggleFavorite(calcId) {
    let fav = getFavorites();
    if (fav.includes(calcId)) {
        fav = fav.filter(id => id !== calcId);
    } else {
        fav.push(calcId);
    }
    localStorage.setItem("favorites", JSON.stringify(fav));
    renderFavoritesManagement();
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
    localStorage.setItem("darkMode", isDark ? "enabled": "disabled");
    const toggle = document.getElementById("darkModeToggle");
    if (toggle) toggle.checked = isDark;
}

function triggerHaptic(duration = 20) {
    const hapticSetting = localStorage.getItem("hapticEnabled") || "enabled";
    if (hapticSetting === "enabled" && navigator.vibrate) {
        navigator.vibrate([duration]);
    }
}

function toggleHaptic() {
    const current = localStorage.getItem("hapticEnabled") || "enabled";
    const next = current === "enabled" ? "disabled": "enabled";
    localStorage.setItem("hapticEnabled", next);
    const toggle = document.getElementById("hapticToggle");
    if (toggle) toggle.checked = (next === "enabled");
    triggerHaptic(50);
}

function formatResult(value, precision = 2) {
    if (isNaN(value)) return "0";
    return new Intl.NumberFormat('sv-SE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision
    }).format(value);
}

function setActiveNav(id) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
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

    const searchInput = document.getElementById("floatingSearch");
    const clearBtn = document.getElementById("clearSearch");
    const resultsContainer = document.getElementById("searchResults");

    document.getElementById("backFromSearch").addEventListener("click", () => {
        showMainMenu();
        setActiveNav("navHome");
    });

    searchInput.focus();

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        clearBtn.style.display = query ? "block": "none";

        resultsContainer.innerHTML = "";
        if (!query) return;

        const searchWords = query.split(/\s+/);

        const matches = ALLA_KALKYLER.filter(calc => {
            let searchableText = calc.namn.toLowerCase();

            if (calc.info) {
                if (typeof calc.info === 'string') {
                    searchableText += " " + calc.info.toLowerCase();
                } else {
                    if (calc.info.beskrivning) searchableText += " " + calc.info.beskrivning.toLowerCase();
                    if (calc.info.formel) searchableText += " " + (calc.info.formel.namn + " " + calc.info.formel.beskrivning).toLowerCase();
                    if (calc.info.riktvarden) searchableText += " " + calc.info.riktvarden.toLowerCase();
                    if (calc.info.tips) searchableText += " " + calc.info.tips.toLowerCase();
                }
            }

            return searchWords.every(word => searchableText.includes(word));
        });

        matches.forEach(calc => {
            const btn = createButton(calc.namn, "sub-btn", () => {
                renderCalc(calc.kategorier[0], calc.id);
            });
            resultsContainer.appendChild(btn);
        });
    });

    searchInput.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') searchInput.blur();
    });

    clearBtn.addEventListener("click",
        () => {
            searchInput.value = "";
            searchInput.focus();
            clearBtn.style.display = "none";
            resultsContainer.innerHTML = "";
        });
}

function setupSettingsListeners() {
    const darkToggle = document.getElementById("darkModeToggle");
    const hapticToggle = document.getElementById("hapticToggle");

    if (darkToggle) {
        darkToggle.addEventListener("change", () => {
            toggleDarkMode();
            triggerHaptic(20);
        });
    }

    if (hapticToggle) {
        hapticToggle.addEventListener("change", () => {
            toggleHaptic();
        });
    }
}

// ==========================================================================
// 7. KOPIERINGSFUNKTION & TOAST-MEDDELANDEN
// ==========================================================================
window.copyResult = function(copyFull) {
    const resultTextEl = document.getElementById("resultText");
    const fullText = resultTextEl.innerText;

    if (!resultTextEl || fullText.includes("Fyll i")) return;

    let textToCopy = fullText;

    if (!copyFull) {
        if (textToCopy.includes(":")) {
            textToCopy = textToCopy.split(":")[1].trim();
        }
        const match = textToCopy.match(/[\d,\.]+/);
        if (match) textToCopy = match[0];
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
        document.getElementById("resultDisplay").classList.add("copied");
        showToast(copyFull ? "Kopierade hela raden": `Kopierade tal: ${textToCopy}`);
        setTimeout(() => document.getElementById("resultDisplay").classList.remove("copied"), 1000);
    }).catch(err => {
        console.error("Kunde inte kopiera: ", err);
    });
};

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.opacity = "0";
    }, 2000);
}

// ==========================================================================
// 8. BEKRÄFTELSE-MODAL (Pop-up vid t.ex. rensning av data)
// ==========================================================================
function showConfirmModal(message, onConfirm) {
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

    modal.querySelector("#okBtn").addEventListener("click", () => {
        onConfirm();
        document.body.removeChild(modal);
    });
    modal.querySelector("#cancelBtn").addEventListener("click", () => {
        document.body.removeChild(modal);
    });
}