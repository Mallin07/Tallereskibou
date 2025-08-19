// carrito.js
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ---------- util común ---------- */
const SHIPPING_COST = 4.00;
const cartKey = (uid) => `cart:${uid}`;
const deliveryKey = (uid) => `delivery:${uid}`;
const fmt = (n) =>
  (isNaN(n) ? 0 : n).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

function updateCartBadge(uid) {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  if (!uid) { badge.hidden = true; return; }
  const key = cartKey(uid);
  const cart = JSON.parse(localStorage.getItem(key) || "[]");
  const total = cart.length; // artículos únicos
  badge.textContent = String(total);
  badge.hidden = total === 0;
}

/* ---------- entrega (leer/guardar) ---------- */
function getSelectedDelivery(uid){
  const saved = JSON.parse(localStorage.getItem(deliveryKey(uid)) || "{}");
  const method = saved.method || "pickup";
  return { method, addr: saved.addr || {} };
}
function saveSelectedDelivery(uid, method, addr){
  localStorage.setItem(deliveryKey(uid), JSON.stringify({ method, addr }));
}
function collectAddress(){
  return {
    line: document.getElementById("addr-line")?.value.trim() || "",
    zip:  document.getElementById("addr-zip")?.value.trim() || "",
    city: document.getElementById("addr-city")?.value.trim() || "",
    prov: document.getElementById("addr-prov")?.value.trim() || "",
    wa:   document.getElementById("addr-wa")?.value.trim() || ""
  };
}
function applySavedAddress(uid){
  const saved = getSelectedDelivery(uid);
  const a = saved.addr || {};
  const set = (id,val)=>{ const el = document.getElementById(id); if (el) el.value = val || ""; };
  set("addr-line", a.line);
  set("addr-zip",  a.zip);
  set("addr-city", a.city);
  set("addr-prov", a.prov);
  set("addr-wa",   a.wa);
}

/* ---------- resumen envío/total ---------- */
function computeAndRenderTotals(uid, subtotal){
  const sumShipEl = document.getElementById("sum-shipping");
  const sumTotalEl = document.getElementById("sum-total");
  const shippingFields = document.getElementById("shipping-fields");
  const optPickup = document.getElementById("opt-pickup");
  const optShipping = document.getElementById("opt-shipping");

  if (!uid) {
    if (sumShipEl) sumShipEl.textContent = fmt(0);
    if (sumTotalEl) sumTotalEl.textContent = fmt(subtotal || 0);
    if (shippingFields) shippingFields.hidden = true;
    return;
  }

  const { method } = getSelectedDelivery(uid);

  // Sincroniza radios
  if (optPickup && optShipping) {
    optPickup.checked = method === "pickup";
    optShipping.checked = method === "shipping";
  }

  const shipping = method === "shipping" ? SHIPPING_COST : 0;
  if (shippingFields) shippingFields.hidden = !(method === "shipping");

  if (sumShipEl) sumShipEl.textContent = fmt(shipping);
  if (sumTotalEl) sumTotalEl.textContent = fmt((subtotal || 0) + shipping);
}

/* ---------- listeners de entrega ---------- */
function initDeliveryListeners(uid){
  const optPickup = document.getElementById("opt-pickup");
  const optShipping = document.getElementById("opt-shipping");

  function recalcAndSave(){
    const method = optShipping?.checked ? "shipping" : "pickup";
    const addr = collectAddress();
    saveSelectedDelivery(uid, method, addr);

    const key = cartKey(uid);
    const cart = JSON.parse(localStorage.getItem(key) || "[]");
    const subtotal = cart.reduce((s,it)=> s + (it.precio||0), 0);
    computeAndRenderTotals(uid, subtotal);
  }

  optPickup?.addEventListener("change", recalcAndSave);
  optShipping?.addEventListener("change", recalcAndSave);

  ["addr-line","addr-zip","addr-city","addr-prov","addr-wa"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", recalcAndSave);
  });
}

/* ---------- render carrito ---------- */
function renderCart(uid) {
  const listEl = document.getElementById("cart-list");
  const emptyEl = document.getElementById("cart-empty");
  const needLoginEl = document.getElementById("cart-need-login");
  const summaryEl = document.getElementById("cart-summary");
  const deliveryEl = document.getElementById("delivery");
  const sumSubtotalEl = document.getElementById("sum-subtotal");

  if (!uid) {
    if (needLoginEl) needLoginEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    if (listEl) listEl.innerHTML = "";
    if (summaryEl) summaryEl.hidden = true;
    if (deliveryEl) deliveryEl.hidden = true;
    return;
  }

  if (needLoginEl) needLoginEl.hidden = true;

  const key = cartKey(uid);
  const cart = JSON.parse(localStorage.getItem(key) || "[]");

  if (!cart.length) {
    if (emptyEl) emptyEl.hidden = false;
    if (listEl) listEl.innerHTML = "";
    if (summaryEl) summaryEl.hidden = true;
    if (deliveryEl) deliveryEl.hidden = true;
    updateCartBadge(uid);
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (summaryEl) summaryEl.hidden = false;
  if (deliveryEl) deliveryEl.hidden = false;

  let html = "";
  let subtotal = 0;

  cart.forEach((it, idx) => {
    subtotal += (it.precio || 0);
    html += `
      <article class="cart-item" data-idx="${idx}">
        <img class="cart-thumb" src="${it.imagen}" alt="${it.nombre}">
        <div class="cart-info">
          <p class="cart-title">${it.nombre}</p>
          <p class="cart-price">${it.precioText || fmt(it.precio)}</p>
        </div>
        <div class="cart-actions">
          <button class="btn-remove" aria-label="Eliminar">Eliminar</button>
        </div>
      </article>
    `;
  });

  if (listEl) listEl.innerHTML = html;
  if (sumSubtotalEl) sumSubtotalEl.textContent = fmt(subtotal);
  updateCartBadge(uid);

  // eliminar item
  listEl?.querySelectorAll(".cart-item .btn-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".cart-item");
      const idx = Number(row.dataset.idx);
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      data.splice(idx, 1);
      localStorage.setItem(key, JSON.stringify(data));
      renderCart(uid);
    });
  });

  // acciones globales (usar .onclick para no duplicar)
  const btnClear = document.getElementById("btn-clear");
  if (btnClear) {
    btnClear.onclick = () => {
      if (confirm("Vaciar carrito?")) {
        localStorage.setItem(key, JSON.stringify([]));
        renderCart(uid);
      }
    };
  }

  const btnCheckout = document.getElementById("btn-checkout");
  if (btnCheckout) {
    btnCheckout.onclick = () => {
      const { method, addr } = getSelectedDelivery(uid);
      if (method === "shipping") {
        if (!addr.line || !addr.zip || !addr.city || !addr.prov) {
          alert("Completa la dirección para el envío (solo Península).");
          return;
        }
      }
      alert("¡Gracias! Te contactaremos en 24 horas para confirmar el envío y el pago.");
      // Aquí podrías enviar pedido a Firestore/email si quieres.
    };
  }

  // calcular envío + total
  computeAndRenderTotals(uid, subtotal);
}

/* ---------- header: usuario + hamburguesa ---------- */
function initHeader() {
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menuUsuario = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      box?.classList.add("visible");
      if (botonesAuth) botonesAuth.style.display = "none";

      try {
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        nombre.textContent = docSnap.exists()
          ? `👤 ${docSnap.data().nombre}`
          : `👤 ${user.email}`;
        if (correo) correo.textContent = user.email;
      } catch {}

      updateCartBadge(user.uid);
      renderCart(user.uid);
      applySavedAddress(user.uid);
      initDeliveryListeners(user.uid);
    } else {
      box?.classList.remove("visible");
      if (botonesAuth) botonesAuth.style.display = "flex";
      renderCart(null);
    }
  });

  cerrar?.addEventListener("click", async () => {
    await signOut(auth);
    alert("Has cerrado sesión.");
    window.location.reload();
  });

  nombre?.addEventListener("click", () => {
    menuUsuario?.classList.toggle("mostrar");
  });

  const btnHamburger = document.querySelector(".hamburger");
  const menuHeader = document.getElementById("menu");
  btnHamburger?.addEventListener("click", () => {
    menuHeader?.classList.toggle("abierto");
    const expanded = btnHamburger.getAttribute("aria-expanded") === "true";
    btnHamburger.setAttribute("aria-expanded", String(!expanded));
  });
  menuHeader?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menuHeader.classList.remove("abierto");
      btnHamburger?.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- start ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
});
