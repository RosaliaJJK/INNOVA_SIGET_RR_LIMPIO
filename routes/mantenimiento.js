const express = require("express");
const router = express.Router();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");
/*
  MOSTRAR VISTA PERSONAL
*/
router.get(
  "/",
  verificarSesion,
  soloRol(["MANTENIMIENTO", "TECNICO"]),
  (req, res) => {
    res.render("mantenimiento", {
      user: req.session.user
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
// API: LISTAR INCIDENCIAS (BOTÓN ACTUALIZAR)
// ===============================
router.get("/api/incidencias", soloTecnico, async (req, res) => {
  const db = req.db;
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
  const db = req.db;

  const { id_ticket, nuevo_estado, comentario } = req.body;

  const [[soporte]] = await db.query(
    `SELECT numero_equipo FROM soporte_personal 
     WHERE id = (SELECT id_soporte FROM tickets_mantenimiento WHERE id = ?)`,
    [id_ticket]
  );

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

    if (nuevo_estado === "EN_PROCESO") {
      await db.query(
        `UPDATE maquinas SET estado = 'MANTENIMIENTO'
         WHERE numero_equipo = ?`,
        [soporte.numero_equipo]
      );
    }

    if (nuevo_estado === "CERRADO") {
      await db.query(
        `UPDATE maquinas SET estado = 'LIBRE'
         WHERE numero_equipo = ?`,
        [soporte.numero_equipo]
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
  const db = req.db;

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
  const db = req.db;
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

/* =========================================================
   ====== AGREGADOS (NO MODIFICAN LO ANTERIOR) ======
   ========================================================= */

// ===============================
// EXPORTAR INCIDENCIAS A PDF
// ===============================
router.get("/api/incidencias/pdf", soloTecnico, async (req, res) => {
  const db = req.db;

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

    res.json(rows); // el PDF se arma del lado del frontend
  } catch (err) {
    res.status(500).json({ error: "Error al generar datos para PDF" });
  }
});

// ===============================
// BITÁCORAS POR LABORATORIO
// ===============================
router.get("/api/bitacoras", soloTecnico, async (req, res) => {
  const db = req.db;
  const { laboratorio, fecha } = req.query;

  try {
    const [rows] = await db.query(
      `SELECT 
         u.nombre AS alumno,
         b.hora_entrada,
         b.hora_salida,
         b.actividad
       FROM bitacoras_alumnos b
       INNER JOIN usuarios u ON b.id_alumno = u.id
       INNER JOIN laboratorios l ON b.id_laboratorio = l.id
       WHERE l.nombre = ?
         AND DATE(b.fecha) = ?
       ORDER BY b.hora_entrada`,
      [laboratorio, fecha]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar bitácoras" });
  }
});

module.exports = router;
