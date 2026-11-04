/* ── SCROLLSPY: highlight active TOC link / chip ─────────────────── */
const sections = Array.from(document.querySelectorAll('.lsec'));
const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
const chips = Array.from(document.querySelectorAll('.toc-chip'));
const chipsContainer = document.getElementById('tocChips');

function setActive(id) {
  tocLinks.forEach(link => link.classList.toggle('active', link.dataset.target === id));

  chips.forEach(chip => {
    const isActive = chip.getAttribute('href') === `#${id}`;
    chip.classList.toggle('active', isActive);

    if (isActive && chipsContainer && chipsContainer.clientWidth > 0) {
      const chipRect = chip.getBoundingClientRect();
      const containerRect = chipsContainer.getBoundingClientRect();
      const targetLeft = chipsContainer.scrollLeft + chipRect.left - containerRect.left
        - (containerRect.width - chipRect.width) / 2;
      const maxScroll = chipsContainer.scrollWidth - chipsContainer.clientWidth;
      const nextScrollLeft = Math.max(0, Math.min(targetLeft, maxScroll));

      if (Math.abs(chipsContainer.scrollLeft - nextScrollLeft) > 8) {
        chipsContainer.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
      }
    }
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) setActive(entry.target.id);
  });
}, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

sections.forEach(section => observer.observe(section));
