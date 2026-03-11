const express = require('express');
const router = express.Router();
const path = require('path');
const { marked } = require('marked');
const hljs = require('highlight.js');
const store = require('../lib/store');

function encodeImagePath(src) {
  try {
    const decoded = decodeURIComponent(src);
    return decoded.split('/').map(segment => encodeURIComponent(segment)).join('/');
  } catch {
    return src.split('/').map(segment => encodeURIComponent(segment)).join('/');
  }
}

marked.setOptions({
  breaks: true,
  gfm: true
});

marked.use({
  renderer: {
    image({ href, title, text }) {
      if (href && !href.startsWith('http://') && !href.startsWith('https://')) {
        href = encodeImagePath(href);
      }
      return `<img src="${href}" alt="${text || ''}"${title ? ` title="${title}"` : ''} style="max-width:100%;height:auto;" />`;
    }
  }
});

function rewriteImagePaths(mdContent, pageId) {
  return mdContent.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    (match, alt, src) => {
      let trimmed = src.trim();
      if (trimmed.startsWith('/uploads/')) {
        return match;
      }
      return `![${alt}](/uploads/${pageId}/${trimmed})`;
    }
  );
}

// Project index — list pages
router.get('/:projectUuid', (req, res) => {
  const project = store.getProjectByUuid(req.params.projectUuid);
  if (!project) return res.status(404).render('error', { message: 'Project tidak ditemukan' });
  const pages = store.getPagesByProject(project.id).map(p => ({
    ...p,
    expired: store.isPageExpired(p)
  }));
  res.render('page/project-index', { project, pages });
});

// Page password gate + view
router.get('/:projectUuid/:pageSlug', (req, res) => {
  const project = store.getProjectByUuid(req.params.projectUuid);
  if (!project) return res.status(404).render('error', { message: 'Project tidak ditemukan' });

  const page = store.getPageBySlug(project.id, req.params.pageSlug);
  if (!page) return res.status(404).render('error', { message: 'Halaman tidak ditemukan' });

  if (store.isPageExpired(page)) {
    return res.render('page/expired', { project, page });
  }

  const sessionKey = `page_unlocked_${page.id}`;
  if (req.session[sessionKey]) {
    store.incrementViewCount(page.id);
    const freshPage = store.getPageById(page.id);
    const rewritten = rewriteImagePaths(freshPage.content, freshPage.id);
    const htmlContent = marked(rewritten);
    return res.render('page/view', { project, page: freshPage, htmlContent });
  }

  res.render('page/password', { project, page, error: null });
});

router.post('/:projectUuid/:pageSlug', async (req, res) => {
  const project = store.getProjectByUuid(req.params.projectUuid);
  if (!project) return res.status(404).render('error', { message: 'Project tidak ditemukan' });

  const page = store.getPageBySlug(project.id, req.params.pageSlug);
  if (!page) return res.status(404).render('error', { message: 'Halaman tidak ditemukan' });

  if (store.isPageExpired(page)) {
    return res.render('page/expired', { project, page });
  }

  const { password } = req.body;
  const valid = await store.verifyPagePassword(page.id, password);

  if (!valid) {
    return res.render('page/password', { project, page, error: 'Password salah' });
  }

  req.session[`page_unlocked_${page.id}`] = true;
  req.session[`page_pwd_${page.id}`] = password;
  store.incrementViewCount(page.id);
  const freshPage = store.getPageById(page.id);
  const rewritten = rewriteImagePaths(freshPage.content, freshPage.id);
  const htmlContent = marked(rewritten);
  res.render('page/view', { project, page: freshPage, htmlContent });
});

// PDF export
router.get('/:projectUuid/:pageSlug/pdf', async (req, res) => {
  const project = store.getProjectByUuid(req.params.projectUuid);
  if (!project) return res.status(404).render('error', { message: 'Project tidak ditemukan' });

  const page = store.getPageBySlug(project.id, req.params.pageSlug);
  if (!page) return res.status(404).render('error', { message: 'Halaman tidak ditemukan' });

  const sessionKey = `page_unlocked_${page.id}`;
  if (!req.session[sessionKey]) {
    return res.redirect(`/s/${req.params.projectUuid}/${req.params.pageSlug}`);
  }

  const rewritten = rewriteImagePaths(page.content, page.id);
  const htmlContent = marked(rewritten);
  const pagePassword = req.session[`page_pwd_${page.id}`] || '';

  try {
    const puppeteer = require('puppeteer');
    const muhammara = require('muhammara');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const browserPage = await browser.newPage();

    const fullHtml = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${page.title}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 100%;
    margin: 0;
    padding: 0;
    color: #1a1a1a;
    line-height: 1.7;
    font-size: 11pt;
  }
  h1 { font-size: 20pt; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 16pt; margin-top: 24px; }
  h3 { font-size: 13pt; margin-top: 20px; }
  pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 9pt; white-space: pre-wrap; word-wrap: break-word; }
  code { font-size: 9pt; }
  p code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-size: 9pt; }
  img { max-width: 100%; height: auto; page-break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; page-break-inside: avoid; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
  th { background-color: #f9fafb; font-weight: 600; }
  blockquote { border-left: 4px solid #3b82f6; margin: 12px 0; padding: 4px 16px; color: #4b5563; }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  a { color: #2563eb; text-decoration: none; }
</style>
</head><body>
<h1>${page.title}</h1>
${htmlContent}
<footer style="margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:9pt;">
  ${project.name} &bull; ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
</footer>
</body></html>`;

    const uploadsAbsPath = path.resolve(store.UPLOADS_DIR);
    const pdfHtml = fullHtml.replace(/src="\/uploads\/([^"]+)"/g, (match, p) => {
      const decoded = decodeURIComponent(p);
      return `src="file://${uploadsAbsPath}/${decoded}"`;
    });
    await browserPage.setContent(pdfHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await browserPage.pdf({
      format: 'A4',
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      printBackground: true
    });
    await browser.close();

    let finalPdf = pdfBuffer;
    if (pagePassword) {
      try {
        const fs = require('fs');
        const os = require('os');
        const tmpInput = path.join(os.tmpdir(), `mdv-in-${Date.now()}.pdf`);
        const tmpOutput = path.join(os.tmpdir(), `mdv-out-${Date.now()}.pdf`);
        fs.writeFileSync(tmpInput, pdfBuffer);
        muhammara.recrypt(tmpInput, tmpOutput, {
          userPassword: pagePassword,
          ownerPassword: pagePassword,
          userProtectionFlag: 4
        });
        finalPdf = fs.readFileSync(tmpOutput);
        fs.unlinkSync(tmpInput);
        fs.unlinkSync(tmpOutput);
      } catch (encryptErr) {
        console.error('PDF encryption failed, sending unencrypted:', encryptErr.message);
      }
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${page.slug}.pdf"`
    });
    res.send(finalPdf);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).render('error', { message: 'Gagal generate PDF' });
  }
});

module.exports = router;
