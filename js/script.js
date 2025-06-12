// === script.js ===

const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const scrollBtn = document.getElementById('scrollToTopBtn');
const cardsContainer = document.querySelector('.cards');
const infoArea = document.getElementById('test');
const mainContainer = document.querySelector('.container');

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
    const index = i + 1;
    let title = paper.title || '';
    let journal = paper.journal || '';
    let year = paper.year || '';
    let type = paper.type || '';
    let preview = paper.preview || 'assets/previews/placeholder.png';
    let doi = paper.doi || '';

    if (paper.doi && (!title || !journal || !year || !type)) {
      fetch(`${apiBase}/metadata?doi=${paper.doi}`)
        .then(metaRes => metaRes.ok ? metaRes.json() : null)
        .then(meta => {
          if (meta) {
            title = title || meta.title;
            journal = journal || meta.journal;
            year = year || meta.year;
            type = type || meta.type;
            updateCard(i, title, journal, year, doi);
          }
        })
        .catch(err => console.warn(`Errore fetch DOI ${paper.doi}:`, err));
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.id = `song-${i}`;
    card.innerHTML = `<img src="${preview}" alt="Paper ${index}" />`;
    card.addEventListener('click', () => onCardClick(i));
    cardsContainer.appendChild(card);

    const info = document.createElement('div');
    info.className = 'song-info';
    info.id = `song-info-${i}`;
    info.innerHTML = `
      <div class="title">${title || 'Untitled'}</div>
      <div class="sub-line">
        <div class="subtitle"><em>${journal || 'Unknown Journal'}</em></div>
        <div class="time">(${year || 'N/A'})</div>
      </div>
      ${doi ? `<div class="doi"><a href="https://doi.org/${doi}" target="_blank">DOI: ${doi}</a></div>` : ''}
    `;
    infoArea.appendChild(info);
  });

  renderCarousel();
}

function updateCard(i, title, journal, year, doi) {
  const info = document.getElementById(`song-info-${i}`);
  if (info) {
    info.innerHTML = `
      <div class="title">${title}</div>
      <div class="sub-line">
        <div class="subtitle"><em>${journal}</em></div>
        <div class="time">(${year})</div>
      </div>
      ${doi ? `<div class="doi"><a href="https://doi.org/${doi}" target="_blank">DOI: ${doi}</a></div>` : ''}
    `;
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
  }

  const leftIndex = (currentIndex - 1 + n) % n;
  const rightIndex = (currentIndex + 1) % n;

  // Card centrale
  const centerCard = document.getElementById(`song-${currentIndex}`);
  centerCard.style.transform = 'translateX(0) scale(1)';
  centerCard.style.opacity = '1';
  centerCard.style.zIndex = '2';
  centerCard.style.pointerEvents = 'auto';

  // Card sinistra (entra dietro)
  const leftCard = document.getElementById(`song-${leftIndex}`);
  leftCard.style.transform = 'translateX(-40%) scale(0.8)';
  leftCard.style.opacity = '0.4';
  leftCard.style.zIndex = '1';
  leftCard.style.pointerEvents = 'auto';

  // Card destra (entra dietro)
  const rightCard = document.getElementById(`song-${rightIndex}`);
  rightCard.style.transform = 'translateX(40%) scale(0.8)';
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


window.onload = loadPapers;