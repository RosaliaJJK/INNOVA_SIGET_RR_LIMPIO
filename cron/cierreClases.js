const cron = require("node-cron");

module.exports = function iniciarCierreAutomatico(db, io) {
  cron.schedule("* * * * *", () => {
    const ahora = new Date();

    db.query(
      `
      SELECT id, hora_fin 
      FROM clases 
      WHERE estado = 'ACTIVA'
      `,
      (err, clases) => {
        if (err) return console.error(err);

        clases.forEach(clase => {
          const fin = new Date();
          const [h, m, s] = clase.hora_fin.split(":");
          fin.setHours(h, m, s || 0);

          if (ahora >= fin) {
            db.query(
              `UPDATE clases SET estado='CERRADA' WHERE id=?`,
              [clase.id],
              err => {
                if (!err) {
                  io.emit("clase_cerrada");
                  console.log(`Clase ${clase.id} cerrada automáticamente`);
                }
              }
            );
          }
        });
      }
    );
  });
};
