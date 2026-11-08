using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>A fresh service category with a unique name, for tests that seed services directly (Q-13).</summary>
public static class TestCategories
{
    public static ServiceCategory New() => new() { Name = "Danh mục " + Guid.NewGuid().ToString("N")[..10] };
}
