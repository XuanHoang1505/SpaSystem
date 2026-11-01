namespace NhuNguyetSpa.Application.DTOs.Reports;

/// <summary>The exported <c>.xlsx</c> report (BR-RPT-05).</summary>
public sealed record RevenueReportFile(byte[] Content, string FileName);
