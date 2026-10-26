using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

/// <summary>EF Core implementation of <see cref="IRepository{TEntity}"/>; feature repositories inherit from it.</summary>
public class Repository<TEntity> : IRepository<TEntity> where TEntity : BaseEntity
{
    public Repository(AppDbContext context) => Context = context;

    protected AppDbContext Context { get; }
    protected DbSet<TEntity> Set => Context.Set<TEntity>();

    public Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Set.FirstOrDefaultAsync(entity => entity.Id == id, cancellationToken);

    public async Task AddAsync(TEntity entity, CancellationToken cancellationToken = default) =>
        await Set.AddAsync(entity, cancellationToken);

    public void Remove(TEntity entity) => Set.Remove(entity);
}
