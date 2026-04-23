/**
 * ============================================================================
 * SOLUVENCON - Sistema de Productos con Caché y Optimización LCP
 * Adaptado para SPA (Single Page Application) con pestañas fijas
 * ============================================================================
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbyY97LNWodV9SZM_hBMvF1vgI7oQtJkJY-HP2aJSwaS-_6Cy0dHvsk1TnOBgZ54zxvhzQ/exec';

// ============================================================================
// CONFIGURACIÓN DE CACHÉ
// ============================================================================
const CACHE_KEY = 'soluvencon_cache';
const CACHE_DURATION = 10 * 60 * 1000;

// ============================================================================
// ESTADO GLOBAL
// ============================================================================
let carrito = [];

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    const guardado = localStorage.getItem('soluvencon_carrito');
    if (guardado) {
        try {
            carrito = JSON.parse(guardado);
            actualizarCarritoUI();
        } catch (e) {
            console.error('Error cargando carrito:', e);
            carrito = [];
        }
    }
});

function guardarCarrito() {
    localStorage.setItem('soluvencon_carrito', JSON.stringify(carrito));
}

// ============================================================================
// SKELETON LOADING
// ============================================================================
function mostrarSkeleton() {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    grid.innerHTML = Array(8).fill(`
        <div class="product-card skeleton">
            <div class="skeleton-img"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        </div>
    `).join('');
}

// ============================================================================
// SISTEMA DE CACHÉ
// ============================================================================
function obtenerCache(categoria) {
    const guardado = localStorage.getItem(`${CACHE_KEY}_${categoria}`);
    if (!guardado) return null;
    const { productos, timestamp } = JSON.parse(guardado);
    if ((Date.now() - timestamp) > CACHE_DURATION) {
        localStorage.removeItem(`${CACHE_KEY}_${categoria}`);
        return null;
    }
    return productos;
}

function guardarCache(categoria, productos) {
    localStorage.setItem(`${CACHE_KEY}_${categoria}`, JSON.stringify({ productos, timestamp: Date.now() }));
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================
function inicializarProductos(categoria) {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    // CAMBIO CLAVE: Ahora verificamos si la categoría que ya está cargada es la misma que piden
    // Si el señor toca "Herramientas" y ya está en herramientas, no hacemos nada
    if (grid.getAttribute('data-loaded') === categoria) return;
    
    // Si toca otra categoría, reiniciamos el grid
    grid.setAttribute('data-loaded', 'false');
    mostrarSkeleton();
    
    const cache = obtenerCache(categoria);
    if (cache) {
        renderizarProductos(cache, categoria);
        actualizarSilenciosamente(categoria);
        return;
    }
    cargarDesdeAPI(categoria);
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================
async function cargarDesdeAPI(categoria) {
    try {
        const response = await fetch(`${API_URL}?categoria=${encodeURIComponent(categoria)}`);
        if (!response.ok) throw new Error('Error en respuesta API');
        const productos = await response.json();
        if (productos.error) { mostrarError(productos.error); return; }
        guardarCache(categoria, productos);
        renderizarProductos(productos, categoria);
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarError('Error al cargar productos. Intenta recargar la página.');
    }
}

async function actualizarSilenciosamente(categoria) {
    try {
        const response = await fetch(`${API_URL}?categoria=${encodeURIComponent(categoria)}`);
        const productosNuevos = await response.json();
        const cacheActual = obtenerCache(categoria);
        if (JSON.stringify(cacheActual) !== JSON.stringify(productosNuevos)) {
            guardarCache(categoria, productosNuevos);
            renderizarProductos(productosNuevos, categoria);
        }
    } catch (error) { console.log('Actualización silenciosa falló (se usa caché)'); }
}

// ============================================================================
// RENDERIZADO
// ============================================================================
function renderizarProductos(productos, categoria) {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    if (productos.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No hay productos disponibles.</p>';
        return;
    }
    
    let html = '';
    productos.forEach((p, index) => {
        const imagenUrl = p.imagen_url || 'https://via.placeholder.com/400x300?text=Sin+Imagen';
        const productoId = `prod-${categoria}-${index}`;
        const cuadrosPrecio = generarCuadrosPrecio(p, productoId, imagenUrl);
        const loadingPriority = index === 0 ? 'eager' : 'lazy';
        const fetchPriority = index === 0 ? 'high' : 'auto';
        
        html += `
            <div class="product-card" id="${productoId}">
                <div class="product-img" onclick="abrirModal('${imagenUrl}')" title="Ver imagen completa">
                    <img src="${imagenUrl}" alt="${p.nombre}" width="400" height="300"
                         loading="${loadingPriority}" fetchpriority="${fetchPriority}" decoding="async"
                         onerror="this.src='https://via.placeholder.com/400x300?text=Error+Carga'"
                         style="width:100%; height:100%; object-fit:cover; display:block;">
                    ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
                </div>
                <div class="product-info">
                    <h4>${p.nombre}</h4>
                    <div class="product-price">${p.precio_unitario || 'Consultar'}</div>
                    ${cuadrosPrecio}
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    // CAMBIO CLAVE: Guardamos el NOMBRE de la categoría cargada, no un "true"
    grid.setAttribute('data-loaded', categoria);
    setTimeout(ajustarAlturaFinal, 100);
}

function generarCuadrosPrecio(p, productoId, imagenUrl) {
    if (!p.precio_unitario && !p.precio_6 && !p.precio_12) return '';
    let html = '<div class="precios-mayoristas">';
    
    if (p.precio_unitario && !p.precio_unitario.toUpperCase().includes('NO')) {
        html += `<div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 1, '${extraerNumero(p.precio_unitario)}', '${p.precio_unitario}', '${p.codigo || ''}')">
            <span class="cantidad">1 UND</span><span class="valor">$${formatearPrecioColombiano(p.precio_unitario)}</span></div>`;
    }
    if (p.precio_6 && !p.precio_6.toUpperCase().includes('NO')) {
        html += `<div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 6, '${extraerNumero(p.precio_6)}', '${p.precio_unitario}', '${p.codigo || ''}')">
            <span class="cantidad">6 UND</span><span class="valor">$${formatearPrecioColombiano(p.precio_6)}</span></div>`;
    }
    if (p.precio_12 && !p.precio_12.toUpperCase().includes('NO')) {
        html += `<div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 12, '${extraerNumero(p.precio_12)}', '${p.precio_unitario}', '${p.codigo || ''}')">
            <span class="cantidad">12 UND</span><span class="valor">$${formatearPrecioColombiano(p.precio_12)}</span></div>`;
    }
    return html + '</div>';
}

function mostrarError(mensaje) {
    const grid = document.getElementById('productos-grid');
    if (grid) grid.innerHTML = `<div style="text-align: center; grid-column: 1/-1; padding: 3rem; color: #dc3545;"><i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>${mensaje}</p></div>`;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================
function escapeString(str) { if (!str) return ''; return str.replace(/'/g, "\\'").replace(/"/g, '\\"'); }
function extraerNumero(textoPrecio) {
    if (!textoPrecio) return '0';
    let limpio = textoPrecio.replace(/(?:^|\s)(1|6|12)\s*UND\s*X?\s*/gi, '').replace(/[$\s]/g, '').trim();
    limpio = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(/\./g, '');
    const num = parseFloat(limpio); return isNaN(num) ? '0' : num.toString();
}
function formatearPrecioColombiano(textoPrecio) {
    if (!textoPrecio) return '0';
    let limpio = textoPrecio.replace(/(?:^|\s)(1|6|12)\s*UND\s*X?\s*/gi, '').replace(/[$\s]/g, '').trim();
    if (limpio.includes(',')) { let p = limpio.split(','); let e = p[0].replace(/\./g, ''); return parseInt(e).toLocaleString('es-CO').replace(/,/g, '.') + ',' + p[1]; }
    const num = parseInt(limpio.replace(/\./g, '')); return isNaN(num) ? '0' : num.toLocaleString('es-CO').replace(/,/g, '.');
}
function formatoColombiano(numero) {
    const num = parseFloat(numero); if (isNaN(num)) return '0';
    const enteros = Math.floor(num); const decimales = Math.round((num - enteros) * 100);
    let formateado = enteros.toLocaleString('es-CO').replace(/,/g, '.');
    if (decimales > 0) formateado += ',' + decimales.toString().padStart(2, '0');
    return formateado;
}

// ============================================================================
// CARRITO DE COMPRAS
// ============================================================================
function agregarAlCarrito(productoId, nombre, imagen, cantidadPack, precioNumero, precioUnitario, codigo) {
    const existente = carrito.find(item => item.nombre === nombre && item.cantidadPack === cantidadPack);
    if (existente) { existente.cantidadPacks++; } 
    else { carrito.push({ id: Date.now() + Math.random(), nombre, imagen, cantidadPack, cantidadPacks: 1, precioPack: precioNumero, precioUnitario, codigo: codigo || 'N/A' }); }
    
    const card = document.getElementById(productoId);
    if (card) { card.querySelectorAll('.caja-precio').forEach(btn => { if (btn.textContent.includes(cantidadPack + ' UND')) { btn.style.background = 'var(--secondary)'; btn.style.color = 'white'; setTimeout(() => { btn.style.background = ''; btn.style.color = ''; }, 200); } }); }
    actualizarCarritoUI();
}

function eliminarDelCarrito(id) { carrito = carrito.filter(item => item.id !== id); actualizarCarritoUI(); }

function actualizarCarritoUI() {
    const botonCarrito = document.getElementById('carrito-boton');
    const contador = document.getElementById('carrito-contador');
    const itemsContainer = document.getElementById('carrito-items');
    const totalElement = document.getElementById('carrito-total');
    if (!botonCarrito) return;

    const totalPacks = carrito.reduce((sum, item) => sum + item.cantidadPacks, 0);
    if (carrito.length > 0) { botonCarrito.classList.add('visible'); if (contador) { contador.textContent = totalPacks; contador.classList.add('actualizado'); setTimeout(() => contador.classList.remove('actualizado'), 300); } } 
    else { botonCarrito.classList.remove('visible'); }
    if (!itemsContainer) return;

    if (carrito.length === 0) { itemsContainer.innerHTML = '<div class="carrito-vacio"><i class="fas fa-shopping-basket"></i><p>Selecciona productos para cotizar</p></div>'; if (totalElement) totalElement.textContent = '$0'; guardarCarrito(); return; }

    let html = ''; let totalGeneral = 0;
    carrito.forEach(item => {
        const precioNum = parseFloat(item.precioPack) || 0; const subtotalNum = precioNum * item.cantidadPacks; totalGeneral += subtotalNum;
        html += `<div class="carrito-item"><img src="${item.imagen}" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/60x60?text=Sin+Img'">
            <div class="carrito-item-info"><div class="carrito-item-nombre">${item.nombre}</div><div class="carrito-item-detalle">🔢 ${item.codigo || 'N/A'}<br>${item.cantidadPacks} pack × ${item.cantidadPack} UND<br><small>$${formatoColombiano(precioNum)} c/u</small></div></div>
            <div class="carrito-item-precio">$${formatoColombiano(subtotalNum)}<button class="carrito-item-eliminar" onclick="eliminarDelCarrito(${item.id})" title="Eliminar"><i class="fas fa-trash-alt"></i></button></div></div>`;
    });
    itemsContainer.innerHTML = html; if (totalElement) totalElement.textContent = '$' + formatoColombiano(totalGeneral); guardarCarrito();
}

function toggleCarrito() {
    const panel = document.getElementById('carrito-panel'); const overlay = document.getElementById('carrito-overlay'); if (!panel) return;
    const estaAbierto = panel.classList.contains('activo');
    if (estaAbierto) { panel.classList.remove('activo'); if (overlay) overlay.classList.remove('activo'); document.body.style.overflow = ''; } 
    else { panel.classList.add('activo'); if (overlay) overlay.classList.add('activo'); document.body.style.overflow = 'hidden'; }
}

function enviarCotizacion() {
    if (carrito.length === 0) return;
    let mensaje = '*🛍️ Cotización Soluvencon*%0A%0A'; let total = 0;
    carrito.forEach((item, index) => { const precioNum = parseFloat(item.precioPack) || 0; const subtotalNum = precioNum * item.cantidadPacks; total += subtotalNum; mensaje += `*${index + 1}.* ${item.nombre}%0A   🔢 Código: ${item.codigo || 'N/A'}%0A   ${item.cantidadPacks} × ${item.cantidadPack} UND = $${formatoColombiano(subtotalNum)}%0A%0A`; });
    mensaje += `%0A*💰 Total: $${formatoColombiano(total)}*%0A%0APor favor confirmar disponibilidad. ¡Gracias!`;
    window.open(`https://wa.me/573005005306?text=${mensaje}`, '_blank');
}

// ============================================================================
// MODAL DE IMÁGENES
// ============================================================================
function abrirModal(urlImagen) { if (!urlImagen || urlImagen.includes('placeholder')) return; const modal = document.getElementById('modalImagen'); const img = document.getElementById('imgModal'); if (!modal || !img) return; img.src = urlImagen; modal.classList.add('activo'); document.body.style.overflow = 'hidden'; }
function cerrarModal() { const modal = document.getElementById('modalImagen'); if (!modal) return; modal.classList.remove('activo'); document.body.style.overflow = 'auto'; setTimeout(() => { const img = document.getElementById('imgModal'); if (img) img.src = ''; }, 300); }
document.addEventListener('keydown', function(event) { if (event.key === 'Escape') { cerrarModal(); const panel = document.getElementById('carrito-panel'); if (panel && panel.classList.contains('activo')) toggleCarrito(); } });

function ajustarAlturaFinal() { const grid = document.getElementById('productos-grid'); if (grid) { const espaciador = document.createElement('div'); espaciador.style.height = '120px'; espaciador.style.width = '100%'; espaciador.style.clear = 'both'; grid.appendChild(espaciador); } }