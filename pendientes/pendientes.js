// ------------ Usuario con Firebase ------------ //
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --------- Utils carrito ---------
function getBgUrl(el) {
  if (!el) return "";
  const bg = getComputedStyle(el).backgroundImage;
  const m = bg && bg.match(/url\(["']?(.+?)["']?\)/);
  return m ? m[1] : "";
}
const cartKey = (uid) => `cart:${uid}`;

function updateCartBadge(uid) {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  if (!uid) { badge.hidden = true; return; }
  const cart = JSON.parse(localStorage.getItem(cartKey(uid)) || "[]");
  const total = cart.length;                // artículos únicos
  badge.textContent = String(total);
  badge.hidden = total === 0;
}

// ID estable por tarjeta (href o nombre|imagen)
function getProductIdFromCard(card){
  const grid = card.querySelector(".grid-tarjeta");
  const fotoEl = grid?.querySelector(".foto-taller");
  const textos = grid?.querySelectorAll(".texto-taller") || [];
  const nombre = (textos[0]?.textContent || "").trim();
  const imagen = getBgUrl(fotoEl);
  const linkHref = card.querySelector(".taller-link")?.getAttribute("href");
  return linkHref || `${nombre}|${imagen}`;
}

// Mutadores de botón
function disableBtn(btn){
  btn.textContent = "Agotado";
  btn.classList.add("agotado");
  btn.setAttribute("aria-disabled","true");
  btn.disabled = true;
}
function enableBtn(btn){
  btn.textContent = "Al carrito";
  btn.classList.remove("agotado");
  btn.removeAttribute("aria-disabled");
  btn.disabled = false;
}

// Marca botones según carrito/usuario
function markButtonsForUser(user){
  const btns = document.querySelectorAll(".tarjeta-taller .btn-carrito");
  if (!btns.length) return;

  if (!user){
    btns.forEach(enableBtn);   // sin sesión: activos (validará en click)
    return;
  }
  const key = cartKey(user.uid);
  const cart = JSON.parse(localStorage.getItem(key) || "[]");

  btns.forEach(btn=>{
    const card = btn.closest(".tarjeta-taller");
    const id = getProductIdFromCard(card);
    if (cart.some(it => it.id === id)) disableBtn(btn);
    else enableBtn(btn);
  });
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
      markButtonsForUser(user);
    } else {
      box?.classList.remove("visible");
      if (botonesAuth) botonesAuth.style.display = "flex";
      updateCartBadge(null);
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

      const card = btn.closest(".tarjeta-taller");
      const grid = card.querySelector(".grid-tarjeta");

      const fotoEl = grid.querySelector(".foto-taller");
      const textos = grid.querySelectorAll(".texto-taller");
      const nombre = (textos[0]?.textContent || "").trim();
      const precioText = (textos[1]?.textContent || "").trim();
      const precio = parseFloat(precioText.replace(/[^\d.,]/g, "").replace(",", "."));
      const imagen = getBgUrl(fotoEl);

      const id = getProductIdFromCard(card);

      const key = cartKey(user.uid);
      const cart = JSON.parse(localStorage.getItem(key) || "[]");

      if (cart.some(it => it.id === id)) {
        disableBtn(btn);                 // por si acaso
        alert("Este artículo ya está en tu carrito.");
        return;
      }

      cart.push({ id, nombre, precio, precioText, imagen });
      localStorage.setItem(key, JSON.stringify(cart));
      updateCartBadge(user.uid);

      disableBtn(btn);                   // bloquear inmediatamente
    });
  });

  // Marca estado inicial de botones según sesión actual
  markButtonsForUser(auth.currentUser || null);

// ------- Lightbox para imágenes -------
function ensureLightbox() {
  let lb = document.getElementById("lightbox");
  if (!lb) {
    lb = document.createElement("div");
    lb.id = "lightbox";
    lb.className = "lightbox";
    lb.innerHTML = `<img alt="">`;      // 👈 sin botón “×”
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

/* Cierra con cualquier clic (fondo o imagen) */
lightbox.addEventListener("click", closeLightbox);
/* También con Escape */
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

/* Abre al clicar la miniatura */
document.querySelectorAll(".foto-taller").forEach((img) => {
  img.addEventListener("click", () => {
    const full = img.dataset.full || img.currentSrc || img.src;
    openLightbox(full, img.alt || "");
  });
});


});
