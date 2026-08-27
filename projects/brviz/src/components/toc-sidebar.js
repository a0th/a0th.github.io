const TOC_CLASS = "brviz-toc";

let observer;

function closeSidebar() {
  const toggle = document.querySelector("#observablehq-sidebar-toggle");
  if (toggle) {
    toggle.checked = false;
    toggle.indeterminate = false;
  }
  const sidebar = document.querySelector("#observablehq-sidebar");
  if (sidebar?.contains(document.activeElement)) document.activeElement.blur();
}

export function mountTocSidebar() {
  const toc = document.querySelector("#observablehq-toc nav");
  const sidebar = document.querySelector("#observablehq-sidebar");
  if (!toc || !sidebar) return;

  observer?.disconnect();
  sidebar.querySelector(`.${TOC_CLASS}`)?.remove();

  const section = document.createElement("section");
  section.className = TOC_CLASS;
  const title = document.createElement("div");
  title.textContent = toc.querySelector("div")?.textContent ?? "Nesta página";
  const ol = document.createElement("ol");
  for (const a of toc.querySelectorAll("ol a")) {
    const li = document.createElement("li");
    li.className = "observablehq-link";
    const link = a.cloneNode(true);
    li.append(link);
    ol.append(li);
  }
  section.append(title, ol);
  sidebar.append(section);

  ol.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    queueMicrotask(closeSidebar);
  });

  const sync = () => {
    const href = toc.querySelector(".observablehq-secondary-link-active a")?.getAttribute("href");
    for (const li of ol.querySelectorAll("li")) {
      li.classList.toggle(
        "observablehq-link-active",
        li.querySelector("a")?.getAttribute("href") === href,
      );
    }
  };
  observer = new MutationObserver(sync);
  observer.observe(toc, { subtree: true, attributes: true, attributeFilter: ["class"] });
  sync();
}
