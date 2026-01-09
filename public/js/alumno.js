const socket = io();
const form = document.getElementById("form-registro");

const selectCarrera = document.getElementById("selectCarrera");
const selectGrupo = document.getElementById("selectGrupo");
const labInfo = document.getElementById("labInfo");
const docenteInfo = document.getElementById("docenteInfo");
const machineNumber = document.getElementById("machineNumber");
const observation = document.getElementById("observation");
const registerButton = document.getElementById("registerButton");
const zonaSelect = document.getElementById("zona");
const machineTitle = document.getElementById("machineTitle");
const registrationContent = document.getElementById("registrationContent");
const statusMessage = document.getElementById("statusMessage");


let claseActual = null;


/* =========================
   CONTROL DEL BOTÓN (UNA SOLA VEZ)
========================= */
registerButton.disabled = true;

function validarFormulario() {
  registerButton.disabled =
    !machineNumber.value || !observation.value.trim();
}

machineNumber.addEventListener("change", validarFormulario);
observation.addEventListener("input", validarFormulario);

/* =========================
   BLOQUEAR SELECCIÓN INICIAL
========================= */
function bloquearSeleccionInicial() {
  zonaSelect.disabled = true;
  selectCarrera.disabled = true;
  selectGrupo.disabled = true;
}

/* =========================
   LABORATORIOS ACTIVOS
========================= */
fetch("/alumno/laboratorios-activos")
  .then(res => res.json())
  .then(labs => {
    zonaSelect.innerHTML = `<option value="">Seleccione laboratorio</option>`;
    labs.forEach(l => {
      zonaSelect.innerHTML += `<option value="${l.id}">${l.nombre}</option>`;
    });
  });

/* =========================
   CAMBIO DE LABORATORIO
========================= */
zonaSelect.addEventListener("change", () => {
  const zonaId = zonaSelect.value;
  registerButton.disabled = true;
  claseActual = null;

  selectCarrera.innerHTML = "";
  selectGrupo.innerHTML = "";
  machineNumber.innerHTML = `<option value="">Seleccione equipo</option>`;

  if (!zonaId) return;

  // 👉 clase activa
  fetch(`/alumno/clase-activa/${zonaId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.activa) {
        statusMessage.textContent = "No hay clase activa en este laboratorio";
        statusMessage.className = "status-disabled";
        return;
      }

      claseActual = data.clase;

      // 🔹 mostrar carrera y grupo habilitados
      selectCarrera.innerHTML = `<option>${claseActual.carrera}</option>`;
      selectGrupo.innerHTML = `<option>${claseActual.grupo}</option>`;

      labInfo.textContent = claseActual.laboratorio;
      docenteInfo.textContent = claseActual.docente;

      // 🔹 habilitar sección 2
      machineTitle.style.display = "block";
      registrationContent.style.display = "grid";

      statusMessage.textContent = "Acceso habilitado";
      statusMessage.className = "status-enabled";

      bloquearSeleccionInicial(); // 🔒
      socket.emit("join_lab", zonaId);

    });

  // 👉 cargar máquinas disponibles
  cargarMaquinas(zonaId);
});

/* =========================
   CARGAR MAQUINAS (FIX)
========================= */

function cargarMaquinas(idZona) {
  machineNumber.innerHTML =
    `<option value="">Seleccione equipo</option>`;
    registerButton.disabled = true;  

  fetch(`/alumno/api/maquinas/${idZona}`)
    .then(res => res.json())
    .then(data => {

      if (!data.length) {
        machineNumber.innerHTML +=
          `<option value="">No hay equipos disponibles</option>`;
        return;
      }

      data.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.numero_equipo; // STRING (ej. 01-MQ-LPR)
        opt.textContent = m.numero_equipo;
        machineNumber.appendChild(opt);
      });
    })
    .catch(err => {
      console.error("Error cargando máquinas:", err);
    });
}


/* =========================
   REGISTRAR ALUMNO
========================= */

form.addEventListener("submit", e => {
  e.preventDefault();

  if (!claseActual) {
    Swal.fire("Aviso", "No hay clase activa", "warning");
    return;
  }

  if (!machineNumber.value) {
    Swal.fire("Aviso", "Selecciona una máquina", "warning");
    return;
  }

  if (!observation.value.trim()) {
    Swal.fire("Aviso", "Debes escribir una observación", "warning");
    return;
  }

  fetch("/alumno/registrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_clase: claseActual.id,
      id_zona: zonaSelect.value,
      numero_equipo: machineNumber.value,
      observaciones: observation.value.trim()
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.ok) {
      Swal.fire("Aviso", data.message, "warning");
      return;
    }

    Swal.fire("Registrado", "Registro exitoso", "success");
    registerButton.disabled = true;
    observation.value = ""; // limpiar
    cargarMaquinas(zonaSelect.value);
  });
});



/* =========================
   ACTUALIZAR OBSERVACIÓN
========================= */
document.querySelector(".btn-update").addEventListener("click", () => {

  if (!claseActual) return;

  fetch("/alumno/actualizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_clase: claseActual.id,
      id_zona: zonaSelect.value,
      numero_equipo: machineNumber.value,
      observaciones: observation.value
    })
  })
    .then(data => {
    const errorBox = document.getElementById("errorObservacion");

    if (!data.ok) {
      errorBox.textContent = data.message || "No se pudo actualizar";
      return;
    }

    errorBox.textContent = "";
    Swal.fire("Actualizado", "Datos actualizados correctamente", "success");
    cargarMaquinas(zonaSelect.value);
  });
});


/* =========================
   SOCKET: CIERRE
========================= */
socket.on("clase_cerrada", () => {
  Swal.fire("Aviso", "La bitácora fue cerrada", "info")
    .then(() => location.reload());
});
