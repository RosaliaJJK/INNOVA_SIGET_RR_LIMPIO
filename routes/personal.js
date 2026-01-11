const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // sin archivos
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
      user: req.session.user
    });
  }
);

// ===============================
// REPORTAR PROBLEMA
// ===============================
router.get(
  "/reportar-problema",
  verificarSesion,
  soloRol(["ALUMNO", "DOCENTE", "PERSONAL"]),
  (req, res) => {
    res.render("reportar-problema", {
      user: req.session.user
    });
  }
);

// ===============================
// ESTADO DEL SISTEMA
// ===============================
router.get(
  "/estado-sistema",
  verificarSesion,
  soloRol(["ALUMNO", "DOCENTE", "PERSONAL", "TECNICO"]),
  (req, res) => {

    // 🔧 aquí defines el estado del sistema
    const estado = "ok"; // ok | warning | error

    res.render("estado-sistema", {
      estado,
      ultimaActualizacion: new Date().toLocaleString()
    });
  }
);

/*
/* =========================
   ENVIAR SOPORTE PERSONAL
========================= */
router.post(
  "/enviar-soporte-personal",
  verificarSesion,
  soloRol(["PERSONAL", "TECNICO"]),
  upload.none(), // 👈 ESTA ES LA CLAVE
  (req, res) => {
  const db = req.db;

  const {
    asunto,
    area,
    descripcion,
    tipo_incidencia,
    prioridad,
    tipo_atencion,
    fecha_cita,
    turno
  } = req.body;

  if (
    !asunto ||
    !area ||
    !descripcion ||
    !tipo_incidencia ||
    !prioridad ||
    !tipo_atencion ||
    !fecha_cita ||
    !turno
  ) {
    console.log("❌ DATOS RECIBIDOS:", req.body);

    return res.send(`
      <script>
        alert("⚠️ Todos los campos son obligatorios");
        window.location="/personal";
      </script>
    `);
  }


  const id_usuario = req.session.user.id;

  const sql = `
    INSERT INTO soporte_personal
    (id_usuario, asunto, area, descripcion, tipo_incidencia, prioridad, tipo_atencion, fecha_cita, turno)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      id_usuario,
      asunto,
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
        return res.status(500).json({
          ok: false,
          message: "Error al generar el ticket"
        });
      }

      return res.json({
        ok: true,
        message: "Ticket generado correctamente"
      });
    }
  );

});


router.post(
  "/maquina/mantenimiento",
  verificarSesion,
  soloRol(["PERSONAL", "TECNICO"]),
  (req, res) => {
    const db = req.db;
    const { id_zona, numero_equipo } = req.body;

    if (!id_zona || !numero_equipo) {
      return res.json({ ok:false, message:"Datos incompletos" });
    }

    db.query(
      `
      UPDATE maquinas
      SET estado = 'MANTENIMIENTO'
      WHERE id_zona = ? AND numero_equipo = ?
      `,
      [id_zona, numero_equipo],
      err => {
        if (err) {
          console.error(err);
          return res.json({ ok:false });
        }

        res.json({ ok:true });
      }
    );
  }
);

router.post(
  "/maquina/liberar",
  verificarSesion,
  soloRol(["PERSONAL", "TECNICO"]),
  (req, res) => {
    const db = req.db;
    const { id_zona, numero_equipo } = req.body;

    db.query(
      `
      UPDATE maquinas
      SET estado = 'LIBRE'
      WHERE id_zona = ? AND numero_equipo = ?
      `,
      [id_zona, numero_equipo],
      () => res.json({ ok:true })
    );
  }
);

router.post(
  "/reportar-problema",
  verificarSesion,
  upload.none(), // 👈 ESTA LÍNEA ES LA CLAVE
  (req, res) => {
    const db = req.db;
    const { tipo_problema, descripcion } = req.body;
    const usuario = req.session.user;

    if (!tipo_problema || !descripcion) {
      return res.status(400).json({
        ok: false,
        message: "Datos incompletos"
      });
    }

    db.query(
      `
      INSERT INTO reportes_problemas
      (id_usuario, rol_usuario, tipo_problema, descripcion)
      VALUES (?, ?, ?, ?)
      `,
      [usuario.id, usuario.rol, tipo_problema, descripcion],
      err => {
        if (err) {
          console.error("❌ Error reporte problema:", err);
          return res.status(500).json({ ok: false });
        }

        res.json({ ok: true });
      }
    );
  }
);


module.exports = router;