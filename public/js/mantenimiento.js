document.querySelector("#formDisponibilidad")
  ?.addEventListener("submit", e => {
    const dia = document.querySelector("[name='dia']").value;
    if (!dia) {
      e.preventDefault();
      alert("Selecciona un día");
    }
});

/* ==========================
   SOCKET.IO - TIEMPO REAL
========================== */
const socket = io();

socket.on("incidencia_actualizada", () => {
  console.log("🔄 Incidencia actualizada en tiempo real");
  cargarIncidencias(); // refresca la tabla
});

/* ==========================
   CARGAR INCIDENCIAS
========================== */
function cargarIncidencias() {
  const prioridad = document.getElementById("filtroPrioridad").value;
  const estado = document.getElementById("filtroEstado").value;
  const area = document.getElementById("filtroArea").value;

  const params = new URLSearchParams({ prioridad, estado, area });

  fetch(`/mantenimiento/api/incidencias?${params}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#incidencesTable tbody");
      tbody.innerHTML = "";

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center;">No hay incidencias</td>
          </tr>`;
        return;
      }

      data.forEach(i => {
        tbody.innerHTML += `
          <tr data-id="${i.id}">
            <td><input type="radio" name="seleccion"></td>
            <td>${i.id}</td>
            <td>${i.solicitante}</td>
            <td>${i.area}</td>
            <td>${i.problema}</td>
            <td>${i.prioridad}</td>
            <td>${i.estado}</td>
          </tr>`;
      });
    });
}

/* ==========================
   FILTROS EN TIEMPO REAL
========================== */
["filtroPrioridad", "filtroEstado", "filtroArea"].forEach(id => {
  document.getElementById(id).addEventListener("change", cargarIncidencias);
});

/* ==========================
   ELIMINAR INCIDENCIA
========================== */
document.getElementById("btnEliminar").addEventListener("click", async () => {
  const fila = document.querySelector('input[name="seleccion"]:checked')?.closest("tr");

  if (!fila) {
    alert("Selecciona una incidencia");
    return;
  }

  const id = fila.dataset.id;

  if (!confirm("¿Eliminar incidencia?")) return;

  await fetch(`/mantenimiento/${id}`, { method: "DELETE" });
  cargarIncidencias();
});

/* ==========================
   INIT
========================== */
cargarIncidencias();

/* ==========================
   ACTUALIZAR ESTADO
========================== */
function actualizarEstado(id, estado) {
  fetch("/mantenimiento/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_ticket: id,
      nuevo_estado: estado
    })
  }).then(() => {
    cargarResumen();
  });
}

/* ==========================
   RESUMEN DE HOY
========================== */
function cargarResumen() {
  fetch("/mantenimiento/resumen-hoy")
    .then(res => res.json())
    .then(data => {
      document.getElementById("pendientes").textContent = data.pendientes ?? 0;
      document.getElementById("resueltas").textContent = data.resueltas ?? 0;
    });
}

/* ==========================
   PDF
========================== */
document.getElementById("btnPdf")?.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Reporte de Incidencias", 14, 15);
  doc.autoTable({ html: "#incidencesTable", startY: 20 });
  doc.save("incidencias.pdf");
});


function actualizarEstadoDesdePanel() {
  const id = document.getElementById("estadoId").value;
  const estado = document.getElementById("estadoNuevo").value;

  if (!id) {
    alert("Ingresa el ID de la incidencia");
    return;
  }

  fetch("/mantenimiento/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_ticket: id,
      nuevo_estado: estado
    })
  })
  .then(res => res.json())
  .then(() => {
    alert("Estado actualizado");
    cargarIncidencias();
  });
}
