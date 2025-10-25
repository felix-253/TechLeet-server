# DANH SÁCH CÁC USE CASE CHÍNH - HỆ THỐNG HRM TECHLEET

## I. TỔNG QUAN HỆ THỐNG

**Tên hệ thống:** TechLeet - Human Resource Management System  
**Kiến trúc:** Microservices Architecture  
**Công nghệ:** NestJS, TypeScript, PostgreSQL, Redis, Kafka

### Các hệ thống con (Microservices):

1. **User Service** - Quản lý người dùng và xác thực
2. **Company Service** - Quản lý thông tin công ty
3. **Recruitment Service** - Quản lý tuyển dụng
4. **API Gateway** - Cổng giao tiếp tập trung

---

## II. DANH SÁCH CÁC ACTOR (Người dùng hệ thống)

1. **Ứng viên (Candidate)** - Người nộp đơn ứng tuyển
2. **Nhân viên (Employee)** - Nhân viên trong công ty
3. **Quản trị viên (Admin)** - Quản trị hệ thống
4. **Nhà tuyển dụng (Recruiter)** - Người phụ trách tuyển dụng
5. **Quản lý tuyển dụng (Hiring Manager)** - Người quản lý quy trình tuyển dụng
6. **Người phỏng vấn (Interviewer)** - Người thực hiện phỏng vấn
7. **HR Manager** - Quản lý nhân sự cấp cao

---

## III. DANH SÁCH 15 USE CASE CHÍNH

### A. MODULE XÁC THỰC VÀ TRUY CẬP (1 use case)

#### UC001: Đăng nhập

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Nhân viên/Quản trị viên sử dụng tài khoản cá nhân để truy cập vào hệ thống
- **Chức năng:** Xác thực tài khoản, kiểm tra vai trò người dùng và tạo phiên đăng nhập an toàn

---

### B. MODULE QUẢN LÝ TIN TUYỂN DỤNG (4 use cases)

#### UC002: Tạo tin tuyển dụng thủ công

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Nhà tuyển dụng cần đăng một vị trí mới, tự nhập liệu các thông tin chi tiết về yêu cầu công việc
- **Chức năng:** Lưu trữ thông tin tuyển dụng mới và tạo bản nháp tin tuyển dụng trong hệ thống

#### UC003: Tạo tin tuyển dụng tự động

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Nhà tuyển dụng sử dụng mẫu có sẵn hoặc tính năng AI để điền tự động nội dung tin tuyển dụng
- **Chức năng:** Sử dụng dữ liệu đầu vào/AI để tạo nhanh một bản nháp tin tuyển dụng hoàn chỉnh

#### UC004: Cập nhật thông tin tuyển dụng

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Nhà tuyển dụng cần chỉnh sửa, bổ sung hoặc thay đổi trạng thái của một tin tuyển dụng đang hoạt động
- **Chức năng:** Cho phép chỉnh sửa thông tin đã lưu

#### UC005: Xem danh sách tin tuyển dụng

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Người dùng truy cập vào trang tổng quan để tìm kiếm hoặc xem các vị trí đang được tuyển dụng
- **Chức năng:** Hiển thị danh sách tất cả các tin tuyển dụng đang hoạt động hoặc đã lưu trữ, kèm theo chức năng tìm kiếm/lọc

---

### C. MODULE QUẢN LÝ ĐƠN ỨNG TUYỂN (3 use cases)

#### UC006: Nộp đơn ứng tuyển

- **Actor:** Ứng viên
- **Mô tả:** Ứng viên hoàn thành thông tin và đính kèm CV/hồ sơ để gửi đi cho vị trí đã chọn
- **Chức năng:** Tiếp nhận, kiểm tra định dạng và lưu trữ hồ sơ ứng viên vào cơ sở dữ liệu

#### UC007: Quản lý đơn ứng tuyển

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Nhà tuyển dụng muốn xem, phân loại, hoặc thay đổi trạng thái của các đơn ứng tuyển đã nộp
- **Chức năng:** Cung cấp giao diện để xem tất cả đơn ứng tuyển, gán nhãn/trạng thái (Sàng lọc, Phỏng vấn, Từ chối) và lọc/sắp xếp

#### UC008: Xem chi tiết đơn ứng tuyển

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Nhà tuyển dụng nhấp vào một hồ sơ cụ thể để đọc chi tiết thông tin, CV và các tài liệu đính kèm
- **Chức năng:** Hiển thị đầy đủ thông tin hồ sơ, bao gồm dữ liệu đã trích xuất (nếu có) và CV gốc

---

### D. MODULE QUẢN LÝ PHỎNG VẤN (3 use cases)

#### UC009: Tạo lịch phỏng vấn

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Nhà tuyển dụng muốn lên lịch cho một buổi phỏng vấn (chọn người, thời gian, địa điểm) cho một ứng viên
- **Chức năng:** Thiết lập sự kiện lịch, kiểm tra sự khả dụng của người phỏng vấn và gửi thông báo tự động (email) đến các bên liên quan

#### UC010: Quản lý lịch phỏng vấn

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Người dùng muốn xem, thay đổi, hủy bỏ hoặc xác nhận các sự kiện phỏng vấn đã được tạo
- **Chức năng:** Cung cấp giao diện lịch tổng quan để theo dõi và quản lý tất cả các buổi phỏng vấn sắp diễn ra hoặc đã hoàn thành

#### UC011: Đánh giá ứng viên

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Người phỏng vấn nhập kết quả, nhận xét và điểm số của ứng viên sau khi phỏng vấn kết thúc
- **Chức năng:** Lưu trữ kết quả đánh giá theo mẫu chuẩn, tính toán điểm số tổng hợp và lưu lại nhận xét cá nhân

---

### E. MODULE QUẢN LÝ NHÂN VIÊN (2 use cases)

#### UC012: Tạo nhân viên

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Khi một ứng viên được tuyển dụng thành công, Quản lý Nhân sự tiến hành khởi tạo hồ sơ nhân viên chính thức
- **Chức năng:** Lập hồ sơ nhân sự mới, gán mã nhân viên, và thiết lập các thông tin cơ bản (phòng ban, vị trí)

#### UC013: Cập nhật thông tin nhân viên

- **Actor:** Nhân viên, Quản trị viên
- **Mô tả:** Cần thay đổi các thông tin liên quan đến nhân viên (chức vụ, phòng ban, thông tin liên hệ, lương thưởng)
- **Chức năng:** Cho phép sửa đổi dữ liệu hồ sơ nhân sự và lưu lại lịch sử thay đổi

---

### F. MODULE QUẢN LÝ TỔ CHỨC (2 use cases)

#### UC014: Tạo trụ sở

- **Actor:** Quản trị viên
- **Mô tả:** Quản trị viên muốn thêm một địa điểm làm việc/văn phòng/chi nhánh mới vào cơ cấu tổ chức công ty
- **Chức năng:** Lưu trữ thông tin chi tiết về trụ sở mới (tên, địa chỉ, số điện thoại)

#### UC015: Cập nhật trụ sở

- **Actor:** Quản trị viên
- **Mô tả:** Quản trị viên cần thay đổi thông tin hoặc tình trạng hoạt động của một trụ sở hiện có
- **Chức năng:** Cho phép chỉnh sửa thông tin chi tiết của trụ sở (địa chỉ mới, tên mới, v.v.)

### G. MODULE TỰ ĐỘNG HÓA TUYỂN DỤNG (1 use case)

#### UC016: Luồng xử lý tự động tuyển dụng

- **Actor:** Ứng viên
- **Mô tả:** Ứng viên upload CV và hệ thống tự động phân tích, sàng lọc CV. Nếu đạt tiêu chí thì tạo candidate và application, nếu không đạt thì lưu vào danh sách ứng viên tiềm năng
- **Chức năng:** AI phân tích CV tự động, sàng lọc ứng viên, tạo candidate và application khi CV đạt tiêu chí, lưu vào danh sách tiềm năng khi không đạt, hiển thị thông tin ứng viên đã được AI phân tích

#### UC017: Gợi ý ứng viên phù hợp

- **Actor:** Nhà tuyển dụng
- **Mô tả:** Nhà tuyển dụng yêu cầu gợi ý ứng viên phù hợp cho vị trí tuyển dụng từ danh sách ứng viên tiềm năng đã được lưu trữ
- **Chức năng:** AI phân tích độ phù hợp, tính điểm matching, tạo lý do gợi ý, cho phép tạo application từ ứng viên tiềm năng được chọn

---

## IV. LUỒNG QUY TRÌNH NGHIỆP VỤ CHÍNH

### 1. QUY TRÌNH TUYỂN DỤNG HOÀN CHỈNH

```
1. Nhân viên/Quản trị viên đăng nhập hệ thống (UC001)
   ↓
2. Tạo tin tuyển dụng (UC002 hoặc UC003)
   ↓
3. Cập nhật và xuất bản tin tuyển dụng (UC004)
   ↓
4. Ứng viên nộp đơn ứng tuyển (UC006)
   ↓
5. Nhà tuyển dụng quản lý đơn ứng tuyển (UC007)
   ↓
6. Xem chi tiết đơn ứng tuyển (UC008)
   ↓
7. Tạo lịch phỏng vấn (UC009)
   ↓
8. Quản lý lịch phỏng vấn (UC010)
   ↓
9. Đánh giá ứng viên (UC011)
   ↓
10a. Nếu PASS: Tạo nhân viên mới (UC012)
     ↓
     Cập nhật thông tin nhân viên (UC013)

10b. Nếu FAIL: Cập nhật trạng thái từ chối
```

### 2. QUY TRÌNH QUẢN LÝ TỔ CHỨC

```
1. Quản trị viên đăng nhập hệ thống (UC001)
   ↓
2. Tạo trụ sở mới (UC014)
   ↓
3. Cập nhật thông tin trụ sở (UC015)
   ↓
4. Tạo nhân viên và gán vào trụ sở (UC012)
```

---

## V. PHÂN LOẠI 15 USE CASE THEO MỨC ĐỘ ƯU TIÊN

### ⭐ Mức 1 - Core Features (6 use cases):

- **UC001:** Đăng nhập
- **UC002:** Tạo tin tuyển dụng thủ công
- **UC006:** Nộp đơn ứng tuyển
- **UC007:** Quản lý đơn ứng tuyển
- **UC009:** Tạo lịch phỏng vấn
- **UC011:** Đánh giá ứng viên

### 🔹 Mức 2 - Essential Features (6 use cases):

- **UC003:** Tạo tin tuyển dụng tự động
- **UC004:** Cập nhật thông tin tuyển dụng
- **UC005:** Xem danh sách tin tuyển dụng
- **UC008:** Xem chi tiết đơn ứng tuyển
- **UC010:** Quản lý lịch phỏng vấn
- **UC012:** Tạo nhân viên

### 🔸 Mức 3 - Supporting Features (3 use cases):

- **UC013:** Cập nhật thông tin nhân viên
- **UC014:** Tạo trụ sở
- **UC015:** Cập nhật trụ sở

---

## VI. MA TRẬN ACTOR - USE CASE (15 Use Cases)

| Use Case | Ứng viên | Nhân viên | Quản trị viên | Nhà tuyển dụng | Quản lý tuyển dụng | Người phỏng vấn | HR Manager |
| -------- | -------- | --------- | ------------- | -------------- | ------------------ | --------------- | ---------- |
| UC001    |          | ✓         | ✓             |                |                    |                 |            |
| UC002    |          | ✓         | ✓             |                |                    |                 |            |
| UC003    |          | ✓         | ✓             |                |                    |                 |            |
| UC004    |          | ✓         | ✓             |                |                    |                 |            |
| UC005    |          | ✓         | ✓             |                |                    |                 |            |
| UC006    | ✓        |           |               |                |                    |                 |            |
| UC007    |          | ✓         | ✓             |                |                    |                 |            |
| UC008    |          | ✓         | ✓             |                |                    |                 |            |
| UC009    |          | ✓         | ✓             |                |                    |                 |            |
| UC010    |          | ✓         | ✓             |                |                    |                 |            |
| UC011    |          | ✓         | ✓             |                |                    |                 |            |
| UC012    |          | ✓         | ✓             |                |                    |                 |            |
| UC013    |          | ✓         | ✓             |                |                    |                 |            |
| UC014    |          |           | ✓             |                |                    |                 |            |
| UC015    |          |           | ✓             |                |                    |                 |            |

---

## VII. YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements)

### 1. Hiệu năng (Performance)

- Thời gian phản hồi API: < 500ms (90% requests)
- Hỗ trợ 1000+ concurrent users
- Thời gian tải trang: < 3 giây

### 2. Bảo mật (Security)

- JWT authentication với access token + refresh token
- Bearer token cho mọi API request
- Phân quyền dựa trên role và permission
- Mã hóa mật khẩu
- HTTPS cho tất cả kết nối

### 3. Khả năng mở rộng (Scalability)

- Kiến trúc Microservices độc lập
- Horizontal scaling cho từng service
- Message Queue (Kafka) cho xử lý bất đồng bộ
- Redis caching

### 4. Độ tin cậy (Reliability)

- Health check cho mọi service
- Error handling và logging
- Database backup
- Retry mechanism cho failed jobs

### 5. Tích hợp (Integration)

- RESTful API
- Swagger documentation
- Webhook support
- Email service integration

---

## VIII. CÔNG NGHỆ SỬ DỤNG

### Backend Framework:

- NestJS (TypeScript)
- TypeORM (Database ORM)

### Database:

- PostgreSQL (quan hệ)
- Redis (caching, pub/sub)

### Message Queue:

- Apache Kafka

### Email Service:

- Brevo (SendinBlue)

### API Documentation:

- Swagger/OpenAPI

### Architecture:

- Microservices
- API Gateway Pattern
- Event-Driven Architecture

---

## IX. KẾT LUẬN

Hệ thống HRM TechLeet bao gồm **17 use cases chính** được tổ chức thành 7 module, phục vụ 7 loại actor khác nhau. Hệ thống tập trung vào:

1. **Quản lý tuyển dụng hiệu quả** với quy trình từ đăng tin đến tuyển dụng
2. **Quản lý nhân sự và tổ chức** toàn diện
3. **Kiến trúc Microservices** linh hoạt và dễ mở rộng
4. **Tự động hóa** các quy trình thủ công và AI-powered recruitment

### Thống kê Use Cases:

- **Core Features:** 6 use cases (35.3%)
- **Essential Features:** 6 use cases (35.3%)
- **Supporting Features:** 3 use cases (17.6%)
- **Automation Features:** 2 use cases (11.8%)

### Điểm nhấn công nghệ:

- **Microservices:** 4 services độc lập, API Gateway
- **AI & Automation:** AI phân tích CV, tự động sàng lọc, gợi ý ứng viên thông minh, workflow tự động
- **Real-time:** Thống kê và báo cáo real-time
- **Scalable:** Hỗ trợ mở rộng theo nhu cầu

Hệ thống được thiết kế để:

- ✅ Tự động hóa 80% quy trình tuyển dụng
- ✅ Quản lý tập trung toàn bộ quy trình
- ✅ Tích hợp dễ dàng với các hệ thống khác
- ✅ Đảm bảo tính nhất quán và bảo mật dữ liệu
