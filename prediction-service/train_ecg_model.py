import torch
import torch.nn as nn
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from pathlib import Path
import os

DATASET_DIR = "ecg_dataset"
MODEL_DIR   = "models"
EPOCHS      = 10
BATCH       = 16
IMG_SIZE    = 224
LR          = 1e-4

Path(MODEL_DIR).mkdir(exist_ok=True)

transform_train = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(5),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])
transform_val = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

train_data = datasets.ImageFolder(f"{DATASET_DIR}/train", transform=transform_train)
val_data   = datasets.ImageFolder(f"{DATASET_DIR}/val",   transform=transform_val)

train_loader = DataLoader(train_data, batch_size=BATCH, shuffle=True)
val_loader   = DataLoader(val_data,   batch_size=BATCH)

print(f"Классы: {train_data.classes}")
print(f"Train: {len(train_data)}, Val: {len(val_data)}")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Устройство: {device}\n")

model = models.efficientnet_b0(weights="IMAGENET1K_V1")
model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)
model = model.to(device)

optimizer = torch.optim.Adam(model.parameters(), lr=LR)
scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=4, gamma=0.5)
criterion = nn.CrossEntropyLoss()

best_acc = 0.0

for epoch in range(EPOCHS):
    # Train
    model.train()
    train_loss = 0
    for imgs, labels in train_loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        loss = criterion(model(imgs), labels)
        loss.backward()
        optimizer.step()
        train_loss += loss.item()

    # Val
    model.eval()
    correct = total = 0
    with torch.no_grad():
        for imgs, labels in val_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            preds = model(imgs).argmax(dim=1)
            correct += (preds == labels).sum().item()
            total   += labels.size(0)

    acc = correct / total
    scheduler.step()
    print(f"Epoch {epoch+1:02d}/{EPOCHS} | loss: {train_loss/len(train_loader):.4f} | val_acc: {acc:.4f}")

    if acc > best_acc:
        best_acc = acc
        torch.save(model.state_dict(), f"{MODEL_DIR}/ecg_model.pt")
        print(f"  ✅ Лучшая модель сохранена (val_acc={acc:.4f})")

print(f"\n🎉 Обучение завершено! Лучшая точность: {best_acc:.4f}")
print(f"Модель: {MODEL_DIR}/ecg_model.pt")
