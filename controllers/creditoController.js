// controllers/creditoController.js

const Credito = require('../models/creditoModel');
const nodemailer = require('nodemailer');
const db = require('../config/db');


// =====================================================
// CONFIGURACIÓN DEL SMTP (NODEMAILER)
// =====================================================

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


// =====================================================
// HELPER NOTIFICACIONES POR CORREO
// =====================================================

function enviarCorreoNotificacion(emailDestino, nombreCliente, estado, idCredito) {

    const esAprobado = String(estado).toLowerCase() === 'aprobado';
    const colorEstado = esAprobado ? '#2ecc71' : '#e74c3c';

    const asunto = esAprobado
        ? `🎉 ¡Tu crédito Brocash N° ${idCredito} ha sido APROBADO!`
        : `Actualización sobre tu solicitud de crédito Brocash N° ${idCredito}`;

    const plantillaHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border-top: 5px solid ${colorEstado};">

                <h2 style="color: #2ecc71; margin-top: 0; font-size: 24px;">
                    Brocash
                </h2>

                <p style="color: #333333; font-size: 16px;">
                    Hola <strong>${nombreCliente}</strong>,
                </p>

                <p style="color: #555555; font-size: 14px;">
                    Te informamos que el estado de tu solicitud de crédito N°
                    <strong>${idCredito}</strong> ha sido actualizado a:
                </p>

                <div style="text-align: center; margin: 25px 0;">
                    <span style="background-color: ${colorEstado}; color: #ffffff; padding: 10px 20px; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                        ${String(estado).toUpperCase()}
                    </span>
                </div>

                <p style="color: #555555; font-size: 14px;">
                    Puedes ingresar a la plataforma para consultar el detalle de tu cuenta.
                </p>

                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;">

                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                    © 2026 Brocash. Este es un mensaje automático.
                </p>

            </div>
        </div>
    `;

    transporter.sendMail({
        from: 'Brocash Notificaciones <no-reply@brocash.com>',
        to: emailDestino,
        subject: asunto,
        html: plantillaHtml
    }, (err, info) => {

        if (err) {
            console.error('❌ Error enviando correo:', err);
        } else {
            console.log('📧 Notificación enviada con éxito:', info.response);
        }

    });
}


// =====================================================
// HELPER JSON
// =====================================================

const esJSON = (req) => req.is('application/json');


// =====================================================
// 1. CREATE: Procesar Solicitud de Crédito
// =====================================================

exports.procesarSolicitud = (req, res) => {

    const {
        Nombre,
        Cedula,
        email,
        ocupacion,
        telefono,
        ingresos_mensuales,
        montoSolicitado,
        plazoMeses
    } = req.body;

    const fechaSolicitud =
        req.body.fechaSolicitud &&
        req.body.fechaSolicitud.trim() !== ''
            ? req.body.fechaSolicitud
            : new Date().toISOString().slice(0, 10);

    Credito.verificarPendiente(Number(Cedula), (errorVerificacion, filas) => {

        if (errorVerificacion) {

            console.error('❌ Error verificando solicitud:', errorVerificacion);

            if (esJSON(req)) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al validar la solicitud'
                });
            }

            return res.status(500).send('Error interno');
        }

        if (filas.length > 0) {

            if (esJSON(req)) {
                return res.status(409).json({
                    ok: false,
                    mensaje: "El usuario ya tiene una solicitud 'Pendiente'"
                });
            }

            return res.send(`
                <script>
                    alert("⚠️ Ya cuentas con una solicitud 'Pendiente'. Debes esperar su evaluación.");
                    window.location.href = "javascript:history.back()";
                </script>
            `);
        }

        const nuevosDatos = {

            Cedula: Number(Cedula),

            idAnalista: 1020856325,

            ingresos: Number(ingresos_mensuales),

            montoSolicitado: Number(montoSolicitado),

            plazoMeses: Number(plazoMeses) || 12,

            estado: 'Pendiente',

            Nombre,

            email,

            ocupacion,

            telefono,

            fechaSolicitud
        };

        Credito.crear(nuevosDatos, (error, results) => {

            if (error) {

                console.error('❌ Error al guardar crédito:', error);

                if (esJSON(req)) {
                    return res.status(500).json({
                        ok: false,
                        mensaje: 'Error al procesar solicitud'
                    });
                }

                return res.send('<h2>Error al procesar la solicitud</h2>');
            }

            const idCredito = results.insertId;

            if (esJSON(req)) {

                return res.status(201).json({

                    ok: true,

                    mensaje: 'Solicitud de crédito registrada correctamente',

                    credito: {
                        idCredito,
                        Cedula: Number(Cedula),
                        estado: 'Pendiente',
                        montoSolicitado: Number(montoSolicitado)
                    }

                });
            }

            res.send(`
                <div style="text-align: center; font-family: Arial; padding-top: 50px;">

                    <h1 style="color: #2ecc71;">
                        ¡Solicitud Radicada con Éxito! 🎉
                    </h1>

                    <p>
                        Estimado/a <strong>${Nombre}</strong>,
                        tu radicado es:
                        <strong>${idCredito}</strong>
                    </p>

                    <a href="/Pagina_Principal.html"
                       style="background: #3498db; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
                        Finalizar
                    </a>

                </div>
            `);

        });

    });
};


// =====================================================
// 2. READ: Listar Créditos
// =====================================================

exports.listarCreditos = (req, res) => {

    Credito.obtenerTodos((error, rows) => {

        if (error) {

            console.error('❌ Error al obtener créditos:', error);

            return res.status(500).json({
                ok: false,
                mensaje: 'Error al obtener créditos'
            });
        }

        res.status(200).json(rows);

    });
};


// =====================================================
// 3. UPDATE: Modificar Estado, Notificar, Desembolsar
//    y Generar Cuotas
// =====================================================

exports.modificarEstado = (req, res) => {

    const idCredito = req.body.id_credito || req.body.idCredito;

    const nuevoEstado = req.body.nuevo_estado || req.body.nuevoEstado;

    if (!idCredito || !nuevoEstado) {

        return res.status(400).json({
            ok: false,
            mensaje: 'Faltan parámetros en la petición.'
        });
    }

    const queryBuscarCliente = `
        SELECT RU.EMAIL, RU.NOMBRE
        FROM credito C
        JOIN registro_usuario RU
            ON C.ID_USUARIO = RU.ID_USUARIO
        WHERE C.ID_CREDITO = ?
    `;

    db.query(queryBuscarCliente, [idCredito], (errConsulta, resultados) => {

        if (errConsulta) {
            console.error('❌ Error buscando cliente:', errConsulta);
        }

        const clienteInfo =
            (resultados && resultados.length > 0)
                ? resultados[0]
                : null;

        Credito.actualizarEstado(
            idCredito,
            nuevoEstado,
            (error) => {

                if (error) {

                    console.error('❌ Error actualizando crédito:', error);

                    return res.status(500).json({
                        ok: false,
                        mensaje: 'Error al actualizar crédito'
                    });
                }

                if (clienteInfo && clienteInfo.EMAIL) {

                    enviarCorreoNotificacion(
                        clienteInfo.EMAIL,
                        clienteInfo.NOMBRE,
                        nuevoEstado,
                        idCredito
                    );

                }

                // =========================================
                // SI EL CRÉDITO FUE APROBADO
                // =========================================

                if (String(nuevoEstado).toLowerCase() === 'aprobado') {

                    const queryBuscarCredito = `
                        SELECT
                            ID_USUARIO,
                            MONTO_SOLICITADO,
                            PLAZO_MESES
                        FROM credito
                        WHERE ID_CREDITO = ?
                    `;

                    db.query(
                        queryBuscarCredito,
                        [idCredito],
                        (errBusqueda, filas) => {

                            if (errBusqueda || filas.length === 0) {

                                console.error(
                                    '❌ Error buscando crédito para desembolso:',
                                    errBusqueda
                                );

                                return res.status(200).json({

                                    ok: true,

                                    mensaje:
                                        `Crédito N° ${idCredito} aprobado, pero falló la consulta para desembolsar.`

                                });
                            }

                            const registro = filas[0];

                            const idUsuario = registro.ID_USUARIO;

                            const montoSolicitado =
                                Number(registro.MONTO_SOLICITADO) || 0;

                            const plazoMeses =
                                Number(registro.PLAZO_MESES) || 1;


                            // =====================================
                            // A. DESEMBOLSAR
                            // =====================================

                            Credito.desembolsarDinero(
                                idUsuario,
                                montoSolicitado,
                                (errDesembolso) => {

                                    if (errDesembolso) {
                                        console.error(
                                            '❌ Error desembolsando:',
                                            errDesembolso
                                        );
                                    }


                                    // =================================
                                    // B. GENERAR CUOTAS
                                    // =================================

                                    const montoCuota =
                                        (montoSolicitado / plazoMeses)
                                            .toFixed(2);

                                    const promisesCuotas = [];


                                    for (
                                        let i = 1;
                                        i <= plazoMeses;
                                        i++
                                    ) {

                                        const fechaVencimiento =
                                            new Date();

                                        fechaVencimiento.setMonth(
                                            fechaVencimiento.getMonth() + i
                                        );

                                        const insertCuota = `
                                            INSERT INTO cuotas
                                            (
                                                ID_CREDITO,
                                                NUMERO_CUOTA,
                                                MONTO_CUOTA,
                                                FECHA_VENCIMIENTO,
                                                ESTADO
                                            )
                                            VALUES (?, ?, ?, ?, 'PENDIENTE')
                                        `;

                                        promisesCuotas.push(
                                            new Promise(
                                                (resolve, reject) => {

                                                    db.query(
                                                        insertCuota,
                                                        [
                                                            idCredito,
                                                            i,
                                                            montoCuota,
                                                            fechaVencimiento
                                                        ],
                                                        (errCuota) => {

                                                            if (errCuota) {
                                                                reject(errCuota);
                                                            } else {
                                                                resolve();
                                                            }

                                                        }
                                                    );

                                                }
                                            )
                                        );

                                    }


                                    Promise.all(promisesCuotas)

                                        .then(() => {

                                            return res.status(200).json({

                                                ok: true,

                                                mensaje:
                                                    `Crédito N° ${idCredito} APROBADO: Notificado, desembolsado y plan de cuotas generado (${plazoMeses} cuotas).`,

                                                idCredito,

                                                nuevoEstado

                                            });

                                        })

                                        .catch((errPlan) => {

                                            console.error(
                                                '❌ Error creando cuotas:',
                                                errPlan
                                            );

                                            return res.status(200).json({

                                                ok: true,

                                                mensaje:
                                                    'Crédito aprobado y desembolsado, pero hubo un error registrando las cuotas.'

                                            });

                                        });

                                }
                            );

                        }
                    );

                } else {

                    return res.status(200).json({

                        ok: true,

                        mensaje:
                            `Estado del crédito N° ${idCredito} actualizado a '${nuevoEstado}'.`

                    });

                }

            }
        );

    });
};


// =====================================================
// 4. DELETE: Borrar Crédito
// =====================================================

exports.borrarCredito = (req, res) => {

    const idCredito =
        req.params.id ||
        req.body.idCredito ||
        req.body.id_credito;

    Credito.eliminar(idCredito, (error) => {

        if (error) {

            console.error('❌ Error eliminando crédito:', error);

            return res.status(500).json({
                ok: false,
                mensaje: 'Error al eliminar el crédito'
            });
        }

        return res.status(200).json({

            ok: true,

            mensaje: 'Crédito eliminado correctamente',

            idCredito

        });

    });
};


// =====================================================
// 5. READ: Consultar Estado y Cuotas por Cédula
// =====================================================

exports.obtenerEstadoUsuario = (req, res) => {

    const { cedula } = req.params;

    console.log(
        `📡 Consultando estado de crédito para cédula: ${cedula}`
    );


    const queryEstadoConCuotas = `
        SELECT
            C.ID_CREDITO,
            C.ESTADO AS ESTADO_CREDITO,
            C.MONTO_SOLICITADO,
            C.PLAZO_MESES,
            Q.ID_CUOTA,
            Q.NUMERO_CUOTA,
            Q.MONTO_CUOTA,
            Q.FECHA_VENCIMIENTO,
            Q.ESTADO AS ESTADO_CUOTA,
            Q.FECHA_PAGO
        FROM credito C
        JOIN registro_usuario RU
            ON C.ID_USUARIO = RU.ID_USUARIO
        LEFT JOIN cuotas Q
            ON C.ID_CREDITO = Q.ID_CREDITO
        WHERE RU.ID_USUARIO = ?
        ORDER BY
            C.ID_CREDITO DESC,
            Q.NUMERO_CUOTA ASC
    `;


    db.query(
        queryEstadoConCuotas,
        [Number(cedula)],
        (error, filas) => {

            // =========================================
            // MOSTRAR ERROR REAL
            // =========================================

            if (error) {

                console.error(
                    '❌ ERROR ESTADO CREDITO:',
                    error
                );

                return res.status(500).json({

                    ok: false,

                    mensaje: 'Error al consultar estado',

                    error: error.message

                });
            }


            // =========================================
            // NO EXISTE CRÉDITO
            // =========================================

            if (filas.length === 0) {

                return res.status(200).json({

                    tieneCredito: false,

                    mensaje:
                        'No existe solicitud para la cédula indicada'

                });

            }


            // =========================================
            // TOMAR PRIMER REGISTRO
            // =========================================

            const primerRegistro = filas[0];


            // =========================================
            // ARMAR CUOTAS
            // =========================================

            const cuotas = filas

                .filter(row => row.ID_CUOTA !== null)

                .map(row => ({

                    idCuota: row.ID_CUOTA,

                    numeroCuota: row.NUMERO_CUOTA,

                    montoCuota: row.MONTO_CUOTA,

                    fechaVencimiento:
                        row.FECHA_VENCIMIENTO,

                    estadoCuota:
                        row.ESTADO_CUOTA,

                    fechaPago:
                        row.FECHA_PAGO

                }));


            // =========================================
            // RESPUESTA
            // =========================================

            res.status(200).json({

                tieneCredito: true,

                idCredito:
                    primerRegistro.ID_CREDITO,

                estado:
                    primerRegistro.ESTADO_CREDITO,

                montoSolicitado:
                    primerRegistro.MONTO_SOLICITADO,

                plazoMeses:
                    primerRegistro.PLAZO_MESES,

                cuotas

            });

        }
    );

};