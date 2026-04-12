const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, 'img');
const OUTPUT = path.join(__dirname, 'data.json');

// ---------------------------------------------------------------------------
// Animal categorization for Jägerprüfung-style distractors
// Names here are species-only (no gender markers).
// ---------------------------------------------------------------------------
const CATEGORIES = {
  'Eulen': [
    'Schleiereule', 'Waldkauz', 'Waldohreule', 'Sumpfohreule',
    'Steinkauz', 'Uhu', 'Ziegenmelker',
  ],

  'Greifvögel': [
    'Mäusebussard', 'Raufußbussard', 'Habicht', 'Habicht juv',
    'Sperber', 'Rotmilan', 'Schwarzmilan', 'Rohrweihe', 'Steinadler',
    'Turmfalke', 'Baumfalke', 'Wanderfalke',
  ],

  'Rabenvögel': [
    'Rabenkrähe', 'Nebelkrähe', 'Saatkrähe', 'Dohle',
    'Elster', 'Eichelhäher', 'Tannenhäher',
  ],

  'Tauben': [
    'Ringeltaube', 'Türkentaube', 'Turteltaube', 'Hohltaube',
  ],

  'Hühnervögel': [
    'Fasan', 'Rebhuhn', 'Wachtel', 'Haselhuhn', 'Birkhahn',
    'Auerhahn', 'Schneehuhn', 'Steinhuhn',
  ],

  'Entenvögel': [
    'Stockente', 'Stockenten',
    'Krickente', 
    'Pfeifente', 'Knäckente', 'Löffelente',
    'Reiherente', 'Tafelente', 'Eiderente',
    'Brandgans', 'Gans',
    'Zwergsäger', 'Gänsesäger', 'Mittelsäger',
  ],

  'Watvögel': [
    'Kiebitz', 'Bekassine', 'Waldschnepfe', 'Großer Brachvogel',
  ],

  'Wasservögel': [
    'Haubentaucher', 'Zwergtaucher', 'Blässhuhn', 'Bläßhuhn',
    'Grünfüßiges Teichhuhn', 'Kormoran', 'Lachmöwe', 'Graureiher',
  ],

  'Spechte': [
    'Buntspecht', 'Grünspecht', 'Schwarzspecht', 'Grauspecht',
  ],

  'Singvögel': [
    'Amsel', 'Drossel', 'Singdrossel', 'Wacholderdrossel',
    'Star', 'Bachstelze', 'Pirol', 'Wasseramsel',
    'Neuntöter', 'Raubwürger',
    'Fichtenkreuzschnabel', 'Fichtenkreusschnabel',
    'Kuckuck', 'Wiedehopf', 'Eisvogel',
  ],

  'Marderartige': [
    'Steinmarder', 'Baummarder', 'Iltis', 'Mauswiesel',
    'Hermelin (Großes Mauswiesel)', 
    'Großes Wiesel (Hermelin) Winter', 'Großes Wiesel (Hermelin) Sommer',
  ],

  'Hasenartige': [
    'Feldhase', 'Schneehase', 'Kaninchen',
  ],

  'Raubwild': [
    'Rotfuchs', 'Fuchs', 'Dachs',
  ],

  'Nagetiere und Insektenfresser': [
    'Eichhörnchen', 'Siebenschläfer', 'Bisam', 'Murmeltier', 'Biber',
    'Spitzmaus', 'Maulwurf',
  ],

  'Schwarzwild': [
    'Frischling', 'Überläufer'
  ],
};

// Build reverse lookup: species name -> category
const nameToCategory = {};
for (const [cat, animals] of Object.entries(CATEGORIES)) {
  for (const animal of animals) {
    nameToCategory[animal] = cat;
  }
}

// ---------------------------------------------------------------------------
// Filename cleaning + gender extraction
// ---------------------------------------------------------------------------

// Gender patterns to detect and strip from cleaned names.
// Order matters: check longer / more specific patterns first.
const GENDER_PATTERNS = [
  // Parenthesized markers
  { re: /\s*\(Paar\)$/i,     gender: 'paar', text: 'Paar' },
  { re: /\s*\(weiblich\)$/i, gender: 'w',    text: 'weiblich' },
  { re: /\s*\(männlich\)$/i, gender: 'm',    text: 'männlich' },
  { re: /\s*\(Erpel\)$/i,    gender: 'm',    text: 'männlich (Erpel)' },
  { re: /\s*\(Hahn\)$/i,     gender: 'm',    text: 'männlich (Hahn)' },
  { re: /\s*\(Henne\)$/i,    gender: 'w',    text: 'weiblich (Henne)' },
  { re: /\s*\(Terzel\)$/i,   gender: 'm',    text: 'männlich (Terzel)' },
  // Bare trailing " m" / " w" (single letter after space, end of string)
  { re: / w$/,               gender: 'w',    text: 'weiblich' },
  { re: / m$/,               gender: 'm',    text: 'männlich' },
];

function cleanName(filename) {
  let name = filename.replace(/\.[^.]+$/, '');               // strip extension
  name = name.replace(/^SG\d+_[VS][_ ]/, '');                // strip SG prefix
  name = name.replace(/_\d+$/, '');                           // strip _1 suffix
  name = name.replace(/\s*\(\d+\)$/, '');                     // strip (2) suffix
  name = name.replace(/_/g, ' ');                             // underscores -> spaces
  return name.trim();
}

function extractGender(cleanedName) {
  for (const pat of GENDER_PATTERNS) {
    if (pat.re.test(cleanedName)) {
      const species = cleanedName.replace(pat.re, '').trim();
      return { species, gender: pat.gender, genderText: pat.text };
    }
  }
  return { species: cleanedName, gender: null, genderText: null };
}

// ---------------------------------------------------------------------------
// Distractor generation
// ---------------------------------------------------------------------------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDistractors(species, allSpecies) {
  const category = nameToCategory[species];
  let pool = [];

  if (category) {
    pool = CATEGORIES[category].filter(n => n !== species && allSpecies.has(n));
  }

  if (pool.length < 3) {
    const extras = [...allSpecies].filter(n => n !== species && !pool.includes(n));
    pool = pool.concat(shuffle(extras));
  }

  return shuffle(pool).slice(0, 3);
}

// ---------------------------------------------------------------------------
// Build data.json
// ---------------------------------------------------------------------------
function buildData() {
  const locations = fs.readdirSync(IMG_DIR).filter((entry) => {
    const full = path.join(IMG_DIR, entry);
    return fs.statSync(full).isDirectory() && !entry.startsWith('.');
  });

  // First pass: collect entries with gender info
  const entries = [];
  for (const location of locations) {
    const locDir = path.join(IMG_DIR, location);
    const files = fs.readdirSync(locDir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    for (const file of files) {
      const cleaned = cleanName(file);
      const { species, gender, genderText } = extractGender(cleaned);
      entries.push({
        path: `img/${location}/${file}`,
        location,
        name: species,
        gender,
        genderText,
      });
    }
  }

  const allSpecies = new Set(entries.map(e => e.name));

  // Second pass: assign category + distractors
  const data = entries.map((entry) => {
    const category = nameToCategory[entry.name] || 'Sonstige';
    const distractors = getDistractors(entry.name, allSpecies);
    const wikiUrl = 'https://de.wikipedia.org/wiki/' + encodeURIComponent(entry.name.replace(/ /g, '_'));
    return { ...entry, category, distractors, wikiUrl };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');

  const uncategorized = [...allSpecies].filter(n => !nameToCategory[n]).sort();
  if (uncategorized.length > 0) {
    console.warn('Uncategorized animals:', uncategorized.join(', '));
  }

  console.log(`Wrote ${data.length} entries to data.json`);
}

buildData();
