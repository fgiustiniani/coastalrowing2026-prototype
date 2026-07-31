import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const partialsDir = join(rootDir, 'src', 'partials');

const headerTemplate = await readFile(join(partialsDir, 'header.html'), 'utf8');
const footerTemplate = await readFile(join(partialsDir, 'footer.html'), 'utf8');

const pageKeys = new Map([
  ['index.html', 'home'],
  ['info-gare.html', 'info-gare'],
  ['vivi-pesaro.html', 'vivi-pesaro'],
  ['sostenibilita.html', 'sostenibilita'],
  ['proteggere-il-mare.html', 'sostenibilita'],
  ['accogliere-tutti.html', 'sostenibilita'],
  ['nutrire-il-futuro.html', 'sostenibilita'],
  ['diventa-partner.html', 'partner'],
  ['faq.html', 'faq'],
  ['contatti.html', 'contatti']
]);

const pageModels = new Map([
  ['index.html', 'home'],
  ['info-gare.html', 'operational'],
  ['faq.html', 'operational'],
  ['contatti.html', 'operational'],
  ['privacy-policy.html', 'operational'],
  ['vivi-pesaro.html', 'editorial'],
  ['sostenibilita.html', 'editorial'],
  ['proteggere-il-mare.html', 'editorial'],
  ['accogliere-tutti.html', 'editorial'],
  ['nutrire-il-futuro.html', 'editorial'],
  ['diventa-partner.html', 'editorial']
]);

const sharedStylesheets = ['page-system.css', 'visual-cleanup.css'];

const excludedEntries = new Set([
  '.git',
  '.github',
  '.vscode',
  'dist',
  'node_modules',
  'src',
  'scripts',
  'netlify',
  'package.json',
  'package-lock.json',
  'netlify.toml',
  'README.md',
  'EMAIL_SETUP.md'
]);

const headerPattern = /<header\b(?=[^>]*\bclass=(["'])[^"']*\bsite-header\b[^"']*\1)[^>]*>[\s\S]*?<\/header>/i;
const footerPattern = /<footer\b(?=[^>]*\bclass=(["'])[^"']*\bsite-footer\b[^"']*\1)[^>]*>[\s\S]*?<\/footer>/i;
const bodyPattern = /<body([^>]*)>/i;

function renderHeader(fileName) {
  const currentPage = pageKeys.get(fileName) || '';

  return headerTemplate.replace(/\{\{CURRENT:([^}]+)\}\}/g, (_, pageKey) =>
    pageKey === currentPage ? ' aria-current="page"' : ''
  );
}

function addPageModel(fileName, source) {
  const model = pageModels.get(fileName);
  if (!model) return source;

  const modelClasses = `page-model page-model--${model}`;

  return source.replace(bodyPattern, (_, attributes = '') => {
    const classPattern = /\bclass=(["'])(.*?)\1/i;

    if (classPattern.test(attributes)) {
      const updatedAttributes = attributes.replace(classPattern, (_classMatch, quote, classes) => {
        const classList = new Set(String(classes).split(/\s+/).filter(Boolean));
        modelClasses.split(' ').forEach((className) => classList.add(className));
        return `class=${quote}${Array.from(classList).join(' ')}${quote}`;
      });
      return `<body${updatedAttributes}>`;
    }

    return `<body${attributes} class="${modelClasses}">`;
  });
}

function addSharedStyles(source) {
  return sharedStylesheets.reduce((output, stylesheet) => {
    if (output.includes(`href="${stylesheet}"`)) return output;
    return output.replace(/<\/head>/i, `  <link rel="stylesheet" href="${stylesheet}">\n</head>`);
  }, source);
}

function buildPage(fileName, source) {
  if (!headerPattern.test(source)) {
    throw new Error(`Header non trovato in ${fileName}`);
  }
  if (!footerPattern.test(source)) {
    throw new Error(`Footer non trovato in ${fileName}`);
  }
  if (!bodyPattern.test(source)) {
    throw new Error(`Elemento body non trovato in ${fileName}`);
  }

  let output = source
    .replace(headerPattern, renderHeader(fileName))
    .replace(footerPattern, footerTemplate);

  output = addPageModel(fileName, output);
  output = addSharedStyles(output);
  return output;
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const rootEntries = await readdir(rootDir, { withFileTypes: true });

for (const entry of rootEntries) {
  if (excludedEntries.has(entry.name) || entry.name.startsWith('.')) continue;
  if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') continue;

  await cp(join(rootDir, entry.name), join(distDir, entry.name), {
    recursive: entry.isDirectory()
  });
}

const htmlFiles = rootEntries
  .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.html')
  .map((entry) => entry.name)
  .sort();

for (const fileName of htmlFiles) {
  const source = await readFile(join(rootDir, fileName), 'utf8');
  const output = buildPage(fileName, source);
  await writeFile(join(distDir, fileName), output, 'utf8');
}

console.log(`Build completata: ${htmlFiles.length} pagine generate in dist/.`);
