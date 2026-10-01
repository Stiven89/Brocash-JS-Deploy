const express = require('express');
const path = require('path');
const db = require('./config/db.js'); // 🔌 Conexión real a MySQL

// ==========================================
// 1. IMPORTACIÓN DE CONTROLADORES 
// ==========================================
const authController = require('./controllers/authController');
const creditoController = require('./controllers/creditoController');
const pagoController = require('./controllers/pagoController');

const app = express();

// ==========================================
// 2. MIDDLEWARES
// ==========================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos (HTML, CSS, JS del frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2.1. RUTA RAÍZ (HOME)
// ==========================================
app.get('/', (req, res) => {
    // Si tienes un index.html en public, lo servirá aquí. Si no, responde con status OK.
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(200).send('🚀 Servidor Brocash-JS funcionando correctamente.');
        }
    });
});

// ==========================================
// 3. RUTAS DE AUTENTICACIÓN (LOGIN/REGISTRO)
// ==========================================
app.post('/login', authController.login);
app.post('/registrar', authController.registrar);
app.post('/recuperar-password', authController.recuperarPassword);
app.post('/ActualizarPerfilServlet', authController.actualizarPerfil);

// ==========================================
// 4. RUTAS DE CRÉDITOS (CRUD)
// ==========================================
// Crear solicitud
app.post('/solicitar-credito', creditoController.procesarSolicitud);

// Obtener lista completa para el analista
app.get('/listar-creditos', creditoController.listarCreditos);

// Modificar estado (Soporta PUT del frontend y POST por compatibilidad)
app.put('/modificar-estado', creditoController.modificarEstado);
app.post('/modificar-estado', creditoController.modificarEstado);

// Eliminar crédito (Soporta DELETE con parámetro /:id y POST)
app.delete('/borrar-credito/:id', creditoController.borrarCredito);
app.delete('/borrar-credito', creditoController.borrarCredito);
app.post('/borrar-credito', creditoController.borrarCredito);

// Consultar estado por cédula del cliente
app.get('/estado-credito/:cedula', creditoController.obtenerEstadoUsuario);


// 5. RUTAS DE PAGOS
app.get('/estado-credito-id/:id', pagoController.obtenerEstadoPorId);
app.post('/registrar-pago', pagoController.registrarPago);

// ==========================================
// 6. MIDDLEWARE DE REGISTRO / MANEJO DE RUTAS NO ENCONTRADAS (404)
// ==========================================
app.use((req, res) => {
    console.log(`⚠️️ Ruta no encontrada (404): ${req.method} ${req.url}`);
    res.status(404).json({ ok: false, mensaje: `La ruta ${req.method} ${req.url} no existe en el servidor.` });
});

// ==========================================
// 7. ARRANQUE DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(`🚀 Servidor Brocash corriendo en el puerto ${PORT}`);
    console.log(`==================================================`);
});