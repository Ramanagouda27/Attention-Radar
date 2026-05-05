require('dotenv').config();

const app       = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🎯 Attention Radar API   →  http://localhost:${PORT}`);
    console.log(`   Health check          →  http://localhost:${PORT}/`);
    console.log(`   Track events          →  POST http://localhost:${PORT}/api/track`);
    console.log(`   Get analytics         →  GET  http://localhost:${PORT}/api/analytics`);
  });
})();