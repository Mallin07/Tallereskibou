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


/*.......................contenido de la página.....................................*/

document.querySelectorAll('.carousel').forEach(setupCarousel);

function setupCarousel(root){
  const imgs = Array.from(root.querySelectorAll('img'));
  if (!imgs.length) return;

  // auto-play opcional
  const interval = parseInt(root.dataset.interval, 10) || 0;
  let i = imgs.findIndex(el => el.classList.contains('active'));
  if (i < 0) { i = 0; imgs[0].classList.add('active'); }

  const show = (idx) => {
    imgs[i].classList.remove('active');
    i = (idx + imgs.length) % imgs.length;
    imgs[i].classList.add('active');
  };

  root.querySelector('.prev')?.addEventListener('click', () => show(i - 1));
  root.querySelector('.next')?.addEventListener('click', () => show(i + 1));

  if (interval > 0) setInterval(() => show(i + 1), interval);
}

});
