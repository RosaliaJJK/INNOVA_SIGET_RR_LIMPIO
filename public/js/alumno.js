let alumnoRegistrado = false;
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
========================= 
registerButton.disabled = true;

function validarFormulario() {
  registerButton.disabled =
    !machineNumber.value || !observation.value.trim();
}

machineNumber.addEventListener("change", validarFormulario);
observation.addEventListener("input", validarFormulario);*/

/* =========================
   BLOQUEAR SELECCIÓN INICIAL
========================= */
function bloquearSeleccionInicial() {
  zonaSelect.disabled = true;
  //selectCarrera.disabled = true;
  //selectGrupo.disabled = true;
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

      document.getElementById("careerGroupSection").style.display = "block";
      selectCarrera.disabled = true;
      selectGrupo.disabled = true;
      
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

  // 🛑 Validaciones obligatorias
  if (!claseActual) {
    Swal.fire("Aviso", "No hay clase activa", "warning");
    return;
  }

  if (!zonaSelect.value) {
    Swal.fire("Campos incompletos", "Seleccione un laboratorio", "warning");
    return;
  }

  if (!machineNumber.value) {
    Swal.fire("Campos incompletos", "Seleccione una máquina", "warning");
    return;
  }

  if (!observation.value.trim()) {
    Swal.fire(
      "Campos incompletos",
      "Debe escribir una observación",
      "warning"
    );
    return;
  }

  // ✅ SOLO SI TODO ESTÁ BIEN
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

      Swal.fire("Registrado", "Entrada registrada correctamente", "success");

      alumnoRegistrado = true; // ✅ YA REGISTRADO
      
      // limpiar
      observation.value = "";
      registerButton.disabled = true;

      // refrescar máquinas
      cargarMaquinas(zonaSelect.value);
    });
});



/* =========================
   ACTUALIZAR OBSERVACIÓN
========================= */
const btnUpdate = document.querySelector(".btn-update");
if (btnUpdate) {
  btnUpdate.addEventListener("click", () => {

  if (!claseActual) {
    Swal.fire("Aviso", "No hay clase activa", "warning");
    return;
  }

  // 🔴 NO REGISTRADO
  if (!alumnoRegistrado) {
    Swal.fire(
      "No registrado",
      "Debes registrar tu entrada antes de actualizar",
      "warning"
    );
    return;
  }

  // 🔴 CAMPOS VACÍOS
  if (!machineNumber.value || !observation.value.trim()) {
    Swal.fire(
      "Campos incompletos",
      "Para actualizar debes llenar todos los campos",
      "warning"
    );
    return;
  }

  fetch("/alumno/actualizar", {
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
      Swal.fire("Error", data.message, "error");
      return;
    }

    Swal.fire("Actualizado", "Datos actualizados correctamente", "success");
    observation.value = "";
    cargarMaquinas(zonaSelect.value);
  });

});
}


/* =========================
   SOCKET: CIERRE
========================= */
socket.on("clase_cerrada", () => {
  Swal.fire({
    title: "Aviso",
    text: "La bitácora fue cerrada",
    icon: "info",
    timer: 3000,          // 3 segundos
    timerProgressBar: true,
    showConfirmButton: false
  }).then(() => {
    location.reload();
  });
});
/*

if (zonaSelect) {
  zonaSelect.addEventListener("change", async () => {
    const zonaId = zonaSelect.value;
    if (!zonaId) return;

    const res = await fetch(`/alumno/clase-activa/${zonaId}`);
    const data = await res.json();

    if (!data.activa) {
      Swal.fire(
        "Sin clase activa",
        "Este laboratorio no tiene clase activa",
        "warning"
      );
      return;
    }

    // 🟢 Mostrar sección oculta
    document.getElementById("careerGroupSection").style.display = "block";
    document.getElementById("machineTitle").style.display = "block";
    document.getElementById("registrationContent").style.display = "grid";

    // 🟢 Mostrar info
    document.getElementById("labInfo").textContent = data.clase.laboratorio;
    document.getElementById("docenteInfo").textContent = data.clase.docente;

    // 🟢 Guardar IDs ocultos (si ya los usas)
    window.ID_CLASE = data.clase.id;
    window.ID_ZONA = zonaId;
  });
}*/


socket.on("nuevo_registro", () => {
  if (zonaSelect.value) {
    cargarMaquinas(zonaSelect.value);
  }
});

socket.on("registro_actualizado", () => {
  if (zonaSelect.value) {
    cargarMaquinas(zonaSelect.value);
  }
});
