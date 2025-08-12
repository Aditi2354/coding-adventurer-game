// src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ""
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Reject HTML fallbacks (e.g., serve -s dist returning index.html)
api.interceptors.response.use(
  (resp) => {
    const ct = resp.headers?.["content-type"] || "";
    if (typeof resp.data === "string" && ct.includes("text/html")) {
      return Promise.reject(new Error("Got HTML instead of JSON"));
    }
    return resp;
  },
  (err) => Promise.reject(err)
);
console.log("API:", import.meta.env.VITE_API_URL); // should print http://localhost:5000

export default api;
