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

function openPDF(path) {
  iframe.src = path;
  modal.style.display = 'flex';
  history.pushState({ pdfOpen: true }, '', '');
}

function closeModal() {
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

  // Reset tutte le card
  for (let i = 0; i < n; i++) {
    const card = document.getElementById(`song-${i}`);
    card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    card.style.zIndex = '-1';
    card.style.opacity = '0';
    card.style.pointerEvents = 'none';

    // Memorizza la trasformazione base come translate + scale
    card.dataset.baseTransform = 'translateX(0%) scale(0.8)';
    card.style.transform = card.dataset.baseTransform;
  }

  const leftIndex = (currentIndex - 1 + n) % n;
  const rightIndex = (currentIndex + 1) % n;

  // Card centrale
  const centerCard = document.getElementById(`song-${currentIndex}`);
  centerCard.dataset.baseTransform = 'translateX(0) scale(1)';
  centerCard.style.transform = centerCard.dataset.baseTransform;
  centerCard.style.opacity = '1';
  centerCard.style.zIndex = '2';
  centerCard.style.pointerEvents = 'auto';

  // Card sinistra (entra dietro)
  const leftCard = document.getElementById(`song-${leftIndex}`);
  leftCard.dataset.baseTransform = 'translateX(-40%) scale(0.8)';
  leftCard.style.transform = leftCard.dataset.baseTransform;
  leftCard.style.opacity = '0.4';
  leftCard.style.zIndex = '1';
  leftCard.style.pointerEvents = 'auto';

  // Card destra (entra dietro)
  const rightCard = document.getElementById(`song-${rightIndex}`);
  rightCard.dataset.baseTransform = 'translateX(40%) scale(0.8)';
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
function attachDOILinksHandler() {
  document.querySelectorAll('.doi a').forEach(link => {
    link.addEventListener('click', e => e.stopPropagation());
  });
}

// Swipe touch support
window.onload = () => {
  loadPapers();
  attachHoverEffect('.link-buttons a');
  attachHoverEffect('.player');

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

    const threshold = 50;

    // Se lo swipe è più verticale che orizzontale, permetti lo scroll
    if (Math.abs(diffY) > Math.abs(diffX)) {
      return;
    }

    // Swipe a destra (precedente)
    if (diffX > threshold) {
      currentIndex = (currentIndex - 1 + papers.length) % papers.length;
      renderCarousel();
    }
    // Swipe a sinistra (successivo)
    else if (diffX < -threshold) {
      currentIndex = (currentIndex + 1) % papers.length;
      renderCarousel();
    }
  });

  player.addEventListener('click', () => {
    const activeCardLabel = document.getElementById(`song-${currentIndex}`);
    if (activeCardLabel) {
      activeCardLabel.click();
    }
  });
};
