  document.getElementById("btnConsultar").addEventListener("click", async () => {
    const laboratorio = document.getElementById("laboratorio").value;
    const fecha = document.getElementById("fecha").value;
    const tbody = document.getElementById("tablaBitacoras");

  if (!laboratorio || !fecha) {
    // Cierra el modal primero
    document.getElementById("bitacoraModal").style.display = "none";

    Swal.fire({
      icon: "warning",
      title: "Atención",
      text: "Seleccione laboratorio y fecha",
      confirmButtonText: "Aceptar"
    });

    return;
  }


  const res = await fetch(`/docente/bitacoras?laboratorio=${laboratorio}&fecha=${fecha}`);

    if (!res.ok) {
      console.error("No autorizado");
      return;
    }

    const data = await res.json(); // 👈 FALTABA

    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4">Sin datos</td></tr>`;
      return;
    }
4
      data.forEach(r => {
        tbody.innerHTML += `
          <tr>
            <td>${r.alumno}</td>
            <td>${r.hora_entrada}</td>
            <td>${r.hora_salida || "-"}</td>
            <td>${r.observaciones || ""}</td>
          </tr>
        `;
    });
  });



async function cargarLaboratorios() {
  const select = document.getElementById("laboratorio");
  if (!select) return;

  select.innerHTML = `<option value="">Seleccione laboratorio</option>`;

  try {
    const res = await fetch("/mantenimiento/laboratorios");

    if (!res.ok) {
      console.error("No autorizado para cargar laboratorios");
      return;
    }

    const data = await res.json(); // ✅ ESTO FALTABA

    data.forEach(lab => {
      const opt = document.createElement("option");
      opt.value = lab.id;
      opt.textContent = lab.nombre;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error("Error cargando laboratorios:", err);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  cargarLaboratorios();
});
