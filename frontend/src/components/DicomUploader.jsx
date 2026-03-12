// frontend/src/components/DicomUploader.jsx
import { useDropzone } from 'react-dropzone';
import { useState } from 'react';
import { uploadDicom } from '../services/api';

export default function DicomUploader({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedExamId, setSelectedExamId] = useState(''); // можно сделать select с обследованиями

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!selectedExamId) {
      alert('Выберите обследование');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadDicom(selectedExamId, file);
      onUploadSuccess(result);
      alert('DICOM успешно загружен!');
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/dicom': ['.dcm'] },
    multiple: false,
  });

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300">
      <h3 className="text-lg font-medium mb-4">Загрузка DICOM для обследования</h3>

      {/* Здесь можно добавить <select> со списком examination_id */}
      <input
        type="text"
        placeholder="ID обследования"
        value={selectedExamId}
        onChange={(e) => setSelectedExamId(e.target.value)}
        className="mb-4 p-2 border rounded w-full"
      />

      <div
        {...getRootProps()}
        className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <p className="text-indigo-600">Загрузка... {progress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-600">
            Перетащите DICOM-файл (.dcm) сюда или кликните для выбора
          </p>
        )}
      </div>
    </div>
  );
}