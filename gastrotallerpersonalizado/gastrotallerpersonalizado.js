/* ---------------------------------Boton usuario---------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const usuario = JSON.parse(localStorage.getItem("usuarioActivo"));
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menu = document.getElementById("menu-usuario");
  const botonesAuth = document.querySelector(".auth-buttons");

  if (usuario && box && nombre && correo && cerrar && menu) {
    box.classList.remove("oculto"); // mostrar la caja
    nombre.textContent = `👤 ${usuario.nombre}`;
    correo.textContent = `📧 ${usuario.email}`;  // ✅ icono incluido

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
});


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