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


// For the tracemoe
document.getElementById("image-upload").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("https://api.trace.moe/search", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    const result = data.result[0];

    document.getElementById("results").style.display = "block";
    document.getElementById("anime-title").textContent = result.anilist.title.romaji;
    document.getElementById("episode-info").textContent = `Episode ${result.episode || 'N/A'} | Similarity: ${(result.similarity * 100).toFixed(1)}%`;
    document.getElementById("watch-link").href = result.video || "#";
  } catch (error) {
    alert("Something went wrong! Please try another image.");
    console.error(error);
  }
});






