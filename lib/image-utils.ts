/**
 * Tiện ích xử lý nén và tải ảnh từ máy tính cho đồ nội thất
 * Nén canvas client-side về max 800px JPEG quality 0.8 để tiết kiệm dung lượng LocalStorage
 */

export function compressImageFile(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // Kiểm tra định dạng ảnh
    if (!file.type.startsWith('image/')) {
      reject(new Error('File được chọn không phải là hình ảnh hợp lệ'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Không thể đọc file'));
        return;
      }

      // Tạo đối tượng Image để lấy kích thước thật
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Tính toán tỷ lệ thu nhỏ nếu vượt quá maxWidth
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Vẽ nền trắng (cho ảnh PNG trong suốt khi chuyển thành JPEG)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Xuất Data URL nén dạng JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          // Fallback về raw dataUrl nếu canvas gặp lỗi
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
