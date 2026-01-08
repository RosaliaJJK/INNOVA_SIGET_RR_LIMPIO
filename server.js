require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

/* =========================
   APP
========================= */
const app = express();

/* =========================
   SERVER + SOCKET.IO
========================= */
const server = http.createServer(app);
const io = new Server(server);
app.set("io", io);

/* =========================
   BD (POOL)
========================= */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  timezone: "local"
});

// 🔑 Guardar DB en app (CORRECCIÓN CLAVE)
app.set("db", db);

// Prueba conexión
db.query("SELECT 1", err => {
  if (err) console.error("❌ MySQL error:", err);
  else console.log("✅ MySQL conectado");
});

/* =========================
   MIDDLEWARES
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "innova_siget_secret",
    resave: false,
    saveUninitialized: false
  })
);

/* =========================
   VISTAS
========================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   INYECTAR DB EN REQUEST
========================= */
app.use((req, res, next) => {
  req.db = db;
  next();
});

/* =========================
   RUTAS
========================= */
app.use("/auth", require("./routes/auth"));
app.use("/", require("./routes/auth"));
app.use("/api", require("./routes/api"));
app.use("/alumno", require("./routes/alumno"));
app.use("/docente", require("./routes/docente"));
app.use("/personal", require("./routes/personal"));

app.get("/", (req, res) => {
  res.render("login");
});

/* =========================
   SOCKET.IO
========================= */
io.on("connection", socket => {

  socket.on("join_lab", zonaId => {
    socket.join(`lab_${zonaId}`);
    console.log("Socket unido a lab_", zonaId);
  });

});

/* =========================
   CIERRE AUTOMÁTICO REAL ⏰
========================= */
setInterval(() => {
  db.query(
    `
    UPDATE clases
    SET estado = 'CERRADA'
    WHERE estado = 'ACTIVA'
      AND TIMESTAMP(fecha, hora_fin) <= NOW()
    `,
    (err, result) => {
      if (err) {
        console.error("❌ Error cierre automático:", err);
        return;
      }

      if (result.affectedRows > 0) {
        console.log("⏰ Bitácora cerrada correctamente");
        io.emit("clase_cerrada");
      }
    }
  );
}, 30000);

/* =========================
   VERIFICACIÓN GLOBAL (CORREGIDA)
========================= */
setInterval(() => {
  const db = app.get("db");
  if (!db) return;

  db.query(
    `
    UPDATE clases
    SET estado='CERRADA',
        fecha_fin = NOW() - INTERVAL 6 HOUR
    WHERE estado='ACTIVA'
      AND TIMESTAMP(fecha, hora_fin) <= NOW() - INTERVAL 6 HOUR
    `
  );
}, 60000);

/* =========================
   SERVIDOR
========================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto", PORT);
});