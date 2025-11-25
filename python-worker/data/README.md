## Workspace Data

Kho lưu trữ này chỉ cung cấp **cấu trúc dữ liệu mẫu** sử dụng.  
Các tệp thật (ảnh khuôn mặt, embeddings, model nặng) **không được bao gồm** vì lý do riêng tư và dung lượng.  
Nếu muốn chạy được hệ thống, bạn cần tự chuẩn bị dữ liệu riêng của mình.

### Cấu trúc mẫu

```
C:.
│   embeddings.pkl
│
├───faces
│       someone A.jpg
│       someone B.jpg
│       someone C.jpg
│
└───models
        EDSR_x2.pb
```

- `embeddings.pkl`: file pickle chứa vector embedding khuôn mặt sinh ra từ pipeline của bạn.
- `faces/`: thư mục ảnh gốc để trích xuất embedding. Bạn cần thay bằng bộ ảnh của riêng mình.
- `models/EDSR_x2.pb`: ví dụ một model siêu phân giải cần dùng trước bước embedding. Có thể thay bằng model tương đương mà bạn sở hữu.

### Tự dựng dữ liệu

1. Thu thập ảnh khuôn mặt của chính bạn và đặt vào `faces/`.
2. Chạy pipeline nhận diện để tạo lại `embeddings.pkl`.
3. Chuẩn bị các model cần thiết (ví dụ `EDSR_x2.pb`) và đặt trong `models/`.


