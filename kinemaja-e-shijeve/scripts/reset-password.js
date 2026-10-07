// Reset the login if she forgets it:
//   npm run fjalekalimi -- <emri-i-perdoruesit> <fjalekalimi-i-ri>
const db = require('../lib/db');
const auth = require('../lib/auth');

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 6) {
  console.log('Përdorimi: npm run fjalekalimi -- <emri> <fjalëkalimi-i-ri (të paktën 6 shenja)>');
  process.exit(1);
}

const state = db.get();
state.user = { username, passwordHash: auth.hashPassword(password) };
state.sessions = {}; // log out every device
db.save();
console.log(`U krye! Tani hyhet me emrin „${username}” dhe fjalëkalimin e ri.`);
