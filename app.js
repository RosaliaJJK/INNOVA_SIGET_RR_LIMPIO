const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/auth");
const alumnoRoutes = require("./routes/alumno");
const docenteRoutes = require("./routes/docente");
const apiRoutes = require("./routes/api"); // ✅ AÑADIDO

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "innova_siget_secret",
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

/* =========================
   RUTAS
========================= */
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);      // ✅ CLAVE PARA RECUPERACIÓN
app.use("/alumno", alumnoRoutes);
app.use("/docente", docenteRoutes);

app.get("/", (req, res) => {
  res.render("login");
});

module.exports = app;
