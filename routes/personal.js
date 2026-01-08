const express = require("express");
const router = express.Router();
const { verificarSesion, soloRol } = require("../middlewares/authMiddleware");

/*
  MOSTRAR VISTA PERSONAL
*/
router.get(
  "/",
  verificarSesion,
  soloRol(["PERSONAL", "TECNICO"]),
  (req, res) => {
    res.render("personal", {
      user: req.session.usuario
    });
  }
);

module.exports = router;
