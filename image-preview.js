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
    <button class="artwork-preview-nav artwork-preview-previous" type="button" aria-label="Previous artwork"></button>
    <div class="artwork-preview-stage">
      <img class="artwork-preview-image" alt="">
    </div>
    <button class="artwork-preview-nav artwork-preview-next" type="button" aria-label="Next artwork"></button>
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
  const previousButton = preview.querySelector(".artwork-preview-previous");
  const nextButton = preview.querySelector(".artwork-preview-next");
  const images = Array.from(previewableImages);
  let zoom = 1;
  let returnFocus = null;
  let currentIndex = 0;
  let panX = 0;
  let panY = 0;
  let dragStart = null;
  let suppressCloseClick = false;

  function updateImageTransform() {
    image.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }

  function setZoom(nextZoom) {
    zoom = Math.min(3, Math.max(.5, nextZoom));
    if (zoom <= 1) {
      panX = 0;
      panY = 0;
    }
    image.classList.toggle("is-zoomed", zoom > 1);
    updateImageTransform();
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  function openPreview(source) {
    returnFocus = source;
    currentIndex = images.indexOf(source);
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || "Artwork preview";
    caption.textContent = source.alt || "Artwork";
    setZoom(1);
    preview.classList.add("is-open");
    document.body.classList.add("preview-is-open");
    closeButton.focus();
  }

  function showArtwork(index) {
    currentIndex = (index + images.length) % images.length;
    const source = images[currentIndex];
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || "Artwork preview";
    caption.textContent = source.alt || "Artwork";
    setZoom(1);
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
  previousButton.addEventListener("click", () => showArtwork(currentIndex - 1));
  nextButton.addEventListener("click", () => showArtwork(currentIndex + 1));
  preview.querySelector(".artwork-preview-minus").addEventListener("click", () => setZoom(zoom - .25));
  preview.querySelector(".artwork-preview-plus").addEventListener("click", () => setZoom(zoom + .25));
  preview.addEventListener("click", (event) => {
    if (suppressCloseClick) {
      suppressCloseClick = false;
      return;
    }
    if (event.target === preview || event.target === stage) closePreview();
  });
  preview.addEventListener("wheel", (event) => {
    event.preventDefault();
    setZoom(zoom + (event.deltaY < 0 ? .25 : -.25));
  }, { passive: false });
  stage.addEventListener("pointerdown", (event) => {
    dragStart = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: panX,
      originY: panY,
      isPanning: zoom > 1 && event.target === image,
    };
    if (!dragStart.isPanning) return;
    event.preventDefault();
    image.classList.add("is-dragging");
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - dragStart.startX, event.clientY - dragStart.startY) > 5) {
      dragStart.moved = true;
    }
    if (!dragStart.isPanning) return;
    panX = dragStart.originX + event.clientX - dragStart.startX;
    panY = dragStart.originY + event.clientY - dragStart.startY;
    updateImageTransform();
  });
  stage.addEventListener("pointerup", (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStart.startX;
    const deltaY = event.clientY - dragStart.startY;
    const wasPanning = dragStart.isPanning;
    const wasMoved = dragStart.moved;
    dragStart = null;
    image.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    suppressCloseClick = wasMoved;
    if (wasMoved) window.setTimeout(() => {
      suppressCloseClick = false;
    }, 250);
    if (!wasPanning && zoom === 1 && Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      showArtwork(currentIndex + (deltaX < 0 ? 1 : -1));
    }
  });
  stage.addEventListener("pointercancel", () => {
    dragStart = null;
    image.classList.remove("is-dragging");
  });
  document.addEventListener("keydown", (event) => {
    if (!preview.classList.contains("is-open")) return;
    if (event.key === "Escape") closePreview();
    if (event.key === "ArrowLeft") showArtwork(currentIndex - 1);
    if (event.key === "ArrowRight") showArtwork(currentIndex + 1);
    if (event.key === "+" || event.key === "=") setZoom(zoom + .25);
    if (event.key === "-") setZoom(zoom - .25);
    if (event.key === "0") setZoom(1);
  });
})();
