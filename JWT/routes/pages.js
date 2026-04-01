const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { title: 'JWT Learning Module', currentPage: 'home' });
});

router.get('/jwt-fundamentals', (req, res) => {
  res.render('jwt-fundamentals', { title: 'JWT Fundamentals', currentPage: 'jwt-fundamentals' });
});

router.get('/owasp-top-10', (req, res) => {
  res.render('owasp-top-10', { title: 'OWASP Top 10', currentPage: 'owasp-top-10' });
});

router.get('/cookie-stealing', (req, res) => {
  res.render('cookie-stealing', { title: 'Cookie Stealing', currentPage: 'cookie-stealing' });
});

router.get('/session-hijacking', (req, res) => {
  res.render('session-hijacking', { title: 'Session Hijacking', currentPage: 'session-hijacking' });
});

router.get('/jwt-lab', (req, res) => {
  res.render('jwt-lab', { title: 'JWT Manipulation Lab', currentPage: 'jwt-lab' });
});

router.get('/bcrypt', (req, res) => {
  res.render('bcrypt', { title: 'Bcrypt Introduction', currentPage: 'bcrypt' });
});

module.exports = router;
