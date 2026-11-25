import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";

const questions = [
  ["Đặt lịch chăm sóc cho bé ra sao?", "Đăng nhập, chọn hồ sơ của bé, dịch vụ, cân nặng ước tính và khung giờ còn chỗ. Khi bé đến, nhân viên cân lại và xác nhận mức giá cùng bạn trước khi bắt đầu."],
  ["Khi nào tôi có thể đổi hoặc hủy lịch?", "Bạn có thể tự đổi hoặc hủy lịch trước giờ hẹn ít nhất 4 tiếng. Trong 4 tiếng cuối, hãy gọi PetCare để nhân viên hỗ trợ."],
  ["Khi nào thanh toán dịch vụ Spa?", "Bạn thanh toán tại quầy khi đến đón bé. Nhân viên sẽ nhắn bạn khi buổi chăm sóc hoàn tất và bé đã sẵn sàng."],
  ["PetCare có giao hàng tận nhà không?", "Khi địa chỉ nằm trong khu vực phục vụ, bạn có thể chọn PetCare giao hàng. Phí giao sẽ hiện trước khi xác nhận đơn. Nếu chưa có khu vực của bạn, bạn vẫn có thể chọn nhận hàng tại cửa hàng."],
  ["Tôi thanh toán đơn hàng sản phẩm thế nào?", "Sau khi xác nhận đơn, bạn sẽ được chuyển tới trang thanh toán riêng để quét mã QR. Đơn tự hủy nếu chưa thanh toán đúng hạn; nếu đã chuyển tiền mà đơn chưa cập nhật, hãy liên hệ PetCare."],
];

export default function FrequentlyAskedQuestions() {
  return (
    <CustomerSiteFrame>
      <main className="flex-1 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14">
          <header className="faq-page-heading">
            <div>
              <p className="customer-page-intro__eyebrow">Câu hỏi thường gặp</p>
              <h1>Điều bạn cần biết trước khi ghé tiệm.</h1>
              <p>Vài câu trả lời ngắn gọn về đặt lịch, thanh toán và nhận hàng. Bạn vẫn có thể liên hệ PetCare khi cần hỏi thêm.</p>
            </div>
            <div className="faq-page-heading__contact">
              <p>Cần hỏi trực tiếp?</p>
              <a href="tel:0941900966">0941 900 966 <ArrowUpRight className="size-5" aria-hidden="true" /></a>
              <span>Cửa hàng 08:30–20:30 · Spa đến 18:30</span>
            </div>
          </header>

          <section className="mx-auto max-w-[900px] border-t border-[#DEDAD0]" aria-label="Danh sách câu hỏi">
            {questions.map(([question, answer], index) => (
              <details key={question} open={index === 0} className="group border-b border-[#DEDAD0] py-5 sm:py-6">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 gap-4"><span className="min-w-0 text-base font-semibold leading-6 text-[#244B3F] sm:text-lg">{question}</span></span>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#DEDAD0] text-[#244B3F] transition-transform group-open:rotate-45"><Plus className="size-4" /></span>
                </summary>
                <p className="ml-9 mt-3 max-w-[64ch] text-sm leading-7 text-[#65716A] sm:ml-12">{answer}</p>
              </details>
            ))}
            <Link href="/lien-he" className="customer-primary-action mt-7">Cần hỗ trợ thêm? Liên hệ PetCare <ArrowUpRight className="size-4" /></Link>
          </section>
        </div>
      </main>
    </CustomerSiteFrame>
  );
}
