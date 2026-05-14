import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const API_BASE = "http://localhost:5000/api";
const SUBJECTS = ["Maths", "Science", "SST", "Hindi", "English"];
const CLASSES = Array.from({length: 12}, (_, i) => i + 1);

const appDiv = document.getElementById("app");
let state = { board: "", cls: "", subject: "", chapter: "" };
let authToken = localStorage.getItem("authToken");

// Init
window.addEventListener("DOMContentLoaded", () => {
  populateSelects();
  bindEvents();
  router();
});
window.addEventListener("hashchange", router);

// Populate dropdowns
function populateSelects() {
  const classSelect = document.getElementById("classSelect");
  const subjectSelect = document.getElementById("subjectSelect");

  CLASSES.forEach(c => classSelect.innerHTML += `<option value="${c}">Class ${c}</option>`);
  SUBJECTS.forEach(s => subjectSelect.innerHTML += `<option value="${s.toLowerCase()}">${s}</option>`);
}

function bindEvents() {
  document.getElementById("menuToggle").onclick = () => document.getElementById("mainNav").classList.toggle("active");

  document.getElementById("boardSelect").onchange = e => { state.board = e.target.value; updateURL(); };
  document.getElementById("classSelect").onchange = e => { state.cls = e.target.value; updateURL(); };
  document.getElementById("subjectSelect").onchange = e => { state.subject = e.target.value; updateURL(); };

  document.getElementById("searchBtn").onclick = handleSearch;

  // Google Login
  document.getElementById("googleLoginBtn").onclick = async () => {
    const result = await signInWithPopup(auth, provider);
    authToken = await result.user.getIdToken();
    localStorage.setItem("authToken", authToken);
  };

  document.getElementById("logoutBtn").onclick = async () => {
    await signOut(auth);
    localStorage.removeItem("authToken");
    authToken = null;
  };

  onAuthStateChanged(auth, user => {
    document.getElementById("googleLoginBtn").style.display = user? "none" : "flex";
    document.getElementById("userInfo").style.display = user? "flex" : "none";
    if (user) document.getElementById("userName").textContent = user.displayName;
  });
}

function updateURL() {
  if (state.board && state.cls && state.subject) {
    location.hash = `/${state.board.toLowerCase()}/class/${state.cls}/subject/${state.subject}`;
  }
}

function router() {
  const hash = location.hash.replace("#", "") || "/";
  const parts = hash.split("/").filter(Boolean);

  if (hash === "/" || hash === "") return renderHome();

  if (parts[0] === "cbse" || parts[0] === "jac") {
    state.board = parts[0].toUpperCase();
    if (parts[1] === "class" && parts[2]) {
      state.cls = parts[2];
      if (parts[3] === "subject" && parts[4]) {
        state.subject = parts[4];
        return loadChapters();
      }
      return renderSubjects();
    }
    return renderBoard();
  }
}

function renderHome() {
  appDiv.innerHTML = `
    <section class="hero">
      <h1>Smart Study Hub for Classes 1–12</h1>
      <p>NCERT notes, PYQs, important questions for CBSE & JAC</p>
      <div>
        <button class="btn-primary" onclick="location.hash='/cbse'">CBSE</button>
        <button class="btn-primary" onclick="location.hash='/jac'" style="margin-left:12px;background:transparent;border:2px solid #fff;color:#fff;">JAC</button>
      </div>
    </section>

    <section class="container">
      <h2 style="text-align:center;margin-bottom:30px;color:#fff;">Popular Subjects</h2>
      <div class="grid">
        ${SUBJECTS.map(s => `
          <div class="card" onclick="selectSubject('${s.toLowerCase()}')">
            <div style="font-size:2.5rem;">${getIcon(s)}</div>
            <h3>${s}</h3>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSubjects() {
  appDiv.innerHTML = `
    <section class="container">
      <div style="color:#fff;margin-bottom:20px;">
        <a href="#/" style="color:#fff;">Home</a> > ${state.board} > Class ${state.cls}
      </div>
      <h2 style="color:#fff;">Class ${state.cls} ${state.board}</h2>
      <div class="grid" style="margin-top:30px;">
        ${SUBJECTS.map(s => `
          <div class="card" onclick="location.hash='/${state.board.toLowerCase()}/class/${state.cls}/subject/${s.toLowerCase()}'">
            <div style="font-size:2.5rem;">${getIcon(s)}</div>
            <h3>${s}</h3>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function loadChapters() {
  const res = await fetch(`${API_BASE}/chapters?board=${state.board}&cls=${state.cls}&subject=${state.subject}`);
  const data = await res.json();
  const chapters = data.data || ["Chapter 1", "Chapter 2", "Chapter 3"];

  appDiv.innerHTML = `
    <section class="container">
      <h2 style="color:#fff;">${state.subject} - Class ${state.cls} ${state.board}</h2>
      <div style="margin-top:30px;">
        ${chapters.map((ch, i) => `
          <div class="card" style="text-align:left;">
            <h4>📘 ${ch}</h4>
            <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
              <button onclick="loadResources('${i+1}', 'important')">❓ Important Qs</button>
              <button onclick="loadResources('${i+1}', 'pyq')">📄 PYQs</button>
              <button onclick="loadResources('${i+1}', 'notes')">📘 Notes</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function loadResources(chapter, type) {
  state.chapter = chapter;
  const res = await fetch(`${API_BASE}/resources?board=${state.board}&cls=${state.cls}&subject=${state.subject}&chapter=${chapter}&type=${type}`);
  const data = await res.json();
  const resources = data.data || [];

  appDiv.innerHTML = `
    <section class="container">
      <h2 style="color:#fff;">Chapter ${chapter} - ${type}</h2>
      <div style="margin-top:30px;">
        ${resources.length === 0? '<p style="color:#fff;">No resources yet</p>' : resources.map(r => `
          <div class="resource-item">
            <div>
              <div style="font-weight:600;">${r.title}</div>
              <div style="font-size:0.85rem;color:var(--text-light);">${r.type}</div>
            </div>
            ${r.filePath? `<button class="download-btn" onclick="downloadPDF('${r.filePath}')">Download PDF</button>` : ''}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function downloadPDF(filePath) {
  const res = await fetch(`${API_BASE}/download/${filePath}`, {
    headers: authToken? { "Authorization": `Bearer ${authToken}` } : {}
  });
  const data = await res.json();
  if (data.url) window.open(data.url, "_blank");
  else showToast(data.error || "Error");
}

async function handleSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  appDiv.innerHTML = `
    <section class="container">
      <h2 style="color:#fff;">Search Results</h2>
      <p style="color:#fff;margin-bottom:20px;">Query: "${query}"</p>
      <div>
        ${data.data.length === 0? '<p style="color:#fff;">No results found</p>' : data.data.map(r => `
          <div class="resource-item">
            <div>
              <div style="font-weight:600;">${r.title}</div>
              <div style="font-size:0.85rem;color:var(--text-light);">${r.board} Class ${r.class} ${r.subject}</div>
            </div>
            ${r.filePath? `<button class="download-btn" onclick="downloadPDF('${r.filePath}')">Download</button>` : ''}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function getIcon(subject) {
  const icons = { Maths: "➗", Science: "🔬", SST: "🌍", Hindi: "📖", English: "📝" };
  return icons[subject] || "📚";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.cssText = `position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:12px 20px;border-radius:8px;opacity:1;transition:0.3s;z-index:999;`;
  setTimeout(() => toast.style.opacity = "0", 3000);
}

window.downloadPDF = downloadPDF;