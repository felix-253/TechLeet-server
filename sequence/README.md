# PlantUML Diagrams - UC-07: Tạo và Quản lý Tin Tuyển Dụng

## Mô tả

Thư mục này chứa các sơ đồ PlantUML cho Use Case UC-07: Tạo và Quản lý Tin Tuyển Dụng của hệ thống HRM TechLeet.

## Các file diagram

### 1. Sequence Diagram - Chi tiết

- **File:** `UC-07-tao-va-quan-ly-tin-tuyen-dung.wsd`
- **Mô tả:** Sơ đồ sequence diagram chi tiết mô tả luồng xử lý cho các chức năng:
  - Tạo tin tuyển dụng mới
  - Cập nhật tin tuyển dụng
  - Xóa tin tuyển dụng
  - Xem danh sách tin tuyển dụng
- **Actors:** Hiring Manager, Recruiter
- **Components:** API Gateway, Recruitment Service, Database, Validation
- **Độ phức tạp:** Chi tiết, đầy đủ

### 2. Sequence Diagram - Đơn giản (Dành cho Báo cáo)

- **File:** `UC-07-simple-sequence.wsd`
- **Mô tả:** Phiên bản đơn giản hóa, tập trung vào luồng chính "Tạo tin tuyển dụng"
- **Khuyến nghị:** Sử dụng file này cho báo cáo khóa luận
- **Độ phức tạp:** Đơn giản, dễ hiểu

### 3. Use Case Diagram

- **File:** `UC-07-use-case-diagram.wsd`
- **Mô tả:** Sơ đồ use case diagram thể hiện:
  - Các actor và vai trò của họ
  - Các use case chính và phụ
  - Mối quan hệ include/extend giữa các use case
- **Actors:** Hiring Manager, Recruiter, Candidate
- **Khuyến nghị:** Sử dụng để trình bày tổng quan chức năng

### 4. Activity Diagram

- **File:** `UC-07-activity-diagram.wsd`
- **Mô tả:** Sơ đồ activity thể hiện business process flow:
  - Luồng tạo tin tuyển dụng
  - Luồng cập nhật
  - Luồng xóa
  - Các điều kiện và quyết định
- **Khuyến nghị:** Sử dụng để mô tả quy trình nghiệp vụ

## Cách sử dụng

### 1. Online (Khuyến nghị cho người mới)

**Cách 1: PlantUML Online Server**

1. Truy cập: https://www.plantuml.com/plantuml/uml/
2. Copy nội dung file `.wsd` và paste vào
3. Nhấn "Submit" để xem diagram
4. Download dưới dạng PNG, SVG hoặc PDF

**Cách 2: PlantText**

1. Truy cập: https://www.planttext.com/
2. Paste code vào và xem kết quả ngay lập tức

### 2. VS Code Extension

**Cài đặt:**

1. Mở VS Code
2. Tìm và cài extension "PlantUML" (jebbs.plantuml)
3. Cài thêm Graphviz từ: https://graphviz.org/download/

**Sử dụng:**

1. Mở file `.wsd` trong VS Code
2. Nhấn `Alt + D` để preview
3. Hoặc chuột phải chọn "Preview Current Diagram"
4. Export: Chuột phải → "Export Current Diagram"

### 3. Command Line

```bash
# Cài đặt PlantUML
# Trên macOS với Homebrew
brew install plantuml

# Trên Ubuntu/Debian
sudo apt-get install plantuml

# Generate PNG từ file .wsd
plantuml UC-07-tao-va-quan-ly-tin-tuyen-dung.wsd

# Generate SVG (vector, chất lượng cao)
plantuml -tsvg UC-07-tao-va-quan-ly-tin-tuyen-dung.wsd

# Generate PDF
plantuml -tpdf UC-07-tao-va-quan-ly-tin-tuyen-dung.wsd
```

### 4. Intellij IDEA / WebStorm

1. Cài plugin "PlantUML Integration"
2. Cài Graphviz
3. Mở file `.wsd` và plugin sẽ tự động hiển thị preview

## Tùy chỉnh Diagram

### Thay đổi Theme

Thêm vào đầu file `.wsd`:

```plantuml
!theme blueprint      ' Theme hiện tại
' Hoặc thử các theme khác:
!theme cerulean
!theme sketchy
!theme plain
!theme vibrant
```

### Thay đổi màu sắc

```plantuml
skinparam backgroundColor #EEEBDC
skinparam handwritten true

skinparam sequence {
    ArrowColor DeepSkyBlue
    ActorBorderColor DeepSkyBlue
    LifeLineBorderColor blue
    LifeLineBackgroundColor #A9DCDF

    ParticipantBorderColor DeepSkyBlue
    ParticipantBackgroundColor DodgerBlue
    ParticipantFontName Impact
    ParticipantFontSize 17
    ParticipantFontColor #A9DCDF
}
```

### Thay đổi hướng

```plantuml
' Mặc định: top to bottom
left to right direction

' Hoặc
top to bottom direction
```

## Tài liệu tham khảo

- **PlantUML Official:** https://plantuml.com/
- **Sequence Diagram Guide:** https://plantuml.com/sequence-diagram
- **Use Case Diagram Guide:** https://plantuml.com/use-case-diagram
- **Styling Guide:** https://plantuml.com/skinparam
- **Themes:** https://plantuml.com/theme

## Tips và Best Practices

1. **Sử dụng alias** để code ngắn gọn hơn:

   ```plantuml
   participant "API Gateway" as Gateway
   ```

2. **Chia nhỏ diagram** nếu quá phức tạp:

   - Tạo nhiều file .wsd riêng cho từng flow
   - Sử dụng `!include` để tái sử dụng code

3. **Comment rõ ràng**:

   ```plantuml
   ' This is a comment
   note right: This is a note
   ```

4. **Version control friendly**:
   - File .wsd là text thuần, dễ dàng track changes trong Git
   - Review diagram changes như code thông thường

## Export cho Báo cáo Khóa luận

**Khuyến nghị:**

- **PNG:** Cho Word/PowerPoint (độ phân giải 300 DPI)
- **SVG:** Cho LaTeX hoặc web (vector, không bị vỡ khi zoom)
- **PDF:** Cho tài liệu chính thức

```bash
# Export PNG với chất lượng cao
plantuml -tpng -SDEFAULT_DPI=300 *.wsd

# Export tất cả sang SVG
plantuml -tsvg *.wsd
```

## Liên hệ

Nếu có câu hỏi hoặc cần hỗ trợ, vui lòng tạo issue trong repository.
