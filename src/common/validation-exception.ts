import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

const FIELD_LABELS: Record<string, string> = {
  role: 'Vai trò tài khoản', species: 'Loài thú cưng', behavioralFlag: 'Lưu ý chăm sóc',
  category: 'Danh mục', type: 'Loại yêu cầu', targetType: 'Đối tượng đánh giá',
  discountType: 'Hình thức giảm giá', paymentMethod: 'Phương thức thanh toán',
  fulfillmentMethod: 'Cách nhận hàng', status: 'Trạng thái', fromStatus: 'Trạng thái hiện tại',
  toStatus: 'Trạng thái tiếp theo', source: 'Nguồn tạo', period: 'Ca làm việc',
  statusFilter: 'Trạng thái cần lọc', decision: 'Lựa chọn xác nhận', topic: 'Chủ đề liên hệ',
  usageLimitPerUser: 'Số lượt dùng mỗi khách',
};

export function createValidationException(errors: ValidationError[]): BadRequestException {
  const messages: string[] = [];
  const collect = (items: ValidationError[]) => {
    for (const error of items) {
      for (const [constraint, message] of Object.entries(error.constraints ?? {})) {
        const isDefaultChoiceError = ['isEnum', 'isIn'].includes(constraint) && /\bmust be one of\b/.test(message);
        messages.push(isDefaultChoiceError
          ? `${FIELD_LABELS[error.property] ?? 'Lựa chọn'} không hợp lệ. Vui lòng chọn lại.`
          : message);
      }
      if (error.children?.length) collect(error.children);
    }
  };
  collect(errors);
  return new BadRequestException(messages.length ? [...new Set(messages)] : ['Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.']);
}
