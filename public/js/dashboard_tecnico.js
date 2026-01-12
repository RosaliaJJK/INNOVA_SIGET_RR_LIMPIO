const socket = io();

function cargarResumen() {
  fetch("/personal/resumen-hoy")
    .then(res => res.json())
    .then(data => {
      document.getElementById("pendientes").innerText = data.pendientes;
      document.getElementById("resueltas").innerText = data.resueltas;
    });
}

function actualizarEstado(id, estado) {
  fetch(`/personal/incidencia/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado })
  });
}

// 🔄 Actualización automática
socket.on("estado_actualizado", cargarResumen);

// inicial
cargarResumen();

