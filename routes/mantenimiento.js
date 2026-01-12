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

    io.emit("incidencia_actualizada"); // 🔴 TIEMPO REAL

    res.json({ success: true });
  }
);


// ===============================
// ELIMINAR INCIDENCIA
// ===============================
router.delete("/:id", verificarSesion, async (req, res) => {
  const db = req.db.promise();
  try {
    await db.query(
      "DELETE FROM soporte_personal WHERE id = ?",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo eliminar" });
  }
});



module.exports = router;
