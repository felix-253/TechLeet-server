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
3. **Nhà tuyển dụng (Recruiter)** - Người phụ trách tuyển dụng
4. **Quản lý tuyển dụng (Hiring Manager)** - Người quản lý quy trình tuyển dụng
5. **Người phỏng vấn (Interviewer)** - Người thực hiện phỏng vấn
6. **Quản trị viên (Admin)** - Quản trị hệ thống
7. **HR Manager** - Quản lý nhân sự cấp cao

---

## III. DANH SÁCH 20 USE CASE CHÍNH

### A. MODULE XÁC THỰC VÀ PHÂN QUYỀN (2 use cases)

#### UC-01: Đăng nhập hệ thống

- **Actor:** Tất cả người dùng
- **Mô tả:** Người dùng đăng nhập vào hệ thống bằng email và mật khẩu
- **Luồng chính:**
  1. Người dùng nhập email và mật khẩu
  2. Hệ thống xác thực thông tin
  3. Hệ thống tạo JWT token (access token + refresh token)
  4. Người dùng nhận được token để sử dụng các chức năng

#### UC-02: Quản lý phân quyền

- **Actor:** Admin
- **Mô tả:** Quản trị viên quản lý các quyền truy cập của người dùng trong hệ thống

---

### B. MODULE QUẢN LÝ NHÂN VIÊN (2 use cases)

#### UC-03: Quản lý hồ sơ nhân viên

- **Actor:** Admin, HR Manager
- **Mô tả:** Tạo, cập nhật thông tin nhân viên trong hệ thống
- **Dữ liệu chính:**
  - Thông tin cá nhân (họ tên, email, số điện thoại)
  - Thông tin công việc (phòng ban, vị trí, mã nhân viên)
  - Thông tin tài khoản (quyền truy cập)
- **Chức năng:**
  - Tạo hồ sơ nhân viên mới
  - Cập nhật thông tin nhân viên
  - Xem danh sách nhân viên (tìm kiếm, lọc, phân trang)

#### UC-04: Xem hồ sơ cá nhân

- **Actor:** Employee
- **Mô tả:** Nhân viên xem và quản lý thông tin hồ sơ cá nhân của mình

---

### C. MODULE QUẢN LÝ TỔ CHỨC (2 use cases)

#### UC-05: Quản lý phòng ban

- **Actor:** Admin, HR Manager
- **Mô tả:** Quản lý các phòng ban trong công ty
- **Chức năng:** CRUD phòng ban, lọc theo trụ sở, tìm kiếm

#### UC-06: Quản lý vị trí công việc

- **Actor:** Admin, HR Manager
- **Mô tả:** Quản lý các vị trí công việc trong công ty
- **Chức năng:** CRUD vị trí, tìm kiếm, phân loại theo level

---

### D. MODULE QUẢN LÝ TIN TUYỂN DỤNG (3 use cases)

#### UC-07: Tạo và quản lý tin tuyển dụng

- **Actor:** Hiring Manager, Recruiter
- **Mô tả:** Tạo, cập nhật tin tuyển dụng mới cho vị trí cần tuyển
- **Dữ liệu chính:**
  - Tiêu đề và mô tả công việc
  - Yêu cầu ứng viên (kinh nghiệm, kỹ năng, trình độ)
  - Mức lương (min-max), số lượng, hạn ứng tuyển
  - Hình thức làm việc (full-time, part-time, contract)
- **Chức năng:** Tạo, cập nhật, xóa tin tuyển dụng

#### UC-08: Xuất bản tin tuyển dụng

- **Actor:** Hiring Manager
- **Mô tả:** Đưa tin tuyển dụng từ trạng thái "draft" sang "published"
- **Điều kiện:** Hạn nộp đơn phải là ngày trong tương lai

#### UC-09: Xem danh sách tin tuyển dụng

- **Actor:** Hiring Manager, Recruiter, Candidate
- **Mô tả:** Xem danh sách tin tuyển dụng với lọc theo trạng thái, phòng ban, vị trí

---

### E. MODULE QUẢN LÝ ỨNG VIÊN (2 use cases)

#### UC-10: Quản lý hồ sơ ứng viên

- **Actor:** Recruiter, System
- **Mô tả:** Tạo, cập nhật hồ sơ ứng viên trong hệ thống
- **Dữ liệu chính:**
  - Thông tin cá nhân (họ tên, email, SĐT, ngày sinh, địa chỉ)
  - Thông tin nghề nghiệp (kinh nghiệm, công ty hiện tại, vị trí)
  - Học vấn, kỹ năng, CV/Resume URL
  - Mức lương mong muốn, nguồn ứng viên
- **Chức năng:** Tạo, cập nhật, cập nhật trạng thái

#### UC-11: Tìm kiếm ứng viên

- **Actor:** Recruiter, Hiring Manager
- **Mô tả:** Tìm kiếm ứng viên với bộ lọc theo trạng thái, kỹ năng, kinh nghiệm

---

### F. MODULE QUẢN LÝ ĐƠN ỨNG TUYỂN (3 use cases)

#### UC-12: Nộp đơn ứng tuyển

- **Actor:** Candidate
- **Mô tả:** Ứng viên nộp đơn ứng tuyển cho một vị trí
- **Dữ liệu:**
  - ID tin tuyển dụng, thư xin việc, CV/Resume
  - Ngày bắt đầu dự kiến
- **Quy tắc:** Một ứng viên chỉ được nộp một đơn cho mỗi vị trí

#### UC-13: Quản lý đơn ứng tuyển

- **Actor:** Recruiter, Hiring Manager
- **Mô tả:** Xem, cập nhật trạng thái đơn ứng tuyển
- **Bộ lọc:** Trạng thái, tin tuyển dụng, ứng viên, ngày nộp đơn
- **Chức năng:** Xem danh sách, xem chi tiết, cập nhật trạng thái

#### UC-14: Gửi và phản hồi thư mời làm việc

- **Actor:** Hiring Manager, Candidate
- **Mô tả:**
  - Hiring Manager gửi lời mời làm việc (mức lương, deadline)
  - Ứng viên chấp nhận hoặc từ chối lời mời

---

### G. MODULE QUẢN LÝ PHỎNG VẤN (3 use cases)

#### UC-15: Lên lịch phỏng vấn

- **Actor:** Recruiter, Hiring Manager
- **Mô tả:** Tạo và quản lý lịch phỏng vấn cho ứng viên
- **Dữ liệu:**
  - ID đơn ứng tuyển, loại phỏng vấn, thời gian, địa điểm/link meeting
  - Người phỏng vấn chính, người phỏng vấn phụ
- **Quy tắc:** Không được trùng lịch của người phỏng vấn

#### UC-16: Xem và quản lý lịch phỏng vấn

- **Actor:** Recruiter, Hiring Manager, Interviewer
- **Mô tả:** Xem danh sách lịch phỏng vấn với bộ lọc
- **Bộ lọc:** Trạng thái, thời gian, loại PV, người phỏng vấn
- **Chức năng:** Xem lịch sắp tới, xem theo đơn ứng tuyển, hủy lịch

#### UC-17: Hoàn thành phỏng vấn và đánh giá

- **Actor:** Interviewer
- **Mô tả:** Kết thúc buổi phỏng vấn và ghi nhận kết quả
- **Dữ liệu:**
  - Điểm số (1-10), kết quả (pass/fail/maybe)
  - Phản hồi chi tiết, điểm mạnh/yếu
  - Đề xuất vòng tiếp theo

---

### H. MODULE SÀNG LỌC CV TỰ ĐỘNG - AI ⭐ (3 use cases)

#### UC-18: Sàng lọc CV tự động bằng AI

- **Actor:** Recruiter, System
- **Mô tả:** Kích hoạt quá trình sàng lọc CV tự động cho đơn ứng tuyển
- **Dữ liệu:** ID đơn ứng tuyển, đường dẫn file CV, độ ưu tiên
- **Quy trình:**
  - Upload CV (PDF, DOC, DOCX)
  - OCR trích xuất văn bản (tiếng Việt/Anh)
  - NLP xử lý và phân tích
  - AI đánh giá và cho điểm
- **Chức năng:** Sàng lọc đơn lẻ hoặc hàng loạt

#### UC-19: Xem kết quả sàng lọc CV

- **Actor:** Recruiter, Hiring Manager
- **Mô tả:** Xem kết quả phân tích CV của AI
- **Thông tin hiển thị:**
  - Điểm tổng thể và điểm chi tiết (kỹ năng, kinh nghiệm, học vấn)
  - Thông tin được trích xuất tự động
  - Độ phù hợp với yêu cầu công việc
  - Đề xuất của AI
- **Bộ lọc:** Trạng thái, điểm số, tin tuyển dụng

#### UC-20: Xem thống kê sàng lọc CV

- **Actor:** Hiring Manager, HR Manager
- **Mô tả:** Xem báo cáo và số liệu thống kê về quá trình sàng lọc CV
- **Thông tin:** Tổng số CV, điểm TB, phân bố điểm, tỷ lệ đạt/không đạt

---

## IV. LUỒNG QUY TRÌNH NGHIỆP VỤ CHÍNH

### 1. QUY TRÌNH TUYỂN DỤNG HOÀN CHỈNH

```
1. Hiring Manager tạo tin tuyển dụng (UC-D1)
   ↓
2. Hiring Manager xuất bản tin tuyển dụng (UC-D3)
   ↓
3. Ứng viên nộp đơn ứng tuyển (UC-F1)
   ↓
4. Hệ thống tự động:
   - Tạo hồ sơ ứng viên (UC-E1)
   - Gửi email xác nhận (UC-J4)
   - Kích hoạt sàng lọc CV (UC-H1)
   ↓
5. AI sàng lọc và đánh giá CV (UC-H3)
   ↓
6. Recruiter xem kết quả sàng lọc (UC-H4)
   ↓
7. Recruiter cập nhật trạng thái đơn: screening → interviewing (UC-F5)
   ↓
8. Recruiter lên lịch phỏng vấn (UC-G1)
   ↓
9. Hệ thống gửi email thông báo phỏng vấn (UC-J1)
   ↓
10. Interviewer thực hiện phỏng vấn
    ↓
11. Interviewer hoàn thành và đánh giá (UC-G8)
    ↓
12a. Nếu PASS: Hiring Manager gửi thư mời (UC-F6)
    ↓
    Ứng viên phản hồi chấp nhận (UC-F7)
    ↓
    Cập nhật trạng thái: hired (UC-F5)

12b. Nếu FAIL: Cập nhật trạng thái: rejected (UC-F5)
    ↓
    Gửi email từ chối (UC-J3)
```

### 2. QUY TRÌNH ONBOARDING NHÂN VIÊN MỚI

```
1. Admin tạo hồ sơ nhân viên (UC-B1)
   ↓
2. Hệ thống tự động tạo tài khoản và gửi email
   ↓
3. Nhân viên tạo mật khẩu lần đầu (UC-A3)
   ↓
4. Admin gán phân quyền (UC-A4)
   ↓
5. Nhân viên đăng nhập và xem hồ sơ (UC-A1, UC-B4)
```

---

## V. PHÂN LOẠI 20 USE CASE THEO MỨC ĐỘ ƯU TIÊN

### ⭐ Mức 1 - Core Features (8 use cases):

- **UC-01:** Đăng nhập hệ thống
- **UC-07:** Tạo và quản lý tin tuyển dụng
- **UC-08:** Xuất bản tin tuyển dụng
- **UC-10:** Quản lý hồ sơ ứng viên
- **UC-12:** Nộp đơn ứng tuyển
- **UC-15:** Lên lịch phỏng vấn
- **UC-18:** Sàng lọc CV tự động bằng AI ⭐
- **UC-19:** Xem kết quả sàng lọc CV

### 🔹 Mức 2 - Essential Features (8 use cases):

- **UC-02:** Quản lý phân quyền
- **UC-03:** Quản lý hồ sơ nhân viên
- **UC-05:** Quản lý phòng ban
- **UC-06:** Quản lý vị trí công việc
- **UC-09:** Xem danh sách tin tuyển dụng
- **UC-11:** Tìm kiếm ứng viên
- **UC-13:** Quản lý đơn ứng tuyển
- **UC-17:** Hoàn thành phỏng vấn và đánh giá

### 🔸 Mức 3 - Supporting Features (4 use cases):

- **UC-04:** Xem hồ sơ cá nhân
- **UC-14:** Gửi và phản hồi thư mời làm việc
- **UC-16:** Xem và quản lý lịch phỏng vấn
- **UC-20:** Xem thống kê sàng lọc CV

---

## VI. MA TRẬN ACTOR - USE CASE (20 Use Cases)

| Use Case | Candidate | Employee | Recruiter | Hiring Mgr | Interviewer | Admin | HR Mgr | System |
| -------- | --------- | -------- | --------- | ---------- | ----------- | ----- | ------ | ------ |
| UC-01    | ✓         | ✓        | ✓         | ✓          | ✓           | ✓     | ✓      |        |
| UC-02    |           |          |           |            |             | ✓     |        |        |
| UC-03    |           |          |           |            |             | ✓     | ✓      |        |
| UC-04    |           | ✓        |           |            |             |       |        |        |
| UC-05    |           |          |           |            |             | ✓     | ✓      |        |
| UC-06    |           |          |           |            |             | ✓     | ✓      |        |
| UC-07    |           |          | ✓         | ✓          |             |       |        |        |
| UC-08    |           |          |           | ✓          |             |       |        |        |
| UC-09    | ✓         |          | ✓         | ✓          |             |       |        |        |
| UC-10    |           |          | ✓         |            |             |       |        | ✓      |
| UC-11    |           |          | ✓         | ✓          |             |       |        |        |
| UC-12    | ✓         |          |           |            |             |       |        |        |
| UC-13    |           |          | ✓         | ✓          |             |       |        |        |
| UC-14    | ✓         |          |           | ✓          |             |       |        |        |
| UC-15    |           |          | ✓         | ✓          |             |       |        |        |
| UC-16    |           |          | ✓         | ✓          | ✓           |       |        |        |
| UC-17    |           |          |           |            | ✓           |       |        |        |
| UC-18    |           |          | ✓         |            |             |       |        | ✓      |
| UC-19    |           |          | ✓         | ✓          |             |       |        |        |
| UC-20    |           |          |           | ✓          |             |       | ✓      |        |

---

## VII. YÊU CẦU PHI CHỨC NĂNG (Non-Functional Requirements)

### 1. Hiệu năng (Performance)

- Thời gian phản hồi API: < 500ms (90% requests)
- Xử lý sàng lọc CV: < 30 giây/CV
- Hỗ trợ 1000+ concurrent users

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
- Email service integration (Brevo)

### 6. Bản địa hóa (Localization)

- Hỗ trợ định dạng số Việt Nam
- Định dạng tiền tệ VND
- Múi giờ Việt Nam (Asia/Ho_Chi_Minh)
- Xử lý số điện thoại Việt Nam (+84)
- OCR tiếng Việt và tiếng Anh

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

### AI/ML:

- NLP processing cho phân tích CV
- Text embedding
- LLM integration
- Tesseract OCR

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

Hệ thống HRM TechLeet bao gồm **20 use cases chính** được tổ chức thành 8 module, phục vụ 7 loại actor khác nhau. Hệ thống tập trung vào:

1. **Quản lý tuyển dụng thông minh** với AI-powered CV screening ⭐
2. **Quy trình tuyển dụng hoàn chỉnh** từ đăng tin đến tuyển dụng
3. **Quản lý nhân sự và tổ chức** hiệu quả
4. **Kiến trúc Microservices** linh hoạt và dễ mở rộng
5. **Tự động hóa** các quy trình thủ công

### Thống kê Use Cases:

- **Core Features:** 8 use cases (40%)
- **Essential Features:** 8 use cases (40%)
- **Supporting Features:** 4 use cases (20%)

### Điểm nhấn công nghệ:

- **AI/ML:** Sàng lọc CV tự động, NLP, OCR đa ngôn ngữ
- **Microservices:** 4 services độc lập, API Gateway
- **Automation:** Email tự động, workflow tự động
- **Real-time:** Thống kê và báo cáo real-time

Hệ thống được thiết kế để:

- ✅ Giảm 70% thời gian sàng lọc CV thủ công
- ✅ Tăng 50% chất lượng ứng viên được chọn
- ✅ Tự động hóa 80% quy trình tuyển dụng
- ✅ Quản lý tập trung toàn bộ quy trình
- ✅ Tích hợp dễ dàng với các hệ thống khác
