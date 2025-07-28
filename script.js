//------------------ Selección taller--------------------//

document.querySelectorAll('.escojer-clase-taller-box').forEach(box => {
  box.addEventListener('click', () => {
    const selected = box.dataset.taller;

    // Oculta todos los subtalleres
    document.querySelectorAll('.subtalleres').forEach(div => {
      div.classList.remove('active');
    });

    // Desactiva todas las cajas
    document.querySelectorAll('.escojer-clase-taller-box').forEach(b => {
      b.classList.remove('active');
    });

    // Activa solo el seleccionado
    box.classList.add('active');

    const target = document.getElementById(`${selected}-subtalleres`);
    if (target) {
      target.classList.add('active');
    }
  });
});

// ------------Selección subtaller-------------//

// Selección de subtaller
document.querySelectorAll('.escojer-clase-subtaller-box').forEach(box => {
  box.addEventListener('click', () => {
    // Elimina clase 'active' de todos los subtalleres
    document.querySelectorAll('.escojer-clase-subtaller-box').forEach(b => {
      b.classList.remove('active');
    });

    // Activa el clicado
    box.classList.add('active');

    // Si quieres saber cuál fue seleccionado:
    const subtallerSeleccionado = box.dataset.subtaller;
    console.log('Subtaller seleccionado:', subtallerSeleccionado);
  });
});

/* ---------------------------------Aberir cerrar ventanas información----------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.taller-box').forEach(taller => {
    const infoBtn = taller.querySelector('.boton-info');
    const modal = taller.querySelector('.info-modal');

    infoBtn?.addEventListener('click', () => {
      const isVisible = !modal.classList.contains('oculto');

      if (isVisible) {
        modal.classList.add('oculto');
        infoBtn.textContent = 'Ver información';
      } else {
        modal.classList.remove('oculto');
        infoBtn.textContent = 'Cerrar';
      }
    });
  });
});

/* ---------------------------------Boton usuario---------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const usuario = JSON.parse(localStorage.getItem("usuarioActivo"));
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  if (usuario) {
    box.style.display = "inline-block";
    nombre.textContent = `👤 ${usuario.nombre}`;
    correo.textContent = usuario.email;

    if (botonesAuth) {
      botonesAuth.style.display = "none";
    }

    nombre.addEventListener("click", () => {
      menu.classList.toggle("mostrar");
    });

    cerrar.addEventListener("click", () => {
      localStorage.removeItem("usuarioActivo");
      alert("Has cerrado sesión.");
      window.location.reload();
    });
  }

  /* ---------------------------------- Inscripciones taller ------------------------------------- */
  document.querySelectorAll('.taller-box').forEach(taller => {
    const tallerId = taller.dataset.tallerId;
    const contadorSpan = taller.querySelector('.contador');
    const inscribirBtn = taller.querySelector('.boton-inscribirse');

    if (!contadorSpan || !inscribirBtn || !tallerId) return;

    const plazasIniciales = parseInt(contadorSpan.textContent);
  let plazas = plazasIniciales;

  // Cargar plazas reales desde localStorage si existen
  const plazasGuardadas = localStorage.getItem(`plazas_${tallerId}`);
  if (plazasGuardadas !== null) {
  plazas = parseInt(plazasGuardadas);
  } else {
  localStorage.setItem(`plazas_${tallerId}`, plazasIniciales);
  }

  contadorSpan.textContent = plazas;


    // Ya inscrito
    if (usuario && estaInscrito(usuario.email, tallerId)) {
      inscribirBtn.textContent = "Cancelar inscripción";
      inscribirBtn.classList.add("inscrito");
    }

    // Taller lleno
    if (plazas <= 0 && !estaInscrito(usuario?.email, tallerId)) {
      inscribirBtn.disabled = true;
    }

    inscribirBtn.addEventListener("click", () => {
      if (!usuario) {
        alert("Debes iniciar sesión para inscribirte.");
        return;
      }

      if (estaInscrito(usuario.email, tallerId)) {
        if (confirm("¿Quieres cancelar tu inscripción?")) {
          cancelarInscripcion(usuario.email, tallerId);
          plazas++;
          contadorSpan.textContent = plazas;
          localStorage.setItem(`plazas_${tallerId}`, plazas);
          inscribirBtn.textContent = "Inscribirse";
          inscribirBtn.classList.remove("inscrito");
          inscribirBtn.disabled = false;
        }
        return;
      }

      if (plazas <= 0) {
        alert("No quedan plazas disponibles.");
        return;
      }

      guardarInscripcion(usuario.email, tallerId);
      plazas--;
      contadorSpan.textContent = plazas;
      localStorage.setItem(`plazas_${tallerId}`, plazas);

      inscribirBtn.textContent = "Cancelar inscripción";
      inscribirBtn.classList.add("inscrito");
      alert("Inscripción realizada con éxito.");
    });
  });

  function estaInscrito(email, tallerId) {
    const inscripciones = JSON.parse(localStorage.getItem("inscripcionesKibou")) || [];
    return inscripciones.some(i => i.email === email && i.tallerId === tallerId);
  }

  function guardarInscripcion(email, tallerId) {
    const inscripciones = JSON.parse(localStorage.getItem("inscripcionesKibou")) || [];
    inscripciones.push({ email, tallerId });
    localStorage.setItem("inscripcionesKibou", JSON.stringify(inscripciones));
  }

  function cancelarInscripcion(email, tallerId) {
    let inscripciones = JSON.parse(localStorage.getItem("inscripcionesKibou")) || [];
    inscripciones = inscripciones.filter(i => !(i.email === email && i.tallerId === tallerId));
    localStorage.setItem("inscripcionesKibou", JSON.stringify(inscripciones));
  }
});
