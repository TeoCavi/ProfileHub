document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".paper-card");
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

  cards.forEach(card => observer.observe(card));
});