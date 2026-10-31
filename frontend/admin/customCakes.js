import {
  getCustomCakes,
  getCustomCake,
  updateCakeStatus,
  updateCakeQuote,
  updateCakeNotes,
} from "./api/customCakesApi.js";

import { BASE_URL } from "../js/config.js";
import { escapeHtml } from "../js/utils.js";

let selectedCake = null;

// ==========================================
// Security helpers
// ==========================================

function safeImageSrc(path) {
  const raw = String(path ?? "");
  if (!/^\/?[\w\-./]+$/.test(raw)) {
    return "";
  }
  return escapeHtml(`${BASE_URL}${raw}`);
}

// ==========================================
// Notification modal
// ==========================================

let notificationListenersBound = false;

function getNotificationModal() {
  return document.querySelector("#notification-modal");
}

function bindNotificationListeners() {
  if (notificationListenersBound) return;

  const modalEl = getNotificationModal();

  if (!modalEl) return;

  modalEl
    .querySelector(".notification-modal-close")
    ?.addEventListener("click", closeNotification);

  modalEl.addEventListener("click", (event) => {
    if (event.target === modalEl) {
      closeNotification();
    }
  });

  notificationListenersBound = true;
}

function closeNotification() {
  const modalEl = getNotificationModal();

  if (modalEl) modalEl.hidden = true;
}

function showNotification(message) {
  const modalEl = getNotificationModal();

  if (!modalEl) {
    console.error(
      "Notification modal markup not found — include notification-modal.html in the page.",
    );
    return;
  }

  const messageEl = modalEl.querySelector("#notification-modal-message");

  if (messageEl) messageEl.textContent = message;

  modalEl.hidden = false;

  bindNotificationListeners();
}

document.addEventListener("keydown", (event) => {
  const modalEl = getNotificationModal();

  if (event.key === "Escape" && modalEl && !modalEl.hidden) {
    closeNotification();
  }
});

// ==========================================
// Load Custom Cakes
// ==========================================

export async function loadCustomCakes() {
  try {
    const tableBody = document.querySelector("#custom-cakes-body");

    const result = await getCustomCakes();

    tableBody.innerHTML = result.data
      .map((cake) => {
        const status = escapeHtml(cake.status);

        return `
          <tr data-id="${escapeHtml(cake.id)}">
            <td>${escapeHtml(cake.reference_number)}</td>
            <td>${escapeHtml(cake.customer_name)}</td>
            <td>${escapeHtml(cake.delivery_date || "-")}</td>
            <td>
              <span class="status-badge status-${status}">
                ${status}
              </span>
            </td>
            <td>
              ${escapeHtml(new Date(cake.created_at).toLocaleDateString())}
            </td>
          </tr>
        `;
      })
      .join("");

    tableBody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", async () => {
        const id = row.dataset.id;

        await openCustomCake(id);
      });
    });
  } catch (error) {
    console.error(error);
  }
}

// ==========================================
// Open Modal
// ==========================================

async function openCustomCake(id) {
  try {
    const result = await getCustomCake(id);

    selectedCake = result.data;

    const cake = selectedCake;

    let inspirationImages = [];

    try {
      inspirationImages =
        typeof cake.inspiration_images === "string"
          ? JSON.parse(cake.inspiration_images || "[]")
          : cake.inspiration_images || [];
    } catch {
      inspirationImages = [];
    }

    document.querySelector("#custom-cake-details").innerHTML = `
      <h2>${escapeHtml(cake.reference_number)}</h2>

      <div class="custom-cake-layout">

        <div class="custom-cake-left">

          <div class="cake-section">
            <h3>Customer Details</h3>

            <div class="cake-row">
              <span class="cake-label">Name</span>
              <span class="cake-value">${escapeHtml(cake.customer_name || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Email</span>
              <span class="cake-value">${escapeHtml(cake.customer_email || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Phone</span>
              <span class="cake-value">${escapeHtml(cake.customer_phone || "-")}</span>
            </div>
          </div>

          <div class="cake-section">
            <h3>Cake Details</h3>

            <div class="cake-row">
              <span class="cake-label">Type</span>
              <span class="cake-value">${escapeHtml(cake.cake_type || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Shape</span>
              <span class="cake-value">${escapeHtml(cake.shape || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Tiers</span>
              <span class="cake-value">${escapeHtml(cake.tiers || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Size</span>
              <span class="cake-value">${escapeHtml(cake.cake_size || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Flavour</span>
              <span class="cake-value">${escapeHtml(cake.flavour || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Style</span>
              <span class="cake-value">${escapeHtml(cake.style || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Theme</span>
              <span class="cake-value">${escapeHtml(cake.theme || "-")}</span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Colours</span>
              <span class="cake-value">
                ${escapeHtml(cake.primary_colour || "-")}
                /
                ${escapeHtml(cake.secondary_colour || "-")}
              </span>
            </div>

            <div class="cake-row">
              <span class="cake-label">Delivery</span>
              <span class="cake-value">
                ${escapeHtml(cake.delivery_date || "-")}
              </span>
            </div>
          </div>

        </div>

        <div class="custom-cake-right">

          ${
            inspirationImages.length
              ? `
              <div class="cake-section">
                <h3>Customer Inspiration Images</h3>

                <div class="inspiration-gallery">

                  ${inspirationImages
                    .map((image) => {
                      const src = safeImageSrc(image);
                      return src
                        ? `
                        <img
                          src="${src}"
                          alt="Cake Inspiration"
                          class="cake-preview-image"
                          loading="lazy"
                        >
                      `
                        : "";
                    })
                    .join("")}

                </div>
              </div>
            `
              : ""
          }

          ${
            cake.ai_preview_image
              ? `
              <div class="cake-section">
                <h3>AI Preview</h3>

                <img
                  src="${escapeHtml(cake.ai_preview_image)}"
                  alt="AI Cake Preview"
                  class="cake-preview-image"
                  loading="lazy"
                >
              </div>
            `
              : ""
          }

          <div class="cake-section admin-actions">

            <h3>Admin Actions</h3>

            <select id="cake-status">
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="quoted">Quoted</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
            </select>

            <button
              id="save-status"
              type="button"
              class="button"
            >
              Save Status
            </button>

            <input
              id="quoted-price"
              type="number"
              value="${escapeHtml(cake.quoted_price || "")}"
              placeholder="Quote Price"
            >

            <button
              id="save-quote"
              type="button"
              class="button"
            >
              Save Quote
            </button>

            <textarea
              id="admin-notes"
              placeholder="Internal admin notes..."
            >${escapeHtml(cake.admin_notes || "")}</textarea>

            <button
              id="save-notes"
              type="button"
              class="button"
            >
              Save Notes
            </button>

          </div>

        </div>

      </div>

      <div class="cake-section ai-prompt-section">

        <h3>AI Prompt</h3>

        <textarea
          readonly
          class="cake-prompt"
        >${escapeHtml(cake.ai_prompt || "")}</textarea>

        <button
          id="copy-prompt"
          type="button"
          class="button"
        >
          Copy Prompt
        </button>

      </div>
    `;

    const statusSelect = document.querySelector("#cake-status");

    if (statusSelect) {
      statusSelect.value = cake.status || "new";
    }

    bindModalActions();

    document.querySelector("#custom-cake-modal").hidden = false;
  } catch (error) {
    console.error(error);
  }
}

// ==========================================
// Modal Actions
// ==========================================

function bindModalActions() {
  const copyButton = document.querySelector("#copy-prompt");

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(selectedCake.ai_prompt || "");

      showNotification("Prompt copied");
    } catch (error) {
      console.error(error);

      showNotification("Failed to copy prompt. Please try again.");
    }
  });

  document
    .querySelector("#save-status")
    ?.addEventListener("click", async () => {
      const status = document.querySelector("#cake-status").value;

      try {
        await updateCakeStatus(selectedCake.id, status);

        showNotification("Status updated");

        await loadCustomCakes();
      } catch (error) {
        console.error(error);

        showNotification("Failed to update status. Please try again.");
      }
    });

  document.querySelector("#save-quote")?.addEventListener("click", async () => {
    const quotedPrice = Number(document.querySelector("#quoted-price").value);

    try {
      await updateCakeQuote(selectedCake.id, quotedPrice);

      showNotification("Quote saved");
    } catch (error) {
      console.error(error);

      showNotification("Failed to save quote. Please try again.");
    }
  });

  document.querySelector("#save-notes")?.addEventListener("click", async () => {
    const adminNotes = document.querySelector("#admin-notes").value;

    try {
      await updateCakeNotes(selectedCake.id, adminNotes);

      showNotification("Notes saved");
    } catch (error) {
      console.error(error);

      showNotification("Failed to save notes. Please try again.");
    }
  });
}

const modal = document.querySelector("#custom-cake-modal");

const closeButton = document.querySelector("#close-custom-cake-modal");

function openModal() {
  modal.hidden = false;

  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.hidden = true;

  document.body.style.overflow = "";
}

closeButton?.addEventListener("click", closeModal);

modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) {
    closeModal();
  }
});
