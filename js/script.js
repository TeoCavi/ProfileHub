const apiBase = "https://teocavi-profilehub-bk.hf.space";

const modal = document.getElementById('pdf-modal');
const iframe = document.getElementById('pdf-frame');
const closeBtn = document.querySelector('.close-button');

function openPDF(path) {
  iframe.src = path;
  modal.style.display = 'flex';
}

closeBtn.onclick = () => {
  modal.style.display = 'none';
  iframe.src = '';
};

window.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
    iframe.src = '';
  }
};

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

    // Se ha un DOI, prova a caricare i metadati dal backend
    if (paper.doi) {
      try {
        const metaRes = await fetch(`${apiBase}/metadata?doi=${paper.doi}`);
        if (metaRes.ok) {
          const apiMeta = await metaRes.json();
          // Se un campo non è già specificato nel JSON, usa quello dall'API
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

    // Comportamento al click
    card.onclick = () => {
      if (paper.pdf) {
        openPDF(paper.pdf);
      } else if (paper.doi) {
        window.open('https://doi.org/' + paper.doi, '_blank');
      }
    };

    container.appendChild(card);
  }
}

document.querySelector('.nav-arrow.left').addEventListener('click', () => {
  document.getElementById('carousel').scrollBy({ left: -400, behavior: 'smooth' });
});
document.querySelector('.nav-arrow.right').addEventListener('click', () => {
  document.getElementById('carousel').scrollBy({ left: 400, behavior: 'smooth' });
});

window.onload = loadPapers;