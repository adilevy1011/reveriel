const gallerySlides = [
  ["time_flies.jpg", "Time Flies"],
  ["still_life.jpg", "Still Life"],
  ["florida.jpg", "Florida"],
];

const slideImage = document.querySelector(".gallery-slide img");
const slideCaption = document.querySelector(".gallery-slide figcaption");
let slideIndex = 0;

function showSlide(index) {
  slideIndex = (index + gallerySlides.length) % gallerySlides.length;
  const [file, title] = gallerySlides[slideIndex];
  slideImage.src = `gallery/${file}`;
  slideImage.alt = title;
  slideCaption.innerHTML = `${title} <span>${String(slideIndex + 1).padStart(2, "0")} / ${gallerySlides.length}</span>`;
}

document.querySelector(".gallery-arrow-prev").addEventListener("click", () => showSlide(slideIndex - 1));
document.querySelector(".gallery-arrow-next").addEventListener("click", () => showSlide(slideIndex + 1));
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showSlide(slideIndex - 1);
  if (event.key === "ArrowRight") showSlide(slideIndex + 1);
});
