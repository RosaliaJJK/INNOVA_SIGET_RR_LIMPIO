const express = require("express");
const router = express.Router();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");
const db = require("../config/db"); // conexión mysql2

/*
  MOSTRAR VISTA PERSONAL
*/
router.get(
  "/",
  verificarSesion,
  soloRol(["MANTENIMIENTO", "TECNICO"]),
  (req, res) => {
    res.render("personal", {
      user: req.session.usuario
    });
  }
);

// db = mysql2.createPool(...)

// ===============================
// MIDDLEWARE: SOLO TÉCNICOS
// ===============================
function soloTecnico(req, res, next) {
  if (!req.session.user || req.session.user.rol !== "TECNICO") {
    return res.redirect("/login");
  }
  next();
}

// ===============================
// DASHBOARD PRINCIPAL
// ===============================
router.get("/", soloTecnico, async (req, res) => {
  try {
    const [incidencias] = await db.query(`
      SELECT 
        tm.id,
        u.nombre AS solicitante,
        sp.area,
        sp.descripcion,
        sp.prioridad,
        tm.estado
      FROM tickets_mantenimiento tm
      INNER JOIN soporte_personal sp ON tm.id_soporte = sp.id
      INNER JOIN usuarios u ON sp.id_usuario = u.id
      ORDER BY tm.fecha_asignacion DESC
    `);

    const [[resumen]] = await db.query(`
      SELECT
        SUM(estado = 'ASIGNADO' OR estado = 'EN_PROCESO') AS pendientes,
        SUM(estado = 'RESUELTO') AS resueltas
      FROM tickets_mantenimiento
    `);

    res.render("mantenimiento", {
      user: req.session.user,
      incidencias,
      resumen
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error al cargar mantenimiento");
  }
});

// ===============================
// API: LISTAR INCIDENCIAS (BOTÓN ACTUALIZAR)
// ===============================
router.get("/api/incidencias", soloTecnico, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        tm.id,
        u.nombre AS solicitante,
        sp.area,
        sp.descripcion,
        sp.prioridad,
        tm.estado
      FROM tickets_mantenimiento tm
      INNER JOIN soporte_personal sp ON tm.id_soporte = sp.id
      INNER JOIN usuarios u ON sp.id_usuario = u.id
      ORDER BY tm.fecha_asignacion DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener incidencias" });
  }
});

// ===============================
// ACTUALIZAR ESTADO DE INCIDENCIA
// ===============================
router.post("/estado", soloTecnico, async (req, res) => {
  const { id_ticket, nuevo_estado, comentario } = req.body;

  try {
    const [[actual]] = await db.query(
      "SELECT estado FROM tickets_mantenimiento WHERE id = ?",
      [id_ticket]
    );

    await db.query(
      "UPDATE tickets_mantenimiento SET estado = ? WHERE id = ?",
      [nuevo_estado, id_ticket]
    );

    await db.query(
      `INSERT INTO historial_mantenimiento
       (id_ticket, estado_anterior, estado_nuevo, comentario)
       VALUES (?,?,?,?)`,
      [id_ticket, actual.estado, nuevo_estado, comentario || null]
    );

    if (nuevo_estado === "CERRADO") {
      await db.query(
        "UPDATE tickets_mantenimiento SET fecha_cierre = NOW() WHERE id = ?",
        [id_ticket]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo actualizar el estado" });
  }
});

// ===============================
// PUBLICAR DISPONIBILIDAD (PANEL DERECHO)
// ===============================
router.post("/disponibilidad", soloTecnico, async (req, res) => {
  const { fecha, hora_inicio, hora_fin } = req.body;

  try {
    await db.query(
      `INSERT INTO disponibilidad_tecnico
       (id_tecnico, fecha, hora_inicio, hora_fin)
       VALUES (?,?,?,?)`,
      [req.session.user.id, fecha, hora_inicio, hora_fin]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar disponibilidad" });
  }
});

// ===============================
// ELIMINAR INCIDENCIA
// ===============================
router.delete("/:id", soloTecnico, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM tickets_mantenimiento WHERE id = ?",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "No se pudo eliminar" });
  }
});

module.exports = router;
