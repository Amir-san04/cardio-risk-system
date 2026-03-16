import { useState, useEffect } from 'react';
import { getPatients, createExamination } from '../services/api'; // Используем функции из твоего api.js

export default function CreateExaminationModal({ isOpen, onClose, onCreated }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    exam_type: 'General Checkup',
    complaints: ''
  });

  useEffect(() => {
    if (isOpen) {
      const fetchPatients = async () => {
        try {
          const response = await getPatients();
          // В main.py GET /patients возвращает объект {"total": X, "patients": [...]}
          setPatients(response.patients || []);
        } catch (err) {
          console.error("Ошибка при загрузке пациентов:", err);
        }
      };
      fetchPatients();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patient_id) return alert("Выберите пациента");

    setLoading(true);
    try {
      // Отправляем данные на бэкенд через твой api.js
      await createExamination({
        patient_id: parseInt(formData.patient_id),
        exam_type: formData.exam_type,
        complaints: formData.complaints
      });
      
      onCreated(); // Обновляем Dashboard
      onClose();   // Закрываем модалку
      setFormData({ patient_id: '', exam_type: 'General Checkup', complaints: '' });
    } catch (err) {
      alert("Ошибка при создании: " + (err.response?.data?.detail || "Сервер недоступен"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Назначить новое обследование</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Пациент</label>
            <select 
  required
  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
  value={formData.patient_id}
  onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
>
  <option value="">-- Выберите пациента --</option>
  {/* Добавляем проверку на существование и массивность данных */}
  {Array.isArray(patients) && patients.length > 0 ? (
    patients.map(p => (
      <option key={p.id} value={p.id}>{p.full_name}</option>
    ))
  ) : (
    <option disabled>Пациенты не найдены</option>
  )}
</select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Тип исследования</label>
            <select 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.exam_type}
              onChange={(e) => setFormData({...formData, exam_type: e.target.value})}
            >
              {/* Список типов должен строго соответствовать валидатору в main.py */}
              <option value="General Checkup">Общий осмотр</option>
              <option value="ECG">ЭКГ</option>
              <option value="Blood Test">Анализ крови</option>
              <option value="MRI Scan">МРТ</option>
              <option value="CT Scan">КТ</option>
              <option value="X-Ray">Рентген</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Жалобы пациента</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              rows="3"
              placeholder="Опишите симптомы..."
              value={formData.complaints}
              onChange={(e) => setFormData({...formData, complaints: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className={`px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-md hover:bg-indigo-700 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}