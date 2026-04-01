const express = require('express');
const path = require('path');
const crawlerRouter = require('./routes/crawler');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', crawlerRouter);

app.listen(PORT, () => {
  console.log(`\n  CrawlerX running at http://localhost:${PORT}\n`);
});
