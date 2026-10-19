const res = await fetch("data/chapters.json");
const chapters = await res.json();
const cell = (c) => `<a class="cell" href="chapter.html?ch=${c.id}">
  <div class="no">${c.id}</div><div class="nm">${c.title}</div></a>`;
document.getElementById("dao").innerHTML =
  chapters.filter(c => c.part === "道经").map(cell).join("");
document.getElementById("de").innerHTML =
  chapters.filter(c => c.part === "德经").map(cell).join("");