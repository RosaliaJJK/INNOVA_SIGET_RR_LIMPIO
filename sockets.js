module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Cliente conectado");

    socket.on("habilitar_sesion", (data) => {
      io.emit("sesion_activa", data);
    });

    socket.on("nuevo_registro", (data) => {
      io.emit("actualizar_docente", data);
    });

    socket.on("actualizar_registro", (data) => {
      io.emit("registro_actualizado", data);
    });
  });
};
