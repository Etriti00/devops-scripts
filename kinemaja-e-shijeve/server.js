const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const db = require('./lib/db');
const auth = require('./lib/auth');
const h = require('./lib/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '100kb' }));
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.use('/foto', express.static(db.UPLOAD_DIR, { maxAge: '30d' }));
app.use(auth.loadSession);

app.use((req, res, next) => {
  const state = db.get();
  res.locals.settings = state.settings;
  res.locals.h = h;
  res.locals.user = req.user || null;
  res.locals.csrf = req.session ? req.session.csrf : '';
  res.locals.path = req.path;
  res.locals.title = '';
  res.locals.description = state.settings.tagline;
  res.locals.ogImage = '';
  next();
});

// ---- Photo uploads --------------------------------------------------------

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: db.UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(10).toString('hex') + EXT[file.mimetype]),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, Boolean(EXT[file.mimetype])),
});

function removePhoto(name) {
  if (!name) return;
  const file = path.join(db.UPLOAD_DIR, path.basename(name));
  fs.unlink(file, () => {});
}

// ---- Data helpers ---------------------------------------------------------

function published() {
  return db
    .get()
    .recipes.filter((r) => r.status === 'published')
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function commentsFor(recipeId) {
  return db
    .get()
    .comments.filter((c) => c.recipeId === recipeId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function commentCount(recipeId) {
  return db.get().comments.filter((c) => c.recipeId === recipeId).length;
}

function uniqueSlug(title, exceptId) {
  const base = h.slugify(title);
  let slug = base;
  let i = 2;
  while (db.get().recipes.some((r) => r.slug === slug && r.id !== exceptId)) slug = `${base}-${i++}`;
  return slug;
}

function lines(value) {
  return []
    .concat(value || [])
    .flatMap((v) => String(v).split(/\r?\n/))
    .map((v) => v.trim())
    .filter(Boolean);
}

function clampInt(v, max) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : '';
}

// ===========================================================================
// Public blog
// ===========================================================================

app.get('/', (req, res) => {
  const recipes = published();
  const smoke = db.get().smoke;
  res.render('public/home', {
    featured: recipes[0] || null,
    recipes: recipes.slice(1),
    allCount: recipes.length,
    commentCount,
    smokeStats: smoke.showOnBlog ? h.smokeStats(smoke) : null,
    activeCategory: null,
  });
});

app.get('/zhanri/:slug', (req, res, next) => {
  const cat = h.CATEGORIES.find((c) => c.slug === req.params.slug);
  if (!cat) return next();
  const recipes = published().filter((r) => r.category === cat.slug);
  res.render('public/list', {
    title: cat.name,
    heading: cat.name,
    kicker: 'Zhanri',
    icon: cat.icon,
    recipes,
    commentCount,
    activeCategory: cat.slug,
    query: '',
  });
});

app.get('/kerko', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  const norm = (s) => h.slugify(s).replace(/-/g, ' ');
  const needle = norm(q);
  const recipes = needle
    ? published().filter((r) =>
        norm([r.title, r.summary, r.story, ...(r.ingredients || [])].join(' ')).includes(needle)
      )
    : [];
  res.render('public/list', {
    title: q ? `Kërkimi: ${q}` : 'Kërko',
    heading: q ? `„${q}”` : 'Çfarë doni të gatuani sot?',
    kicker: 'Kërkimi',
    icon: '🔎',
    recipes,
    commentCount,
    activeCategory: null,
    query: q,
  });
});

app.get('/receta/:slug', (req, res, next) => {
  const recipe = db.get().recipes.find((r) => r.slug === req.params.slug);
  const isPreview = recipe && recipe.status !== 'published';
  if (!recipe || (isPreview && !req.user)) return next();
  if (!isPreview && !req.user) {
    recipe.views = (recipe.views || 0) + 1;
    db.save();
  }
  const more = published()
    .filter((r) => r.id !== recipe.id)
    .sort((a, b) => (b.category === recipe.category) - (a.category === recipe.category))
    .slice(0, 3);
  res.render('public/recipe', {
    title: recipe.title,
    description: recipe.summary || h.excerpt(recipe.story),
    ogImage: recipe.photo ? `/foto/${recipe.photo}` : '',
    recipe,
    comments: commentsFor(recipe.id),
    more,
    commentCount,
    isPreview,
    sent: req.query.komenti,
    formTime: Date.now(),
    activeCategory: recipe.category,
  });
});

app.post('/receta/:slug/komento', (req, res, next) => {
  const recipe = published().find((r) => r.slug === req.params.slug);
  if (!recipe) return next();
  const back = `/receta/${recipe.slug}`;
  const name = String(req.body.emri || '').trim().slice(0, 60);
  const text = String(req.body.komenti || '').trim().slice(0, 2000);
  const tooFast = Date.now() - Number(req.body.t || 0) < 3000;
  // `faqja` is a honeypot field that humans never see.
  if (req.body.faqja || tooFast) return res.redirect(`${back}?komenti=ok#komentet`);
  if (!name || !text) return res.redirect(`${back}?komenti=mungon#shkruaj-koment`);
  if (auth.rateLimited(`c:${req.ip}`, 5, 10 * 60 * 1000)) {
    return res.redirect(`${back}?komenti=shume#shkruaj-koment`);
  }
  db.get().comments.push({
    id: db.newId(),
    recipeId: recipe.id,
    name,
    text,
    createdAt: new Date().toISOString(),
    seen: false,
    reply: null,
  });
  db.save();
  res.redirect(`${back}?komenti=ok#komentet`);
});

app.post('/receta/:slug/duartrokit', (req, res) => {
  const recipe = published().find((r) => r.slug === req.params.slug);
  if (!recipe) return res.status(404).json({ ok: false });
  if (!auth.rateLimited(`a:${req.ip}:${recipe.id}`, 1, 12 * 3600 * 1000)) {
    recipe.applause = (recipe.applause || 0) + 1;
    db.save();
  }
  res.json({ ok: true, applause: recipe.applause || 0 });
});

app.get('/rreth-meje', (req, res) => {
  res.render('public/about', { title: 'Rreth meje', recipesCount: published().length, activeCategory: null });
});

// ===========================================================================
// Dashboard ("paneli")
// ===========================================================================

const admin = express.Router();

admin.get('/fillimi', (req, res) => {
  if (db.get().user) return res.redirect('/paneli');
  res.render('admin/setup', { title: 'Mirë se erdhe', error: null, values: {} });
});

admin.post('/fillimi', (req, res) => {
  if (db.get().user) return res.redirect('/paneli');
  const values = {
    authorName: String(req.body.authorName || '').trim().slice(0, 60),
    username: String(req.body.username || '').trim().slice(0, 40),
  };
  const password = String(req.body.password || '');
  let error = null;
  if (!values.authorName) error = 'Shkruaj emrin tënd, që ta shohin lexuesit.';
  else if (values.username.length < 3) error = 'Emri i përdoruesit duhet të ketë të paktën 3 shkronja.';
  else if (password.length < 6) error = 'Fjalëkalimi duhet të ketë të paktën 6 shenja.';
  else if (password !== req.body.password2) error = 'Dy fjalëkalimet nuk janë njësoj. Provo sërish.';
  if (error) return res.render('admin/setup', { title: 'Mirë se erdhe', error, values });

  const state = db.get();
  state.user = { username: values.username, passwordHash: auth.hashPassword(password) };
  state.settings.authorName = values.authorName;
  db.save();
  auth.startSession(req, res);
  res.redirect('/paneli?mirese=1');
});

admin.get('/hyr', (req, res) => {
  if (!db.get().user) return res.redirect('/paneli/fillimi');
  if (req.user) return res.redirect('/paneli');
  res.render('admin/login', { title: 'Hyrja', error: null, username: '' });
});

admin.post('/hyr', (req, res) => {
  const user = db.get().user;
  if (!user) return res.redirect('/paneli/fillimi');
  const username = String(req.body.username || '');
  const password = String(req.body.password || '');
  if (auth.rateLimited(`l:${req.ip}`, 10, 15 * 60 * 1000)) {
    return res.render('admin/login', {
      title: 'Hyrja',
      error: 'Shumë përpjekje njëra pas tjetrës. Pusho pak dhe provo sërish pas 15 minutash.',
      username,
    });
  }
  if (!auth.sameUsername(username, user.username) || !auth.verifyPassword(password, user.passwordHash)) {
    return res.render('admin/login', {
      title: 'Hyrja',
      error: 'Emri ose fjalëkalimi nuk është i saktë. Kontrollo me qetësi dhe provo sërish.',
      username,
    });
  }
  auth.startSession(req, res);
  res.redirect('/paneli');
});

admin.post('/dil', (req, res) => {
  auth.endSession(req, res);
  res.redirect('/');
});

admin.use(auth.requireLogin);
admin.use((req, res, next) => {
  res.locals.flash = auth.takeFlash(req);
  res.locals.newComments = db.get().comments.filter((c) => !c.seen).length;
  next();
});

admin.get('/', (req, res) => {
  const state = db.get();
  const recipes = [...state.recipes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.render('admin/home', {
    title: 'Paneli',
    welcome: Boolean(req.query.mirese),
    recipes,
    drafts: recipes.filter((r) => r.status !== 'published'),
    publishedCount: recipes.filter((r) => r.status === 'published').length,
    totalViews: recipes.reduce((s, r) => s + (r.views || 0), 0),
    totalApplause: recipes.reduce((s, r) => s + (r.applause || 0), 0),
    smokeStats: h.smokeStats(state.smoke),
  });
});

// ---- Recipes ----

admin.get('/receta', (req, res) => {
  const recipes = [...db.get().recipes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.render('admin/recipes', { title: 'Recetat e mia', recipes, commentCount });
});

function emptyRecipe() {
  return {
    id: '',
    title: '',
    summary: '',
    category: '',
    prepMinutes: '',
    cookMinutes: '',
    servings: '',
    difficulty: '',
    ingredients: [],
    steps: [],
    story: '',
    film: { title: '', year: '', note: '' },
    photo: '',
    status: 'draft',
  };
}

admin.get('/receta/e-re', (req, res) => {
  res.render('admin/editor', { title: 'Recetë e re', recipe: emptyRecipe(), isNew: true });
});

admin.get('/receta/:id/ndrysho', (req, res, next) => {
  const recipe = db.get().recipes.find((r) => r.id === req.params.id);
  if (!recipe) return next();
  res.render('admin/editor', { title: `Ndrysho: ${recipe.title}`, recipe, isNew: false });
});

function applyForm(recipe, body, file) {
  recipe.title = String(body.title || '').trim().slice(0, 120) || 'Recetë pa emër';
  recipe.summary = String(body.summary || '').trim().slice(0, 300);
  recipe.category = h.CATEGORIES.some((c) => c.slug === body.category) ? body.category : '';
  recipe.prepMinutes = clampInt(body.prepMinutes, 2880);
  recipe.cookMinutes = clampInt(body.cookMinutes, 2880);
  recipe.servings = clampInt(body.servings, 100);
  recipe.difficulty = h.DIFFICULTIES[body.difficulty] ? body.difficulty : '';
  recipe.ingredients = lines(body.ingredients).slice(0, 80);
  recipe.steps = []
    .concat(body.steps || [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 40);
  recipe.story = String(body.story || '').trim().slice(0, 8000);
  recipe.film = {
    title: String(body.filmTitle || '').trim().slice(0, 120),
    year: String(body.filmYear || '').replace(/\D/g, '').slice(0, 4),
    note: String(body.filmNote || '').trim().slice(0, 500),
  };
  if (file) {
    removePhoto(recipe.photo);
    recipe.photo = file.filename;
  } else if (body.removePhoto === '1') {
    removePhoto(recipe.photo);
    recipe.photo = '';
  }
}

function saveRecipe(req, res, recipe, isNew) {
  applyForm(recipe, req.body, req.file);
  const now = new Date().toISOString();
  const wantsPublish = req.body.action === 'publish';
  const wasPublished = recipe.status === 'published';
  if (wantsPublish) {
    recipe.status = 'published';
    if (!recipe.publishedAt) recipe.publishedAt = now;
  } else if (req.body.action === 'unpublish') {
    recipe.status = 'draft';
  }
  if (!wasPublished || isNew) recipe.slug = uniqueSlug(recipe.title, recipe.id);
  recipe.updatedAt = now;
  if (isNew) {
    recipe.createdAt = now;
    db.get().recipes.push(recipe);
  }
  db.save();

  if (wantsPublish && !wasPublished) {
    auth.flash(req, 'celebrate', `„${recipe.title}” u publikua! Tani e shohin të gjithë.`);
    return res.redirect(`/paneli/receta/${recipe.id}/u-publikua`);
  }
  if (wantsPublish) auth.flash(req, 'success', 'Ndryshimet u ruajtën dhe duken në blog.');
  else if (req.body.action === 'unpublish') auth.flash(req, 'info', 'Receta u hoq nga blogu dhe tani është skicë. Askush nuk e sheh përveç teje.');
  else auth.flash(req, 'success', 'Receta u ruajt si skicë. Mund të vazhdosh kur të duash.');
  res.redirect('/paneli/receta');
}

admin.post('/receta', upload.single('photo'), auth.checkCsrf, (req, res) => {
  saveRecipe(req, res, { ...emptyRecipe(), id: db.newId(), views: 0, applause: 0 }, true);
});

admin.post('/receta/:id', upload.single('photo'), auth.checkCsrf, (req, res, next) => {
  const recipe = db.get().recipes.find((r) => r.id === req.params.id);
  if (!recipe) return next();
  saveRecipe(req, res, recipe, false);
});

admin.get('/receta/:id/u-publikua', (req, res, next) => {
  const recipe = db.get().recipes.find((r) => r.id === req.params.id);
  if (!recipe) return next();
  res.render('admin/published', { title: 'U publikua!', recipe });
});

admin.post('/receta/:id/fshi', auth.checkCsrf, (req, res) => {
  const state = db.get();
  const recipe = state.recipes.find((r) => r.id === req.params.id);
  if (recipe) {
    removePhoto(recipe.photo);
    state.recipes = state.recipes.filter((r) => r.id !== recipe.id);
    state.comments = state.comments.filter((c) => c.recipeId !== recipe.id);
    db.save();
    auth.flash(req, 'info', `Receta „${recipe.title}” u fshi.`);
  }
  res.redirect('/paneli/receta');
});

// ---- Comments ----

admin.get('/komentet', (req, res) => {
  const state = db.get();
  const comments = [...state.comments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((c) => ({ ...c, recipe: state.recipes.find((r) => r.id === c.recipeId) }));
  res.render('admin/comments', { title: 'Komentet', comments });
  // Once she has seen the list, the comments are no longer "new".
  let changed = false;
  state.comments.forEach((c) => {
    if (!c.seen) {
      c.seen = true;
      changed = true;
    }
  });
  if (changed) db.save();
});

admin.post('/komentet/:id/pergjigju', auth.checkCsrf, (req, res) => {
  const comment = db.get().comments.find((c) => c.id === req.params.id);
  const text = String(req.body.reply || '').trim().slice(0, 2000);
  if (comment) {
    comment.reply = text ? { text, at: new Date().toISOString() } : null;
    db.save();
    auth.flash(req, 'success', text ? 'Përgjigjja jote u publikua poshtë komentit.' : 'Përgjigjja u hoq.');
  }
  res.redirect(`/paneli/komentet#k-${req.params.id}`);
});

admin.post('/komentet/:id/fshi', auth.checkCsrf, (req, res) => {
  const state = db.get();
  state.comments = state.comments.filter((c) => c.id !== req.params.id);
  db.save();
  auth.flash(req, 'info', 'Komenti u fshi.');
  res.redirect('/paneli/komentet');
});

// ---- Smoke-free journey ----

admin.get('/pa-duhan', (req, res) => {
  const smoke = db.get().smoke;
  res.render('admin/smoke', { title: 'Rruga ime pa duhan', smoke, stats: h.smokeStats(smoke) });
});

admin.post('/pa-duhan', auth.checkCsrf, (req, res) => {
  const smoke = db.get().smoke;
  const action = req.body.action;
  if (action === 'start' || action === 'restart') {
    if (action === 'restart') smoke.restarts = (smoke.restarts || 0) + 1;
    // The browser sends the chosen moment as ISO so her time zone is respected.
    let date = new Date();
    if (action === 'start' && req.body.quitIso) date = new Date(req.body.quitIso);
    else if (action === 'start' && req.body.quitDate) date = new Date(`${req.body.quitDate}T${req.body.quitTime || '08:00'}`);
    if (date > new Date()) date = new Date();
    smoke.quitDate = (isNaN(date) ? new Date() : date).toISOString();
    auth.flash(
      req,
      action === 'start' ? 'celebrate' : 'info',
      action === 'start'
        ? 'Rruga jote pa duhan nisi! Jemi të gjithë me ty.'
        : 'Asgjë nuk humbet. Çdo fillim i ri është një hap përpara — e kemi rinisur numëruesin bashkë.'
    );
  } else if (action === 'settings') {
    smoke.perDay = clampInt(req.body.perDay, 100) || 20;
    smoke.packSize = clampInt(req.body.packSize, 50) || 20;
    smoke.packPrice = Math.max(0, Math.min(100, parseFloat(String(req.body.packPrice).replace(',', '.')) || 0));
    smoke.showOnBlog = req.body.showOnBlog === '1';
    auth.flash(req, 'success', 'Të dhënat u ruajtën.');
  }
  db.save();
  res.redirect('/paneli/pa-duhan');
});

admin.post('/pa-duhan/deshira', auth.checkCsrf, (req, res) => {
  const smoke = db.get().smoke;
  smoke.cravingsBeaten = (smoke.cravingsBeaten || 0) + 1;
  db.save();
  res.json({ ok: true, count: smoke.cravingsBeaten });
});

// ---- Settings ----

admin.get('/cilesimet', (req, res) => {
  res.render('admin/settings', { title: 'Cilësimet', error: null });
});

admin.post('/cilesimet', upload.single('aboutPhoto'), auth.checkCsrf, (req, res) => {
  const s = db.get().settings;
  s.blogName = String(req.body.blogName || '').trim().slice(0, 60) || 'Kinemaja e Shijeve';
  s.tagline = String(req.body.tagline || '').trim().slice(0, 140);
  s.authorName = String(req.body.authorName || '').trim().slice(0, 60);
  s.aboutText = String(req.body.aboutText || '').trim().slice(0, 6000);
  s.currency = ['€', 'den', 'Lekë', 'CHF', '$', '£', 'kr'].includes(req.body.currency) ? req.body.currency : '€';
  if (req.file) {
    removePhoto(s.aboutPhoto);
    s.aboutPhoto = req.file.filename;
  } else if (req.body.removePhoto === '1') {
    removePhoto(s.aboutPhoto);
    s.aboutPhoto = '';
  }
  db.save();
  auth.flash(req, 'success', 'Cilësimet u ruajtën.');
  res.redirect('/paneli/cilesimet');
});

admin.post('/cilesimet/shkronjat', auth.checkCsrf, (req, res) => {
  const size = ['normal', 'madhe', 'shume-madhe'].includes(req.body.textSize) ? req.body.textSize : 'normal';
  db.get().settings.textSize = size;
  db.save();
  res.redirect(req.get('referer') || '/paneli');
});

admin.post('/cilesimet/fjalekalimi', auth.checkCsrf, (req, res) => {
  const user = db.get().user;
  const render = (error) => res.render('admin/settings', { title: 'Cilësimet', error });
  if (!auth.verifyPassword(String(req.body.current || ''), user.passwordHash)) {
    return render('Fjalëkalimi i tanishëm nuk është i saktë.');
  }
  const next = String(req.body.password || '');
  if (next.length < 6) return render('Fjalëkalimi i ri duhet të ketë të paktën 6 shenja.');
  if (next !== req.body.password2) return render('Dy fjalëkalimet e reja nuk janë njësoj.');
  user.passwordHash = auth.hashPassword(next);
  const username = String(req.body.username || '').trim();
  if (username.length >= 3) user.username = username.slice(0, 40);
  db.save();
  auth.flash(req, 'success', 'Të dhënat e hyrjes u ndryshuan. Mbaji mend mirë!');
  res.redirect('/paneli/cilesimet');
});

admin.get('/ndihme', (req, res) => {
  res.render('admin/help', { title: 'Ndihmë' });
});

app.use('/paneli', admin);

// Multer errors (e.g. a photo that is too large) get a friendly page.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).render('admin/message', {
      title: 'Fotoja është shumë e madhe',
      message: 'Zgjidh një foto më të vogël se 15 MB dhe provo sërish. Teksti yt nuk ka humbur — kthehu mbrapa me shigjetën e shfletuesit.',
    });
  }
  console.error(err);
  res.status(500).render('public/error', {
    title: 'Diçka nuk shkoi mirë',
    activeCategory: null,
    code: 500,
    heading: 'Filmi u këput për një çast',
    message: 'Ndodhi një gabim i papritur. Provoni sërish pas pak.',
  });
});

app.use((req, res) => {
  res.status(404).render('public/error', {
    title: 'Faqja nuk u gjet',
    activeCategory: null,
    code: 404,
    heading: 'Kjo shfaqje nuk është në program',
    message: 'Faqja që kërkoni nuk ekziston ose është hequr. Por kuzhina është gjithmonë e hapur!',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kinemaja e Shijeve po punon në http://localhost:${PORT}`);
    if (!db.get().user) console.log(`Hapni http://localhost:${PORT}/paneli për të krijuar llogarinë.`);
  });
}

module.exports = app;
