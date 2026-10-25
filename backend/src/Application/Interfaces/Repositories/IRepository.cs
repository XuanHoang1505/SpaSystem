using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>
/// Basic persistence for one aggregate. Feature repositories (for example <c>IAppointmentRepository</c>)
/// extend this with their own queries. Changes are saved through <c>IUnitOfWork</c>.
/// </summary>
public interface IRepository<TEntity> where TEntity : BaseEntity
{
    Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(TEntity entity, CancellationToken cancellationToken = default);
    void Remove(TEntity entity);
}
