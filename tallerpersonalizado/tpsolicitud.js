import { db, auth } from '../firebase.js';
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('formulario-taller');
  const numPersonasInput = document.getElementById('num-personas');
  const bloquearCheckbox = document.getElementById('bloquear-acceso');
  const totalEuros = document.getElementById('total-euros');

  const params = new URLSearchParams(window.location.search);
  const subtaller = params.get('subtaller') || "No definido";

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const numPersonas = parseInt(numPersonasInput.value);
    const bloquear = bloquearCheckbox.checked;
    const fecha = document.getElementById('fecha-propuesta').value;
    const bebidas = Array.from(document.querySelectorAll('#lista-bebidas input[type="checkbox"]:checked'))
      .map(opt => opt.dataset.nombre);
    const precioTotal = parseFloat(totalEuros.textContent);

    // ✅ Verifica que el usuario esté autenticado
    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para enviar una solicitud.");
      return;
    }

    // ✅ Opcional: obtener el nombre del usuario desde Firestore
    let nombre = "";
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.exists()) {
        nombre = userDoc.data().nombre;
      }
    } catch (err) {
      console.warn("⚠️ No se pudo obtener el nombre del usuario:", err);
    }

    try {
      // ✅ Incluye datos del usuario en la solicitud
      await addDoc(collection(db, "reservas"), {
        taller: subtaller,
        numPersonas,
        bloquear,
        fecha,
        bebidas,
        precioTotal,
        timestamp: new Date(),
        usuario: {
          uid: user.uid,
          email: user.email,
          nombre: nombre || "Sin nombre"
        }
      });

      alert("✅ Solicitud enviada correctamente.");
      form.reset();
      if (typeof calcularTotal === "function") calcularTotal();
    } catch (error) {
      console.error("❌ Error al guardar la reserva:", error.message || error);
      alert("❌ Hubo un error al enviar tu solicitud.");
    }
  });
});
