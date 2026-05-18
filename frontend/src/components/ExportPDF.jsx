import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ExportPDF({ prediction, examination, patientName }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    if (!prediction) return;
    setLoading(true);

    try {
      const riskScore = Math.round((prediction.risk_score || 0) * 100);
      const riskLevel = prediction.risk_level?.toLowerCase();
      const riskColors = { high:'#dc2626', medium:'#d97706', low:'#16a34a' };
      const riskLabels = { high:'ВЫСОКИЙ', medium:'СРЕДНИЙ', low:'НИЗКИЙ' };
      const riskColor = riskColors[riskLevel] || '#16a34a';
      const riskLabel = riskLabels[riskLevel] || '—';
      const now = new Date().toLocaleDateString('ru-RU', {
        day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
      });

      // Создаём временный div для рендеринга
      const div = document.createElement('div');
      div.style.cssText = `
        position:fixed; top:-9999px; left:-9999px;
        width:794px; background:white; font-family:'DM Sans',Arial,sans-serif;
        padding:0; margin:0; color:#0f172a;
      `;

      const recs = prediction.explanation?.recommendations || [];
      const impacts = prediction.explanation?.feature_impacts || [];
      const ecgClass = prediction.explanation?.ecg_class;
      const abnormalProb = prediction.explanation?.abnormal_prob;

      div.innerHTML = `
        <div style="width:794px;background:white;font-family:Arial,sans-serif;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0f4c81,#0d7f8f);padding:28px 40px;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:26px;font-weight:700;margin-bottom:4px;">CardioRisk</div>
                <div style="font-size:12px;opacity:0.85;">Система прогнозирования кардиоваскулярного риска</div>
              </div>
              <div style="text-align:right;font-size:11px;opacity:0.75;">
                <div>Дата: ${now}</div>
                <div>ID обследования: #${examination?.id || '—'}</div>
              </div>
            </div>
          </div>

          <div style="padding:32px 40px;">
            <!-- Заголовок -->
            <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #e2e8f0;">
              Заключение по результатам обследования
            </div>

            <!-- Инфо о пациенте -->
            <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0;">
              <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
                Информация о пациенте
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <div style="font-size:11px;color:#64748b;margin-bottom:2px;">ФИО пациента</div>
                  <div style="font-size:14px;font-weight:600;">${patientName || 'Не указано'}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:#64748b;margin-bottom:2px;">Тип обследования</div>
                  <div style="font-size:14px;font-weight:600;">${examination?.exam_type || 'General Checkup'}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:#64748b;margin-bottom:2px;">ID обследования</div>
                  <div style="font-size:14px;font-weight:600;">#${examination?.id || '—'}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:#64748b;margin-bottom:2px;">Дата обследования</div>
                  <div style="font-size:14px;font-weight:600;">${examination?.exam_date ? new Date(examination.exam_date).toLocaleDateString('ru-RU') : '—'}</div>
                </div>
              </div>
            </div>

            <!-- Результат риска -->
            <div style="background:${riskColor};border-radius:12px;padding:24px;margin-bottom:24px;color:white;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                    Итоговая вероятность ССЗ
                  </div>
                  <div style="font-size:52px;font-weight:800;line-height:1;">${riskScore}%</div>
                </div>
                <div style="text-align:right;">
                  <div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:8px 20px;font-size:18px;font-weight:700;margin-bottom:8px;">
                    ${riskLabel} РИСК
                  </div>
                  <div style="font-size:11px;opacity:0.8;">Модель: ${prediction.ml_model_version || 'v1.0'}</div>
                </div>
              </div>
              <!-- Progress bar -->
              <div style="margin-top:16px;background:rgba(255,255,255,0.25);border-radius:4px;height:6px;">
                <div style="background:white;border-radius:4px;height:6px;width:${riskScore}%;"></div>
              </div>
            </div>

            ${ecgClass ? `
            <!-- ЭКГ результат -->
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;margin-bottom:24px;">
              <div style="font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
                Результат анализа ЭКГ (CNN — EfficientNet-B0)
              </div>
              <div style="display:flex;gap:32px;">
                <div>
                  <div style="font-size:11px;color:#64748b;">Класс ЭКГ</div>
                  <div style="font-size:16px;font-weight:700;color:#7c3aed;">${ecgClass}</div>
                </div>
                <div>
                  <div style="font-size:11px;color:#64748b;">Вероятность патологии</div>
                  <div style="font-size:16px;font-weight:700;color:#7c3aed;">${((abnormalProb || 0)*100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
            ` : ''}

            ${recs.length > 0 ? `
            <!-- Рекомендации -->
            <div style="margin-bottom:24px;">
              <div style="font-size:15px;font-weight:700;margin-bottom:12px;color:#0f172a;">
                Клинические рекомендации
              </div>
              ${recs.map(r => `
                <div style="display:flex;gap:10px;margin-bottom:8px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid ${riskColor};">
                  <span style="color:${riskColor};font-weight:700;">•</span>
                  <span style="font-size:13px;color:#374151;">${r}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${impacts.length > 0 ? `
            <!-- Влияние факторов -->
            <div style="margin-bottom:24px;">
              <div style="font-size:15px;font-weight:700;margin-bottom:12px;color:#0f172a;">
                Влияние клинических факторов
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-radius:6px 0 0 6px;">Признак</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">Значение</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;">Влияние</th>
                    <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-radius:0 6px 6px 0;">Направление</th>
                  </tr>
                </thead>
                <tbody>
                  ${impacts.slice(0,8).map((item,i) => `
                    <tr style="background:${i%2===0?'white':'#f8fafc'};">
                      <td style="padding:8px 12px;font-weight:600;text-transform:uppercase;font-size:11px;">${item.feature}</td>
                      <td style="padding:8px 12px;color:#374151;">${item.value}</td>
                      <td style="padding:8px 12px;color:#374151;">${Math.abs(item.impact||0).toFixed(2)}</td>
                      <td style="padding:8px 12px;font-weight:700;color:${(item.impact||0)>0?'#dc2626':'#16a34a'};">
                        ${(item.impact||0)>0?'↑ Повышает риск':'↓ Снижает риск'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            <!-- Дисклеймер -->
            <div style="background:#f8fafc;border-radius:8px;padding:14px;border:1px solid #e2e8f0;">
              <div style="font-size:10px;color:#94a3b8;line-height:1.6;font-style:italic;">
                Данное заключение сформировано автоматически системой CardioRisk на основе алгоритмов машинного обучения.
                Результаты предназначены для поддержки принятия клинических решений и не являются окончательным медицинским диагнозом.
                Для постановки диагноза необходима консультация квалифицированного врача-кардиолога.
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#0f4c81;padding:12px 40px;color:rgba(255,255,255,0.8);font-size:10px;display:flex;justify-content:space-between;">
            <span>CardioRisk — Система прогнозирования кардиоваскулярного риска</span>
            <span>ID: ${examination?.id || '—'} · ${now}</span>
          </div>
        </div>
      `;

      document.body.appendChild(div);

      const canvas = await html2canvas(div, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
      });

      document.body.removeChild(div);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

      const filename = `CardioRisk_${(patientName||'Patient').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);

    } catch (err) {
      console.error('PDF error:', err);
      alert('Ошибка при создании PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={generatePDF} disabled={!prediction || loading}
      style={{ display:'flex', alignItems:'center', gap:'0.5rem',
        padding:'0.65rem 1.25rem', borderRadius:'10px', border:'none',
        background: !prediction ? '#e2e8f0' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
        color: !prediction ? '#94a3b8' : 'white',
        fontSize:'0.875rem', fontWeight:600, cursor: !prediction ? 'not-allowed' : 'pointer',
        fontFamily:'inherit', boxShadow: prediction ? '0 4px 12px rgba(220,38,38,0.25)' : 'none' }}>
      {loading ? '⏳' : '📄'} {loading ? 'Формируем PDF...' : 'Скачать PDF'}
    </button>
  );
}
