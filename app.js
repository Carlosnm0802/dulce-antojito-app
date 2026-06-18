// DULCE ANTOJITO — app.js · Vanilla JS · localStorage

// 1. Constantes y estado
const STORAGE_KEY = 'dulceAntojito_pedidos';

const ESTADO_ICONS = {
  Pendiente:  '⏳',
  Listo:      '✅',
  Entregado:  '📦',
};

const ESTADO_SIGUIENTE = {
  Pendiente: 'Listo',
  Listo:     'Entregado',
  Entregado: null,   // ya no avanza
};

const ESTADO_BTN_LABEL = {
  Pendiente: '✅ Marcar como Listo',
  Listo:     '📦 Marcar como Entregado',
  Entregado: 'Entregado',
};

const ESTADOS_VALIDOS = new Set(['Pendiente', 'Listo', 'Entregado']);
const MODAL_FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Estado reactivo de la UI
let state = {
  pedidos:       [],   // array de objetos pedido
  filtroActivo:  'all',
  pedidoAEliminar: null,  // id del pedido en espera de confirmación
  ultimoElementoEnfocado: null,
};

// 2. Referencias al DOM
const $ = id => document.getElementById(id);

const dom = {
  // Formulario
  formToggleBtn:  $('form-toggle-btn'),
  formWrapper:    $('order-form'),
  form:           $('add-order-form'),
  clientName:     $('client-name'),
  contactPhone:   $('contact-phone'),
  dessertDesc:    $('dessert-desc'),
  deliveryAddress:$('delivery-address'),
  orderDate:      $('order-date'),
  deliveryDate:   $('delivery-date'),
  cost:           $('cost'),
  price:          $('price'),
  submitBtn:      $('submit-btn'),

  // Errores del formulario
  errClientName:  $('error-client-name'),
  errContactPhone:$('error-contact-phone'),
  errDessertDesc: $('error-dessert-desc'),
  errDeliveryAddress: $('error-delivery-address'),
  errOrderDate:   $('error-order-date'),
  errDeliveryDate:$('error-delivery-date'),
  errCost:        $('error-cost'),
  errPrice:       $('error-price'),

  // Controles
  filterBtns:     document.querySelectorAll('.filter-btn'),
  resultsCount:   $('results-count'),

  // Pedidos
  ordersContainer: $('orders-container'),
  emptyState:      $('empty-state'),

  // Modal
  deleteModal:     $('delete-modal'),
  modalBackdrop:   $('modal-backdrop'),
  modalMessage:    $('modal-message'),
  modalCancelBtn:  $('modal-cancel-btn'),
  modalConfirmBtn: $('modal-confirm-btn'),
};

// 3. Persistencia — localStorage
function cargarPedidos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(sanitizarPedido)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function guardarPedidos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pedidos));
  } catch {
    // Si el almacenamiento falla (ej. cuota llena), evitamos romper la app.
  }
}

// 4. Utilidades de fecha y dinero

function limpiarTexto(value, maxLength) {
  const limpio = String(value ?? '').trim();
  return limpio.slice(0, maxLength);
}

function fechaISOEsValida(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const fecha = new Date(`${value}T00:00:00`);
  return !Number.isNaN(fecha.getTime());
}

function numeroSeguro(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizarTelefonoParaGuardar(value) {
  return formatearTelefonoInput(value);
}

function sanitizarPedido(rawPedido) {
  if (!rawPedido || typeof rawPedido !== 'object') return null;

  const orderDate = fechaISOEsValida(String(rawPedido.orderDate ?? ''))
    ? String(rawPedido.orderDate)
    : hoyISO();

  const deliveryDateRaw = String(rawPedido.deliveryDate ?? '');
  const deliveryDate = fechaISOEsValida(deliveryDateRaw)
    ? deliveryDateRaw
    : orderDate;

  return {
    id: limpiarTexto(rawPedido.id, 60) || generarId(),
    clientName: limpiarTexto(rawPedido.clientName, 60) || 'Cliente sin nombre',
    contactPhone: normalizarTelefonoParaGuardar(rawPedido.contactPhone),
    dessertDesc: limpiarTexto(rawPedido.dessertDesc, 200) || 'Sin descripción',
    deliveryAddress: limpiarTexto(rawPedido.deliveryAddress, 220),
    orderDate,
    deliveryDate: deliveryDate < orderDate ? orderDate : deliveryDate,
    cost: numeroSeguro(rawPedido.cost),
    price: numeroSeguro(rawPedido.price),
    status: ESTADOS_VALIDOS.has(rawPedido.status) ? rawPedido.status : 'Pendiente',
    creadoEn: Number.isFinite(Number(rawPedido.creadoEn)) ? Number(rawPedido.creadoEn) : Date.now(),
  };
}

// "2025-06-15" → "15/06/2025"
function formatearFecha(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

// Hoy en formato ISO "YYYY-MM-DD" (sin zona horaria)
function hoyISO() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// true si la fecha de entrega ya pasó y el pedido no está entregado
function estaVencido(pedido) {
  if (pedido.status === 'Entregado') return false;
  return pedido.deliveryDate < hoyISO();
}

// Formato moneda MXN: 1234.5 → "$1,234.50"
function formatearDinero(num) {
  return '$' + Number(num).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 5. Validación del formulario
function limpiarErrores() {
  [
    dom.errClientName, dom.errContactPhone, dom.errDessertDesc,
    dom.errDeliveryAddress, dom.errOrderDate,
    dom.errDeliveryDate, dom.errCost, dom.errPrice
  ].forEach(el => { el.textContent = ''; });

  [
    dom.clientName, dom.contactPhone, dom.dessertDesc,
    dom.deliveryAddress, dom.orderDate,
    dom.deliveryDate, dom.cost, dom.price
  ].forEach(el => {
    el.classList.remove('is-invalid');
      el.closest('.input-money')?.classList.remove('is-invalid');
  });
}

function telefonoEsValido(phoneValue) {
  const soloDigitos = String(phoneValue).replace(/\D/g, '');
  return soloDigitos.length >= 8 && soloDigitos.length <= 13;
}

function formatearTelefonoInput(phoneValue) {
  const value = String(phoneValue ?? '');
  const startsWithPlus = value.trim().startsWith('+');
  const digits = value.replace(/\D/g, '').slice(0, 13);

  if (!digits) return '';

  let prefix = '';
  let body = digits;

  if (startsWithPlus && digits.startsWith('52') && digits.length > 2) {
    prefix = '+52 ';
    body = digits.slice(2);
  } else if (startsWithPlus) {
    prefix = '+';
  }

  if (body.length <= 2) {
    return `${prefix}${body}`;
  }

  const lada = body.slice(0, 2);
  const resto = body.slice(2);
  const grupos = resto.match(/.{1,4}/g)?.join(' ') ?? '';
  return `${prefix}${lada}${grupos ? ` ${grupos}` : ''}`;
}

function mostrarError(inputEl, errorEl, mensaje) {
  errorEl.textContent = mensaje;
  inputEl.classList.add('is-invalid');
  inputEl.closest('.input-money')?.classList.add('is-invalid');
}

function validarFormulario() {
  limpiarErrores();
  let valido = true;

  const nombre = dom.clientName.value.trim();
  if (!nombre) {
    mostrarError(dom.clientName, dom.errClientName, 'El nombre del cliente es obligatorio.');
    valido = false;
  }

  const telefono = dom.contactPhone.value.trim();
  if (!telefono) {
    mostrarError(dom.contactPhone, dom.errContactPhone, 'El teléfono de contacto es obligatorio.');
    valido = false;
  } else if (!telefonoEsValido(telefono)) {
    mostrarError(dom.contactPhone, dom.errContactPhone, 'Ingresa un teléfono válido (mínimo 8 dígitos).');
    valido = false;
  }

  const desc = dom.dessertDesc.value.trim();
  if (!desc) {
    mostrarError(dom.dessertDesc, dom.errDessertDesc, 'Describe qué encargó el cliente.');
    valido = false;
  }

  const direccion = dom.deliveryAddress.value.trim();
  if (!direccion) {
    mostrarError(dom.deliveryAddress, dom.errDeliveryAddress, 'La dirección de entrega es obligatoria.');
    valido = false;
  }

  const fechaEncargo = dom.orderDate.value;
  if (!fechaEncargo) {
    mostrarError(dom.orderDate, dom.errOrderDate, 'Indica cuándo se hizo el encargo.');
    valido = false;
  }

  const fechaEntrega = dom.deliveryDate.value;
  if (!fechaEntrega) {
    mostrarError(dom.deliveryDate, dom.errDeliveryDate, 'Indica la fecha de entrega.');
    valido = false;
  }

  if (fechaEncargo && fechaEntrega && fechaEntrega < fechaEncargo) {
    mostrarError(dom.deliveryDate, dom.errDeliveryDate, 'La entrega no puede ser antes del encargo.');
    valido = false;
  }

  const costo = parseFloat(dom.cost.value);
  if (dom.cost.value === '' || isNaN(costo) || costo < 0) {
    mostrarError(dom.cost, dom.errCost, 'Ingresa un costo válido (puede ser 0).');
    valido = false;
  }

  const precio = parseFloat(dom.price.value);
  if (dom.price.value === '' || isNaN(precio) || precio < 0) {
    mostrarError(dom.price, dom.errPrice, 'Ingresa un precio de venta válido.');
    valido = false;
  }

  return valido;
}

// 6. CRUD de pedidos
function agregarPedido(datos) {
  const nuevoPedido = {
    id:           generarId(),
    clientName:   datos.clientName,
    contactPhone: datos.contactPhone,
    dessertDesc:  datos.dessertDesc,
    deliveryAddress: datos.deliveryAddress,
    orderDate:    datos.orderDate,
    deliveryDate: datos.deliveryDate,
    cost:         parseFloat(datos.cost),
    price:        parseFloat(datos.price),
    status:       'Pendiente',
    creadoEn:     Date.now(),
  };

  state.pedidos.unshift(nuevoPedido);
  guardarPedidos();
  renderPedidos();
}

function avanzarEstado(id) {
  const pedido = state.pedidos.find(p => p.id === id);
  if (!pedido) return;

  const siguiente = ESTADO_SIGUIENTE[pedido.status];
  if (!siguiente) return;

  pedido.status = siguiente;
  guardarPedidos();
  renderPedidos();
}

function eliminarPedido(id) {
  state.pedidos = state.pedidos.filter(p => p.id !== id);
  guardarPedidos();
  renderPedidos();
}

// 7. Filtrado y ordenamiento
function obtenerPedidosFiltrados() {
  let resultado = [...state.pedidos];

  if (state.filtroActivo !== 'all') {
    resultado = resultado.filter(p => p.status === state.filtroActivo);
  }

  // Más próximos primero; entregados siempre al final
  resultado.sort((a, b) => {
    if (a.status === 'Entregado' && b.status !== 'Entregado') return 1;
    if (b.status === 'Entregado' && a.status !== 'Entregado') return -1;
    return a.deliveryDate.localeCompare(b.deliveryDate);
  });

  return resultado;
}

// 8. Render de una card
function crearCardHTML(pedido) {
  const status = ESTADOS_VALIDOS.has(pedido.status) ? pedido.status : 'Pendiente';
  const ganancia = pedido.price - pedido.cost;
  const gananciaNegativa = ganancia < 0;
  const vencido = estaVencido(pedido);
  const telefono = pedido.contactPhone ? escapeHTML(pedido.contactPhone) : 'Sin teléfono';
  const direccion = pedido.deliveryAddress ? escapeHTML(pedido.deliveryAddress) : 'Sin dirección';

  // Chip de ganancia
  const gananciaClass = gananciaNegativa ? 'profit is-negative' : 'profit';
  const gananciaLabel = gananciaNegativa ? '⚠ Pérdida' : '💰 Ganancia';

  // Botón avanzar estado
  const esEntregado = status === 'Entregado';
  const btnAvanzar = esEntregado
    ? `<button class="btn-advance" disabled aria-label="Pedido ya entregado">
         ${ESTADO_BTN_LABEL[status]}
       </button>`
    : `<button
         class="btn-advance"
         data-id="${pedido.id}"
         data-action="advance"
         aria-label="Cambiar estado a ${ESTADO_SIGUIENTE[status]}"
       >
         ${ESTADO_BTN_LABEL[status]}
       </button>`;

  return `
    <article
      class="order-card"
      data-status="${status}"
      data-id="${pedido.id}"
      role="listitem"
    >
      <div class="card-body">

        <!-- Nombre + badge de estado -->
        <div class="card-top">
          <h3 class="card-client">${escapeHTML(pedido.clientName)}</h3>
          <span class="status-badge ${status}" aria-label="Estado: ${status}">
            ${ESTADO_ICONS[status]} ${status}
          </span>
        </div>

        <!-- Descripción del postre -->
        <p class="card-desc">${escapeHTML(pedido.dessertDesc)}</p>

        <!-- Contacto y dirección -->
        <div class="card-contact">
          <p class="card-contact-item"><strong>📞 Tel:</strong> ${telefono}</p>
          <p class="card-contact-item"><strong>📍 Dir:</strong> ${direccion}</p>
        </div>

        <!-- Fechas -->
        <div class="card-dates">
          <span class="card-date-chip encargo" title="Fecha de encargo">
            📋 Encargado: ${formatearFecha(pedido.orderDate)}
          </span>
          <span class="card-date-chip entrega ${vencido ? 'is-overdue' : ''}" title="Fecha de entrega">
            ${vencido ? '🚨' : '🗓'} Entrega: ${formatearFecha(pedido.deliveryDate)}
            ${vencido ? '<span class="overdue-label">VENCIDO</span>' : ''}
          </span>
        </div>

        <!-- Finanzas -->
        <div class="card-finances">
          <div class="finance-chip cost">
            <span class="chip-label">Costo</span>
            <span class="chip-value">${formatearDinero(pedido.cost)}</span>
          </div>
          <div class="finance-chip price">
            <span class="chip-label">Precio</span>
            <span class="chip-value">${formatearDinero(pedido.price)}</span>
          </div>
          <div class="finance-chip ${gananciaClass}">
            <span class="chip-label">${gananciaLabel}</span>
            <span class="chip-value">${formatearDinero(ganancia)}</span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="card-actions">
          ${btnAvanzar}
          <button
            class="btn-delete"
            data-id="${pedido.id}"
            data-action="delete"
            aria-label="Eliminar pedido de ${escapeHTML(pedido.clientName)}"
          >
            🗑 Eliminar
          </button>
        </div>

      </div>
    </article>
  `;
}

// XSS: escapar antes de inyectar en el DOM
function escapeHTML(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

// 9. Render principal
function renderPedidos() {
  const pedidosFiltrados = obtenerPedidosFiltrados();

  const total = pedidosFiltrados.length;
  dom.resultsCount.textContent = total === 0
    ? ''
    : total === 1
      ? '1 pedido'
      : `${total} pedidos`;

  if (pedidosFiltrados.length === 0) {
    dom.emptyState.removeAttribute('hidden');
    dom.ordersContainer.innerHTML = '';

    const titulo = dom.emptyState.querySelector('.empty-title');
    const hint   = dom.emptyState.querySelector('.empty-hint');

    if (state.filtroActivo === 'all' && state.pedidos.length === 0) {
      titulo.textContent = 'No hay pedidos todavía';
      hint.textContent   = '¡Agrega tu primer pedido con el botón de arriba!';
    } else {
      titulo.textContent = `No hay pedidos "${state.filtroActivo}"`;
      hint.textContent   = 'Prueba con otro filtro.';
    }
    return;
  }

  dom.emptyState.setAttribute('hidden', '');
  dom.ordersContainer.innerHTML = pedidosFiltrados.map(crearCardHTML).join('');
}

function modalEstaAbierto() {
  return !dom.deleteModal.hasAttribute('hidden');
}

function obtenerElementosEnfocablesDelModal() {
  return Array.from(dom.deleteModal.querySelectorAll(MODAL_FOCUSABLE_SELECTOR))
    .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

function atraparTabEnModal(e) {
  if (!modalEstaAbierto() || e.key !== 'Tab') return;

  const focusables = obtenerElementosEnfocablesDelModal();
  if (focusables.length === 0) return;

  const primero = focusables[0];
  const ultimo = focusables[focusables.length - 1];
  const activo = document.activeElement;

  if (e.shiftKey && activo === primero) {
    e.preventDefault();
    ultimo.focus();
    return;
  }

  if (!e.shiftKey && activo === ultimo) {
    e.preventDefault();
    primero.focus();
  }
}

// 10. Modal de confirmación
function abrirModal(id) {
  const pedido = state.pedidos.find(p => p.id === id);
  if (!pedido) return;

  state.ultimoElementoEnfocado = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;

  state.pedidoAEliminar = id;
  dom.modalMessage.textContent = `Se eliminará el pedido de "${pedido.clientName}". Esta acción no se puede deshacer.`;
  dom.deleteModal.removeAttribute('hidden');
  dom.modalBackdrop.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  const focusables = obtenerElementosEnfocablesDelModal();
  (focusables[0] || dom.modalConfirmBtn).focus();
}

function cerrarModal() {
  state.pedidoAEliminar = null;
  dom.deleteModal.setAttribute('hidden', '');
  dom.modalBackdrop.setAttribute('hidden', '');
  document.body.style.overflow = '';

  if (state.ultimoElementoEnfocado && state.ultimoElementoEnfocado.isConnected) {
    state.ultimoElementoEnfocado.focus();
  }

  state.ultimoElementoEnfocado = null;
}

// 11. Toggle del formulario (móvil)
function toggleFormulario() {
  const estaAbierto = dom.formWrapper.classList.contains('is-open');

  if (estaAbierto) {
    dom.formWrapper.classList.remove('is-open');
    dom.formToggleBtn.setAttribute('aria-expanded', 'false');
  } else {
    dom.formWrapper.classList.add('is-open');
    dom.formToggleBtn.setAttribute('aria-expanded', 'true');
    // 50ms: esperar a que el display:block del wrapper termine de aplicarse antes de enfocar
    setTimeout(() => dom.clientName.focus(), 50);
  }
}

// 12. Eventos

dom.formToggleBtn.addEventListener('click', toggleFormulario);

// Submit del formulario
dom.form.addEventListener('submit', e => {
  e.preventDefault();

  if (!validarFormulario()) return;

  agregarPedido({
    clientName:   dom.clientName.value.trim(),
    contactPhone: normalizarTelefonoParaGuardar(dom.contactPhone.value),
    dessertDesc:  dom.dessertDesc.value.trim(),
    deliveryAddress: dom.deliveryAddress.value.trim(),
    orderDate:    dom.orderDate.value,
    deliveryDate: dom.deliveryDate.value,
    cost:         dom.cost.value,
    price:        dom.price.value,
  });

  dom.form.reset();
  limpiarErrores();

  // En móvil, cerrar el formulario después de guardar
  if (window.innerWidth < 640) {
    dom.formWrapper.classList.remove('is-open');
    dom.formToggleBtn.setAttribute('aria-expanded', 'false');
  }

  // Feedback visual en el botón
  dom.submitBtn.textContent = '¡Pedido guardado!';
  dom.submitBtn.style.background = 'var(--status-ready-bar)';
  setTimeout(() => {
    dom.submitBtn.innerHTML = '<span aria-hidden="true">✓</span> Guardar pedido';
    dom.submitBtn.style.background = '';
  }, 2000);
});

// Delegación de eventos en el grid de cards
dom.ordersContainer.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id     = btn.dataset.id;
  const accion = btn.dataset.action;

  if (accion === 'advance') {
    avanzarEstado(id);
  }

  if (accion === 'delete') {
    abrirModal(id);
  }
});

// Filtros
dom.filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    dom.filterBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });

    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');

    state.filtroActivo = btn.dataset.filter;
    renderPedidos();
  });
});

// Modal — cancelar
dom.modalCancelBtn.addEventListener('click', cerrarModal);

dom.modalConfirmBtn.addEventListener('click', () => {
  if (state.pedidoAEliminar) {
    eliminarPedido(state.pedidoAEliminar);
  }
  cerrarModal();
});

dom.modalBackdrop.addEventListener('click', cerrarModal);

document.addEventListener('keydown', e => {
  if (!modalEstaAbierto()) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    cerrarModal();
    return;
  }

  atraparTabEnModal(e);
});

dom.contactPhone.addEventListener('input', () => {
  dom.contactPhone.value = formatearTelefonoInput(dom.contactPhone.value);
});

// Limpiar error del campo en cuanto el usuario empieza a corregirlo
[dom.clientName, dom.contactPhone, dom.dessertDesc, dom.deliveryAddress, dom.orderDate, dom.deliveryDate, dom.cost, dom.price]
  .forEach(campo => {
    campo.addEventListener('input', () => {
      campo.classList.remove('is-invalid');
      campo.closest('.input-money')?.classList.remove('is-invalid');

      const errorByField = {
        'client-name': dom.errClientName,
        'contact-phone': dom.errContactPhone,
        'dessert-desc': dom.errDessertDesc,
        'delivery-address': dom.errDeliveryAddress,
        'order-date': dom.errOrderDate,
        'delivery-date': dom.errDeliveryDate,
        cost: dom.errCost,
        price: dom.errPrice,
      };

      const errorEl = errorByField[campo.id];
      if (errorEl) {
        errorEl.textContent = '';
      }
    });
  });

// 13. Inicialización
function init() {
  state.pedidos = cargarPedidos();

  // Fecha de encargo por defecto: hoy
  dom.orderDate.value = hoyISO();

  renderPedidos();
}

init();