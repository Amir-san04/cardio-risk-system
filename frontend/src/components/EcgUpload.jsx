import { useState } from "react";
import axios from "axios";

export default function EcgUpload({ examinationId, token, onResult }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setDone(false);
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
      setDone(true);
      if (onResult) onResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Ошибка при анализе ЭКГ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Drop zone */}
      <label style={{ display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', width:'100%', minHeight:'120px',
        border:`2px dashed ${file ? '#1a6bb5' : '#e2e8f0'}`,
        borderRadius:'12px', cursor:'pointer', transition:'all 0.2s',
        background: file ? '#eff6ff' : '#f8fafc', boxSizing:'border-box' }}>
        <input type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
        {preview ? (
          <img src={preview} alt="ЭКГ"
            style={{ maxHeight:'100px', maxWidth:'100%', objectFit:'contain', borderRadius:'8px' }} />
        ) : (
          <>
            <span style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>🫀</span>
            <span style={{ fontSize:'0.85rem', color:'#64748b', fontWeight:500 }}>
              Нажмите чтобы выбрать ЭКГ-изображение
            </span>
            <span style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:'0.25rem' }}>PNG, JPG до 10 МБ</span>
          </>
        )}
      </label>

      {file && (
        <div style={{ marginTop:'0.75rem', fontSize:'0.8rem', color:'#64748b',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>📎 {file.name}</span>
          <button onClick={() => { setFile(null); setPreview(null); setDone(false); }}
            style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'0.85rem' }}>
            ✕ Убрать
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop:'0.75rem', background:'#fef2f2', border:'1px solid #fecaca',
          borderRadius:'10px', padding:'0.75rem', color:'#dc2626', fontSize:'0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {done && (
        <div style={{ marginTop:'0.75rem', background:'#f0fdf4', border:'1px solid #bbf7d0',
          borderRadius:'10px', padding:'0.75rem', color:'#16a34a', fontSize:'0.85rem' }}>
          ✅ Анализ выполнен — результат отображён справа
        </div>
      )}

      <button onClick={handleUpload} disabled={!file || loading}
        style={{ width:'100%', marginTop:'1rem', padding:'0.8rem', borderRadius:'10px', border:'none',
          background: (!file||loading) ? '#cbd5e1' : 'linear-gradient(135deg,#1a6bb5,#0d7f8f)',
          color:'white', fontSize:'0.9rem', fontWeight:600,
          cursor: (!file||loading) ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
        {loading ? '⏳ Анализируем ЭКГ...' : '🫀 Запустить анализ ЭКГ'}
      </button>
    </div>
  );
}
