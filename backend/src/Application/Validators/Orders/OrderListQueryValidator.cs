using FluentValidation;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.UseCases.Orders;

namespace NhuNguyetSpa.Application.Validators.Orders;

public sealed class OrderListQueryValidator : AbstractValidator<OrderListQuery>
{
    public OrderListQueryValidator()
    {
        RuleFor(query => query.Status).Must(status => OrderStatusText.TryParse(status, out _))
            .WithMessage("Trạng thái đơn hàng không hợp lệ.");
        RuleFor(query => query.ToDate)
            .Must((query, to) => query.FromDate is null || to is null || to >= query.FromDate)
            .WithMessage("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    }
}
