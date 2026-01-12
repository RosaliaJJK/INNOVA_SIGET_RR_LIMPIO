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
