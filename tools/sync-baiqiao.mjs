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

async function findIllustrations(slug) {
  const directoryName = `${slug}-illustrations`;
  const sourceDir = path.join(workspaceAssetsDir, directoryName);

  try {
    const entries = (await readdir(sourceDir, { withFileTypes: true }))
      .filter(entry => entry.isFile() && /\.(png|jpe?g|webp|gif)$/i.test(entry.name));
    return { directoryName, sourceDir, entries };
  } catch {
    return null;
  }
}

async function copyIllustrations(illustrations) {
  if (!illustrations) return;
  const targetDir = path.join(sourceAssetsDir, illustrations.directoryName);
  await mkdir(targetDir, { recursive: true });
  await Promise.all(illustrations.entries.map(entry =>
    copyFile(path.join(illustrations.sourceDir, entry.name), path.join(targetDir, entry.name))
  ));
}

function addIllustrations(body, title, illustrations) {
  if (!illustrations) return body;

  const imageFor = number => illustrations.entries
    .map(entry => entry.name)
    .find(name => name.startsWith(`${number}-`) && !name.startsWith(`seq_${number}`));

  const cover = imageFor('00');
  if (cover) {
    const url = `/assets/${illustrations.directoryName}/${encodeURIComponent(cover)}`;
    body = `![${title}](${url})\n\n${body}`;
  }

  return body.replace(/^(##\s+([0-9]{2})\s+.+)$/gm, (heading, _full, number) => {
    const image = imageFor(number);
    if (!image) return heading;
    const url = `/assets/${illustrations.directoryName}/${encodeURIComponent(image)}`;
    return `${heading}\n\n![${title} · ${number}](${url})`;
  });
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
  const illustrations = await findIllustrations(slug);

  let body = titleMatch
    ? raw.slice(0, titleMatch.index) + raw.slice(titleMatch.index + titleMatch[0].length)
    : raw;
  body = body.trim();
  body = addIllustrations(body, title, illustrations);
  body = addExcerpt(body);

  await copyIllustrations(illustrations);

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
