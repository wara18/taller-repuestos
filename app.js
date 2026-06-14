const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycby-sq-xkK4TZEYHab0qOns9DZF3csqtPysyOsiz2UlEPhkljxS87X7emDwD7hk5Lq383g/exec";

let todosLosRepuestos = [];
let recientes = [];

// ——— NAVEGACIÓN ———
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

// ——— TOAST ———
function toast(msg, tipo = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + tipo;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.display = "none"), 3000);
}

// ——— SYNC DOT ———
function setSyncState(state) {
  const dot = document.getElementById("sync-dot");
  const label = document.getElementById("sync-label");
  dot.className = "sync-dot" + (state === "loading" ? " loading" : state === "error" ? " error" : "");
  label.textContent =
    state === "loading" ? "Sincronizando..." : state === "error" ? "Sin conexión" : "Sincronizado";
}

// ——— GUARDAR ———
async function guardar() {
  const nombre = document.getElementById("nombre").value.trim();
  const marca = document.getElementById("marca").value.trim();
  const cantidad = parseInt(document.getElementById("cantidad").value) || 0;

  if (!nombre || !marca) {
    toast("Completá nombre y marca", "error");
    return;
  }

  const btn = document.getElementById("btn-guardar");
  btn.disabled = true;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    Guardando...`;
  setSyncState("loading");

  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Nombre: nombre, Cantidad: cantidad, Marca: marca }),
    });

    const nuevo = { nombre, marca, cantidad };
    recientes = [nuevo, ...recientes].slice(0, 5);
    renderRecientes();

    document.getElementById("nombre").value = "";
    document.getElementById("marca").value = "";
    document.getElementById("cantidad").value = "";
    document.getElementById("nombre").focus();

    setSyncState("ok");
    toast("Repuesto guardado ✓");
  } catch (e) {
    setSyncState("error");
    toast("Error al guardar. Revisá la conexión.", "error");
  }

  btn.disabled = false;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
    Guardar en Sheets`;
}

function renderRecientes() {
  const wrap = document.getElementById("recent-wrap");
  const list = document.getElementById("recent-list");
  if (recientes.length === 0) { wrap.style.display = "none"; return; }
  wrap.style.display = "block";
  list.innerHTML = recientes.map(r => `
    <div class="recent-item">
      <div>
        <div class="recent-item-name">${r.nombre}</div>
        <div class="recent-item-meta">${r.marca}</div>
      </div>
      <span class="badge">${r.cantidad} u.</span>
    </div>
  `).join("");
}

// ——— CARGAR DATOS ———
async function cargarDatos() {
  document.getElementById("tabla-container").innerHTML = `
    <div class="empty-state">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite; opacity:0.4"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
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
      <div class="empty-state">
        <p>No se pudo cargar el stock. <br>Revisá tu conexión o el script de Sheets.</p>
      </div>`;
  }
}

// ——— FILTRAR Y RENDERIZAR ———
function filtrar() {
  const q = (document.getElementById("busqueda")?.value || "").toLowerCase();
  const filtrados = todosLosRepuestos.filter(
    (r) =>
      (r.Nombre || "").toLowerCase().includes(q) ||
      (r.Marca || "").toLowerCase().includes(q)
  );
  renderTabla(filtrados);
  renderStats(filtrados);
}

function renderStats(datos) {
  const statsRow = document.getElementById("stats-row");
  if (datos.length === 0) { statsRow.style.display = "none"; return; }
  statsRow.style.display = "grid";

  const marcas = new Set(datos.map((r) => (r.Marca || "").toLowerCase()));
  const unidades = datos.reduce((acc, r) => acc + (parseInt(r.Cantidad) || 0), 0);

  document.getElementById("stat-total").textContent = datos.length;
  document.getElementById("stat-marcas").textContent = marcas.size;
  document.getElementById("stat-unidades").textContent = unidades;
}

function renderTabla(datos) {
  if (datos.length === 0) {
    document.getElementById("tabla-container").innerHTML = `
      <div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <p>No se encontraron repuestos.</p>
      </div>`;
    return;
  }

  let rows = datos
    .map((r) => {
      const cant = parseInt(r.Cantidad) || 0;
      const qtyClass = cant === 0 ? "qty-low" : "qty-ok";
      return `<tr data-fila="${r._fila}">
        <td><strong>${r.Nombre || "—"}</strong></td>
        <td><span class="badge">${r.Marca || "—"}</span></td>
        <td class="${qtyClass}">${cant}</td>
        <td style="color:#aaa;font-size:13px">${r.Fecha || "—"}</td>
        <td>
          <button class="btn-borrar" onclick="borrar(${r._fila}, this)" title="Eliminar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </td>
      </tr>`;
    })
    .join("");

  document.getElementById("tabla-container").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Repuesto</th>
            <th>Marca / Vehículo</th>
            <th>Cantidad</th>
            <th>Fecha</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ——— BORRAR — modal sin confirm() para no bloquear el hilo ———
const SVG_TRASH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
const SVG_SPIN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;

let _borrarFila = null;
let _borrarBtn = null;

function borrar(fila, btnEl) {
  _borrarFila = fila;
  _borrarBtn = btnEl;
  const rep = todosLosRepuestos.find(r => r._fila === fila);
  document.getElementById("modal-nombre").textContent = rep ? (rep.Nombre + " — " + rep.Marca) : "";
  document.getElementById("modal-borrar").style.display = "flex";
  document.getElementById("modal-confirmar").onclick = confirmarBorrado;
}

function cerrarModal() {
  document.getElementById("modal-borrar").style.display = "none";
  _borrarFila = null;
  _borrarBtn = null;
}

async function confirmarBorrado() {
  if (!_borrarFila || !_borrarBtn) return;
  const fila = _borrarFila;
  const btnEl = _borrarBtn;
  cerrarModal();

  btnEl.disabled = true;
  btnEl.innerHTML = SVG_SPIN;
  setSyncState("loading");

  try {
    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "borrar", fila: fila }),
    });

    await new Promise(r => setTimeout(r, 800));
    await cargarDatos();
    toast("Repuesto eliminado");
  } catch (e) {
    setSyncState("error");
    toast("Error al eliminar. Revisá la conexión.", "error");
    btnEl.disabled = false;
    btnEl.innerHTML = SVG_TRASH;
  }
}

// Cerrar modal tocando el fondo
document.addEventListener("click", e => {
  if (e.target.id === "modal-borrar") cerrarModal();
});

// ——— ENTER para guardar ———
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.getElementById("tab-cargar").classList.contains("active")) {
    guardar();
  }
});

// ——— CSS spin animation ———
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
