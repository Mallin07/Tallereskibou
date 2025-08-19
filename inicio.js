// ------------ Usuario con Firebase ------------ //
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const box = document.getElementById("usuario-activo");
  const nombre = document.getElementById("nombre-usuario");
  const correo = document.getElementById("correo-usuario");
  const cerrar = document.getElementById("cerrar-sesion");
  const menuUsuario = document.getElementById("menu-usuario"); // <- renombrado
  const botonesAuth = document.querySelector(".auth-buttons");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      box?.classList.add("visible");
      if (botonesAuth) botonesAuth.style.display = "none";

      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);
      nombre.textContent = docSnap.exists()
        ? `👤 ${docSnap.data().nombre}`
        : `👤 ${user.email}`;
      if (correo) correo.textContent = user.email;  
    } else {
      box?.classList.remove("visible");
      if (botonesAuth) botonesAuth.style.display = "flex";
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

  /*-----------------------Menú desplegable header---------------------------*/
const btnHamburger = document.querySelector(".hamburger");
const menuHeader = document.getElementById("menu");

btnHamburger?.addEventListener("click", () => {
  menuHeader?.classList.toggle("abierto");        // <- activa la regla CSS .menu.abierto
  const expanded = btnHamburger.getAttribute("aria-expanded") === "true";
  btnHamburger.setAttribute("aria-expanded", String(!expanded));
});

// (opcional) cerrar menú al hacer clic en un enlace en móvil
menuHeader?.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    if (window.innerWidth < 768) {
      menuHeader.classList.remove("abierto");
      btnHamburger?.setAttribute("aria-expanded", "false");
    }
  });
});

// ----------------------------- Slider automático ----------------------------//

document.querySelectorAll(".hero-slider").forEach(setupSlider);


function setupSlider(slider) {
  const slides = slider.querySelectorAll("img");
  let slideIndex = 0;

  function showSlide(i) {
    slides.forEach((img, idx) => img.classList.toggle("active", idx === i));
  }

  if (slides.length > 0) {
    showSlide(0);
    setInterval(() => {
      slideIndex = (slideIndex + 1) % slides.length;
      showSlide(slideIndex);
    }, 4000); // cambia cada 4s (puedes variar por slider si quieres)
  }
}

});