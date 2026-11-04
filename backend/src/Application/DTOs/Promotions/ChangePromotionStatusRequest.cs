using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Promotions;

public sealed record ChangePromotionStatusRequest(PromotionStatus? Status);
