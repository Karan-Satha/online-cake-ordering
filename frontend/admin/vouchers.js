import { escapeHtml } from "../js/utils.js";
import { showToast } from "./toast.js";
import { getVouchers, getVoucher, createVoucher, updateVoucher, deleteVoucher } from "./api/vouchersApi.js";

const vouchersBody = document.querySelector("#vouchers-body");

const voucherForm = document.querySelector("#voucher-form");

const voucherModal = document.querySelector("#voucher-modal");

const voucherModalClose = document.querySelector("#voucher-modal-close");

const voucherModalTitle = document.querySelector("#voucher-modal-title");

const voucherIdInput = document.querySelector("#voucher-id");

const voucherCodeInput = document.querySelector("#voucher-code");

const voucherDiscountInput = document.querySelector("#voucher-discount");

const voucherActiveInput = document.querySelector("#voucher-active");

const addVoucherButton = document.querySelector("#add-voucher-button");

const deleteModal = document.querySelector("#delete-modal");

const confirmDeleteButton = document.querySelector("#confirm-delete");

const cancelDeleteButton = document.querySelector("#cancel-delete");

const voucherSearch = document.querySelector("#voucher-search");

let voucherToDelete = null;

let allVouchers = [];

export async function loadVouchers() {
  try {
    allVouchers = await getVouchers();

    renderVouchers(allVouchers);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderVouchers(vouchers) {
  if (vouchers.length === 0) {
    vouchersBody.innerHTML = `
      <tr>
        <td colspan="4">
          No vouchers found.
        </td>
      </tr>
    `;

    return;
  }

  vouchersBody.innerHTML = vouchers
    .map(
      (voucher) => `
        <tr>

          <td>${escapeHtml(voucher.code)}</td>

          <td>${voucher.discountPercent}%</td>

          <td>${voucher.isActive ? "Active" : "Inactive"}</td>

          <td>

            <button
              class="edit-voucher"
              data-id="${voucher.id}"
            >
              Edit
            </button>

            <button
              class="delete-voucher"
              data-id="${voucher.id}"
            >
              Delete
            </button>

          </td>

        </tr>
      `,
    )
    .join("");
}

function openVoucherModal() {
  voucherModal.hidden = false;
}

function closeVoucherModal() {
  voucherModal.hidden = true;

  voucherForm.reset();

  voucherIdInput.value = "";

  voucherActiveInput.checked = true;

  voucherModalTitle.textContent = "Add Voucher";
}

voucherModalClose.addEventListener("click", closeVoucherModal);

addVoucherButton.addEventListener("click", () => {
  voucherForm.reset();

  voucherIdInput.value = "";

  voucherActiveInput.checked = true;

  voucherModalTitle.textContent = "Add Voucher";

  openVoucherModal();
});

voucherForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const voucher = {
    code: voucherCodeInput.value.trim(),
    discountPercent: Number(voucherDiscountInput.value),
    isActive: voucherActiveInput.checked,
  };

  try {
    if (voucherIdInput.value) {
      await updateVoucher(Number(voucherIdInput.value), voucher);

      showToast("Voucher updated successfully.");
    } else {
      await createVoucher(voucher);

      showToast("Voucher created successfully.");
    }

    closeVoucherModal();

    await loadVouchers();
  } catch (error) {
    showToast(error.message, "error");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !voucherModal.hidden) {
    closeVoucherModal();
  }
});

vouchersBody.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".edit-voucher");

  if (editButton) {
    try {
      const voucher = await getVoucher(Number(editButton.dataset.id));

      voucherIdInput.value = voucher.id;
      voucherCodeInput.value = voucher.code;
      voucherDiscountInput.value = voucher.discountPercent;
      voucherActiveInput.checked = voucher.isActive;

      voucherModalTitle.textContent = "Edit Voucher";

      openVoucherModal();
    } catch (error) {
      showToast(error.message, "error");
    }

    return;
  }

  const deleteButton = event.target.closest(".delete-voucher");

  if (!deleteButton) return;

  voucherToDelete = Number(deleteButton.dataset.id);

  deleteModal.hidden = false;
});

cancelDeleteButton.addEventListener("click", () => {
  deleteModal.hidden = true;

  voucherToDelete = null;
});

confirmDeleteButton.addEventListener("click", async () => {
  if (!voucherToDelete) return;

  try {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Deleting...";

    await deleteVoucher(voucherToDelete);

    showToast("Voucher deleted successfully.");

    deleteModal.hidden = true;

    voucherToDelete = null;

    await loadVouchers();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = "Delete";
  }
});

voucherSearch?.addEventListener("input", () => {
  const search = voucherSearch.value.trim().toLowerCase();

  const filteredVouchers = allVouchers.filter((voucher) => voucher.code.toLowerCase().includes(search));

  renderVouchers(filteredVouchers);
});
