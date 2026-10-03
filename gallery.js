const gallerySlides = [
  ["what_gives_me_wings.png", "What Gives Me Wings"],
  ["time_flies.png", "Time Flies"],
  ["still_life.png", "Still Life"],
  ["florida.png", "Florida"],
  ["jam.png", "Jam"],
  ["paint.png", "Paint"],
  ["collage.png", "Collage"],
  ["ronit_commission_draft.png", "Ronit Commission Draft"],
];

const slideImage = document.querySelector(".gallery-slide img");
const galleryTopbar = document.querySelector(".gallery-topbar");
const galleryWordmark = document.querySelector(".gallery-wordmark");
const galleryScreen = document.querySelector(".gallery-screen");
const previousButton = document.querySelector(".gallery-arrow-prev");
const nextButton = document.querySelector(".gallery-arrow-next");
let slideIndex = 0;
let isTransitioning = false;
const transitionDuration = 140;

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error(`Unable to load gallery image: ${src}`));
    image.src = src;
  });
}

function updateSlideState() {
  galleryTopbar.classList.toggle("gallery-topbar--dark-text", slideIndex === 0 || slideIndex === 3);
  const lightText = slideIndex === 1 || slideIndex === 2 || slideIndex === 4;
  galleryWordmark.classList.toggle("gallery-wordmark--light", lightText);
  galleryScreen.classList.toggle("gallery-screen--light", lightText);
}

gallerySlides.forEach(([file]) => {
  preloadImage(`gallery/${file}`).catch((error) => console.error(error));
});

async function showSlide(index) {
  if (isTransitioning) return;
  isTransitioning = true;
  slideIndex = (index + gallerySlides.length) % gallerySlides.length;
  const [file, title] = gallerySlides[slideIndex];

  slideImage.classList.add("is-transitioning");
  galleryScreen.classList.add("gallery-screen--transitioning");

  try {
    await preloadImage(`gallery/${file}`);
    slideImage.src = `gallery/${file}`;
    slideImage.alt = title;
    updateSlideState();
    await new Promise((resolve) => window.setTimeout(resolve, transitionDuration));
  } catch (error) {
    console.error(error);
  } finally {
    slideImage.classList.remove("is-transitioning");
    galleryScreen.classList.remove("gallery-screen--transitioning");
    isTransitioning = false;
  }
}

updateSlideState();

previousButton.addEventListener("click", (event) => {
  event.preventDefault();
  showSlide(slideIndex - 1);
});
nextButton.addEventListener("click", (event) => {
  event.preventDefault();
  showSlide(slideIndex + 1);
});

let touchStart = null;
galleryScreen.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  touchStart = event.touches[0];
}, { passive: true });
galleryScreen.addEventListener("touchend", (event) => {
  if (!touchStart || event.changedTouches.length !== 1) return;
  const touchEnd = event.changedTouches[0];
  const deltaX = touchEnd.clientX - touchStart.clientX;
  const deltaY = touchEnd.clientY - touchStart.clientY;
  touchStart = null;

  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
  showSlide(slideIndex + (deltaX < 0 ? 1 : -1));
}, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showSlide(slideIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showSlide(slideIndex + 1);
  }
});
