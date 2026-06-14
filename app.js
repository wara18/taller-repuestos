const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycby-sq-xkK4TZEYHab0qOns9DZF3csqtPysyOsiz2UlEPhkljxS87X7emDwD7hk5Lq383g/exec";

let todosLosRepuestos = [];
let recientes = [];

// NAV
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + tab).classList.add("active");
    if (tab === "stock") cargarDatos();
  });
});

// TOAST
function toast(msg, tipo = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + tipo;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.display = "none"), 3000);
}

// SYNC
function setSyncState(state) {
  const dot = document.getElementById("sync-dot");
  const label = document.getElementById("sync-label");
  dot.className = "sync-dot" + (state === "loading" ? " loading" : state === "error" ? " error" : "");
  label.textContent = state === "loading" ? "Sincronizando..." : state === "error" ? "Sin conexión" : "Listo";
}

// FECHA
function formatFecha(f) {
  if (!f) return "—";
  const d = new Date(f);
  if (isNaN(d)) return f;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// GUARDAR
async function guardar() {
  const nombre = document.getElementById("nombre").value.trim();
  const marca = document.getElementById("marca").value.trim();
  const cantidad = parseInt(document.getElementById("cantidad").value) || 0;

  if (!nombre || !marca) { toast("Completá nombre y marca", "error"); return; }

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Guardando...`;
  setSyncState("loading");

  try {
    await fetch(SHEETS_URL, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Nombre: nombre, Cantidad: cantidad, Marca: marca }),
    });
    recientes = [{ nombre, marca, cantidad }, ...recientes].slice(0, 5);
    renderRecientes();
    document.getElementById("nombre").value = "";
    document.getElementById("marca").value = "";
    document.getElementById("cantidad").value = "";
    document.getElementById("nombre").focus();
    setSyncState("ok");
    toast("✓ Repuesto guardado");
  } catch (e) {
    setSyncState("error");
    toast("Error al guardar", "error");
  }

  btn.disabled = false;
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar en Sheets`;
}

function renderRecientes() {
  const wrap = document.getElementById("recent-wrap");
  const list = document.getElementById("recent-list");
  if (!recientes.length) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";
  list.innerHTML = recientes.map(r => `
    <div class="recent-item">
      <div>
        <div class="recent-name">${r.nombre}</div>
        <div class="recent-meta">${r.marca}</div>
      </div>
      <span class="badge">${r.cantidad} u.</span>
    </div>`).join("");
}

// CARGAR
async function cargarDatos() {
  document.getElementById("tabla-container").innerHTML = `
    <div class="empty-state">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite;opacity:0.4"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      <p>Cargando stock...</p>
    </div>`;
  setSyncState("loading");
  try {
    const res = await fetch(SHEETS_URL + "?t=" + Date.now());
    const data = await res.json();
    todosLosRepuestos = data;
    filtrar();
    setSyncState("ok");
  } catch (e) {
    setSyncState("error");
    document.getElementById("tabla-container").innerHTML = `
      <div class="empty-state"><p>No se pudo cargar el stock.<br>Revisá tu conexión.</p></div>`;
  }
}

// FILTRAR
function filtrar() {
  const q = (document.getElementById("busqueda")?.value || "").toLowerCase();
  const f = todosLosRepuestos.filter(r =>
    (r.Nombre || "").toLowerCase().includes(q) ||
    (r.Marca || "").toLowerCase().includes(q)
  );
  renderCards(f);
  renderStats(f);
}

function renderStats(datos) {
  const row = document.getElementById("stats-row");
  if (!datos.length) { row.style.display = "none"; return; }
  row.style.display = "grid";
  const marcas = new Set(datos.map(r => (r.Marca || "").trim().toLowerCase()));
  const unidades = datos.reduce((a, r) => a + (parseInt(r.Cantidad) || 0), 0);
  document.getElementById("stat-total").textContent = datos.length;
  document.getElementById("stat-marcas").textContent = marcas.size;
  document.getElementById("stat-unidades").textContent = unidades;
}

function renderCards(datos) {
  if (!datos.length) {
    document.getElementById("tabla-container").innerHTML = `
      <div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <p>No se encontraron repuestos.</p>
      </div>`;
    return;
  }
  document.getElementById("tabla-container").innerHTML = datos.map(r => {
    const cant = parseInt(r.Cantidad) || 0;
    const cls = cant === 0 ? "low" : "ok";
    return `
    <div class="repuesto-card">
      <div class="repuesto-dot ${cls}"></div>
      <div class="repuesto-info">
        <div class="repuesto-nombre">${r.Nombre || "—"}</div>
        <div class="repuesto-marca">${r.Marca || "—"}</div>
      </div>
      <div class="repuesto-right">
        <div class="repuesto-qty ${cls}">${cant}</div>
        <div class="repuesto-fecha">${formatFecha(r.Fecha)}</div>
      </div>
    </div>`;
  }).join("");
}

// ENTER para guardar
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.getElementById("tab-cargar").classList.contains("active")) guardar();
});
