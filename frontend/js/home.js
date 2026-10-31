import { getFeaturedProducts } from "./api.js";
import { loadProducts } from "./carouselProductService.js";
import "./customModal.js";

const productList = document.querySelector("#product-list");

loadProducts({
  container: productList,
  loader: getFeaturedProducts,
  carousel: true,
});
