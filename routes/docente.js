const express = require("express");
const router = express.Router();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");

/* ======================================================
   FUNCIÓN: CIERRE AUTOMÁTICO (HORARIO REAL)
====================================================== */
function verificarCierreAutomatico(db) {
  db.query(
    `
    UPDATE clases
    SET estado='CERRADA',
        fecha_fin = NOW() - INTERVAL 6 HOUR
    WHERE estado='ACTIVA'
    AND TIMESTAMP(fecha, hora_fin) <= NOW() - INTERVAL 6 HOUR
    `
  );
}

/* ======================================================
   VISTA DOCENTE
====================================================== */
router.get("/", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;

  // 🔴 SIEMPRE verificar cierre por horario
  verificarCierreAutomatico(db);

  db.query(
    `
    SELECT DISTINCT carrera FROM usuarios WHERE carrera IS NOT NULL;
    SELECT id, nombre FROM zonas WHERE tipo='LABORATORIO';

    SELECT id
    FROM clases
    WHERE estado='ACTIVA'
    AND id_docente=?;
    `,
    [req.session.user.id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error al cargar datos");
      }

      const carreras = results[0];
      const laboratorios = results[1];
      const claseActiva = results[2].length > 0;
      const idClase = claseActiva ? results[2][0].id : null;

      if (!claseActiva) {
        return res.render("docente", {
          user: req.session.user,
          carreras,
          laboratorios,
          claseActiva: false,
          registros: []
        });
      }

      db.query(
        `
        SELECT u.nombre AS alumno,
               r.numero_equipo,
               r.observaciones
        FROM registros r
        JOIN usuarios u ON u.id = r.id_alumno
        WHERE r.id_clase=?
        `,
        [idClase],
        (err2, registros) => {
          if (err2) {
            console.error(err2);
            return res.status(500).send("Error al cargar registros");
          }

          res.render("docente", {
            user: req.session.user,
            carreras,
            laboratorios,
            claseActiva: true,
            registros
          });
        }
      );
    }
  );
});

/* ======================================================
   ABRIR BITÁCORA
====================================================== */
router.post("/abrir-clase", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;

  const { carrera, laboratorio, grupo, hora_inicio, hora_fin } = req.body;
  const docenteId = req.session.user.id;
  const idZona = parseInt(laboratorio);

  if (!carrera || !grupo || !hora_inicio || !hora_fin || isNaN(idZona)) {
    return res.status(400).json({
      message: "⚠️ Todos los campos son obligatorios"
    });
  }

  // 🔴 cierre automático antes de validar
  verificarCierreAutomatico(db);

  // 1️⃣ DOCENTE: solo 1 activa
  db.query(
    `SELECT id FROM clases WHERE estado='ACTIVA' AND id_docente=?`,
    [docenteId],
    (err, r1) => {
      if (r1.length) {
        return res.status(400).json({
          message: "⚠️ Ya tienes una bitácora activa"
        });
      }

      // 2️⃣ LABORATORIO ocupado
      db.query(
        `SELECT id FROM clases WHERE estado='ACTIVA' AND id_zona=?`,
        [idZona],
        (err2, r2) => {
          if (r2.length) {
            return res.status(400).json({
              message: "⚠️ El laboratorio ya está en uso"
            });
          }

          // 3️⃣ insertar bitácora
          db.query(
            `
            INSERT INTO clases
            (id_docente, id_zona, carrera, grupo, hora_inicio, hora_fin, fecha, estado)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVA')
            `,
            [docenteId, idZona, carrera, grupo, hora_inicio, hora_fin],
            err3 => {
              if (err3) {
                console.error(err3);
                return res.status(500).json({
                  message: "❌ Error al abrir la bitácora"
                });
              }

              return res.json({
                message: "✅ Bitácora habilitada correctamente"
              });
            }
          );
        }
      );
    }
  );
});

/* ======================================================
   CERRAR BITÁCORA (MANUAL)
====================================================== */
router.post("/cerrar-clase", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;

  db.query(
    `
    UPDATE clases
    SET estado='CERRADA',
        fecha_fin = NOW() - INTERVAL 6 HOUR
    WHERE estado='ACTIVA'
    AND id_docente=?
    `,
    [req.session.user.id],
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "❌ Error al cerrar la bitácora"
        });
      }

      return res.json({
        message: "✅ Bitácora cerrada correctamente"
      });
    }
  );
});

module.exports = router;

router.get("/laboratorios/:carrera", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;
  const carrera = req.params.carrera;

  db.query(
    `
    SELECT id, nombre
    FROM zonas
    WHERE tipo='LABORATORIO'
    AND carrera=?
    `,
    [carrera],
    (err, rows) => {
      res.json(rows);
    }
  );
});
