const SUPABASE_URL = "https://gvooqilvlqztifzpwaew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b29xaWx2bHF6dGlmenB3YWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjc2NzIsImV4cCI6MjEwMzcwMzY3Mn0.GWoRsQPa1B0sQIGf-6trhf9WwdxvQREgz25puLbA9_o";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const form = document.getElementById("commission-form"),
  formCard = document.getElementById("form-card"),
  successPanel = document.getElementById("success-panel"),
  submitBtn = document.getElementById("submit-btn"),
  nextBtn = document.getElementById("next-btn"),
  backBtn = document.getElementById("back-btn"),
  submitNote = document.getElementById("submit-note"),
  formStatus = document.getElementById("form-status"),
  fileInput = document.getElementById("reference_images"),
  fileList = document.getElementById("file-list");
let selectedFiles = [],
  previewURLs = [];
document
  .getElementById("size-other-text")
  .addEventListener(
    "focus",
    () => (document.getElementById("size-other-radio").checked = true),
  );
document
  .getElementById("payment-other-text")
  .addEventListener(
    "focus",
    () => (document.getElementById("payment-other-radio").checked = true),
  );
document
  .getElementById("aspect-other-text")
  .addEventListener(
    "focus",
    () => (document.getElementById("aspect-other-radio").checked = true),
  );
function formatFileSize(bytes) {
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function syncFileInput() {
  const transfer = new DataTransfer();
  selectedFiles.forEach((file) => transfer.items.add(file));
  fileInput.files = transfer.files;
}
function renderSelectedFiles() {
  previewURLs.forEach((url) => URL.revokeObjectURL(url));
  previewURLs = [];
  fileList.replaceChildren();
  const n = selectedFiles.length;
  document.getElementById("file-summary").textContent = n
    ? `${n} file${n === 1 ? "" : "s"} selected`
    : "No files selected";
  selectedFiles.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "selected-file";
    const preview = document.createElement("img"),
      url = URL.createObjectURL(file);
    previewURLs.push(url);
    preview.className = "selected-file-preview";
    preview.src = url;
    preview.alt = "";
    const info = document.createElement("span");
    info.className = "selected-file-info";
    const name = document.createElement("span");
    name.className = "selected-file-name";
    name.textContent = file.name;
    name.title = file.name;
    const size = document.createElement("span");
    size.className = "selected-file-size";
    size.textContent = formatFileSize(file.size);
    info.append(name, size);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-file";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      syncFileInput();
      renderSelectedFiles();
    });
    row.append(preview, info, remove);
    fileList.append(row);
  });
}
fileInput.addEventListener("change", () => {
  selectedFiles = Array.from(fileInput.files);
  renderSelectedFiles();
});
const sections = Array.from(document.querySelectorAll("[data-step]")),
  progressItems = document.querySelectorAll("[data-progress]");
let currentStep = 1;

function getArtworkType() {
  return document.querySelector('input[name="artwork_type"]:checked')?.value;
}

function getStepSection(step) {
  if (step !== 3) return sections.find((section) => Number(section.dataset.step) === step);
  const branch = getArtworkType()?.toLowerCase();
  return sections.find(
    (section) => Number(section.dataset.step) === 3 && section.dataset.branch === branch,
  );
}

function syncBranchFields() {
  const branch = getArtworkType()?.toLowerCase();
  document.querySelectorAll("[data-branch]").forEach((section) => {
    const isSelected = section.dataset.branch === branch;
    section.querySelectorAll("input, textarea, select").forEach((field) => {
      field.disabled = !isSelected;
    });
  });
}

function showStep(step, shouldFocus = true) {
  currentStep = step;
  syncBranchFields();
  const activeSection = getStepSection(step);
  sections.forEach((section) => {
    section.hidden = section !== activeSection;
  });
  progressItems.forEach((item) => {
    const itemStep = Number(item.dataset.progress);
    item.classList.toggle("is-active", itemStep === step);
    item.classList.toggle("is-complete", itemStep < step);
  });
  backBtn.hidden = step === 1;
  nextBtn.hidden = step === 4;
  submitBtn.hidden = step !== 4;
  submitNote.hidden = step !== 4;
  formStatus.className = "";
  formStatus.textContent = "";
  if (shouldFocus) {
    activeSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    activeSection?.querySelector("input, textarea")?.focus({ preventScroll: true });
  }
}

function validateCurrentStep() {
  const section = getStepSection(currentStep);
  if (!section) return false;
  const fields = Array.from(section.querySelectorAll("input, textarea, select"));
  const invalidField = fields.find((field) => !field.disabled && !field.checkValidity());
  if (invalidField) {
    invalidField.reportValidity();
    invalidField.focus();
    return false;
  }
  if (
    currentStep === 3 &&
    getArtworkType() === "Traditional" &&
    !section.querySelector('input[name="medium"]:checked')
  ) {
    setError("Please choose at least one medium, or select Artist’s choice.");
    return false;
  }
  return true;
}

nextBtn.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  showStep(currentStep + 1);
});
backBtn.addEventListener("click", () => showStep(currentStep - 1));
document.querySelectorAll('input[name="artwork_type"]').forEach((input) =>
  input.addEventListener("change", syncBranchFields),
);
showStep(1, false);
function setError(message) {
  formStatus.className = "status-error";
  formStatus.textContent = message;
  formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateCurrentStep()) return;
  const artworkType = getArtworkType(),
    mediums = Array.from(
      document.querySelectorAll('input[name="medium"]:checked'),
    ),
    files = Array.from(fileInput.files);
  if (artworkType === "Traditional" && !mediums.length) {
    setError("Please choose at least one medium, or select “Artist’s choice.”");
    return;
  }
  if (files.length > 5 || files.some((file) => file.size > 5 * 1024 * 1024)) {
    setError("Please upload no more than 5 images, each under 5MB.");
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = "Preparing your request…";
  formStatus.className = "";
  formStatus.textContent = "";
  try {
    const uploadedImageUrls = [];
    for (const file of files) {
      submitBtn.textContent = `Uploading ${uploadedImageUrls.length + 1} of ${files.length}…`;
      const ext = (file.name.split(".").pop() || "jpg")
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase(),
        name = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabaseClient.storage
        .from("reference-images")
        .upload(name, file);
      if (error) throw new Error(`File upload failed: ${error.message}`);
      const { data } = supabaseClient.storage
        .from("reference-images")
        .getPublicUrl(name);
      if (data?.publicUrl) uploadedImageUrls.push(data.publicUrl);
    }
    let size =
      artworkType === "Traditional"
        ? document.querySelector('input[name="size"]:checked')?.value
        : null;
    if (size === "Other")
      size = `Other: ${document.getElementById("size-other-text").value.trim() || "Custom size"}`;
    let paymentMethod = document.querySelector(
      'input[name="payment_method"]:checked',
    )?.value;
    if (paymentMethod === "Other")
      paymentMethod = `Other: ${document.getElementById("payment-other-text").value.trim() || "To discuss"}`;
    let aspectRatio =
      artworkType === "Digital"
        ? document.querySelector('input[name="aspect_ratio"]:checked')?.value
        : null;
    if (aspectRatio === "Other")
      aspectRatio = `Other: ${document.getElementById("aspect-other-text").value.trim() || "Custom ratio"}`;
    const email = document.getElementById("email").value.trim();
    submitBtn.textContent = "Sending your request…";
    const { error } = await supabaseClient.from("commissions").insert([
      {
        email,
        phone_number: document.getElementById("phone").value.trim() || null,
        artwork_type: artworkType,
        medium:
          artworkType === "Traditional"
            ? mediums.map((item) => item.value).join(", ")
            : null,
        size,
        aspect_ratio: aspectRatio,
        prefered_file_type:
          artworkType === "Digital"
            ? document.querySelector('input[name="prefered_file_type"]:checked')?.value
            : null,
        description: document.getElementById("description").value.trim(),
        style_preference:
          document.getElementById("style_preference").value.trim() || null,
        reference_images: uploadedImageUrls,
        deadline: document.getElementById("deadline").value || null,
        deadline_flexibility: document.querySelector(
          'input[name="deadline_flexibility"]:checked',
        )?.value,
        payment_method: paymentMethod,
        additional_comment:
          document.getElementById("additional_comment").value.trim() || null,
      },
    ]);
    if (error) throw error;
    const reference = `REV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    document.getElementById("success-reference").textContent =
      `Confirmation ${reference}`;
    form.reset();
    showStep(1, false);
    selectedFiles = [];
    renderSelectedFiles();
    formCard.hidden = true;
    successPanel.classList.add("is-visible");
    successPanel.focus();
    successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    console.error("Submission error:", error);
    setError(error.message || "Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send commission request →";
  }
});
document.getElementById("another-request").addEventListener("click", () => {
  successPanel.classList.remove("is-visible");
  formCard.hidden = false;
  showStep(1, false);
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
});
