# Bài Hát Tặng 🎵

App Android tạo bài hát tặng theo đúng quy trình 8 bước của ForeverSongs:

1. Tặng cho ai (18 lựa chọn) → 2. Tên người nhận → 3. Dịp tặng (13 dịp) → 4. Thể loại (Ballad, Pop, Acoustic, Indie, Lofi, R&B, EDM, Thiếu nhi, Rock, Pop tiếng Anh, Bolero) + giọng nam / nữ / chọn giúp tôi →
5. Điều gì làm họ đặc biệt → 6. Kỷ niệm (≥ 30 ký tự) → 7. Lời đề tặng → 8. Người tặng

App tự viết lời tiếng Việt từ câu trả lời, rồi gửi lên **ACE-Step 1.5** (mô hình AI tạo nhạc mã nguồn mở, chạy miễn phí trên Hugging Face) để **AI sáng tác nhạc và hát thật** bằng giọng nam/nữ.

- Cần Internet khi tạo bài. Mỗi bài mất khoảng 1–3 phút (có thể phải xếp hàng).
- Hugging Face giới hạn lượt miễn phí mỗi ngày. Muốn thêm lượt: tạo tài khoản miễn phí → Settings → Access Tokens → tạo mã "Read" → dán vào ⚙️ Cài đặt trong app.
- Bài đã tạo được lưu trên máy (📚), nghe lại không cần mạng. Lưu MP3 / chia sẻ Zalo, Facebook.
- Nếu phòng thu AI lỗi: có thể nghe bản giai điệu soạn offline (không có giọng hát).

## Build
Đẩy lên nhánh `main` → GitHub Actions tự build APK. Link tải bản mới nhất:
`https://github.com/Minhcell/BAIHATTANG/releases/latest/download/BaiHatTang.apk`
