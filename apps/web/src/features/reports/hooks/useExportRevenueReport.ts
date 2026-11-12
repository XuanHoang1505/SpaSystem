import { useState } from 'react';
import { toast } from 'sonner';
import type { RevenueReportQuery } from '@spa/shared-types';
import { callReportsBlob } from '@/lib/api/reports';
import { getVietnamToday } from '../formatters';

export function useExportRevenueReport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportReport = async (query?: RevenueReportQuery) => {
    try {
      setIsExporting(true);
      const blob = await callReportsBlob((api) => api.exportRevenue(query));

      const from = query?.fromDate || '01-01';
      const to = query?.toDate || getVietnamToday();
      const filename = `doanh-thu_${from}_${to}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Xuất báo cáo doanh thu thành công.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể xuất file báo cáo. Vui lòng thử lại sau.';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportReport,
    isExporting,
  };
}
