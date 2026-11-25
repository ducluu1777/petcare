import { createInterface } from 'node:readline/promises';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function readSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error('Nhập mật khẩu cần chạy lệnh trong terminal tương tác.'));
  }

  return new Promise((resolve, reject) => {
    const wasRaw = process.stdin.isRaw ?? false;
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    const finish = (error?: Error) => {
      process.stdin.off('data', handleInput);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const handleInput = (chunk: string | Buffer) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          finish(new Error('Đã hủy thao tác.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        if (character.charCodeAt(0) >= 32) value += character;
      }
    };

    process.stdin.on('data', handleInput);
  });
}

async function confirmReset(): Promise<boolean> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question('Tài khoản đã có mật khẩu. Gõ RESET để cấp lại: ');
    return answer.trim() === 'RESET';
  } finally {
    readline.close();
  }
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error('Cách dùng: npm run admin:set-password -- <email Admin/Staff>');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, isActive: true, deletedAt: true },
  });

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.STAFF)) {
    throw new Error('Không tìm thấy tài khoản Admin/Staff với email này.');
  }
  if (!user.isActive || user.deletedAt) {
    throw new Error('Tài khoản đã bị khóa hoặc lưu trữ.');
  }

  const existing = await prisma.adminCredential.findUnique({ where: { userId: user.id } });
  if (existing && !(await confirmReset())) {
    console.log('Đã hủy; mật khẩu hiện tại không thay đổi.');
    return;
  }

  const password = await readSecret('Mật khẩu mới (ít nhất 12 ký tự): ');
  const confirmation = await readSecret('Nhập lại mật khẩu: ');
  if (password !== confirmation) throw new Error('Hai lần nhập mật khẩu không khớp.');
  if (password.length < 12) throw new Error('Mật khẩu phải có ít nhất 12 ký tự.');
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Mật khẩu vượt giới hạn 72 byte của bcrypt.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminCredential.upsert({
    where: { userId: user.id },
    create: { userId: user.id, passwordHash },
    update: { passwordHash },
  });

  console.log(`Đã cập nhật mật khẩu cho ${email}. Hash được lưu trong cơ sở dữ liệu.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Không thể cập nhật mật khẩu.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
