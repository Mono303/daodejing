let chapters;
try {
  const res = await fetch("data/chapters.json");
  if (!res.ok) throw new Error(res.status);
  chapters = await res.json();
} catch {
  document.body.innerHTML = '<p class="note" style="text-align:center;margin-top:40px">语料加载失败，请先启动本地服务器（README 有说明）。</p>';
  throw new Error("chapters.json load failed");
}
const cell = (c) => `<a class="cell" href="chapter.html?ch=${c.id}">
  <div class="no">${c.id}</div><div class="nm">${c.title}</div></a>`;
document.getElementById("all").innerHTML = chapters.map(cell).join("");