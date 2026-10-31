import { registerCustomer, loginCustomer, logoutCustomer, getCurrentCustomer, requestPasswordReset } from "./api.js";
import { showToast } from "./toast.js";
import {
  createFormValidator,
  validators,
  clearFormErrors,
  showFieldError,
  initAlert,
  guessFieldFromMessage,
} from "./formValidation.js";

const CLOSE_ANIMATION_MS = 300;

let els = {};
let lastFocusedElement = null;

// Schema-driven validators (built once the modal's markup is in the DOM)
// plus the shared banner for errors that don't belong to a single field.
let loginValidator = null;
let registerValidator = null;
let forgotValidator = null;
let modalAlert = null;

// The account state is checked once per page load and shared with anything
// that needs it (e.g. the header icon). Other modules can read
// window.__homeCakeCustomer after `account:ready` fires, or just re-check
// via getCurrentCustomer() themselves.
let currentCustomer = null;

function bindModalElements() {
  els = {
    modal: document.querySelector("#account-modal"),
    container: document.querySelector(".account-modal-container"),
    closeButton: document.querySelector("#account-modal-close"),
    backdrop: document.querySelector("[data-account-close]"),
    errorEl: document.querySelector("#account-modal-error"),

    tabs: document.querySelectorAll("[data-account-view].account-modal-tab"),
    viewTriggers: document.querySelectorAll("[data-account-view]"),
    views: document.querySelectorAll(".account-modal-view"),

    loginForm: document.querySelector("#account-view-login"),
    registerForm: document.querySelector("#account-view-register"),
    forgotForm: document.querySelector("#forgot-password-form"),
  };

  modalAlert = initAlert(els.errorEl);

  loginValidator = createFormValidator(els.loginForm, {
    "#login-email": [validators.required("Please enter your email."), validators.email()],
    "#login-password": [validators.required("Please enter your password.")],
  });

  registerValidator = createFormValidator(els.registerForm, {
    "#register-name": [validators.required("Please enter your name.")],
    "#register-email": [validators.required("Please enter your email."), validators.email()],
    "#register-password": [
      validators.required("Please create a password."),
      validators.minLength(8, "Password must be at least 8 characters."),
    ],
    "#register-password-confirm": [
      validators.required("Please confirm your password."),
      validators.matches("#register-password", "Passwords don't match."),
    ],
  });

  forgotValidator = createFormValidator(els.forgotForm, {
    "#forgot-email": [validators.required("Please enter your email."), validators.email()],
  });

  els.closeButton?.addEventListener("click", closeModal);
  els.backdrop?.addEventListener("click", closeModal);

  els.viewTriggers?.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const view = trigger.dataset.accountView;

      if (trigger.classList.contains("account-modal-tab")) {
        switchTab(view);
      } else {
        showView(view);
      }
    });
  });

  els.loginForm?.addEventListener("submit", handleLogin);
  els.registerForm?.addEventListener("submit", handleRegister);
  els.forgotForm?.addEventListener("submit", handleForgotPassword);

  els.modal?.addEventListener("keydown", handleModalKeydown);

  bindPasswordRequirements();
}

function initialiseAccountModal() {
  bindModalElements();
  bindAccountToggle();

  if (!els.modal || els.modal.dataset.initialised === "true") {
    return;
  }

  els.modal.dataset.initialised = "true";

  refreshAccountState();
}

document.addEventListener("layout:ready", initialiseAccountModal);

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-open-account]");

  if (!trigger) return;

  event.preventDefault();
  openModal(trigger.dataset.accountView || "login");
});

// ==========================================
// Open / close (with focus management)
// ==========================================

let closeTimeoutId = null;

function openModal(initialView = "login") {
  if (!els.modal) bindModalElements();
  if (!els.modal) return;

  // Cancel any pending hide from a just-closed modal — without this, a
  // quick close-then-reopen (within CLOSE_ANIMATION_MS) could have the
  // stale close timeout fire *after* this open and immediately hide the
  // modal again, making it look like clicking the icon "did nothing".
  if (closeTimeoutId) {
    clearTimeout(closeTimeoutId);
    closeTimeoutId = null;
  }

  resetFormFeedback();
  switchTab(initialView === "register" ? "register" : "login");

  if (initialView === "forgot-password") {
    showView("forgot-password");
  }

  lastFocusedElement = document.activeElement;

  els.modal.hidden = false;

  requestAnimationFrame(() => {
    els.modal.classList.add("is-open");
    focusFirstField();
  });

  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.modal.classList.remove("is-open");

  if (closeTimeoutId) {
    clearTimeout(closeTimeoutId);
  }

  closeTimeoutId = setTimeout(() => {
    els.modal.hidden = true;
    document.body.style.overflow = "";
    lastFocusedElement?.focus();
    closeTimeoutId = null;

    els.registerForm?.reset();
    resetFormFeedback();
    document.querySelectorAll(".password-requirements li").forEach((item) => item.classList.remove("is-met"));
  }, CLOSE_ANIMATION_MS);
}

function handleModalKeydown(event) {
  if (event.key === "Escape") {
    closeModal();
    return;
  }

  if (event.key === "Tab") {
    trapFocus(event);
  }
}

function getFocusableElements() {
  const activeView = els.modal.querySelector(".account-modal-view.is-active");
  const scope = activeView || els.container;

  return [...scope.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])')]
    .concat([els.closeButton, ...els.tabs])
    .filter((el) => el && !el.disabled && el.offsetParent !== null);
}

function trapFocus(event) {
  const focusable = getFocusableElements();

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function focusFirstField() {
  const activeView = els.modal.querySelector(".account-modal-view.is-active");
  const field = activeView?.querySelector("input");

  field?.focus();
}

// ==========================================
// Tabs / views
// ==========================================

function switchTab(view) {
  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.accountView === view;

    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  showView(view);
}

function showView(view) {
  const viewIdMap = {
    login: "account-view-login",
    register: "account-view-register",
    "forgot-password": "account-view-forgot-password",
    "forgot-sent": "account-view-forgot-sent",
  };

  els.views.forEach((viewEl) => {
    const isActive = viewEl.id === viewIdMap[view];

    viewEl.classList.toggle("is-active", isActive);
    viewEl.hidden = !isActive;
  });

  resetFormFeedback();
  focusFirstField();
}

// Clears every validation popup and the shared banner — used whenever the
// modal opens, closes, or switches views, so stale messages never linger.
function resetFormFeedback() {
  modalAlert?.hide();
  clearFormErrors(els.loginForm);
  clearFormErrors(els.registerForm);
  clearFormErrors(els.forgotForm);
}

// Routes a server-side error to the field it's about (based on its wording)
// falling back to the shared form-level banner when it can't be attributed
// to one field.
function handleServerError(error, form, fieldMap) {
  const message = error.message || "Something went wrong. Please try again.";
  const selector = guessFieldFromMessage(message, fieldMap);
  const input = selector && form.querySelector(selector);

  if (input) {
    showFieldError(input, message);
  } else {
    modalAlert.show(message);
  }
}

// ==========================================
// Live password requirements checklist
// ==========================================

function bindPasswordRequirements() {
  const passwordInput = document.querySelector("#register-password");
  const confirmInput = document.querySelector("#register-password-confirm");
  const lengthItem = document.querySelector('[data-requirement="length"]');
  const matchItem = document.querySelector('[data-requirement="match"]');

  if (!passwordInput || passwordInput.dataset.bound === "true") return;

  passwordInput.dataset.bound = "true";

  function update() {
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    lengthItem?.classList.toggle("is-met", password.length >= 8);
    matchItem?.classList.toggle("is-met", confirm.length > 0 && password === confirm);
  }

  passwordInput.addEventListener("input", update);
  confirmInput?.addEventListener("input", update);
}

// ==========================================
// Form handlers
// ==========================================

async function handleLogin(event) {
  event.preventDefault();
  modalAlert.hide();

  if (!loginValidator.validate()) return;

  const formData = new FormData(event.target);
  const submitButton = event.target.querySelector('button[type="submit"]');

  try {
    submitButton.disabled = true;

    const { customer } = await loginCustomer({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    onAuthenticated(customer);
    closeModal();
    showToast({ type: "success", title: "Welcome back", message: `Signed in as ${customer.name}.` });
  } catch (error) {
    // "password" checked before "email" so "Invalid email or password"
    // lands on the password field, which is what the user was last editing.
    handleServerError(error, els.loginForm, { password: "#login-password", email: "#login-email" });
  } finally {
    submitButton.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  modalAlert.hide();

  if (!registerValidator.validate()) return;

  const formData = new FormData(event.target);
  const submitButton = event.target.querySelector('button[type="submit"]');

  try {
    submitButton.disabled = true;

    const { customer } = await registerCustomer({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    onAuthenticated(customer);
    closeModal();
    showToast({ type: "success", title: "Account created", message: `Welcome, ${customer.name}!` });
  } catch (error) {
    handleServerError(error, els.registerForm, {
      password: "#register-password",
      email: "#register-email",
      name: "#register-name",
    });
  } finally {
    submitButton.disabled = false;
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  modalAlert.hide();

  if (!forgotValidator.validate()) return;

  const formData = new FormData(event.target);
  const email = formData.get("email");
  const submitButton = event.target.querySelector('button[type="submit"]');

  try {
    submitButton.disabled = true;

    await requestPasswordReset(email);

    showView("forgot-sent");
  } catch (error) {
    handleServerError(error, els.forgotForm, { email: "#forgot-email" });
  } finally {
    submitButton.disabled = false;
  }
}

// ==========================================
// Account state (shared with the header icon)
// ==========================================

function bindAccountToggle() {
  const toggle = document.querySelector("#account-toggle");

  if (!toggle || toggle.dataset.bound === "true") return;

  toggle.dataset.bound = "true";

  toggle.addEventListener("click", () => {
    if (currentCustomer) {
      window.location.href = "/account";
    } else {
      openModal("login");
    }
  });

  document.addEventListener("account:ready", (event) => updateAccountToggle(event.detail.customer));
  document.addEventListener("account:changed", (event) => updateAccountToggle(event.detail.customer));
}

function updateAccountToggle(customer) {
  const toggle = document.querySelector("#account-toggle");

  if (!toggle) return;

  toggle.classList.toggle("is-logged-in", Boolean(customer));
  toggle.setAttribute("aria-label", customer ? `Your account (${customer.name})` : "Log in or create an account");
}

function onAuthenticated(customer) {
  currentCustomer = customer;
  document.dispatchEvent(new CustomEvent("account:changed", { detail: { customer } }));
}

async function refreshAccountState() {
  try {
    const response = await getCurrentCustomer();
    currentCustomer = response.customer;
  } catch (error) {
    // A genuine network/server error — not the same as "logged out", which
    // the endpoint now reports as a normal 200 { customer: null }.
    currentCustomer = null;
  }

  document.dispatchEvent(new CustomEvent("account:ready", { detail: { customer: currentCustomer } }));
}

export async function logoutAndRefresh() {
  await logoutCustomer();
  currentCustomer = null;
  document.dispatchEvent(new CustomEvent("account:changed", { detail: { customer: null } }));
}

export function getAccountState() {
  return currentCustomer;
}

export { openModal as openAccountModal };
