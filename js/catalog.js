const res = await fetch("data/chapters.json");
const chapters = await res.json();
const cell = (c) => `<a class="cell" href="chapter.html?ch=${c.id}">
  <div class="no">${c.id}</div><div class="nm">${c.title}</div></a>`;
document.getElementById("all").innerHTML = chapters.map(cell).join("");