import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface ServicePaymentReceiptEmail {
  bookingCode: string;
  customerName: string;
  customerPhone: string | null;
  petName: string;
  paidAt: Date;
  paymentMethod: string;
  transferReference: string | null;
  items: Array<{ name: string; amount: number }>;
  subtotal: number;
  discount: number;
  careFeeAmount: number;
  amountPaid: number;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function formatReceiptAmount(amount: number) {
  return `${amount.toLocaleString('vi-VN')}₫`;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly mailUser: string;
  private readonly mailPassword: string;

  constructor(config: ConfigService) {
    this.mailUser = config.get<string>('MAIL_USER')?.trim() ?? '';
    // Google hiển thị App Password thành các nhóm cách nhau bằng khoảng trắng.
    this.mailPassword = config.get<string>('MAIL_PASS')?.replace(/\s/g, '') ?? '';
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: {
        user: this.mailUser,
        pass: this.mailPassword,
      },
    });
  }

  async verifyConnection(): Promise<void> {
    if (!this.mailUser || !this.mailPassword) {
      throw new Error('Cần cấu hình MAIL_USER và MAIL_PASS (Gmail App Password).');
    }
    await this.transporter.verify();
  }

  async sendVerificationCode(to: string, code: string, name: string) {
    const from = this.mailUser;
    const password = this.mailPassword;
    if (!from || !password) {
      this.logger.warn('[Mail] Chưa cấu hình SMTP xác minh email.');
      throw new ServiceUnavailableException(
        'Dịch vụ gửi email chưa được cấu hình. Vui lòng liên hệ hỗ trợ.',
      );
    }

    try {
      await this.transporter.sendMail({
        from: `"PetCare" <${from}>`,
        to,
        subject: 'Xác minh tài khoản PetCare',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
            <h2>Xin chào ${name}</h2>
            <p>Mã xác minh tài khoản của bạn là:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb; padding: 16px 0;">
              ${code}
            </div>
            <p style="color: #6b7280;">Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
          </div>
        `,
      });
      this.logger.log(`[Mail] Gửi mã xác minh đến ${to}`);
    } catch {
      this.logger.warn('[Mail] Không thể gửi email xác minh.');
      throw new ServiceUnavailableException(
        'Không gửi được mã xác minh. Vui lòng thử lại sau.',
      );
    }
  }

  async sendPasswordResetCode(to: string, code: string, name: string) {
    const from = this.mailUser;
    const password = this.mailPassword;
    if (!from || !password) {
      this.logger.warn('[Mail] Chưa cấu hình SMTP đặt lại mật khẩu.');
      throw new ServiceUnavailableException(
        'Dịch vụ gửi email chưa được cấu hình. Vui lòng liên hệ hỗ trợ.',
      );
    }

    try {
      await this.transporter.sendMail({
        from: `"PetCare" <${from}>`,
        to,
        subject: 'Đặt lại mật khẩu PetCare',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 8px;">
            <h2 style="color: #1A1F1E;">Yêu cầu đặt lại mật khẩu</h2>
            <p>Xin chào <strong>${name}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản PetCare của bạn. Mã xác thực của bạn là:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1D7980; padding: 16px 0; text-align: center; background: #F2F7F6; border-radius: 8px;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">Mã có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
        `,
      });
      this.logger.log(`[Mail] Gửi mã đặt lại mật khẩu đến ${to}`);
    } catch {
      this.logger.warn('[Mail] Không thể gửi email đặt lại mật khẩu.');
      throw new ServiceUnavailableException(
        'Không gửi được mã đặt lại mật khẩu. Vui lòng thử lại sau.',
      );
    }
  }

  async sendBusinessNotificationEmail(to: string, subject: string, message: string) {
    const from = this.mailUser;
    const password = this.mailPassword;
    if (!from || !password) {
      this.logger.warn('[Mail] Chưa cấu hình SMTP; bỏ qua email nghiệp vụ.');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"PetCare" <${from}>`,
        to,
        subject,
        text: `${message}\n\nTrân trọng,\nPetCare`,
      });
      this.logger.log(`[Mail] Đã gửi email nghiệp vụ: ${subject}`);
    } catch {
      // Giao dịch nghiệp vụ đã lưu thành công; lỗi SMTP không được làm khách mất booking/đơn.
      this.logger.warn(`[Mail] Không gửi được email nghiệp vụ: ${subject}`);
    }
  }

  async sendServicePaymentReceiptEmail(to: string, receipt: ServicePaymentReceiptEmail) {
    const from = this.mailUser;
    const password = this.mailPassword;
    if (!from || !password) {
      this.logger.warn('[Mail] Chưa cấu hình SMTP; bỏ qua email hóa đơn dịch vụ.');
      return;
    }

    const serviceAmount = Math.max(0, receipt.amountPaid - receipt.careFeeAmount);
    const dateLabel = receipt.paidAt.toLocaleString('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const textItems = receipt.items.map((item) => `- ${item.name}: ${formatReceiptAmount(item.amount)}`);
    const htmlItems = receipt.items.map((item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5e9e7">${escapeHtml(item.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e9e7;text-align:right;white-space:nowrap">${formatReceiptAmount(item.amount)}</td>
      </tr>`).join('');
    const transferRow = receipt.transferReference
      ? `<p style="margin:8px 0;color:#66706e">Mã giao dịch: ${escapeHtml(receipt.transferReference)}</p>`
      : '';
    const phoneRow = receipt.customerPhone
      ? `<p style="margin:4px 0;color:#66706e">Điện thoại: ${escapeHtml(receipt.customerPhone)}</p>`
      : '';
    const text = [
      'PETCARE · HÓA ĐƠN THANH TOÁN DỊCH VỤ',
      `Mã lịch: ${receipt.bookingCode}`,
      `Ngày thanh toán: ${dateLabel}`,
      `Khách hàng: ${receipt.customerName}`,
      ...(receipt.customerPhone ? [`Điện thoại: ${receipt.customerPhone}`] : []),
      `Thú cưng: ${receipt.petName}`,
      ...(serviceAmount > 0 ? ['Dịch vụ:', ...textItems, `Tạm tính: ${formatReceiptAmount(receipt.subtotal)}`, ...(receipt.discount > 0 ? [`Ưu đãi: -${formatReceiptAmount(receipt.discount)}`] : [])] : []),
      ...(receipt.careFeeAmount > 0 ? [`Chăm giữ sau giờ đóng cửa: ${formatReceiptAmount(receipt.careFeeAmount)}`] : []),
      `Tổng đã thanh toán: ${formatReceiptAmount(receipt.amountPaid)}`,
      `Phương thức: ${receipt.paymentMethod}`,
      ...(receipt.transferReference ? [`Mã giao dịch: ${receipt.transferReference}`] : []),
      '',
      'PetCare cảm ơn bạn đã tin tưởng và chăm sóc bé cùng chúng tôi.',
    ].join('\n');

    try {
      await this.transporter.sendMail({
        from: `"PetCare" <${from}>`,
        to,
        subject: `Hóa đơn thanh toán dịch vụ PetCare #${receipt.bookingCode}`,
        text,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1f1e">
            <div style="border-bottom:2px solid #1d7980;padding-bottom:14px;margin-bottom:18px">
              <p style="margin:0;color:#1d7980;font-weight:700;letter-spacing:.08em">PETCARE</p>
              <h1 style="font-size:21px;margin:8px 0 0">Hóa đơn thanh toán dịch vụ</h1>
            </div>
            <p style="margin:5px 0"><strong>Mã lịch:</strong> ${escapeHtml(receipt.bookingCode)}</p>
            <p style="margin:5px 0"><strong>Ngày thanh toán:</strong> ${escapeHtml(dateLabel)}</p>
            <p style="margin:5px 0"><strong>Khách hàng:</strong> ${escapeHtml(receipt.customerName)}</p>
            ${phoneRow}
            <p style="margin:5px 0 16px"><strong>Thú cưng:</strong> ${escapeHtml(receipt.petName)}</p>
            ${serviceAmount > 0 ? `
              <table style="width:100%;border-collapse:collapse">
                <tbody>${htmlItems}</tbody>
              </table>
              <div style="display:flex;justify-content:space-between;margin-top:12px;color:#66706e"><span>Tạm tính dịch vụ</span><strong>${formatReceiptAmount(receipt.subtotal)}</strong></div>
              ${receipt.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-top:7px;color:#18754b"><span>Ưu đãi</span><strong>−${formatReceiptAmount(receipt.discount)}</strong></div>` : ''}
            ` : ''}
            ${receipt.careFeeAmount > 0 ? `<div style="display:flex;justify-content:space-between;margin-top:10px;color:#66706e"><span>Chăm giữ sau giờ đóng cửa</span><strong>${formatReceiptAmount(receipt.careFeeAmount)}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;gap:16px;margin-top:18px;padding-top:14px;border-top:1px solid #d7dfdc;font-size:18px;font-weight:700"><span>Đã thanh toán</span><span style="white-space:nowrap">${formatReceiptAmount(receipt.amountPaid)}</span></div>
            <p style="margin:10px 0 4px;color:#66706e">Phương thức: ${escapeHtml(receipt.paymentMethod)}</p>
            ${transferRow}
            <p style="margin:22px 0 0;color:#66706e">PetCare cảm ơn bạn đã tin tưởng và chăm sóc bé cùng chúng tôi.</p>
          </div>
        `,
      });
      this.logger.log(`[Mail] Đã gửi hóa đơn thanh toán đến ${to}`);
    } catch {
      this.logger.warn(`[Mail] Không gửi được hóa đơn thanh toán cho lịch ${receipt.bookingCode}.`);
    }
  }
}
