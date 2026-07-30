/* ============================================================
   SURYAPUR — script.js
   Mobile menu, scroll reveals, typing headings, count-up numbers,
   and itinerary map route switching.
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
// Saves the original HTML (keeps <br>, <em>, etc.), types plain text,
// then restores the HTML when finished.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startTyping(heading) {
  if (heading.dataset.typed === 'true') return;
  heading.dataset.typed = 'true';

  const originalHTML = heading.innerHTML;
  const fullText = heading.textContent;

  // Skip animation if user prefers reduced motion — show text immediately
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

// Hero headings type right away; other h1/h2 type when scrolled into view
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
// Add class "count-up" and data-count="42" in HTML to animate any number.
// Optional: data-decimals="1" for 7.3, data-suffix="k+" for 8k+, data-pad="2" for 01

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

// Auto-detect numbers in .facts strong and .route b (no data-count needed)
function autoSetupCount(el) {
  if (el.classList.contains('count-up') || el.dataset.count) return;

  const text = el.textContent.trim();

  // Skip non-numeric labels like "24/7"
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


// --- ITINERARY MAP — switch route when a card button is clicked ---
const miniMap = document.querySelector('.mini-map');
const routeButtons = document.querySelectorAll('.itinerary-button');

if (miniMap && routeButtons.length) {
  routeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const route = button.dataset.route;
      miniMap.dataset.route = route;

      routeButtons.forEach(btn => btn.classList.remove('active-route'));
      button.classList.add('active-route');
    });
  });
}
