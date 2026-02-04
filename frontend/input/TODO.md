# Input Directory (Pending Backend)

Thư mục này được dùng để chứa các file `.parquet` hoặc `.json` do người dùng upload.

## Logic cần thực hiện (Backend):
1.  Khi người dùng upload file từ Frontend, Backend sẽ nhận file và lưu vào đây.
2.  Một background worker (Celery/Redis Queue) sẽ đọc file parquet này.
3.  Worker thực hiện phân tích dữ liệu timestamp và request_count.
4.  Kết quả dự đoán sẽ được đẩy vào Database hoặc Cache để Frontend query.
