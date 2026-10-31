export function renderOverlay({ title, description, image, ctaText, ctaLink }) {
  const existingOverlay = document.querySelector(".hc-overlay");

  if (existingOverlay) {
    existingOverlay.remove();
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="hc-overlay">
        <div class="hc-overlay__backdrop"></div>

        <div class="hc-overlay__content">

          <button
            class="hc-overlay__close"
            type="button"
          >
            ×
          </button>

          ${image ? `<img src="${image}" alt="">` : ""}

          <h2>${title}</h2>

          <p>${description}</p>

          <a href="${ctaLink}">
            ${ctaText}
          </a>

        </div>
      </div>
    `,
  );

  const overlay = document.querySelector(".hc-overlay");

  const closeButton = overlay.querySelector(".hc-overlay__close");

  const backdrop = overlay.querySelector(".hc-overlay__backdrop");

  closeButton.addEventListener("click", closeOverlay);

  backdrop.addEventListener("click", closeOverlay);
}

export function closeOverlay() {
  const overlay = document.querySelector(".hc-overlay");

  if (overlay) {
    dismissOverlayElement(overlay);
  }
}

export function dismissOverlayElement(overlay) {
  if (!overlay || overlay.classList.contains("is-closing")) return;
  overlay.classList.add("is-closing");
  const remove = () => overlay.remove();
  overlay.addEventListener("animationend", (event) => {
    if (event.target === overlay) remove();
  });
  // Keep dismissal reliable when reduced motion disables CSS animations.
  window.setTimeout(remove, 220);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeOverlay();
  }
});
