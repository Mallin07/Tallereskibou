document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const usuarios = JSON.parse(localStorage.getItem("usuariosKibou")) || [];
    const usuario = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!usuario || usuario.password !== password) {
      alert("Correo o contraseña incorrectos.");
      return;
    }

    // Guardar usuario activo
    localStorage.setItem("usuarioActivo", JSON.stringify(usuario));
    alert(`¡Bienvenid@ ${usuario.nombre}!`);

    // Redirigir a la página principal
    window.location.href = "../index.html";
  });
});
