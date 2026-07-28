import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const titleIndex = args.indexOf('--title');
const title = titleIndex >= 0 && args[titleIndex + 1]
  ? args[titleIndex + 1].trim()
  : '新文章';

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: blogDir,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    shell: false
  });

  if (options.allowedExitCodes?.includes(result.status)) return result;
  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
    }
    process.exit(result.status ?? 1);
  }
  return result;
}

run(process.execPath, [path.join(blogDir, 'tools', 'sync-baiqiao.mjs')]);
run('git', ['add', '--all', '--', 'source/_posts', 'source/assets']);

const diff = run('git', ['diff', '--cached', '--quiet'], {
  capture: true,
  allowedExitCodes: [0, 1]
});

if (diff.status === 0) {
  console.log('博客仓库没有需要发布的新文章。');
  process.exit(0);
}

const safeTitle = title.replace(/[\r\n]+/g, ' ').slice(0, 80);
run('git', ['commit', '-m', `Publish Baiqiao article: ${safeTitle}`]);

const githubKey = process.platform === 'win32'
  ? path.join(process.env.USERPROFILE || '', '.ssh', 'id_ed25519_github')
  : path.join(process.env.HOME || '', '.ssh', 'id_ed25519_github');

const pushArgs = [];
if (githubKey && existsSync(githubKey)) {
  const sshCommand = `ssh -i ${githubKey.replaceAll('\\', '/')} -o IdentitiesOnly=yes`;
  pushArgs.push('-c', `core.sshCommand=${sshCommand}`);
}
pushArgs.push('push');

run('git', pushArgs);
console.log('白乔文章已同步并推送到 GitHub，GitHub Pages 将自动更新。');
