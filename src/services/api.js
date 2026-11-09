import axios from "axios";

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL, timeout: 30000 });

// Apps Script cannot answer CORS preflights, so POST bodies go as text/plain (a "simple" request)
// and the token travels in the body / query string instead of an Authorization header.
export async function request(method, path, { data = {}, token, params = {} } = {}) {
  let res;
  try {
    res = method === "get"
      ? await http.get("", { params: { path, token, ...params } })
      : await http.post("", JSON.stringify({ ...data, token }), { params: { path }, headers: { "Content-Type": "text/plain;charset=utf-8" } });
  } catch (err) {
    console.error(`API failure | ${err.message} | status=${err.response?.status} | base=${http.defaults.baseURL}`);
    throw Object.assign(new Error("Cannot reach the server. Check your connection."), { code: "NETWORK" });
  }
  if (!res.data?.success) {
    const e = res.data?.error || {};
    throw Object.assign(new Error(e.message || "Request failed"), { code: e.code || "UNKNOWN", fields: e.fields });
  }
  return res.data.data;
}
