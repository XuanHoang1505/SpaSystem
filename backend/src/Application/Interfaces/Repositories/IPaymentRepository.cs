using NhuNguyetSpa.Application.DTOs.Payments;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IPaymentRepository : IRepository<Payment>
{
    /// <summary>Untracked lookup of the gateway's transaction reference (<c>payments.request_code</c>).</summary>
    Task<PaymentReference?> FindByRequestCodeAsync(string requestCode, CancellationToken cancellationToken);
}
