// Formatting helpers, all in Albanian. Written by hand rather than relying on
// Intl, because many Node builds ship without full Albanian locale data.

const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
const WEEKDAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];

// Categories are presented to readers as cinema "genres".
const CATEGORIES = [
  { slug: 'gatime-kryesore', name: 'Gatime kryesore', icon: '🍲' },
  { slug: 'pite-dhe-byreke', name: 'Pite dhe byrekë', icon: '🥧' },
  { slug: 'supa-dhe-corba', name: 'Supa dhe çorba', icon: '🥣' },
  { slug: 'sallata-dhe-meze', name: 'Sallata dhe meze', icon: '🥗' },
  { slug: 'buke-dhe-brumera', name: 'Bukë dhe brumëra', icon: '🍞' },
  { slug: 'embelsira', name: 'Ëmbëlsira', icon: '🍰' },
  { slug: 'mengjes', name: 'Mëngjes', icon: '🍳' },
  { slug: 'dimerore-dhe-turshi', name: 'Dimërore dhe turshi', icon: '🫙' },
];

const DIFFICULTIES = {
  'e-lehte': 'E lehtë',
  mesatare: 'Mesatare',
  'kerkon-durim': 'Kërkon durim',
};

function category(slug) {
  return CATEGORIES.find((c) => c.slug === slug) || { slug: '', name: 'Pa zhanër', icon: '🍽️' };
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'recete';
}

function formatDate(iso, withWeekday = false) {
  if (!iso) return '';
  const d = new Date(iso);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return withWeekday ? `${WEEKDAYS[d.getDay()]}, ${base}` : base;
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const min = Math.floor(diff / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (min < 1) return 'pak çaste më parë';
  if (min < 60) return min === 1 ? 'para një minute' : `para ${min} minutash`;
  if (hrs < 24) return hrs === 1 ? 'para një ore' : `para ${hrs} orësh`;
  if (days === 1) return 'dje';
  if (days < 7) return `para ${days} ditësh`;
  return formatDate(iso);
}

function duration(minutes) {
  const m = parseInt(minutes, 10);
  if (!m || m <= 0) return '';
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  const minPart = rest === 1 ? '1 minutë' : `${rest} minuta`;
  if (!hours) return minPart;
  if (!rest) return `${hours} orë`;
  return `${hours} orë e ${minPart}`;
}

function shortDuration(minutes) {
  const m = parseInt(minutes, 10);
  if (!m || m <= 0) return '';
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} orë ${rest} min` : `${hours} orë`;
}

function totalTime(recipe) {
  return (parseInt(recipe.prepMinutes, 10) || 0) + (parseInt(recipe.cookMinutes, 10) || 0);
}

function number(n, decimals = 0) {
  const fixed = Number(n || 0).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${grouped},${dec}` : grouped;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Plain text -> safe paragraphs. She writes text, never HTML.
function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

// A line ending in ":" (e.g. "Për brumin:") is shown as a small sub-heading.
function isIngredientHeading(line) {
  return /:\s*$/.test(line);
}

function excerpt(text, len = 140) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > len ? t.slice(0, len).replace(/\s+\S*$/, '') + '…' : t;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Natën e mirë';
  if (h < 12) return 'Mirëmëngjes';
  if (h < 18) return 'Mirëdita';
  return 'Mirëmbrëma';
}

// ---- Smoke-free journey -------------------------------------------------

const MILESTONES = [
  { minutes: 20, label: '20 minuta', text: 'Pulsi dhe tensioni i gjakut fillojnë të kthehen në normalitet.' },
  { minutes: 12 * 60, label: '12 orë', text: 'Monoksidi i karbonit në gjak bie në nivel normal. Trupi merr më shumë oksigjen.' },
  { minutes: 24 * 60, label: '1 ditë', text: 'Dita e parë e plotë! Pjesa më e vështirë e udhëtimit ka filluar ta lëshojë vendin.' },
  { minutes: 2 * 1440, label: '2 ditë', text: 'Shija dhe nuhatja fillojnë të përmirësohen — gatimet do të të duken edhe më të shijshme!' },
  { minutes: 3 * 1440, label: '3 ditë', text: 'Nikotina është larguar nga trupi. Frymëmarrja bëhet më e lehtë.' },
  { minutes: 7 * 1440, label: '1 javë', text: 'Një javë e tërë! Kjo meriton një ëmbëlsirë të veçantë.' },
  { minutes: 14 * 1440, label: '2 javë', text: 'Qarkullimi i gjakut përmirësohet. Ecja dhe shkallët bëhen më të lehta.' },
  { minutes: 30 * 1440, label: '1 muaj', text: 'Kolla dhe lodhja pakësohen dalëngadalë. Mushkëritë po pastrohen.' },
  { minutes: 100 * 1440, label: '100 ditë', text: '100 ditë pa duhan — si një film i gjatë me fund të lumtur!' },
  { minutes: 365 * 1440, label: '1 vit', text: 'Rreziku për sëmundje të zemrës bie përgjysmë krahasuar me një duhanpirës.' },
  { minutes: 5 * 365 * 1440, label: '5 vjet', text: 'Rreziku për goditje në tru zbret pothuajse sa te dikush që s’ka pirë kurrë duhan.' },
  { minutes: 10 * 365 * 1440, label: '10 vjet', text: 'Rreziku për kancer të mushkërive bie përgjysmë.' },
];

const ENCOURAGEMENTS = [
  'Çdo ditë pa duhan është një skenë e re në filmin e jetës sate.',
  'Dëshira zgjat vetëm pak minuta. Ti je më e fortë se ajo.',
  'Mos e numëro sa ke mbetur — shiko sa larg ke ardhur.',
  'Shija e kafesë, aroma e bukës së ngrohtë… tani i ndien më mirë se kurrë.',
  'Familja jote krenohet me ty. Çdo ditë.',
  'Edhe filmat më të bukur kanë momente të vështira. Rëndësi ka fundi.',
  'Frymëmarrja jote po bëhet më e lirë, dita-ditës.',
  'Kur të vjen dëshira, gatuaj diçka. Duart e zëna e harrojnë cigaren.',
];

function smokeStats(smoke) {
  if (!smoke.quitDate) return null;
  const start = new Date(smoke.quitDate).getTime();
  const minutes = Math.max(0, (Date.now() - start) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const perDay = Number(smoke.perDay) || 0;
  const avoided = Math.floor((minutes / 1440) * perDay);
  const packSize = Number(smoke.packSize) || 20;
  const saved = (avoided / packSize) * (Number(smoke.packPrice) || 0);
  const milestones = MILESTONES.map((m) => ({ ...m, done: minutes >= m.minutes }));
  const next = milestones.find((m) => !m.done) || null;
  const prev = [...milestones].reverse().find((m) => m.done);
  let progress = 100;
  if (next) {
    const from = prev ? prev.minutes : 0;
    progress = Math.min(100, Math.max(0, ((minutes - from) / (next.minutes - from)) * 100));
  }
  const timeToNext = next ? next.minutes - minutes : 0;
  return { minutes, days, hours, avoided, saved, milestones, next, progress, timeToNext };
}

function friendlyRemaining(minutes) {
  const m = Math.ceil(minutes);
  if (m < 60) return m === 1 ? '1 minutë' : `${m} minuta`;
  const h = Math.ceil(m / 60);
  if (h < 48) return h === 1 ? '1 orë' : `${h} orë`;
  const d = Math.ceil(m / 1440);
  return `${d} ditë`;
}

function encouragement() {
  // Same message all day, a new one each day.
  const day = Math.floor(Date.now() / 864e5);
  return ENCOURAGEMENTS[day % ENCOURAGEMENTS.length];
}

module.exports = {
  CATEGORIES,
  DIFFICULTIES,
  category,
  slugify,
  formatDate,
  timeAgo,
  duration,
  shortDuration,
  totalTime,
  number,
  escapeHtml,
  paragraphs,
  isIngredientHeading,
  excerpt,
  greeting,
  smokeStats,
  friendlyRemaining,
  encouragement,
  ENCOURAGEMENTS,
};
