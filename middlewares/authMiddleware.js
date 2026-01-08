function verificarSesion(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/");
  }
  next();
}

function soloRol(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/");
    }

    const rolUsuario = req.session.user.rol;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).send("Acceso no autorizado");
    }

    next();
  };
}

module.exports = {
  verificarSesion,
  soloRol
};
