import { resetPassword } from "./api.js";
import { createFormValidator, validators, initAlert } from "./formValidation.js";

const form = document.querySelector("#reset-password-form");
const invalidEl = document.querySelector("#reset-password-invalid");
const successEl = document.querySelector("#reset-password-success");

const errorAlert = initAlert(document.querySelector("#reset-password-error"));
const invalidAlert = initAlert(invalidEl);

const token = new URLSearchParams(window.location.search).get("token");

const validator = createFormValidator(form, {
  "#new-password": [
    validators.required("Please enter a new password."),
    validators.minLength(8, "Password must be at least 8 characters."),
  ],
});

if (!token) {
  form.hidden = true;
  invalidAlert.show("This reset link is invalid or has expired. Please request a new one from the log in window.");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorAlert.hide();

  if (!validator.validate()) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const password = new FormData(form).get("password");

  try {
    submitButton.disabled = true;

    await resetPassword({ token, password });

    form.hidden = true;
    successEl.hidden = false;
  } catch (error) {
    const message = error.message || "Something went wrong. Please try again.";

    // An expired/used token isn't something the user can fix by re-typing
    // their password, so swap to the same "invalid link" state shown when
    // there's no token at all, rather than a field-level popup.
    if (message.toLowerCase().includes("reset link")) {
      form.hidden = true;
      invalidAlert.show(message);
    } else {
      errorAlert.show(message);
    }
  } finally {
    submitButton.disabled = false;
  }
});
