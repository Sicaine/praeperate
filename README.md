# Praep - Lernapp

A static learning app for studying animal specimens (Präparate). Built for GitHub Pages.

## Features

- **Multiple Choice Quiz**: Identify the animal from 4 options (1 correct, 3 random from the same location)
- **Flashcard Mode**: View the image, then reveal the answer
- **Location Filter**: Select specimens by collection location (e.g. Ebersberg, Rosenheim)

## Run locally

```bash
# Generate data.json from the img/ directory
node build_data.js

# Serve with any static file server
npx serve .
```

Then open [http://localhost:3000](http://localhost:3000).

## How it works

1. `build_data.js` scans `img/` subdirectories, cleans filenames (strips prefixes like `SG2_V_`, suffixes like `_1` or `(2)`, and file extensions), and writes `data.json`.
2. `index.html` fetches `data.json` and renders the quiz/flashcard UI.

## Deployment

Pushes to `main` trigger a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds `data.json` and deploys to GitHub Pages.

## Project structure

```
build_data.js          # Generates data.json from img/
index.html             # Single-page learning app
data.json              # Generated image metadata
img/
  ebersberg/           # Specimen images (Ebersberg)
  rosenheim/           # Specimen images (Rosenheim)
.github/workflows/
  deploy.yml           # GitHub Pages deployment
```
