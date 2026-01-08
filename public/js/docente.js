const socket = io();

// ---------- HABILITAR BITÁCORA ----------
const formAbrir = document.getElementById("form-abrir-clase");

if (formAbrir) {
  formAbrir.addEventListener("submit", e => {
    e.preventDefault();

    fetch("/docente/abrir-clase", {
      method: "POST",
      body: new FormData(formAbrir)
    })
    .then(res => res.json())
    .then(data => {
      if (data.message) {
        Swal.fire("Aviso", data.message, "info")
          .then(() => location.reload());
      }
    })
    .catch(() => {
      Swal.fire("Error", "Error de conexión", "error");
    });
  });
}

// ---------- TIEMPO REAL ----------
socket.on("nuevo_registro", data => {
  const tabla = document.getElementById("tabla-registros");
  const estado = document.getElementById("estado-bitacora");

  if (!tabla) return;

  estado.textContent = "Activo";
  estado.classList.add("activo");

  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${data.alumno}</td>
    <td>${data.numero_equipo}</td>
    <td>Registrado</td>
    <td>${data.observaciones || ""}</td>
  `;

  tabla.appendChild(fila);
});

// ---------- CIERRE ----------
socket.on("clase_cerrada", () => {
  Swal.fire("Aviso", "La bitácora se ha cerrado", "warning")
    .then(() => location.reload());
});

const estado = document.getElementById("estadoClase");
const tbody = document.getElementById("studentRealtime");

socket.on("nuevo_registro", data => {
  tbody.innerHTML += `
    <tr>
      <td>${data.alumno}</td>
      <td>${data.numero_equipo}</td>
      <td><span class="dot green"></span> Activo</td>
      <td>${data.observaciones || ""}</td>
    </tr>
  `;
});

socket.on("clase_activada", () => {
  estado.classList.replace("inactivo", "activo");
  estado.querySelector(".texto").textContent = "Activo";
});

socket.on("clase_cerrada", () => {
  estado.classList.replace("activo", "inactivo");
  estado.querySelector(".texto").textContent = "Inactivo";
});

// Info del docente
socket.on("sesion_activa", (data) => {
  document.getElementById("labInfo").textContent = data.laboratorio;
  document.getElementById("docenteInfo").textContent = data.docente;
  document.getElementById("grupoInfo").textContent = data.grupo;
});

// Registrar entrada
document.getElementById("btnRegistrar")?.addEventListener("click", async () => {
  const body = {
    matricula: document.getElementById("matricula").value,
    equipo: document.getElementById("equipo").value,
    observaciones: document.getElementById("observaciones").value,
  };

  const res = await fetch("/registrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
  } else {
    alert("Registro exitoso");
    socket.emit("nuevo_registro", data);
  }
});

document.getElementById("carrera").addEventListener("change", e => {
  fetch(`/docente/laboratorios/${e.target.value}`)
    .then(res => res.json())
    .then(labs => {
      const sel = document.getElementById("laboratorio");
      sel.innerHTML = '<option value="">Seleccione laboratorio</option>';
      labs.forEach(l => {
        sel.innerHTML += `<option value="${l.id}">${l.nombre}</option>`;
      });
    });
});
