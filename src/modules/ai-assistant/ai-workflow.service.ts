import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service.js';
import { planAiWorkflow } from './ai-workflow-intent.js';

@Injectable()
export class AiWorkflowService {
  constructor(private readonly products: ProductsService) {}

  async reply(message: string, history: { role: string; content: string }[]) {
    const normalized = message.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd');
    if (/\b(?:khong|ko) (?:mua|dat)(?: lich)? nua\b|\bdung lai\b/.test(normalized)) {
      return { text: 'Được, mình dừng phần lựa chọn ở đây. Với lịch hoặc đơn đã tạo trước đó, bạn kiểm tra tại [Tài khoản](/tai-khoan); tin nhắn này chưa hủy giao dịch đã có.' };
    }
    const plan = planAiWorkflow(message, history);
    if (!plan) return null;
    if (plan.kind === 'booking') {
      return { text: 'Mình giúp bạn đặt lịch ngay tại đây. Bạn chọn hồ sơ của bé, dịch vụ và giờ còn chỗ bên dưới; mình sẽ đưa bản tóm tắt để bạn xác nhận trước khi đặt.', workflow: plan };
    }
    let candidates: Awaited<ReturnType<ProductsService['recommend']>>;
    try {
      candidates = await this.products.recommend(plan.species, plan.weightKg);
    } catch {
      return { text: 'Chưa tải được danh sách sản phẩm lúc này. Bạn thử lại bằng nút bên dưới hoặc xem [cửa hàng](/cua-hang) nhé.', workflow: { ...plan, products: [] } };
    }
    const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd');
    const products = candidates.filter(product => product.stock > 0 && Number(product.price) > 0 && (!plan.category || product.category === plan.category)
      && (!plan.search || normalize(product.name).includes(normalize(plan.search)))).slice(0, 6).map(product => ({
      id: product.id, name: product.name, slug: product.slug, category: product.category, description: product.description,
      price: Number(product.price), stock: product.stock, imageUrl: product.imageUrl, suitableSpecies: product.suitableSpecies,
    }));
    const text = !plan.species
      ? 'Bé nhà bạn là chó hay mèo? Bạn có thể chọn loài và sản phẩm bên dưới để xem đúng hàng đang bán.'
      : products.length
        ? `Mình tìm được các sản phẩm đang còn hàng theo thông tin bạn cung cấp. Bạn xem mô tả và chọn số lượng; chỉ thêm giỏ khi bạn bấm xác nhận.`
        : 'Mình chưa tìm thấy sản phẩm còn hàng khớp bộ lọc này. Bạn có thể đổi bộ lọc hoặc tìm tên sản phẩm bên dưới.';
    return { text, workflow: { ...plan, products } };
  }
}
