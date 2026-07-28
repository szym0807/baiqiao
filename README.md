# 白乔 Hexo 博客

这个博客使用 Hexo 与 NexT 主题，并自动同步上一级目录中由白乔流程生成的 Markdown 文章。

## 日常使用

在 Codex 中用白乔流程完成文章，并让它同时保留一个名为 `wechat_article_<slug>.md` 的 Markdown 文件。然后进入 `blog` 目录：

```powershell
corepack pnpm run dev
```

启动时会先同步文章，再打开本地博客。浏览地址默认为 <http://localhost:4000>。

只同步文章：

```powershell
corepack pnpm run posts:sync
```

生成可发布的静态网站：

```powershell
corepack pnpm run build
```

生成结果在 `public` 目录。

## GitHub Pages 托管

把 `blog` 目录推送到 GitHub 仓库的 `main` 分支后，仓库内的 GitHub Actions 会自动构建并部署。

在 GitHub 仓库的 **Settings → Pages** 中，将 **Source** 设为 **GitHub Actions**。之后每次推送都会自动更新博客。

工作流会自动判断网址：

- 仓库名是 `<用户名>.github.io`：发布到 `https://<用户名>.github.io`
- 其他仓库名：发布到 `https://<用户名>.github.io/<仓库名>`

## 内容约定

- 文章文件：上一级目录的 `wechat_article_*.md`
- 配图目录：上一级目录的 `assets/<slug>-illustrations`
- 封面文件：`00-cover.png`
- 章节配图：以 `01-`、`02-` 等章节编号开头

同步脚本会自动生成标题、日期、分类、标签和首页摘要，并把相应配图放入文章。
