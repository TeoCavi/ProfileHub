// script.js

const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const scrollBtn = document.getElementById('scrollToTopBtn');
const cardsContainer = document.querySelector('.cards');
const infoArea = document.getElementById('test');

// PDF Modal
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
window.onclick = (e) => { if (e.target === modal) closeModal(); };
window.addEventListener('popstate', () => {
  if (modal.style.display === 'flex') closeModal();
});

// Scroll to top
window.addEventListener('scroll', () => {
  scrollBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
});

scrollBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Caricamento dinamico papers
async function loadPapers() {
  const res = await fetch('papers.json');
  const papers = await res.json();

  cardsContainer.innerHTML = '';
  infoArea.innerHTML = '';

  const maxPapers = 3;
  const limited = papers.slice(0, maxPapers);

  for (let i = 0; i < limited.length; i++) {
    const index = i + 1;
    const paper = limited[i];

    let title = paper.title || '';
    let journal = paper.journal || '';
    let year = paper.year || '';
    let type = paper.type || '';
    const preview = paper.preview || 'assets/previews/placeholder.png';

    // Se manca qualcosa, interroga l’API DOI
    if (paper.doi) {
      try {
        const metaRes = await fetch(`${apiBase}/metadata?doi=${paper.doi}`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          title = title || meta.title;
          journal = journal || meta.journal;
          year = year || meta.year;
          type = type || meta.type;
        }
      } catch (err) {
        console.warn(`Errore fetch DOI ${paper.doi}:`, err);
      }
    }

    // Card immagine
    const label = document.createElement('label');
    label.className = 'card';
    label.setAttribute('for', `item-${index}`);
    label.id = `song-${index}`;
    label.innerHTML = `<img src="${preview}" alt="Paper ${index}">`;
    label.onclick = () => {
      if (paper.pdf) openPDF(paper.pdf);
      else if (paper.doi) window.open(`https://doi.org/${paper.doi}`, '_blank');
    };
    cardsContainer.appendChild(label);

    // Info paper
    const info = document.createElement('label');
    info.className = 'song-info';
    info.id = `song-info-${index}`;
    info.innerHTML = `
      <div class="title">${title}</div>
      <div class="sub-line">
        <div class="subtitle">${journal || type}</div>
        <div class="time">${year}</div>
      </div>`;
    infoArea.appendChild(info);
  }
}

// Cambio background per effetto (facoltativo)
document.querySelectorAll('input[type="radio"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.body.classList.toggle('blue');
  });
});

window.onload = loadPapers;
