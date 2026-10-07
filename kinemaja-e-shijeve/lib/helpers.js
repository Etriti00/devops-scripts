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
};
