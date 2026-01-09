const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

/* =========================
   CONFIGURAR CORREO (SMTP GMAIL)
========================= */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verificación SMTP (solo log)
transporter.verify(err => {
  if (err) console.error('❌ SMTP error:', err.message);
  else console.log('✅ SMTP listo');
});

/* =========================
   EXPRESIÓN CONTRASEÑA
========================= */
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

/* =========================
   RECUPERAR CONTRASEÑA
========================= */

router.get('/recuperar-contrasena', (req, res) => {
  res.render('recuperar-contrasena', { error: null, success: null });
});

router.post('/recuperar', (req, res) => {
  const { email } = req.body;

  req.db.query(
    'SELECT id FROM usuarios WHERE email = ?',
    [email],
    (err, results) => {

      // Siempre responder igual (seguridad)
      if (err || results.length === 0) {
        return res.render('recuperar-contrasena', {
          success: 'Si el correo existe, recibirás instrucciones.'
        });
      }

      // 🔐 Generar token
      const token = crypto.randomBytes(32).toString('hex');

      // ⏰ Expira en 1 hora (USANDO MYSQL, NO JS)
      req.db.query(
        `
        UPDATE usuarios
        SET reset_token = ?, 
            reset_expira = DATE_ADD(NOW(), INTERVAL 1 HOUR)
        WHERE email = ?
        `,
        [token, email],
        async err => {
          if (err) {
            console.error('❌ Error guardando token:', err);
            return res.render('recuperar-contrasena', {
              error: 'Error interno'
            });
          }

          // 🔗 Link ABSOLUTO CORRECTO
          const baseUrl = process.env.BASE_URL;
          if (!baseUrl) {
            console.error('❌ BASE_URL NO DEFINIDA');
            return res.render('recuperar-contrasena', {
              error: 'Configuración del servidor incompleta'
            });
          }

          const link = `${baseUrl}/auth/reset/${token}`;
          console.log('🔗 Reset link:', link);

          try {
            await transporter.sendMail({
              from: `"INNOVA SIGET" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: 'Recuperación de contraseña',
              html: `
                <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
                <a href="${link}">${link}</a>
                <p>Este enlace expira en 1 hora.</p>
              `
            });

            res.render('recuperar-contrasena', {
              success: 'Correo enviado correctamente'
            });

          } catch (e) {
            console.error('❌ Error enviando correo:', e);
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
   RESET FORM
========================= */

router.get('/reset/:token', (req, res) => {
  req.db.query(
    `
    SELECT id 
    FROM usuarios 
    WHERE reset_token = ? 
      AND reset_expira > NOW()
    `,
    [req.params.token],
    (err, results) => {
      if (err || results.length === 0) {
        return res.render('reset', { token: null });
      }
      res.render('reset', { token: req.params.token });
    }
  );
});

/* =========================
   GUARDAR NUEVA CONTRASEÑA
========================= */

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
    `
    UPDATE usuarios
    SET password = ?, reset_token = NULL, reset_expira = NULL
    WHERE reset_token = ?
    `,
    [hash, req.params.token],
    () => {
      res.send("<script>alert('Contraseña actualizada'); window.location='/'</script>");
    }
  );
});

module.exports = router;