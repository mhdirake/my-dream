const path = require('node:path');
const compression = require('compression');
const express = require('express');
const morgan = require('morgan');
const { createRequestHandler } = require('expo-server/adapter/express');

const CLIENT_BUILD_DIR = path.join(process.cwd(), 'dist/client');
const SERVER_BUILD_DIR = path.join(process.cwd(), 'dist/server');
const PORT = Number(process.env.PORT || 3000);

process.env.NODE_ENV = 'production';

const app = express();

app.disable('x-powered-by');
app.use(compression());

app.use(
  express.static(CLIENT_BUILD_DIR, {
    extensions: ['html'],
    maxAge: '1h',
  }),
);

app.use(morgan('tiny'));
app.all('/{*all}', createRequestHandler({ build: SERVER_BUILD_DIR }));

app.listen(PORT, () => {
  console.log(`Expo web server listening on port ${PORT}`);
});
