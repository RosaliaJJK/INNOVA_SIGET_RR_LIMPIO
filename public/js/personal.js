document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formReporte");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const formData = new FormData(form);

    const res = await fetch("/personal/reportar-problema", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (data.ok) {
      Swal.fire(
        "Reporte enviado",
        "Gracias por ayudarnos a mejorar el sistema",
        "success"
      ).then(() => window.history.back());
    } else {
      Swal.fire("Error", "No se pudo enviar el reporte", "error");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const inputFecha = document.getElementById("fecha_cita");
  if (!inputFecha) return;

  const diasMap = {
    DOMINGO: 0,
    LUNES: 1,
    MARTES: 2,
    MIERCOLES: 3,
    JUEVES: 4,
    VIERNES: 5,
    SABADO: 6
  };

  fetch("/mantenimiento/api/disponibilidad")
    .then(res => res.json())
    .then(diasPermitidos => {

      const diasMap = {
        DOMINGO: 0,
        LUNES: 1,
        MARTES: 2,
        MIERCOLES: 3,
        JUEVES: 4,
        VIERNES: 5,
        SABADO: 6
      };

      const permitidos = diasPermitidos.map(d => diasMap[d]);

      flatpickr("#fecha_cita", {
        minDate: "today",
        disable: [
          function(date) {
            return !permitidos.includes(date.getDay());
          }
        ],
        locale: "es"
      });

    });
});
