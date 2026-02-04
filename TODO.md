# Roadmap & Checklist Triển Khai Hệ Thống (Production)

Tài liệu này liệt kê chi tiết các công việc cần thực hiện để chuyển đổi từ Prototype sang hệ thống thực tế với Python Backend, ML Model và InfluxDB.

## 1. Kiến Trúc & Docker (Infrastructure)
- [ ] **Tái cấu trúc thư mục:**
  - `frontend/`: Chứa code React hiện tại.
  - `backend/`: Chứa FastAPI server.
  - `influxdb/`: Chứa cấu hình data volume.
- [ ] **Dockerize:**
  - Tạo `backend/Dockerfile` (Python 3.9+, cài pandas, fastapi, scikit-learn/lightgbm).
  - Tạo `frontend/Dockerfile` (Build React app và serve bằng Nginx).
- [ ] **Orchestration:**
  - Tạo `docker-compose.yml` tại root để chạy đồng thời 3 service: `frontend`, `backend`, `influxdb`.

## 2. Tích Hợp Model (AI/ML)
*Đây là bước "cấy" model vào hệ thống backend.*

- [ ] **Chuẩn bị Model:**
  - **Định dạng:** Export model đã train sang file **`.pkl`** (Pickle) hoặc **`.joblib`**.
  - **Lưu ý:** Không sử dụng file `.ipynb` (Jupyter Notebook) trực tiếp trên production server.
- [ ] **Vị trí lưu trữ:**
  - Đặt file model vào thư mục: `backend/models/` (Ví dụ: `backend/models/lgbm_v1.pkl`).
- [ ] **Logic gọi Model (Inference wrapper):**
  - Tạo file script `backend/models/predictor.py`.
  - Viết class (ví dụ: `RPSEstimator`) để load file `.pkl` khi khởi động server.
  - Viết hàm `predict(dataframe)` bên trong class để nhận dữ liệu và trả về kết quả.
  - **Luồng gọi:** Backend API sẽ import và gọi class này khi nhận file upload. Frontend **tuyệt đối không** import hay gọi trực tiếp model.

## 3. Database (InfluxDB)
- [ ] **Cấu hình:**
  - Thiết lập InfluxDB v2 trong `docker-compose`.
  - Tạo Bucket tên `scaleops_metrics`.
- [ ] **Bảo mật:**
  - Tạo Organization và API Token.
  - Lưu Token vào file `.env` để Backend sử dụng (Không hardcode trong code).
- [ ] **Schema:**
  - Measurement: `inference_metrics`
  - Fields: `actual_rps`, `predicted_rps_model1`, `predicted_rps_model2`
  - Tags: `filename`, `version`

## 4. Backend Development (FastAPI)
- [ ] **API Upload (`POST /api/upload`):**
  - Input: Nhận file `.parquet` (hoặc `.csv`) từ Frontend `StatsGrid`.
  - Process: Dùng `pandas` đọc file -> Gọi `predictor.predict(df)`.
  - Output: Ghi kết quả (Timestamp + Actual + Predicted) vào InfluxDB.
- [ ] **API History (`GET /api/history`):**
  - Input: Tham số `range` (1h, 6h, 24h).
  - Process: Query InfluxDB (Flux query) để lấy dữ liệu tổng hợp.
  - Output: Trả về JSON list `ChartDataPoint[]`.
- [ ] **Real-time (`WebSocket /ws/live`):**
  - Thiết lập WebSocket endpoint.
  - Định kỳ query InfluxDB (polling) hoặc nhận stream dữ liệu mới nhất và push xuống Frontend mỗi 1-2 giây.

## 5. Frontend Integration (React)
- [ ] **`components/StatsGrid.tsx`:**
  - Đảm bảo URL trong hàm `fetch('/api/upload', ...)` trỏ đúng về địa chỉ Backend (qua Proxy hoặc URL tuyệt đối).
- [ ] **`App.tsx`:**
  - Xóa bỏ dữ liệu giả (`INITIAL_DATA`, `generateHistoricalData`).
  - Thay thế `setInterval` bằng kết nối WebSocket tới `/ws/live`.
  - Gọi API `GET /api/history` khi người dùng chuyển tab (1H/6H/24H).
- [ ] **Xử lý lỗi:**
  - Hiển thị thông báo nếu Backend offline hoặc Upload thất bại.