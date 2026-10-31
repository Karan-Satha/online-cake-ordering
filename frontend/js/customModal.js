import { submitCustomCake, generateCakePreview } from "./api.js";
import { showToast } from "./toast.js";
import { createFormValidator, validators, clearFormErrors } from "./formValidation.js";

const CLOSE_ANIMATION_MS = 300;
const SUBMIT_SUCCESS_CLOSE_DELAY_MS = 3000;
const CAKE_COLOURS = [
  { name: "Pink", value: "#F4A6C1" },
  { name: "Red", value: "#D94A4A" },
  { name: "Blue", value: "#5A91D6" },
  { name: "Purple", value: "#9272C5" },
  { name: "Yellow", value: "#F4CF62" },
  { name: "Green", value: "#74A982" },
  { name: "White", value: "#FFFFFF" },
  { name: "Cream", value: "#F2E4C8" },
  { name: "Brown", value: "#8B5E45" },
  { name: "Black", value: "#34343A" },
];
const CAKE_SHAPES = ["Round", "Square", "Rectangle", "Heart", "Oval", "Hexagon", "Tall Barrel"];
const CAKE_TIERS = ["1 Tier", "2 Tier", "3 Tier", "4 Tier"];
const CAKE_THEMES = [
  "Birthday", "Wedding", "Floral", "Cartoon & Characters", "Princess", "Superhero",
  "Minimalist", "Luxury", "Baby Shower", "Anniversary", "Christmas", "Football",
  "Unicorn", "Cars", "Flowers", "Other",
];

// ==========================================
// State
// ==========================================

const state = {
  inspirationImages: [],
};

let els = {};
let validator = null;

// ==========================================
// Init
// ==========================================

function bindModalElements() {
  els = {
    modal: document.querySelector("#custom-cake-modal"),
    closeButton: document.querySelector("#custom-cake-close"),
    form: document.querySelector("#custom-cake-form"),
    imageInput: document.querySelector("#cake-images"),
    imagePreview: document.querySelector("#image-preview"),
    previewButton: document.querySelector("#generate-preview-button"),
    previewContainer: document.querySelector("#cake-preview"),
    previewImage: document.querySelector("#cake-preview-image"),
    previewStatusBadge: document.querySelector("#preview-status"),
    colourSelectors: [...document.querySelectorAll("[data-colour-selector]")],
    visualSelectors: [...document.querySelectorAll("[data-visual-selector]")],
    themeDescription: document.querySelector("#cake-theme-description"),
    themeOther: document.querySelector(".cake-theme-other"),
  };

  if (els.form) {
    validator = createFormValidator(els.form, {
      "#cake-type": [validators.required("Please select a cake type.")],
      "#cake-size": [validators.required("Please select a size.")],
      "#cake-flavour": [validators.required("Please select a flavour.")],
      "#cake-style": [validators.required("Please select a style.")],
      "#cake-primary-colour": [validators.required("Please choose a primary colour.")],
      "#delivery-date": [validators.required("Please choose a delivery date.")],
      "#cake-customer-name": [validators.required("Please enter your name.")],
      "#cake-customer-email": [validators.required("Please enter your email."), validators.email()],
      "#cake-customer-phone": [
        validators.required("Please enter your phone number."),
        validators.phone("Enter a valid phone number."),
      ],
    });
  }

  els.closeButton?.addEventListener("click", closeModal);
  els.imageInput?.addEventListener("change", handleImageInputChange);
  els.previewButton?.addEventListener("click", handleGeneratePreview);
  els.form?.addEventListener("submit", handleSubmit);
  els.themeDescription?.addEventListener("input", updateThemeValue);
  els.form?.addEventListener("reset", () => {
    requestAnimationFrame(() => {
      els.colourSelectors.forEach((container) => {
        const field = els.form.elements.namedItem(container.dataset.colourSelector);
        const matchingOption = [...container.querySelectorAll(".cake-colour-option")]
          .find((button) => button.dataset.colour.toLowerCase() === (field.value || "").toLowerCase());
        matchingOption?.click();
      });
      els.visualSelectors.forEach((container) => {
        const field = els.form.elements.namedItem(container.dataset.visualSelector);
        container._selectValue?.(field.value || "");
      });
    });
  });
  initialiseColourSelectors();
  initialiseVisualSelectors();
}

function visualIconSvg(type, value) {
  if (type === "shape") {
    const shapes = {
      Round: '<circle cx="32" cy="32" r="22" />',
      Square: '<rect x="11" y="11" width="42" height="42" rx="5" />',
      Rectangle: '<rect x="7" y="16" width="50" height="32" rx="5" />',
      Heart: '<path d="M32 53 11 33C-1 18 17 5 29 18l3 4 3-4C47 5 65 18 53 33Z" />',
      Oval: '<ellipse cx="32" cy="32" rx="25" ry="18" />',
      Hexagon: '<path d="m19 10 26 0 14 22-14 22H19L5 32Z" />',
      "Tall Barrel": '<path d="M17 11h30l4 42H13Z" />',
    };
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 54h50" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><g fill="#F4A295" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">${shapes[value] || shapes.Round}</g></svg>`;
  }
  if (type === "tiers") {
    const count = Number.parseInt(value, 10) || 1;
    const widths = [34, 43, 51, 57];
    const heights = [12, 10, 9, 8];
    let y = 48;
    let layers = "";
    for (let i = 0; i < count; i += 1) {
      const width = widths[i];
      const height = heights[i];
      layers += `<rect x="${(64 - width) / 2}" y="${y - height}" width="${width}" height="${height}" rx="3"/>`;
      y -= height + 1;
    }
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M5 53h54" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><g fill="#F4A295" stroke="currentColor" stroke-width="2.2">${layers}<path d="M32 5v5" fill="none" stroke-linecap="round"/></g></svg>`;
  }
}

function initialiseVisualSelectors() {
  els.visualSelectors.forEach((container) => {
    if (container.dataset.initialised === "true") return;
    const type = container.dataset.visualSelector;
    const field = els.form.elements.namedItem(type);
    const values = type === "shape" ? CAKE_SHAPES : type === "tiers" ? CAKE_TIERS : CAKE_THEMES;
    const options = type === "theme" ? [{ name: "No theme", value: "" }, ...values.map((value) => ({ name: value, value }))]
      : values.map((value) => ({ name: value, value }));

    if (type === "theme") {
      container.innerHTML = options.map(({ name, value }, index) => {
        const id = `cake-theme-choice-${index}`;
        const checked = value
          ? field.value === value || (value === "Other" && field.value.startsWith("Other: "))
          : !field.value;
        return `<label class="cake-theme-radio-option${checked ? " is-selected" : ""}" for="${id}">
          <input id="${id}" type="radio" name="cakeThemeChoice" value="${value}"${checked ? " checked" : ""}>
          <span class="cake-theme-radio-label">${name}</span>
        </label>`;
      }).join("");
      const radios = [...container.querySelectorAll('input[type="radio"]')];
      const selectTheme = (value) => {
        field.value = value;
        container.removeAttribute("aria-invalid");
        container.closest(".cake-visual-fieldset").querySelector(".cake-selection-error")?.remove();
        radios.forEach((radio) => {
          const selected = radio.value === value;
          radio.checked = selected;
          radio.closest(".cake-theme-radio-option").classList.toggle("is-selected", selected);
        });
        els.themeOther.hidden = value !== "Other";
        if (value !== "Other") els.themeDescription.value = "";
        updateThemeValue();
        els.themeDescription.removeAttribute("aria-invalid");
      };
      radios.forEach((radio) => radio.addEventListener("change", () => selectTheme(radio.value)));
      container._selectValue = selectTheme;
      container.dataset.initialised = "true";
      const selectedTheme = field.value.startsWith("Other: ") ? "Other"
        : (options.some((option) => option.value === field.value) ? field.value : "");
      selectTheme(selectedTheme);
      return;
    }

    container.innerHTML = options.map(({ name, value }) => `<button class="cake-visual-option" type="button" role="radio" aria-checked="false" data-value="${value}" aria-label="${name}"><span class="cake-visual-icon">${value ? visualIconSvg(type, value) : '<span class="cake-colour-none-mark" aria-hidden="true">—</span>'}</span><span class="cake-visual-name">${name}</span><span class="cake-colour-check" aria-hidden="true">✓</span></button>`).join("");
    const buttons = [...container.querySelectorAll(".cake-visual-option")];
    const select = (value) => {
      field.value = value;
      container.removeAttribute("aria-invalid");
      container.closest(".cake-visual-fieldset").querySelector(".cake-selection-error")?.remove();
      buttons.forEach((button) => {
        const selected = button.dataset.value === value;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-checked", String(selected));
      });
      if (type === "theme") {
        els.themeOther.hidden = value !== "Other";
        if (value !== "Other") els.themeDescription.value = "";
        updateThemeValue();
        els.themeDescription.removeAttribute("aria-invalid");
      }
    };
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => select(button.dataset.value));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
        buttons[next].click();
      });
    });
    container.dataset.selectValue = "";
    container._selectValue = select;
    container.dataset.initialised = "true";
    if (field.value && !options.some((option) => option.value === field.value)) field.value = "";
    select(field.value);
  });
}

function updateThemeValue() {
  const theme = els.form?.elements.namedItem("theme");
  if (!theme || !(theme.value === "Other" || theme.value.startsWith("Other: "))) return;
  const description = els.themeDescription.value.trim();
  theme.value = description ? `Other: ${description}`.slice(0, 100) : "Other";
  els.themeDescription.removeAttribute("aria-invalid");
  els.themeDescription.parentElement.querySelector(".cake-selection-error")?.remove();
}

function cakeIconSvg(colour) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M11 31h42v22H11z" fill="${colour}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
    <path d="M11 31c0-5 5-5 5-10 0 5 5 5 5 0 0 5 5 5 5 0 0 5 5 5 5 0 0 5 5 5 5 0 0 5 5 5 5 0 0 5 5 5 5 0" fill="${colour}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
    <path d="M32 10v9m0-12v2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    <path d="M18 39v7m14-7v7m14-7v7" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".35" />
    <path d="M8 54h48" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
  </svg>`;
}

function initialiseColourSelectors() {
  els.colourSelectors.forEach((container) => {
    if (container.dataset.initialised === "true") return;
    const fieldName = container.dataset.colourSelector;
    const isSecondary = fieldName === "secondaryColour";
    const valueInput = els.form.elements.namedItem(fieldName);
    const customInput = document.querySelector(`#cake-${isSecondary ? "secondary" : "primary"}-custom-colour`);
    const options = isSecondary ? [{ name: "No colour", value: "" }, ...CAKE_COLOURS] : CAKE_COLOURS;

    container.innerHTML = options.map(({ name, value }) => `
      <button class="cake-colour-option${value === "" ? " cake-colour-option--none" : ""}" type="button" role="radio" aria-checked="false" aria-label="${name}${value ? ` cake colour, ${value}` : ""}" data-colour="${value}"${value ? ` style="--cake-colour: ${value}"` : ""}>
        <span class="cake-colour-icon">${value ? cakeIconSvg(value) : "<span class=\"cake-colour-none-mark\" aria-hidden=\"true\">—</span>"}</span>
        <span class="cake-colour-name">${name}</span>
        <span class="cake-colour-check" aria-hidden="true">✓</span>
      </button>`).join("");

    const buttons = [...container.querySelectorAll(".cake-colour-option")];
    const updateSelection = (value, source = "palette") => {
      valueInput.value = value;
      buttons.forEach((button) => {
        const selected = button.dataset.colour.toLowerCase() === value.toLowerCase() && value !== "";
        button.setAttribute("aria-checked", String(selected));
        button.classList.toggle("is-selected", selected);
      });
      const noColour = buttons.find((button) => button.dataset.colour === "");
      noColour?.classList.toggle("is-selected", value === "");
      noColour?.setAttribute("aria-checked", String(value === ""));
      if (source === "custom") {
        customInput.value = value;
      } else if (value && !CAKE_COLOURS.some((colour) => colour.value.toLowerCase() === value.toLowerCase())) {
        customInput.value = value;
      }
    };

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => updateSelection(button.dataset.colour));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
          : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
        buttons[nextIndex].click();
      });
    });
    customInput?.addEventListener("input", () => updateSelection(customInput.value.toUpperCase(), "custom"));
    updateSelection(valueInput.value);
    container.dataset.initialised = "true";
  });
}

function initialiseCustomCakeModal() {
  bindModalElements();

  const requiredEls = [
    els.modal,
    els.form,
    els.closeButton,
    els.imageInput,
    els.previewButton,
  ];

  if (requiredEls.some((el) => !el)) {
    return;
  }

  if (els.form.dataset.initialised === "true") {
    return;
  }

  els.form.dataset.initialised = "true";
}

document.addEventListener("layout:ready", initialiseCustomCakeModal);

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-open-custom-cake]");
  if (!trigger) return;

  event.preventDefault();
  openModal();
});

// ==========================================
// Modal open/close
// ==========================================

function openModal() {
  if (!els.modal) {
    bindModalElements();
  }

  if (!els.modal) {
    console.error("Custom cake modal not found");
    return;
  }

  els.modal.hidden = false;

  requestAnimationFrame(() => {
    els.modal.classList.add("is-open");
  });

  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.modal.classList.remove("is-open");

  setTimeout(() => {
    els.modal.hidden = true;
    document.body.style.overflow = "";
    clearFormErrors(els.form);
  }, CLOSE_ANIMATION_MS);
}

// ==========================================
// Image upload preview (inspiration images)
// ==========================================

function handleImageInputChange() {
  [...els.imageInput.files].forEach(addInspirationImage);
  els.imageInput.value = "";
}

function addInspirationImage(file) {
  state.inspirationImages.push(file);

  const wrapper = document.createElement("div");
  wrapper.className = "image-preview-item";
  wrapper.innerHTML = `
    <img src="${URL.createObjectURL(file)}">
    <button type="button" class="image-remove">×</button>
  `;

  wrapper.querySelector(".image-remove").addEventListener("click", () => {
    removeInspirationImage(file);
    wrapper.remove();
  });

  els.imagePreview.appendChild(wrapper);
}

function removeInspirationImage(file) {
  const index = state.inspirationImages.indexOf(file);
  if (index > -1) {
    state.inspirationImages.splice(index, 1);
  }
}

// ==========================================
// Validation
// ==========================================

/**
 * Validates the form and, if invalid, surfaces a popup beneath every
 * invalid field (same component used across the rest of the site) and
 * focuses the first one. Returns whether the form is valid.
 */
function ensureFormIsValid() {
  if (validator && !validator.validate()) return false;
  const shape = els.form.elements.namedItem("shape").value;
  const tiers = els.form.elements.namedItem("tiers").value;
  const theme = els.form.elements.namedItem("theme").value;
  const missing = [
    ["shape", !shape, "Please select a cake shape."],
    ["tiers", !tiers, "Please select the number of tiers."],
    ["theme", (theme === "Other" || theme.startsWith("Other: ")) && !els.themeDescription.value.trim(), "Please describe your preferred theme."],
  ].find(([, invalid]) => invalid);
  if (!missing) return true;
  const [name, , message] = missing;
  const selector = els.visualSelectors.find((item) => item.dataset.visualSelector === name);
  if (selector) {
    selector.setAttribute("aria-invalid", "true");
    selector.closest(".cake-visual-fieldset").querySelector(".cake-selection-error")?.remove();
    const error = document.createElement("p");
    error.className = "cake-selection-error";
    error.setAttribute("role", "alert");
    error.textContent = message;
    selector.after(error);
    selector.querySelector("button")?.focus();
  } else {
    els.themeDescription.setAttribute("aria-invalid", "true");
    els.themeDescription.focus();
    els.themeDescription.parentElement.querySelector(".cake-selection-error")?.remove();
    els.themeDescription.insertAdjacentHTML("afterend", '<span class="cake-selection-error" role="alert">Please describe your preferred theme.</span>');
  }
  return false;
}

// ==========================================
// AI Preview
// ==========================================

async function handleGeneratePreview() {
  if (!ensureFormIsValid()) {
    return;
  }

  const payload = getFormPayload();

  setPreviewButtonLoading(true);

  try {
    const result = await generateCakePreview(payload);

    if (!result.success) {
      showToast({
        type: "error",
        title: "Failed preview",
        message: result.error,
      });
      return;
    }

    showPreviewImage(result);
  } catch (error) {
    console.error(error);
    showToast({
      type: "error",
      title: "Unable to generate preview",
      message: error.message,
    });
  } finally {
    setPreviewButtonLoading(false);
  }
}

function setPreviewButtonLoading(isLoading) {
  const { previewButton } = els;
  previewButton.disabled = isLoading;
  previewButton.classList.toggle("is-loading", isLoading);

  previewButton.innerHTML = isLoading
    ? `<span class="spinner"></span><span>Generating AI Preview...</span>`
    : `✨ <span>Generate AI Preview</span>`;
}

function showPreviewImage(result) {
  els.previewContainer.hidden = false;
  els.previewImage.src = result.image;

  if (els.previewStatusBadge) {
    els.previewStatusBadge.textContent = result.generated
      ? "AI Generated Preview"
      : "Sample Preview";
  }
}

// ==========================================
// Submit
// ==========================================

async function handleSubmit(event) {
  event.preventDefault();

  if (!ensureFormIsValid()) {
    return;
  }

  const payload = getFormPayload();
  const submitButton = els.form.querySelector('button[type="submit"]');

  try {
    submitButton.disabled = true;

    const formData = buildSubmitFormData(payload);
    const result = await submitCustomCake(formData);

    if (!result.success) {
      throw new Error(result.error || "Unable to save cake request");
    }

    showToast({
      type: "success",
      title: "Request Received",
      message: "Thank you! Your custom cake request has been received.",
    });

    resetForm();
    setTimeout(closeModal, SUBMIT_SUCCESS_CLOSE_DELAY_MS);
  } catch (error) {
    console.error(error);
    showToast({
      type: "error",
      title: "Unable to submit",
      message:
        error.message || "Unable to submit your request. Please try again.",
    });
  } finally {
    submitButton.disabled = false;
  }
}

function buildSubmitFormData(payload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
    } else {
      formData.append(key, value ?? "");
    }
  });

  state.inspirationImages.forEach((file) => {
    formData.append("inspirationImages", file);
  });

  return formData;
}

// ==========================================
// Helpers
// ==========================================

function getFormPayload() {
  const formData = new FormData(els.form);

  return {
    cakeType: formData.get("cakeType"),
    shape: formData.get("shape"),
    tiers: formData.get("tiers"),
    cakeSize: formData.get("cakeSize"),
    flavour: formData.get("flavour"),
    style: formData.get("style"),
    theme: formData.get("theme"),
    primaryColour: formData.get("primaryColour"),
    secondaryColour: formData.get("secondaryColour"),
    decorations: formData.getAll("decorations"),
    deliveryDate: formData.get("deliveryDate"),
    cakeMessage: formData.get("cakeMessage"),
    aiPreviewImage: els.previewImage?.src || null,
    notes: formData.get("notes"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  };
}

function resetForm() {
  els.form.reset();
  clearFormErrors(els.form);
  els.imagePreview.innerHTML = "";
  state.inspirationImages.length = 0;
  els.previewContainer.hidden = true;
  els.previewImage.src = "";
}
