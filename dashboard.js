const SUPABASE_URL = "https://gvooqilvlqztifzpwaew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b29xaWx2bHF6dGlmenB3YWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjc2NzIsImV4cCI6MjEwMzcwMzY3Mn0.GWoRsQPa1B0sQIGf-6trhf9WwdxvQREgz25puLbA9_o";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const loginView = document.getElementById("login-view"),
  dashboardView = document.getElementById("dashboard-view"),
  loginForm = document.getElementById("login-form"),
  authError = document.getElementById("auth-error"),
  requestsList = document.getElementById("requests-list"),
  searchInput = document.getElementById("search-input"),
  statusFilter = document.getElementById("status-filter"),
  sortSelect = document.getElementById("sort-select"),
  editorDialog = document.getElementById("editor-dialog"),
  editorForm = document.getElementById("editor-form"),
  timesheetDialog = document.getElementById("timesheet-dialog"),
  paySettingsForm = document.getElementById("pay-settings-form"),
  billingSettingsForm = document.getElementById("billing-settings-form"),
  logTimeForm = document.getElementById("log-time-form"),
  timesheetBody = document.getElementById("timesheet-body");
let allCommissions = [],
  currentLogs = [],
  currentTimesheetId = null,
  timesheetLogsLoaded = false,
  timesheetLoadToken = 0,
  toastTimer;
const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
const safeURL = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};
const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "None";
const fileNameFromURL = (value, index) => {
  try {
    const name = decodeURIComponent(new URL(value).pathname.split("/").pop());
    return name || `reference-${index + 1}.jpg`;
  } catch {
    return `reference-${index + 1}.jpg`;
  }
};
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast is-visible${isError ? " is-error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.className = "toast"), 2800);
}
async function initSession() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  session ? showDashboard() : showLogin();
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.textContent = "";
  const button = document.getElementById("login-btn");
  button.disabled = true;
  button.textContent = "Signing in…";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("login-email").value.trim(),
    password: document.getElementById("login-password").value,
  });
  button.disabled = false;
  button.textContent = "Enter studio →";
  if (error) authError.textContent = error.message;
  else showDashboard();
});
document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});
document
  .getElementById("refresh-btn")
  .addEventListener("click", () => fetchCommissions(true));
function showLogin() {
  loginView.style.display = "grid";
  dashboardView.style.display = "none";
}
function showDashboard() {
  loginView.style.display = "none";
  dashboardView.style.display = "block";
  fetchCommissions();
}
async function fetchCommissions(notify = false) {
  const button = document.getElementById("refresh-btn");
  button.disabled = true;
  requestsList.innerHTML =
    '<div class="loading">Refreshing your commission desk…</div>';
  const { data, error } = await supabaseClient
    .from("commissions")
    .select("*")
    .order("created_at", { ascending: false });
  button.disabled = false;
  if (error) {
    requestsList.innerHTML = `<div class="empty-state"><strong>Couldn’t load requests</strong>${escapeHTML(error.message)}</div>`;
    return;
  }
  allCommissions = data || [];
  updateStats();
  applyFilters();
  document.getElementById("last-updated").textContent =
    `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (notify) showToast("Commission desk refreshed");
}
function updateStats() {
  document.getElementById("stat-all").textContent = allCommissions.length;
  document.getElementById("stat-new").textContent = allCommissions.filter(
    (i) => (i.status || "New") === "New",
  ).length;
  document.getElementById("stat-active").textContent = allCommissions.filter(
    (i) => ["Accepted", "In Progress"].includes(i.status),
  ).length;
  document.getElementById("stat-completed").textContent = allCommissions.filter(
    (i) => i.status === "Completed",
  ).length;
}
function applyFilters() {
  const query = searchInput.value.trim().toLowerCase(),
    status = statusFilter.value;
  let items = allCommissions.filter((item) => {
    const itemStatus = item.status || "New",
      matchesStatus =
        status === "All" ||
        itemStatus === status ||
        (status === "Active" &&
          ["Accepted", "In Progress"].includes(itemStatus));
    const haystack = [
      item.email,
      item.artwork_type,
      item.medium,
      item.size,
      item.aspect_ratio,
      item.prefered_file_type,
      item.description,
      item.style_preference,
      item.additional_comment,
      item.internal_notes,
    ]
      .join(" ")
      .toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
  items.sort((a, b) =>
    sortSelect.value === "oldest"
      ? new Date(a.created_at) - new Date(b.created_at)
      : sortSelect.value === "deadline"
        ? (a.deadline ? new Date(a.deadline) : Infinity) -
          (b.deadline ? new Date(b.deadline) : Infinity)
        : new Date(b.created_at) - new Date(a.created_at),
  );
  renderRequests(items);
  document.getElementById("results-count").textContent =
    `Showing ${items.length} of ${allCommissions.length} request${allCommissions.length === 1 ? "" : "s"}`;
}
function renderRequests(items) {
  if (!items.length) {
    requestsList.innerHTML =
      '<div class="empty-state"><strong>No requests here</strong>Try another search or status filter.</div>';
    return;
  }
  requestsList.innerHTML = items
    .map((item) => {
      const status = escapeHTML(item.status || "New"),
        id = escapeHTML(item.id),
        images = Array.isArray(item.reference_images)
          ? item.reference_images
          : [],
        balance = getBalanceState(item),
        isDigital = item.artwork_type === "Digital",
        summaryFormat = isDigital
          ? item.aspect_ratio || "Ratio open"
          : item.size || "Size open",
        formatDetails = isDigital
          ? `<div class="detail-item"><strong>Aspect ratio</strong>${escapeHTML(item.aspect_ratio || "Not specified")}</div><div class="detail-item"><strong>Preferred file type</strong>${escapeHTML(item.prefered_file_type || "Not specified")}</div>`
          : `<div class="detail-item"><strong>Medium</strong>${escapeHTML(item.medium || "Not specified")}</div><div class="detail-item"><strong>Dimensions</strong>${escapeHTML(item.size || "Not specified")}</div>`;
      return `<article class="request-card" data-id="${id}"><button class="request-summary" type="button" aria-expanded="false"><div><div class="request-title">${escapeHTML(item.artwork_type || "Artwork")} commission</div><div class="request-meta">${escapeHTML(item.email)} · Submitted ${formatDate(item.created_at)}</div></div><span class="summary-size">${escapeHTML(summaryFormat)}</span><span class="summary-balance ${balance.className}" aria-label="${escapeHTML(balance.ariaLabel)}">${escapeHTML(balance.shortLabel)}</span><span class="chevron" aria-hidden="true">⌄</span></button><div class="request-body"><div class="detail-grid"><div class="detail-item"><strong>Status</strong><select class="status-select" data-status="${status}" aria-label="Update commission status"><option ${status === "New" ? "selected" : ""}>New</option><option ${status === "Accepted" ? "selected" : ""}>Accepted</option><option ${status === "In Progress" ? "selected" : ""}>In Progress</option><option ${status === "Completed" ? "selected" : ""}>Completed</option><option ${status === "Declined" ? "selected" : ""}>Declined</option></select></div><div class="detail-item"><strong>Contact</strong><a href="mailto:${escapeHTML(item.email)}">${escapeHTML(item.email)}</a>${item.phone_number ? `<br>${escapeHTML(item.phone_number)}` : ""}</div>${formatDetails}<div class="detail-item"><strong>Deadline</strong>${formatDate(item.deadline)} · ${escapeHTML(item.deadline_flexibility || "Not specified")}</div><div class="detail-item"><strong>Payment method</strong>${escapeHTML(item.payment_method || "Not specified")}</div><div class="detail-item"><strong>Client billing</strong>${escapeHTML(balance.detailLabel)}</div></div><div class="description-block detail-item"><strong>Creative brief</strong>${escapeHTML(item.description || "No description provided")}</div>${item.style_preference ? `<div class="description-block detail-item"><strong>Style preference</strong>${escapeHTML(item.style_preference)}</div>` : ""}${item.additional_comment ? `<div class="description-block detail-item"><strong>Client comments</strong>${escapeHTML(item.additional_comment)}</div>` : ""}${
        images.length
          ? `<div class="detail-item" style="margin-top:1rem"><strong>Reference images</strong><div class="image-gallery">${images
              .map((url, index) => {
                const safe = escapeHTML(safeURL(url)),
                  name = escapeHTML(fileNameFromURL(url, index));
                return `<div class="reference-item"><a href="${safe}" target="_blank" rel="noopener"><img src="${safe}" alt="Commission reference image ${index + 1}" loading="lazy"></a><button class="image-download" type="button" data-download-url="${safe}" data-download-name="${name}">↓ Download</button></div>`;
              })
              .join("")}</div></div>`
          : ""
      }<section class="notes-panel"><div class="notes-heading"><strong>Internal notes</strong><span class="private-label">Private studio note</span></div><textarea class="notes-textarea" placeholder="Add notes about this commission…">${escapeHTML(item.internal_notes || "")}</textarea><div class="notes-actions"><button class="btn compact save-notes" type="button">Save notes</button></div></section><div class="card-actions"><button class="btn compact manage-time" type="button">Time &amp; pay</button><button class="btn compact edit-request" type="button">Edit request</button><button class="btn compact danger delete-request" type="button">Delete</button></div></div></article>`;
    })
    .join("");
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

function numericMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function getBalanceState(item) {
  const total = numericMoney(item.total_price);
  const paid = numericMoney(item.amount_paid);
  const difference = total - paid;

  if (total === 0) {
    return {
      className: "is-unset",
      shortLabel: "Price not set",
      ariaLabel: "Commission price has not been set",
      detailLabel: `Price not set · ${currencyFormatter.format(paid)} paid`,
    };
  }
  if (difference > 0.005) {
    return {
      className: "is-due",
      shortLabel: `${currencyFormatter.format(difference)} due`,
      ariaLabel: `${currencyFormatter.format(difference)} left to pay`,
      detailLabel: `${currencyFormatter.format(total)} total · ${currencyFormatter.format(paid)} paid · ${currencyFormatter.format(difference)} due`,
    };
  }
  if (difference < -0.005) {
    const credit = Math.abs(difference);
    return {
      className: "is-credit",
      shortLabel: `${currencyFormatter.format(credit)} credit`,
      ariaLabel: `Paid in full with a ${currencyFormatter.format(credit)} credit`,
      detailLabel: `${currencyFormatter.format(total)} total · ${currencyFormatter.format(paid)} paid · ${currencyFormatter.format(credit)} credit`,
    };
  }
  return {
    className: "is-paid",
    shortLabel: "Paid in full",
    ariaLabel: "Commission is paid in full",
    detailLabel: `${currencyFormatter.format(total)} total · paid in full`,
  };
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatWorkDate(value) {
  return value ? formatDate(`${value}T00:00:00`) : "None";
}

function numericHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) ? hours : 0;
}

function calculateTotalPrice() {
  const mode = document.getElementById("pay-mode-select").value;
  const rate = Number(document.getElementById("pay-rate-input").value) || 0;
  const totalHours = currentLogs.reduce(
    (total, log) => total + numericHours(log.hours),
    0,
  );
  return mode === "flat" ? rate : totalHours * rate;
}

function updatePaySummary() {
  const totalHours = currentLogs.reduce(
    (total, log) => total + numericHours(log.hours),
    0,
  );
  const totalPrice = calculateTotalPrice();

  document.getElementById("total-hours-display").textContent =
    totalHours.toFixed(2);
  document.getElementById("total-pay-display").textContent =
    currencyFormatter.format(totalPrice);
  updateBillingSummary();
}

function updatePayLabel() {
  const isHourly =
    document.getElementById("pay-mode-select").value === "hourly";
  document.getElementById("pay-rate-label").textContent = isHourly
    ? "Hourly rate ($)"
    : "Flat project fee ($)";
  updatePaySummary();
}

function updateBillingSummary() {
  const total = calculateTotalPrice();
  const paid = numericMoney(document.getElementById("amount-paid-input").value);
  const difference = total - paid;
  const balance = Math.max(difference, 0);
  const summaryCard = document.getElementById("balance-summary-card");
  const balanceNote = document.getElementById("balance-note");

  document.getElementById("billing-paid-display").textContent =
    currencyFormatter.format(paid);
  document.getElementById("outstanding-balance-display").textContent =
    currencyFormatter.format(balance);

  summaryCard.className = "balance-total";
  if (difference > 0.005) {
    summaryCard.classList.add("is-due");
    balanceNote.textContent = "Payment outstanding";
  } else if (difference < -0.005) {
    summaryCard.classList.add("is-credit");
    balanceNote.textContent = `${currencyFormatter.format(Math.abs(difference))} credit`;
  } else {
    summaryCard.classList.add("is-paid");
    balanceNote.textContent =
      total > 0 ? "Paid in full" : "Set a price to begin";
  }
}

async function syncCalculatedTotalPrice(commissionId) {
  const totalPrice = calculateTotalPrice();
  const record = allCommissions.find(
    (item) => String(item.id) === commissionId,
  );
  if (
    record &&
    Math.abs(numericMoney(record.total_price) - totalPrice) <= 0.005
  ) {
    return true;
  }

  const { error } = await supabaseClient
    .from("commissions")
    .update({ total_price: totalPrice })
    .eq("id", commissionId);
  if (error) {
    showToast(`Couldn’t sync the total price: ${error.message}`, true);
    return false;
  }

  if (record) record.total_price = totalPrice;
  applyFilters();
  return true;
}

function setTimesheetStatus(message, isError = false) {
  const status = document.getElementById("timesheet-status");
  status.textContent = message;
  status.className = `timesheet-status${isError ? " is-error" : ""}`;
}

function renderLogs() {
  if (!currentLogs.length) {
    timesheetBody.innerHTML =
      '<tr><td colspan="4" class="ledger-message">No time logged yet. Add the first work session above.</td></tr>';
    updatePaySummary();
    return;
  }

  timesheetBody.innerHTML = currentLogs
    .map((log) => {
      const hours = numericHours(log.hours);
      const hoursLabel = `${hours.toFixed(2)} hour${hours === 1 ? "" : "s"}`;
      return `<tr><td data-label="Date">${formatWorkDate(log.work_date)}</td><td data-label="Description">${escapeHTML(log.description || "No description")}</td><td data-label="Hours">${hours.toFixed(2)}</td><td class="ledger-action"><button type="button" class="btn compact danger delete-time-log" data-log-id="${escapeHTML(log.id)}" aria-label="Delete ${escapeHTML(hoursLabel)} logged on ${escapeHTML(formatWorkDate(log.work_date))}">Delete</button></td></tr>`;
    })
    .join("");
  updatePaySummary();
}

async function loadTimesheet(commissionId) {
  const loadToken = ++timesheetLoadToken;
  timesheetBody.setAttribute("aria-busy", "true");
  timesheetBody.innerHTML =
    '<tr><td colspan="4" class="ledger-message">Loading time entries…</td></tr>';
  const { data, error } = await supabaseClient
    .from("work_logs")
    .select("id, commission_id, work_date, hours, description")
    .eq("commission_id", commissionId)
    .order("work_date", { ascending: false });

  if (currentTimesheetId !== commissionId || loadToken !== timesheetLoadToken)
    return;
  timesheetBody.removeAttribute("aria-busy");
  if (error) {
    currentLogs = [];
    timesheetLogsLoaded = false;
    timesheetBody.innerHTML = `<tr><td colspan="4" class="ledger-message is-error">Couldn’t load time entries: ${escapeHTML(error.message)}</td></tr>`;
    updatePaySummary();
    setTimesheetStatus("Time entries could not be loaded.", true);
    return;
  }

  currentLogs = data || [];
  timesheetLogsLoaded = true;
  document.getElementById("add-time-log").disabled = false;
  renderLogs();
  const totalSynced = await syncCalculatedTotalPrice(commissionId);
  setTimesheetStatus(
    totalSynced
      ? `${currentLogs.length} time ${currentLogs.length === 1 ? "entry" : "entries"} loaded.`
      : "Time entries loaded, but the total price could not be synced.",
    !totalSynced,
  );
}

function openTimesheet(item) {
  if (!item) {
    showToast("Couldn’t find that commission.", true);
    return;
  }

  currentTimesheetId = String(item.id);
  currentLogs = [];
  timesheetLogsLoaded = false;
  paySettingsForm.reset();
  billingSettingsForm.reset();
  logTimeForm.reset();
  document.getElementById("pay-mode-select").value =
    item.pay_mode === "flat" ? "flat" : "hourly";
  document.getElementById("pay-rate-input").value = item.pay_rate ?? 0;
  document.getElementById("amount-paid-input").value = item.amount_paid ?? 0;
  document.getElementById("add-time-log").disabled = true;
  document.getElementById("log-date").value = todayISO();
  document.getElementById("timesheet-description").textContent =
    `Track hours, calculate the total price, and manage payments for ${item.email || "this commission"}.`;
  document.getElementById("pay-settings-status").textContent = "";
  document.getElementById("billing-settings-status").textContent = "";
  setTimesheetStatus("Loading time entries.");
  updatePayLabel();
  timesheetDialog.showModal();
  loadTimesheet(currentTimesheetId);
  setTimeout(() => document.getElementById("pay-mode-select").focus(), 0);
}

requestsList.addEventListener("click", async (event) => {
  const card = event.target.closest(".request-card"),
    id = card?.dataset.id,
    item = allCommissions.find((record) => String(record.id) === id);
  const summary = event.target.closest(".request-summary");
  if (summary) {
    const open = card.classList.toggle("is-open");
    summary.setAttribute("aria-expanded", String(open));
    return;
  }
  if (event.target.closest(".edit-request")) {
    openEditor(item);
    return;
  }
  if (event.target.closest(".manage-time")) {
    openTimesheet(item);
    return;
  }
  if (event.target.closest(".delete-request")) {
    if (
      !confirm(
        `Delete the commission request from ${item?.email || "this client"}? This cannot be undone.`,
      )
    )
      return;
    const button = event.target.closest(".delete-request");
    button.disabled = true;
    const { error } = await supabaseClient
      .from("commissions")
      .delete()
      .eq("id", id);
    if (error) {
      button.disabled = false;
      showToast(`Couldn’t delete request: ${error.message}`, true);
      return;
    }
    allCommissions = allCommissions.filter(
      (record) => String(record.id) !== id,
    );
    updateStats();
    applyFilters();
    showToast("Request deleted");
    return;
  }
  if (event.target.closest(".save-notes")) {
    const button = event.target.closest(".save-notes"),
      notes = card.querySelector(".notes-textarea").value.trim();
    button.disabled = true;
    button.textContent = "Saving…";
    const { error } = await supabaseClient
      .from("commissions")
      .update({ internal_notes: notes || null })
      .eq("id", id);
    button.disabled = false;
    button.textContent = "Save notes";
    if (error) {
      showToast(`Couldn’t save notes: ${error.message}`, true);
      return;
    }
    if (item) item.internal_notes = notes || null;
    showToast("Internal notes saved");
    return;
  }
  if (event.target.closest(".image-download")) {
    const button = event.target.closest(".image-download");
    await downloadImage(
      button.dataset.downloadUrl,
      button.dataset.downloadName,
      button,
    );
    return;
  }
});
requestsList.addEventListener("change", async (event) => {
  const select = event.target.closest(".status-select");
  if (!select) return;
  const card = select.closest(".request-card"),
    id = card.dataset.id,
    newStatus = select.value,
    previous = select.dataset.status;
  select.disabled = true;
  const { error } = await supabaseClient
    .from("commissions")
    .update({ status: newStatus })
    .eq("id", id);
  select.disabled = false;
  if (error) {
    select.value = previous;
    showToast(`Couldn’t update status: ${error.message}`, true);
    return;
  }
  select.dataset.status = newStatus;
  const record = allCommissions.find((item) => String(item.id) === id);
  if (record) record.status = newStatus;
  updateStats();
  applyFilters();
  showToast(`Status changed to ${newStatus}`);
});
function setEditorValue(id, value) {
  document.getElementById(id).value = value ?? "";
}
function syncEditorFormat() {
  const selectedFormat = document.getElementById("edit-type").value.toLowerCase();
  document.querySelectorAll("[data-format]").forEach((group) => {
    const isActive = group.dataset.format === selectedFormat;
    group.hidden = !isActive;
    group.querySelectorAll("input, select, textarea").forEach((field) => {
      field.disabled = !isActive;
    });
  });
}
function openEditor(item = null) {
  editorForm.reset();
  editorForm.dataset.editingId = item?.id ?? "";
  document.getElementById("editor-eyebrow").textContent = item
    ? "Update commission"
    : "Quick entry";
  document.getElementById("editor-title").textContent = item
    ? "Edit request"
    : "Add request";
  document.getElementById("editor-save").textContent = item
    ? "Save changes"
    : "Add request";
  setEditorValue("edit-email", item?.email);
  setEditorValue("edit-phone", item?.phone_number);
  setEditorValue("edit-type", item?.artwork_type || "Traditional");
  setEditorValue("edit-status", item?.status || "New");
  setEditorValue("edit-medium", item?.medium);
  setEditorValue("edit-size", item?.size);
  setEditorValue("edit-aspect-ratio", item?.aspect_ratio);
  setEditorValue("edit-file-type", item?.prefered_file_type);
  setEditorValue("edit-description", item?.description);
  setEditorValue("edit-style", item?.style_preference);
  setEditorValue("edit-deadline", item?.deadline);
  setEditorValue("edit-flexibility", item?.deadline_flexibility || "Flexible");
  setEditorValue("edit-payment", item?.payment_method);
  setEditorValue("edit-comments", item?.additional_comment);
  setEditorValue("edit-notes", item?.internal_notes);
  syncEditorFormat();
  editorDialog.showModal();
  setTimeout(() => document.getElementById("edit-email").focus(), 0);
}
async function downloadImage(url, name, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Downloading…";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Image could not be downloaded");
    const blob = await response.blob(),
      objectURL = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = objectURL;
    link.download = name || "commission-reference";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
    showToast("Image download started");
  } catch (error) {
    showToast(error.message || "Image download failed", true);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}
document
  .getElementById("add-request-btn")
  .addEventListener("click", () => openEditor());
document.getElementById("edit-type").addEventListener("change", syncEditorFormat);
document
  .getElementById("editor-close")
  .addEventListener("click", () => editorDialog.close());
document
  .getElementById("editor-cancel")
  .addEventListener("click", () => editorDialog.close());
editorDialog.addEventListener("click", (event) => {
  if (event.target === editorDialog) editorDialog.close();
});
document
  .getElementById("timesheet-close")
  .addEventListener("click", () => timesheetDialog.close());
timesheetDialog.addEventListener("click", (event) => {
  if (event.target === timesheetDialog) timesheetDialog.close();
});
timesheetDialog.addEventListener("close", () => {
  currentTimesheetId = null;
  currentLogs = [];
  timesheetLogsLoaded = false;
  timesheetLoadToken += 1;
});
document
  .getElementById("pay-mode-select")
  .addEventListener("change", updatePayLabel);
document
  .getElementById("pay-rate-input")
  .addEventListener("input", updatePaySummary);
document
  .getElementById("amount-paid-input")
  .addEventListener("input", updateBillingSummary);

paySettingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentTimesheetId) return;

  const mode = document.getElementById("pay-mode-select").value;
  const rate = Number(document.getElementById("pay-rate-input").value);
  const button = document.getElementById("save-pay-settings");
  const status = document.getElementById("pay-settings-status");
  if (!Number.isFinite(rate) || rate < 0) {
    status.textContent = "Enter a valid amount.";
    document.getElementById("pay-rate-input").focus();
    return;
  }
  if (mode === "hourly" && !timesheetLogsLoaded) {
    status.textContent = "Wait for time entries to finish loading.";
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";
  status.textContent = "Saving settings…";
  const commissionId = currentTimesheetId;
  const totalPrice = calculateTotalPrice();
  const { error } = await supabaseClient
    .from("commissions")
    .update({ pay_mode: mode, pay_rate: rate, total_price: totalPrice })
    .eq("id", commissionId);
  button.disabled = false;
  button.textContent = "Save settings";

  if (error) {
    status.textContent = "Settings weren’t saved.";
    showToast(`Couldn’t save pay settings: ${error.message}`, true);
    return;
  }

  const record = allCommissions.find(
    (item) => String(item.id) === commissionId,
  );
  if (record) {
    record.pay_mode = mode;
    record.pay_rate = rate;
    record.total_price = totalPrice;
  }
  status.textContent = "Settings saved.";
  updatePaySummary();
  applyFilters();
  showToast("Pay settings saved");
});

billingSettingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentTimesheetId) return;

  const amountPaid = Number(document.getElementById("amount-paid-input").value);
  const button = document.getElementById("save-billing-settings");
  const status = document.getElementById("billing-settings-status");
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    status.textContent = "Enter a valid non-negative amount.";
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";
  status.textContent = "Saving payment…";
  const commissionId = currentTimesheetId;
  const { error } = await supabaseClient
    .from("commissions")
    .update({ amount_paid: amountPaid })
    .eq("id", commissionId);
  button.disabled = false;
  button.textContent = "Save payment";

  if (error) {
    status.textContent = "Payment wasn’t saved.";
    showToast(`Couldn’t save payment details: ${error.message}`, true);
    return;
  }

  const record = allCommissions.find(
    (item) => String(item.id) === commissionId,
  );
  if (record) {
    record.amount_paid = amountPaid;
  }
  status.textContent = "Payment saved.";
  updateBillingSummary();
  applyFilters();
  showToast("Payment balance updated");
});

logTimeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentTimesheetId) return;

  const date = document.getElementById("log-date").value;
  const hours = Number(document.getElementById("log-hours").value);
  const description = document.getElementById("log-notes").value.trim();
  const button = document.getElementById("add-time-log");
  if (!date || !Number.isFinite(hours) || hours <= 0) {
    setTimesheetStatus(
      "Enter a date and a number of hours greater than zero.",
      true,
    );
    return;
  }

  button.disabled = true;
  button.textContent = "Adding…";
  setTimesheetStatus("Adding time entry.");
  const commissionId = currentTimesheetId;
  const { data, error } = await supabaseClient
    .from("work_logs")
    .insert([
      {
        commission_id: commissionId,
        work_date: date,
        hours,
        description: description || null,
      },
    ])
    .select("id, commission_id, work_date, hours, description")
    .single();
  button.disabled = false;
  button.textContent = "Add entry";

  if (error) {
    setTimesheetStatus(`Couldn’t add the time entry: ${error.message}`, true);
    showToast("Time entry wasn’t added.", true);
    return;
  }
  if (currentTimesheetId !== commissionId) return;

  currentLogs.push(data);
  currentLogs.sort((a, b) => b.work_date.localeCompare(a.work_date));
  document.getElementById("log-hours").value = "";
  document.getElementById("log-notes").value = "";
  renderLogs();
  const totalSynced = await syncCalculatedTotalPrice(commissionId);
  setTimesheetStatus(
    totalSynced
      ? "Time entry added and total price updated."
      : "Time entry added, but the total price could not be synced.",
    !totalSynced,
  );
  document.getElementById("log-hours").focus();
});

timesheetBody.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-time-log");
  if (!button || !currentTimesheetId) return;

  const log = currentLogs.find(
    (entry) => String(entry.id) === button.dataset.logId,
  );
  if (!log) return;
  if (
    !confirm(
      `Delete the ${numericHours(log.hours).toFixed(2)}-hour entry from ${formatWorkDate(log.work_date)}?`,
    )
  )
    return;

  button.disabled = true;
  button.textContent = "Deleting…";
  const commissionId = currentTimesheetId;
  const { error } = await supabaseClient
    .from("work_logs")
    .delete()
    .eq("id", log.id)
    .eq("commission_id", commissionId);

  if (error) {
    button.disabled = false;
    button.textContent = "Delete";
    setTimesheetStatus(
      `Couldn’t delete the time entry: ${error.message}`,
      true,
    );
    showToast("Time entry wasn’t deleted.", true);
    return;
  }
  if (currentTimesheetId !== commissionId) return;

  currentLogs = currentLogs.filter((entry) => entry.id !== log.id);
  renderLogs();
  const totalSynced = await syncCalculatedTotalPrice(commissionId);
  setTimesheetStatus(
    totalSynced
      ? "Time entry deleted and total price updated."
      : "Time entry deleted, but the total price could not be synced.",
    !totalSynced,
  );
});

editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = editorForm.dataset.editingId,
    saveButton = document.getElementById("editor-save"),
    value = (fieldId) => document.getElementById(fieldId).value.trim(),
    artworkType = value("edit-type"),
    isDigital = artworkType === "Digital";
  const payload = {
    email: value("edit-email"),
    phone_number: value("edit-phone") || null,
    artwork_type: artworkType,
    status: value("edit-status"),
    medium: isDigital ? null : value("edit-medium"),
    size: isDigital ? null : value("edit-size"),
    aspect_ratio: isDigital ? value("edit-aspect-ratio") : null,
    prefered_file_type: isDigital ? value("edit-file-type") : null,
    description: value("edit-description"),
    style_preference: value("edit-style") || null,
    deadline: value("edit-deadline") || null,
    deadline_flexibility: value("edit-flexibility"),
    payment_method: value("edit-payment"),
    additional_comment: value("edit-comments") || null,
    internal_notes: value("edit-notes") || null,
  };
  saveButton.disabled = true;
  saveButton.textContent = id ? "Saving changes…" : "Adding request…";
  const { error } = id
    ? await supabaseClient.from("commissions").update(payload).eq("id", id)
    : await supabaseClient
        .from("commissions")
        .insert([{ ...payload, reference_images: [] }]);
  saveButton.disabled = false;
  saveButton.textContent = id ? "Save changes" : "Add request";
  if (error) {
    showToast(`Couldn’t save request: ${error.message}`, true);
    return;
  }
  editorDialog.close();
  await fetchCommissions();
  showToast(id ? "Request updated" : "Request added");
});
[searchInput, statusFilter, sortSelect].forEach((control) =>
  control.addEventListener(
    control === searchInput ? "input" : "change",
    applyFilters,
  ),
);
document.querySelectorAll("[data-quick-filter]").forEach((card) =>
  card.addEventListener("click", () => {
    document
      .querySelectorAll("[data-quick-filter]")
      .forEach((c) => c.classList.remove("is-selected"));
    card.classList.add("is-selected");
    statusFilter.value = card.dataset.quickFilter;
    applyFilters();
  }),
);
statusFilter.addEventListener("change", () =>
  document
    .querySelectorAll("[data-quick-filter]")
    .forEach((card) =>
      card.classList.toggle(
        "is-selected",
        card.dataset.quickFilter === statusFilter.value,
      ),
    ),
);
initSession();
