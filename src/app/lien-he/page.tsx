"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerSiteFrame } from "@/components/layout/customer-ui";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Car,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface ContactFormData {
  fullName: string;
  phone: string;
  email: string;
  topic: string;
  petInfo: string;
  message: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  message?: string;
}

const FAQS = [
  {
    q: "Tôi có cần đặt lịch trước khi đưa thú cưng đến tiệm không?",
    a: "Bạn nên đặt trước để chọn khung giờ còn chỗ. Nếu ghé trực tiếp, tiệm chỉ có thể tiếp nhận khi khung giờ đó còn suất.",
  },
  {
    q: "Mình có thể đổi hoặc hủy lịch Spa khi nào?",
    a: "Bạn có thể tự đổi hoặc hủy lịch trước giờ hẹn ít nhất 4 tiếng. Nếu đã còn dưới 4 tiếng, vui lòng gọi hotline 0941 900 966 để được hỗ trợ.",
  },
  {
    q: "Thú cưng nhát người, sợ nước hoặc chưa đi Spa thì sao?",
    a: "Khi đặt lịch, bạn hãy ghi rõ điều bé sợ hoặc lưu ý cần biết. Nhân viên sẽ trao đổi với bạn về cách tiếp nhận và hạng mục thực hiện trước khi bắt đầu.",
  },
  {
    q: "Giá lúc đặt lịch đã là giá cuối cùng chưa?",
    a: "Giá online là tạm tính theo cân nặng bạn khai. Khi đến tiệm, nhân viên cân lại và xác nhận giá với bạn; dịch vụ chỉ bắt đầu khi bạn đồng ý.",
  },
  {
    q: "Tiệm dùng sản phẩm tắm gội nào?",
    a: "Website chưa liệt kê thương hiệu sản phẩm sử dụng. Nếu bé có tiền sử dị ứng hoặc bạn muốn hỏi về sản phẩm cụ thể, vui lòng gọi 0941 900 966 trước buổi hẹn và nhắc lại với nhân viên khi tiếp nhận.",
  },
  {
    q: "Nếu muốn góp ý sau khi sử dụng dịch vụ thì liên hệ thế nào?",
    a: "Bạn có thể gọi hotline 0941 900 966 hoặc gửi lời nhắn cho tiệm. Hãy mô tả hạng mục đã trao đổi lúc tiếp nhận để nhân viên kiểm tra và phản hồi cách hỗ trợ.",
  },
];

export default function ContactPage() {
  const revealRef = useScrollReveal(".reveal-item", { y: 30, stagger: 0.1 });

  // Form State
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    phone: "",
    email: "",
    topic: "tu-van-spa",
    petInfo: "",
    message: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const validateForm = (): boolean => {
    const errs: FormErrors = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errs.fullName = "Vui lòng cho tiệm biết tên của bạn nhé";
    }

    const phoneClean = formData.phone.trim().replace(/\s+/g, "");
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneClean) {
      errs.phone = "Vui lòng để lại số điện thoại để tiệm tiện gọi lại";
    } else if (!phoneRegex.test(phoneClean)) {
      errs.phone = "Số điện thoại chưa đúng định dạng (ví dụ: 0941900966)";
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = "Định dạng email chưa đúng (ví dụ: tenban@gmail.com)";
      }
    }

    if (!formData.message.trim() || formData.message.trim().length < 6) {
      errs.message = "Vui lòng mô tả ngắn gọn nội dung cần hỗ trợ";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      await apiClient.post("/contact-requests", {
        ...formData,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        petInfo: formData.petInfo.trim() || undefined,
        message: formData.message.trim(),
      });
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Chưa gửi được lời nhắn. Bạn thử lại giúp PetCare nhé.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: "",
      phone: "",
      email: "",
      topic: "tu-van-spa",
      petInfo: "",
      message: "",
    });
    setErrors({});
    setIsSubmitted(false);
    setSubmitError("");
  };

  return (
    <CustomerSiteFrame
      containerRef={revealRef}
      className="selection:bg-[#244B3F] selection:text-white"
    >
      <main className="flex-1 pt-12 pb-24 sm:pt-16 sm:pb-28">
        <header className="contact-page-heading reveal-item">
          <div>
            <p className="customer-page-intro__eyebrow">PetCare</p>
            <h1>Có điều gì cần hỏi cho bé? Mình ở đây.</h1>
            <p>
              Bạn có thể gọi trong giờ hỗ trợ, ghé cửa hàng hoặc để lại lời
              nhắn. Nhân viên sẽ giúp bạn chọn dịch vụ và chuẩn bị cho buổi hẹn.
            </p>
          </div>
          <div className="contact-page-heading__action">
            <a href="tel:0941900966" className="customer-primary-action">
              <Phone className="size-4" aria-hidden="true" /> Gọi 0941 900 966
            </a>
            <span>Hỗ trợ tại cửa hàng 08:30–20:30</span>
          </div>
        </header>

        <section className="mx-auto mb-16 max-w-[1440px] px-5 sm:px-8 lg:px-14">
          <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
            {/* Card 1: Địa Chỉ */}
            <div className="reveal-item flex flex-col justify-between border-t border-[#DEDAD0] py-6">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E5ECE3] text-[#244B3F] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold tracking-wide text-[#244B3F]">
                  Địa chỉ tiệm
                </span>
                <h3 className="text-xl font-black text-[#253B33] mt-1 mb-2">
                  PetCare
                </h3>
                <p className="text-sm text-[#65716A] leading-relaxed mb-4">
                  38 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội (đoạn ngã ba Quan Hoa,
                  đối diện ĐH Giao Thông Vận Tải)
                </p>
                <div className="text-sm text-[#65716A] flex items-center gap-2">
                  <Car className="w-4 h-4 text-[#244B3F] shrink-0" />
                  <span>
                    Gọi tiệm nếu bạn cần hỏi đường đi hoặc chỗ gửi xe.
                  </span>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=38+Cầu+Giấy+Hà+Nội"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-[#244B3F] hover:underline"
              >
                <span>Mở bản đồ Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Card 2: Hotline */}
            <div className="reveal-item flex flex-col justify-between border-t border-[#DEDAD0] py-6">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E5ECE3] text-[#244B3F] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Phone className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-[#244B3F]">
                  Hotline
                </span>
                <h3 className="text-xl font-black text-[#253B33] mt-1 mb-2">
                  0941 900 966
                </h3>
                <p className="text-sm text-[#65716A] leading-relaxed mb-4">
                  Hỏi về dịch vụ, giá tham khảo hoặc đổi/hủy lịch Spa.
                </p>
                <div className="text-sm text-[#65716A] font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8A9A7A]" />
                  <span>Hỗ trợ trực tiếp từ 08:30 - 20:30</span>
                </div>
              </div>
              <a
                href="tel:0941900966"
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#244B3F] hover:underline"
              >
                <span>Bấm gọi hotline ngay</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Card 3: Giờ Mở Cửa */}
            <div className="reveal-item flex flex-col justify-between border-t border-[#DEDAD0] py-6">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E5ECE3] text-[#244B3F] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold tracking-wide text-[#244B3F]">
                  Thời gian đón tiếp
                </span>
                <h3 className="text-xl font-black text-[#253B33] mt-1 mb-2">
                  Spa: 08:30 – 18:30
                </h3>
                <p className="text-sm text-[#65716A] leading-relaxed mb-4">
                  Khung giờ tiếp nhận dịch vụ Spa theo lịch còn chỗ.
                </p>
                <div className="text-sm text-[#65716A]">
                  Giờ hỗ trợ cửa hàng: <strong>08:30 – 20:30</strong>
                </div>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#8A9A7A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8A9A7A]" />
                <span>Gọi trước nếu cần hỗ trợ ngoài giờ Spa</span>
              </div>
            </div>

            {/* Card 4: Email & Góp Ý */}
            <div className="reveal-item flex flex-col justify-between border-t border-[#DEDAD0] py-6">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#F0EEE6] text-[#1B3C33] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold tracking-wide text-[#1B3C33]">
                  Email của tiệm
                </span>
                <h3 className="text-xl font-black text-[#253B33] mt-1 mb-2">
                  contact@petcare.vn
                </h3>
                <p className="text-sm text-[#65716A] leading-relaxed mb-4">
                  Gửi câu hỏi hoặc góp ý cho PetCare qua email.
                </p>
              </div>
              <a
                href="mailto:contact@petcare.vn"
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3C33] hover:underline"
              >
                <span>Gửi thư cho tiệm</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ======================================= */}
        {/* INTERACTIVE CONTACT FORM & MAP SECTION */}
        {/* ======================================= */}
        <section className="mx-auto mb-24 max-w-[1440px] px-5 sm:px-8 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left 7 cols: Contact Form */}
            <div className="border-y border-[#DEDAD0] bg-[#FFFDF8] p-6 sm:p-9 lg:col-span-7 lg:p-10 reveal-item">
              <div className="mb-8">
                <span className="text-xs font-bold tracking-wide text-[#244B3F]">
                  Gửi trực tiếp đến PetCare
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#253B33] tracking-tight mt-1 mb-3">
                  Để lại lời nhắn cho tiệm
                </h2>
                <p className="text-xs sm:text-sm text-[#65716A]">
                  Để lại thông tin liên hệ và nhân viên sẽ gọi lại trong giờ hỗ
                  trợ.
                </p>
              </div>

              {isSubmitted ? (
                <div className="p-8 sm:p-10 rounded-3xl bg-[#F0EEE6] border border-[#244B3F]/20 text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-[#244B3F] text-white flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-[#253B33] mb-2">
                    PetCare đã nhận được lời nhắn
                  </h3>
                  <p className="text-sm text-[#65716A] max-w-md mx-auto leading-relaxed mb-6">
                    Nhân viên sẽ xem yêu cầu và liên hệ với bạn theo số điện
                    thoại đã cung cấp. Nếu cần hỗ trợ gấp, bạn có thể gọi 0941
                    900 966.
                  </p>

                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-6 py-3 rounded-full bg-white border border-[#DEDAD0] text-xs font-bold text-[#253B33] hover:border-[#244B3F] transition-colors cursor-pointer"
                    >
                      Gửi thêm lời nhắn
                    </button>
                    <Link
                      href="/dat-lich"
                      className="px-6 py-3 rounded-full bg-white border border-[#DEDAD0] text-xs font-bold text-[#253B33] hover:border-[#244B3F] transition-colors"
                    >
                      Đặt lịch Spa
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {submitError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                      {submitError}
                    </p>
                  )}
                  {/* Row 1: Full Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-xs font-bold text-[#253B33] mb-2"
                      >
                        Tên của bạn <span className="text-[#C9684D]">*</span>
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            fullName: e.target.value,
                          });
                          if (errors.fullName)
                            setErrors({ ...errors, fullName: undefined });
                        }}
                        placeholder="Ví dụ: Minh Anh"
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl text-xs bg-[#F8F5EF] border text-[#253B33] focus:outline-none focus:ring-1 transition-all",
                          errors.fullName
                            ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                            : "border-[#DEDAD0] focus:border-[#244B3F] focus:ring-[#244B3F]",
                        )}
                      />
                      {errors.fullName && (
                        <p className="mt-1.5 text-[11px] text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-xs font-bold text-[#253B33] mb-2"
                      >
                        Số điện thoại <span className="text-[#C9684D]">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (errors.phone)
                            setErrors({ ...errors, phone: undefined });
                        }}
                        placeholder="Ví dụ: 0941 900 966"
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl text-xs bg-[#F8F5EF] border text-[#253B33] focus:outline-none focus:ring-1 transition-all",
                          errors.phone
                            ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                            : "border-[#DEDAD0] focus:border-[#244B3F] focus:ring-[#244B3F]",
                        )}
                      />
                      {errors.phone && (
                        <p className="mt-1.5 text-[11px] text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Email & Topic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-bold text-[#253B33] mb-2"
                      >
                        Email (nếu có)
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (errors.email)
                            setErrors({ ...errors, email: undefined });
                        }}
                        placeholder="tenban@gmail.com"
                        className={cn(
                          "w-full px-4 py-3 rounded-2xl text-xs bg-[#F8F5EF] border text-[#253B33] focus:outline-none focus:ring-1 transition-all",
                          errors.email
                            ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                            : "border-[#DEDAD0] focus:border-[#244B3F] focus:ring-[#244B3F]",
                        )}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-[11px] text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="topic"
                        className="block text-xs font-bold text-[#253B33] mb-2"
                      >
                        Bạn cần tiệm hỗ trợ gì?
                      </label>
                      <select
                        id="topic"
                        value={formData.topic}
                        onChange={(e) =>
                          setFormData({ ...formData, topic: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-2xl text-xs bg-[#F8F5EF] border border-[#DEDAD0] text-[#253B33] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F]"
                      >
                        <option value="tu-van-spa">
                          Tư vấn gói Spa & Cắt tỉa tạo kiểu
                        </option>
                        <option value="doi-huy-lich">
                          Đổi hoặc hủy lịch Spa
                        </option>
                        <option value="phan-hoi">
                          Góp ý sau khi trải nghiệm dịch vụ
                        </option>
                        <option value="khac">Nội dung khác</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Pet Info (Optional helper) */}
                  <div>
                    <label
                      htmlFor="petInfo"
                      className="block text-xs font-bold text-[#253B33] mb-2"
                    >
                      Thông tin thú cưng (giống và cân nặng ước tính)
                    </label>
                    <input
                      id="petInfo"
                      type="text"
                      value={formData.petInfo}
                      onChange={(e) =>
                        setFormData({ ...formData, petInfo: e.target.value })
                      }
                      placeholder="Ví dụ: Poodle, 3,5 kg; Corgi, 11 kg; mèo Anh lông ngắn"
                      className="w-full px-4 py-3 rounded-2xl text-xs bg-[#F8F5EF] border border-[#DEDAD0] text-[#253B33] focus:outline-none focus:border-[#244B3F] focus:ring-1 focus:ring-[#244B3F]"
                    />
                    <span className="text-[10px] text-[#65716A] mt-1 block">
                      Cân nặng giúp tham khảo giá ban đầu. Nhân viên sẽ cân lại
                      và xác nhận mức phí trước khi bắt đầu dịch vụ.
                    </span>
                  </div>

                  {/* Row 4: Message */}
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-xs font-bold text-[#253B33] mb-2"
                    >
                      Lời nhắn gửi tiệm{" "}
                      <span className="text-[#C9684D]">*</span>
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => {
                        setFormData({ ...formData, message: e.target.value });
                        if (errors.message)
                          setErrors({ ...errors, message: undefined });
                      }}
                      placeholder="Cho tiệm biết lưu ý khi chăm sóc hoặc thời gian bạn dự kiến ghé."
                      className={cn(
                        "w-full px-4 py-3 rounded-2xl text-xs bg-[#F8F5EF] border text-[#253B33] focus:outline-none focus:ring-1 transition-all resize-none",
                        errors.message
                          ? "border-red-400 focus:ring-red-400 bg-red-50/20"
                          : "border-[#DEDAD0] focus:border-[#244B3F] focus:ring-[#244B3F]",
                      )}
                    />
                    {errors.message && (
                      <p className="mt-1.5 text-[11px] text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-[11px] text-[#65716A]">
                      <ShieldCheck className="w-4 h-4 text-[#244B3F]" />
                      <span>Thông tin chỉ dùng để phản hồi yêu cầu này.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-tactile w-full sm:w-auto px-8 py-4 rounded-full bg-[#244B3F] hover:bg-[#1B3C33] text-white font-bold text-xs tracking-wide shadow-md inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang gửi lời nhắn…</span>
                        </>
                      ) : (
                        <>
                          <span>Gửi lời nhắn</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right 5 cols: Interactive Map & Direct Directions */}
            <div className="lg:col-span-5 space-y-6 reveal-item">
              {/* Map Container */}
              <div className="overflow-hidden rounded-3xl border border-[#DEDAD0] bg-[#FFFDF8]">
                <div className="flex flex-col justify-between gap-3 border-b border-[#DEDAD0] p-5 sm:flex-row sm:items-center sm:p-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#244B3F] text-white flex items-center justify-center text-xs font-bold">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#253B33]">
                        Vị trí cửa tiệm
                      </h4>
                      <p className="break-words text-[11px] text-[#65716A]">
                        38 Cầu Giấy, Quan Hoa, Hà Nội
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://maps.google.com/?q=38+Cầu+Giấy+Hà+Nội"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 self-start text-xs font-bold text-[#244B3F] hover:underline sm:self-auto"
                  >
                    <span>Mở Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative aspect-[4/3] w-full bg-[#DEDAD0]">
                  <iframe
                    title="Bản đồ chỉ đường đến PetCare"
                    src="https://maps.google.com/maps?q=38+C%E1%BA%A7u+Gi%E1%BA%A5y,+Quan+Hoa,+C%E1%BA%A7u+Gi%E1%BA%A5y,+H%C3%A0+N%E1%BB%99i&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>

                <div className="space-y-3 p-5 sm:p-6">
                  <h5 className="font-bold text-xs text-[#253B33] tracking-wide">
                    Đến PetCare
                  </h5>
                  <ul className="space-y-2 text-xs text-[#65716A]">
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#244B3F] mt-1.5 shrink-0" />
                      <span>
                        Địa chỉ trên bản đồ: 38 Cầu Giấy, Quan Hoa, Hà Nội.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#244B3F] mt-1.5 shrink-0" />
                      <span>
                        Nếu đi ô tô hoặc cần hỏi chỗ gửi xe, gọi 0941 900 966
                        trước khi ghé.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Booking CTA Mini Box */}
              <div className="flex flex-col items-start justify-between gap-6 bg-[#244B3F] p-6 text-white sm:flex-row sm:items-center sm:p-8">
                <div>
                  <span className="text-xs font-semibold text-[#E5ECE3]">
                    Đặt lịch trực tuyến
                  </span>
                  <h4 className="text-xl font-black mt-1 mb-1">
                    Chọn giờ hẹn còn chỗ
                  </h4>
                  <p className="text-xs text-white/70">
                    Chọn khung giờ phù hợp trước khi ghé tiệm.
                  </p>
                </div>
                <Link
                  href="/dat-lich"
                  className="btn-tactile inline-flex min-h-12 shrink-0 items-center rounded-full bg-[#E5ECE3] px-5 text-sm font-semibold text-[#1B3C33] transition-colors hover:bg-white"
                >
                  Đặt lịch Spa →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================= */}
        {/* FAQ ACCORDION SECTION */}
        {/* ======================================= */}
        <section className="mx-auto max-w-[1000px] px-5 sm:px-8 lg:px-14">
          <div className="text-center max-w-2xl mx-auto mb-12 reveal-item">
            <span className="text-xs font-bold tracking-wide text-[#244B3F]">
              Câu hỏi thường gặp
            </span>
            <h2 className="text-3xl font-black text-[#253B33] tracking-tight mt-1 mb-3">
              Thông tin trước khi ghé tiệm
            </h2>
            <p className="text-xs sm:text-sm text-[#65716A]">
              Thông tin về đặt lịch, giá tham khảo và những điều cần biết trước
              khi tới PetCare.
            </p>
          </div>

          <div className="space-y-4 reveal-item">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="overflow-hidden border-t border-[#DEDAD0] bg-transparent transition-colors last:border-b"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-sm text-[#253B33] hover:text-[#244B3F] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-[#65716A] transition-transform duration-300 shrink-0",
                        isOpen && "rotate-180 text-[#244B3F]",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-[#65716A] leading-relaxed border-t border-[#DEDAD0]/50 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </CustomerSiteFrame>
  );
}
