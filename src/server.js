const express = require('express');
const cors = require('cors');

const userRoutes = require('./routes/user-routes');
const routeRoutes = require('./routes/route-routes');
const addressRoutes = require('./routes/address-routes'); 

const app = express();

app.use(cors());
app.use(express.json());

// Zapojení routerů
app.use('/api/user', userRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/address', addressRoutes); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server běží na portu ${PORT}`));