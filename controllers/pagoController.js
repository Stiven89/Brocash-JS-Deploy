// controllers/pagoController.js

const db = require('../config/db');
const nodemailer = require('nodemailer');

// 1. Configuración de Nodemailer para notificaciones de pago
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Función Helper para enviar comprobante por correo
function enviarCorreoPago(emailDestino, nombreCliente, idPago, montoPagado, idCredito) {

    const asunto = `💳 Comprobante de Pago N° ${idPago} - Crédito Brocash N° ${idCredito}`;

    const plantillaHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border-top: 5px solid #2ecc71; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                <h2 style="color: #2ecc71; margin-top: 0; font-size: 24px;">
                    Brocash
                </h2>

                <p style="color: #333333; font-size: 16px;">
                    Hola <strong>${nombreCliente}</strong>,
                </p>

                <p style="color: #555555; font-size: 14px;">
                    Confirmamos la recepción de tu abono para el crédito N° <strong>${idCredito}</strong>.
                </p>

                <div style="background-color: #f8f9fa; border: 1px dashed #2ecc71; padding: 15px; border-radius: 5px; margin: 20px 0;">

                    <p style="margin: 5px 0; color: #333; font-size: 14px;">
                        <strong>N° de Pago:</strong> ${idPago}
                    </p>

                    <p style="margin: 5px 0; color: #27ae60; font-size: 16px;">
                        <strong>Monto Abonado:</strong> $${Number(montoPagado).toLocaleString('es-CO')}
                    </p>

                </div>

                <p style="color: #555555; font-size: 14px;">
                    Gracias por utilizar los servicios de Brocash.
                </p>

                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;">

                <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                    © 2026 Brocash. Mensaje generado automáticamente.
                </p>

            </div>
        </div>
    `;

    transporter.sendMail({
        from: 'Brocash Pagos <no-reply@brocash.com>',
        to: emailDestino,
        subject: asunto,
        html: plantillaHtml
    }, (err, info) => {

        if (err) {
            console.error('❌ Error al enviar correo de pago:', err);
        } else {
            console.log('📧 Comprobante de pago enviado con éxito:', info.response);
        }

    });
}


// Consultar información del crédito aprobado para Realizar_Pago.html
exports.obtenerEstadoPorId = (req, res) => {

    const { id } = req.params;

    const query = `
        SELECT C.ID_CREDITO, C.ESTADO, C.MONTO_SOLICITADO, RU.NOMBRE
        FROM credito C
        JOIN registro_usuario RU ON C.ID_USUARIO = RU.ID_USUARIO
        WHERE C.ID_CREDITO = ?`;

    db.query(query, [id], (err, resultados) => {

        if (err) {

            console.error('❌ Error al consultar crédito por ID:', err);

            return res.status(500).json({
                ok: false,
                mensaje: 'Error interno del servidor'
            });
        }

        if (resultados.length === 0) {

            return res.status(404).json({
                ok: false,
                mensaje: 'No se encontró un crédito con el número ingresado'
            });
        }

        const credito = resultados[0];

        res.status(200).json({

            ok: true,

            idCredito: credito.ID_CREDITO,

            estado: credito.ESTADO,

            montoSolicitado:
                credito.MONTO || credito.MONTO_SOLICITADO || 0,

            cuotas:
                credito.CUOTAS || credito.PLAZO || 'N/A',

            cliente: credito.NOMBRE
        });
    });
};


// Registrar pago del cliente en la tabla pago
exports.registrarPago = (req, res) => {

    const { idCredito, monto, metodo } = req.body;

    if (!idCredito || !monto || !metodo) {

        return res.status(400).json({
            ok: false,
            mensaje: 'Faltan datos requeridos (idCredito, monto, metodo).'
        });
    }

    const sqlInsert = `
        INSERT INTO pago
        (ID_CREDITO, FECHA, MONTO, METODO)
        VALUES (?, CURDATE(), ?, ?)
    `;

    db.query(
        sqlInsert,
        [idCredito, monto, metodo],
        (errInsert, resultInsert) => {

            if (errInsert) {

                console.error(
                    '❌ Error al guardar en la tabla pago:',
                    errInsert
                );

                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al registrar el pago en la base de datos'
                });
            }

            const idPago = resultInsert.insertId;

            console.log(
                `✅ Pago N° ${idPago} registrado exitosamente para el crédito N° ${idCredito}`
            );


            // Obtener el correo del usuario para enviarle el comprobante
            const sqlBuscarCliente = `
                SELECT RU.EMAIL, RU.NOMBRE
                FROM credito C
                JOIN registro_usuario RU
                    ON C.ID_USUARIO = RU.ID_USUARIO
                WHERE C.ID_CREDITO = ?`;

            db.query(
                sqlBuscarCliente,
                [idCredito],
                (errCliente, filas) => {

                    if (!errCliente && filas.length > 0) {

                        enviarCorreoPago(
                            filas[0].EMAIL,
                            filas[0].NOMBRE,
                            idPago,
                            monto,
                            idCredito
                        );
                    }

                    return res.status(200).json({

                        ok: true,

                        mensaje:
                            'Pago registrado con éxito y comprobante despachado al correo',

                        idPago
                    });

                }
            );
        }
    );
};