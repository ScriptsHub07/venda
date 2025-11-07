require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// NOTE: database now uses Supabase (Postgres). Mongoose connect removed.
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const checkoutRoutes = require('./routes/checkout');
const uploadsRoutes = require('./routes/uploads');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadsRoutes);

app.get('/', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'dev' }));

async function start() {
  // Supabase does not require a separate connection step here.
  app.listen(PORT, () => console.log('Server running on port', PORT));
}

if (require.main === module) start();

module.exports = app;
