# Dulce Antojito — Mis Pedidos

Aplicación web para gestionar pedidos de repostería y pastelería de forma simple, visual y rápida. Permite registrar pedidos, dar seguimiento a su estado, revisar fechas de entrega y editar la información del pedido sin salir del flujo principal.

## Vista general

Este proyecto nace para resolver una necesidad real de organización en un negocio de repostería casera: centralizar pedidos, evitar olvidos y tener a la vista el avance de cada encargo.

## Funcionalidades

- Registro de pedidos con nombre del cliente, teléfono, descripción, dirección, fechas y costos.
- Seguimiento de estado: Pendiente, Listo y Entregado.
- Edición completa del pedido desde un modal de detalles.
- Validación de formularios con mensajes claros.
- Persistencia local con `localStorage`.
- Filtros por estado para encontrar pedidos más rápido.
- Cálculo automático de ganancia o pérdida por pedido.
- Indicadores de pedidos vencidos.
- Accesibilidad básica: foco visible, cierre con Escape y navegación por teclado en modales.

## Tecnologías

- HTML5
- CSS3
- JavaScript vanilla
- LocalStorage

## Decisiones técnicas

- Se usó JavaScript sin framework para mantener el proyecto ligero y fácil de entender.
- La información se guarda en el navegador para que la app funcione sin backend.
- La edición se mueve a un modal para reducir ruido visual en la tarjeta y mejorar la escalabilidad de la interfaz.
- Se priorizó una experiencia móvil primero, con controles grandes y lectura clara.

## Cómo usarlo

1. Abre el proyecto en un navegador.
2. Completa el formulario con los datos del pedido.
3. Guarda el pedido y cambia su estado cuando avance.
4. Usa el botón de detalles para editar cualquier dato del pedido.
5. Filtra por estado si quieres revisar solo pendientes, listos o entregados.

## Ejecución local

Si lo abres desde VS Code con Live Server, solo necesitas iniciar el servidor y entrar al archivo `index.html`.

Si prefieres abrirlo manualmente:

1. Abre la carpeta del proyecto.
2. Haz doble clic en `index.html`.

## Capturas

Agrega aquí tus capturas o GIFs del proyecto:

- Vista principal
- Modal de detalles
- Estado vacío
- Filtros por estado

## Aprendizajes

Este proyecto me permitió practicar:

- Manejo de estado en JavaScript sin librerías.
- Validación de formularios del lado del cliente.
- Persistencia local con `localStorage`.
- Mejora de accesibilidad en modales y formularios.
- Diseño responsive con CSS custom properties.

## Mejoras futuras

- Exportar pedidos a Excel o CSV.
- Búsqueda por cliente o fecha.
- Historial de cambios por pedido.
- Recordatorios automáticos de pedidos próximos a vencer.
- Sincronización con backend o nube.

## Autor

Proyecto personal creado por Carlos Nares.
