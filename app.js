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
    
    db.get("SELECT * FROM users WHERE provider_id = ? AND provider = 'twitter'", 
      [profile.id], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return done(err);
      }
      
      if (user) {
        console.log('Usuario existente encontrado:', user);
        return done(null, user);
      } else {
        const newUser = {
          provider_id: profile.id,
          provider: 'twitter',
          name: profile.displayName || profile.username || 'Twitter User',
          email: null,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
        };
        
        console.log('Creando nuevo usuario:', newUser);
        
        db.run("INSERT INTO users (provider_id, provider, name, email, avatar) VALUES (?, ?, ?, ?, ?)",
          [newUser.provider_id, newUser.provider, newUser.name, newUser.email, newUser.avatar],
          function(err) {
            if (err) {
              console.error('Error al crear usuario:', err);
              return done(err);
            }
            newUser.id = this.lastID;
            console.log('Usuario creado exitosamente:', newUser);
            return done(null, newUser);
          });
      }
    });
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
    
    db.get("SELECT * FROM users WHERE provider_id = ? AND provider = 'google'", 
      [profile.id], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return done(err);
      }
      
      if (user) {
        console.log('Usuario existente encontrado:', user);
        return done(null, user);
      } else {
        const newUser = {
          provider_id: profile.id,
          provider: 'google',
          name: profile.displayName,
          email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
        };
        
        console.log('Creando nuevo usuario:', newUser);
        
        db.run("INSERT INTO users (provider_id, provider, name, email, avatar) VALUES (?, ?, ?, ?, ?)",
          [newUser.provider_id, newUser.provider, newUser.name, newUser.email, newUser.avatar],
          function(err) {
            if (err) {
              console.error('Error al crear usuario:', err);
              return done(err);
            }
            newUser.id = this.lastID;
            console.log('Usuario creado exitosamente:', newUser);
            return done(null, newUser);
          });
      }
    });
  } catch (error) {
    console.error('Error en estrategia Google:', error);
    return done(error);
  }
}));

// Serialización de usuario
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
    done(err, user);
  });
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
app.get('/dashboard', ensureAuthenticated, (req, res) => {
  db.all("SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC", 
    [req.user.id], (err, contacts) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al obtener contactos');
    }
    res.render('dashboard', { user: req.user, contacts });
  });
});

// Rutas de contactos
app.get('/contacts/new', ensureAuthenticated, (req, res) => {
  res.render('contact-form', { user: req.user, contact: null, action: 'crear' });
});

app.post('/contacts', ensureAuthenticated, (req, res) => {
  const { nombre, apellido, email, telefono, empresa, direccion } = req.body;
  
  // Validación básica
  if (!nombre || !apellido) {
    return res.status(400).send('Nombre y apellido son obligatorios');
  }
  
  db.run("INSERT INTO contacts (user_id, nombre, apellido, email, telefono, empresa, direccion) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, nombre.trim(), apellido.trim(), email || null, telefono || null, empresa || null, direccion || null],
    function(err) {
      if (err) {
        console.error('Error al crear contacto:', err);
        return res.status(500).send('Error al crear contacto');
      }
      console.log('Contacto creado con ID:', this.lastID);
      res.redirect('/dashboard');
    });
});

app.get('/contacts/:id/edit', ensureAuthenticated, (req, res) => {
  const contactId = req.params.id;
  
  db.get("SELECT * FROM contacts WHERE id = ? AND user_id = ?", 
    [contactId, req.user.id], (err, contact) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al obtener contacto');
    }
    if (!contact) {
      return res.status(404).send('Contacto no encontrado');
    }
    res.render('contact-form', { user: req.user, contact, action: 'editar' });
  });
});

app.put('/contacts/:id', ensureAuthenticated, (req, res) => {
  const contactId = req.params.id;
  const { nombre, apellido, email, telefono, empresa, direccion } = req.body;
  
  // Validación básica
  if (!nombre || !apellido) {
    return res.status(400).send('Nombre y apellido son obligatorios');
  }
  
  db.run("UPDATE contacts SET nombre = ?, apellido = ?, email = ?, telefono = ?, empresa = ?, direccion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
    [nombre.trim(), apellido.trim(), email || null, telefono || null, empresa || null, direccion || null, contactId, req.user.id],
    function(err) {
      if (err) {
        console.error('Error al actualizar contacto:', err);
        return res.status(500).send('Error al actualizar contacto');
      }
      if (this.changes === 0) {
        return res.status(404).send('Contacto no encontrado');
      }
      console.log('Contacto actualizado, filas afectadas:', this.changes);
      res.redirect('/dashboard');
    });
});

app.delete('/contacts/:id', ensureAuthenticated, (req, res) => {
  const contactId = req.params.id;
  
  db.run("DELETE FROM contacts WHERE id = ? AND user_id = ?", 
    [contactId, req.user.id], function(err) {
    if (err) {
      console.error('Error al eliminar contacto:', err);
      return res.status(500).send('Error al eliminar contacto');
    }
    if (this.changes === 0) {
      return res.status(404).send('Contacto no encontrado');
    }
    console.log('Contacto eliminado, filas afectadas:', this.changes);
    res.redirect('/dashboard');
  });
});

// Ruta de prueba
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('¡Algo salió mal!');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Aplicación disponible en: ${process.env.RENDER_EXTERNAL_URL}`);
  } else {
    console.log(`Aplicación disponible en: http://localhost:${PORT}`);
  }
});

// Cerrar base de datos al terminar la aplicación
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Conexión a la base de datos cerrada.');
    process.exit(0);
  });
});