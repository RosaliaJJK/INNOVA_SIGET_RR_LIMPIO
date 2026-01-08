CREATE DATABASE IF NOT EXISTS innova_siget;
USE innova_siget;

-- 1. Tabla de Usuarios (Soporta Alumnos, Docentes, Técnicos y Administrativos)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('ALUMNO', 'DOCENTE', 'TECNICO', 'PERSONAL') NOT NULL, -- "PERSONAL" para administrativos
    carrera VARCHAR(100) -- Agregado para filtrar grupos en el login
);

-- 2. Clases Activas (Sincronizado con docente.ejs)
CREATE TABLE clases_activas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_docente INT,
    carrera VARCHAR(100), -- Necesario para el filtro de alumnos
    laboratorio VARCHAR(50), 
    grupo VARCHAR(20), 
    hora_inicio TIME,      -- Campo nuevo (requerido por docente.ejs)
    hora_fin TIME,         -- Campo nuevo (requerido por docente.ejs)
    fecha_apertura DATE DEFAULT (CURRENT_DATE),
    estatus ENUM('ABIERTA', 'CERRADA') DEFAULT 'ABIERTA',
    FOREIGN KEY (id_docente) REFERENCES usuarios(id)
);

-- 3. Bitácoras (Sincronizado con alumno.ejs)
CREATE TABLE bitacoras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_clase INT,
    id_alumno INT,
    equipo_numero INT NOT NULL,
    observaciones_iniciales TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_clase) REFERENCES clases_activas(id),
    FOREIGN KEY (id_alumno) REFERENCES usuarios(id)
);

-- 4. Soporte Técnico (Sincronizado con personal.ejs y mantenimiento.ejs)
CREATE TABLE tickets_soporte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(20) UNIQUE,
    id_solicitante INT,
    area_especifica VARCHAR(100), -- Ej: "Recursos Humanos", "Sistemas"
    descripcion_falla TEXT,
    tipo_incidencia VARCHAR(50),  -- Campo nuevo (Hardware, Software, Red)
    prioridad ENUM('BAJA', 'MEDIA', 'ALTA') DEFAULT 'MEDIA',
    tipo_atencion ENUM('Presencial', 'Remoto'), -- Campo nuevo (requerido por personal.ejs)
    fecha_cita DATE,               -- Campo nuevo (requerido por personal.ejs)
    turno ENUM('Matutino', 'Vespertino'), -- Campo nuevo (requerido por personal.ejs)
    estado ENUM('PENDIENTE', 'EN PROCESO', 'RESUELTO') DEFAULT 'PENDIENTE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_solicitante) REFERENCES usuarios(id)
);



/****  BASE DE DATOS ACEPTADA POR RAILWAY  *****/

SET FOREIGN_KEY_CHECKS = 0;

-- ======================
-- TABLA: usuarios
-- ======================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('ALUMNO','DOCENTE','TECNICO','PERSONAL') NOT NULL,
  carrera VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================
-- TABLA: clases_activas
-- ======================
DROP TABLE IF EXISTS clases_activas;
CREATE TABLE clases_activas (
  id INT AUTO_INCREMENT,
  id_docente INT DEFAULT NULL,
  carrera VARCHAR(100) DEFAULT NULL,
  laboratorio VARCHAR(50) DEFAULT NULL,
  grupo VARCHAR(20) DEFAULT NULL,
  hora_inicio TIME DEFAULT NULL,
  hora_fin TIME DEFAULT NULL,
  fecha_apertura DATE DEFAULT NULL,
  estatus ENUM('ABIERTA','CERRADA') DEFAULT 'ABIERTA',
  PRIMARY KEY (id),
  KEY id_docente (id_docente),
  CONSTRAINT fk_clases_docente
    FOREIGN KEY (id_docente) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================
-- TABLA: bitacoras
-- ======================
DROP TABLE IF EXISTS bitacoras;
CREATE TABLE bitacoras (
  id INT AUTO_INCREMENT,
  id_clase INT DEFAULT NULL,
  id_alumno INT DEFAULT NULL,
  equipo_numero INT NOT NULL,
  observaciones_iniciales TEXT DEFAULT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY id_clase (id_clase),
  KEY id_alumno (id_alumno),
  CONSTRAINT fk_bitacora_clase
    FOREIGN KEY (id_clase) REFERENCES clases_activas(id),
  CONSTRAINT fk_bitacora_alumno
    FOREIGN KEY (id_alumno) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================
-- TABLA: tickets_soporte
-- ======================
DROP TABLE IF EXISTS tickets_soporte;
CREATE TABLE tickets_soporte (
  id INT AUTO_INCREMENT,
  folio VARCHAR(20),
  id_solicitante INT DEFAULT NULL,
  area_especifica VARCHAR(100) DEFAULT NULL,
  descripcion_falla TEXT DEFAULT NULL,
  tipo_incidencia VARCHAR(50) DEFAULT NULL,
  prioridad ENUM('BAJA','MEDIA','ALTA') DEFAULT 'MEDIA',
  tipo_atencion ENUM('Presencial','Remoto') DEFAULT NULL,
  fecha_cita DATE DEFAULT NULL,
  turno ENUM('Matutino','Vespertino') DEFAULT NULL,
  estado ENUM('PENDIENTE','EN PROCESO','RESUELTO') DEFAULT 'PENDIENTE',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY folio (folio),
  KEY id_solicitante (id_solicitante),
  CONSTRAINT fk_ticket_usuario
    FOREIGN KEY (id_solicitante) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
