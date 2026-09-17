const gallerySlides = [
  ["what_gives_me_wings.jpg", "What Gives Me Wings"],
  ["time_flies.jpg", "Time Flies"],
  ["still_life.jpg", "Still Life"],
  ["florida.jpg", "Florida"],
];

const slideImage = document.querySelector(".gallery-slide img");
const slideCaption = document.querySelector(".gallery-slide figcaption");
const galleryTopbar = document.querySelector(".gallery-topbar");
let slideIndex = 0;

function showSlide(index) {
  slideIndex = (index + gallerySlides.length) % gallerySlides.length;
  const [file, title] = gallerySlides[slideIndex];
  slideImage.src = `gallery/${file}`;
  slideImage.alt = title;
  galleryTopbar.classList.toggle("gallery-topbar--dark-text", slideIndex === 0);
}

showSlide(0);

document.querySelector(".gallery-arrow-prev").addEventListener("click", () => showSlide(slideIndex - 1));
document.querySelector(".gallery-arrow-next").addEventListener("click", () => showSlide(slideIndex + 1));
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showSlide(slideIndex - 1);
  if (event.key === "ArrowRight") showSlide(slideIndex + 1);
});
