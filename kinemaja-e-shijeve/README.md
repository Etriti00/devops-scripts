# Kinemaja e Shijeve 🎬🍲

*The Cinema of Flavours.* A warm, cinema-themed recipe blog in Albanian, built as a gift. Readers can browse recipes and leave comments. The author uses a large-type dashboard to post recipes herself.

## What's inside

**The public blog** (all in Albanian)
- An old-cinema look: velvet curtain header, a marquee sign with chasing bulbs, film grain, and a curtain that opens on the first visit.
- The newest recipe appears under **"Tani në ekran"** (Now showing). The other recipes are **ticket cards**, and categories are cinema **"zhanre"** (genres).
- Each recipe page has:
  - a photo in a film-strip frame
  - the story behind the recipe (**"Kujtimi pas kësaj recete"**)
  - ingredients you can tick off and steps you can mark as done (both remembered while you cook)
  - a "keep screen awake" option
  - a print-friendly layout
  - a **film pairing** ("Filmi që i shkon kësaj gjelle")
  - a 👏 applause button
- **Comments** need only a name, with no account. They have spam protection (a honeypot field, a timing check and a rate limit), and her replies appear under each comment.
- A **"Fik dritat"** (turn off the lights) dark mode, search, an About page with a polaroid photo, and a friendly 404 page.

**Her dashboard** (`/paneli`)
- A simple login with username and password, no email. On the first visit, a setup screen creates the account.
- Large tiles: *Write a new recipe · My recipes · Comments · Smoke-free journey · See the blog · Help*.
- A **5-step recipe wizard**: name & photo → ingredients → method → memory & film → review & publish.
  - Pressing Enter adds the next ingredient, and pasting a list splits it into rows.
  - Photos are resized in the browser.
  - Unfinished recipes are auto-saved, and she is warned before leaving with unsaved changes.
  - Recipes can be saved as drafts.
  - Publishing ends with a celebration screen and a "Copy link" button for Viber or WhatsApp.
- Comments: new ones are highlighted. She can reply or delete, and every delete asks for confirmation in a friendly dialog.
- **A text-size switch (A A A)** that the dashboard remembers.
- **"Rruga ime pa duhan"** (my smoke-free journey), a private corner that supports her quitting:
  - a live counter of days, hours and seconds
  - cigarettes not smoked and money saved
  - health milestones
  - a **"Më erdhi dëshira" button** (I'm having a craving) that starts a 2-minute guided breathing exercise and counts every craving she beats
  - a no-shame restart if she slips
  - an optional "X ditë pa duhan" (X days smoke-free) badge on the blog
- A Help page that answers common questions in plain language.

## Running it

Requires Node.js 18 or newer.

```bash
npm install
npm start            # http://localhost:3000
```

Open `http://localhost:3000/paneli` and create her account. You can do this together with her the first time.

All data lives in the `data/` folder: `db.json` holds the content and `uploads/` holds the photos. **Backing up that folder backs up everything.** Set `DATA_DIR` to put the folder somewhere else.

### Previewing with sample recipes

```bash
npm run demo           # adds 4 sample recipes and 2 comments
npm run demo -- --hiq  # removes them again (her own recipes are untouched)
```

### If she forgets her password

```bash
npm run fjalekalimi -- <username> <new-password>
```

## Deploying

This is a normal Node app with **one persistent folder**. Any host that keeps a disk between restarts will work:

- **Docker / VPS:**
  ```bash
  docker build -t kinemaja .
  docker run -d -p 80:3000 -v kinemaja-data:/data --restart unless-stopped kinemaja
  ```
  Put Caddy or Nginx in front for HTTPS.
- **Render / Railway / Fly.io:** create a web service from this folder, attach a persistent disk or volume, and set `DATA_DIR` to its mount path.

Serve it over **HTTPS**. Once it is behind HTTPS, the login cookie is marked secure automatically.

## Tech

Express, EJS server-rendered pages and a small atomic JSON file store. There is no database server and no build step. The CSS and JavaScript are plain and hand-written.
