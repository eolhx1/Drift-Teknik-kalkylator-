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
    if (state.searchBox) {
        state.searchBox.addEventListener("input", debounce(searchCalculations, 200));
    }
    showMainMenu();
});

// Hantera webbläsarens bakåt-knapp
window.addEventListener("popstate", (e) => {
    if (!e.state || e.state.page === "home") showMainMenu();
    else if (e.state.category && e.state.calcId) renderCalc(e.state.category, e.state.calcId);
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

    // Här renderas kalkyl-sidan
    state.container.innerHTML = `
    <div class="calc-page">
        <button id="backBtn" class="back-btn">← Tillbaka</button>
        <h2>${calc.namn} <button id="favoriteBtn" class="favorite-btn">${isFavorite(calcId) ? "⭐": "☆"}</button></h2>
        
        <div class="info-box" style="display: none; font-size: 0.9em; color: #666; margin-bottom: 15px; padding: 10px; border: 1px solid #ccc;">
            ${calc.info || ""}
        </div>
            
        ${calc.inputs.map(i => i.unit ? `
            <div class="input-group">
                <label>${i.label}</label>
                <div style="display:flex; gap:8px;">
                    <input type="text" data-id="${i.id}">
                    <select data-unit="${i.id}">${i.unit.map(u => `<option value="${u}">${u}</option>`).join("")}</select>
                </div>
            </div>`: `<div class="input-group"><label>${i.label}</label><input type="text" data-id="${i.id}"></div>`).join("")}
        
        <button id="resetBtn" class="reset-btn">Nollställ</button>
        <div class="result"></div>
    </div>`;

    // Skapa och lägg till info-knapp dynamiskt
    const infoBox = state.container.querySelector(".info-box");
    const infoBtn = document.createElement("button");
    infoBtn.textContent = "ℹ️ Info";
    infoBtn.className = "info-toggle";
    infoBtn.style.marginLeft = "10px";
    infoBtn.onclick = () => infoBox.style.display = (infoBox.style.display === "none") ? "block" : "none";
    state.container.querySelector("h2").appendChild(infoBtn);
    
    // Event listeners
    document.getElementById("backBtn").addEventListener("click", showMainMenu);
    document.getElementById("favoriteBtn").addEventListener("click", () => toggleFavorite(calcId));
    document.getElementById("resetBtn").addEventListener("click", () => smartReset(calcId));
    state.container.querySelectorAll("input, select").forEach(el => el.addEventListener("input", () => runCalc(category, calcId)));
}


// --- 5. HJÄLPFUNKTIONER ---
function clear(el) {
    if (el) el.innerHTML = "";
}
function createButton(text, className, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = className;
    btn.onclick = onClick;
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
