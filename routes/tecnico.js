const express = require("express");
const router = express.Router();
const { verificarSesion } = require("../middlewares/authMiddleware");

// DASHBOARD
router.get("/dashboard", verificarSesion, async (req, res) => {
const db = req.db.promise();

  const [incidencias] = await db.query(`
    SELECT t.id, u.nombre AS solicitante, z.nombre AS area,
           t.descripcion, t.prioridad, t.estado
    FROM tickets_mantenimiento t
    JOIN usuarios u ON t.id_solicitante = u.id
    JOIN zonas z ON t.id_zona = z.id
    ORDER BY t.fecha_reporte DESC
  `);

  const [resumen] = await db.query(`
    SELECT
      SUM(estado='PENDIENTE') AS pendientes,
      SUM(estado='RESUELTO') AS resueltas
    FROM tickets_mantenimiento
  `);

  res.render("mantenimiento", {
    user: req.session.user,
    incidencias,              // 🔴 ESTO ES LO QUE FALTABA
    resumen: resumen[0]
  });
});

// ACTUALIZAR ESTADO
router.post("/actualizar-estado", verificarSesion, async (req, res) => {
    const db = req.db.promise();

    const { id_incidencia, nuevo_estado } = req.body;

    await db.query(`
        UPDATE tickets_mantenimiento
        SET estado = ?
        WHERE id = ?
    `, [nuevo_estado, id_incidencia]);

    await db.query(`
        INSERT INTO historial_mantenimiento (id_ticket, estado)
        VALUES (?, ?)
    `, [id_incidencia, nuevo_estado]);

    res.redirect("/tecnico/dashboard");
});


module.exports = router;
