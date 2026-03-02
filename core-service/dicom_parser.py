"""
DICOM Parser Module
Модуль для парсинга DICOM файлов и извлечения метаданных
"""

import pydicom
from pydicom.errors import InvalidDicomError
from typing import Dict, Optional
import os


class DICOMParser:
    """Класс для работы с DICOM файлами"""
    
    def __init__(self, file_path: str):
        """
        Инициализация парсера
        
        Args:
            file_path: Путь к DICOM файлу
        """
        self.file_path = file_path
        self.dcm = None
        
    def parse(self) -> Optional[Dict]:
        """
        Парсит DICOM файл и извлекает метаданные
        
        Returns:
            dict: Словарь с метаданными или None если файл невалидный
        """
        try:
            # Читаем DICOM файл
            self.dcm = pydicom.dcmread(self.file_path)
            
            # Извлекаем основные метаданные
            metadata = self._extract_metadata()
            
            return metadata
            
        except InvalidDicomError:
            print(f"Error: {self.file_path} is not a valid DICOM file")
            return None
        except Exception as e:
            print(f"Error parsing DICOM file: {str(e)}")
            return None
    
    def _extract_metadata(self) -> Dict:
        """
        Извлекает метаданные из DICOM файла
        
        Returns:
            dict: Словарь с метаданными
        """
        metadata = {
            # Основная информация о файле
            "file_size_bytes": os.path.getsize(self.file_path),
            "is_valid_dicom": True,
            
            # Информация о пациенте
            "patient_name": self._get_tag("PatientName", "Unknown"),
            "patient_id": self._get_tag("PatientID", "Unknown"),
            "patient_birth_date": self._get_tag("PatientBirthDate", None),
            "patient_sex": self._get_tag("PatientSex", None),
            "patient_age": self._get_tag("PatientAge", None),
            
            # Информация об исследовании
            "study_date": self._get_tag("StudyDate", None),
            "study_time": self._get_tag("StudyTime", None),
            "study_description": self._get_tag("StudyDescription", None),
            "study_instance_uid": self._get_tag("StudyInstanceUID", None),
            
            # Информация о серии
            "series_date": self._get_tag("SeriesDate", None),
            "series_time": self._get_tag("SeriesTime", None),
            "series_description": self._get_tag("SeriesDescription", None),
            "series_number": self._get_tag("SeriesNumber", None),
            "series_instance_uid": self._get_tag("SeriesInstanceUID", None),
            
            # Информация о модальности
            "modality": self._get_tag("Modality", None),  # CT, MR, US, etc.
            "manufacturer": self._get_tag("Manufacturer", None),
            "manufacturer_model": self._get_tag("ManufacturerModelName", None),
            
            # Информация об изображении
            "rows": self._get_tag("Rows", None),
            "columns": self._get_tag("Columns", None),
            "pixel_spacing": self._get_tag("PixelSpacing", None),
            "slice_thickness": self._get_tag("SliceThickness", None),
            "bits_allocated": self._get_tag("BitsAllocated", None),
            "bits_stored": self._get_tag("BitsStored", None),
            
            # Информация об учреждении
            "institution_name": self._get_tag("InstitutionName", None),
            "institution_address": self._get_tag("InstitutionAddress", None),
            
            # Дополнительная техническая информация
            "sop_class_uid": self._get_tag("SOPClassUID", None),
            "sop_instance_uid": self._get_tag("SOPInstanceUID", None),
            "transfer_syntax_uid": self._get_tag("file_meta", "TransferSyntaxUID", None),
            
            # Информация о дозе облучения (если доступно)
            "kvp": self._get_tag("KVP", None),  # Напряжение трубки
            "exposure_time": self._get_tag("ExposureTime", None),
            "xray_tube_current": self._get_tag("XRayTubeCurrent", None),
        }
        
        return metadata
    
    def _get_tag(self, *tags, default=None):
        """
        Безопасное получение значения DICOM тега
        
        Args:
            *tags: Имена тегов для поиска
            default: Значение по умолчанию
            
        Returns:
            Значение тега или default
        """
        try:
            obj = self.dcm
            for tag in tags:
                if hasattr(obj, tag):
                    obj = getattr(obj, tag)
                else:
                    return default
            
            # Конвертируем в строку для JSON сериализации
            return str(obj) if obj is not None else default
        except Exception:
            return default
    
    def get_pixel_array(self):
        """
        Получить массив пикселей изображения
        
        Returns:
            numpy.ndarray: Массив пикселей или None
        """
        try:
            if self.dcm is not None:
                return self.dcm.pixel_array
        except Exception as e:
            print(f"Error getting pixel array: {str(e)}")
        return None
    
    def save_as_png(self, output_path: str) -> bool:
        """
        Сохранить DICOM изображение как PNG
        
        Args:
            output_path: Путь для сохранения PNG файла
            
        Returns:
            bool: True если успешно сохранено
        """
        try:
            from PIL import Image
            import numpy as np
            
            # Получаем массив пикселей
            pixel_array = self.get_pixel_array()
            if pixel_array is None:
                return False
            
            # Нормализуем значения для PNG (0-255)
            pixel_array = pixel_array.astype(float)
            pixel_array = (pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min())
            pixel_array = (pixel_array * 255).astype(np.uint8)
            
            # Сохраняем как PNG
            image = Image.fromarray(pixel_array)
            image.save(output_path)
            
            return True
        except Exception as e:
            print(f"Error saving as PNG: {str(e)}")
            return False


def parse_dicom_file(file_path: str) -> Optional[Dict]:
    """
    Утилита для быстрого парсинга DICOM файла
    
    Args:
        file_path: Путь к DICOM файлу
        
    Returns:
        dict: Метаданные или None
    """
    parser = DICOMParser(file_path)
    return parser.parse()


# Пример использования
if __name__ == "__main__":
    # Тестовый код
    test_file = "/path/to/dicom/file.dcm"
    
    if os.path.exists(test_file):
        metadata = parse_dicom_file(test_file)
        
        if metadata:
            print("DICOM Metadata:")
            print(f"Patient Name: {metadata['patient_name']}")
            print(f"Study Date: {metadata['study_date']}")
            print(f"Modality: {metadata['modality']}")
            print(f"Image Size: {metadata['rows']}x{metadata['columns']}")
        else:
            print("Failed to parse DICOM file")
    else:
        print(f"File not found: {test_file}")