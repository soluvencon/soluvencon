// ============================================================================
// SOLUVENCON - SISTEMA OPTIMIZADO CON CACHÉ (Carga instantánea)
// ============================================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbyY97LNWodV9SZM_hBMvF1vgI7oQtJkJY-HP2aJSwaS-_6Cy0dHvsk1TnOBgZ54zxvhzQ/exec';

// CONFIGURACIÓN DE CACHÉ
const CACHE_KEY = 'soluvencon_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos = carga instantánea por 10 min

// Estado del carrito
let carrito = [];

// ============================================================================
// PERSISTENCIA DEL CARRITO
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const guardado = localStorage.getItem('soluvencon_carrito');
    if (guardado) {
        try {
            carrito = JSON.parse(guardado);
            actualizarCarritoUI();
        } catch (e) {
            carrito = [];
        }
    }
});

function guardarCarrito() {
    localStorage.setItem('soluvencon_carrito', JSON.stringify(carrito));
}

// ============================================================================
// SKELETON LOADING - Placeholders animados (feedback inmediato)
// ============================================================================

function mostrarSkeleton() {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    // 8 tarjetas placeholder grises animadas
    grid.innerHTML = Array(8).fill(`
        <div class="product-card skeleton">
            <div class="skeleton-img"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        </div>
    `).join('');
}

// ============================================================================
// CACHÉ - Guardar y recuperar productos del navegador
// ============================================================================

function obtenerCache(categoria) {
    const guardado = localStorage.getItem(`${CACHE_KEY}_${categoria}`);
    if (!guardado) return null;
    
    const { productos, timestamp } = JSON.parse(guardado);
    const expirado = (Date.now() - timestamp) > CACHE_DURATION;
    
    if (expirado) {
        localStorage.removeItem(`${CACHE_KEY}_${categoria}`);
        return null;
    }
    
    return productos; // Datos válidos, menos de 10 minutos
}

function guardarCache(categoria, productos) {
    const paquete = {
        productos: productos,
        timestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_KEY}_${categoria}`, JSON.stringify(paquete));
}

// ============================================================================
// FUNCIÓN PRINCIPAL - Inicializar productos (OPTIMIZADA)
// ============================================================================

function inicializarProductos(categoria) {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    // Evitar doble carga
    if (grid.getAttribute('data-loaded') === 'true') return;
    
    // PASO 1: Mostrar skeleton inmediatamente (0ms)
    mostrarSkeleton();
    
    // PASO 2: ¿Hay caché guardada?
    const cache = obtenerCache(categoria);
    
    if (cache) {
        // ✅ INSTANTÁNEO: Mostrar datos de caché inmediatamente
        renderizarProductos(cache, categoria);
        
        // Actualizar en segundo plano (silencioso, el usuario no lo nota)
        actualizarSilenciosamente(categoria);
        return;
    }
    
    // PASO 3: No hay caché, cargar de API (solo primera vez)
    cargarDesdeAPI(categoria);
}

// ============================================================================
// CARGAR DESDE API (solo si no hay caché o expiró)
// ============================================================================

async function cargarDesdeAPI(categoria) {
    try {
        const response = await fetch(`${API_URL}?categoria=${encodeURIComponent(categoria)}`);
        if (!response.ok) throw new Error('Error en API');
        
        const productos = await response.json();
        
        if (productos.error) {
            mostrarError(productos.error);
            return;
        }
        
        // Guardar en caché para la próxima vez (instantánea)
        guardarCache(categoria, productos);
        renderizarProductos(productos, categoria);
        
    } catch (error) {
        mostrarError('Error al cargar productos. Intenta recargar.');
    }
}

// ============================================================================
// ACTUALIZACIÓN SILENCIOSA - Segundo plano (no bloquea)
// ============================================================================

async function actualizarSilenciosamente(categoria) {
    try {
        const response = await fetch(`${API_URL}?categoria=${encodeURIComponent(categoria)}`);
        const productosNuevos = await response.json();
        
        const cacheActual = obtenerCache(categoria);
        const sonIguales = JSON.stringify(cacheActual) === JSON.stringify(productosNuevos);
        
        // Solo actualizar si hay cambios reales
        if (!sonIguales) {
            guardarCache(categoria, productosNuevos);
            renderizarProductos(productosNuevos, categoria);
        }
    } catch (error) {
        console.log('Actualización silenciosa falló, usando caché');
    }
}

// ============================================================================
// RENDERIZAR PRODUCTOS - Generar HTML (tu código adaptado)
// ============================================================================

function renderizarProductos(productos, categoria) {
    const grid = document.getElementById('productos-grid');
    if (!grid) return;
    
    if (productos.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No hay productos.</p>';
        return;
    }
    
    let html = '';
    productos.forEach((p, index) => {
        // Tus URLs ya están completas en la hoja
        const imagenUrl = p.imagen_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen';
        const productoId = `prod-${categoria}-${index}`;
        
        // Generar cuadros de precio
        let cuadrosPrecio = generarCuadrosPrecio(p, productoId, imagenUrl);
        
        html += `
            <div class="product-card" id="${productoId}">
                <div class="product-img" 
                     style="background-image: url('${imagenUrl}'); background-size: cover; background-position: center;"
                     onclick="abrirModal('${imagenUrl}')"
                     title="Ver imagen completa">
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
    
    // Espaciador al final
    setTimeout(ajustarAlturaFinal, 100);
}

function generarCuadrosPrecio(p, productoId, imagenUrl) {
    if (!p.precio_unitario && !p.precio_6 && !p.precio_12) return '';
    
    let html = '<div class="precios-mayoristas">';
    
    // 1 UND
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
    
    // 6 UND
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
    
    // 12 UND
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

function mostrarError(mensaje) {
    const grid = document.getElementById('productos-grid');
    if (grid) {
        grid.innerHTML = `<p style="text-align: center; grid-column: 1/-1; color: #dc3545; padding: 2rem;"><i class="fas fa-exclamation-circle"></i> ${mensaje}</p>`;
    }
}

// ============================================================================
// TUS FUNCIONES AUXILIARES (sin cambios)
// ============================================================================

function escapeString(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

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
    
    let num = parseFloat(limpio);
    return isNaN(num) ? '0' : num.toString();
}

function formatearPrecioColombiano(textoPrecio) {
    if (!textoPrecio) return '0';
    
    let limpio = textoPrecio
        .replace(/(?:^|\s)(1|6|12)\s*UND\s*X?\s*/gi, '')
        .replace(/[$\s]/g, '')
        .trim();
    
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(limpio) || /^\d{1,3}(\.\d{3})*$/.test(limpio)) {
        return limpio;
    }
    
    if (limpio.includes(',')) {
        let partes = limpio.split(',');
        let enteros = partes[0].replace(/\./g, '');
        let decimales = partes[1];
        enteros = parseInt(enteros).toLocaleString('es-CO').replace(/,/g, '.');
        return enteros + ',' + decimales;
    }
    
    let num = parseInt(limpio.replace(/\./g, ''));
    if (isNaN(num)) return '0';
    
    return num.toLocaleString('es-CO').replace(/,/g, '.');
}

function formatoColombiano(numero) {
    let num = parseFloat(numero);
    if (isNaN(num)) return '0';
    
    let enteros = Math.floor(num);
    let decimales = Math.round((num - enteros) * 100);
    
    let enterosFormateados = enteros.toLocaleString('es-CO').replace(/,/g, '.');
    
    if (decimales > 0) {
        return enterosFormateados + ',' + decimales.toString().padStart(2, '0');
    }
    
    return enterosFormateados;
}

// ============================================================================
// FUNCIONES DEL CARRITO (sin cambios)
// ============================================================================

function agregarAlCarrito(productoId, nombre, imagen, cantidadPack, precioNumero, precioUnitario, codigo) {
    const existente = carrito.find(item => 
        item.nombre === nombre && item.cantidadPack === cantidadPack
    );
    
    if (existente) {
        existente.cantidadPacks++;
    } else {
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
    
    // Feedback visual
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

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarCarritoUI();
}

function actualizarCarritoUI() {
    const botonCarrito = document.getElementById('carrito-boton');
    const contador = document.getElementById('carrito-contador');
    const itemsContainer = document.getElementById('carrito-items');
    const totalElement = document.getElementById('carrito-total');
    
    if (!botonCarrito) return;
    
    const totalPacks = carrito.reduce((sum, item) => sum + item.cantidadPacks, 0);
    
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
    
    const url = `https://wa.me/573005005306?text=${mensaje}`;
    window.open(url, '_blank');
}

// ============================================================================
// MODAL
// ============================================================================

function abrirModal(urlImagen) {
    if (!urlImagen || urlImagen.includes('placeholder')) return;
    
    const modal = document.getElementById('modalImagen');
    const img = document.getElementById('imgModal');
    
    if (!modal || !img) return;
    
    img.src = urlImagen;
    modal.classList.add('activo');
    document.body.style.overflow = 'hidden';
}

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

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModal();
        const panel = document.getElementById('carrito-panel');
        if (panel && panel.classList.contains('activo')) {
            toggleCarrito();
        }
    }
});

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