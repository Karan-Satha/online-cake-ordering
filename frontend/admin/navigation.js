import { loadCustomCakes } from "./customCakes.js";

const links = document.querySelectorAll(".sidebar-link");

const sections = document.querySelectorAll(".admin-section");

links.forEach((link) => {
  link.addEventListener("click", () => {
    links.forEach((button) => {
      button.classList.remove("active");
    });

    sections.forEach((section) => {
      section.hidden = true;
    });

    link.classList.add("active");

    document.querySelector(`#${link.dataset.section}-section`).hidden = false;
  });
});

document
  .querySelector('[data-section="custom-cakes"]')
  ?.addEventListener("click", loadCustomCakes);
