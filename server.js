const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 4173);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const catalog = [
  ['USB-C charging & data port', 'Edge mounted · power + programming', 'USB', 'usb-port power-part'],
  ['ALPS Alpine RKJXV1224005', '2-axis joystick + switch', 'JOY', 'input-part'],
  ['SSD1306 OLED Display', '128×64 I²C display', 'OLED', 'input-part'],
  ['u-blox MAX-M10S', 'GNSS receiver', 'GPS', 'input-part'],
  ['Bosch BMI270', '6-axis IMU', 'IMU', 'input-part'],
  ['TI DRV8833', 'Dual motor driver', 'MTR', 'power-part'],
  ['nRF52840', 'Bluetooth LE controller', 'BLE', ''],
  ['ESP32-S3', 'Wi-Fi + BLE module', 'WIFI', ''],
  ['BQ24074', 'LiPo charger + power path', 'CHG', 'power-part'],
  ['BME280', 'Environmental sensor', 'SEN', 'input-part'],
  ['MAX98357A', 'I²S audio amplifier', 'AUD', 'power-part'],
  ['Omron G5LE Relay', 'Isolated load switch', 'RLY', 'power-part'],
  ['OV2640 Camera', '2 MP image sensor', 'CAM', 'input-part'],
  ['MicroSD Socket', 'Storage connector', 'SD', 'input-part'],
  ['Status LED', 'Power and status indicator', 'LED', 'input-part'],
  ['RP2040 USB controller', 'Native USB game controller MCU', 'MCU', ''],
  ['STM32G0 Controller', 'Main control and I/O', 'MCU', '']
];

const catalogText = catalog.map((item, i) => `${i + 1}. ${item[0]} — ${item[1]} — glyph ${item[2]} — class ${item[3]}`).join('\n');

let genaiPromise;
async function getAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to .env or your environment.');
  }
  if (!genaiPromise) {
    genaiPromise = import('@google/genai').then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
  }
  return genaiPromise;
}

const componentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Stable unique component id such as part-1.' },
    name: { type: 'string' },
    sub: { type: 'string' },
    glyph: { type: 'string' },
    kind: { type: 'string' },
    tag: { type: 'string' },
    value: { type: 'string' },
    copy: { type: 'string' },
    x: { type: 'number', minimum: 4, maximum: 94 },
    y: { type: 'number', minimum: 8, maximum: 92 }
  },
  required: ['id', 'name', 'sub', 'glyph', 'kind', 'tag', 'value', 'copy', 'x', 'y']
};

const generateSchema = {
  type: 'object',
  properties: {
    boardName: { type: 'string' },
    boardWidthMm: { type: 'number', minimum: 20, maximum: 200 },
    boardHeightMm: { type: 'number', minimum: 20, maximum: 200 },
    components: { type: 'array', minItems: 2, maxItems: 32, items: componentSchema },
    checks: {
      type: 'array', minItems: 4, maxItems: 4,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          status: { type: 'string' },
          detail: { type: 'string' }
        },
        required: ['name', 'status', 'detail']
      }
    },
    compactness: { type: 'integer', minimum: 1, maximum: 100 },
    optimizationSummary: { type: 'string' }
  },
  required: ['boardName', 'boardWidthMm', 'boardHeightMm', 'components', 'checks', 'compactness', 'optimizationSummary']
};

const placementSchema = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['move', 'swap', 'none'] },
    sourceId: { type: 'string' },
    targetId: { type: 'string' },
    direction: { type: 'string', enum: ['above', 'below', 'left', 'right', 'near', 'none'] },
    x: { type: 'number', minimum: 4, maximum: 94 },
    y: { type: 'number', minimum: 8, maximum: 92 },
    reply: { type: 'string' }
  },
  required: ['action', 'sourceId', 'targetId', 'direction', 'x', 'y', 'reply']
};

const optimizeSchema = {
  type: 'object',
  properties: {
    compactness: { type: 'integer', minimum: 1, maximum: 100 },
    summary: { type: 'string' },
    placements: {
      type: 'array', maxItems: 32,
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, x: { type: 'number', minimum: 4, maximum: 94 }, y: { type: 'number', minimum: 8, maximum: 92 } },
        required: ['id', 'x', 'y']
      }
    }
  },
  required: ['compactness', 'summary', 'placements']
};

async function structuredGenerate(contents, schema) {
  const ai = await getAI();
  const model = GEMINI_MODEL;

  console.log(`Gemini request using generateContent with model: ${model}`);

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: `${contents}\n\nIMPORTANT: Return only a valid JSON object. Do not use Markdown, code fences, headings, or explanatory text. It must conform to this JSON Schema:\n${JSON.stringify(schema)}`,
      config: {
        responseMimeType: 'application/json'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error?.status || error?.statusCode || error?.code;
    const details = status ? ` (status ${status})` : '';
    throw new Error(`Gemini request failed${details}: ${message}`);
  }

  const output = response?.text;
  if (!output) {
    throw new Error('Gemini returned no JSON text. Check the API key, model access, and request schema.');
  }

  try {
    // Be tolerant of a model that wraps otherwise valid JSON in Markdown.
    const cleaned = output.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
  } catch (error) {
    throw new Error(`Gemini returned invalid JSON: ${output.slice(0, 500)}`);
  }
}

function safeCatalogComponent(component, index) {
  const exact = catalog.find(item => item[0].toLowerCase() === String(component.name).toLowerCase());
  const matched = exact || catalog.find(item => item[0].toLowerCase().includes(String(component.name).toLowerCase()) || String(component.name).toLowerCase().includes(item[0].toLowerCase()));
  const fallback = matched || ['Requested subsystem', component.sub || 'Custom requested subsystem', component.glyph || 'NEW', component.kind || 'input-part'];
  return {
    id: `part-${index + 1}`,
    name: matched ? fallback[0] : String(component.name).slice(0, 70),
    sub: matched ? fallback[1] : String(component.sub || 'Custom requested subsystem').slice(0, 80),
    glyph: matched ? fallback[2] : String(component.glyph || 'NEW').slice(0, 6),
    kind: matched ? fallback[3] : String(component.kind || 'input-part'),
    tag: String(component.tag || 'CATALOG MATCH').slice(0, 30),
    value: String(component.value || 'Auto-sized').slice(0, 40),
    copy: String(component.copy || `${component.name} was selected from the available design catalog.`).slice(0, 260),
    x: Number(component.x),
    y: Number(component.y)
  };
}

function normalizePlan(plan) {
  const normalized = [];
  const seen = new Set();
  for (const [index, component] of plan.components.entries()) {
    const item = safeCatalogComponent(component, index);
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    item.x = Number.isFinite(item.x) ? Math.max(4, Math.min(94, item.x)) : 50;
    item.y = Number.isFinite(item.y) ? Math.max(8, Math.min(92, item.y)) : 50;
    normalized.push(item);
  }
  if (!normalized.some(c => /USB-C/i.test(c.name))) {
    normalized.unshift({ id: 'part-1', name: catalog[0][0], sub: catalog[0][1], glyph: catalog[0][2], kind: catalog[0][3], tag: 'USB-C', value: 'Auto-sized', copy: 'USB-C is kept at the board edge for accessible power and data.', x: 4, y: 50 });
    normalized.forEach((c, i) => c.id = `part-${i + 1}`);
  }
  if (!normalized.some(c => /controller|MCU/i.test(c.name))) {
    const mcu = catalog.find(c => /STM32G0/.test(c[0]));
    normalized.push({ id: `part-${normalized.length + 1}`, name: mcu[0], sub: mcu[1], glyph: mcu[2], kind: mcu[3], tag: 'MCU', value: 'Auto-sized', copy: 'Main control and I/O controller selected as a general-purpose fallback.', x: 52, y: 50 });
  }
  normalized.forEach((c, i) => c.id = `part-${i + 1}`);
  normalized[0].x = 4;
  normalized[0].y = 50;
  return normalized;
}

async function generatePCB(prompt) {
  const plan = await structuredGenerate(`You are the KeshComponents PCB design copilot.\n\nUser request:\n${prompt}\n\nAvailable component catalog (you may only select exact catalog parts when possible):\n${catalogText}\n\nCreate an advisory PCB concept. Select the smallest useful set of catalog parts that directly satisfies the request. Always include USB-C and a controller/MCU. Do not invent manufacturer part numbers. Place USB-C at the left board edge. Keep an RF antenna or sensitive sensor away from noisy power components when relevant. Return practical approximate positions as percentages only; this is a UI concept, not a fabrication-ready PCB.\n\nFor checks, be conservative. Use statuses such as Clear, Review, or Not verified. Do not claim an actual electrical-rule, thermal, or manufacturing certification because this app does not run an EDA rules engine.`, generateSchema);
  return { ...plan, components: normalizePlan(plan) };
}

async function placementCommand(command, components) {
  const current = components.map(c => `${c.id}: ${c.name} at (${c.x}%, ${c.y}%)`).join('\n');
  return structuredGenerate(`You are the KeshComponents placement assistant.\nUser command: ${command}\nCurrent components:\n${current}\n\nResolve the component names against the current list. Never move USB-C away from the left board edge. If the command requests an impossible or ambiguous change, return action=none and explain why. For a move, calculate a reasonable new x/y. For swap, use action=swap.`, placementSchema);
}

async function optimizeLayout(components) {
  const current = components.map(c => `${c.id}: ${c.name} at (${c.x}%, ${c.y}%)`).join('\n');
  return structuredGenerate(`You are the KeshComponents layout assistant. Optimize this conceptual PCB placement.\nCurrent components:\n${current}\n\nKeep USB-C at x=4, y=50. Keep components separated enough to remain visually distinct. Prefer short connections to the controller and sensible grouping of power, input, and RF parts. Return approximate UI positions only; do not claim manufacturing or electrical certification.`, optimizeSchema);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 200000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res) {
  try {
    const body = await readBody(req);
    if (req.url === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        model: GEMINI_MODEL,
        apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
      });
    }
    if (req.url === '/api/generate') {
      if (!body.prompt || typeof body.prompt !== 'string') return sendJson(res, 400, { error: 'A design prompt is required.' });
      const plan = await generatePCB(body.prompt);
      return sendJson(res, 200, { plan, model: GEMINI_MODEL });
    }
    if (req.url === '/api/placement') {
      if (!body.command || !Array.isArray(body.components)) return sendJson(res, 400, { error: 'Command and components are required.' });
      const result = await placementCommand(body.command, body.components);
      return sendJson(res, 200, { result, model: GEMINI_MODEL });
    }
    if (req.url === '/api/optimize') {
      if (!Array.isArray(body.components)) return sendJson(res, 400, { error: 'Components are required.' });
      const result = await optimizeLayout(body.components);
      return sendJson(res, 200, { result, model: GEMINI_MODEL });
    }
    return sendJson(res, 404, { error: 'API route not found.' });
  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    const status = /GEMINI_API_KEY/.test(message) ? 500 : 502;
    return sendJson(res, status, { error: message, model: GEMINI_MODEL });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/api/')) return handleApi(req, res);
  if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      model: GEMINI_MODEL,
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' });
    return res.end('Method Not Allowed');
  }

  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.resolve(ROOT, `.${urlPath}`);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('File not found'); }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`KeshComponents running at http://localhost:${PORT}`);
  console.log(`Gemini model: ${GEMINI_MODEL}`);
  console.log(process.env.GEMINI_API_KEY ? 'Gemini API key detected.' : 'Gemini API key not detected yet. Add GEMINI_API_KEY to .env.');
});
