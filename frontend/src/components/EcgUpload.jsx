import { useState } from "react";
import axios from "axios";

export default function EcgUpload({ examinationId, token }) {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        `/api/examinations/${examinationId}/predict-ecg`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Ошибка при анализе ЭКГ");
    } finally {
      setLoading(false);
    }
  };

  const riskConfig = {
    low:    { color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Низкий риск" },
    medium: { color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", label: "Средний риск" },
    high:   { color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Высокий риск" },
  };

  return (
    <div className="mt-6 p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        Анализ ЭКГ (изображение)
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Загрузите PNG или JPG снимок ЭКГ — модель определит наличие патологии
      </p>

      {/* Загрузка файла */}
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
        <span className="text-sm text-gray-500">
          {file ? file.name : "Нажмите чтобы выбрать файл или перетащите"}
        </span>
        <span className="text-xs text-gray-400 mt-1">PNG, JPG до 10 МБ</span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      {/* Превью */}
      {preview && (
        <div className="mt-3">
          <img
            src={preview}
            alt="ЭКГ превью"
            className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
          />
        </div>
      )}

      {/* Кнопка */}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Анализируем ЭКГ..." : "Запустить анализ ЭКГ"}
      </button>

      {/* Ошибка */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Результат */}
      {result && result.explanation && (
        <div className={`mt-4 p-4 border rounded-lg ${riskConfig[result.risk_level]?.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700">Результат анализа</span>
            <span className={`font-bold text-lg ${riskConfig[result.risk_level]?.color}`}>
              {riskConfig[result.risk_level]?.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="bg-white rounded p-2 border border-gray-100">
              <div className="text-gray-500 text-xs">Класс ЭКГ</div>
              <div className="font-medium">{result.explanation.ecg_class}</div>
            </div>
            <div className="bg-white rounded p-2 border border-gray-100">
              <div className="text-gray-500 text-xs">Риск патологии</div>
              <div className="font-medium">
                {((result.explanation.abnormal_prob || result.risk_score) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Рекомендации:</div>
            <ul className="space-y-1">
              {(result.explanation.recommendations || []).map((r, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Модель: {result.ml_model_version}
          </div>
        </div>
      )}
    </div>
  );
}
