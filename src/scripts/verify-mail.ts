import { ConfigService } from '@nestjs/config';
import { MailService } from '../common/mail/mail.service.js';

// Lệnh npm nạp .env qua Node --env-file; chỉ xác minh SMTP, không gửi email.
const mail = new MailService(new ConfigService());

try {
  await mail.verifyConnection();
  console.log('Gmail SMTP: kết nối và xác thực thành công. Chưa gửi email.');
} catch (error: unknown) {
  // Không in nguyên lỗi SMTP vì có thể chứa thông tin tài khoản hoặc nội dung thư.
  const code = error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : '';
  if (code === 'EAUTH') {
    console.error('Gmail SMTP: xác thực thất bại. Kiểm tra MAIL_USER và Gmail App Password trong .env.');
  } else if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS'].includes(code)) {
    console.error(`Gmail SMTP: không kết nối được (${code}). Kiểm tra mạng và cổng 465.`);
  } else {
    console.error('Gmail SMTP: chưa xác minh được. Kiểm tra MAIL_USER, MAIL_PASS và kết nối mạng.');
  }
  process.exitCode = 1;
}
