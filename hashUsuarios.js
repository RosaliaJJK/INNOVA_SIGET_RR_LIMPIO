const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function actualizarHashes() {
  try {
    // Traer todos los usuarios
    const [usuarios] = await db.execute("SELECT id, password FROM usuarios");

    for (const user of usuarios) {
      // Solo actualizar si no está hasheada
      if (!user.password.startsWith("$2")) {
        const hashed = await bcrypt.hash(user.password, 10);
        await db.execute("UPDATE usuarios SET password = ? WHERE id = ?", [hashed, user.id]);
        console.log(`Usuario ${user.id} actualizado`);
      }
    }

    console.log("Todas las contraseñas antiguas han sido hasheadas.");
    process.exit(0);
  } catch (err) {
    console.error("Error actualizando contraseñas:", err);
    process.exit(1);
  }
}

actualizarHashes();
