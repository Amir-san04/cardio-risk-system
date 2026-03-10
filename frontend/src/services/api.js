import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001"
});

export const predictRisk = async (data) => {
  try {
    const response = await api.post("/predict", data, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (err) {
    console.error("Ошибка при вызове ML API:", err);
    throw err;
  }
};