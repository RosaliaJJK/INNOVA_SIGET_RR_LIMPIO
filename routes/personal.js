const express = require("express");
const router = express.Router();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");

/*
  MOSTRAR VISTA PERSONAL
*/
router.get(
  "/",
  verificarSesion,
  soloRol(["PERSONAL", "TECNICO"]),
  (req, res) => {
    res.render("personal", {
      user: req.session.usuario
    });
  }
);

/* =========================
   MIDDLEWARE DE SEGURIDAD
========================= */
function soloPersonal(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  if (req.session.user.rol !== "PERSONAL") {
    return res.status(403).send("Acceso denegado");
  }
  next();
}

/* =========================
   VISTA PRINCIPAL PERSONAL
========================= */
router.get("/", soloPersonal, (req, res) => {
  res.render("personal", {
    user: req.session.user
  });
});

/* =========================
   ENVIAR SOPORTE PERSONAL
========================= */
router.post("/enviar-soporte-personal", soloPersonal, (req, res) => {
  const db = req.db;

  const {
    area,
    descripcion,
    tipo_incidencia,
    prioridad,
    tipo_atencion,
    fecha_cita,
    turno
  } = req.body;

  const id_usuario = req.session.user.id;

  const sql = `
    INSERT INTO soporte_personal
    (id_usuario, area, descripcion, tipo_incidencia, prioridad, tipo_atencion, fecha_cita, turno)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      id_usuario,
      area,
      descripcion,
      tipo_incidencia,
      prioridad,
      tipo_atencion,
      fecha_cita,
      turno
    ],
    (err) => {
      if (err) {
        console.error("❌ Error soporte personal:", err);
        return res.send(`
          <script>
            alert("Error al generar el ticket");
            window.location="/personal";
          </script>
        `);
      }

      res.send(`
        <script>
          alert("✅ Ticket generado correctamente");
          window.location="/personal";
        </script>
      `);
    }
  );
});

module.exports = router;