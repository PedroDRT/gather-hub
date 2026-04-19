// Shared helpers for the extension. Exposed as `GH_UTILS` global.
(function () {
  const PREFIX = '[GATHER-HUB]';

  const logger = {
    log: (...a) => console.log(PREFIX, ...a),
    info: (...a) => console.info(PREFIX, ...a),
    warn: (...a) => console.warn(PREFIX, ...a),
    error: (...a) => console.error(PREFIX, ...a),
    debug: (...a) => console.debug(PREFIX, ...a),
  };

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Bounded TTL set: keeps insertion order, evicts expired and oldest entries.
  function createDedupSet({ ttl, max } = {}) {
    const ttlMs = ttl ?? 5 * 60 * 1000;
    const maxSize = max ?? 200;
    const map = new Map();

    function evictExpired() {
      const now = Date.now();
      for (const [key, ts] of map) {
        if (now - ts > ttlMs) map.delete(key);
        else break;
      }
    }

    return {
      has(key) {
        const ts = map.get(key);
        if (ts === undefined) return false;
        if (Date.now() - ts > ttlMs) {
          map.delete(key);
          return false;
        }
        return true;
      },
      add(key) {
        map.delete(key);
        map.set(key, Date.now());
        evictExpired();
        while (map.size > maxSize) {
          map.delete(map.keys().next().value);
        }
      },
      clear() {
        map.clear();
      },
      get size() {
        return map.size;
      },
    };
  }

  // Returns a sanitized SVGElement from an arbitrary string, or null if invalid.
  // Uses the HTML parser (permissive - keeps gradients, filters, custom attrs)
  // but strips elements/attributes that could execute scripts.
  const DANGEROUS_SVG_TAGS = new Set([
    'script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video',
  ]);

  function isDangerousUrl(value) {
    if (!value) return false;
    return /^\s*(javascript|data|vbscript):/i.test(value);
  }

  function safeParseSvg(svgString) {
    if (typeof svgString !== 'string') return null;
    const trimmed = svgString.trim();
    if (!/^<svg[\s>]/i.test(trimmed)) return null;
    if (typeof DOMParser === 'undefined' || typeof document === 'undefined') return null;

    let svg;
    try {
      const doc = new DOMParser().parseFromString(
        `<!DOCTYPE html><html><body>${trimmed}</body></html>`,
        'text/html'
      );
      svg = doc.body.querySelector('svg');
    } catch {
      return null;
    }
    if (!svg) return null;

    function sanitize(node) {
      for (const child of [...node.children]) {
        if (DANGEROUS_SVG_TAGS.has(child.tagName.toLowerCase())) {
          child.remove();
          continue;
        }
        for (const attr of [...child.attributes]) {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on')) {
            child.removeAttribute(attr.name);
          } else if ((name === 'href' || name === 'xlink:href') && isDangerousUrl(attr.value)) {
            child.removeAttribute(attr.name);
          }
        }
        sanitize(child);
      }
    }

    for (const attr of [...svg.attributes]) {
      if (attr.name.toLowerCase().startsWith('on')) svg.removeAttribute(attr.name);
    }
    sanitize(svg);

    // Adopt into the current document so styles apply correctly.
    try {
      return document.adoptNode(svg);
    } catch {
      return svg;
    }
  }

  // Tries to extract the user-facing name from a raw notification text using a
  // capture group from any of the provided regexes.
  function extractMatch(text, patterns) {
    if (!text || !patterns) return null;
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return m;
    }
    return null;
  }

  function cleanUserName(rawName) {
    if (!rawName) return null;
    let cleaned = rawName.replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, '').trim();
    cleaned = cleaned.replace(/\d+/g, '').trim();

    if (cleaned.length >= 2 && /^[A-ZÀ-Ÿ]{2}/.test(cleaned) && cleaned[0] === cleaned[1]) {
      cleaned = cleaned.substring(1);
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0) return cleaned || null;

    if (
      words.length >= 2 &&
      words[0].length === 1 &&
      /^[a-zA-ZÀ-ÿ]$/.test(words[0]) &&
      words[1].toLowerCase().startsWith(words[0].toLowerCase())
    ) {
      words.shift();
    }

    for (let i = Math.min(4, words.length); i >= 2; i--) {
      const candidate = words.slice(-i).join(' ');
      if (/^[a-zA-ZÀ-ÿ\s'-]+$/.test(candidate) && candidate.length <= 50) {
        return candidate.replace(/\s+/g, ' ').trim();
      }
    }

    const last = words[words.length - 1];
    if (last && /^[a-zA-ZÀ-ÿ'-]+$/.test(last)) return last;
    return words.join(' ') || null;
  }

  const utils = {
    logger,
    debounce,
    createDedupSet,
    safeParseSvg,
    extractMatch,
    cleanUserName,
  };

  if (typeof globalThis !== 'undefined') globalThis.GH_UTILS = utils;
})();
