import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = process.env.GITHUB_REPOSITORY || process.env.GITHUB_PAGES_REPOSITORY;

if (!repository || !repository.includes('/')) {
  throw new Error('缺少 GITHUB_REPOSITORY，格式应为 owner/repository。');
}

const [owner, repo] = repository.split('/');
const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const url = isUserSite
  ? `https://${owner}.github.io`
  : `https://${owner}.github.io/${repo}`;
const root = isUserSite ? '/' : `/${repo}/`;

const config = [
  '# Generated automatically for GitHub Pages.',
  `url: ${url}`,
  `root: ${root}`,
  ''
].join('\n');

await writeFile(path.join(blogDir, '_config.github.yml'), config, 'utf8');
console.log(`GitHub Pages 地址：${url}`);
