const SUPABASE_URL = "https://tfxqlmudtbggbayxsvdf.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmeHFsbXVkdGJnZ2JheXhzdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDMyNDgsImV4cCI6MjA5ODQxOTI0OH0.fZVocSCvXuYwdbKVUwBLsM88a5UzZzx4DTFSXnS3DFU";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const listEl = document.getElementById("testimonial-list");
const formEl = document.getElementById("testimonial-form");
const statusEl = document.getElementById("t-status");
const submitBtn = document.getElementById("t-submit");

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

async function loadTestimonials() {
  const { data, error } = await sb
    .from("testimonials")
    .select("name, review, image_url, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    listEl.innerHTML = "<p>Couldn't load testimonials right now.</p>";
    return;
  }
  if (!data.length) {
    listEl.innerHTML = "<p>No testimonials yet — be the first to leave one!</p>";
    return;
  }

  listEl.innerHTML = data.map(t => `
    <div class="testimonial-card">
      <img src="${t.image_url}" alt="${escapeHtml(t.name)}" class="testimonial-photo">
      <p class="testimonial-text">"${escapeHtml(t.review)}"</p>
      <p class="testimonial-name">— ${escapeHtml(t.name)}</p>
    </div>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (formEl.website.value) return; // honeypot — bots fill hidden fields

  const name = formEl.name.value.trim();
  const review = formEl.review.value.trim();
  const file = formEl.photo.files[0];

  if (!name || !review || !file) {
    statusEl.textContent = "Please fill in all fields and choose a photo.";
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    statusEl.textContent = "Photo must be under 2MB.";
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = "Submitting...";

  try {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from("testimonial-photos")
      .upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = sb.storage
      .from("testimonial-photos")
      .getPublicUrl(fileName);

    const { error: insertError } = await sb
      .from("testimonials")
      .insert({ name, review, image_url: urlData.publicUrl });
    if (insertError) throw insertError;

    statusEl.textContent = "Thank you! Your review has been posted.";
    formEl.reset();
    loadTestimonials();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled = false;
  }
});

loadTestimonials();