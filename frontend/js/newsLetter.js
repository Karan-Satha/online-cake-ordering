import { subscribeToNewsletter } from "./api.js";
import { createFormValidator, validators, showFieldError, showFieldSuccess, clearFieldError } from "./formValidation.js";

function setupNewsletterForm() {
  const form = document.querySelector("#newsletter-form");

  if (!form) {
    return;
  }

  const emailInput = document.querySelector("#signature-email");
  const submitButton = document.querySelector("#newsletter-submit");

  const validator = createFormValidator(form, {
    "#signature-email": [validators.required("Please enter your email."), validators.email()],
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validator.validate()) return;

    submitButton.disabled = true;

    try {
      await subscribeToNewsletter(emailInput.value.trim());

      clearFieldError(emailInput);
      showFieldSuccess(emailInput, "You're on the list! Keep an eye on your inbox.");
      form.reset();
    } catch (error) {
      showFieldError(emailInput, error.message || "Something went wrong. Please try again.");
    } finally {
      submitButton.disabled = false;
    }
  });
}

// The footer is injected asynchronously by layout.js — wait for it rather
// than assuming #newsletter-form already exists on script load.
document.addEventListener("layout:ready", setupNewsletterForm);
