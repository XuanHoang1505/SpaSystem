using FluentAssertions;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Exceptions;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests;

public sealed class FoundationTests
{
    private sealed class TestEntity : BaseAuditableEntity;

    [Fact]
    public void EntityInitializesUniqueIdentityAndUtcCreationTime()
    {
        var before = DateTime.UtcNow;
        var entity = new TestEntity();
        entity.Id.Should().NotBeEmpty().And.NotBe(new TestEntity().Id);
        entity.CreatedAtUtc.Kind.Should().Be(DateTimeKind.Utc);
        entity.CreatedAtUtc.Should().BeOnOrAfter(before).And.BeOnOrBefore(DateTime.UtcNow);
        entity.UpdatedAtUtc.Should().BeNull();
        entity.CreatedBy.Should().BeNull();
    }

    [Fact]
    public void ExceptionsPreserveMessages()
    {
        Exception[] exceptions = [new DomainException("message"), new BusinessRuleException("message"), new NotFoundException("message"), new ConflictException("message")];
        exceptions.Should().OnlyContain(exception => exception.Message == "message");
    }
}
