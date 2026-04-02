# SOLUVENCON - Sitio Web de Cacharrería y Ferretería

Catálogo de productos para cacharrería, ferretería y bazar. Incluye secciones de categorías, productos destacados y enlaces a catálogo en Google Sheets y WhatsApp.

## 📁 Estructura del Proyecto

```
soluvencon/
├── index.html              # Página principal
├── accesorios.html         # Página de accesorios
├── utensilios.html         # Página de utensilios
├── herramientas.html       # Página de herramientas
├── morrales.html           # Página de morrales
├── css/
│   └── styles.css          # Estilos principales
├── js/
│   └── productos.js        # Script para cargar productos desde Google Sheets
├── images/                 # Carpeta para imágenes (vacía por ahora)
└── README.md               # Este archivo
```

## 🚀 Cómo subir a GitHub

### Paso 1: Crear un repositorio en GitHub
1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** (arriba a la derecha) → **"New repository"**
3. Escribe el nombre del repositorio (ej: `soluvencon`)
4. Deja las opciones por defecto y haz clic en **"Create repository"**

### Paso 2: Subir los archivos

#### Opción A: Subir directamente desde la web
1. En tu nuevo repositorio, haz clic en **"uploading an existing file"**
2. Arrastra todos los archivos y carpetas del proyecto
3. Escribe un mensaje de commit (ej: "Primer commit - Sitio web SOLUVENCON")
4. Haz clic en **"Commit changes"**

#### Opción B: Usar Git (recomendado)
```bash
# Abre la terminal en la carpeta del proyecto
cd soluvencon

# Inicializa Git
git init

# Agrega todos los archivos
git add .

# Crea el primer commit
git commit -m "Primer commit - Sitio web SOLUVENCON"

# Conecta con tu repositorio de GitHub (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/soluvencon.git

# Sube los archivos
git push -u origin main
```

## 🌐 Activar GitHub Pages

Para que tu sitio web sea visible en internet:

1. Ve a tu repositorio en GitHub
2. Haz clic en **"Settings"** (pestaña superior)
3. En el menú lateral izquierdo, haz clic en **"Pages"**
4. En "Source", selecciona:
   - **Branch:** `main` (o `master`)
   - **Folder:** `/ (root)`
5. Haz clic en **"Save"**
6. Espera 1-2 minutos y tu sitio estará disponible en:
   ```
   https://TU_USUARIO.github.io/soluvencon
   ```

## 📝 Notas importantes

- Las imágenes de productos se cargan dinámicamente desde **Google Sheets** mediante Google Apps Script
- El icono de WhatsApp flotante te lleva directamente al chat con el número configurado
- El sitio es **responsive** (se adapta a móviles y tablets)

## 🛠️ Tecnologías usadas

- HTML5
- CSS3 (con variables CSS)
- JavaScript vanilla
- Google Apps Script (para la API de productos)
- Font Awesome (iconos)
- Google Fonts (tipografía Poppins)

---

**© 2024 SOLUVENCON** - Todos los derechos reservados
