const express = require('express');
const session = require('express-session');
const passport = require('passport');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const methodOverride = require('method-override');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la base de datos
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/contactos.db' : './contactos.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Crear tablas si no existen
db.serialize(() => {
  // Tabla de usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id TEXT UNIQUE,
    provider TEXT,
    name TEXT,
    email TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabla de contactos
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    empresa TEXT,
    direccion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// Configuración de middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu-clave-secreta-aqui',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Configuración de Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Estrategias de Passport
const TwitterStrategy = require('passport-twitter').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Estrategia de Twitter
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? `${process.env.RENDER_EXTERNAL_URL}/auth/twitter/callback`
    : "http://localhost:3000/auth/twitter/callback"
}, async (token, tokenSecret, profile, done) => {
  try {
    console.log('Twitter OAuth Success!');
    console.log('Twitter Profile:', JSON.stringify(profile, null, 2));
    
    const userQuery = await pool.query(
      "SELECT * FROM users WHERE provider_id = $1 AND provider = 'twitter'", 
      [profile.id]
    );
    
    if (userQuery.rows.length > 0) {
      console.log('Usuario existente encontrado:', userQuery.rows[0]);
      return done(null, userQuery.rows[0]);
    } else {
      const newUser = {
        provider_id: profile.id,
        provider: 'twitter',
        name: profile.displayName || profile.username || 'Twitter User',
        email: null,
        avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
      };
      
      console.log('Creando nuevo usuario:', newUser);
      
      const insertResult = await pool.query(
        "INSERT INTO users (provider_id, provider, name, email, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [newUser.provider_id, newUser.provider, newUser.name, newUser.email, newUser.avatar]
      );
      
      const createdUser = insertResult.rows[0];
      console.log('Usuario creado exitosamente:', createdUser);
      return done(null, createdUser);
    }
  } catch (error) {
    console.error('Error en estrategia Twitter:', error);
    return done(error);
  }
}));

// Estrategia de Google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? `${process.env.RENDER_EXTERNAL_URL}/auth/google/callback`
    : "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google Profile:', JSON.stringify(profile, null, 2));
    
    const userQuery = await pool.query(
      "SELECT * FROM users WHERE provider_id = $1 AND provider = 'google'", 
      [profile.id]
    );
    
    if (userQuery.rows.length > 0) {
      console.log('Usuario existente encontrado:', userQuery.rows[0]);
      return done(null, userQuery.rows[0]);
    } else {
      const newUser = {
        provider_id: profile.id,
        provider: 'google',
        name: profile.displayName,
        email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
        avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
      };
      
      console.log('Creando nuevo usuario:', newUser);
      
      const insertResult = await pool.query(
        "INSERT INTO users (provider_id, provider, name, email, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [newUser.provider_id, newUser.provider, newUser.name, newUser.email, newUser.avatar]
      );
      
      const createdUser = insertResult.rows[0];
      console.log('Usuario creado exitosamente:', createdUser);
      return done(null, createdUser);
    }
  } catch (error) {
    console.error('Error en estrategia Google:', error);
    return done(error);
  }
}));

// Serialización de usuario
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

// Middleware de autenticación
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Rutas de autenticación
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    const error = req.query.error;
    let errorMessage = null;
    
    if (error === 'twitter_auth_failed') {
      errorMessage = 'Error al autenticar con Twitter. Por favor, intenta nuevamente.';
    } else if (error === 'google_auth_failed') {
      errorMessage = 'Error al autenticar con Google. Por favor, intenta nuevamente.';
    }
    
    res.render('login', { error: errorMessage });
  }
});

// Twitter auth
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { 
    failureRedirect: '/?error=twitter_auth_failed',
    successRedirect: '/dashboard'
  }));

// Google auth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/?error=google_auth_failed',
    successRedirect: '/dashboard'
  }));

// Logout
app.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return next(err);
    }
    console.log('Usuario cerró sesión exitosamente');
    res.redirect('/');
  });
});

// Dashboard
app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC", 
      [req.user.id]
    );
    res.render('dashboard', { user: req.user, contacts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener contactos');
  }
});

// Rutas de contactos
app.get('/contacts/new', ensureAuthenticated, (req, res) => {
  res.render('contact-form', { user: req.user, contact: null, action: 'crear' });
});

app.post('/contacts', ensureAuthenticated, async (req, res) => {
  const { nombre, apellido, email, telefono, empresa, direccion } = req.body;
  
  // Validación básica
  if (!nombre || !apellido) {
    return res.status(400).send('Nombre y apellido son obligatorios');
  }
  
  try {
    await pool.query(
      "INSERT INTO contacts (user_id, nombre, apellido, email, telefono, empresa, direccion) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [req.user.id, nombre.trim(), apellido.trim(), email || null, telefono || null, empresa || null, direccion || null]
    );
    console.log('Contacto creado exitosamente');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error al crear contacto:', err);
    res.status(500).send('Error al crear contacto');
  }
});

app.get('/contacts/:id/edit', ensureAuthenticated, async (req, res) => {
  const contactId = req.params.id;
  
  try {
    const result = await pool.query(
      "SELECT * FROM contacts WHERE id = $1 AND user_id = $2", 
      [contactId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).send('Contacto no encontrado');
    }
    
    res.render('contact-form', { user: req.user, contact: result.rows[0], action: 'editar' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener contacto');
  }
});

app.put('/contacts/:id', ensureAuthenticated, async (req, res) => {
  const contactId = req.params.id;
  const { nombre, apellido, email, telefono, empresa, direccion } = req.body;
  
  // Validación básica
  if (!nombre || !apellido) {
    return res.status(400).send('Nombre y apellido son obligatorios');
  }
  
  try {
    const result = await pool.query(
      "UPDATE contacts SET nombre = $1, apellido = $2, email = $3, telefono = $4, empresa = $5, direccion = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 AND user_id = $8",
      [nombre.trim(), apellido.trim(), email || null, telefono || null, empresa || null, direccion || null, contactId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).send('Contacto no encontrado');
    }
    
    console.log('Contacto actualizado');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error al actualizar contacto:', err);
    res.status(500).send('Error al actualizar contacto');
  }
});

app.delete('/contacts/:id', ensureAuthenticated, async (req, res) => {
  const contactId = req.params.id;
  
  try {
    const result = await pool.query(
      "DELETE FROM contacts WHERE id = $1 AND user_id = $2", 
      [contactId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).send('Contacto no encontrado');
    }
    
    console.log('Contacto eliminado');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error al eliminar contacto:', err);
    res.status(500).send('Error al eliminar contacto');
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('¡Algo salió mal!');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Manejar cierre graceful de la aplicación
process.on('SIGINT', async () => {
  console.log('Cerrando conexión a la base de datos...');
  await pool.end();
  console.log('Conexión cerrada.');
  process.exit(0);
});