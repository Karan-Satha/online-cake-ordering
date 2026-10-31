// ==========================================================================
// Shared form validation system
// ==========================================================================
//
// One reusable engine for every form in the app (login, register, forgot
// password, reset password, checkout, newsletter, custom cake request...).
//
// It gives you two building blocks:
//
//   1. Field-level popups — a small dismissible message that appears
//      directly beneath a single input when it's invalid.
//        showFieldError(input, message)
//        showFieldSuccess(input, message)
//        clearFieldError(input)
//
//   2. Form-level alerts — the same visual language, used for errors that
//      aren't attributable to one specific field (network failures, "please
//      refresh" type notices). Upgrades an existing placeholder element.
//        const alert = initAlert(document.querySelector("#checkout-error"));
//        alert.show("Something went wrong.");
//        alert.hide();
//
// Plus a small schema-driven helper for wiring up whole forms at once:
//        const validator = createFormValidator(form, {
//          "#login-email": [validators.required(), validators.email()],
//          "#login-password": [validators.required()],
//        });
//        form.addEventListener("submit", (event) => {
//          event.preventDefault();
//          if (!validator.validate()) return;
//          ...
//        });
//
// Every popup/alert shares one CSS component (see
// css/components/form-validation.css) so validation messages look and
// behave identically everywhere in the app.
// ==========================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+()\-\s]{7,20}$/;
const UK_POSTCODE_REGEX = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/;

let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}

// ==========================================================================
// Built-in validators
// ==========================================================================
//
// Each validator factory returns a `(value, input, form) => message|null`
// function. Compose as many as you like per field — the first one that
// returns a message wins.

export const validators = {
  required:
    (message = "This field is required.") =>
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "" ? null : message,

  checked:
    (message = "Please check this box to continue.") =>
    (value, input) =>
      input?.checked ? null : message,

  email:
    (message = "Enter a valid email address.") =>
    (value) =>
      !value || EMAIL_REGEX.test(String(value).trim()) ? null : message,

  minLength: (length, message) => (value) =>
    !value || String(value).length >= length ? null : message || `Must be at least ${length} characters.`,

  pattern:
    (regex, message = "This doesn't look right.") =>
    (value) =>
      !value || regex.test(String(value).trim()) ? null : message,

  phone: (message = "Enter a valid phone number.") => validators.pattern(PHONE_REGEX, message),

  postcode: (message = "Enter a valid postcode.") => validators.pattern(UK_POSTCODE_REGEX, message),

  // Cross-field comparison, e.g. confirm-password fields.
  // `otherSelector` is resolved against the same <form> the field belongs to.
  matches:
    (otherSelector, message = "Values don't match.") =>
    (value, input, form) => {
      const other = form?.querySelector(otherSelector);
      if (!other) return null;
      return value === other.value ? null : message;
    },
};

// ==========================================================================
// Field-level popups
// ==========================================================================

function buildPopup(id, type) {
  const el = document.createElement("div");
  el.id = id;
  el.className = `field-error-popup${type === "success" ? " field-error-popup--success" : ""}`;
  el.setAttribute("role", type === "success" ? "status" : "alert");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <span class="field-error-popup__icon" aria-hidden="true">${type === "success" ? "✓" : "!"}</span>
    <span class="field-error-popup__message"></span>
    <button type="button" class="field-error-popup__dismiss" aria-label="Dismiss message">×</button>
  `;
  return el;
}

// Finds the element the popup should be inserted after, so it always lands
// directly beneath the visible field — not necessarily the bare <input>,
// which is often wrapped in an icon/wrapper div.
function getInsertionAnchor(input) {
  // Escape hatch for inputs that share a row with something else (e.g. an
  // "Apply" button next to a voucher code field) — without this the popup
  // would land *between* the input and its sibling, breaking that row's
  // layout. `data-error-anchor` takes a selector resolved via .closest().
  if (input.dataset.errorAnchor) {
    const explicit = input.closest(input.dataset.errorAnchor);
    if (explicit) return explicit;
  }

  const group = input.closest(".form-group");

  if (group) {
    const directChild = [...group.children].find((child) => child === input || child.contains(input));
    if (directChild) return directChild;
  }

  return input;
}

function getOrCreatePopup(input, type) {
  let popup = input._validationPopup;

  if (popup && popup.isConnected) {
    popup.classList.toggle("field-error-popup--success", type === "success");
    popup.setAttribute("role", type === "success" ? "status" : "alert");
    return popup;
  }

  const id = input.id ? `${input.id}-message` : nextId("field-message");
  popup = buildPopup(id, type);

  popup.querySelector(".field-error-popup__dismiss").addEventListener("click", () => {
    clearFieldError(input);
  });

  getInsertionAnchor(input).insertAdjacentElement("afterend", popup);
  input._validationPopup = popup;

  return popup;
}

function revealPopup(popup, message) {
  popup.querySelector(".field-error-popup__message").textContent = message;
  popup.removeAttribute("aria-hidden");
  requestAnimationFrame(() => popup.classList.add("is-visible"));
}

function showFieldMessage(input, message, type) {
  if (!input || !message) return;

  const popup = getOrCreatePopup(input, type);
  revealPopup(popup, message);

  if (type === "error") {
    input.setAttribute("aria-describedby", popup.id);
    input.setAttribute("aria-invalid", "true");
    input.classList.add("input-invalid");
  }
}

/** Shows a dismissible error popup directly beneath `input`. */
export function showFieldError(input, message) {
  showFieldMessage(input, message, "error");
}

/** Same component, success styling — e.g. "Voucher applied!" beneath a code field. */
export function showFieldSuccess(input, message) {
  showFieldMessage(input, message, "success");
}

/** Hides (and smoothly animates away) the popup for a field, if any. */
export function clearFieldError(input) {
  if (!input) return;

  const popup = input._validationPopup;

  input.removeAttribute("aria-describedby");
  input.removeAttribute("aria-invalid");
  input.classList.remove("input-invalid");

  if (!popup) return;

  popup.classList.remove("is-visible");
  popup.setAttribute("aria-hidden", "true");
}

/** Clears every field-level error currently shown within a form. */
export function clearFormErrors(form) {
  form?.querySelectorAll(".input-invalid").forEach((input) => clearFieldError(input));
}

// ==========================================================================
// Form-level alerts
// ==========================================================================
// Upgrades an existing placeholder element (e.g. <p id="checkout-error">)
// into the same visual component, for errors that belong to the form as a
// whole rather than a single field (network failures, server hiccups...).

export function initAlert(el) {
  if (!el) {
    return { show() {}, hide() {} };
  }

  if (el._alertApi) {
    return el._alertApi;
  }

  el.classList.add("field-error-popup", "field-error-popup--banner");
  el.removeAttribute("hidden");
  el.setAttribute("role", "alert");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <span class="field-error-popup__icon" aria-hidden="true">!</span>
    <span class="field-error-popup__message"></span>
    <button type="button" class="field-error-popup__dismiss" aria-label="Dismiss message">×</button>
  `;

  const messageEl = el.querySelector(".field-error-popup__message");

  const api = {
    show(message) {
      messageEl.textContent = message;
      el.removeAttribute("aria-hidden");
      requestAnimationFrame(() => el.classList.add("is-visible"));
    },
    hide() {
      el.classList.remove("is-visible");
      el.setAttribute("aria-hidden", "true");
    },
  };

  el.querySelector(".field-error-popup__dismiss").addEventListener("click", api.hide);
  el._alertApi = api;

  return api;
}

// Best-effort guess at which field a server-side error message belongs to,
// based on the wording (backend messages consistently mention the field
// they're about, e.g. "Password must be at least 8 characters"). Falls back
// to null so the caller can show a form-level alert instead.
export function guessFieldFromMessage(message, fieldMap) {
  if (!message) return null;

  const lower = message.toLowerCase();

  for (const [keyword, selector] of Object.entries(fieldMap)) {
    if (lower.includes(keyword)) return selector;
  }

  return null;
}

// ==========================================================================
// Schema-driven form validator
// ==========================================================================
//
// `schema` maps a selector (resolved within `form`) to a list of validators.
// Fields validate on blur, then re-validate live on input/change once an
// error is showing, and `validate()` runs everything at submit time and
// focuses the first invalid field.

export function createFormValidator(form, schema, { liveValidate = true } = {}) {
  const entries = Object.entries(schema)
    .map(([selector, rules]) => ({ selector, rules, input: form.querySelector(selector) }))
    .filter((entry) => entry.input);

  function readValue(input) {
    return input.type === "checkbox" ? input.checked : input.value;
  }

  function validateEntry(entry) {
    const { input, rules } = entry;
    const value = readValue(input);

    for (const rule of rules) {
      const message = rule(value, input, form);

      if (message) {
        showFieldError(input, message);
        return false;
      }
    }

    clearFieldError(input);
    return true;
  }

  function validate({ focusFirst = true } = {}) {
    let isValid = true;
    let firstInvalid = null;

    entries.forEach((entry) => {
      if (!validateEntry(entry)) {
        isValid = false;
        firstInvalid = firstInvalid || entry.input;
      }
    });

    if (!isValid && focusFirst && firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return isValid;
  }

  function clearAll() {
    entries.forEach((entry) => clearFieldError(entry.input));
  }

  function validateField(selector) {
    const entry = entries.find((item) => item.selector === selector);
    return entry ? validateEntry(entry) : true;
  }

  if (liveValidate) {
    entries.forEach((entry) => {
      const { input } = entry;

      input.addEventListener("blur", () => validateEntry(entry));

      const liveRecheck = () => {
        if (input.classList.contains("input-invalid")) {
          validateEntry(entry);
        }
      };

      input.addEventListener("input", liveRecheck);
      input.addEventListener("change", liveRecheck);
    });
  }

  return { validate, clearAll, validateField };
}
