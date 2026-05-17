import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os, shutil
from pathlib import Path

# === Настройки ===
CSV_FILE = "ecg_raw/MIT-BIH Arrhythmia Database.csv"
OUTPUT_DIR = "ecg_dataset"
VAL_RATIO = 0.2
IMG_SIZE = (2.24, 2.24)  # 224x224 px при dpi=100
DPI = 100

# === Очистка и создание папок ===
if os.path.exists(OUTPUT_DIR):
    shutil.rmtree(OUTPUT_DIR)

for split in ["train", "val"]:
    for cls in ["Normal", "Abnormal"]:
        Path(f"{OUTPUT_DIR}/{split}/{cls}").mkdir(parents=True, exist_ok=True)

print("Читаю CSV...")
df = pd.read_csv(CSV_FILE)
print(f"Всего записей: {len(df)}, колонки type: {df['type'].value_counts().to_dict()}")

# Морфологические колонки (числовые признаки сигнала)
morph_cols_0 = [c for c in df.columns if c.startswith("0_qrs_morph") or
                c in ["0_pre-RR","0_post-RR","0_pPeak","0_tPeak",
                      "0_rPeak","0_sPeak","0_qPeak"]]
morph_cols_1 = [c for c in df.columns if c.startswith("1_qrs_morph") or
                c in ["1_pre-RR","1_post-RR","1_pPeak","1_tPeak",
                      "1_rPeak","1_sPeak","1_qPeak"]]

def make_ecg_signal(row):
    """Строим синтетический ЭКГ-сигнал из признаков одного удара."""
    t = np.linspace(0, 1, 300)
    signal = np.zeros(300)

    # Базовая синусоида (изолиния)
    signal += 0.02 * np.sin(2 * np.pi * 2 * t)

    # P-волна
    p = float(row.get("0_pPeak", 0.05))
    signal += p * np.exp(-((t - 0.2) ** 2) / (2 * 0.005))

    # Q-зубец
    q = float(row.get("0_qPeak", -0.03))
    signal += q * np.exp(-((t - 0.42) ** 2) / (2 * 0.001))

    # R-пик
    r = float(row.get("0_rPeak", 1.0))
    signal += r * np.exp(-((t - 0.45) ** 2) / (2 * 0.001))

    # S-зубец
    s = float(row.get("0_sPeak", -0.15))
    signal += s * np.exp(-((t - 0.48) ** 2) / (2 * 0.001))

    # T-волна
    tv = float(row.get("0_tPeak", -0.1))
    signal += tv * np.exp(-((t - 0.65) ** 2) / (2 * 0.008))

    # Морфология QRS (добавляем шум от реальных данных)
    for col in morph_cols_0[:5]:
        v = float(row.get(col, 0))
        signal += v * 0.1 * np.sin(2 * np.pi * np.random.randint(3,8) * t + np.random.rand())

    return t, signal

def save_ecg_image(row, filepath):
    t, signal = make_ecg_signal(row)

    fig, ax = plt.subplots(figsize=IMG_SIZE, dpi=DPI)
    ax.plot(t, signal, color='black', linewidth=0.8)

    # Сетка как на настоящей ЭКГ-бумаге
    ax.set_facecolor('#fff8f0')
    ax.grid(True, which='major', color='#ff9999', linewidth=0.4, alpha=0.7)
    ax.grid(True, which='minor', color='#ffcccc', linewidth=0.2, alpha=0.5)
    ax.minorticks_on()
    ax.set_xlim(0, 1)
    ax.set_xticks([])
    ax.set_yticks([])

    for spine in ax.spines.values():
        spine.set_visible(False)

    plt.tight_layout(pad=0)
    plt.savefig(filepath, dpi=DPI, bbox_inches='tight', pad_inches=0)
    plt.close()

# === Генерация изображений ===
normal_rows   = df[df['type'] == 'N'].reset_index(drop=True)
abnormal_rows = df[df['type'] != 'N'].reset_index(drop=True)

# Ограничим до 500 на класс для скорости
normal_rows   = normal_rows.iloc[:500]
abnormal_rows = abnormal_rows.iloc[:500]

print(f"\nNormal: {len(normal_rows)}, Abnormal: {len(abnormal_rows)}")
print("Генерирую изображения...\n")

for label, rows, cls in [
    ("Normal",   normal_rows,   "Normal"),
    ("Abnormal", abnormal_rows, "Abnormal")
]:
    n_val = int(len(rows) * VAL_RATIO)
    for i, (_, row) in enumerate(rows.iterrows()):
        split = "val" if i < n_val else "train"
        path = f"{OUTPUT_DIR}/{split}/{cls}/{cls}_{i:04d}.png"
        save_ecg_image(row, path)
        if (i + 1) % 50 == 0:
            print(f"  {cls}: {i+1}/{len(rows)}")

# === Итог ===
print("\n✅ Готово! Структура датасета:")
for split in ["train", "val"]:
    for cls in ["Normal", "Abnormal"]:
        count = len(list(Path(f"{OUTPUT_DIR}/{split}/{cls}").glob("*.png")))
        print(f"  {split}/{cls}: {count} изображений")
