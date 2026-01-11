const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");

/* ======================================================
   FUNCIÓN: CIERRE AUTOMÁTICO (HORARIO REAL)
====================================================== */
function verificarCierreAutomatico(db) {
  db.query(`
    UPDATE clases
    SET estado='CERRADA',
        fecha_fin = NOW() - INTERVAL 6 HOUR
    WHERE estado='ACTIVA'
      AND TIMESTAMP(fecha, hora_fin) <= NOW() - INTERVAL 6 HOUR
  `);

  db.query(`
    UPDATE registros r
    JOIN clases c ON r.id_clase = c.id
    SET r.hora_salida = NOW()
    WHERE c.estado='CERRADA'
      AND r.hora_salida IS NULL
  `);
}

/* ======================================================
   VISTA DOCENTE
====================================================== */
router.get("/", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;

  verificarCierreAutomatico(db);

  db.query(
    `
    SELECT DISTINCT carrera FROM usuarios WHERE carrera IS NOT NULL;
    SELECT id, nombre FROM zonas WHERE tipo='LABORATORIO';
    SELECT id FROM clases WHERE estado='ACTIVA' AND id_docente=?;
    `,
    [req.session.user.id],
    (err, results) => {
      if (err) {
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
            return res.status(500).json({
              ok: false,
              message: "❌ Error al cargar registros"
            });
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
router.post("/abrir-clase", verificarSesion, soloRol(["DOCENTE"]), upload.none(), (req, res) => {
  const db = req.db;
    console.log("BODY:", req.body); // <--- esto nos dice si llegan los datos

  //const { carrera, laboratorio, grupo, hora_inicio, hora_fin } = req.body;
  const { carrera, laboratorio, grupo, hora_inicio, hora_fin } = req.body || {};
  const docenteId = req.session.user.id;
  const idZona = parseInt(laboratorio);

  if (!carrera || !grupo || !hora_inicio || !hora_fin || isNaN(idZona)) {
    return res.status(400).json({
      ok: false,
      message: "⚠️ Todos los campos son obligatorios"
    });
  }

  verificarCierreAutomatico(db);

  db.query(
    `SELECT id FROM clases WHERE estado='ACTIVA' AND id_docente=?`,
    [docenteId],
    (err, r1) => {
      if (r1.length) {
        return res.status(400).json({
          ok: false,
          message: "⚠️ Ya tienes una bitácora activa"
        });
      }

      db.query(
        `SELECT id FROM clases WHERE estado='ACTIVA' AND id_zona=?`,
        [idZona],
        (err2, r2) => {
          if (r2.length) {
            return res.status(400).json({
              ok: false,
              message: "⚠️ El laboratorio ya está en uso"
            });
          }

          db.query(
            `
            INSERT INTO clases
            (id_docente, id_zona, carrera, grupo, hora_inicio, hora_fin, fecha, estado)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVA')
            `,
            [docenteId, idZona, carrera, grupo, hora_inicio, hora_fin],
            err3 => {
              if (err3) {
                return res.status(500).json({
                  ok: false,
                  message: "❌ Error al abrir la bitácora"
                });
              }
              const io = req.app.get("io");

              io.emit("clase_activada");

              return res.status(200).json({
                ok: true,
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
   CERRAR BITÁCORA
====================================================== */
router.post("/cerrar-clase", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;
  const docenteId = req.session.user.id;

  db.query(
    `SELECT id FROM clases WHERE estado='ACTIVA' AND id_docente=?`,
    [docenteId],
    (err, rows) => {
      if (err || !rows.length) {
        return res.status(400).json({
          ok: false,
          message: "⚠️ No hay bitácora activa"
        });
      }

      const idClase = rows[0].id;

      db.query(
        `
        UPDATE clases
        SET estado='CERRADA',
            fecha_fin = NOW() 
        WHERE id=?
        `,
        [idClase],
        err2 => {
          if (err2) {
            return res.status(500).json({
              ok: false,
              message: "❌ Error al cerrar la bitácora"
            });
          }

          db.query(
            `
            UPDATE registros
            SET hora_salida = NOW()
            WHERE id_clase = ?
              AND hora_salida IS NULL
            `,
            [idClase]
          );
          const io = req.app.get("io");
          io.emit("clase_cerrada")
          
          return res.status(200).json({
            ok: true,
            message: "✅ Bitácora cerrada correctamente"
          });
          
          

        }
      );
    }
  );
});

/* ======================================================
   OTROS ENDPOINTS
====================================================== */
router.get("/laboratorios/:carrera", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;

  db.query(
    `
    SELECT id, nombre
    FROM zonas
    WHERE tipo='LABORATORIO'
    AND carrera=?
    `,
    [req.params.carrera],
    (err, rows) => {
      res.json(rows);
    }
  );
});

router.get("/api/registros-activos", verificarSesion, soloRol(["DOCENTE"]), (req, res) => {
  const db = req.db;

  db.query(
    `
    SELECT r.*, u.nombre
    FROM registros r
    JOIN usuarios u ON r.id_alumno = u.id
    WHERE r.hora_salida IS NULL
    ORDER BY r.hora_entrada DESC
    `,
    (err, rows) => {
      if (err) return res.send("");

      res.render("docente/partials/tabla_registros", {
        registros: rows
      });
    }
  );
});

module.exports = router;
