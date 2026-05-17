import { useEffect, useState } from 'react';
import { getModelMetrics } from '../services/api';

const FONT = "'DM Sans', sans-serif";

export default function ModelMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModelMetrics().then(setMetrics).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', fontFamily:FONT }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'40px', height:'40px', border:'3px solid #e2e8f0', borderTopColor:'#1a6bb5',
          borderRadius:'50%', margin:'0 auto', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:'#94a3b8', marginTop:'1rem' }}>Загрузка метрик...</p>
      </div>
    </div>
  );

  const lr = metrics?.logistic_regression;
  const cnn = metrics?.ecg_cnn;

  const MetricCard = ({ label, value, color, hint }) => (
    <div style={{ background:'white', borderRadius:'14px', padding:'1.25rem',
      boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', textAlign:'center' }}>
      <div style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:600,
        textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>{label}</div>
      <div style={{ fontSize:'2rem', fontWeight:800, color }}>{(value * 100).toFixed(1)}%</div>
      {hint && <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginTop:'0.25rem' }}>{hint}</div>}
    </div>
  );

  const cm = lr?.confusion_matrix || [[0,0],[0,0]];
  const tn=cm[0][0], fp=cm[0][1], fn=cm[1][0], tp=cm[1][1];

  return (
    <div style={{ fontFamily:FONT, maxWidth:'960px', margin:'0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, color:'#0f172a', margin:0 }}>Метрики ML-моделей</h1>
        <p style={{ color:'#64748b', margin:'0.25rem 0 0', fontSize:'0.9rem' }}>
          Оценка качества моделей прогнозирования кардиориска
        </p>
      </div>

      {/* Logistic Regression */}
      <div style={{ background:'white', borderRadius:'16px', padding:'1.75rem',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.4rem' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px',
                background:'linear-gradient(135deg,#1a6bb5,#0d7f8f)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>📊</div>
              <h2 style={{ fontSize:'1.1rem', fontWeight:700, color:'#0f172a', margin:0 }}>
                Логистическая регрессия
              </h2>
            </div>
            <p style={{ color:'#64748b', fontSize:'0.85rem', margin:0 }}>
              Датасет: {lr?.dataset} · {lr?.train_samples} обуч. / {lr?.test_samples} тест. · v{lr?.model_version}
            </p>
          </div>
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px',
            padding:'0.4rem 0.875rem', fontSize:'0.8rem', fontWeight:700, color:'#16a34a' }}>
            Production
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
          <MetricCard label="Accuracy" value={lr?.accuracy} color="#1a6bb5" hint="Точность" />
          <MetricCard label="Precision" value={lr?.precision} color="#0d7f8f" hint="Точность положит." />
          <MetricCard label="Recall" value={lr?.recall} color="#7c3aed" hint="Полнота" />
          <MetricCard label="F1 Score" value={lr?.f1_score} color="#d97706" hint="Ср. гармоническое" />
          <MetricCard label="ROC-AUC" value={lr?.roc_auc} color="#dc2626" hint="Площадь под кривой" />
        </div>

        {/* Confusion Matrix */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
          <div>
            <h3 style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151',
              marginBottom:'1rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Матрица ошибок
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
              {[
                { label:'True Negative', value:tn, color:'#16a34a', bg:'#f0fdf4', hint:'Верно: Норма' },
                { label:'False Positive', value:fp, color:'#dc2626', bg:'#fef2f2', hint:'Ошибка: Ложная тревога' },
                { label:'False Negative', value:fn, color:'#d97706', bg:'#fffbeb', hint:'Ошибка: Пропущен риск' },
                { label:'True Positive', value:tp, color:'#16a34a', bg:'#f0fdf4', hint:'Верно: Риск' },
              ].map((c,i) => (
                <div key={i} style={{ background:c.bg, borderRadius:'10px', padding:'1rem', textAlign:'center' }}>
                  <div style={{ fontSize:'1.75rem', fontWeight:800, color:c.color }}>{c.value}</div>
                  <div style={{ fontSize:'0.72rem', color:'#64748b', marginTop:'0.25rem' }}>{c.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize:'0.85rem', fontWeight:700, color:'#374151',
              marginBottom:'1rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Признаки модели
            </h3>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
              {(lr?.features || []).map((f,i) => (
                <span key={i} style={{ background:'#eff6ff', color:'#1a6bb5', padding:'0.3rem 0.75rem',
                  borderRadius:'20px', fontSize:'0.78rem', fontWeight:600 }}>
                  {f}
                </span>
              ))}
            </div>
            <div style={{ marginTop:'1rem', padding:'0.875rem', background:'#f8fafc',
              borderRadius:'10px', fontSize:'0.8rem', color:'#64748b', lineHeight:1.6 }}>
              Модель обучена на датасете UCI Heart Disease (Cleveland, 303 пациента).
              Использует алгоритм логистической регрессии с предобработкой данных через StandardScaler.
            </div>
          </div>
        </div>
      </div>

      {/* ECG CNN */}
      <div style={{ background:'white', borderRadius:'16px', padding:'1.75rem',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.4rem' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px',
                background:'linear-gradient(135deg,#7c3aed,#db2777)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🫀</div>
              <h2 style={{ fontSize:'1.1rem', fontWeight:700, color:'#0f172a', margin:0 }}>
                CNN — Анализ ЭКГ-изображений
              </h2>
            </div>
            <p style={{ color:'#64748b', fontSize:'0.85rem', margin:0 }}>
              Модель: {cnn?.model} · Датасет: {cnn?.dataset}
            </p>
          </div>
          <div style={{ background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:'10px',
            padding:'0.4rem 0.875rem', fontSize:'0.8rem', fontWeight:700, color:'#7c3aed' }}>
            Deep Learning
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
          <MetricCard label="Val Accuracy" value={cnn?.accuracy} color="#7c3aed" hint="На валидации" />
          <div style={{ background:'white', borderRadius:'14px', padding:'1.25rem',
            boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', textAlign:'center' }}>
            <div style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:600,
              textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Эпох обучения</div>
            <div style={{ fontSize:'2rem', fontWeight:800, color:'#db2777' }}>{cnn?.epochs}</div>
          </div>
          <div style={{ background:'white', borderRadius:'14px', padding:'1.25rem',
            boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', textAlign:'center' }}>
            <div style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:600,
              textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Train / Val</div>
            <div style={{ fontSize:'1.25rem', fontWeight:800, color:'#0d7f8f' }}>
              {cnn?.train_samples}/{cnn?.val_samples}
            </div>
          </div>
          <div style={{ background:'white', borderRadius:'14px', padding:'1.25rem',
            boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9', textAlign:'center' }}>
            <div style={{ fontSize:'0.75rem', color:'#94a3b8', fontWeight:600,
              textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Лучшая эпоха</div>
            <div style={{ fontSize:'2rem', fontWeight:800, color:'#16a34a' }}>{cnn?.best_epoch}</div>
          </div>
        </div>

        <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem' }}>
          {(cnn?.classes || []).map((c,i) => (
            <span key={i} style={{ background:'#faf5ff', color:'#7c3aed', padding:'0.3rem 0.875rem',
              borderRadius:'20px', fontSize:'0.8rem', fontWeight:600 }}>
              {c === 'Normal' ? '✅ ' : '⚠️ '}{c}
            </span>
          ))}
        </div>

        <div style={{ padding:'0.875rem', background:'#f8fafc', borderRadius:'10px',
          fontSize:'0.8rem', color:'#64748b', lineHeight:1.6 }}>
          Архитектура EfficientNet-B0 дообучена методом transfer learning на изображениях ЭКГ
          из базы MIT-BIH Arrhythmia Database (PhysioNet). Входной размер: 224×224 px.
          Оптимизатор: Adam (lr=1e-4). Loss: CrossEntropyLoss.
        </div>
      </div>
    </div>
  );
}
