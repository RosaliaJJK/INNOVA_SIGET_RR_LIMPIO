const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();

/* =========================
   ENVÍO DE CORREO – BREVO API (HTTP)
========================= */
async function enviarCorreoBrevo({ to, subject, html }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: "INNOVA SIGET",
        email: process.env.EMAIL_USER
      },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

/* =========================
   LISTAS BLANCAS Y ROLES
========================= */
const PERSONAL_ADMIN = [
  'direccion@teschi.edu.mx','direcciondeplaneacionyvinculacion@teschi.edu.mx',
  'direccionacademica@teschi.edu.mx','posgradoeinvestigacion@teschi.edu.mx',
  'subvinculacion@teschi.edu.mx','subservicios@teschi.edu.mx',
  'subdireccionplaneacion@teschi.edu.mx','ingenieria@teschi.edu.mx',
  'ing.quimica@teschi.edu.mx','animaciondigital@teschi.edu.mx',
  'sistemasteschi@teschi.edu.mx','licadministracion@teschi.edu.mx',
  'departamentoposgradoinvestigacion@teschi.edu.mx','serviciosocial@teschi.edu.mx',
  'departamentovinculacion@teschi.edu.mx','evaluacion@teschi.edu.mx',
  'planeacion@teschi.edu.mx','recursosmateriales@teschi.edu.mx',
  'recursosfinancieros@teschi.edu.mx','recursoshumanos@teschi.edu.mx',
  'desarrolloacademico@teschi.edu.mx','area.juridica@teschi.edu.mx',
  'ing_mecatronica@teschi.edu.mx','gastronomia@teschi.edu.mx',
  'controlescolar@teschi.edu.mx','subacademica@teschi.edu.mx',
  'difusion@teschi.edu.mx','oic@teschi.edu.mx',
  'centrodeidiomas@teschi.edu.mx','incubadoradeempresas@teschi.edu.mx',
  'sutaateschi@teschi.edu.mx','personalinnova013@gmail.com'
];

const MANTENIMIENTO = [
  'ciencias_basicas@teschi.edu.mx',
  'mantenimientoinnova088@gmail.com'
];

const DOCENTES_LISTA_BLANCA = [
  'docenteinnova074@gmail.com','guillermovarela@teschi.edu.mx',
  'mario_montiel@teschi.edu.mx','juliomendez@teschi.edu.mx',
  'juanalbertoramirez@teschi.edu.mx','josemartinez@teschi.edu.mx',
  'renevictorinolopez@teschi.edu.mx','luciotun@teschi.edu.mx',
  'bernardinosanchez@teschi.edu.mx','nicolastrejo@teschi.edu.mx',
  'marcollinas@teschi.edu.mx','jose_hernandez_santiago@teschi.edu.mx',
  'adriangarduno@teschi.edu.mx','allangomez@teschi.edu.mx',
  'sharonsolis@teschi.edu.mx','anuarmalcon@teschi.edu.mx',
  'gumesindoflores@teschi.edu.mx','alejandrojavierrivera@teschi.edu.mx',
  'heribertoflores@teschi.edu.mx','zitaalvarez@teschi.edu.mx',
  'abrahamjorge@teschi.edu.mx','yolandacastro@teschi.edu.mx'
];

function detectarRol(email) {
  email = email.toLowerCase().trim();
  if (MANTENIMIENTO.includes(email)) return 'TECNICO';
  if (PERSONAL_ADMIN.includes(email)) return 'PERSONAL';
  if (DOCENTES_LISTA_BLANCA.includes(email)) return 'DOCENTE';
  if (/^[0-9]{10}@teschi\.edu\.mx$/.test(email)) return 'ALUMNO';
  if (/^[a-z]+@teschi\.edu\.mx$/.test(email)) return 'DOCENTE';
  return null;
}

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

/* =========================
   AUTENTICACIÓN
========================= */

router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  const db = req.db;

  const rol = detectarRol(email);
  if (!rol) return res.status(403).json({ message: 'Correo no autorizado' });
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ message: 'Contraseña débil' });
  }

  const hash = await bcrypt.hash(password, 10);
  db.query(
    'INSERT INTO usuarios (nombre, email, rol, password) VALUES (?, ?, ?, ?)',
    [nombre, email, rol, hash],
    (err) => {
      if (err) return res.status(400).json({ message: 'Correo ya registrado' });
      res.status(200).json({ message: 'Registro exitoso' });
    }
  );
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  req.db.query(
    'SELECT * FROM usuarios WHERE email = ?',
    [email],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }

      const user = results[0];
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: 'Credenciales incorrectas' });

      req.session.user = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      };

      res.status(200).json({ message: 'Login exitoso', rol: user.rol });
    }
  );
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

/* =========================
   RECUPERACIÓN DE CONTRASEÑA
========================= */

router.get('/recuperar-contrasena', (req, res) => {
  res.render('recuperar-contrasena', { error: null, success: null });
});

router.post('/recuperar', (req, res) => {
  const { email } = req.body;

  req.db.query(
    'SELECT id FROM usuarios WHERE email = ?',
    [email],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.render('recuperar-contrasena', {
          success: 'Si el correo existe, recibirás instrucciones.'
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');

      req.db.query(
        'UPDATE usuarios SET reset_token = ?, reset_expira = ? WHERE email = ?',
        [token, expira, email],
        async () => {

          const link = `${process.env.BASE_URL}/auth/reset/${token}`;

          try {
            await enviarCorreoBrevo({
              to: email,
              subject: 'Recuperación de contraseña',
              html: `<p>Haz clic en el siguiente enlace:</p>
                     <a href="${link}">${link}</a>`
            });

            res.render('recuperar-contrasena', { success: 'Correo enviado' });
          } catch (error) {
            console.error('❌ BREVO ERROR:', error.message);
            res.render('recuperar-contrasena', { error: 'No se pudo enviar el correo' });
          }
        }
      );
    }
  );
});

router.get('/reset/:token', (req, res) => {
  req.db.query(
    'SELECT id FROM usuarios WHERE reset_token = ? AND reset_expira > NOW()',
    [req.params.token],
    (err, results) => {
      if (err || results.length === 0) {
        return res.render('recuperar-contrasena', { error: 'Token inválido o expirado' });
      }
      res.render('reset', { token: req.params.token });
    }
  );
});

router.post('/reset/:token', async (req, res) => {
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('reset', {
      token: req.params.token,
      error: 'Las contraseñas no coinciden'
    });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.render('reset', {
      token: req.params.token,
      error: 'Contraseña inválida'
    });
  }

  const hash = await bcrypt.hash(password, 10);

  req.db.query(
    'UPDATE usuarios SET password = ?, reset_token = NULL, reset_expira = NULL WHERE reset_token = ?',
    [hash, req.params.token],
    () => {
      res.send("<script>alert('Contraseña actualizada'); window.location='/'</script>");
    }
  );
});

module.exports = router;