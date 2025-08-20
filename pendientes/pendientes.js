// ------------ Usuario con Firebase ------------ //
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --------- Utils carrito ---------
const cartKey = (uid) => `cart:${uid}`;
const fmtEUR = (n) => Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

function updateCartBadge(uid) {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  if (!uid) { badge.hidden = true; return; }
  const cart = JSON.parse(localStorage.getItem(cartKey(uid)) || "[]");
  const total = cart.length; // artículos únicos
  badge.textContent = String(total);
  badge.hidden = total === 0;
}

// Lee id (Firestore), nombre y precio desde data-*
function getProductMetaFromCard(card) {
  const grid = card.querySelector(".grid-tarjeta");
  const imgEl = grid?.querySelector(".foto-taller");
  const fallBackName = (grid?.querySelectorAll(".texto-taller")[0]?.textContent || "").trim();
  const fallBackPriceText = (grid?.querySelectorAll(".texto-taller")[1]?.textContent || "").trim();
  const fallBackPrice = parseFloat(fallBackPriceText.replace(/[^\d.,]/g, "").replace(",", "."));

  const id = card.dataset.id?.trim();
  const nombre = (card.dataset.name || fallBackName || "").trim();
  const precio = card.dataset.price ? parseFloat(card.dataset.price) : fallBackPrice;
  const imagen = imgEl?.getAttribute("src") || "";

  return { id, nombre, precio, precioText: fmtEUR(precio), imagen };
}

// Mutadores de botón
function disableBtn(btn) {
  btn.textContent = "Agotado";
  btn.classList.add("agotado");
  btn.setAttribute("aria-disabled","true");
  btn.disabled = true;
}
function enableBtn(btn) {
  btn.textContent = "Al carrito";
  btn.classList.remove("agotado");
  btn.removeAttribute("aria-disabled");
  btn.disabled = false;
}

// Marca botones según carrito/usuario (sin pisar los que ya están agotados por Firestore)
function markButtonsForUser(user){
  const btns = document.querySelectorAll(".tarjeta-taller .btn-carrito");
  if (!btns.length) return;

  if (!user){
    btns.forEach(btn => { if (!btn.classList.contains("agotado")) enableBtn(btn); });
    return;
  }
  const key = cartKey(user.uid);
  const cart = JSON.parse(localStorage.getItem(key) || "[]");

  btns.forEach(btn => {
    if (btn.classList.contains("agotado")) return; // ya marcado por Firestore
    const card = btn.closest(".tarjeta-taller");
    const { id } = getProductMetaFromCard(card);
    if (cart.some(it => it.id === id)) disableBtn(btn);
    else enableBtn(btn);
  });
}

// Chequea Firestore y deshabilita botones vendidos
async function refreshAvailabilityFromFirestore() {
  const cards = document.querySelectorAll(".tarjeta-taller");
  for (const card of cards) {
    const id = card.dataset.id;
    const btn = card.querySelector(".btn-carrito");
    if (!id || !btn) continue;

    try {
      const snap = await getDoc(doc(db, "productos", id));
      if (snap.exists()) {
        const p = snap.data();
        const sold = (p.status && p.status !== "available")
                  || (p.available === false)
                  || (typeof p.stock === "number" && p.stock <= 0);
        if (sold) disableBtn(btn);
      }
    } catch (e) {
      console.warn("No se pudo leer producto", id, e);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // --------- UI header / usuario ----------
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
      await refreshAvailabilityFromFirestore(); // primero Firestore
      markButtonsForUser(user);                 // luego estado por carrito
    } else {
      box?.classList.remove("visible");
      if (botonesAuth) botonesAuth.style.display = "flex";
      updateCartBadge(null);
      await refreshAvailabilityFromFirestore();
      markButtonsForUser(null);
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

  // --------- Menú hamburguesa ----------
  const btnHamburger = document.querySelector(".hamburger");
  const menuHeader = document.getElementById("menu");

  btnHamburger?.addEventListener("click", () => {
    menuHeader?.classList.toggle("abierto");
    const expanded = btnHamburger.getAttribute("aria-expanded") === "true";
    btnHamburger.setAttribute("aria-expanded", String(!expanded));
  });

  menuHeader?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      if (window.innerWidth < 768) {
        menuHeader.classList.remove("abierto");
        btnHamburger?.setAttribute("aria-expanded", "false");
      }
    });
  });

  // --------- Carrusel ----------
  const carruseles = document.querySelectorAll(".carrusel");
  carruseles.forEach((carrusel) => {
    const imagenes = carrusel.querySelectorAll(".carrusel-item");
    let indice = 0;

    const mostrarImagen = (i) => {
      imagenes.forEach((img, idx) => {
        img.classList.toggle("activo", idx === i);
      });
    };

    carrusel.querySelector(".anterior")?.addEventListener("click", () => {
      indice = (indice - 1 + imagenes.length) % imagenes.length;
      mostrarImagen(indice);
    });

    carrusel.querySelector(".siguiente")?.addEventListener("click", () => {
      indice = (indice + 1) % imagenes.length;
      mostrarImagen(indice);
    });

    let startX = 0;
    carrusel.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    });
    carrusel.addEventListener("touchend", (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 30) {
        indice = diff > 0 ? (indice + 1) % imagenes.length : (indice - 1 + imagenes.length) % imagenes.length;
        mostrarImagen(indice);
      }
    });

    mostrarImagen(indice);
  });

  // --------- Carrito: click en "Al carrito" ----------
  document.querySelectorAll(".tarjeta-taller .btn-carrito").forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = auth.currentUser;
      if (!user) {
        alert("Necesitas iniciar sesión para añadir al carrito.");
        return;
      }
      if (btn.classList.contains("agotado") || btn.disabled) return;

      const card = btn.closest(".tarjeta-taller");
      const meta = getProductMetaFromCard(card);

      if (!meta.id) {
        alert("Este producto no tiene id configurado.");
        return;
      }

      const key = cartKey(user.uid);
      const cart = JSON.parse(localStorage.getItem(key) || "[]");

      if (cart.some(it => it.id === meta.id)) {
        disableBtn(btn);
        alert("Este artículo ya está en tu carrito.");
        return;
      }

      cart.push(meta);
      localStorage.setItem(key, JSON.stringify(cart));
      updateCartBadge(user.uid);
      disableBtn(btn); // bloquear inmediatamente
    });
  });

  // Estado inicial: primero Firestore, luego carrito
  (async () => {
    await refreshAvailabilityFromFirestore();
    markButtonsForUser(auth.currentUser || null);
  })();

  // ------- Lightbox para imágenes -------
  function ensureLightbox() {
    let lb = document.getElementById("lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "lightbox";
      lb.className = "lightbox";
      lb.innerHTML = `<img alt="">`;
      document.body.appendChild(lb);
    }
    return lb;
  }
  const lightbox = ensureLightbox();
  const lbImg = lightbox.querySelector("img");

  function openLightbox(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || "";
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("open");
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
  }

  lightbox.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

  document.querySelectorAll(".foto-taller").forEach((img) => {
    img.addEventListener("click", () => {
      const full = img.dataset.full || img.currentSrc || img.src;
      openLightbox(full, img.alt || "");
    });
  });
});
