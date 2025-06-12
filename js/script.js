const apiBase = "https://teocavi-profilehub-bk.hf.space";

const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const topBtn = document.getElementById('scrollToTopBtn');

// Apri PDF nel modal e aggiorna cronologia per tasto indietro
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

// Gestione chiusura dal bottone o clic esterno
closeBtn.onclick = closeModal;
window.onclick = (e) => {
  if (e.target === modal) closeModal();
};

// Tasto indietro chiude il modal (mobile-friendly)
window.addEventListener('popstate', (e) => {
  if (modal.style.display === 'flex') closeModal();
});

// Scroll to top button
window.onscroll = function () {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    topBtn.style.display = 'block';
  } else {
    topBtn.style.display = 'none';
  }
};
topBtn.onclick = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Caricamento e generazione card
async function loadPapers() {
  const response = await fetch('papers.json');
  const papers = await response.json();
  const container = document.getElementById('carousel');

  for (const paper of papers) {
    let meta = {
      title: paper.title || '',
      journal: paper.journal || '',
      year: paper.year || '',
      type: paper.type || ''
    };

    // Recupero metadati dal backend se presente DOI
    if (paper.doi) {
      try {
        const metaRes = await fetch(`${apiBase}/metadata?doi=${paper.doi}`);
        if (metaRes.ok) {
          const apiMeta = await metaRes.json();
          meta.title = meta.title || apiMeta.title;
          meta.journal = meta.journal || apiMeta.journal;
          meta.year = meta.year || apiMeta.year;
          meta.type = meta.type || apiMeta.type;
        }
      } catch (e) {
        console.warn("Errore nel recupero metadati per DOI:", paper.doi);
      }
    }

    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <img src="${paper.preview || 'assets/previews/placeholder.png'}" class="preview" alt="Preview">
      <div class="info">
        <h3>${meta.title}</h3>
        <p><em>${meta.journal}</em> (${meta.year})</p>
        <p>${meta.type}</p>
      </div>
    `;

    // Azione al click sulla card
    card.onclick = () => {
      if (paper.pdf) {
        openPDF(paper.pdf);
      } else if (paper.doi) {
        window.open('https://doi.org/' + paper.doi, '_blank');
      }
    };

    container.appendChild(card);
  }

  // Animazione all'apparizione
  const cards = document.querySelectorAll('.paper-card');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        entry.target.style.opacity = 1;
        entry.target.style.transform = "translateY(0)";
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

// Carosello scroll
document.querySelector('.nav-arrow.left').addEventListener('click', () => {
  document.getElementById('carousel').scrollBy({ left: -500, behavior: 'smooth' });
});

document.querySelector('.nav-arrow.right').addEventListener('click', () => {
  document.getElementById('carousel').scrollBy({ left: 500, behavior: 'smooth' });
});

// Avvio
window.onload = loadPapers;
