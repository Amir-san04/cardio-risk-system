"""
MinIO Storage Module
Модуль для работы с S3-совместимым хранилищем MinIO
"""

from minio import Minio
from minio.error import S3Error
import os
from typing import Optional
from datetime import timedelta


class MinIOStorage:
    """Класс для работы с MinIO хранилищем"""
    
    def __init__(self):
        """Инициализация MinIO клиента из переменных окружения"""
        self.endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
        self.bucket_name = os.getenv("MINIO_BUCKET", "medical-files")
        self.secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
        
        # Создаём клиента
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )
        
        # Создаём бакет если его нет
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Создаёт бакет если его ещё нет"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                print(f"✅ Bucket '{self.bucket_name}' created successfully")
            else:
                print(f"✅ Bucket '{self.bucket_name}' already exists")
        except S3Error as e:
            print(f"❌ Error creating bucket: {e}")
    
    def upload_file(self, file_path: str, object_name: Optional[str] = None) -> Optional[str]:
        """
        Загружает файл в MinIO
        
        Args:
            file_path: Путь к локальному файлу
            object_name: Имя объекта в MinIO (если None, используется имя файла)
            
        Returns:
            str: URL загруженного файла или None при ошибке
        """
        try:
            if object_name is None:
                object_name = os.path.basename(file_path)
            
            # Определяем content type
            content_type = self._get_content_type(file_path)
            
            # Загружаем файл
            self.client.fput_object(
                self.bucket_name,
                object_name,
                file_path,
                content_type=content_type
            )
            
            # Формируем URL
            url = f"s3://{self.bucket_name}/{object_name}"
            print(f"✅ File uploaded: {url}")
            
            return url
        
        except S3Error as e:
            print(f"❌ Error uploading file: {e}")
            return None
    
    def upload_bytes(self, data: bytes, object_name: str, content_type: str = "application/octet-stream") -> Optional[str]:
        """
        Загружает данные из памяти в MinIO
        
        Args:
            data: Данные в виде bytes
            object_name: Имя объекта в MinIO
            content_type: MIME тип данных
            
        Returns:
            str: URL загруженного объекта или None при ошибке
        """
        try:
            from io import BytesIO
            
            data_stream = BytesIO(data)
            
            self.client.put_object(
                self.bucket_name,
                object_name,
                data_stream,
                length=len(data),
                content_type=content_type
            )
            
            url = f"s3://{self.bucket_name}/{object_name}"
            print(f"✅ Data uploaded: {url}")
            
            return url
        
        except S3Error as e:
            print(f"❌ Error uploading data: {e}")
            return None
    
    def download_file(self, object_name: str, file_path: str) -> bool:
        """
        Скачивает файл из MinIO
        
        Args:
            object_name: Имя объекта в MinIO
            file_path: Путь куда сохранить файл
            
        Returns:
            bool: True если успешно
        """
        try:
            self.client.fget_object(
                self.bucket_name,
                object_name,
                file_path
            )
            print(f"✅ File downloaded: {file_path}")
            return True
        
        except S3Error as e:
            print(f"❌ Error downloading file: {e}")
            return False
    
    def get_presigned_url(self, object_name: str, expires: timedelta = timedelta(hours=1)) -> Optional[str]:
        """
        Получает временную ссылку для скачивания файла
        
        Args:
            object_name: Имя объекта в MinIO
            expires: Время жизни ссылки
            
        Returns:
            str: Временная URL или None при ошибке
        """
        try:
            url = self.client.presigned_get_object(
                self.bucket_name,
                object_name,
                expires=expires
            )
            return url
        
        except S3Error as e:
            print(f"❌ Error generating presigned URL: {e}")
            return None
    
    def delete_file(self, object_name: str) -> bool:
        """
        Удаляет файл из MinIO
        
        Args:
            object_name: Имя объекта в MinIO
            
        Returns:
            bool: True если успешно
        """
        try:
            self.client.remove_object(self.bucket_name, object_name)
            print(f"✅ File deleted: {object_name}")
            return True
        
        except S3Error as e:
            print(f"❌ Error deleting file: {e}")
            return False
    
    def list_files(self, prefix: str = "") -> list:
        """
        Список файлов в бакете
        
        Args:
            prefix: Префикс для фильтрации
            
        Returns:
            list: Список имён файлов
        """
        try:
            objects = self.client.list_objects(self.bucket_name, prefix=prefix)
            return [obj.object_name for obj in objects]
        
        except S3Error as e:
            print(f"❌ Error listing files: {e}")
            return []
    
    def _get_content_type(self, file_path: str) -> str:
        """Определяет MIME тип файла"""
        extension = os.path.splitext(file_path)[1].lower()
        
        content_types = {
            '.dcm': 'application/dicom',
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.txt': 'text/plain',
            '.json': 'application/json'
        }
        
        return content_types.get(extension, 'application/octet-stream')


# Singleton instance
_storage_instance = None

def get_storage() -> MinIOStorage:
    """Получить singleton instance MinIO хранилища"""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = MinIOStorage()
    return _storage_instance


# Пример использования
if __name__ == "__main__":
    storage = get_storage()
    
    # Загрузить файл
    # storage.upload_file("/path/to/file.dcm", "patient123/scan_001.dcm")
    
    # Получить временную ссылку
    # url = storage.get_presigned_url("patient123/scan_001.dcm")
    # print(f"Download URL: {url}")