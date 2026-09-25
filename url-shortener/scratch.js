const express = require('express');
const app = express();
app.set('json replacer', (key, value) => typeof value === 'bigint' ? value.toString() : value);
app.get('/', (req, res) => res.json({ id: 123n }));

const request = require('http').request;
const server = app.listen(0, () => {
  const port = server.address().port;
  request(`http://localhost:${port}/`, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('Response:', data);
      server.close();
    });
  }).end();
});
