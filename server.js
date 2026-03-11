require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/admin', require('./routes/admin'));
app.use('/s', require('./routes/public'));

app.get('/', (req, res) => res.redirect('/admin'));

app.use((req, res) => {
  res.status(404).render('error', { message: 'Halaman tidak ditemukan' });
});

app.listen(PORT, () => {
  const credit = require('./lib/credit');
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(credit.banner());
});
