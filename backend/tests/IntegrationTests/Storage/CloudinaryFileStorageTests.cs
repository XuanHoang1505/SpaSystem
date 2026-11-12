using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Infrastructure.Storage;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Storage;

/// <summary>Configuration handling of the Cloudinary adapter; no network calls (CAT-T28).</summary>
public sealed class CloudinaryFileStorageTests
{
    private const string Secret = "super-secret-value";

    [Theory]
    [InlineData("", "key", Secret)]
    [InlineData("cloud", "", Secret)]
    [InlineData("cloud", "key", "")]
    public async Task MissingCredentialsThrowImageStorageUnavailableWithoutLeakingValues(string cloud, string key, string secret)
    {
        var logger = new ListLogger();
        var storage = new CloudinaryFileStorage(Options.Create(new CloudinaryOptions { CloudName = cloud, ApiKey = key, ApiSecret = secret }), logger);

        var upload = () => storage.UploadImageAsync(new MemoryStream([1, 2, 3]), "services/x", "image/jpeg", CancellationToken.None);
        var delete = () => storage.DeleteAsync("services/x", CancellationToken.None);

        var error = (await upload.Should().ThrowAsync<ServiceUnavailableException>()).Which;
        error.Code.Should().Be("image_storage_unavailable");
        error.Message.Should().NotContain(Secret);
        (await delete.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("image_storage_unavailable");
        logger.Messages.Should().NotBeEmpty().And.OnlyContain(message => !message.Contains(Secret));
    }

    private sealed class ListLogger : ILogger<CloudinaryFileStorage>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Messages.Add(formatter(state, exception));
    }
}
