async function process() {
  const file = document.getElementById("video").files[0];
  const youtube = document.getElementById("youtube").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const format = document.getElementById("format").value;

  const formData = new FormData();
  if (file) formData.append("video", file);
  formData.append("youtube", youtube);
  formData.append("start", start);
  formData.append("end", end);
  formData.append("format", format);

  const res = await fetch("/process", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  document.getElementById("preview").src = data.url;
  const download = document.getElementById("download");
  download.href = data.url;
  download.hidden = false;
}