// models/usuarioModel.js
const db = require('../config/db');

const Usuario = {
    // Función para buscar un usuario por su cédula
    buscarPorCedula: (cedula, callback) => {
        const query = "SELECT ID_USUARIO, NOMBRE, EMAIL, PASSWORD, ROL FROM registro_usuario WHERE ID_USUARIO = ?";
        db.query(query, [cedula], callback);
    },

    crear: (datosUsuario, callback) => {
        const query = 'INSERT INTO registro_usuario (ID_USUARIO, NOMBRE, APELLIDO, EDAD, EMAIL, TELEFONO, PASSWORD) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(query, [
            datosUsuario.Cedula,
            datosUsuario.Nombre,
            "N/A",
            18,
            datosUsuario.email,
            datosUsuario.telefono,
            datosUsuario.password
        ], callback);
    },

    // Verifica que la cédula y el correo pertenezcan a la misma cuenta (recuperar contraseña)
    buscarPorCedulaYEmail: (cedula, email, callback) => {
        const query = "SELECT ID_USUARIO, NOMBRE FROM registro_usuario WHERE ID_USUARIO = ? AND LOWER(EMAIL) = LOWER(?)";
        db.query(query, [cedula, email], callback);
    },

    // Actualiza la contraseña del usuario
    actualizarPassword: (cedula, nuevaPassword, callback) => {
        const query = "UPDATE registro_usuario SET PASSWORD = ? WHERE ID_USUARIO = ?";
        db.query(query, [nuevaPassword, cedula], callback);
    },

    // Actualizar datos desde el perfil
    actualizarDatosPerfil: (idUsuario, nuevosDatos, callback) => {
        const query = `
            UPDATE registro_usuario
            SET NOMBRE = ?, APELLIDO = ?, EMAIL = ?, TELEFONO = ?
            WHERE ID_USUARIO = ?
        `;

        db.query(
            query,
            [
                nuevosDatos.Nombre,
                nuevosDatos.Apellido,
                nuevosDatos.email,
                nuevosDatos.telefono,
                idUsuario
            ],
            callback
        );
    }
};

module.exports = Usuario;