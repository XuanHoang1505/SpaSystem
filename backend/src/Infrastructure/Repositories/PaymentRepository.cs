using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Payments;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class PaymentRepository : Repository<Payment>, IPaymentRepository
{
    public PaymentRepository(AppDbContext context) : base(context)
    {
    }

    public Task<PaymentReference?> FindByRequestCodeAsync(string requestCode, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(payment => payment.RequestCode == requestCode)
        .Select(payment => new PaymentReference(payment.Id, payment.OrderId))
        .FirstOrDefaultAsync(cancellationToken);
}
