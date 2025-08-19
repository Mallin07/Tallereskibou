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

   document.querySelectorAll('.escojer-clase-taller-box').forEach(box => {
    box.addEventListener('click', () => {
      const selected = box.dataset.taller;

      document.querySelectorAll('.subtalleres').forEach(div => div.classList.remove('active'));
      document.querySelectorAll('.escojer-clase-taller-box').forEach(b => b.classList.remove('active'));

      box.classList.add('active');

      const target = document.getElementById(`${selected}-subtalleres`);
      if (target) target.classList.add('active');
    });
  });

// ================== Selección de subtaller ==================
document.querySelectorAll('.escojer-clase-subtaller-box').forEach(box => {
  box.addEventListener('click', () => {
    // Desmarcar todos y marcar el seleccionado
    document.querySelectorAll('.escojer-clase-subtaller-box').forEach(b => b.classList.remove('active'));
    box.classList.add('active');

    // Obtener el subtaller
    const subtaller = box.dataset.subtaller;

    // Guardar el subtaller en los botones de solicitud
    document.querySelectorAll('.boton-solicitud').forEach(btn => {
      btn.dataset.subtaller = subtaller;
    });

    // Mostrar sección de comida
    const comida = document.getElementById("Pica-pica");
    if (comida) {
      comida.classList.add("active");
      comida.scrollIntoView({ behavior: "smooth" });
    }
  });
});


// ------------ Botón de información ------------ //
document.querySelectorAll('.caja-comida').forEach(caja => {
  const infoBtn = caja.querySelector('.boton-info');
  const modal = caja.querySelector('.info-modal');

  if (infoBtn && modal) {
    infoBtn.addEventListener('click', () => {
      modal.classList.toggle('oculto');
      infoBtn.textContent = modal.classList.contains('oculto') ? 'Info' : 'Cerrar';
    });
  }
});

// ================== Botón de solicitud ==================
document.querySelectorAll('.boton-solicitud').forEach(boton => {
  boton.addEventListener('click', function () {
    const comida = this.closest('.caja-comida')?.dataset.taller;
    const subtaller = this.dataset.subtaller;

    if (subtaller && comida) {
      window.location.href = `gtpsolicitud.html?subtaller=${encodeURIComponent(subtaller)}&tipo=gastrotaller&comida=${encodeURIComponent(comida)}`;
    } else {
      alert("Debes seleccionar una técnica y una comida antes de continuar.");
    }
  });
});

  // =================== Mostrar título dinámico ===================
  const params = new URLSearchParams(window.location.search);
  const subtaller = params.get('subtaller');
  const titulo = document.getElementById('titulo-subtaller');

  if (subtaller && titulo) {
    const nombreMostrar = {
      'terracota': 'Taller de pendientes terracota o marmolado',
      'flores': 'Taller de pendientes de flores'
    }[subtaller] || subtaller;

    titulo.textContent = nombreMostrar;
  }

  // =================== Suma de precios ===================
  const numPersonasInput = document.getElementById('num-personas');
  const bloquearCheckbox = document.getElementById('bloquear-acceso');
  const detalleFactura = document.getElementById('detalle-factura');
  const totalEuros = document.getElementById('total-euros');

  const precios = {
    terracota: { porPersona: 45, bloqueo: { 4: 40, 5: 20, 6: 0 } },
    flores: { porPersona: 55, bloqueo: { 4: 50, 5: 25, 6: 0 } }
  };

  function calcularTotal() {
    if (!subtaller || !(subtaller in precios)) return;

    const numPersonas = parseInt(numPersonasInput?.value || 0);
    const bloquear = bloquearCheckbox?.checked;
    const bebidaSeleccionadas = Array.from(document.querySelectorAll('#lista-bebidas input[type="checkbox"]:checked'));

    const precioPorPersona = precios[subtaller].porPersona;
    const precioBloqueo = bloquear ? precios[subtaller].bloqueo[numPersonas] || 0 : 0;

    const totalPersonas = numPersonas * precioPorPersona;
    const totalBebidas = bebidaSeleccionadas.reduce((suma, opt) => suma + parseFloat(opt.value), 0);
    const totalFinal = totalPersonas + precioBloqueo + totalBebidas;

    if (detalleFactura && totalEuros) {
      detalleFactura.innerHTML = `
        - ${numPersonas} personas x ${precioPorPersona}€ = ${totalPersonas}€<br>
        - Bloqueo de acceso: ${bloquear ? precioBloqueo + '€' : 'No'}<br>
        - Bebidas: ${bebidaSeleccionadas.length > 0
          ? bebidaSeleccionadas.map(opt => opt.dataset.nombre).join(', ')
          : 'Ninguna'}<br>
      `;
      totalEuros.textContent = totalFinal.toFixed(2);
    }
  }

  if (numPersonasInput) numPersonasInput.addEventListener('change', calcularTotal);
  if (bloquearCheckbox) bloquearCheckbox.addEventListener('change', calcularTotal);
  document.querySelectorAll('#lista-bebidas input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', calcularTotal);
  });

  calcularTotal();

  // =================== Mostrar/Ocultar bebidas ===================
  const toggleBebidas = document.getElementById('toggle-bebidas');
  const listaBebidas = document.getElementById('lista-bebidas');
  if (toggleBebidas && listaBebidas) {
    toggleBebidas.addEventListener('click', () => {
      listaBebidas.classList.toggle('oculto');
      toggleBebidas.textContent = listaBebidas.classList.contains('oculto')
        ? 'Seleccionar bebidas ▼'
        : 'Ocultar bebidas ▲';
    });
  }
});   
