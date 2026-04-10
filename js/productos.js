/**
 * ============================================================================
 * SOLUVENCON - Sistema de Productos con Caché y Optimización LCP
 * ============================================================================
 * 
 * Mejoras implementadas:
 * - Caché local (10 min): Segunda visita carga en 0ms
 * - Skeleton loading: Feedback visual inmediato
 * - Optimización LCP: Usa <img> tags en lugar de background-image
 * - Preconnect a jsDelivr: Conexión anticipada al CDN actualizado
 */

// URL de la API de Google Apps Script (tu backend en Sheets)
const API_URL = 'https://script.google.com/macros/s/AKfycbyY97LNWodV9SZM_hBMvF1vgI7oQtJkJY-HP2aJSwaS-_6Cy0dHvsk1TnOBgZ54zxvhzQ/exec';

// ============================================================================
// CONFIGURACIÓN DE CACHÉ
// ============================================================================
const CACHE_KEY = 'soluvencon_cache';           // Prefijo para localStorage
const CACHE_DURATION = 10 * 60 * 1000;          // 10 minutos en milisegundos

// ============================================================================
// ESTADO GLOBAL
// ============================================================================
let carrito = [];                               // Array de items seleccionados

// ============================================================================
// INICIALIZACIÓN - Se ejecuta cuando carga cualquier página
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    // Recuperar carrito guardado de visitas anteriores
    const guardado = localStorage.getItem('soluvencon_carrito');
    if (guardado) {
        try {
            carrito = JSON.parse(guardado);
            actualizarCarritoUI();              // Mostrar contador si hay items
        } catch (e) {
            console.error('Error cargando carrito:', e);
            carrito = [];
        }
    }
});

/** Guarda el carrito actual en el navegador del cliente */
function guardarCarrito() {
    localStorage.setItem('soluvencon_carrito', JSON.stringify(carrito));
}

// ============================================================================
// SKELETON LOADING - Placeholders animados mientras carga
// ============================================================================

/**
 * Muestra tarjetas grises animadas inmediatamente (0ms)
 * Esto mejora el INP y da feedback visual al usuario
 */
function mostrarSkeleton() {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    // Crea 8 tarjetas placeholder con animación "shimmer"
    grid.innerHTML = Array(8).fill(`
        <div class="product-card skeleton">
            <div class="skeleton-img"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        </div>
    `).join('');
}

// ============================================================================
// SISTEMA DE CACHÉ - Para carga instantánea en visitas repetidas
// ============================================================================

/**
 * Verifica si hay datos guardados recientes (menos de 10 min)
 * @param {string} categoria - Nombre de la categoría (ej: 'Accesorios')
 * @returns {array|null} - Productos guardados o null si expiró
 */
function obtenerCache(categoria) {
    const guardado = localStorage.getItem(`${CACHE_KEY}_${categoria}`);
    if (!guardado) return null;
    
    const { productos, timestamp } = JSON.parse(guardado);
    const ahora = Date.now();
    
    // Verificar si pasaron más de 10 minutos
    if ((ahora - timestamp) > CACHE_DURATION) {
        localStorage.removeItem(`${CACHE_KEY}_${categoria}`);
        return null; // Cache expirada
    }
    
    return productos; // Cache válida
}

/**
 * Guarda productos en el navegador del cliente
 * @param {string} categoria - Nombre de la categoría
 * @param {array} productos - Array de objetos producto
 */
function guardarCache(categoria, productos) {
    const paquete = {
        productos: productos,
        timestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_KEY}_${categoria}`, JSON.stringify(paquete));
}

// ============================================================================
// FUNCIÓN PRINCIPAL - Punto de entrada
// ============================================================================

/**
 * Inicializa la carga de productos para una categoría
 * Estrategia: Skeleton → Cache? → API (si es necesario)
 * 
 * @param {string} categoria - Ej: 'Accesorios', 'Herramientas', etc.
 */
function inicializarProductos(categoria) {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    // Evitar cargar dos veces si ya hay datos
    if (grid.getAttribute('data-loaded') === 'true') return;
    
    // PASO 1: Mostrar skeleton inmediatamente (mejora percepción de velocidad)
    mostrarSkeleton();
    
    // PASO 2: Verificar caché
    const cache = obtenerCache(categoria);
    
    if (cache) {
        // ✅ CACHE HIT: Mostrar inmediatamente (0ms de espera)
        renderizarProductos(cache, categoria);
        
        // Actualizar en segundo plano (silencioso, usuario no lo nota)
        actualizarSilenciosamente(categoria);
        return;
    }
    
    // PASO 3: No hay caché, toca llamar a la API (solo primera vez)
    cargarDesdeAPI(categoria);
}

// ============================================================================
// CARGA DE DATOS - Desde Google Sheets
// ============================================================================

/**
 * Llama a la API de Google Apps Script
 * Solo se ejecuta en primera visita o si expiró la caché (10 min)
 */
async function cargarDesdeAPI(categoria) {
    try {
        const response = await fetch(
            `${API_URL}?categoria=${encodeURIComponent(categoria)}`
        );
        
        if (!response.ok) throw new Error('Error en respuesta API');
        
        const productos = await response.json();
        
        if (productos.error) {
            mostrarError(productos.error);
            return;
        }
        
        // Guardar para próximas visitas (carga instantánea después)
        guardarCache(categoria, productos);
        
        // Mostrar en pantalla
        renderizarProductos(productos, categoria);
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarError('Error al cargar productos. Intenta recargar la página.');
    }
}

/**
 * Actualiza datos en segundo plano sin bloquear la UI
 * Si hay cambios nuevos en la hoja, actualiza silenciosamente
 */
async function actualizarSilenciosamente(categoria) {
    try {
        const response = await fetch(
            `${API_URL}?categoria=${encodeURIComponent(categoria)}`
        );
        const productosNuevos = await response.json();
        
        const cacheActual = obtenerCache(categoria);
        
        // Comparar si cambió algo
        const cambios = JSON.stringify(cacheActual) !== JSON.stringify(productosNuevos);
        
        if (cambios) {
            guardarCache(categoria, productosNuevos);
            renderizarProductos(productosNuevos, categoria); // Actualizar vista
        }
    } catch (error) {
        console.log('Actualización silenciosa falló (se usa caché)');
    }
}

// ============================================================================
// RENDERIZADO - Generar HTML (OPTIMIZADO PARA LCP)
// ============================================================================

/**
 * Genera las tarjetas de productos
 * 
 * ⚠️ IMPORTANTE PARA LCP: Usamos <img> tags en lugar de background-image
 * porque los navegadores pueden precargar img tags pero no background-image
 * 
 * @param {array} productos - Array de productos desde la API
 * @param {string} categoria - Nombre de categoría para IDs únicos
 */
function renderizarProductos(productos, categoria) {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    if (productos.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No hay productos disponibles.</p>';
        return;
    }
    
    let html = '';
    
    productos.forEach((p, index) => {
        // La URL viene completa desde Google Sheets (jsDelivr)
        const imagenUrl = p.imagen_url || 'https://via.placeholder.com/400x300?text=Sin+Imagen';
        const productoId = `prod-${categoria}-${index}`;
        
        // Generar botones de precios (1, 6, 12 unidades)
        const cuadrosPrecio = generarCuadrosPrecio(p, productoId, imagenUrl);
        
        // ============================================================
        // OPTIMIZACIÓN LCP CRÍTICA:
        // Usamos <img> tag con loading="eager" para la primera imagen
        // y loading="lazy" para el resto
        // ============================================================
        const loadingPriority = index === 0 ? 'eager' : 'lazy';
        const fetchPriority = index === 0 ? 'high' : 'auto';
        
        html += `
            <div class="product-card" id="${productoId}">
                <div class="product-img" onclick="abrirModal('${imagenUrl}')" title="Ver imagen completa">
                    <img src="${imagenUrl}" 
                         alt="${p.nombre}"
                         width="400" 
                         height="300"
                         loading="${loadingPriority}"
                         fetchpriority="${fetchPriority}"
                         decoding="async"
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
    grid.setAttribute('data-loaded', 'true');
    
    // Agregar espacio al final para que no tape el WhatsApp
    setTimeout(ajustarAlturaFinal, 100);
}

/**
 * Genera los botones de precios mayoristas (1, 6, 12 unidades)
 */
function generarCuadrosPrecio(p, productoId, imagenUrl) {
    if (!p.precio_unitario && !p.precio_6 && !p.precio_12) return '';
    
    let html = '<div class="precios-mayoristas">';
    
    // Botón 1 Unidad
    if (p.precio_unitario && !p.precio_unitario.toUpperCase().includes('NO')) {
        const precioFormateado = formatearPrecioColombiano(p.precio_unitario);
        const precioNumero = extraerNumero(p.precio_unitario);
        html += `
            <div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 1, '${precioNumero}', '${p.precio_unitario}', '${p.codigo || ''}')">
                <span class="cantidad">1 UND</span>
                <span class="valor">$${precioFormateado}</span>
            </div>
        `;
    }
    
    // Botón 6 Unidades
    if (p.precio_6 && !p.precio_6.toUpperCase().includes('NO')) {
        const precioFormateado = formatearPrecioColombiano(p.precio_6);
        const precioNumero = extraerNumero(p.precio_6);
        html += `
            <div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 6, '${precioNumero}', '${p.precio_unitario}', '${p.codigo || ''}')">
                <span class="cantidad">6 UND</span>
                <span class="valor">$${precioFormateado}</span>
            </div>
        `;
    }
    
    // Botón 12 Unidades
    if (p.precio_12 && !p.precio_12.toUpperCase().includes('NO')) {
        const precioFormateado = formatearPrecioColombiano(p.precio_12);
        const precioNumero = extraerNumero(p.precio_12);
        html += `
            <div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 12, '${precioNumero}', '${p.precio_unitario}', '${p.codigo || ''}')">
                <span class="cantidad">12 UND</span>
                <span class="valor">$${precioFormateado}</span>
            </div>
        `;
    }
    
    return html + '</div>';
}

/** Muestra mensaje de error amigable */
function mostrarError(mensaje) {
    const grid = document.getElementById('productos-grid');
    if (grid) {
        grid.innerHTML = `
            <div style="text-align: center; grid-column: 1/-1; padding: 3rem; color: #dc3545;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>${mensaje}</p>
            </div>
        `;
    }
}

// ============================================================================
// FUNCIONES AUXILIARES - Formateo de precios
// ============================================================================

/** Escapa comillas para evitar errores en onclick */
function escapeString(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/** Extrae número de string de precio colombiano */
function extraerNumero(textoPrecio) {
    if (!textoPrecio) return '0';
    
    let limpio = textoPrecio
        .replace(/(?:^|\s)(1|6|12)\s*UND\s*X?\s*/gi, '')
        .replace(/[$\s]/g, '')
        .trim();
    
    if (limpio.includes(',')) {
        limpio = limpio.replace(/\./g, '').replace(',', '.');
    } else {
        limpio = limpio.replace(/\./g, '');
    }
    
    const num = parseFloat(limpio);
    return isNaN(num) ? '0' : num.toString();
}

/** Formatea precio al estilo colombiano ($ 12.500) */
function formatearPrecioColombiano(textoPrecio) {
    if (!textoPrecio) return '0';
    
    let limpio = textoPrecio
        .replace(/(?:^|\s)(1|6|12)\s*UND\s*X?\s*/gi, '')
        .replace(/[$\s]/g, '')
        .trim();
    
    if (limpio.includes(',')) {
        let partes = limpio.split(',');
        let enteros = partes[0].replace(/\./g, '');
        let decimales = partes[1];
        enteros = parseInt(enteros).toLocaleString('es-CO').replace(/,/g, '.');
        return enteros + ',' + decimales;
    }
    
    const num = parseInt(limpio.replace(/\./g, ''));
    if (isNaN(num)) return '0';
    
    return num.toLocaleString('es-CO').replace(/,/g, '.');
}

/** Formatea número float a pesos colombianos */
function formatoColombiano(numero) {
    const num = parseFloat(numero);
    if (isNaN(num)) return '0';
    
    const enteros = Math.floor(num);
    const decimales = Math.round((num - enteros) * 100);
    
    let formateado = enteros.toLocaleString('es-CO').replace(/,/g, '.');
    
    if (decimales > 0) {
        formateado += ',' + decimales.toString().padStart(2, '0');
    }
    
    return formateado;
}

// ============================================================================
// CARRITO DE COMPRAS - Sistema de cotización
// ============================================================================

/**
 * Agrega producto al carrito
 * @param {string} productoId - ID único del producto
 * @param {string} nombre - Nombre del producto
 * @param {string} imagen - URL de imagen
 * @param {number} cantidadPack - Cantidad por pack (1, 6 o 12)
 * @param {string} precioNumero - Precio como número limpio
 * @param {string} precioUnitario - Texto original del precio
 * @param {string} codigo - Código del producto
 */
function agregarAlCarrito(productoId, nombre, imagen, cantidadPack, precioNumero, precioUnitario, codigo) {
    // Buscar si ya existe mismo producto con mismo pack
    const existente = carrito.find(item => 
        item.nombre === nombre && item.cantidadPack === cantidadPack
    );
    
    if (existente) {
        existente.cantidadPacks++; // Aumentar cantidad
    } else {
        // Nuevo item
        carrito.push({
            id: Date.now() + Math.random(),
            nombre: nombre,
            imagen: imagen,
            cantidadPack: cantidadPack,
            cantidadPacks: 1,
            precioPack: precioNumero,
            precioUnitario: precioUnitario,
            codigo: codigo || 'N/A'
        });
    }
    
    // Feedback visual (efecto click en el botón)
    const card = document.getElementById(productoId);
    if (card) {
        const botones = card.querySelectorAll('.caja-precio');
        botones.forEach(btn => {
            if (btn.textContent.includes(cantidadPack + ' UND')) {
                btn.style.background = 'var(--secondary)';
                btn.style.color = 'white';
                setTimeout(() => {
                    btn.style.background = '';
                    btn.style.color = '';
                }, 200);
            }
        });
    }
    
    actualizarCarritoUI();
}

/** Elimina item del carrito */
function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarCarritoUI();
}

/** Actualiza la UI del carrito (contador, lista, total) */
function actualizarCarritoUI() {
    const botonCarrito = document.getElementById('carrito-boton');
    const contador = document.getElementById('carrito-contador');
    const itemsContainer = document.getElementById('carrito-items');
    const totalElement = document.getElementById('carrito-total');
    
    if (!botonCarrito) return;
    
    const totalPacks = carrito.reduce((sum, item) => sum + item.cantidadPacks, 0);
    
    // Mostrar/ocultar botón flotante
    if (carrito.length > 0) {
        botonCarrito.classList.add('visible');
        if (contador) {
            contador.textContent = totalPacks;
            contador.classList.add('actualizado');
            setTimeout(() => contador.classList.remove('actualizado'), 300);
        }
    } else {
        botonCarrito.classList.remove('visible');
    }
    
    if (!itemsContainer) return;
    
    // Carrito vacío
    if (carrito.length === 0) {
        itemsContainer.innerHTML = `
            <div class="carrito-vacio">
                <i class="fas fa-shopping-basket"></i>
                <p>Selecciona productos para cotizar</p>
            </div>
        `;
        if (totalElement) totalElement.textContent = '$0';
        guardarCarrito();
        return;
    }
    
    // Listar items
    let html = '';
    let totalGeneral = 0;
    
    carrito.forEach(item => {
        const precioNum = parseFloat(item.precioPack) || 0;
        const subtotalNum = precioNum * item.cantidadPacks;
        totalGeneral += subtotalNum;
        
        const precioFormateado = formatoColombiano(precioNum);
        const subtotalFormateado = formatoColombiano(subtotalNum);
        
        html += `
            <div class="carrito-item">
                <img src="${item.imagen}" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/60x60?text=Sin+Img'">
                <div class="carrito-item-info">
                    <div class="carrito-item-nombre">${item.nombre}</div>
                    <div class="carrito-item-detalle">
                        🔢 ${item.codigo || 'N/A'}<br>
                        ${item.cantidadPacks} pack × ${item.cantidadPack} UND
                        <br>
                        <small>$${precioFormateado} c/u</small>
                    </div>
                </div>
                <div class="carrito-item-precio">
                    $${subtotalFormateado}
                    <button class="carrito-item-eliminar" onclick="eliminarDelCarrito(${item.id})" title="Eliminar">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    itemsContainer.innerHTML = html;
    if (totalElement) totalElement.textContent = '$' + formatoColombiano(totalGeneral);
    guardarCarrito();
}

/** Abre/cierra el panel lateral del carrito */
function toggleCarrito() {
    const panel = document.getElementById('carrito-panel');
    const overlay = document.getElementById('carrito-overlay');
    
    if (!panel) return;
    
    const estaAbierto = panel.classList.contains('activo');
    
    if (estaAbierto) {
        panel.classList.remove('activo');
        if (overlay) overlay.classList.remove('activo');
        document.body.style.overflow = '';
    } else {
        panel.classList.add('activo');
        if (overlay) overlay.classList.add('activo');
        document.body.style.overflow = 'hidden';
    }
}

/** Genera mensaje de WhatsApp y abre chat */
function enviarCotizacion() {
    if (carrito.length === 0) return;
    
    let mensaje = '*🛍️ Cotización Soluvencon*%0A%0A';
    let total = 0;
    
    carrito.forEach((item, index) => {
        const precioNum = parseFloat(item.precioPack) || 0;
        const subtotalNum = precioNum * item.cantidadPacks;
        total += subtotalNum;
        
        const subtotalFormateado = formatoColombiano(subtotalNum);
        
        mensaje += `*${index + 1}.* ${item.nombre}%0A`;
        mensaje += `   🔢 Código: ${item.codigo || 'N/A'}%0A`;
        mensaje += `   ${item.cantidadPacks} × ${item.cantidadPack} UND = $${subtotalFormateado}%0A%0A`;
    });
    
    mensaje += `%0A*💰 Total: $${formatoColombiano(total)}*%0A%0A`;
    mensaje += 'Por favor confirmar disponibilidad. ¡Gracias!';
    
    window.open(`https://wa.me/573005005306?text=${mensaje}`, '_blank');
}

// ============================================================================
// MODAL DE IMÁGENES (Lightbox)
// ============================================================================

/** Abre imagen ampliada */
function abrirModal(urlImagen) {
    if (!urlImagen || urlImagen.includes('placeholder')) return;
    
    const modal = document.getElementById('modalImagen');
    const img = document.getElementById('imgModal');
    
    if (!modal || !img) return;
    
    img.src = urlImagen;
    modal.classList.add('activo');
    document.body.style.overflow = 'hidden'; // Bloquear scroll
}

/** Cierra modal */
function cerrarModal() {
    const modal = document.getElementById('modalImagen');
    if (!modal) return;
    
    modal.classList.remove('activo');
    document.body.style.overflow = 'auto';
    
    setTimeout(() => {
        const img = document.getElementById('imgModal');
        if (img) img.src = '';
    }, 300);
}

// Cerrar modal con tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModal();
        const panel = document.getElementById('carrito-panel');
        if (panel && panel.classList.contains('activo')) {
            toggleCarrito();
        }
    }
});

/** Agrega espacio al final del grid para no tapar contenido con WhatsApp */
function ajustarAlturaFinal() {
    const grid = document.getElementById('productos-grid');
    if (grid) {
        const espaciador = document.createElement('div');
        espaciador.style.height = '120px';
        espaciador.style.width = '100%';
        espaciador.style.clear = 'both';
        grid.appendChild(espaciador);
    }
}