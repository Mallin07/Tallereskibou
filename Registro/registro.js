const form = document.querySelector("form");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmar = document.getElementById("confirmar-password").value;

  if (password !== confirmar) {
    alert("Las contraseñas no coinciden.");
    return;
  }

  let usuarios = JSON.parse(localStorage.getItem("usuariosKibou")) || [];

  const emailExiste = usuarios.some(u => u.email.toLowerCase() === email.toLowerCase());
  const nombreExiste = usuarios.some(u => u.nombre.toLowerCase() === nombre.toLowerCase());

  if (emailExiste) {
    alert("Este correo ya está registrado.");
    return;
  }

  if (nombreExiste) {
    alert("Este nombre de usuario ya está en uso. Elige otro.");
    return;
  }

  usuarios.push({ nombre, email, password });
  localStorage.setItem("usuariosKibou", JSON.stringify(usuarios));

  alert("Perfil creado con éxito. Ahora puedes iniciar sesión.");
  window.location.href = "../login/login.html";
});
