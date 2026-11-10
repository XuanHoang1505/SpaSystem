import { AlertCircle } from 'lucide-react';

export function AiMedicalDisclaimer() {
  return (
    <div
      role="note"
      aria-label="Lưu ý y khoa"
      className="flex items-start gap-2.5 p-3 text-xs rounded-lg bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <p className="leading-relaxed">
        <strong className="font-medium">Lưu ý:</strong> Trợ lý AI chỉ tư vấn thông tin dịch vụ,
        bảng giá và hỗ trợ gợi ý lịch hẹn tại Spa Như Nguyệt; không đưa ra chẩn đoán y khoa hay thay
        thế tư vấn của bác sĩ chuyên khoa da liễu.
      </p>
    </div>
  );
}
