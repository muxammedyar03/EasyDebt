export function updateContentLayout(value: "centered" | "full-width") {
  const inset = document.querySelector('[data-slot="sidebar-inset"]');
  if (inset) {
    inset.setAttribute("data-content-layout", value);
  }
  const content = document.querySelector('[data-slot="dashboard-content"]');
  if (content) {
    content.setAttribute("data-content-layout", value);
  }
}

export function updateNavbarStyle(value: "sticky" | "scroll") {
  const target = document.querySelector("header[data-navbar-style]");
  if (target) {
    target.setAttribute("data-navbar-style", value);
  }
}
