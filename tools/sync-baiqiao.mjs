import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDir = path.resolve(blogDir, '..');
const postsDir = path.join(blogDir, 'source', '_posts');
const sourceAssetsDir = path.join(blogDir, 'source', 'assets');
const workspaceAssetsDir = path.join(workspaceDir, 'assets');

await mkdir(postsDir, { recursive: true });
await mkdir(sourceAssetsDir, { recursive: true });

const files = (await readdir(workspaceDir))
  .filter(name => /^wechat_article_.+\.md$/i.test(name))
  .sort();

function yamlString(value) {
  return JSON.stringify(value);
}

function formatDate(value) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(value);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

async function findCover(slug) {
  const directoryName = `${slug}-illustrations`;
  const sourceDir = path.join(workspaceAssetsDir, directoryName);

  try {
    const entries = (await readdir(sourceDir, { withFileTypes: true }))
      .filter(entry => entry.isFile() && /^00-cover.*\.(png|jpe?g|webp|gif)$/i.test(entry.name));
    const preferred = entries.find(entry => entry.name.toLowerCase() === '00-cover.png') || entries[0];
    return preferred ? { directoryName, sourceDir, entry: preferred } : null;
  } catch {
    return null;
  }
}

async function copyCover(cover) {
  if (!cover) return;
  const targetDir = path.join(sourceAssetsDir, cover.directoryName);
  await mkdir(targetDir, { recursive: true });
  await copyFile(
    path.join(cover.sourceDir, cover.entry.name),
    path.join(targetDir, cover.entry.name)
  );
}

function addCover(body, title, cover) {
  if (!cover) return body;
  const url = `/assets/${cover.directoryName}/${encodeURIComponent(cover.entry.name)}`;
  return `![${title}](${url})\n\n${body}`;
}

function addExcerpt(body) {
  if (body.includes('<!-- more -->')) return body;
  const blocks = body.split(/\r?\n\r?\n/);
  const firstHeading = blocks.findIndex((block, index) => index > 0 && /^##\s/m.test(block));
  const position = Math.min(firstHeading > 0 ? firstHeading : blocks.length, 5);
  blocks.splice(position, 0, '<!-- more -->');
  return blocks.join('\n\n');
}

for (const filename of files) {
  const sourcePath = path.join(workspaceDir, filename);
  const slug = path.basename(filename, '.md').replace(/^wechat_article_/, '');
  const raw = (await readFile(sourcePath, 'utf8')).replace(/^\uFEFF/, '');
  const titleMatch = raw.match(/^#\s+(.+?)\s*$/m);
  const title = titleMatch?.[1]?.trim() || slug.replace(/[-_]+/g, ' ');
  const metadata = await stat(sourcePath);
  const date = metadata.birthtimeMs > 0 ? metadata.birthtime : metadata.mtime;
  const cover = await findCover(slug);

  let body = titleMatch
    ? raw.slice(0, titleMatch.index) + raw.slice(titleMatch.index + titleMatch[0].length)
    : raw;
  body = body.trim();
  body = addCover(body, title, cover);
  body = addExcerpt(body);

  await copyCover(cover);

  const frontMatter = [
    '---',
    `title: ${yamlString(title)}`,
    `date: ${formatDate(date)}`,
    `updated: ${formatDate(metadata.mtime)}`,
    'categories:',
    '  - 人生感悟',
    'tags:',
    '  - 白乔',
    '  - 生活智慧',
    'generated_by: baiqiao-sync',
    `source_file: ${yamlString(filename)}`,
    '---',
    ''
  ].join('\n');

  await writeFile(path.join(postsDir, `${slug}.md`), `${frontMatter}${body}\n`, 'utf8');
}

console.log(`已同步 ${files.length} 篇白乔文章。`);
