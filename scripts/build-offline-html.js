#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const jsDir = path.join(projectRoot, 'js');
const dataDir = path.join(projectRoot, 'data');
const indexHtmlPath = path.join(projectRoot, 'index.html');
const outputDir = path.join(projectRoot, 'dist');
const outputFilename = 'quiz-offline.html';

function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function encodeModule(filePath, relativePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    if (relativePath.startsWith('js/')) {
        code = code
            .replace(/(import\s+(?:[\s\S]*?\s+from\s+)['"])\.\/([^'"]+)(['"])/g, (_, start, spec, end) => {
                return `${start}js/${spec}${end}`;
            })
            .replace(/(import\s*)(['"])\.\/([^'"]+)(['"])/g, (_, start, quote, spec, endQuote) => {
                return `${start}${quote}js/${spec}${endQuote}`;
            });
    }

    const base64 = Buffer.from(code, 'utf8').toString('base64');
    return `data:application/javascript;base64,${base64}`;
}

function collectModuleData() {
    if (!fs.existsSync(jsDir)) {
        throw new Error('Expected "js" directory with module sources.');
    }

    const moduleEntries = {};

    function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
            const entryPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(entryPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                const relativePath = path.relative(projectRoot, entryPath).replace(/\\/g, '/');
                moduleEntries[relativePath] = encodeModule(entryPath, relativePath);
            }
        });
    }

    walk(jsDir);
    return moduleEntries;
}

function escapeForScript(content) {
    return content
        .replace(/<\/script/gi, '<\\/script')
        .replace(/<!/g, '<\\!');
}

function buildOfflineDataPayload() {
    if (!fs.existsSync(dataDir)) {
        throw new Error('Expected "data" directory with quiz JSON.');
    }

    const manifestPath = path.join(dataDir, 'quiz_manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const quizDataMap = {};
    fs.readdirSync(dataDir, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'quiz_manifest.json')
        .forEach(entry => {
            const key = `data/${entry.name}`;
            const fileContent = JSON.parse(fs.readFileSync(path.join(dataDir, entry.name), 'utf8'));
            quizDataMap[key] = fileContent;
        });

    return { manifest, quizDataMap };
}

function buildOfflineShimScript(dataPayload) {
    const manifestJson = escapeForScript(JSON.stringify(dataPayload.manifest));
    const quizDataJson = escapeForScript(JSON.stringify(dataPayload.quizDataMap));

    return `<script>
window.__QUIZ_OFFLINE_SINGLE__ = true;
(function() {
  const manifest = ${manifestJson};
  const quizDataMap = ${quizDataJson};

  function normalize(resource) {
    let url = '';
    if (typeof resource === 'string') {
      url = resource;
    } else if (resource && typeof resource.url === 'string') {
      url = resource.url;
    } else {
      return null;
    }

    if (url.startsWith(location.origin)) {
      url = url.slice(location.origin.length);
    }
    url = url.split('?')[0];
    url = url.replace(/^\\/+/, '');
    url = url.replace(/^\\.\\/+/, '');
    return url;
  }

  const originalFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

  window.fetch = function(resource, options) {
    const normalized = normalize(resource);
    if (normalized) {
      if (normalized === 'data/quiz_manifest.json') {
        const body = JSON.stringify(manifest);
        return Promise.resolve(new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      if (Object.prototype.hasOwnProperty.call(quizDataMap, normalized)) {
        const body = JSON.stringify(quizDataMap[normalized]);
        return Promise.resolve(new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    }
    if (originalFetch) {
      return originalFetch(resource, options);
    }
    return Promise.reject(new Error('Offline bundle cannot resolve resource: ' + normalized));
  };

  window.__QUIZ_OFFLINE_DATA__ = { manifest, quizDataMap };
})();
</script>`;
}

function buildConfettiFallbackScript() {
    return `<script>
(function() {
  if (typeof window !== 'object' || typeof window.confetti === 'function') {
    return;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  window.confetti = function(options) {
    const settings = Object.assign({ particleCount: 120, spread: 70, origin: { y: 0.6 } }, options || {});
    const duration = 1500;
    const animationEnd = Date.now() + duration;
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    for (let i = 0; i < settings.particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * (settings.origin.y || 0.6),
        angle: rand(0, Math.PI * 2),
        velocity: rand(3, 6),
        size: rand(3, 7),
        tilt: rand(-0.5, 0.5),
        color: 'hsl(' + Math.floor(rand(0, 360)) + ', 100%, 55%)'
      });
    }

    function drawParticle(particle) {
      ctx.beginPath();
      ctx.fillStyle = particle.color;
      ctx.ellipse(particle.x, particle.y, particle.size, particle.size / 2, particle.angle, 0, Math.PI * 2);
      ctx.fill();
    }

    function update() {
      const now = Date.now();
      if (now > animationEnd) {
        document.body.removeChild(canvas);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.x += Math.cos(particle.angle) * particle.velocity;
        particle.y -= Math.sin(particle.angle) * particle.velocity + 2;
        particle.angle += particle.tilt * 0.04;
        drawParticle(particle);
      });

      requestAnimationFrame(update);
    }

    update();
  };
})();
</script>`;
}

function buildImportMapScript(modules) {
    const imports = {};
    Object.keys(modules).forEach(modulePath => {
        const normalized = modulePath.replace(/\\/g, '/');
        imports[normalized] = modules[modulePath];
    });
    const importMapJson = JSON.stringify({ imports }, null, 2);
    return `<script type="importmap">
${importMapJson}
</script>`;
}

function buildEntryModuleScript() {
    return `<script type="module" defer>
import 'js/app.js';
</script>`;
}

function buildOfflineHtml() {
    if (!fs.existsSync(indexHtmlPath)) {
        throw new Error('Cannot find index.html at project root.');
    }

    const originalHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    const modules = collectModuleData();
    const dataPayload = buildOfflineDataPayload();

    const importMapScript = buildImportMapScript(modules);
    const offlineShim = buildOfflineShimScript(dataPayload);
    const confettiFallback = buildConfettiFallbackScript();
    const entryModuleScript = buildEntryModuleScript();

    let transformed = originalHtml;
    transformed = transformed.replace(/<link[^>]*rel=["']preconnect["'][^>]*>\s*/gi, '');
    transformed = transformed.replace(/<script[^>]*goatcounter[^>]*><\/script>\s*/gi, '');
    transformed = transformed.replace(/<script[^>]*canvas-confetti[^>]*><\/script>\s*/gi, '');
    transformed = transformed.replace(
        /<script\s+type=["']module["']\s+src=["']js\/app\.js["']\s+defer\s*><\/script>/i,
        `${importMapScript}\n${offlineShim}\n${confettiFallback}\n${entryModuleScript}`
    );

    ensureDirectory(outputDir);
    const outputPath = path.join(outputDir, outputFilename);
    fs.writeFileSync(outputPath, transformed, 'utf8');
    console.log(`Offline bundle generated at ${path.relative(projectRoot, outputPath)}`);
}

buildOfflineHtml();
