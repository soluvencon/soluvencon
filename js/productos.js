// ============================================================================
// SOLUVENCON - SISTEMA DE PRODUCTOS + CARRITO COMPLETO (CON PERSISTENCIA)
// ============================================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbyPOK4AA1z-NtnzJF6HyyVBBiZnbjhwNoTbnqsZ-X-Oj8ggJ5bSCHSu3_2M2lnWfxbQdw/exec';

// Estado del carrito
let carrito = [];

// ============================================================================
// PERSISTENCIA - Cargar carrito al iniciar cualquier página
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const guardado = localStorage.getItem('soluvencon_carrito');
    if (guardado) {
        try {
            carrito = JSON.parse(guardado);
            console.log('🛒 Carrito recuperado:', carrito.length, 'items');
            actualizarCarritoUI(); // Muestra la bolita si hay items guardados
        } catch (e) {
            console.error('Error cargando carrito:', e);
            carrito = [];
        }
    }
});

function guardarCarrito() {
    localStorage.setItem('soluvencon_carrito', JSON.stringify(carrito));
    console.log('💾 Carrito guardado');
}

// ============================================================================
// FUNCIONES DE IMÁGENES (Drive)
// ============================================================================

function convertirURLDrive(url) {
    if (!url) return 'https://via.placeholder.com/300x200?text=Sin+Imagen';
    
    if (url.includes('drive.google.com/uc?export=view') || 
        url.includes('githubusercontent.com') ||
        url.includes('raw.githubusercontent.com')) {
        return url;
    }
    
    let id = '';
    if (url.includes('/d/')) {
        id = url.split('/d/')[1].split('/')[0];
    } else if (url.includes('id=')) {
        id = url.split('id=')[1].split('&')[0];
    } else if (url.includes('/file/d/')) {
        id = url.split('/file/d/')[1].split('/')[0];
    }
    
    if (id) {
        return `https://drive.google.com/uc?export=view&id=${id}`;
    }
    
    return url;
}

// ============================================================================
// CARGAR PRODUCTOS
// ============================================================================

function inicializarProductos(categoria) {
    const grid = document.getElementById('productos-grid');
    
    if (!grid) {
        console.error('No se encontró #productos-grid');
        return;
    }
    
    if (grid.getAttribute('data-loaded') === 'true') return;
    
    grid.innerHTML = `
        <div style="text-align: center; padding: 3rem; grid-column: 1/-1;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
            <p>Cargando productos...</p>
        </div>
    `;
    
    fetch(`${API_URL}?categoria=${encodeURIComponent(categoria)}`)
        .then(response => {
            if (!response.ok) throw new Error('Error en la respuesta');
            return response.json();
        })
        .then(productos => {
            if (productos.error) {
                grid.innerHTML = `<p style="text-align: center; grid-column: 1/-1;">${productos.error}</p>`;
                return;
            }
            
            if (productos.length === 0) {
                grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No hay productos.</p>';
                return;
            }
            
            let html = '';
            productos.forEach((p, index) => {
                const imagenUrl = convertirURLDrive(p.imagen_url);
                const productoId = `prod-${categoria}-${index}`;
                
                let cuadrosPrecio = '';
                if (p.precio_unitario || p.precio_6 || p.precio_12) {
                    cuadrosPrecio = `<div class="precios-mayoristas">`;
                    
                    if (p.precio_unitario && p.precio_unitario.trim() !== '' && !p.precio_unitario.toUpperCase().includes('NO')) {
                        const precio1Formateado = formatearPrecioColombiano(p.precio_unitario);
                        const precio1Numero = extraerNumero(p.precio_unitario);
                        cuadrosPrecio += `
                            <div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 1, '${precio1Numero}', '${p.precio_unitario}')" style="cursor: pointer;">
                                <span class="cantidad">1 UND</span>
                                <span class="valor">$${precio1Formateado}</span>
                            </div>
                        `;
                    }
                    
                    if (p.precio_6 && p.precio_6.trim() !== '' && !p.precio_6.toUpperCase().includes('NO')) {
                        const precio6Formateado = formatearPrecioColombiano(p.precio_6);
                        const precio6Numero = extraerNumero(p.precio_6);
                        cuadrosPrecio += `
                            <div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 6, '${precio6Numero}', '${p.precio_unitario}')" style="cursor: pointer;">
                                <span class="cantidad">6 UND</span>
                                <span class="valor">$${precio6Formateado}</span>
                            </div>
                        `;
                    }
                    
                    if (p.precio_12 && p.precio_12.trim() !== '' && !p.precio_12.toUpperCase().includes('NO')) {
                        const precio12Formateado = formatearPrecioColombiano(p.precio_12);
                        const precio12Numero = extraerNumero(p.precio_12);
                        cuadrosPrecio += `
                            <div class="caja-precio" onclick="agregarAlCarrito('${productoId}', '${escapeString(p.nombre)}', '${imagenUrl}', 12, '${precio12Numero}', '${p.precio_unitario}')" style="cursor: pointer;">
                                <span class="cantidad">12 UND</span>
                                <span class="valor">$${precio12Formateado}</span>
                            </div>
                        `;
                    }
                    
                    cuadrosPrecio += `</div>`;
                }
                
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
        })
        .catch(error => {
            console.error('Error:', error);
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: red;">Error al cargar productos.</p>';
        });
}

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
// FUNCIONES DEL CARRITO
// ============================================================================

function agregarAlCarrito(productoId, nombre, imagen, cantidadPack, precioNumero, precioUnitario) {
    console.log(`🛒 Agregando: ${nombre} - ${cantidadPack}UND - $${precioNumero}`);
    
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
            precioUnitario: precioUnitario
        });
    }
    
    const card = document.getElementById(productoId);
    if (card) {
        const botones = card.querySelectorAll('.caja-precio');
        botones.forEach(btn => {
            if (btn.textContent.includes(cantidadPack + ' UND')) {
                btn.style.background = 'var(--secondary)';
                btn.style.color = 'white';
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.style.transform = '';
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
        
        // GUARDAR carrito vacío
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
    
    // 💾 ESTA ES LA LÍNEA CLAVE - Guarda en el navegador cada cambio
    guardarCarrito();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    
    if (confirm('¿Estás seguro de que deseas vaciar todo el carrito?')) {
        carrito = [];
        actualizarCarritoUI();
        console.log('🗑️ Carrito vaciado');
    }
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
        mensaje += `   ${item.cantidadPacks} × ${item.cantidadPack} UND = $${subtotalFormateado}%0A%0A`;
    });
    
    mensaje += `%0A*💰 Total: $${formatoColombiano(total)}*%0A%0A`;
    mensaje += 'Por favor confirmar disponibilidad. ¡Gracias!';
    
    const telefono = '573005005306';
    const url = `https://wa.me/${telefono}?text=${mensaje}`;
    
    console.log('📱 Enviando a WhatsApp:', url);
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