# Notification Center

Sistema de gestión de notificaciones para usuarios autenticados, con envío por email, SMS y push.

## Posibles mejoras

- **Envío asíncrono con una cola.** Hoy el envío ocurre dentro de la misma petición que crea la notificación. En producción, la API publicaría un mensaje en una cola (por ejemplo Amazon SQS) y un proceso aparte haría el envío, con reintentos automáticos y una cola de mensajes fallidos. Los canales no cambiarían: solo cambia quién los invoca.
- **Verificar que el destinatario pertenece al usuario.** Hoy un usuario autenticado puede indicar cualquier destino. Un sistema real confirmaría el email o el teléfono antes de permitir envíos, para evitar el abuso como medio de spam.
- **Observabilidad.** Trazas, métricas y alertas sobre los envíos fallidos.
