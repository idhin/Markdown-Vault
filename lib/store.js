const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const DATA_FILE = path.join(__dirname, '..', 'data', 'data.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { projects: [], pages: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Projects ---

function getAllProjects() {
  const data = readData();
  return data.projects.map(p => ({
    ...p,
    pageCount: data.pages.filter(pg => pg.projectId === p.id).length
  }));
}

function getProjectById(id) {
  return readData().projects.find(p => p.id === id) || null;
}

function getProjectByUuid(uuid) {
  return readData().projects.find(p => p.uuid === uuid) || null;
}

function createProject(name) {
  const data = readData();
  const project = {
    id: uuidv4(),
    uuid: uuidv4(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.projects.push(project);
  writeData(data);
  return project;
}

function updateProject(id, name) {
  const data = readData();
  const idx = data.projects.findIndex(p => p.id === id);
  if (idx === -1) return null;
  data.projects[idx].name = name.trim();
  data.projects[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.projects[idx];
}

function deleteProject(id) {
  const data = readData();
  const pagesToDelete = data.pages.filter(p => p.projectId === id);
  pagesToDelete.forEach(p => deletePageUploads(p.id));
  data.projects = data.projects.filter(p => p.id !== id);
  data.pages = data.pages.filter(p => p.projectId !== id);
  writeData(data);
}

// --- Pages ---

function getPagesByProject(projectId) {
  return readData().pages.filter(p => p.projectId === projectId);
}

function getPageById(id) {
  return readData().pages.find(p => p.id === id) || null;
}

function getPageBySlug(projectId, slug) {
  return readData().pages.find(p => p.projectId === projectId && p.slug === slug) || null;
}

function generateUniqueSlug(projectId, title, excludePageId = null) {
  const data = readData();
  let base = slugify(title, { lower: true, strict: true }) || 'page';
  let slug = base;
  let counter = 1;
  while (data.pages.some(p =>
    p.projectId === projectId && p.slug === slug && p.id !== excludePageId
  )) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

async function createPage(projectId, { title, content, password, expiresAt }) {
  const data = readData();
  const slug = generateUniqueSlug(projectId, title);
  const passwordHash = await bcrypt.hash(password, 10);
  const page = {
    id: uuidv4(),
    projectId,
    title: title.trim(),
    slug,
    content,
    passwordHash,
    expiresAt: expiresAt || null,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.pages.push(page);
  writeData(data);
  return page;
}

async function updatePage(id, { title, content, password, expiresAt }) {
  const data = readData();
  const idx = data.pages.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const page = data.pages[idx];

  if (title !== undefined) {
    page.title = title.trim();
    page.slug = generateUniqueSlug(page.projectId, title, id);
  }
  if (content !== undefined) page.content = content;
  if (password) page.passwordHash = await bcrypt.hash(password, 10);
  if (expiresAt !== undefined) page.expiresAt = expiresAt || null;
  page.updatedAt = new Date().toISOString();

  data.pages[idx] = page;
  writeData(data);
  return page;
}

function deletePage(id) {
  deletePageUploads(id);
  const data = readData();
  data.pages = data.pages.filter(p => p.id !== id);
  writeData(data);
}

function deletePageUploads(pageId) {
  const dir = path.join(UPLOADS_DIR, pageId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function getPageUploadsDir(pageId) {
  const dir = path.join(UPLOADS_DIR, pageId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function verifyPagePassword(pageId, password) {
  const page = getPageById(pageId);
  if (!page) return false;
  return bcrypt.compare(password, page.passwordHash);
}

function incrementViewCount(pageId) {
  const data = readData();
  const idx = data.pages.findIndex(p => p.id === pageId);
  if (idx === -1) return;
  data.pages[idx].viewCount = (data.pages[idx].viewCount || 0) + 1;
  writeData(data);
}

function isPageExpired(page) {
  if (!page.expiresAt) return false;
  return new Date(page.expiresAt) < new Date();
}

module.exports = {
  getAllProjects,
  getProjectById,
  getProjectByUuid,
  createProject,
  updateProject,
  deleteProject,
  getPagesByProject,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  verifyPagePassword,
  incrementViewCount,
  isPageExpired,
  getPageUploadsDir,
  UPLOADS_DIR
};
