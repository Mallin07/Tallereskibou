import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // =================== Botón de usuario ===================
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      box?.classList.remove("oculto");
      const docSnap = await getDoc(doc(db, "usuarios", user.uid));
      nombre.textContent = docSnap.exists() ? `👤 ${docSnap.data().nombre}` : `👤 ${user.email}`;
      correo.textContent = `📧 ${user.email}`;

      nombre?.addEventListener("click", () => {
        menu?.classList.toggle("mostrar");
      });

      cerrar?.addEventListener("click", async () => {
        await signOut(auth);
        alert("Has cerrado sesión.");
        window.location.reload();
      });
    } else {
      box?.classList.add("oculto");
    }
  });

  // =================== Selección de taller ===================
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

// ========== Botón de información ==========
// ========== Modal de información global ==========
document.querySelectorAll('.boton-info').forEach(boton => {
  boton.addEventListener('click', () => {
    const modal = document.getElementById('modal-info');
    const contenido = document.getElementById('contenido-modal');
    const taller = boton.dataset.modal;

    const infoTextos = {
      terracota: `
        <strong>Técnica Terracota o Marmolado</strong><br>
        Aprenderás a crear pendientes únicos usando técnicas de texturizado o efecto mármol. Ideal para principiantes.
      `,
      flores: `
        <strong>Técnica Flores</strong><br>
        Crearás pendientes con flores naturales secas encapsuladas. Taller avanzado para quienes quieren explorar el detalle.
      `
    };

    // Si ya está abierto ese mismo modal, lo cerramos
    const abierto = !modal.classList.contains('oculto') && boton.textContent === 'Cerrar';
    if (abierto) {
      modal.classList.add('oculto');
      contenido.innerHTML = '';
      boton.textContent = 'Info';
      return;
    }

    // Cerrar otros botones "Cerrar"
    document.querySelectorAll('.boton-info').forEach(b => b.textContent = 'Info');

    // Mostrar el modal con contenido
    contenido.innerHTML = infoTextos[taller] || 'Sin información disponible.';
    modal.classList.remove('oculto');
    boton.textContent = 'Cerrar';
  });
});



  // =================== Botones de solicitud ===================
  document.querySelectorAll('.boton-solicitud').forEach(boton => {
    boton.addEventListener('click', function () {
      const subtaller = this.closest('.escojer-clase-subtaller-box').dataset.subtaller;
      window.location.href = `tpsolicitud.html?subtaller=${encodeURIComponent(subtaller)}`;
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
