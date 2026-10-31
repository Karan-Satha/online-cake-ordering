import { createProductCard } from "./productCard.js";
import { Carousel } from "./carousel.js";

export async function loadProducts({ container, loader, carousel = false }) {
  try {
    const products = await loader();

    if (!container) return;

    if (!products.length) {
      container.closest(".related-products-section")?.remove();

      return;
    }

    container.innerHTML = "";

    products.forEach((product) => {
      const card = createProductCard(product);

      if (carousel) {
        card.classList.add("carousel__slide");
      }

      container.append(card);
    });

    if (carousel) {
      new Carousel({
        viewport: document.querySelector(".carousel__viewport"),
        track: document.querySelector(".carousel__track"),
        prevButton: document.querySelector("#carousel-prev"),
        nextButton: document.querySelector("#carousel-next"),
        dotsContainer: document.querySelector("#carousel-dots"),
      });
    }
  } catch (error) {
    console.error("Failed to load products:", error);

    if (container) {
      container.innerHTML = `
        <li class="products-error">
          Sorry, we couldn't load the products.
        </li>
      `;
    }
  }
}
