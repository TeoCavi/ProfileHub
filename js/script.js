// script.js

const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const scrollBtn = document.getElementById('scrollToTopBtn');
const cardsContainer = document.querySelector('.cards');
const infoArea = document.getElementById('test');
const mainContainer = document.querySelector('.container');

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

  // Remove existing radio inputs if any
  document.querySelectorAll('input[name="slider"]').forEach(el => el.remove());

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
            updateCard(index, title, journal, year, doi);
          }
        })
        .catch(err => console.warn(`Errore fetch DOI ${paper.doi}:`, err));
    }

    // Radio input
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'slider';
    input.id = `item-${index}`;
    if (index === 1) input.checked = true;
    mainContainer.insertBefore(input, cardsContainer);

    // Image card
    const label = document.createElement('label');
    label.className = 'card';
    label.setAttribute('for', `item-${index}`);
    label.id = `song-${index}`;
    label.innerHTML = `<img src="${preview}" alt="Paper ${index}" />`;

    label.addEventListener('click', () => {
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
        <div class="time">(${year})</div>
      </div>
      ${doi ? `<div class="doi"><a href="https://doi.org/${doi}" target="_blank">DOI: ${doi}</a></div>` : ''}
    `;
    infoArea.appendChild(info);
  });
}

function updateCard(index, title, journal, year, doi) {
  const info = document.getElementById(`song-info-${index}`);
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

window.onload = loadPapers;
