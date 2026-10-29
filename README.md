# PartsVault

A small, local organizer for electronics parts. Track what you own, how many you have, and where you put it.

## Run

Install Node.js 20 or newer, then run this from the PartsVault folder:

```sh
npm start
```

Open **http://localhost:3000** in your browser. Stop the server with Ctrl+C. No packages need to be installed.

## Features

- Add, edit, and delete parts, with custom categories.
- Store quantities, part numbers, specifications, locations, and notes.
- Adjust stock with the + and − controls.
- Search your whole inventory and filter by category or low stock.
- Set an optional low-stock threshold per part. A threshold of zero disables low-stock alerts; zero quantity always shows as out of stock.
- Export and import JSON backups. Import merges by part ID, updates matching parts, and keeps unrelated parts. Importing the same backup twice does not duplicate its parts.
- Optional sample inventory, added only when you choose it.
- Responsive layout for desktop and phones.

## Your data

Inventory is saved automatically in this browser's local storage, with no account or cloud service. Keep using the same browser and URL, and export backups regularly. Clearing browser data removes the stored inventory. Private browsing can discard it when you close the browser. Other browsers and devices do not share inventory; use export/import to transfer it.

The app works without an internet connection after starting the local server. Fonts use Google Fonts when available and fall back to system fonts offline.

## Checks

```sh
npm test
```

Tests cover backup validation, import merging, stock thresholds, quantity validation, and inventory search/filtering.
