// Fills the blog with a few sample recipes so it can be previewed.
//   npm run demo            -> adds the samples
//   npm run demo -- --hiq   -> removes them again (her own recipes are untouched)
const db = require('../lib/db');

const state = db.get();

if (process.argv.includes('--hiq')) {
  const ids = new Set(state.recipes.filter((r) => r.demo).map((r) => r.id));
  state.recipes = state.recipes.filter((r) => !r.demo);
  state.comments = state.comments.filter((c) => !ids.has(c.recipeId));
  db.save();
  console.log(`U hoqën ${ids.size} receta shembull.`);
  process.exit(0);
}

if (state.recipes.some((r) => r.demo)) {
  console.log('Recetat shembull janë shtuar tashmë.');
  process.exit(0);
}

const daysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString();

const samples = [
  {
    title: 'Pite me spinaq si në Shkup',
    slug: 'pite-me-spinaq-si-ne-shkup',
    summary: 'Petë të holla, spinaq i freskët dhe djathë i bardhë — aroma e të dielave në shtëpinë tonë.',
    category: 'pite-dhe-byreke',
    prepMinutes: 45,
    cookMinutes: 40,
    servings: 6,
    difficulty: 'mesatare',
    ingredients: [
      'Për petët:',
      '500 g miell',
      '1 lugë çaji kripë',
      '300 ml ujë të vakët',
      '1 lugë gjelle uthull',
      'Për mbushjen:',
      '500 g spinaq i freskët',
      '250 g djathë i bardhë',
      '2 vezë',
      '1 qepë e njomë',
      '100 ml vaj luledielli',
    ],
    steps: [
      'Përziej miellin me kripën, shto ujin dhe uthullën dhe gatuaj një brumë të butë. Lëre të pushojë 30 minuta, i mbuluar.',
      'Laje spinaqin, thaje mirë dhe prite imët. Shtoje qepën e njomë, djathin e thërrmuar dhe vezët, dhe përziej.',
      'Ndaje brumin në 6 topa dhe hape secilin sa më hollë me okllai.',
      'Lyej tavën me vaj, shtro tri petë duke i spërkatur me vaj, shpërndaj mbushjen dhe mbuloje me tri petët e tjera.',
      'Piqe në furrë në 200°C për rreth 40 minuta, derisa të marrë ngjyrë të artë. Lëre të pushojë 10 minuta para se ta presësh.',
    ],
    story:
      'Kur isha vajzë, të dielave zgjohesha nga zhurma e okllait të nënës sime. Ajo i hapte petët aq hollë sa mund të lexoje gazetën përmes tyre.\n\nPasdite, me pitën ende të ngrohtë të mbështjellë në peshqir, shkonim te tezja. E ndanim në ballkon, ndërsa nga rruga dëgjohej muzika e kinemasë së lagjes.',
    film: { title: 'Kazablanka', year: '1942', note: 'Një klasik për një recetë klasike. Gjithmonë më kujton dimrin dhe sallën plot.' },
    applause: 24,
    views: 312,
    publishedAt: daysAgo(2),
  },
  {
    title: 'Fasule në tavë',
    slug: 'fasule-ne-tave',
    summary: 'Fasulja e famshme e Shkupit, e pjekur ngadalë në tavë balte derisa të marrë kore të artë.',
    category: 'gatime-kryesore',
    prepMinutes: 20,
    cookMinutes: 150,
    servings: 6,
    difficulty: 'e-lehte',
    ingredients: [
      '500 g fasule të bardha (të njomura që natën)',
      '2 qepë të mëdha',
      '1 lugë gjelle piper i kuq i ëmbël',
      '2 speca të thata',
      '1 lugë gjelle miell',
      '4 lugë gjelle vaj',
      'Nenexhik i thatë',
      'Kripë dhe piper',
    ],
    steps: [
      'Zieji fasulet në ujë të ri me një qepë të prerë, derisa të zbuten (rreth 1 orë).',
      'Kaurdis qepën tjetër në vaj, shto miellin dhe piperin e kuq dhe përziej për një minutë.',
      'Bashkoji fasulet me pak lëng, kaurdisjen, specat e thata, nenexhikun, kripë dhe piper.',
      'Hidhe në një tavë balte dhe piqe në 200°C për rreth 1 orë e gjysmë, derisa sipër të formohet një kore e lehtë.',
    ],
    story:
      'Në Shkup, fasulja në tavë nuk ishte thjesht gjellë — ishte e premtja. E gjithë lagjja mbante erë qepë të kaurdisur dhe nenexhik.\n\nGjyshja thoshte se sekreti është durimi: tava nuk nxitohet.',
    film: { title: 'Pushime romake', year: '1953', note: 'Audrey Hepburn dhe një tavë fasule — çfarë mbrëmjeje më e mirë?' },
    applause: 41,
    views: 520,
    publishedAt: daysAgo(9),
  },
  {
    title: 'Ajvar i shtëpisë',
    slug: 'ajvar-i-shtepise',
    summary: 'Speca të pjekur në zjarr, patëllxhanë dhe shumë durim. Shija e vjeshtës në kavanoz.',
    category: 'dimerore-dhe-turshi',
    prepMinutes: 90,
    cookMinutes: 120,
    servings: 10,
    difficulty: 'kerkon-durim',
    ingredients: ['5 kg speca të kuq', '1 kg patëllxhanë', '300 ml vaj luledielli', '2 lugë gjelle uthull', '3 thelpinj hudhër', 'Kripë sipas shijes'],
    steps: [
      'Piqi specat dhe patëllxhanët në furrë ose në zjarr, derisa lëkura të nxihet.',
      'Mbylli në një tas me kapak për 15 minuta, pastaj qëroji dhe hiqu farat.',
      'Grije gjithçka në makinë mishi.',
      'Ziej masën në një tenxhere të gjerë, duke shtuar vajin pak nga pak dhe duke e përzier pa pushim, rreth 2 orë.',
      'Në fund shto uthullën, hudhrën dhe kripën. Hidhe të nxehtë në kavanoza të pastër dhe mbylli mirë.',
    ],
    story: 'Çdo tetor, oborret e Shkupit mbusheshin me tym dhe erë specash të pjekur. Gratë e lagjes ndihmonin njëra-tjetrën, nga një ditë te secila.',
    film: { title: 'Doktor Zhivago', year: '1965', note: 'Film i gjatë për një recetë të gjatë — mjafton sa për ta përzier ajvarin deri në fund!' },
    applause: 17,
    views: 198,
    publishedAt: daysAgo(16),
  },
  {
    title: 'Tullumba me sherbet',
    slug: 'tullumba-me-sherbet',
    summary: 'Të krisura nga jashtë, të buta nga brenda dhe të zhytura në sherbet limoni.',
    category: 'embelsira',
    prepMinutes: 30,
    cookMinutes: 30,
    servings: 8,
    difficulty: 'mesatare',
    ingredients: ['Për brumin:', '250 ml ujë', '60 g gjalpë', '200 g miell', '3 vezë', 'Për sherbetin:', '400 g sheqer', '400 ml ujë', 'Lëngu i gjysmë limoni', 'Vaj për tiganisje'],
    steps: [
      'Përgatit sherbetin: zieji sheqerin me ujin 10 minuta, shto limonin dhe lëre të ftohet.',
      'Ziej ujin me gjalpin, hidh miellin përnjëherë dhe përziej fort derisa brumi të ndahet nga muret e tenxheres.',
      'Kur brumi të jetë vakët, shto vezët një nga një, duke e përzier mirë pas secilës.',
      'Me një qese me majë yll, shtrydh copa 5 cm në vaj të ngrohtë (jo shumë të nxehtë) dhe skuqi ngadalë.',
      'Hidhi tullumbat e nxehta në sherbetin e ftohtë dhe lëri 5 minuta.',
    ],
    story: '',
    film: { title: 'Mëngjes te Tiffany', year: '1961', note: '' },
    applause: 33,
    views: 276,
    publishedAt: daysAgo(23),
  },
];

const now = new Date().toISOString();
samples.forEach((s) => {
  const id = db.newId();
  state.recipes.push({ id, photo: '', status: 'published', createdAt: s.publishedAt, updatedAt: now, demo: true, ...s });
  if (s.slug === 'pite-me-spinaq-si-ne-shkup') {
    state.comments.push(
      {
        id: db.newId(),
        recipeId: id,
        name: 'Drita',
        text: 'E bëra të dielën dhe u zhduk për 10 minuta! Faleminderit që e ndatë. Më kujtoi pitën e nënës sime.',
        createdAt: daysAgo(1),
        seen: false,
        reply: { text: 'Sa mirë, Drita! Të bëftë mirë. Herën tjetër provoje edhe me pak hithra 💛', at: daysAgo(0.5) },
      },
      { id: db.newId(), recipeId: id, name: 'Arben', text: 'A mund të përdor spinaq të ngrirë?', createdAt: daysAgo(0.2), seen: false, reply: null }
    );
  }
});
db.save();
console.log(`U shtuan ${samples.length} receta shembull. Hiqi me: npm run demo -- --hiq`);
