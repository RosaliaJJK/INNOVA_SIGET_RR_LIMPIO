const express = require("express");
const router = express.Router();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");
const db = require("../config/db");
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
*/
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
);



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
  (req, res) => {
    
    const io = req.app.get("io");
    const alumnoId = req.session.user.id;
    const { id_clase, id_zona, numero_equipo, observaciones } = req.body;

    // 🔒 evitar doble registro del mismo alumno
    db.query(
      `SELECT id FROM registros WHERE id_clase=? AND id_alumno=?`,
      [id_clase, alumnoId],
      (err, existe) => {
        if (err) return res.json({ ok:false });

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
            if (err) return res.json({ ok:false });

            // 2️⃣ marcar máquina como ocupada
            db.query(
              `UPDATE maquinas
               SET ocupada = 1
               WHERE id_zona = ? AND numero_equipo = ?`,
              [id_zona, numero_equipo],
              err => {
                if (err) return res.json({ ok:false });

                // 🔔 tiempo real
                io.to(`lab_${id_zona}`).emit("nuevo_registro", {
                  alumno: req.session.user.nombre,
                  numero_equipo
                });

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

router.get("/api/maquinas/:idZona", (req, res) => {
  const { idZona } = req.params;

  db.query(
    `SELECT id, numero_equipo 
     FROM maquinas 
     WHERE id_zona = ? AND ocupada = 0`,
    [idZona],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error al cargar máquinas" });
      }
      res.json(rows);
    }
  );
});




module.exports = router;