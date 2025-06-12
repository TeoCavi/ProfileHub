const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');

// Apri PDF e aggiungi entry nella cronologia
function openPDF(path) {
  iframe.src = path;
  modal.style.display = 'flex';
  history.pushState({ pdfOpen: true }, '', '');
}

// Chiudi modal
function closeModal() {
  modal.style.display = 'none';
  iframe.src = '';
}

// Gestione chiusura
closeBtn.onclick = closeModal;
window.onclick = e => { if (e.target === modal) closeModal(); };
window.addEventListener('popstate', () => { if (modal.style.display === 'flex') closeModal(); });

async function loadPapers() {
  const res = await fetch('papers.json');
  const papers = await res.json();
  const container = document.getElementById('carousel');

  for (const paper of papers) {
    // Dati iniziali da JSON
    let title = paper.title || '';
    let journal = paper.journal || '';
    let year = paper.year || '';
    let type = paper.type || '';

    // Se c'è DOI, recupera metadati dall'API
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
        console.warn(`Errore fetch API DOI ${paper.doi}:`, err);
      }
    }

    // Crea la card
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <img src="${paper.preview || 'assets/previews/placeholder.png'}" class="preview" alt="Preview">
      <div class="info">
        <h3>${title}</h3>
        <p><em>${journal}</em> (${year})</p>
        <p>${type}</p>
      </div>`;
    // Click card -> PDF o DOI
    card.onclick = () => {
      if (paper.pdf) openPDF(paper.pdf);
      else if (paper.doi) window.open(`https://doi.org/${paper.doi}`, '_blank');
    };

    container.appendChild(card);
  }

  // Animazione entra
  const cards = document.querySelectorAll('.paper-card');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = 1;
        entry.target.style.transform = "translateY(0)";
        entry.target.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = 0;
    card.style.transform = "translateY(20px)";
    observer.observe(card);
  });
}

// Scroll del carosello (600px larghezza + 40px gap)
const scrollAmount = 640;
document.querySelector('.nav-arrow.left').addEventListener('click', () => {
  document.getElementById('carousel').scrollBy({ left: -scrollAmount, behavior: 'smooth' });
});
document.querySelector('.nav-arrow.right').addEventListener('click', () => {
  document.getElementById('carousel').scrollBy({ left: scrollAmount, behavior: 'smooth' });
});

// Inizializzazione
window.onload = loadPapers;
