# Markdown Vault

A self-hosted, password-protected markdown sharing platform. Create projects, write or upload markdown pages, set individual passwords per page, and share them via unique URLs.

## Features

- **Multi-project** — organize pages into projects, each with a unique share URL (UUID-based, non-guessable)
- **Password per page** — every page is individually protected with a hashed password (bcrypt)
- **Markdown editor** — write markdown with live preview, syntax highlighting, and image upload
- **File upload** — upload `.md` files with their referenced images/assets, folder structure preserved
- **Image support** — drag & drop, paste, or button upload images into the editor
- **PDF export** — download pages as PDF, password-protected with the same page password
- **Dark/Light mode** — toggle theme, preference saved in localStorage
- **Syntax highlighting** — code blocks highlighted via highlight.js
- **Copy link** — one-click copy share URL to clipboard
- **View counter** — track how many times a page has been accessed
- **Expiry date** — optionally set pages to expire after a certain date
- **IP whitelist** — restrict admin panel access by IP address
- **Clean share view** — shared pages render as full-page reports without branding
- **Docker ready** — deploy with docker-compose in seconds

## Quick Start

### Local

```bash
git clone https://github.com/idhin/Markdown-Vault.git
cd Markdown-Vault
cp .env.example .env    # edit .env with your settings
npm install
npm start               # http://localhost:3000
```

### Docker

```bash
git clone https://github.com/idhin/Markdown-Vault.git
cd Markdown-Vault
cp .env.example .env    # edit .env with your settings
docker-compose up -d --build
```

## Configuration

All configuration is done via `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ADMIN_PASSWORD` | Password to access admin panel | — |
| `SESSION_SECRET` | Secret for session encryption | — |
| `ADMIN_WHITELIST_IPS` | Comma-separated IPs allowed to access admin (empty = allow all) | — |

## Usage

1. Open `http://localhost:3000/admin` and login with your admin password
2. Create a project (e.g. "Client Report Q1")
3. Add pages — write markdown manually or upload `.md` files with images
4. Set a password for each page
5. Share the project URL (`/s/<uuid>`) with your client
6. Client opens the link, enters the page password, and reads the content

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Templating**: EJS
- **Markdown**: marked + highlight.js
- **PDF**: Puppeteer + muhammara (password encryption)
- **Storage**: JSON file (no database needed)
- **Styling**: Tailwind CSS

## License

ISC

## Author

**khulafaur@rasyid.in**
