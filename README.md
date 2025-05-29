# Aplicación de Contactos con Autenticación Social

Una aplicación web completa para gestionar contactos con autenticación mediante Facebook y Google, construida con Node.js, Express, SQLite y EJS.

## Características

- 🔐 **Autenticación OAuth**: Login con Facebook y Google
- 👥 **Gestión de Contactos**: CRUD completo (Crear, Leer, Actualizar, Eliminar)
- 📱 **Diseño Responsive**: Compatible con dispositivos móviles
- 🗄️ **Base de Datos SQLite**: Almacenamiento local sin configuración compleja
- 🎨 **Interfaz Moderna**: Bootstrap 5 con diseño atractivo

## Estructura del Proyecto

```
contactos-app/
├── app.js                 # Aplicación principal
├── package.json           # Dependencias y scripts
├── .env                   # Variables de entorno
├── contactos.db          # Base de datos SQLite (se crea automáticamente)
├── views/
│   ├── login.ejs         # Página de inicio de sesión
│   ├── dashboard.ejs     # Panel principal
│   └── contact-form.ejs  # Formulario de contactos
└── README.md
```

## Requisitos Previos

- Node.js (versión 14 o superior)
- npm (viene con Node.js)
- Cuenta de desarrollador en Facebook
- Cuenta de desarrollador en Google

## Instalación

### 1. Clona o descarga el proyecto
```bash
git clone <tu-repositorio>
cd contactos-app
```

### 2. Instala las dependencias
```bash
npm install
```

### 3. Configura las credenciales OAuth

#### Para Facebook:
1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una nueva aplicación
3. Agrega el producto "Facebook Login"
4. En la configuración de Facebook Login, agrega estas URLs válidas de redirección:
   - `http://localhost:3000/auth/facebook/callback`
5. Copia tu App ID y App Secret

#### Para Google:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+
4. Ve a "Credenciales" y crea credenciales OAuth 2.0
5. Agrega estas URLs de redirección autorizadas:
   - `http://localhost:3000/auth/google/callback`
6. Copia tu Client ID y Client Secret

### 4. Configura las variables de entorno

Edita el archivo `.env` con tus credenciales:

```env
# Configuración de la aplicación
PORT=3000
SESSION_SECRET=tu-clave-secreta-muy-segura-aqui

# Credenciales de Facebook
FACEBOOK_APP_ID=tu-facebook-app-id-real
FACEBOOK_APP_SECRET=tu-facebook-app-secret-real

# Credenciales de Google
GOOGLE_CLIENT_ID=tu-google-client-id-real.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret-real
```

### 5. Ejecuta la aplicación

Para desarrollo:
```bash
npm run dev
```

Para producción:
```bash
npm start
```

La aplicación estará disponible en: `http://localhost:3000`

## Uso

1. **Iniciar Sesión**: Visita la página principal y elige Facebook o Google
2. **Dashboard**: Una vez autenticado, verás tu panel con estadísticas
3. **Agregar Contactos**: Haz clic en "Nuevo Contacto" para agregar información
4. **Gestionar Contactos**: Edita o elimina contactos desde el dashboard

## Campos de Contacto

La aplicación incluye estos campos para cada contacto:
- **Nombre** (obligatorio)
- **Apellido** (obligatorio)
- **Email**
- **Teléfono**
- **Empresa**
- **Dirección**

## Base de Datos

La aplicación usa SQLite con dos tablas principales:

### Tabla `users`
- `id`: ID único del usuario
- `provider_id`: ID del proveedor OAuth
- `provider`: facebook/google
- `name`: Nombre del usuario
- `email`: Email del usuario
- `avatar`: URL del avatar
- `created_at`: Fecha de creación

### Tabla `contacts`
- `id`: ID único del contacto
- `user_id`: ID del usuario propietario
- `nombre`: Nombre del contacto
- `apellido`: Apellido del contacto
- `email`: Email del contacto
- `telefono`: Teléfono del contacto
- `empresa`: Empresa del contacto
- `direccion`: Dirección del contacto
- `created_at`: Fecha de creación
- `updated_at`: Fecha de actualización

## Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Autenticación**: Passport.js (Facebook Strategy, Google Strategy)
- **Base de Datos**: SQLite3
- **Plantillas**: EJS
- **Frontend**: Bootstrap 5, Font Awesome
- **Sesiones**: express-session

## Características de Seguridad

- Autenticación OAuth segura
- Sesiones protegidas
- Validación de datos del lado del servidor
- Confirmación antes de eliminar contactos
- Variables de entorno para credenciales sensibles

## Desarrollo

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Haz commit de tus cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crea un Pull Request

## Solución de Problemas

### Error de conexión OAuth
- Verifica que las URLs de callback estén correctamente configuradas
- Asegúrate de que las credenciales en `.env` sean correctas

### Error de base de datos
- La base de datos SQLite se crea automáticamente
- Si hay problemas, elimina `contactos.db` y reinicia la aplicación

### Puerto ocupado
- Cambia el puerto en el archivo `.env`: `PORT=3001`

## Licencia

MIT License - consulta el archivo LICENSE para más detalles.

## Soporte

Si tienes problemas o preguntas, abre un issue en el repositorio del proyecto.