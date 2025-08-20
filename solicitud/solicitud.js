// ------------ Usuario con Firebase ------------ //
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --------- Utils carrito ---------
function getBgUrl(el) {
  if (!el) return "";
  const bg = getComputedStyle(el).backgroundImage;
  const m = bg && bg.match(/url\(["']?(.+?)["']?\)/);
  return m ? m[1] : "";
}
const cartKey = (uid) => `cart:${uid}`;

// Datos de usuario memorizados para la solicitud
let currentUserName = null;
let currentUserEmail = null;

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
        const nombreDB = docSnap.exists() ? (docSnap.data().nombre || null) : null;
        nombre.textContent = nombreDB ? `👤 ${nombreDB}` : `👤 ${user.email}`;
        if (correo) correo.textContent = user.email;

        currentUserName = nombreDB || user.displayName || null;
      } catch {
        currentUserName = user.displayName || null;
      }
      currentUserEmail = user.email || null;

      updateCartBadge(user.uid);
      markButtonsForUser(user);
    } else {
      box?.classList.remove("visible");
      if (botonesAuth) botonesAuth.style.display = "flex";
      updateCartBadge(null);
      markButtonsForUser(null);
      currentUserName = null;
      currentUserEmail = null;
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
  const form              = document.getElementById('formulario-taller');
  const numPersonasInput  = form?.querySelector('#num-personas');
  const tipoTallerSelect  = form?.querySelector('#tipo-taller');
  const menuSelect        = form?.querySelector('select[name="menu"]'); // 👈 ACOTADO
  const bloquearCheckbox  = form?.querySelector('#bloquear-acceso');
  const detalleFactura    = form?.querySelector('#detalle-factura');
  const totalEuros        = form?.querySelector('#total-euros');

  // Precios por tipo de taller (ajusta a tus tarifas)
  const tarifas = {
    'pendientes-iniciacion':  { porPersona: 45, bloqueo: { 4: 40, 5: 20, 6: 0 } },
    'pendientes-intermedio':  { porPersona: 50, bloqueo: { 4: 40, 5: 20, 6: 0 } },
    'pendientes-avanzado':    { porPersona: 55, bloqueo: { 4: 40, 5: 20, 6: 0 } },
  };

  // Formateador €
  const eur = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);

  function calcularTotal() {
    const tipo = tipoTallerSelect?.value;
    const plan = tarifas[tipo];
    if (!plan) {
      if (detalleFactura) detalleFactura.innerHTML = '';
      if (totalEuros) totalEuros.textContent = '0.00';
      return;
    }

    const numPersonas = parseInt(numPersonasInput?.value || '0', 10);
    const bloquear    = !!bloquearCheckbox?.checked;

    // Bebidas (acotado al form)
    const bebidaSeleccionadas = Array.from(
      form?.querySelectorAll('#lista-bebidas input[type="checkbox"]:checked') || []
    );
    const totalBebidas = bebidaSeleccionadas.reduce((s, opt) => {
      const v = parseFloat((opt.value || '').replace(',', '.'));
      return s + (isNaN(v) ? 0 : v);
    }, 0);

    const precioPorPersona = plan.porPersona;
    const totalPersonas    = numPersonas * precioPorPersona;

    // Bloqueo: solo si hay nº válido
    const precioBloqueo = (bloquear && [4,5,6].includes(numPersonas))
      ? (plan.bloqueo[numPersonas] || 0)
      : 0;

    // Menú (lee del select correcto)
    const menuElegido = (menuSelect && menuSelect.value) ? menuSelect.value : 'sin-menu';
    const precioMenu  = (menuElegido === 'sin-menu') ? 0 : 20;
    const totalMenu   = precioMenu * numPersonas;

    const totalFinal = totalPersonas + precioBloqueo + totalBebidas + totalMenu;

    if (detalleFactura && totalEuros) {
      detalleFactura.innerHTML = `
        - ${numPersonas || 0} persona(s) × ${eur(precioPorPersona)} = ${eur(totalPersonas)}<br>
        - Menú: ${menuElegido === 'sin-menu' ? 'No' : `${eur(precioMenu)} × ${numPersonas} = ${eur(totalMenu)}`}<br>
        - Bloqueo de acceso: ${bloquear ? eur(precioBloqueo) : 'No'}<br>
        - Bebidas: ${
          bebidaSeleccionadas.length
            ? bebidaSeleccionadas.map(opt => opt.dataset.nombre).join(', ')
            : 'Ninguna'
        }<br>
      `;
      totalEuros.textContent = totalFinal.toFixed(2);
    }
  }

  // Eventos
  numPersonasInput?.addEventListener('change', calcularTotal);
  tipoTallerSelect?.addEventListener('change', calcularTotal);
  menuSelect?.addEventListener('change', calcularTotal);
  bloquearCheckbox?.addEventListener('change', calcularTotal);
  (form?.querySelectorAll('#lista-bebidas input[type="checkbox"]') || []).forEach(cb => {
    cb.addEventListener('change', calcularTotal);
  });

  // Inicial
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

  // ===== Envío de la solicitud: guarda en Firestore + crea email en `mail` =====
  const formSolicitud = document.getElementById('formulario-taller');
  if (formSolicitud) {
    formSolicitud.addEventListener('submit', async (e) => {
      e.preventDefault();

      const personas   = parseInt(formSolicitud.querySelector('#num-personas')?.value || '0', 10);
      const tipoTaller = formSolicitud.querySelector('#tipo-taller')?.value || '';
      const menuValue  = formSolicitud.querySelector('select[name="menu"]')?.value || 'sin-menu';
      const bloquear   = !!formSolicitud.querySelector('#bloquear-acceso')?.checked;
      const fecha      = formSolicitud.querySelector('#fecha-propuesta')?.value || '';
      const telefono   = formSolicitud.querySelector('#telefono')?.value || '';

      // Bebidas seleccionadas
      const bebidas = Array.from(
        formSolicitud.querySelectorAll('#lista-bebidas input[type="checkbox"]:checked')
      ).map(chk => ({ nombre: chk.dataset.nombre, precio: parseFloat((chk.value||'0').replace(',','.'))||0 }));
      const totalBebidas = bebidas.reduce((s,b)=>s+b.precio,0);

      // Validaciones mínimas
      if (!tipoTaller || !personas) {
        alert("Selecciona el tipo de taller y el número de personas.");
        return;
      }

      const plan = tarifas[tipoTaller];
      const precioPorPersona = plan.porPersona;
      const totalPersonas = precioPorPersona * personas;
      const precioBloqueo = (bloquear && [4,5,6].includes(personas)) ? (plan.bloqueo[personas] || 0) : 0;
      const precioMenuUnidad = (menuValue === 'sin-menu') ? 0 : 20;
      const totalMenu = precioMenuUnidad * personas;
      const total = totalPersonas + precioBloqueo + totalBebidas + totalMenu;

      const payload = {
        createdAt: serverTimestamp(),
        user: {
          uid: auth.currentUser?.uid || null,
          nombre: currentUserName || null,
          email: currentUserEmail || null,
        },
        solicitud: {
          personas, tipoTaller,
          menu: menuValue,
          bloquear,
          fecha,
          telefono: telefono || null,
          bebidas: bebidas.map(b => b.nombre)
        },
        precios: {
          porPersona: precioPorPersona,
          totalPersonas,
          bloqueo: precioBloqueo,
          bebidas: totalBebidas,
          menuUnidad: precioMenuUnidad,
          totalMenu,
          total,
          currency: "EUR"
        }
      };

      try {
        // 1) Guardar solicitud
        const ref = await addDoc(collection(db, "solicitudes"), payload);

        // 2) Crear email en colección `mail` para Kibou
        const displayName = payload.user.nombre || payload.user.email || payload.user.uid || "Cliente";
        const bebidasTxt = bebidas.length ? bebidas.map(b=>b.nombre).join(", ") : "Ninguna";
        const asunto = `Nueva solicitud #${ref.id} — ${tipoTaller} (${personas}p)`;

        const texto =
`Nueva solicitud #${ref.id}

[Usuario]
- Nombre: ${payload.user.nombre || "-"}
- Email: ${payload.user.email || "-"}

[Solicitud]
- Taller: ${tipoTaller}
- Personas: ${personas}
- Menú: ${menuValue}
- Bloqueo acceso: ${bloquear ? "Sí" : "No"}
- Fecha propuesta: ${fecha || "-"}
- Teléfono: ${telefono || "-"}
- Bebidas: ${bebidasTxt}

[Precios]
- Por persona: ${precioPorPersona.toFixed(2)} €
- Total personas: ${totalPersonas.toFixed(2)} €
- Bloqueo: ${precioBloqueo.toFixed(2)} €
- Bebidas: ${totalBebidas.toFixed(2)} €
- Menú (unidad): ${precioMenuUnidad.toFixed(2)} €
- Total menú: ${totalMenu.toFixed(2)} €
--------------------------
TOTAL: ${total.toFixed(2)} €`;

        const html =
`<h2>Nueva solicitud <strong>#${ref.id}</strong></h2>
<h3>Usuario</h3>
<ul>
  <li><b>Nombre:</b> ${payload.user.nombre || "-"}</li>
  <li><b>Email:</b> ${payload.user.email || "-"}</li>
</ul>
<h3>Solicitud</h3>
<ul>
  <li><b>Taller:</b> ${tipoTaller}</li>
  <li><b>Personas:</b> ${personas}</li>
  <li><b>Menú:</b> ${menuValue}</li>
  <li><b>Bloqueo acceso:</b> ${bloquear ? "Sí" : "No"}</li>
  <li><b>Fecha propuesta:</b> ${fecha || "-"}</li>
  <li><b>Teléfono:</b> ${telefono || "-"}</li>
  <li><b>Bebidas:</b> ${bebidasTxt}</li>
</ul>
<h3>Precios</h3>
<ul>
  <li>Por persona: ${precioPorPersona.toFixed(2)} €</li>
  <li>Total personas: ${totalPersonas.toFixed(2)} €</li>
  <li>Bloqueo: ${precioBloqueo.toFixed(2)} €</li>
  <li>Bebidas: ${totalBebidas.toFixed(2)} €</li>
  <li>Menú (unidad): ${precioMenuUnidad.toFixed(2)} €</li>
  <li>Total menú: ${totalMenu.toFixed(2)} €</li>
</ul>
<p style="font-weight:700">TOTAL: ${total.toFixed(2)} €</p>`;

        await addDoc(collection(db, "mail"), {
          to: "tallereskibou@gmail.com",
          replyTo: (currentUserEmail ? `${displayName} <${currentUserEmail}>` : undefined),
          message: { subject: asunto, text: texto, html }
        });

        alert("¡Solicitud enviada! Te contactaremos en breve.");
        formSolicitud.reset();
        calcularTotal();
      } catch (err) {
        console.error(err);
        alert("No se pudo enviar la solicitud. Intenta de nuevo.");
      }
    });
  }
});
