# KeshComponents — Circuit Studio

KeshComponents is an experimental circuit-design assistant. Describe a project or choose parts, review an editable schematic, then generate a two-sided PCB preview you can arrange and inspect in 3D.

> **Prototype:** This project is for concept development and visualization. It is not a replacement for an electronic design automation (EDA) tool.

## Features

- Generate an advisory schematic from a written design brief.
- Edit the schematic by moving components, connecting pins, and disconnecting pins.
- Browse 64 bundled components across control, sensors, power, connectivity, interface, inputs, passives, protection, and connectors.
- Search the live JLCSearch component catalog for additional parts.
- Generate a two-sided PCB preview with estimated package bodies, pads, copper traces, vias, mounting holes, and silkscreen labels.
- Move components between the physical front and back faces of the same board. Orbit the board to inspect both sides.
- Export the design as a JSON file.

## Requirements

- Node.js 20 or newer
- npm
- Internet access for OpenRouter AI requests and live component search

## Run locally

```bash
git clone https://github.com/kesshavankiruba-design/KeshComponents.git
cd KeshComponents
npm install
npm start
```

Open [http://localhost:4173](http://localhost:4173) in your browser.

## Configure AI generation

AI-assisted schematic generation uses the OpenRouter Chat Completions API. Add a `.env` file in the project root:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
PORT=4173
```

`OPENROUTER_API_KEY` is required for OpenRouter requests. `OPENROUTER_MODEL` and `PORT` are optional; the defaults are `openrouter/free` and `4173`. Keep your `.env` file private and do not commit API keys to GitHub.

If OpenRouter is unavailable or no key is configured, the app falls back to a local starter design. The bundled component library and manual schematic and PCB editing remain available. Live catalog search requires an internet connection; the bundled library remains available if the catalog cannot be reached.

## Using the editor

### Schematic

- Click a component to inspect it and drag it to reposition it.
- Click one pin and then another pin to connect them.
- Right-click a pin to disconnect it from its net.
- Add parts from the component browser in the bottom dock.

### PCB preview

- Select **Generate PCB layout** after reviewing the schematic.
- Select a component and use its **Front / Back** control to change which physical board face it is mounted on.
- Use the toolbar’s **Front / Back** buttons to aim the camera at either face. Both faces belong to the same board.
- Drag a component to move it. Press **R** to rotate the selected component by 90 degrees.
- Drag empty board space to orbit around the board, **Shift-drag** to pan, and scroll to zoom.
- Select **Reset view** to restore the default camera angle.

## API routes

The Node.js server provides the following local routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Reports server health, selected model, and whether an OpenRouter key is configured. |
| `GET` | `/api/components/catalog` | Returns the bundled component library. |
| `GET` | `/api/components/search?q=esp32` | Searches the live JLCSearch catalog. |
| `POST` | `/api/generate` | Creates a schematic plan from a prompt. Body: `{"prompt":"..."}` |
| `POST` | `/api/placement` | Applies a placement command to components. |
| `POST` | `/api/optimize` | Suggests improved component positions. |

Schematic generation calls OpenRouter. The server also includes placement-command and layout-optimization endpoints. Live part search calls JLCSearch at `jlcsearch.tscircuit.com`; search results may include LCSC catalog details and links.

## Project files

- `index.html` — application structure
- `styles.css` — application and PCB preview styles
- `app.js` — schematic editor, component browser, and interactive PCB preview
- `server.js` — local HTTP server, API routes, and external service requests
- `components.json` — bundled component catalog

## Design limitations

Generated schematics, pin assignments, footprints, placements, and traces are estimates. The PCB renderer and router are visual previews: they do not guarantee correct electrical connections, clearances, manufacturability, or complete routing. The project does not run circuit simulation, electrical rule checking, signal-integrity analysis, or manufacturing design-rule checks. The JSON export is not a native EDA project or a fabrication package.

Verify the circuit and board in an EDA application before manufacturing.
