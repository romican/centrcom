const express = require('express');
const { initDb } = require('./db/init');
const { runMigrations } = require('./db/migrations');
const logisticsRoutes = require('./routes/logistics');
const collectionsRoutes = require('./routes/collections');
const invoicesRoutes = require('./routes/invoices');
const employeesRoutes = require('./routes/employees');
const documentsRoutes = require('./routes/documents');
const platoonsRoutes = require('./routes/platoons');
const topicsRoutes = require('./routes/topics');
const scoresRoutes = require('./routes/scores');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

initDb();
runMigrations();

app.use('/api', logisticsRoutes);
app.use('/api', collectionsRoutes);
app.use('/api', invoicesRoutes);
app.use('/api', employeesRoutes);
app.use('/api', documentsRoutes);
app.use('/api', platoonsRoutes);
app.use('/api', topicsRoutes);
app.use('/api', scoresRoutes);

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});