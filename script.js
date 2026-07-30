/* ============================================================
   SURYAPUR — script.js
   Mobile menu, scroll reveals, typing headings, count-up numbers,
   itinerary map route switching, and dynamic Markdown content loading.
   ============================================================ */

// --- SETTINGS (beginners: change these numbers to tune animations) ---
const TYPING_SPEED = 42;       // milliseconds per letter (lower = faster typing)
const COUNT_DURATION = 1400;   // milliseconds for count-up animation


// --- MOBILE MENU ---
const menuButton = document.getElementById('menuButton');
const navLinks = document.getElementById('navLinks');

if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', isOpen);
    menuButton.textContent = isOpen ? 'Close ×' : 'Menu ☰';
  });

  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = 'Menu ☰';
  }));
}


// --- SCROLL REVEAL (fade sections in as you scroll) ---
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  }
}), { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(item => revealObserver.observe(item));


// --- TYPING EFFECT for all h1 and h2 headings ---
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startTyping(heading) {
  if (heading.dataset.typed === 'true') return;
  heading.dataset.typed = 'true';

  const originalHTML = heading.innerHTML;
  const fullText = heading.textContent;

  if (prefersReducedMotion) {
    heading.innerHTML = originalHTML;
    heading.classList.add('typed');
    return;
  }

  heading.textContent = '';
  heading.classList.add('typing');

  let charIndex = 0;

  function typeNextLetter() {
    if (charIndex < fullText.length) {
      charIndex += 1;
      heading.textContent = fullText.slice(0, charIndex);
      setTimeout(typeNextLetter, TYPING_SPEED);
    } else {
      heading.innerHTML = originalHTML;
      heading.classList.remove('typing');
      heading.classList.add('typed');
    }
  }

  typeNextLetter();
}

const typeObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      startTyping(entry.target);
      typeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.25 });

document.querySelectorAll('h1, h2').forEach(heading => {
  const inHero = heading.closest('.page-hero, .hero-copy');
  if (inHero) {
    startTyping(heading);
  } else {
    typeObserver.observe(heading);
  }
});


// --- COUNT-UP NUMBERS (0 → target) ---
function easeOut(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function formatCountValue(value, options) {
  const { decimals = 0, suffix = '', prefix = '', pad = 0 } = options;
  let text;

  if (decimals > 0) {
    text = value.toFixed(decimals);
  } else {
    text = String(Math.round(value));
  }

  if (pad > 0) {
    text = text.padStart(pad, '0');
  }

  return prefix + text + suffix;
}

function animateCount(el) {
  if (el.dataset.counted === 'true') return;
  el.dataset.counted = 'true';

  const target = parseFloat(el.dataset.count);
  if (Number.isNaN(target)) return;

  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const pad = parseInt(el.dataset.pad || '0', 10);

  if (prefersReducedMotion) {
    el.textContent = formatCountValue(target, { decimals, suffix, prefix, pad });
    return;
  }

  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / COUNT_DURATION, 1);
    const current = target * easeOut(progress);
    el.textContent = formatCountValue(current, { decimals, suffix, prefix, pad });

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatCountValue(target, { decimals, suffix, prefix, pad });
    }
  }

  el.textContent = formatCountValue(0, { decimals, suffix, prefix, pad });
  requestAnimationFrame(tick);
}

function autoSetupCount(el) {
  if (el.classList.contains('count-up') || el.dataset.count) return;

  const text = el.textContent.trim();
  if (text.includes('/')) return;

  const suffixMatch = text.match(/^(\d+(?:\.\d+)?)(k\+)$/);
  if (suffixMatch) {
    el.classList.add('count-up');
    el.dataset.count = suffixMatch[1];
    el.dataset.suffix = suffixMatch[2];
    return;
  }

  const decimalMatch = text.match(/^(\d+\.\d+)$/);
  if (decimalMatch) {
    el.classList.add('count-up');
    el.dataset.count = decimalMatch[1];
    el.dataset.decimals = text.split('.')[1].length;
    return;
  }

  const intMatch = text.match(/^(\d+)$/);
  if (intMatch) {
    el.classList.add('count-up');
    el.dataset.count = intMatch[1];
    if (text.length === 2 && text.startsWith('0')) {
      el.dataset.pad = '2';
    }
  }
}

document.querySelectorAll('.facts strong, .route b').forEach(autoSetupCount);

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.count-up, [data-count]').forEach(el => countObserver.observe(el));


// --- ITINERARY MAP ROUTING SYSTEM ---
const miniMap = document.querySelector('.mini-map');
const routeButtons = document.querySelectorAll('.itinerary-button');
const activeRoutePath = document.getElementById('activeRoutePath');
const routeBadge = document.getElementById('routeBadge');
const routeMeta = document.getElementById('routeMeta');
const mapPinGroups = document.querySelectorAll('.map-pin-group');
const itineraryCards = document.querySelectorAll('.itinerary-card');

const routeData = {
  heritage: {
    path: "M 90,100 L 210,100 L 210,290",
    badge: "Heritage Morning Route",
    meta: "2.4 km · 3 Stops · 08:00–12:00"
  },
  craft: {
    path: "M 260,80 L 440,100 L 440,220",
    badge: "Craft & Culture Trail",
    meta: "3.1 km · 3 Stops · 11:30–16:00"
  },
  river: {
    path: "M 210,290 L 360,295 L 500,305",
    badge: "River at Dusk Route",
    meta: "1.8 km · 3 Stops · 17:30–20:00"
  }
};

function selectRoute(routeName) {
  if (!miniMap || !routeData[routeName]) return;

  miniMap.dataset.route = routeName;

  // Update SVG active path
  if (activeRoutePath) {
    activeRoutePath.setAttribute('d', routeData[routeName].path);
  }

  // Update overlay info
  if (routeBadge) routeBadge.textContent = routeData[routeName].badge;
  if (routeMeta) routeMeta.textContent = routeData[routeName].meta;

  // Update pin visibility
  mapPinGroups.forEach(pin => {
    const routes = pin.dataset.routes ? pin.dataset.routes.split(',') : [];
    if (routes.includes(routeName)) {
      pin.classList.remove('inactive-pin');
    } else {
      pin.classList.add('inactive-pin');
    }
  });

  // Update buttons state
  routeButtons.forEach(btn => {
    if (btn.dataset.route === routeName) {
      btn.classList.add('active-route');
    } else {
      btn.classList.remove('active-route');
    }
  });

  // Highlight active itinerary card
  itineraryCards.forEach(card => {
    const btn = card.querySelector('.itinerary-button');
    if (btn && btn.dataset.route === routeName) {
      card.classList.add('active-card');
    } else {
      card.classList.remove('active-card');
    }
  });
}

if (miniMap && routeButtons.length) {
  routeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      selectRoute(button.dataset.route);
    });
  });

  itineraryCards.forEach(card => {
    card.addEventListener('click', () => {
      const btn = card.querySelector('.itinerary-button');
      if (btn) selectRoute(btn.dataset.route);
    });
  });

  mapPinGroups.forEach(pin => {
    pin.addEventListener('click', () => {
      const routes = pin.dataset.routes ? pin.dataset.routes.split(',') : [];
      if (routes.length) selectRoute(routes[0]);
    });
  });
}


// --- DYNAMIC MARKDOWN SYNC ---
// Loads corresponding <page>.md file (e.g. index.md for index.html)
// and updates all elements with matching data-md="..." attributes.

function parseMarkdownContent(mdText) {
  const data = {};

  // 1. Parse YAML frontmatter between --- and ---
  const frontmatterMatch = mdText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  let content = mdText;
  if (frontmatterMatch) {
    const yamlLines = frontmatterMatch[1].split(/\r?\n/);
    yamlLines.forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && !line.trim().startsWith('#')) {
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        data[key] = val;
      }
    });
    content = mdText.slice(frontmatterMatch[0].length);
  }

  // 2. Parse section headings (# key or ## key)
  const sectionRegex = /^#+\s*([a-zA-Z0-9_\-]+)\s*\r?\n([\s\S]*?)(?=\n#+|$)/gm;
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const val = match[2].trim();
    if (key && val && data[key] === undefined) {
      data[key] = val;
    }
  }

  // 3. Parse key: value lines outside frontmatter
  const lines = content.split(/\r?\n/);
  lines.forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !line.trim().startsWith('#') && !line.trim().startsWith('-')) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if (key && !key.includes(' ') && val && data[key] === undefined) {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        data[key] = val;
      }
    }
  });

  return data;
}

function renderMarkdownText(text) {
  if (!text) return '';
  return text
    .replace(/\*br\*/gi, '<br>')
    .replace(/\\n/g, '<br>')
    .replace(/\r?\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

async function loadPageMarkdown() {
  let path = window.location.pathname.split('/').pop();
  if (!path || path.startsWith('index')) {
    path = 'index.html';
  }
  const pageName = path.replace('.html', '');
  const mdFileName = `${pageName}.md`;

  try {
    const response = await fetch(mdFileName);
    if (!response.ok) return;
    const text = await response.text();
    const mdData = parseMarkdownContent(text);

    document.querySelectorAll('[data-md]').forEach(el => {
      const key = el.dataset.md;
      if (mdData[key] !== undefined) {
        const formatted = renderMarkdownText(mdData[key]);
        el.innerHTML = formatted;

        // If the element is a count-up element, update dataset.count as well
        if (el.classList.contains('count-up') || el.dataset.count !== undefined) {
          const rawNum = mdData[key].replace(/[^0-9.]/g, '');
          if (rawNum) {
            el.dataset.count = rawNum;
          }
        }
      }
    });
  } catch (err) {
    console.warn('Markdown dynamic loader note:', err.message);
  }
}

// Run markdown content loader on DOM load
document.addEventListener('DOMContentLoaded', loadPageMarkdown);
