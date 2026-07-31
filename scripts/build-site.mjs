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

function renderHeader(fileName) {
  const currentPage = pageKeys.get(fileName) || '';

  return headerTemplate.replace(/\{\{CURRENT:([^}]+)\}\}/g, (_, pageKey) =>
    pageKey === currentPage ? ' aria-current="page"' : ''
  );
}

function buildPage(fileName, source) {
  if (!headerPattern.test(source)) {
    throw new Error(`Header non trovato in ${fileName}`);
  }
  if (!footerPattern.test(source)) {
    throw new Error(`Footer non trovato in ${fileName}`);
  }

  return source
    .replace(headerPattern, renderHeader(fileName))
    .replace(footerPattern, footerTemplate);
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
