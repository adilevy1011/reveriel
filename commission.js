const SUPABASE_URL = "https://gvooqilvlqztifzpwaew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b29xaWx2bHF6dGlmenB3YWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjc2NzIsImV4cCI6MjEwMzcwMzY3Mn0.GWoRsQPa1B0sQIGf-6trhf9WwdxvQREgz25puLbA9_o";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const form = document.getElementById("commission-form"),
  formCard = document.getElementById("form-card"),
  successPanel = document.getElementById("success-panel"),
  submitBtn = document.getElementById("submit-btn"),
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
const sections = document.querySelectorAll("[data-step]"),
  progressItems = document.querySelectorAll("[data-progress]");
const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible)
      progressItems.forEach((item) =>
        item.classList.toggle(
          "is-active",
          item.dataset.progress === visible.target.dataset.step,
        ),
      );
  },
  { rootMargin: "-25% 0px -55%", threshold: [0, 0.25, 0.5] },
);
sections.forEach((section) => observer.observe(section));
function setError(message) {
  formStatus.className = "status-error";
  formStatus.textContent = message;
  formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mediums = Array.from(
      document.querySelectorAll('input[name="medium"]:checked'),
    ),
    files = Array.from(fileInput.files);
  if (!mediums.length) {
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
    let size = document.querySelector('input[name="size"]:checked')?.value;
    if (size === "Other")
      size = `Other: ${document.getElementById("size-other-text").value.trim() || "Custom size"}`;
    let paymentMethod = document.querySelector(
      'input[name="payment_method"]:checked',
    )?.value;
    if (paymentMethod === "Other")
      paymentMethod = `Other: ${document.getElementById("payment-other-text").value.trim() || "To discuss"}`;
    const email = document.getElementById("email").value.trim();
    submitBtn.textContent = "Sending your request…";
    const { error } = await supabaseClient.from("commissions").insert([
      {
        email,
        phone_number: document.getElementById("phone").value.trim() || null,
        artwork_type: document.querySelector(
          'input[name="artwork_type"]:checked',
        )?.value,
        medium: mediums.map((item) => item.value).join(", "),
        size,
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
    document.getElementById("success-email").textContent = email;
    document.getElementById("success-reference").textContent =
      `Confirmation ${reference}`;
    form.reset();
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
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
});
