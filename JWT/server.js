const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
const pageRoutes = require('./routes/pages');
const apiRoutes = require('./routes/api');

app.use('/', pageRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Not Found', currentPage: '' });
});

// Start server (only when not on Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🔐 JWT Learning Module running at http://localhost:${PORT}`);
  });
}

module.exports = app;
