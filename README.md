# ScaleOps Dashboard (Frontend Prototype)

Đây là bản mẫu (prototype) Frontend React chất lượng cao (high-fidelity) được thiết kế để giám sát hiệu suất mô hình Machine Learning trong các kịch bản mở rộng quy mô (RPS - Requests Per Second).

## 🚀 Các Tính Năng Chính

### 1. Giám Sát & Điều Khiển Dữ Liệu (`Header`)
Khu vực Header cung cấp bộ công cụ điều khiển luồng dữ liệu linh hoạt:

- **Tự Động Làm Mới (Auto-Refresh Toggle):** 
  - Công tắc cho phép bật/tắt luồng dữ liệu thời gian thực.
  - **ON:** Dữ liệu RPS được cập nhật liên tục mỗi 2 giây (mô phỏng streaming).
  - **OFF:** Dừng cập nhật, cho phép người dùng "đóng băng" biểu đồ để phân tích một sự kiện cụ thể mà không bị trôi dữ liệu.
- **Làm Mới Thủ Công (Manual Refresh):** Nút này chỉ hoạt động khi Auto-refresh đang tắt. Nó cho phép người dùng nạp thủ công một điểm dữ liệu mới, hữu ích cho việc kiểm thử (debug) hoặc theo dõi từng bước (step-by-step).
- **Xóa Dữ Liệu (Clear Data):** Nút biểu tượng thùng rác cho phép xóa sạch toàn bộ dữ liệu hiện có trên biểu đồ, đưa giao diện về trạng thái trống để bắt đầu một phiên giám sát mới.

### 2. Trực Quan Hóa Đa Chiều (`MainChart`)
- **Chế Độ Xem Lịch Sử (Historical Views):** Thanh công cụ góc phải cho phép chuyển đổi nhanh giữa các ngữ cảnh thời gian:
  - **Live:** Chế độ mặc định, tập trung vào các biến động ngay tức thì.
  - **1H / 6H / 24H:** Xem lại dữ liệu lịch sử trong vòng 1 giờ, 6 giờ hoặc 24 giờ qua để nhận diện các mẫu (patterns) dài hạn.
- **Tương Tác Legend:** Người dùng có thể click vào tên các mô hình (LGBM+, LGBM) trong phần chú thích để bật/tắt hiển thị của chúng, giúp so sánh đối chiếu dễ dàng hơn.
- **Phát Hiện Bất Thường:** Hệ thống tự động phát hiện và đánh dấu đỏ các điểm dự đoán lệch quá 15% so với thực tế.

### 3. Tải Lên & Xử Lý Dữ Liệu (`StatsGrid`)
Module `StatsGrid` không chỉ hiển thị thống kê mà còn tích hợp tính năng tải dữ liệu thực tế:

- **Cơ Chế Upload File:**
  - Hỗ trợ các định dạng `.parquet`, `.json`, và `.csv`.
  - Thay vì chỉ mô phỏng giao diện, hệ thống hiện tại sử dụng **`FormData`** để đóng gói file và thực hiện **`POST` request** tới endpoint `/api/upload`.
  - Trạng thái tải lên (Loading spinner, Success checkmark) được đồng bộ hóa với phản hồi thực tế từ server, loại bỏ các độ trễ giả lập trước đây.
- **Chỉ Số Dự Báo:** Hiển thị RPS dự kiến cho 1 phút, 5 phút và 15 phút tiếp theo cùng xu hướng tăng/giảm.

---

## 🛠 Hướng Dẫn Tích Hợp Backend (Python/InfluxDB)

Để chuyển đổi giao diện này từ prototype sang ứng dụng thực tế (Production), cần thực hiện các bước sau:

### 1. API Endpoint
Bạn cần triển khai server (FastAPI/Flask) để xử lý các request từ Frontend:
- **`POST /api/upload`**: Nhận file từ `StatsGrid`, sử dụng thư viện `pandas` hoặc `polars` để đọc dữ liệu và ghi vào Database.
- **WebSocket `/ws/live`**: Thay thế cơ chế `setInterval` trong `App.tsx` bằng kết nối WebSocket để đẩy dữ liệu realtime.

### 2. Database (InfluxDB)
Lưu trữ metric theo cấu trúc Time Series:
- **Measurement:** `inference_metrics`
- **Fields:** `predicted_rps`, `actual_rps`
- **Tags:** `model_version`, `region`

### 3. Điều Chỉnh Frontend (`App.tsx`)
- Thay thế hàm tạo dữ liệu giả `generateHistoricalData` bằng API call `GET /api/history` để lấy dữ liệu lịch sử thực tế khi người dùng chuyển đổi các chế độ xem 1H/6H/24H.