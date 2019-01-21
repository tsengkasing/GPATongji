const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'proxy-out.txt')).toString();
const lines = content.split('\n');

const availableLines = lines.filter(line => line.startsWith('[OK]'));
const proxyURL = availableLines.map(line => line.slice(5, -1));

fs.writeFileSync(path.join(__dirname, 'proxy.json'), JSON.stringify(proxyURL), {flag: 'w'});
