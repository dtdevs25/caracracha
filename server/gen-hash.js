import bcrypt from 'bcrypt';
const saltRounds = 10;
const password = 'nova@2026';
import fs from 'fs';
const hash = await bcrypt.hash(password, saltRounds);
fs.writeFileSync('hash.txt', hash);
console.log('Done');
