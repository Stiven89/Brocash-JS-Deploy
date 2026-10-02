// models/creditoModel.js

const db = require('../config/db');

const Credito = {

    // =====================================================
    // 1. CREATE - Crear una nueva solicitud de crédito
    // =====================================================

    crear: (datosCredito, callback) => {

        const query = `
            INSERT INTO credito
            (
                ID_USUARIO,
                ID_ANALISTA,
                INGRESOS,
                MONTO_SOLICITADO,
                PLAZO_MESES,
                ESTADO,
                NOMBRE_COMPLETO,
                OCUPACION,
                TELEFONO,
                FECHA_SOLICITUD
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const valorMonto = Number(
            datosCredito.montoSolicitado ??
            datosCredito.montosolicitado ??
            0
        );

        const valorPlazo = Number(
            datosCredito.plazoMeses ??
            datosCredito.plazo_meses ??
            12
        );

        console.log('💰 Guardando solicitud de crédito...');
        console.log('👤 Cédula:', datosCredito.Cedula);
        console.log('💵 Monto:', valorMonto);
        console.log('📅 Plazo:', valorPlazo);

        db.query(
            query,
            [
                datosCredito.Cedula,
                datosCredito.idAnalista,
                datosCredito.ingresos,
                valorMonto,
                valorPlazo,
                datosCredito.estado || 'Pendiente',
                datosCredito.Nombre,
                datosCredito.ocupacion,
                datosCredito.telefono,
                datosCredito.fechaSolicitud
            ],
            (error, results) => {

                if (error) {

                    console.error(
                        '❌ Error INSERT crédito:',
                        error
                    );

                } else {

                    console.log(
                        '✅ Crédito guardado correctamente. ID:',
                        results.insertId
                    );

                }

                callback(error, results);
            }
        );
    },


    // =====================================================
    // 2. READ - Obtener todos los créditos para el Analista
    // =====================================================

    obtenerTodos: (callback) => {

        const query = `
            SELECT *
            FROM credito
            ORDER BY FECHA_SOLICITUD DESC
        `;

        db.query(query, callback);
    },


    // =====================================================
    // 3. UPDATE - Cambiar estado del crédito
    // =====================================================

    actualizarEstado: (idCredito, nuevoEstado, callback) => {

        const query = `
            UPDATE credito
            SET ESTADO = ?
            WHERE ID_CREDITO = ?
        `;

        db.query(
            query,
            [nuevoEstado, idCredito],
            callback
        );
    },


    // =====================================================
    // 4. DELETE - Eliminar una solicitud de crédito
    // =====================================================

    eliminar: (idCredito, callback) => {

        const query = `
            DELETE FROM credito
            WHERE ID_CREDITO = ?
        `;

        db.query(
            query,
            [idCredito],
            callback
        );
    },


    // =====================================================
    // 5. Buscar crédito por cédula
    // =====================================================

    buscarPorCedula: (cedula, callback) => {

        const query = `
            SELECT *
            FROM credito
            WHERE ID_USUARIO = ?
            ORDER BY FECHA_SOLICITUD DESC
            LIMIT 1
        `;

        db.query(
            query,
            [cedula],
            callback
        );
    },


    // =====================================================
    // 6. Verificar si tiene solicitud pendiente
    // =====================================================

    verificarPendiente: (cedulaUsuario, callback) => {

        const query = `
            SELECT *
            FROM credito
            WHERE ID_USUARIO = ?
            AND UPPER(ESTADO) = 'PENDIENTE'
        `;

        db.query(
            query,
            [cedulaUsuario],
            callback
        );
    },


    // =====================================================
    // 7. Desembolso al saldo del usuario
    // =====================================================

    desembolsarDinero: (idUsuario, monto, callback) => {

        const query = `
            UPDATE cuenta
            SET SALDO = IFNULL(SALDO, 0) + ?
            WHERE ID_USUARIO = ?
        `;

        db.query(
            query,
            [monto, idUsuario],
            callback
        );
    }

};


// =====================================================
// EXPORTAR MODELO
// =====================================================

module.exports = Credito;