// carrito.js
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

/* helpers carrito */
function getCart(uid){
  const key = cartKey(uid);
  return JSON.parse(localStorage.getItem(key) || "[]");
}
function cartSubtotal(items){
  return items.reduce((s,it)=> s + (it.precio || 0), 0);
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

    const cart = getCart(uid);
    const subtotal = cartSubtotal(cart);
    computeAndRenderTotals(uid, subtotal);
  }

  optPickup?.addEventListener("change", recalcAndSave);
  optShipping?.addEventListener("change", recalcAndSave);

  ["addr-line","addr-zip","addr-city","addr-prov","addr-wa"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", recalcAndSave);
  });
}

/* ---------- helper: quitar del carrito los items vendidos ---------- */
async function removeSoldItemsFromCart(uid){
  const key = cartKey(uid);
  const cart = getCart(uid);
  const keep = [];

  for (const it of cart) {
    try {
      const snap = await getDoc(doc(db, "productos", it.id));
      if (!snap.exists()) continue; // producto borrado => se descarta
      const p = snap.data();
      const sold = (p.status && p.status !== "available")
                || (p.available === false)
                || (typeof p.stock === "number" && p.stock <= 0);
      if (!sold) keep.push(it);
    } catch {
      // si falla la lectura, mejor lo mantenemos
      keep.push(it);
    }
  }

  localStorage.setItem(key, JSON.stringify(keep));
}

/* ---------- guardar pedido en Firestore ---------- */
async function placeOrder(uid){
  const items = getCart(uid);
  if (!items.length) throw new Error("El carrito está vacío.");
  if (items.some(it => !it.id)) {
    throw new Error("Falta id de producto en algún artículo. Asegúrate de guardar el id de Firestore al añadir al carrito.");
  }

  const { method, addr } = getSelectedDelivery(uid);
  if (method === "shipping") {
    if (!addr.line || !addr.zip || !addr.city || !addr.prov) {
      throw new Error("Completa la dirección para el envío (solo Península).");
    }
  }

  // datos usuario
  let nombre = "";
  try {
    const userRef = doc(db, "usuarios", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) nombre = snap.data().nombre || "";
  } catch {}
  const userEmail = auth.currentUser?.email || "";

  // totales
  const subtotal = cartSubtotal(items);
  const shippingCost = method === "shipping" ? SHIPPING_COST : 0;
  const total = subtotal + shippingCost;

  // payload del pedido (sin id aún)
  const baseOrder = {
    user: { uid, nombre: nombre || null, email: userEmail || null },
    delivery: {
      method,
      address: {
        line: addr.line || "", zip: addr.zip || "",
        city: addr.city || "", prov: addr.prov || "", wa: addr.wa || ""
      },
      shippingCost,
    },
    items: items.map(it => ({
      id: it.id, // obligatorio para poder marcar como vendido
      nombre: it.nombre,
      precio: it.precio || 0,
      precioText: it.precioText || fmt(it.precio || 0),
      imagen: it.imagen || ""
    })),
    pricing: { currency: "EUR", subtotal, total },
    status: "pending",
    createdAt: serverTimestamp()
  };

  let createdOrderId = null;

  // ---- TRANSACCIÓN: verificar disponibilidad, marcar vendidos y crear pedido ----
  await runTransaction(db, async (tx) => {
    // 1) lee todos los productos
    const productRefs = items.map(it => doc(db, "productos", it.id));
    const productSnaps = [];
    for (const ref of productRefs) {
      productSnaps.push(await tx.get(ref));
    }

    // 2) valida disponibles
    productSnaps.forEach((snap, idx) => {
      if (!snap.exists()) {
        throw new Error(`Producto no encontrado: ${items[idx].nombre}`);
      }
      const p = snap.data();
      // acepta cualquiera de estos esquemas: status|available|stock
      const isSold = (p.status && p.status !== "available")
                  || (p.available === false)
                  || (typeof p.stock === "number" && p.stock <= 0);
      if (isSold) {
        throw new Error(`"${p.nombre || items[idx].nombre}" ya no está disponible.`);
      }
    });

    // 3) marca como vendido (sólo status)
      productRefs.forEach((ref) => {
      tx.update(ref, { status: "sold" });
    });

    // 4) crea el pedido
    const orderRef = doc(collection(db, "pedidos"));
    tx.set(orderRef, baseOrder);
    createdOrderId = orderRef.id;
  });

  // ---- fuera de la transacción: enviar email, vaciar carrito, UI ----
  try {
    const admin = "tallereskibou@gmail.com";
    const customerEmail = baseOrder.user.email || "";
    const displayName = baseOrder.user.nombre || customerEmail || baseOrder.user.uid;

    const lineaDireccion = baseOrder.delivery.method === "shipping"
      ? `${baseOrder.delivery.address.line}, ${baseOrder.delivery.address.zip} ${baseOrder.delivery.address.city} (${baseOrder.delivery.address.prov})`
      : "Recogida en tienda";

    const itemsLine = baseOrder.items.map(i => `• ${i.nombre} — ${(i.precio || 0).toFixed(2)} €`).join("\n");
    const itemsHtml = baseOrder.items.map(i => `<li>${i.nombre} — ${(i.precio || 0).toFixed(2)} €</li>`).join("");

    await addDoc(collection(db, "mail"), {
      to: admin,
      replyTo: (customerEmail ? `${displayName} <${customerEmail}>` : undefined),
      message: {
        subject: `Nuevo pedido #${createdOrderId} — ${displayName}`,
        text:
`Nuevo pedido #${createdOrderId}

[Cliente]
- Nombre: ${baseOrder.user.nombre || "(sin nombre)"}
- Email: ${customerEmail || "(sin email)"}
- UID: ${baseOrder.user.uid}
- WhatsApp/Tel: ${baseOrder.delivery.address.wa || "(no indicado)"}

[Entrega]
- Método: ${baseOrder.delivery.method === "shipping" ? "Envío a domicilio" : "Recogida en tienda"}
- Dirección: ${lineaDireccion}

[Artículos]
${itemsLine}

[Importes]
- Subtotal: ${(baseOrder.pricing.subtotal).toFixed(2)} €
- Envío: ${(baseOrder.delivery.shippingCost).toFixed(2)} €
- TOTAL: ${(baseOrder.pricing.total).toFixed(2)} €`,
        html:
`<h2>Nuevo pedido <strong>#${createdOrderId}</strong></h2>
<h3>Cliente</h3>
<ul>
  <li><strong>Nombre:</strong> ${baseOrder.user.nombre || "(sin nombre)"}</li>
  <li><strong>Email:</strong> ${customerEmail || "(sin email)"}</li>
  <li><strong>UID:</strong> ${baseOrder.user.uid}</li>
  <li><strong>WhatsApp/Tel:</strong> ${baseOrder.delivery.address.wa || "(no indicado)"}</li>
</ul>
<h3>Entrega</h3>
<ul>
  <li><strong>Método:</strong> ${baseOrder.delivery.method === "shipping" ? "Envío a domicilio" : "Recogida en tienda"}</li>
  <li><strong>Dirección:</strong> ${lineaDireccion}</li>
</ul>
<h3>Artículos</h3>
<ul>${itemsHtml}</ul>
<h3>Importes</h3>
<ul>
  <li><strong>Subtotal:</strong> ${(baseOrder.pricing.subtotal).toFixed(2)} €</li>
  <li><strong>Envío:</strong> ${(baseOrder.delivery.shippingCost).toFixed(2)} €</li>
  <li><strong>TOTAL:</strong> ${(baseOrder.pricing.total).toFixed(2)} €</li>
</ul>`
      }
    });
  } catch (e) {
    console.warn("No se pudo crear el mail:", e);
  }

  // limpiar carrito
  localStorage.setItem(cartKey(uid), JSON.stringify([]));

  return { id: createdOrderId, total };
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

  const cart = getCart(uid);

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
      const data = getCart(uid);
      data.splice(idx, 1);
      localStorage.setItem(cartKey(uid), JSON.stringify(data));
      renderCart(uid);
    });
  });

  // acciones globales (usar .onclick para no duplicar)
  const btnClear = document.getElementById("btn-clear");
  if (btnClear) {
    btnClear.onclick = () => {
      if (confirm("Vaciar carrito?")) {
        localStorage.setItem(cartKey(uid), JSON.stringify([]));
        renderCart(uid);
      }
    };
  }

  const btnCheckout = document.getElementById("btn-checkout");
  if (btnCheckout) {
    btnCheckout.onclick = async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("Inicia sesión para finalizar la compra.");
        return;
      }

      // UI: evitar doble clic
      const prev = { text: btnCheckout.textContent, disabled: btnCheckout.disabled };
      btnCheckout.disabled = true;
      btnCheckout.textContent = "Procesando...";

      try {
        // Persistir la última edición de entrega antes de guardar
        const optShipping = document.getElementById("opt-shipping");
        const method = optShipping?.checked ? "shipping" : "pickup";
        saveSelectedDelivery(user.uid, method, collectAddress());

        const { id, total } = await placeOrder(user.uid);

        alert(`¡Gracias! Hemos recibido tu pedido #${id} por ${fmt(total)}.\nTe contactaremos en 24 horas para confirmar el envío y el pago.`);

        // refrescar UI
        renderCart(user.uid);
        computeAndRenderTotals(user.uid, 0);
        updateCartBadge(user.uid);
      } catch (err) {
        console.error(err);

        // si falló por disponibilidad, limpiamos vendidos del carrito para evitar reintentos inútiles
        const msg = String(err?.message || "");
        if (msg.includes("ya no está disponible") || msg.includes("Producto no encontrado")) {
          await removeSoldItemsFromCart(user.uid);
          renderCart(user.uid);
          computeAndRenderTotals(user.uid, cartSubtotal(getCart(user.uid)));
          updateCartBadge(user.uid);
        }

        alert(err?.message || "No se pudo completar el pedido. Intenta de nuevo.");
      } finally {
        // restaurar botón
        btnCheckout.disabled = prev.disabled;
        btnCheckout.textContent = prev.text;
      }
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
