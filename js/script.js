import { init3DViewer } from './viewer_3d.js';

const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const scrollBtn = document.getElementById('scrollToTopBtn');
const cardsContainer = document.querySelector('.cards');
const infoArea = document.getElementById('test');
const player = document.querySelector('.player');

let papers = [];
let currentIndex = 0;
let lastIndex = 0;
// let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('it') ? 'it' : 'en');

// Funzione per rilevare la lingua iniziale
function detectInitialLanguage() {
  const stored = localStorage.getItem('lang');
  if (stored) return stored;

  const browserLang = navigator.language || navigator.userLanguage;
  return browserLang.startsWith('it') ? 'it' : 'en';
}

let currentLang = detectInitialLanguage();
localStorage.setItem('lang', currentLang);  // salva la prima volta

function openPDF(path) {
  const isAbsolute = /^(https?:\/\/|\/)/i.test(path);
  const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, ''); 
  const fileParam = isAbsolute ? path : `${basePath}/${path}`;
  const viewerUrl = `${basePath}/assets/pdfjs/web/viewer.html?file=${encodeURIComponent(fileParam)}#zoom=page-width`;

  // console.log('🔗 Viewer URL:', viewerUrl);

  const iframe = document.getElementById('pdf-frame');
  const modal = document.getElementById('pdf-modal');

  iframe.src = viewerUrl;
  modal.style.display = 'flex';
  history.pushState({ pdfOpen: true }, '', '');
}

function closeModal() {
  const iframe = document.getElementById('pdf-frame');
  const modal = document.getElementById('pdf-modal');

  modal.style.display = 'none';
  iframe.src = '';
}

closeBtn.onclick = closeModal;
window.onclick = e => { if (e.target === modal) closeModal(); };
window.addEventListener('popstate', () => { if (modal.style.display === 'flex') closeModal(); });

window.addEventListener('scroll', () => {
  scrollBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
});

scrollBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function updateLanguage() {
  const res = await fetch('assets/lang/lang.json');
  const translations = await res.json();
  const t = translations[currentLang];

  const aboutTitle = document.querySelector('#about-me h2');
  if (aboutTitle) aboutTitle.textContent = t.profileTitle;

  const viewBtn = document.querySelector('.cv-button.view .front');
  if (viewBtn) viewBtn.innerHTML = `<i class="fas fa-eye"></i> ${t.viewCV}`;

  const pubTitle = document.querySelector('.section-block.publications h3');
  if (pubTitle) pubTitle.textContent = t.publications;

  const projTitle = document.querySelector('.section-block.projects h3');
  if (projTitle) projTitle.textContent = t.projects;

  const scrollBtn = document.getElementById('scrollToTopBtn');
  if (scrollBtn) scrollBtn.textContent = t.scrollTop;

  const langIcon = document.getElementById('language-icon');
  if (langIcon) {
    langIcon.src = currentLang === 'en'
      ? 'https://hatscripts.github.io/circle-flags/flags/it.svg'
      : 'https://hatscripts.github.io/circle-flags/flags/gb.svg';
    langIcon.alt = currentLang === 'en' ? 'Italian' : 'English';
  }
  
}

async function loadPapers() {
  const res = await fetch('papers.json');
  papers = await res.json();

  cardsContainer.innerHTML = '';
  infoArea.innerHTML = '';

  papers.forEach((paper, i) => {
    let title = paper.title || '';
    let journal = paper.journal || '';
    let year = paper.year || '';
    let preview = paper.preview || 'assets/previews/placeholder.png';
    let doi = paper.doi || '';

    if (paper.doi && (!title || !journal || !year)) {
      fetch(`${apiBase}/metadata?doi=${paper.doi}`)
        .then(metaRes => metaRes.ok ? metaRes.json() : null)
        .then(meta => {
          if (meta) {
            title = title || meta.title;
            journal = journal || meta.journal;
            year = year || meta.year;
            updateCard(i, title, journal, year, doi);
          }
        })
        .catch(err => console.warn(`Errore fetch DOI ${paper.doi}:`, err));
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.id = `song-${i}`;
    card.innerHTML = `<img src="${preview}" alt="Paper ${i + 1}" />`;
    card.addEventListener('click', () => onCardClick(i));
    cardsContainer.appendChild(card);

    const info = document.createElement('div');
    info.className = 'song-info';
    info.id = `song-info-${i}`;
    info.innerHTML = `
      <div class="title">${title}</div>
      <div class="sub-line">
        <span><em>${journal}</em> (${year})</span>
      </div>
      ${doi ? `<div class="doi"><span>DOI:</span> <a href="https://doi.org/${doi}" target="_blank">${doi}</a></div>` : ''}
    `;
    infoArea.appendChild(info);
  });

  attachCardHoverEffect();
  attachDOILinksHandler();
  renderCarousel();
}

function updateCard(i, title, journal, year, doi) {
  const info = document.getElementById(`song-info-${i}`);
  if (info) {
    info.innerHTML = `
      <div class="title">${title}</div>
      <div class="sub-line">
        <span><em>${journal}</em> (${year})</span>
      </div>
      ${doi ? `<div class="doi"><span>DOI:</span> <a href="https://doi.org/${doi}" target="_blank">${doi}</a></div>` : ''}
    `;
    attachDOILinksHandler();
  }
}

function renderCarousel() {
  const n = papers.length;
  const isMobile = window.innerWidth < 768;

  // Reset tutte le card
  for (let i = 0; i < n; i++) {
    const card = document.getElementById(`song-${i}`);
    card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    card.style.zIndex = '-1';
    card.style.opacity = '0';
    card.style.pointerEvents = 'none';
    card.dataset.baseTransform = 'translateX(0%) scale(0.8)';
    card.style.transform = card.dataset.baseTransform;
  }

  const leftIndex = (currentIndex - 1 + n) % n;
  const rightIndex = (currentIndex + 1) % n;

  // Center card - mobile zoom 110%, desktop 100%
  const centerScale = isMobile ? 'scale(1.2)' : 'scale(1)';
  const centerCard = document.getElementById(`song-${currentIndex}`);
  centerCard.dataset.baseTransform = `translateX(0) ${centerScale}`;
  centerCard.style.transform = centerCard.dataset.baseTransform;
  centerCard.style.opacity = '1';
  centerCard.style.zIndex = '2';
  centerCard.style.pointerEvents = 'auto';

  // Left & right cards
  const leftTransform = isMobile ? 'translateX(-25%) scale(1)' : 'translateX(-30%) scale(0.8)';
  const rightTransform = isMobile ? 'translateX(25%) scale(1)' : 'translateX(30%) scale(0.8)';

  const leftCard = document.getElementById(`song-${leftIndex}`);
  leftCard.dataset.baseTransform = leftTransform;
  leftCard.style.transform = leftCard.dataset.baseTransform;
  leftCard.style.opacity = '0.4';
  leftCard.style.zIndex = '1';
  leftCard.style.pointerEvents = 'auto';

  const rightCard = document.getElementById(`song-${rightIndex}`);
  rightCard.dataset.baseTransform = rightTransform;
  rightCard.style.transform = rightCard.dataset.baseTransform;
  rightCard.style.opacity = '0.4';
  rightCard.style.zIndex = '1';
  rightCard.style.pointerEvents = 'auto';

  // Nasconde tutte le info
  const infos = document.querySelectorAll('.song-info');
  infos.forEach(info => info.style.display = 'none');

  // Mostra info attiva
  const activeInfo = document.getElementById(`song-info-${currentIndex}`);
  if (activeInfo) activeInfo.style.display = 'block';

  lastIndex = currentIndex;
}

function onCardClick(i) {
  const n = papers.length;
  if (i === currentIndex) {
    const paper = papers[i];
    if (paper.pdf) openPDF(paper.pdf);
    else if (paper.doi) window.open(`https://doi.org/${paper.doi}`, '_blank');
  } else {
    const rightIndex = (currentIndex + 1) % n;
    const leftIndex = (currentIndex - 1 + n) % n;

    if (i === rightIndex) {
      currentIndex = rightIndex;
    } else if (i === leftIndex) {
      currentIndex = leftIndex;
    }
    renderCarousel();
  }
}

function attachCardHoverEffect() {
  cardsContainer.querySelectorAll('.card').forEach(card => {
    card.style.transformStyle = 'preserve-3d';

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calcolo rotazione
      const rotateY = ((x - centerX) / centerX) * 15;
      const rotateX = -((y - centerY) / centerY) * 15;
      const base = card.dataset.baseTransform || '';
      card.style.transform = `${base} rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

      // Calcolo coordinate per il riflesso (da 0% a 100%)
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      // Aggiorna variabili CSS per il riflesso
      card.style.setProperty('--x', `${xPercent}%`);
      card.style.setProperty('--y', `${yPercent}%`);

      card.style.zIndex = card.id === `song-${currentIndex}` ? '2' : '1';
    });

    card.addEventListener('mouseleave', () => {
      const base = card.dataset.baseTransform || '';
      card.style.transform = base;

      // Reset posizione riflesso al centro
      card.style.setProperty('--x', `50%`);
      card.style.setProperty('--y', `50%`);

      card.style.zIndex = card.id === `song-${currentIndex}` ? '2' : '1';
    });
  });
}

function attachHoverEffect(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      el.style.setProperty('--x', `${xPercent}%`);
      el.style.setProperty('--y', `${yPercent}%`);
    });

    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--x', `50%`);
      el.style.setProperty('--y', `50%`);
    });
  });
}

function attachHoverEffectHighlight(selector) {
  if (window.innerWidth < 768) return; // ❌ non attivare su mobile

  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      el.style.setProperty('--x', `${xPercent}%`);
      el.style.setProperty('--y', `${yPercent}%`);
      el.classList.add('hovering');
    });

    el.addEventListener('mouseleave', () => {
      el.classList.remove('hovering');
    });
  });
}

function attachDOILinksHandler() {
  document.querySelectorAll('.doi a').forEach(link => {
    link.addEventListener('click', e => e.stopPropagation());
  });
}

function handleButtonClick(button, actionCallback) {
  if (!button || typeof actionCallback !== 'function') return;

  // Applica effetto di pressione
  button.classList.add('clicked');

  // Esegui l'azione immediatamente
  actionCallback();

  // Rimuovi la classe 'clicked' dopo un ritardo più lungo per mobile
  setTimeout(() => {
    button.classList.remove('clicked');
  }, 200); // Aumentato a 200ms per coprire la durata tipica di un tap
}

function trackPulledState(button) {
  const front = button.querySelector('.front');
  const threshold = 1;

  function loop() {
    const transform = getComputedStyle(front).transform;
    const y = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m42 : 0;
    const isPulled = Math.abs(y) < threshold;

    button.classList.toggle('pulled', isPulled);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}


async function loadAboutSection() {
  const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
  const aboutURL = `${basePath}/assets/profile/about.json`;

  try {
    const res = await fetch(aboutURL);
    const data = await res.json();
    const aboutData = data[currentLang];
    if (!aboutData) throw new Error(`Lingua ${currentLang} non supportata`);

    const nameEl = document.getElementById('name-text');
    const bulbBtn = document.getElementById('idea-toggle');
    const roleEl = document.getElementById('role');
    const imgEl = document.getElementById('profile-img');
    const photoEl = document.querySelector('.profile-photo');

    nameEl.textContent = aboutData.name;
    nameEl.classList.add('profile-name', 'off');
    roleEl.textContent = aboutData.role;
    imgEl.src = aboutData.image;

    const about = document.getElementById('about-me');
    about.className = 'profile-about';
    about.innerHTML = `
      <h2>Profile</h2>
      <p>${aboutData.description}</p>
    `;

    const cvCard = document.createElement('div');
    cvCard.className = 'cv-card';

    const actions = document.createElement('div');
    actions.className = 'cv-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'cv-button view';
    viewBtn.innerHTML = `<span class="front"><i class="fas fa-eye"></i> View CV</span>`;
    trackPulledState(viewBtn);
    viewBtn.addEventListener('click', e => {
      e.preventDefault();
      viewBtn.classList.add('clicked');
      setTimeout(() => {
        openPDF(`${aboutData.cv_path}.pdf`);
        viewBtn.classList.remove('clicked');
      }, 300);
    });

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'cv-button download';
    downloadBtn.innerHTML = `<span class="front"><i class="fas fa-arrow-down"></i></span>`;
    trackPulledState(downloadBtn);
    downloadBtn.addEventListener('click', e => {
      e.preventDefault();
      downloadBtn.classList.add('clicked');
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = `${aboutData.cv_path}.pdf`;
        a.download = '';
        a.click();
        downloadBtn.classList.remove('clicked');
      }, 300);
    });

    actions.appendChild(viewBtn);
    actions.appendChild(downloadBtn);

    const displayContainer = document.createElement('div');
    displayContainer.className = 'cv-display-container';

    const display = document.createElement('div');
    display.className = 'cv-display';

    const scrollText = document.createElement('span');
    scrollText.id = 'cv-scroll-text';
    scrollText.textContent = (aboutData.highlights || []).join(' | ');
    display.appendChild(scrollText);

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'cv-toggle';
    toggleBtn.className = 'cv-toggle';
    toggleBtn.dataset.paused = 'false';
    toggleBtn.innerHTML = `<span class="front"><i class="fas fa-pause"></i></span>`;
    trackPulledState(toggleBtn);

    toggleBtn.addEventListener('click', e => {
      e.preventDefault();
      toggleBtn.classList.add('clicked');
      setTimeout(() => {
        const isPaused = toggleBtn.dataset.paused === 'true';
        scrollText.style.animationPlayState = isPaused ? 'running' : 'paused';
        toggleBtn.dataset.paused = isPaused ? 'false' : 'true';

        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = `fas fa-${isPaused ? 'pause' : 'play'}`;
        toggleBtn.classList.remove('clicked');
      }, 300);
    });

    displayContainer.appendChild(display);
    displayContainer.appendChild(toggleBtn);

    cvCard.appendChild(actions);
    cvCard.appendChild(displayContainer);
    about.appendChild(cvCard);

    // Ripristina stato lampadina
    const bulbState = localStorage.getItem('bulbState') || 'off';
    const bulbIsOn = bulbState === 'on';

    document.body.classList.toggle('on', bulbIsOn);
    nameEl.classList.toggle('on', bulbIsOn);
    nameEl.classList.toggle('off', !bulbIsOn);
    photoEl?.classList.toggle('on', bulbIsOn);
    bulbBtn.classList.toggle('active', bulbIsOn);

  } catch (err) {
    console.error("❌ Errore caricamento di about.json:", err);
  }
}

// === NUOVA FUNZIONE ===
async function loadProjectSection() {
  const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');

  try {
    const res = await fetch(`${basePath}/assets/projects/projects.json`);
    const projects = await res.json();
    const carousel = document.getElementById('project-carousel');
    const indicatorsContainer = document.getElementById('project-indicators');
    let currentProjectIndex = 0;

    if (!carousel || !indicatorsContainer) return;

    carousel.innerHTML = '';
    indicatorsContainer.innerHTML = '';

    projects.forEach((proj, i) => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.id = `project-${i}`;

      const title = document.createElement('h4');
      title.textContent = proj.title?.[currentLang] || proj.title?.en || '';

      const media = document.createElement('div');
      media.className = 'media';

      const isArray = Array.isArray(proj.media);
      const isString = typeof proj.media === 'string';
      const isVideo = isString && proj.media.endsWith('.mp4');
      const isSingleObj = isString && proj.media.endsWith('.obj');
      const isMultiObj = isArray && proj.media.length > 0 && proj.media[0].file && proj.media[0].file.endsWith('.obj');
      const isImage = isString && /\.(jpg|jpeg|png|webp|gif)$/i.test(proj.media);

      if (isVideo) {
        media.innerHTML = `<video src="${proj.media}" controls></video>`;
      } else if (isSingleObj) {
        const viewerId = `three-${i}`;
        const viewerDiv = document.createElement('div');
        viewerDiv.className = 'three-container';
        viewerDiv.id = viewerId;
        media.appendChild(viewerDiv);

        const controls = createViewerControls(viewerId);
        media.appendChild(controls);
        setTimeout(() => init3DViewer(viewerId, proj.media), 0);

      } else if (isMultiObj) {
        const viewerId = `three-${i}`;
        const viewerDiv = document.createElement('div');
        viewerDiv.className = 'three-container';
        viewerDiv.id = viewerId;
        viewerDiv.dataset.models = JSON.stringify(proj.media);
        media.appendChild(viewerDiv);

        const controls = createViewerControls(viewerId);
        media.appendChild(controls);

        const legend = document.createElement('div');
        legend.className = 'viewer-legend';
        proj.media.forEach((item, idx) => {
          const labelToggle = document.createElement('label');
          labelToggle.className = 'viewer-toggle';

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = true;
          input.onchange = () => toggleVisibility(viewerId, idx);

          const checkmark = document.createElement('span');
          checkmark.className = 'checkmark';

          const dot = document.createElement('span');
          dot.className = 'dot';
          dot.style.backgroundColor = item.color;

          const label = document.createElement('span');
          label.className = 'viewer-label';
          label.textContent = item.label;
          label.prepend(dot);

          labelToggle.appendChild(input);
          labelToggle.appendChild(checkmark);
          labelToggle.appendChild(label);
          legend.appendChild(labelToggle);
        });
        media.appendChild(legend);

        setTimeout(() => init3DViewer(viewerId), 0);

      } else if (isImage) {
        media.innerHTML = `<img src="${proj.media}" alt="${proj.title}">`;
      } else {
        media.innerHTML = `<div style="color: red;">Unsupported media format</div>`;
      }

      const desc = document.createElement('p');
      desc.textContent = proj.description?.[currentLang] || proj.description?.en || '';

      card.appendChild(title);
      card.appendChild(media);
      card.appendChild(desc);
      carousel.appendChild(card);

      const dot = document.createElement('div');
      dot.className = 'indicator';
      if (i === currentProjectIndex) dot.classList.add('active');
      dot.addEventListener('click', () => {
        currentProjectIndex = i;
        updateProjectCarousel();
      });
      indicatorsContainer.appendChild(dot);
    });

    function updateProjectCarousel() {
      projects.forEach((_, i) => {
        const card = document.getElementById(`project-${i}`);
        const dot = indicatorsContainer.children[i];
        if (i === currentProjectIndex) {
          card.classList.add('active');
          dot.classList.add('active');
        } else {
          card.classList.remove('active');
          dot.classList.remove('active');
        }
      });
    }

    updateProjectCarousel();

    document.getElementById('prev-project').addEventListener('click', () => {
      currentProjectIndex = (currentProjectIndex - 1 + projects.length) % projects.length;
      updateProjectCarousel();
    });

    document.getElementById('next-project').addEventListener('click', () => {
      currentProjectIndex = (currentProjectIndex + 1) % projects.length;
      updateProjectCarousel();
    });
  } catch (err) {
    console.error("❌ Errore caricamento projects.json:", err);
  }
}

function createViewerControls(viewerId) {
  const controls = document.createElement('div');
  controls.className = 'viewer-controls';
  controls.innerHTML = `
    <div class="viewer-row">
      <button class="axial" onclick="setView('axial', '${viewerId}')" title="Axial View">A</button>
      <button class="coronal" onclick="setView('coronal', '${viewerId}')" title="Coronal View">C</button>
      <button class="sagittal" onclick="setView('sagittal', '${viewerId}')" title="Sagittal View">S</button>
      <button class="rotate" onclick="toggleRotation('${viewerId}')" title="Rotate"><i class="fas fa-sync-alt"></i></button>
      <button class="reset" onclick="resetView('${viewerId}')" title="Reset View"><i class="fas fa-crosshairs"></i></button>
      <button class="zoom-out" onclick="zoom('${viewerId}', -1)" title="Zoom Out"><i class="fas fa-magnifying-glass-minus"></i></button>
      <button class="zoom-in" onclick="zoom('${viewerId}', 1)" title="Zoom In"><i class="fas fa-magnifying-glass-plus"></i></button>
    </div>`;
  return controls;
}

function initBulbButton() {
  const oldBtn = document.getElementById('idea-toggle');
  if (!oldBtn) return;

  const newBtn = oldBtn.cloneNode(true); // rimuove vecchi listener
  oldBtn.replaceWith(newBtn);

  const nameEl = document.getElementById('name-text');
  const photoEl = document.querySelector('.profile-photo');

  // Ripristina stato
  const bulbState = localStorage.getItem('bulbState') || 'off';
  const isOn = bulbState === 'on';
  document.body.classList.toggle('on', isOn);
  nameEl.classList.toggle('on', isOn);
  nameEl.classList.toggle('off', !isOn);
  newBtn.classList.toggle('active', isOn);
  photoEl?.classList.toggle('on', isOn);

  newBtn.addEventListener('click', () => {
    handleButtonClick(newBtn, () => {
      const nowOn = newBtn.classList.toggle('active');
      document.body.classList.toggle('on', nowOn);
      nameEl.classList.toggle('on', nowOn);
      nameEl.classList.toggle('off', !nowOn);
      photoEl?.classList.toggle('on', nowOn);
      localStorage.setItem('bulbState', nowOn ? 'on' : 'off');
    });
  });
}



// Entry point compatibile anche su Safari mobile
document.addEventListener('DOMContentLoaded', () => {
  initPage(); // chiama funzione async separata
});

async function initPage() {
  await loadPapers();
  attachHoverEffectHighlight('.profile-about');
  attachHoverEffect('.player');
  await loadAboutSection();
  initBulbButton();
  await loadProjectSection();
  await updateLanguage();

  let startX = 0;
  let startY = 0;

  cardsContainer.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  cardsContainer.addEventListener('touchend', e => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - startX;
    const diffY = endY - startY;

    if (Math.abs(diffY) > Math.abs(diffX)) return;

    if (diffX > 30) {
      const leftIndex = (currentIndex - 1 + papers.length) % papers.length;
      onCardClick(leftIndex);
    }

    if (diffX < -30) {
      const rightIndex = (currentIndex + 1) % papers.length;
      onCardClick(rightIndex);
    }
  });

  player.addEventListener('click', () => {
    const activeCardLabel = document.getElementById(`song-${currentIndex}`);
    if (activeCardLabel) activeCardLabel.click();
  });

  const langBtn = document.getElementById('language-toggle');
  langBtn.addEventListener('click', () => {
    handleButtonClick(langBtn, async () => {
      currentLang = currentLang === 'en' ? 'it' : 'en';
      localStorage.setItem('lang', currentLang);
      await loadAboutSection();
      initBulbButton();
      await loadProjectSection();
      await updateLanguage();

    });
  });

  document.querySelectorAll('.link-buttons a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const btn = link.querySelector('.social-btn');
      if (!btn) return;
      btn.classList.add('clicked');
      setTimeout(() => {
        window.open(link.href, '_blank');
        btn.classList.remove('clicked');
      }, 15);
    });
  });
}
