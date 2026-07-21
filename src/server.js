require('dotenv').config();
const express = require('express');
const userRoutes = require('./routes/user-routes');
const routeRoutes = require('./routes/route-routes');

const app = express();
app.use(express.json());
const PORT = 3000;

// Použití samostatných rout s prefixy
app.use('/api/user', userRoutes);
app.use('/api/route', routeRoutes);

app.listen(PORT, () => {
    console.log(`Dokonale modulární backend běžící na http://localhost:${PORT}`);
});