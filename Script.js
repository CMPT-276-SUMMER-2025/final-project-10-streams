const carousel = document.getElementById("carousel");
const items = document.querySelectorAll(".carousel-item");
const title = document.getElementById("anime-title");
const desc = document.getElementById("anime-desc");

function updateCenterItem() {
  let centerIndex = 0;
  let minDiff = Infinity;

  items.forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    const centerY = window.innerHeight / 2;
    const itemCenterY = rect.top + rect.height / 2;
    const diff = Math.abs(centerY - itemCenterY);

    if (diff < minDiff) {
      minDiff = diff;
      centerIndex = index;
    }
  });

  items.forEach((item, idx) => {
    item.classList.toggle("active", idx === centerIndex);
  });

  const activeItem = items[centerIndex];
  title.textContent = activeItem.dataset.title;
  desc.textContent = activeItem.dataset.desc;
}

carousel.addEventListener("scroll", () => {
  requestAnimationFrame(updateCenterItem);
});

// Initial highlight
updateCenterItem();






