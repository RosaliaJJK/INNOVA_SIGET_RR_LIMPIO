// public/js/engranaje.js

document.addEventListener("DOMContentLoaded", () => {
    const cogButton = document.getElementById("cogButton");
    const menu = document.getElementById("settingsMenu");

    // Si la vista no tiene engrane, no hace nada
    if (!cogButton || !menu) return;

    // Abrir / cerrar menú
    cogButton.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    // Evita cerrar al hacer click dentro del menú
    menu.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    // -----------------------------
    // ACCIONES DEL ENGRANE
    // -----------------------------

    const btnReportar = document.getElementById("btn-reportar");
    const btnEstado = document.getElementById("btn-estado");
    const btnCatalogo = document.getElementById("btn-catalogo");

    if (btnReportar) {
        btnReportar.addEventListener("click", () => {
            menu.style.display = "none";
            window.location.href = "/personal/reportar-problema";
        });
    }

    if (btnEstado) {
        btnEstado.addEventListener("click", () => {
            menu.style.display = "none";
            window.location.href = "/personal/estado-sistema";
        });
    }

    if (btnCatalogo) {
        btnCatalogo.addEventListener("click", () => {
            menu.style.display = "none";
            window.location.href = "/catalogo-soluciones";
        });
    }
});
