const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

/* =========================
   CONFIGURAR CORREO
========================= */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 30000,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP ERROR:', error.message);
  } else {
    console.log('✅ SMTP LISTO');
  }
});

/* =========================
   SOLICITAR RECUPERACIÓN
========================= */
router.post('/recuperar', (req, res) => {
  const { email } = req.body;
  const db = req.db;

  db.query(
    'SELECT id FROM usuarios WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.render('recuperar-contrasena', { error: 'Error interno' });
      }

      if (results.length === 0) {
        return res.render('recuperar-contrasena', {
          success: 'Si el correo está registrado, recibirás un enlace.'
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');

      db.query(
        'UPDATE usuarios SET reset_token = ?, reset_expira = ? WHERE email = ?',
        [token, expira, email],
        async () => {

          // ✅ AHORA EXISTE
          const link = `${process.env.BASE_URL}/api/reset/${token}`;

          try {
            await transporter.sendMail({
              from: `"INNOVA SIGET" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: 'Recuperación de contraseña',
              html: `
                <p>Haz clic en el enlace para restablecer tu contraseña:</p>
                <a href="${link}">${link}</a>
              `
            });

            res.render('recuperar-contrasena', {
              success: 'Revisa tu correo para continuar.'
            });

          } catch (e) {
            console.error('❌ SMTP:', e);
            res.render('recuperar-contrasena', {
              error: 'No se pudo enviar el correo'
            });
          }
        }
      );
    }
  );
});

/* =========================
   FORMULARIO RESET
========================= */
router.get('/reset/:token', (req, res) => {
  const db = req.db;

  db.query(
    'SELECT id FROM usuarios WHERE reset_token = ? AND reset_expira > NOW()',
    [req.params.token],
    (err, results) => {
      if (err || results.length === 0) {
        return res.render('recuperar-contrasena', {
          error: 'Enlace inválido o expirado'
        });
      }
      res.render('reset', { token: req.params.token });
    }
  );
});

/* =========================
   GUARDAR NUEVA PASSWORD
========================= */
router.post('/reset/:token', async (req, res) => {
  const { password, confirmPassword } = req.body;
  const db = req.db;

  if (password !== confirmPassword) {
    return res.render('reset', {
      token: req.params.token,
      error: 'Las contraseñas no coinciden'
    });
  }

  const hash = await bcrypt.hash(password, 10);

  db.query(
    'UPDATE usuarios SET password = ?, reset_token = NULL, reset_expira = NULL WHERE reset_token = ?',
    [hash, req.params.token],
    () => {
      res.send("<script>alert('Contraseña actualizada'); window.location='/'</script>");
    }
  );
});

module.exports = router;