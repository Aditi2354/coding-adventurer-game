// src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",   // 👈 ONLY plain string
  withCredentials: true,
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

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

export default api;
