(() => {
  const previewableImages = document.querySelectorAll(".gallery-slide img, .portfolio-grid img");
  if (!previewableImages.length) return;

  const preview = document.createElement("div");
  preview.className = "artwork-preview";
  preview.setAttribute("role", "dialog");
  preview.setAttribute("aria-modal", "true");
  preview.setAttribute("aria-label", "Artwork preview");
  preview.innerHTML = `
    <button class="artwork-preview-close" type="button" aria-label="Close preview">×</button>
    <div class="artwork-preview-stage">
      <img class="artwork-preview-image" alt="">
    </div>
    <p class="artwork-preview-caption"></p>
    <div class="artwork-preview-controls" aria-label="Zoom controls">
      <button class="artwork-preview-control artwork-preview-minus" type="button" aria-label="Zoom out">−</button>
      <span class="artwork-preview-zoom" aria-live="polite">100%</span>
      <button class="artwork-preview-control artwork-preview-plus" type="button" aria-label="Zoom in">+</button>
    </div>`;
  document.body.appendChild(preview);

  const image = preview.querySelector(".artwork-preview-image");
  const stage = preview.querySelector(".artwork-preview-stage");
  const caption = preview.querySelector(".artwork-preview-caption");
  const zoomLabel = preview.querySelector(".artwork-preview-zoom");
  const closeButton = preview.querySelector(".artwork-preview-close");
  let zoom = 1;
  let returnFocus = null;

  function setZoom(nextZoom) {
    zoom = Math.min(3, Math.max(.5, nextZoom));
    image.style.transform = `scale(${zoom})`;
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  function openPreview(source) {
    returnFocus = source;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || "Artwork preview";
    caption.textContent = source.alt || "Artwork";
    setZoom(1);
    preview.classList.add("is-open");
    document.body.classList.add("preview-is-open");
    closeButton.focus();
  }

  function closePreview() {
    preview.classList.remove("is-open");
    document.body.classList.remove("preview-is-open");
    image.removeAttribute("src");
    if (returnFocus) returnFocus.focus();
  }

  previewableImages.forEach((item) => {
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Enlarge ${item.alt || "artwork"}`);
    item.addEventListener("click", () => openPreview(item));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPreview(item);
      }
    });
  });

  closeButton.addEventListener("click", closePreview);
  preview.querySelector(".artwork-preview-minus").addEventListener("click", () => setZoom(zoom - .25));
  preview.querySelector(".artwork-preview-plus").addEventListener("click", () => setZoom(zoom + .25));
  preview.addEventListener("click", (event) => {
    if (event.target === preview || event.target === stage) closePreview();
  });
  preview.addEventListener("wheel", (event) => {
    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? .25 : -.25));
  }, { passive: false });
  document.addEventListener("keydown", (event) => {
    if (!preview.classList.contains("is-open")) return;
    if (event.key === "Escape") closePreview();
    if (event.key === "+" || event.key === "=") setZoom(zoom + .25);
    if (event.key === "-") setZoom(zoom - .25);
    if (event.key === "0") setZoom(1);
  });
})();
