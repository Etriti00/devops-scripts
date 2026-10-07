// A tiny JSON-file store. A personal recipe blog holds a few hundred records
// at most, so a single file (written atomically) is simpler to run and back up
// than a database server: copying the `data/` folder is a full backup.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DEFAULT_ABOUT =
  'Mirë se erdhët në kuzhinën time!\n\n' +
  'U rrita në Shkup dhe atje kalova vitet më të bukura të rinisë. Të dielave, aroma e gjellëve ' +
  'të nënës mbushte shtëpinë, ndërsa mbrëmjeve vraponim në kinema — ato salla me perde të kuqe ' +
  'ishin dritarja jonë drejt botës.\n\n' +
  'Këtu ndaj recetat që i kam gatuar ndër vite, bashkë me kujtimet që i shoqërojnë. ' +
  'Merrni një karrige, uluni rehat — shfaqja po fillon.';

function defaults() {
  return {
    version: 1,
    settings: {
      blogName: 'Kinemaja e Shijeve',
      tagline: 'Receta me shije, kujtime me dritë kinemaje',
      authorName: '',
      aboutText: DEFAULT_ABOUT,
      aboutPhoto: '',
      textSize: 'normal',
      currency: '€',
      secret: crypto.randomBytes(32).toString('hex'),
    },
    user: null,
    sessions: {},
    recipes: [],
    comments: [],
    smoke: {
      quitDate: null,
      perDay: 20,
      packSize: 20,
      packPrice: 3,
      showOnBlog: false,
      cravingsBeaten: 0,
      restarts: 0,
    },
  };
}

let state;

function load() {
  if (fs.existsSync(DB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const base = defaults();
    state = {
      ...base,
      ...raw,
      settings: { ...base.settings, ...raw.settings },
      smoke: { ...base.smoke, ...raw.smoke },
    };
  } else {
    state = defaults();
    save();
  }
}

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function get() {
  return state;
}

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

load();

module.exports = { get, save, newId, DATA_DIR, UPLOAD_DIR, DEFAULT_ABOUT };
