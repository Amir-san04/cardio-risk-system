import { useState } from "react";
import { predictRisk } from "../services/api"; // API для отправки данных
import RiskResultCard from "../components/RiskResultCard"; // Компонент для отображения результата

export default function RiskAssessment() {

  // Состояние формы
  const [form, setForm] = useState({
    age: "",
    sex: "",
    cholesterol: "",
    fbs: "",
    restecg: ""
  });

  // Состояния результата и загрузки
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // Отправка данных на ML API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        age: Number(form.age),
        sex: Number(form.sex),
        cholesterol: Number(form.cholesterol),
        fbs: Number(form.fbs),
        restecg: Number(form.restecg)
      };

      const res = await predictRisk(data);
      setResult(res);

    } catch (error) {
      console.error(error);
      alert("Ошибка ML сервиса");
    }

    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded shadow mt-8">
      <h2 className="text-lg font-semibold mb-4">AI Risk Assessment</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <input
          name="age"
          placeholder="Возраст"
          className="border p-2 rounded"
          value={form.age}
          onChange={handleChange}
        />

        <select
          name="sex"
          className="border p-2 rounded"
          value={form.sex}
          onChange={handleChange}
        >
          <option value="">Пол</option>
          <option value="1">Мужчина</option>
          <option value="0">Женщина</option>
        </select>

        <input
          name="cholesterol"
          placeholder="Холестерин"
          className="border p-2 rounded"
          value={form.cholesterol}
          onChange={handleChange}
        />

        <input
          name="fbs"
          placeholder="Глюкоза"
          className="border p-2 rounded"
          value={form.fbs}
          onChange={handleChange}
        />

        <input
          name="restecg"
          placeholder="ECG"
          className="border p-2 rounded"
          value={form.restecg}
          onChange={handleChange}
        />

        <button
          type="submit"
          className="col-span-2 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          {loading ? "Загрузка..." : "Рассчитать риск"}
        </button>
      </form>

      {/* Показываем результат через компонент */}
      {result && <RiskResultCard result={result} />}
    </div>
  );
}