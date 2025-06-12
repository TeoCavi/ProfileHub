const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const scrollBtn = document.getElementById('scrollToTopBtn');
const cardsContainer = document.getElementById('carousel');
const infoArea = document.getElementById('test');

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
window.addEventListener('popstate', () => {
  if (modal.style.display === 'flex') closeModal();
});

scrollBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
window.addEventListener('scroll', () => {
  scrollBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
});

async function loadPapers() {
  const res = await fetch('papers.json');
  const papers = await res.json();

  cardsContainer.innerHTML = '';
  infoArea.innerHTML = '';

  for (let i = 0; i < Math.min(3, papers.length); i++) {
    const paper = papers[i];
    const index = i + 1;

    let title = paper.title || '';
    let journal = paper.journal || '';
    let year = paper.year || '';
    let type = paper.type || '';
    const preview = paper.preview || 'assets/previews/placeholder.png';

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

    const label = document.createElement('label');
    label.className = 'card';
    label.setAttribute('for', `item-${index}`);
    label.id = `song-${index}`;
    label.innerHTML = `<img src="${preview}" alt="Paper ${index}" />`;
    label.onclick = () => {
      const selected = document.querySelector('input[name="slider"]:checked');
      if (selected && selected.id === `item-${index}`) {
        if (paper.pdf) openPDF(paper.pdf);
        else if (paper.doi) window.open(`https://doi.org/${paper.doi}`, '_blank');
      } else {
        document.getElementById(`item-${index}`).checked = true;
      }
    };
    cardsContainer.appendChild(label);

    const info = document.createElement('div');
    info.className = 'paper-info';
    info.id = `paper-info-${index}`;
    info.innerHTML = `
      <div class="paper-title">${title}</div>
      <div class="paper-meta"><em>${journal}</em> (${year})</div>
    `;
    infoArea.appendChild(info);
  }
}

window.onload = loadPapers;
