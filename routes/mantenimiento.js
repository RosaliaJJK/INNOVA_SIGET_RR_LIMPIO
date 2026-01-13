console.log("🚨 RUTA MANTENIMIENTO EJECUTADA");
const express = require("express");
const router = express.Router();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");

router.get(
  "/",
  verificarSesion,
  soloRol(["MANTENIMIENTO", "TECNICO"]),
  async (req, res) => {
    const db = req.db.promise();
    try {
      const [incidencias] = await db.query(`
        SELECT
          tm.id,
          u.nombre AS solicitante,
          tm.area,
          tm.descripcion,
          tm.prioridad,
          tm.estado
        FROM soporte_personal tm
        INNER JOIN usuarios u ON tm.id_usuario = u.id
        ORDER BY tm.fecha_reporte ASC
      `);

      res.render("mantenimiento", {
        user: req.session.user,
        incidencias,
        resumen: {}
      });
    } catch (error) {
      console.error(error);
      res.render("mantenimiento", {
        user: req.session.user,
        incidencias: [],
        resumen: {}
      });
    }
  }
);

router.get("/api/incidencias", async (req, res) => {
  const db = req.db.promise();
  const { prioridad, estado, area } = req.query;

  let where = [];
  let params = [];

  if (prioridad && prioridad !== "TODAS") {
    where.push("tm.prioridad = ?");
    params.push(prioridad);
  }

  if (estado && estado !== "TODOS") {
    where.push("tm.estado = ?");
    params.push(estado);
  }

  if (area && area !== "TODAS") {
    where.push("tm.area = ?");
    params.push(area);
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await db.query(`
    SELECT
      tm.id,
      u.nombre AS solicitante,
      tm.area,
      tm.descripcion AS problema,
      tm.prioridad,
      tm.estado
    FROM soporte_personal tm
    INNER JOIN usuarios u ON tm.id_usuario = u.id
    ${whereSQL}
    ORDER BY tm.fecha_reporte ASC
  `, params);

  res.json(rows);
});


router.get("/api/disponibilidad", async (req, res) => {
  const db = req.db.promise();
  const [rows] = await db.query(
    "SELECT dia_semana FROM disponibilidad_soporte WHERE activo = 1"
  );

  res.json(rows.map(r => r.dia_semana));
});


router.post(
  "/estado",
  verificarSesion,
  soloRol(["TECNICO", "MANTENIMIENTO"]),
  async (req, res) => {
    const db = req.db.promise();
    const io = req.app.get("io"); // 👈 AQUÍ SE USA
    const { id_ticket, nuevo_estado } = req.body;

    await db.query(
      "UPDATE soporte_personal SET estado = ? WHERE id = ?",
      [nuevo_estado, id_ticket]
    );

    io.emit("resumen_actualizado"); // 👈 NUEVO
    io.emit("incidencia_actualizada");

    res.json({ success: true });
  }
);


// ===============================
// ELIMINAR INCIDENCIA
// ===============================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const db = req.app.get("db");

  try {
    await db.promise().query(
      "DELETE FROM soporte_personal WHERE id = ?",
      [id]
    );

    // 🔔 tiempo real (opcional pero recomendado)
    const io = req.app.get("io");
    io.emit("resumen_actualizado"); // 👈 NUEVO
    io.emit("incidencia_actualizada");
    

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error eliminando incidencia:", err);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

router.post("/disponibilidad", async (req, res) => {
  const db = req.db.promise();
  const { dias } = req.body;

  // Borra configuración anterior
  await db.query("DELETE FROM disponibilidad_soporte");

  // Guarda los nuevos días
  if (dias && dias.length) {
    for (const dia of dias) {
      await db.query(
        "INSERT INTO disponibilidad_soporte (dia_semana) VALUES (?)",
        [dia]
      );
    }
  }

  res.redirect("/mantenimiento");
});

// ===============================
// OBTENER LABORATORIOS
// ===============================
router.get(
  "/laboratorios",
  verificarSesion,
  soloRol(["MANTENIMIENTO", "TECNICO"]),
  async (req, res) => {
    try {
      const db = req.db.promise();

      const [labs] = await db.query(`
        SELECT id, nombre
        FROM zonas
        ORDER BY nombre
      `);

      res.json(labs);

    } catch (err) {
      console.error("❌ Error cargando laboratorios:", err);
      res.status(500).json([]);
    }
  }
);

router.get("/resumen-hoy", async (req, res) => {
  try {
    const db = req.db.promise();

    const [rows] = await db.query(`
      SELECT
        SUM(estado = 'PENDIENTE') AS pendientes,
        SUM(estado = 'RESUELTA') AS resueltas
      FROM soporte_personal
    `);

    res.json({
      pendientes: rows[0].pendientes || 0,
      resueltas: rows[0].resueltas || 0
    });

  } catch (err) {
    console.error("❌ Error resumen:", err);
    res.json({ pendientes: 0, resueltas: 0 });
  }
});


module.exports = router;
