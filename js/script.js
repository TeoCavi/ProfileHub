// script.js

const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const scrollBtn = document.getElementById('scrollToTopBtn');
const cardsContainer = document.querySelector('.cards');
const infoArea = document.getElementById('test');

// Modal PDF controls
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

// Scroll to top
window.addEventListener('scroll', () => {
  scrollBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
});

scrollBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Load papers from JSON or API
async function loadPapers() {
  const res = await fetch('papers.json');
  const papers = await res.json();

  cardsContainer.innerHTML = '';
  infoArea.innerHTML = '';

  if (!Array.isArray(papers) || papers.length === 0) return;

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    const index = i + 1;

    let title = paper.title || '';
    let journal = paper.journal || '';
    let year = paper.year || '';
    let type = paper.type || '';
    let preview = paper.preview || 'assets/previews/placeholder.png';

    if (paper.doi && (!title || !journal || !year || !type)) {
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

    // Input for radio control
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'slider';
    input.id = `item-${index}`;
    if (i === 0) input.checked = true;
    document.querySelector('.carousel').appendChild(input);

    // Image card
    const label = document.createElement('label');
    label.className = 'card';
    label.setAttribute('for', `item-${index}`);
    label.id = `song-${index}`;
    label.innerHTML = `<img src="${preview}" alt="Paper ${index}" />`;

    label.addEventListener('click', (e) => {
      const activeInput = document.getElementById(`item-${index}`);
      if (activeInput.checked) {
        if (paper.pdf) openPDF(paper.pdf);
        else if (paper.doi) window.open(`https://doi.org/${paper.doi}`, '_blank');
      }
    });

    cardsContainer.appendChild(label);

    // Info section
    const info = document.createElement('label');
    info.className = 'song-info';
    info.id = `song-info-${index}`;
    info.innerHTML = `
      <div class="title">${title}</div>
      <div class="sub-line">
        <div class="subtitle"><em>${journal}</em></div>
        <div class="time">${year}</div>
      </div>
    `;
    infoArea.appendChild(info);
  }
}

window.onload = loadPapers;
