import { ChevronDownIcon, MessageCircleQuestionIcon } from 'lucide-react';
import { catalogPolicies } from '../catalogPolicies';

interface Faq {
  question: string;
  answer: string;
}

const changeOrCancel: Faq = {
  question: 'Tôi có thể đổi giờ hoặc hủy lịch hẹn không?',
  answer: `Bạn có thể đổi giờ hoặc hủy lịch đã xác nhận trước giờ hẹn ít nhất ${catalogPolicies.customerChangeCutoffHours} giờ, ngay trong mục lịch hẹn của bạn. Khi hủy, dịch vụ hoặc buổi đã mua được trả lại để bạn đặt lịch khác.`,
};

const payment: Faq = {
  question: 'Tôi thanh toán bằng cách nào?',
  answer: 'Spa nhận thanh toán trực tuyến qua cổng VNPay ngay khi đặt mua.',
};

const assistant: Faq = {
  question: 'Trợ lý tư vấn có chẩn đoán tình trạng da không?',
  answer:
    'Không. Trợ lý chỉ gợi ý dịch vụ phù hợp, không chẩn đoán hay kê đơn. Nếu da đang có vấn đề cần điều trị, bạn nên hỏi ý kiến bác sĩ da liễu.',
};

const faqs: Record<'service' | 'package', readonly Faq[]> = {
  service: [
    {
      question: '"Đặt ngay" có giữ chỗ cho tôi không?',
      answer: `Có. Giờ bạn chọn được giữ lại và bạn cần thanh toán trong ${catalogPolicies.paymentTimeoutMinutes} phút; quá thời gian mà chưa thanh toán, chỗ sẽ được nhả cho khách khác.`,
    },
    {
      question: 'Tôi có thể mua trước rồi đặt lịch sau không?',
      answer:
        'Được. Sau khi thanh toán, dịch vụ nằm trong mục dịch vụ đã mua và bạn đặt lịch khi thuận tiện, không cần trả thêm.',
    },
    changeOrCancel,
    payment,
    assistant,
  ],
  package: [
    {
      question: 'Gói dùng được trong bao lâu?',
      answer:
        'Mỗi gói có thời hạn sử dụng tính kể từ ngày thanh toán. Hết hạn, các buổi chưa dùng sẽ không đặt lịch được nữa.',
    },
    {
      question: 'Các buổi trong gói được đặt thế nào?',
      answer:
        'Bạn đặt lần lượt từng buổi theo trình tự liệu trình; mỗi buổi cần cách buổi trước ít nhất số ngày quy định trong gói.',
    },
    changeOrCancel,
    payment,
    assistant,
  ],
};

/** "Câu hỏi thường gặp": câu trả lời lấy từ quy định thật của hệ thống (catalogPolicies), không có lời hứa y khoa. */
export function CatalogFaq({ kind }: { kind: 'service' | 'package' }) {
  return (
    <section aria-labelledby="catalog-faq" className="space-y-5">
      <h2 id="catalog-faq" className="flex items-center gap-2 text-2xl sm:text-3xl">
        <MessageCircleQuestionIcon className="size-6 text-primary" aria-hidden="true" />
        Câu hỏi thường gặp
      </h2>
      <div className="divide-y rounded-xl border bg-card">
        {faqs[kind].map((faq) => (
          <details key={faq.question} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {faq.question}
              <ChevronDownIcon
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
