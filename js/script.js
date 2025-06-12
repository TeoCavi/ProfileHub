const apiBase = "https://teocavi-profilehub-bk.hf.space";
const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');
const carousel = document.getElementById('carousel');

let currentIndex = 0;
let cardsPerView = 2; // Può essere reso dinamico
let cards = [];

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

async function loadPapers() {
  const res = await fetch('papers.json');
  const papers = await res.json();

  for (const paper of papers) {
    let title = paper.title || '';
    let journal = paper.journal || '';
    let year = paper.year || '';
    let type = paper.type || '';

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

    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <img src="${paper.preview || 'assets/previews/placeholder.png'}" class="preview" alt="Preview">
      <div class="info">
        <h3>${title}</h3>
        <p><em>${journal}</em> (${year})</p>
        <p>${type}</p>
      </div>`;
    card.onclick = () => {
      if (paper.pdf) openPDF(paper.pdf);
      else if (paper.doi) window.open(`https://doi.org/${paper.doi}`, '_blank');
    };

    carousel.appendChild(card);
  }

  cards = document.querySelectorAll('.paper-card');

  // Reset index & observer
  currentIndex = 0;

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

// SCROLL CONTINUO LOGICA
function scrollCarousel(direction) {
  const visible = cardsPerView;
  const total = cards.length;

  currentIndex += direction;

  if (currentIndex > total - visible) currentIndex = 0;
  if (currentIndex < 0) currentIndex = total - visible;

  const scrollLeft = cards[currentIndex].offsetLeft;
  carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
}

document.querySelector('.nav-arrow.left').addEventListener('click', () => scrollCarousel(-1));
document.querySelector('.nav-arrow.right').addEventListener('click', () => scrollCarousel(1));

window.onload = () => {
  loadPapers();
  const scrollBtn = document.getElementById('scrollToTopBtn');
  window.addEventListener('scroll', () => {
    scrollBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
  });
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
};
