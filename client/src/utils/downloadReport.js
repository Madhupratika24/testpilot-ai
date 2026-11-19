import api from "../services/api";

// When a file download fails, the error message arrives as a Blob, so read it
async function readError(err) {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed.message) return parsed.message;
    } catch {
      // ignore and use the default message
    }
  }
  return data?.message || "Could not create the report. Is the server running?";
}

export async function downloadReport(id, name = "analysis") {
  let res;
  try {
    res = await api.get(`/reports/${id}/pdf`, { responseType: "blob", timeout: 120000 });
  } catch (err) {
    throw new Error(await readError(err));
  }

  const safe = String(name).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60) || "analysis";
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `testpilot-report-${safe}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}