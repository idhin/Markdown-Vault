const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const store = require('../lib/store');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip;
}

function requireIpWhitelist(req, res, next) {
  const whitelist = process.env.ADMIN_WHITELIST_IPS;
  if (!whitelist) return next();

  const allowed = whitelist.split(',').map(ip => ip.trim()).filter(Boolean);
  if (allowed.length === 0) return next();

  const clientIp = getClientIp(req);
  if (allowed.some(ip => clientIp === ip || clientIp.endsWith(ip))) {
    return next();
  }

  return res.status(403).render('forbidden', { clientIp });
}

router.use(requireIpWhitelist);

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

// --- Login ---

router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Password salah' });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// --- Projects ---

router.get('/', requireAuth, (req, res) => {
  const projects = store.getAllProjects();
  res.render('admin/projects', { projects });
});

router.post('/project', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.redirect('/admin');
  store.createProject(name);
  res.redirect('/admin');
});

router.get('/project/:id', requireAuth, (req, res) => {
  const project = store.getProjectById(req.params.id);
  if (!project) return res.status(404).render('error', { message: 'Project tidak ditemukan' });
  const pages = store.getPagesByProject(project.id);
  res.render('admin/project-detail', { project, pages });
});

router.post('/project/:id/update', requireAuth, (req, res) => {
  const { name } = req.body;
  store.updateProject(req.params.id, name);
  res.redirect('/admin');
});

router.post('/project/:id/delete', requireAuth, (req, res) => {
  store.deleteProject(req.params.id);
  res.redirect('/admin');
});

// --- Pages ---

router.get('/project/:projectId/page/new', requireAuth, (req, res) => {
  const project = store.getProjectById(req.params.projectId);
  if (!project) return res.status(404).render('error', { message: 'Project tidak ditemukan' });
  res.render('admin/page-editor', { project, page: null });
});

router.post('/project/:projectId/page', requireAuth, async (req, res) => {
  const { title, content, password, expiresAt } = req.body;
  await store.createPage(req.params.projectId, { title, content, password, expiresAt });
  res.redirect(`/admin/project/${req.params.projectId}`);
});

router.get('/project/:projectId/page/:pageId/edit', requireAuth, (req, res) => {
  const project = store.getProjectById(req.params.projectId);
  const page = store.getPageById(req.params.pageId);
  if (!project || !page) return res.status(404).render('error', { message: 'Tidak ditemukan' });
  res.render('admin/page-editor', { project, page });
});

router.post('/project/:projectId/page/:pageId/update', requireAuth, async (req, res) => {
  const { title, content, password, expiresAt } = req.body;
  await store.updatePage(req.params.pageId, { title, content, password, expiresAt });
  res.redirect(`/admin/project/${req.params.projectId}`);
});

router.post('/project/:projectId/page/:pageId/delete', requireAuth, (req, res) => {
  store.deletePage(req.params.pageId);
  res.redirect(`/admin/project/${req.params.projectId}`);
});

// --- Upload .md file + assets (create new page from uploaded files) ---

router.post('/project/:projectId/upload', requireAuth, upload.array('files', 200), async (req, res) => {
  const { password, expiresAt } = req.body;
  const projectId = req.params.projectId;

  if (!req.files || req.files.length === 0) {
    return res.redirect(`/admin/project/${projectId}`);
  }

  const mdFile = req.files.find(f => f.originalname.endsWith('.md'));
  if (!mdFile) {
    return res.status(400).render('error', { message: 'Tidak ada file .md yang diupload' });
  }

  const mdContent = mdFile.buffer.toString('utf-8');
  const titleFromFilename = path.basename(mdFile.originalname, '.md').replace(/[-_]/g, ' ');

  const page = await store.createPage(projectId, {
    title: titleFromFilename,
    content: mdContent,
    password: password || 'default',
    expiresAt: expiresAt || null
  });

  const uploadsDir = store.getPageUploadsDir(page.id);
  for (const file of req.files) {
    if (file.originalname.endsWith('.md')) continue;

    const relativePath = file.originalname;
    const targetPath = path.join(uploadsDir, relativePath);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetPath, file.buffer);
  }

  res.redirect(`/admin/project/${projectId}/page/${page.id}/edit`);
});

// --- Upload images to existing page (API for editor drag & drop) ---

router.post('/project/:projectId/page/:pageId/upload-image', requireAuth, upload.array('images', 50), (req, res) => {
  const page = store.getPageById(req.params.pageId);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const uploadsDir = store.getPageUploadsDir(page.id);
  const uploaded = [];

  for (const file of req.files) {
    const relativePath = file.originalname;
    const targetPath = path.join(uploadsDir, relativePath);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetPath, file.buffer);

    uploaded.push({
      filename: file.originalname,
      url: `/uploads/${page.id}/${relativePath}`,
      markdown: `![${path.basename(file.originalname, path.extname(file.originalname))}](${relativePath})`
    });
  }

  res.json({ success: true, files: uploaded });
});

// --- List uploaded files for a page ---

router.get('/project/:projectId/page/:pageId/files', requireAuth, (req, res) => {
  const page = store.getPageById(req.params.pageId);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const uploadsDir = path.join(store.UPLOADS_DIR, page.id);
  if (!fs.existsSync(uploadsDir)) return res.json({ files: [] });

  const files = [];
  function walkDir(dir, prefix) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walkDir(path.join(dir, entry.name), rel);
      } else {
        files.push({
          path: rel,
          url: `/uploads/${page.id}/${rel}`,
          size: fs.statSync(path.join(dir, entry.name)).size
        });
      }
    }
  }
  walkDir(uploadsDir, '');
  res.json({ files });
});

module.exports = router;
