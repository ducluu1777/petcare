export const PETCARE_CONVERSATION_STYLE = `
CÁCH TRÒ CHUYỆN VỚI KHÁCH:
- Nói tự nhiên như người tư vấn tại cửa hàng: xưng "mình", gọi khách là "bạn", gọi thú cưng là "bé" khi phù hợp. Bạn là trợ lý trực tuyến, không giả làm nhân viên đang có mặt tại quầy.
- Trả lời thẳng điều khách đang cần bằng 1–3 câu, trừ khi họ yêu cầu chi tiết. Không mở đầu mọi lượt bằng lời chào, tự giới thiệu hoặc "Rất vui được hỗ trợ". Không dùng emoji, không lạm dụng "dạ", "ạ", "nhé".
- Đọc lịch sử để hiểu câu trả lời ngắn như "mèo", "3kg", "mai nhé". Không hỏi lại thông tin khách đã cung cấp. Khi cần làm rõ, chỉ hỏi một câu hỏi cụ thể về thông tin còn thiếu để tiếp tục.
- Lời chào, cảm ơn, tạm biệt là hội thoại bình thường, không phải câu hỏi thiếu dữ liệu. Nếu khách nói chưa rõ, hỏi nhẹ nhàng thay vì "không hiểu câu hỏi" hay "không tìm được thông tin phù hợp".
- Không đọc nguyên quy định hoặc liệt kê toàn bộ dịch vụ khi khách chỉ hỏi một việc. Chỉ đưa lưu ý liên quan, không giải thích thuật ngữ nội bộ như API, vector, backend, SePay hay trạng thái lập trình. Khi khách hỏi về chính các thuật ngữ đó thì có thể giải thích ngắn gọn.
- Không sao chép nguyên văn tài liệu kiến thức; hãy chuyển đúng thông tin liên quan thành lời tư vấn tự nhiên, chỉ nêu các bước cần thiết cho câu hỏi hiện tại.
- Ví dụ: khách nói "muốn tắm cho bé" nhưng chưa nói loài → "Bé nhà bạn là chó hay mèo?"; khách đã nói mèo 3kg → tra giá dịch vụ phù hợp rồi báo giá, không hỏi lại loài/cân nặng. Không dùng giá hay lịch trống trong ví dụ làm dữ liệu thật.
- Nếu không tra được dữ liệu, nói cụ thể việc chưa làm được và gợi ý một bước tiếp theo. Không hứa đã đặt lịch, gọi điện, nhắn tin hay xác nhận thanh toán thay khách.
`;

/** Only complete social messages bypass retrieval; mixed questions keep their intent. */
export function getSocialReply(message: string): string | null {
  const normalized = message.toLowerCase().normalize('NFD')
    .replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/^(?:(?:hello+|hi+|hey|xin chao|chao)(?: (?:shop|petcare|ban))?|alo+(?: shop)?|(?:shop|petcare|ban) oi|co ai (?:khong|ko|khong a))$/.test(normalized)) {
    return 'Chào bạn, PetCare nghe đây. Bạn cần mình giúp gì?';
  }
  if (/^(?:cam on(?: (?:ban|shop|petcare))?(?: (?:nhe|nha|a))?|thanks?(?: (?:shop|nhe))?|thank you)$/.test(normalized)) {
    return 'Không có gì bạn nhé. Cần hỗ trợ thêm thì cứ nhắn mình.';
  }
  if (/^(?:tam biet(?: (?:ban|shop))?|bye(?: bye)?|bai)$/.test(normalized)) {
    return 'Hẹn gặp bạn và bé tại PetCare!';
  }
  return null;
}

export function readConversationSpecies(message: string): 'cat' | 'dog' | undefined {
  const normalized = normalizeConversationText(message);
  if (/\bmeo\b/.test(normalized) || (/\bcat\b/.test(normalized) && !/\bcat (tia|mong|long|va|kieu)\b/.test(normalized))) return 'cat';
  // "cho bé" is a preposition; it must not silently become the species "chó".
  if (/(?:^|[^\p{L}])chó(?:$|[^\p{L}])/u.test(message.toLowerCase()) || /\b(dog|cun)\b/.test(normalized) || /\bcho\b(?!\s+(?:be|meo|cun|thu cung|minh|toi|ban)\b)/.test(normalized)) return 'dog';
  return undefined;
}

/** Human support is an explicit customer intent, not a document-search query. */
export function getHumanSupportReply(message: string): string | null {
  const normalized = normalizeConversationText(message);
  if (/\bkhong (?:can|muon) (?:gap|noi chuyen|lien he|nhan vien)\b/.test(normalized)) return null;
  const asksForPerson = /\b(?:gap|noi chuyen|ket noi|lien he|chuyen|goi|can|muon|talk)\b.{0,60}\b(?:nhan vien|nguoi that|tu van vien|nguoi ho tro|support|human|staff)\b/.test(normalized);
  const asksForContact = /\bhotline\b/.test(normalized)
    || /\b(?:so dien thoai|sdt)\b.{0,25}\b(?:shop|petcare|tiem|cua hang)\b/.test(normalized)
    || /^(?:so dien thoai|sdt)[?!.\s]*$/.test(normalized.trim());
  if (!asksForPerson && !asksForContact) return null;
  return 'Bạn gọi [0941 900 966](tel:0941900966) để trao đổi trực tiếp với nhân viên nhé. Bạn cũng có thể xem [trang liên hệ](/lien-he).\n\nKhung chat này hiện chưa có nhân viên tiếp nhận trực tiếp.';
}

function normalizeConversationText(message: string): string {
  return message.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd');
}

/** Carry only explicit customer facts into a short service follow-up, including offline. */
export function resolveServiceFollowUp(message: string, history: { role: string; content: string }[]): string {
  const isFragment = (text: string) => /^(?:(?:be|nha|minh|toi|la|meo|cho|cun|cat|dog|nang|khoang|nhe|nha|a|kg|\d+(?:[.,]\d+)?)\s*)+$/.test(normalizeConversationText(text).replace(/[!?]/g, '').trim());
  if (!isFragment(message)) return message;
  let species = readConversationSpecies(message);
  let weight = message.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)?.[1];
  for (const turn of history.slice(-10).reverse()) {
    if (turn.role !== 'user' || getSocialReply(turn.content)) continue;
    const normalized = normalizeConversationText(turn.content);
    if (/\b(san pham|thuc an|sua tam|mua|pate|hat)\b/.test(normalized)) return message;
    const service = /\b(grooming|cat tia|tao kieu)\b/.test(normalized) ? 'Grooming' : /\b(tam|spa)\b/.test(normalized) ? 'tắm Spa' : null;
    if (!service && !isFragment(turn.content)) return message;
    species ??= readConversationSpecies(turn.content);
    weight ??= turn.content.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)?.[1];
    if (service) return ['Mình muốn', service, species === 'cat' ? 'mèo' : species === 'dog' ? 'chó' : '', weight ? `${weight} kg` : ''].filter(Boolean).join(' ');
  }
  return message;
}
