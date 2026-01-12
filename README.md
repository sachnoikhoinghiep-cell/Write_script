
# YouTube Transcript Analyzer & Script Writer

 Một ứng dụng mạnh mẽ sử dụng trí tuệ nhân tạo (Gemini API) để phân tích bản ghi video YouTube, trích xuất chủ đề, dịch thuật, viết kịch bản motivational và tạo hình ảnh AI tự động.

 ## Phiên Bản Hiện Tại
 `PH.v.016.11.01.2026`

 ## Tác Giả
 **Henry Huỳnh** - [Facebook Profile](https://www.facebook.com/henryhuynh2)

 ## Tính Năng Chính
 - **Zero-Config UI**: Không yêu cầu người dùng nhập API Key thủ công. Hệ thống tự động nhận diện và sử dụng cấu hình bảo mật từ môi trường.
 - **Phân tích đa nguồn**: Trích xuất chủ đề chính và các điểm cốt lõi từ transcript hoặc URL thông qua công nghệ Google Search Grounding của Gemini 3 Pro.
 - **Gợi ý chủ đề thông minh**: Tự động đề xuất 5 chủ đề liên quan sau khi phân tích, cho phép người dùng khởi động lại quy trình sáng tạo chỉ với một cú nhấp chuột.
 - **Phân tích chủ đề (Topic Expansion)**: Khi nhập một tiêu đề ngắn, hệ thống tự động nhận diện kiểu chủ đề và đề xuất một **Dàn ý chi tiết (Outline)** chuyên nghiệp.
 - **Sao chép tiện lợi**: Hỗ trợ nút "Sao chép tất cả" cho danh sách chủ đề đề xuất.
 - **Tải xuống thông minh**: Tên tệp Thumbnail được tự động đặt theo chữ trên ảnh (không dấu).
 - **Biên tập chuyên nghiệp**: Tự động viết kịch bản kể chuyện motivational với khả năng chuyển cảnh tự nhiên, logic.
 - **Thumbnail Art Director**: Tự động tạo Thumbnail chuyên nghiệp với chữ in đậm, to rõ, không chân (sans-serif) và màu sắc tương phản cao.
 - **Cấu hình mở rộng**: Hỗ trợ thời lượng câu chuyện lên đến 60 phút và chia nhỏ thành 12 phần.

 ## Quyền Sử Dụng (Usage Rights)
 Dự án này là **mã nguồn mở (Open Source)**.
 Khi đồng bộ hóa lên GitHub hoặc bất kỳ nền tảng lưu trữ mã nguồn nào, người dùng được cấp **toàn quyền sử dụng**, bao gồm nhưng không giới hạn ở:
 - Sử dụng cho mục đích cá nhân hoặc thương mại.
 - Sửa đổi, tối ưu hóa và phát triển thêm tính năng.
 - Sao chép và phân phối lại mã nguồn theo giấy phép MIT.

 ## Cài Đặt
 Ứng dụng được xây dựng dựa trên React và Gemini AI SDK. Đảm bảo bạn có `API_KEY` của Google AI Studio được thiết lập trong môi trường máy chủ hoặc nền tảng triển khai.

 ---
 *Phát triển bởi đội ngũ đam mê sáng tạo nội dung AI.*
