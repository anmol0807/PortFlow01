# PortFlow — GitHub Pages Edition

A public, browser-only container management simulator built with HTML, CSS and JavaScript.

## Features
- Opens directly to the dashboard — no login or registration page
- No Firebase, authentication, cloud database or backend server
- Add, search, edit and delete container records
- Update container status
- Add and manage vessels, then assign vessels to containers
- Allocate yard, block and slot locations
- Track containers and review movement history
- Saves data in browser `localStorage`

## Run locally
Keep `index.html`, `style.css`, `script.js` and `port-background.jpg` in the same folder. Open `index.html` in a browser.

## Deploy with GitHub Pages
1. Upload all four files to the root of a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then Save.

## Data limitation
This edition stores data only in the current browser's localStorage. Data is not synchronized between devices or users, and may be lost if browser site data is cleared. Since there is no authentication or backend, this version is intended as a demonstration/simulation, not a secure multi-user production system.
