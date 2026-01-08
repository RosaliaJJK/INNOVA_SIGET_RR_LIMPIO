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
  machineNumber.innerHTML = "";

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

      socket.emit("join_lab", zonaId);
      registerButton.disabled = false;
    });

  // 👉 cargar máquinas disponibles
  cargarMaquinas(zonaId);
});

/* =========================
   CARGAR MAQUINAS
========================= */
function cargarMaquinas(idZona) {
  fetch(`/alumno/api/maquinas/${idZona}`)
    .then(res => res.json())
    .then(data => {
      machineNumber.innerHTML =
        `<option value="">Seleccione equipo</option>`;

      data.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.numero_equipo; // 🔥 MUY IMPORTANTE
        opt.textContent = `Equipo ${m.numero_equipo}`;
        machineNumber.appendChild(opt);
      });
    });
}


/* =========================
   REGISTRAR ALUMNO
========================= */
form.addEventListener("submit", e => {
  e.preventDefault();

  if (!claseActual) return;

  fetch("/alumno/registrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_clase: claseActual.id,
      id_zona: zonaSelect.value,
      numero_equipo: machineNumber.value,
      observaciones: observation.value
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
    });
});

/* =========================
   SOCKET: CIERRE
========================= */
socket.on("clase_cerrada", () => {
  Swal.fire("Aviso", "La bitácora fue cerrada", "info")
    .then(() => location.reload());
});
