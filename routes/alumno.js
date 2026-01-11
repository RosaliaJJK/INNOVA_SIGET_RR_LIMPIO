const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");

/*
  MOSTRAR VISTA ALUMNO
*/
router.get(
  "/",
  verificarSesion,
  soloRol(["ALUMNO"]),
  (req, res) => {
    res.render("alumno", {
      user: req.session.user
    });
  }
);

/*
  CONECTAR ALUMNO AL TIEMPO REAL

router.post(
  "/conectar",
  verificarSesion,
  soloRol(["ALUMNO"]),
  (req, res) => {
    const db = req.db;
    const { machineNumber, observation } = req.body;

    // 1️⃣ Buscar clase ABIERTA
    db.query(
      `SELECT id FROM clases_activas 
       WHERE estatus = 'ABIERTA' 
       ORDER BY id DESC 
       LIMIT 1`,
      (err, rows) => {
        if (err) return res.status(500).send("Error BD");

        if (rows.length === 0) {
          return res.status(403).send("No hay clase activa");
        }

        const idClase = rows[0].id;

        // 2️⃣ Insertar bitácora
        db.query(
          `INSERT INTO bitacoras 
          (id_clase, id_alumno, equipo_numero, observaciones_iniciales)
          VALUES (?, ?, ?, ?)`,
          [idClase, req.session.user.id, machineNumber, observation],
          err => {
            if (err) return res.status(500).send("Error al registrar");

            // 3️⃣ Avisar en tiempo real
            const io = req.app.get("io");
            io.emit("nuevo_registro", {
              alumno: req.session.user.nombre,
              equipo: machineNumber
            });

            res.redirect("/alumno");
          }
        );
      }
    );
  }
);*/


router.get("/estado/:zonaId", verificarSesion, (req, res) => {
  const db = req.db;
  const zonaId = req.params.zonaId;

  db.query(
    `SELECT id, carrera FROM clases 
     WHERE id_zona = ? AND estado = 'ACTIVA'`,
    [zonaId],
    (err, rows) => {
      if (err) return res.status(500).json({ activo: false });

      if (rows.length === 0) {
        return res.json({ activo: false });
      }

      res.json({
        activo: true,
        id_clase: rows[0].id,
        carrera: rows[0].carrera
      });
    }
  );
});



router.post(
  "/registrar",
  verificarSesion,
  soloRol(["ALUMNO"]),
  upload.none(),
  (req, res) => {

    const db = req.db; // ✅ USAR LA MISMA CONEXIÓN
    const io = req.app.get("io");
    const alumnoId = req.session.user.id;
    const { id_clase, id_zona, numero_equipo, observaciones } = req.body;


      // 🔒 VALIDACIÓN BACKEND (OBLIGATORIA)
      if (!id_clase || !id_zona || !numero_equipo || !observaciones) {
        return res.json({
          ok: false,
          message: "⚠️ Todos los campos son obligatorios"
        });
      }
   
    // 🔒 evitar doble registro
    db.query(
      `SELECT id FROM registros WHERE id_clase=? AND id_alumno=?`,
      [id_clase, alumnoId],
      (err, existe) => {
        if (err) {
          console.error("ERROR SELECT:", err);
          return res.json({ ok:false, message:"Error BD" });
        }

        if (existe.length > 0) {
          return res.json({ ok:false, message:"Ya estás registrado" });
        }

        // 1️⃣ insertar registro
        db.query(
          `INSERT INTO registros
           (id_clase, id_alumno, numero_equipo, observaciones)
           VALUES (?, ?, ?, ?)`,
          [id_clase, alumnoId, numero_equipo, observaciones],
          err => {
            if (err) {
              console.error("ERROR INSERT:", err);
              return res.json({ ok:false, message:"Error al registrar" });
            }

            // 2️⃣ ocupar máquina
            db.query(
              `UPDATE maquinas
               SET estado = 'OCUPADA'
               WHERE id_zona = ? AND numero_equipo = ?`,
              [id_zona, numero_equipo],
              err => {
                if (err) {
                  console.error("ERROR UPDATE MAQUINA:", err);
                  return res.json({ ok:false, message:"Error máquina" });
                }

                // 🔔 tiempo real
                io.to(`lab_${id_zona}`).emit("nuevo_registro", {
                  alumno: req.session.user.nombre,
                  numero_equipo
                });

                // ✅ RESPUESTA FINAL (ANTES NO LLEGABA)
                res.json({ ok:true });
              }
            );
          }
        );
      }
    );
  }
);



router.get("/clase-activa/:zonaId", verificarSesion, soloRol(["ALUMNO"]), (req, res) => {
  const db = req.db;
  const zonaId = req.params.zonaId;

  db.query(
    `
    SELECT 
      c.id,
      c.carrera,
      c.grupo,
      u.nombre AS docente,
      z.nombre AS laboratorio
    FROM clases c
    JOIN usuarios u ON c.id_docente = u.id
    JOIN zonas z ON c.id_zona = z.id
    WHERE c.estado = 'ACTIVA'
      AND c.id_zona = ?
    LIMIT 1
    `,
    [zonaId],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.json({ activa: false });
      }

      res.json({
        activa: true,
        clase: rows[0]
      });
    }
  );
});



router.get("/laboratorios-activos", verificarSesion, soloRol(["ALUMNO"]), (req, res) => {
  const db = req.db;

  db.query(
    `
    SELECT DISTINCT z.id, z.nombre
    FROM clases c
    JOIN zonas z ON c.id_zona = z.id
    WHERE c.estado = 'ACTIVA'
    `,
    (err, rows) => {
      if (err) return res.json([]);

      res.json(rows);
    }
  );
});

// routes/alumno.js

router.get(
  "/api/maquinas/:idZona",
  verificarSesion,
  soloRol(["ALUMNO"]),
  (req, res) => {
    const db = req.db;

    db.query(
      `
        SELECT numero_equipo
        FROM maquinas
        WHERE id_zona = ?
        AND estado = 'LIBRE'
        ORDER BY numero_equipo
      `,
      [req.params.idZona],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.json([]);
        }
        res.json(rows);
      }
    );
  }
);


// ACTUALIZANDO REGISTR0

router.post(
  "/actualizar",
  verificarSesion,
  soloRol(["ALUMNO"]),
  (req, res) => {

    const db = req.db;
    const alumnoId = req.session.user.id;
    const { id_clase, id_zona, numero_equipo, observaciones } = req.body;

    // 🔒 VALIDACIÓN BACKEND
    if (!numero_equipo || !observaciones) {
      return res.json({
        ok: false,
        message: "⚠️ Todos los campos son obligatorios"
      });
    }

    db.query(
      `SELECT numero_equipo 
       FROM registros 
       WHERE id_clase = ? AND id_alumno = ?`,
      [id_clase, alumnoId],
      (err, rows) => {
        if (err || rows.length === 0) {
          return res.json({ ok:false, message:"Registro no encontrado" });
        }

        const maquinaAnterior = rows[0].numero_equipo;

        db.query(
          `UPDATE registros
           SET numero_equipo = ?, observaciones = ?
           WHERE id_clase = ? AND id_alumno = ?`,
          [numero_equipo, observaciones, id_clase, alumnoId],
          err => {
            if (err) {
              return res.json({ ok:false, message:"Error al actualizar" });
            }

            // liberar máquina anterior
            db.query(
              `UPDATE maquinas SET estado = 'LIBRE'
               WHERE id_zona = ? AND numero_equipo = ?`,
              [id_zona, maquinaAnterior]
            );

            // ocupar nueva máquina
            db.query(
              `UPDATE maquinas SET estado = 'OCUPADA'
               WHERE id_zona = ? AND numero_equipo = ?`,
              [id_zona, numero_equipo]
            );

            const io = req.app.get("io");
            io.to(`lab_${id_zona}`).emit("registro_actualizado", {
              alumno: req.session.user.nombre,
              numero_equipo
            });

            return res.json({ ok:true });
          }
        );
      }
    );
  }
);


/*
router.post("/alumno/registrar", verificarSesion, soloRol(["ALUMNO"]), (req, res) => {
  const db = req.db;
  const { numero_equipo, observaciones } = req.body;
  const idAlumno = req.session.user.id;

  if (!numero_equipo || !observaciones) {
    return res.status(400).json({
      message: "⚠️ Todos los campos son obligatorios"
    });
  }

  // obtener clase activa
  db.query(
    `SELECT id FROM clases WHERE estado='ACTIVA'`,
    (err, rows) => {
      if (!rows.length) {
        return res.status(400).json({
          message: "⚠️ No hay clase activa"
        });
      }

      const idClase = rows[0].id;

      // insertar registro
      db.query(
        `
        INSERT INTO registros (id_clase, id_alumno, numero_equipo, observaciones)
        VALUES (?, ?, ?, ?)
        `,
        [idClase, idAlumno, numero_equipo, observaciones],
        err2 => {
          if (err2) {
            console.error(err2);
            return res.status(500).json({
              message: "❌ Error al registrar entrada"
            });
          }

          // marcar máquina ocupada
          db.query(
            `
            UPDATE maquinas
            SET estado = 'OCUPADA'
            WHERE numero_equipo = ?
            `,
            [numero_equipo]
          );
          

          return res.json({
            message: "✅ Entrada registrada correctamente"
          });
        }
      );
    }
  );
});

*/


module.exports = router;