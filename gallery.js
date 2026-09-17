const gallerySlides = [
  ["what_gives_me_wings.jpg", "What Gives Me Wings"],
  ["time_flies.jpg", "Time Flies"],
  ["still_life.jpg", "Still Life"],
  ["florida.jpg", "Florida"],
];

const slideImage = document.querySelector(".gallery-slide img");
const slideCaption = document.querySelector(".gallery-slide figcaption");
const galleryTopbar = document.querySelector(".gallery-topbar");
const galleryWordmark = document.querySelector(".gallery-wordmark");
const galleryScreen = document.querySelector(".gallery-screen");
let slideIndex = 0;
let isTransitioning = false;

function waitForImageTransition() {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      slideImage.removeEventListener("transitionend", finish);
      resolve();
    };

    slideImage.addEventListener("transitionend", finish);
    window.setTimeout(finish, 350);
  });
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error(`Unable to load gallery image: ${src}`));
    image.src = src;
  });
}

function updateSlideState() {
  galleryTopbar.classList.toggle("gallery-topbar--dark-text", slideIndex === 0);
  const lightText = slideIndex === 1 || slideIndex === 2;
  galleryWordmark.classList.toggle("gallery-wordmark--light", lightText);
  galleryScreen.classList.toggle("gallery-screen--light", lightText);
}

async function showSlide(index) {
  if (isTransitioning) return;
  isTransitioning = true;
  slideIndex = (index + gallerySlides.length) % gallerySlides.length;
  const [file, title] = gallerySlides[slideIndex];

  slideImage.classList.add("is-transitioning");
  await waitForImageTransition();

  try {
    await preloadImage(`gallery/${file}`);
    slideImage.src = `gallery/${file}`;
    slideImage.alt = title;
    updateSlideState();
  } catch (error) {
    console.error(error);
  } finally {
    slideImage.classList.remove("is-transitioning");
    await waitForImageTransition();
    isTransitioning = false;
  }
}

updateSlideState();

document.querySelector(".gallery-arrow-prev").addEventListener("click", (event) => {
  event.preventDefault();
  showSlide(slideIndex - 1);
});
document.querySelector(".gallery-arrow-next").addEventListener("click", (event) => {
  event.preventDefault();
  showSlide(slideIndex + 1);
});
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
