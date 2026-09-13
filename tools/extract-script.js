const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if(!m){ console.error('no script found'); process.exit(1); }
fs.writeFileSync(process.argv[3], m[1]);
