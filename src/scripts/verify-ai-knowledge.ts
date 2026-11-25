import { ConfigService } from '@nestjs/config';
import { AiKnowledgeService } from '../modules/ai-assistant/ai-knowledge.service.js';

// The npm command loads backend .env through Node's --env-file option.
// This only indexes approved public text, never customer data.
const knowledge = new AiKnowledgeService(new ConfigService());
await knowledge.onModuleInit();
const status = knowledge.getStatus();
console.log(JSON.stringify(status, null, 2));
const query = process.argv.slice(2).filter(value => value !== '--').join(' ');
if (query) {
  const context = await knowledge.getRelevantContext(query);
  console.log(context || 'Không tìm được đoạn tài liệu phù hợp.');
}
if (process.env.GEMINI_API_KEY && status.indexedChunks !== status.chunks) {
  console.error('Chưa tạo đủ vector. Tra từ khóa vẫn hoạt động; kiểm tra model/quota/mạng trước khi triển khai semantic retrieval.');
  process.exitCode = 1;
}
