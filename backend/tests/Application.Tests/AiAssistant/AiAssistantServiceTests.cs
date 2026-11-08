using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.AiAssistant;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.Interfaces.Ai;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Catalog;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;
using NhuNguyetSpa.Application.UseCases.AiAssistant;
using NhuNguyetSpa.Application.Validators.AiAssistant;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.AiAssistant;

/// <summary>Chat and history (docs/specs/ai-assistant.md: UC-SPA-32, BR-AI-01, 04, 09, AI-T02…T04, T08…T11, T18).</summary>
public sealed class AiAssistantServiceTests
{
    private static readonly DateTime Now = new(2026, 11, 2, 3, 0, 0, DateTimeKind.Utc);
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid ServiceId = Guid.NewGuid();

    private readonly IAiChatModel _model = Substitute.For<IAiChatModel>();
    private readonly IAiChatMessageRepository _messages = Substitute.For<IAiChatMessageRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _currentUser = Substitute.For<ICurrentUserService>();
    private readonly IDateTimeProvider _clock = Substitute.For<IDateTimeProvider>();
    private readonly IServiceCatalogService _services = Substitute.For<IServiceCatalogService>();
    private readonly IAvailabilityService _availability = Substitute.For<IAvailabilityService>();
    private readonly AiOptions _options = new();

    public AiAssistantServiceTests()
    {
        _clock.UtcNow.Returns(Now);
        _messages.GetRecentAsync(default, default, default).ReturnsForAnyArgs([]);
        _services.GetAsync(ServiceId, Arg.Any<CancellationToken>()).Returns(OperationResult<ServiceDetailDto>.Success(
            new ServiceDetailDto(ServiceId, "Chăm sóc da mặt", Guid.Empty, "Da mặt", null, 350_000, 60, null, CatalogStatus.OnSale, Now, null)));
        _availability.GetAsync(Arg.Any<AvailabilityQuery>(), Arg.Any<CancellationToken>()).Returns(OperationResult<AvailabilityDto>.Success(
            new AvailabilityDto(new DateOnly(2026, 11, 7), 60,
                [new AvailableStaffDto(Guid.NewGuid(), "Lan", [new TimeSlotDto(new TimeOnly(9, 0), new TimeOnly(10, 0))])])));
    }

    [Fact]
    public async Task GuestAnswerNotSaved()
    {
        SignIn(null);
        Answer("in_scope", "Chào bạn");

        var reply = (await Create().ChatAsync(Ask("  Có dịch vụ gì?  "), CancellationToken.None)).Data!;

        reply.Answer.Should().Be("Chào bạn");
        reply.Saved.Should().BeFalse();
        reply.MessageId.Should().BeNull();
        await _messages.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
        await _messages.DidNotReceiveWithAnyArgs().GetRecentAsync(default, default, default);
        await _model.Received(1).CompleteAsync(Arg.Is<AiChatRequest>(request =>
                request.Question == "Có dịch vụ gì?" && request.History.Count == 0 && request.Tools.Count == 6 &&
                request.FinalToolName == "final_answer" && request.MaxToolRounds == 4 && request.SystemPrompt == AiAssistantPrompt.System),
            Arg.Any<IAiToolInvoker>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CustomerAnswerSaved()
    {
        SignIn(Roles.Customer);
        Answer("in_scope", "Chào bạn");
        AiChatMessage? saved = null;
        await _messages.AddAsync(Arg.Do<AiChatMessage>(message => saved = message), Arg.Any<CancellationToken>());

        var reply = (await Create().ChatAsync(Ask(" Gói của tôi? "), CancellationToken.None)).Data!;

        saved.Should().NotBeNull();
        saved!.CustomerId.Should().Be(UserId);
        saved.Question.Should().Be("Gói của tôi?");
        saved.Answer.Should().Be("Chào bạn");
        saved.CreatedAtUtc.Should().Be(Now);
        reply.Saved.Should().BeTrue();
        reply.MessageId.Should().Be(saved.Id);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CustomerHistoryInContext()
    {
        SignIn(Roles.Customer);
        Answer("in_scope", "Ok");
        _messages.GetRecentAsync(UserId, 5, Arg.Any<CancellationToken>()).Returns([
            new AiChatMessage { Question = "Q1", Answer = "A1" }, new AiChatMessage { Question = "Q2", Answer = "A2" },
        ]);

        await Create().ChatAsync(Ask("Q3"), CancellationToken.None);

        await _model.Received(1).CompleteAsync(Arg.Is<AiChatRequest>(request =>
                request.History.SequenceEqual(new[] { new AiChatTurn("Q1", "A1"), new AiChatTurn("Q2", "A2") }) && request.Tools.Count == 8),
            Arg.Any<IAiToolInvoker>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(Roles.Staff)]
    [InlineData(Roles.Owner)]
    public async Task StaffAndOwnerForbidden(string role)
    {
        SignIn(role);

        var act = () => Create().ChatAsync(Ask("Xin chào"), CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenException>().WithMessage("Trợ lý AI hiện chỉ dành cho khách hàng.");
        await _model.DidNotReceiveWithAnyArgs().CompleteAsync(default!, default!, default);
    }

    [Fact]
    public async Task InvalidQuestionNeverReachesTheModel()
    {
        SignIn(null);

        var act = () => Create().ChatAsync(Ask("  "), CancellationToken.None);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
        await _model.DidNotReceiveWithAnyArgs().CompleteAsync(default!, default!, default);
    }

    [Fact]
    public async Task TimeoutIsUnavailable()
    {
        SignIn(Roles.Customer);
        _options.TimeoutSeconds = 1;
        _model.CompleteAsync(Arg.Any<AiChatRequest>(), Arg.Any<IAiToolInvoker>(), Arg.Any<CancellationToken>())
            .Returns(async call =>
            {
                await Task.Delay(Timeout.Infinite, call.Arg<CancellationToken>());
                return new AiChatCompletion(null, false);
            });

        var act = () => Create().ChatAsync(Ask("Xin chào"), CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("ai_unavailable");
        await _messages.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task ModelUnavailablePropagates()
    {
        SignIn(Roles.Customer);
        _model.CompleteAsync(Arg.Any<AiChatRequest>(), Arg.Any<IAiToolInvoker>(), Arg.Any<CancellationToken>()).ThrowsAsync(AiErrors.Unavailable());

        var act = () => Create().ChatAsync(Ask("Xin chào"), CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("ai_unavailable");
        await _messages.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task CallerCancellationIsNotUnavailable()
    {
        SignIn(Roles.Customer);
        using var caller = new CancellationTokenSource();
        _model.CompleteAsync(Arg.Any<AiChatRequest>(), Arg.Any<IAiToolInvoker>(), Arg.Any<CancellationToken>())
            .Returns(async call =>
            {
                await caller.CancelAsync();
                call.Arg<CancellationToken>().ThrowIfCancellationRequested();
                return new AiChatCompletion(null, false);
            });

        var act = () => Create().ChatAsync(Ask("Xin chào"), caller.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        await _messages.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task BlockedGivesCannedAnswer()
    {
        SignIn(Roles.Customer);
        _model.CompleteAsync(default!, default!, default).ReturnsForAnyArgs(new AiChatCompletion(null, true));
        AiChatMessage? saved = null;
        await _messages.AddAsync(Arg.Do<AiChatMessage>(message => saved = message), Arg.Any<CancellationToken>());

        var reply = (await Create().ChatAsync(Ask("..."), CancellationToken.None)).Data!;

        reply.Answer.Should().Be(AiCannedAnswers.Blocked);
        reply.Suggestions.Should().BeEmpty();
        saved!.Answer.Should().Be(AiCannedAnswers.Blocked);
    }

    [Theory]
    [InlineData("medical", AiCannedAnswers.Medical)]
    [InlineData("out_of_scope", AiCannedAnswers.OutOfScope)]
    public async Task MedicalAndOutOfScopeOverrideModelText(string scope, string expected)
    {
        SignIn(Roles.Customer);
        CallToolsThenAnswer(scope, "Bạn nên bôi kem X mỗi tối.");
        AiChatMessage? saved = null;
        await _messages.AddAsync(Arg.Do<AiChatMessage>(message => saved = message), Arg.Any<CancellationToken>());

        var reply = (await Create().ChatAsync(Ask("Da tôi nổi mẩn đỏ là bệnh gì?"), CancellationToken.None)).Data!;

        reply.Answer.Should().Be(expected);
        reply.Suggestions.Should().BeEmpty();
        reply.BookingProposals.Should().BeEmpty();
        saved!.Answer.Should().Be(expected);
    }

    [Fact]
    public async Task InScopeKeepsSuggestionsAndProposals()
    {
        SignIn(null);
        CallToolsThenAnswer("in_scope", "Mời bạn xem dịch vụ này.");

        var reply = (await Create().ChatAsync(Ask("Có dịch vụ da mặt không?"), CancellationToken.None)).Data!;

        reply.Answer.Should().Be("Mời bạn xem dịch vụ này.");
        reply.Suggestions.Should().ContainSingle().Which.ProductId.Should().Be(ServiceId);
        reply.BookingProposals.Should().ContainSingle().Which.Kind.Should().Be(AiBookingKind.BookNow);
    }

    [Fact]
    public async Task MalformedFinalIsUnavailable()
    {
        SignIn(Roles.Customer);
        _model.CompleteAsync(default!, default!, default).ReturnsForAnyArgs(new AiChatCompletion(Json("""{"answer":"x"}"""), false));

        var act = () => Create().ChatAsync(Ask("Xin chào"), CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be("ai_unavailable");
        await _messages.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task HistoryPaging()
    {
        SignIn(Roles.Customer);
        var before = Now.AddDays(-1);
        _messages.GetPageAsync(UserId, before, 21, Arg.Any<CancellationToken>()).Returns(Enumerable.Range(0, 21)
            .Select(i => new AiChatMessage { Id = Guid.NewGuid(), Question = $"Q{i}", Answer = "A", CreatedAtUtc = before.AddMinutes(-i) }).ToList());

        var page = (await Create().GetHistoryAsync(new AiChatHistoryQuery { Before = before }, CancellationToken.None)).Data!;

        page.Items.Should().HaveCount(20);
        page.Items[0].Question.Should().Be("Q0");
        page.HasMore.Should().BeTrue();
    }

    [Fact]
    public async Task HistoryLastPage()
    {
        SignIn(Roles.Customer);
        _messages.GetPageAsync(UserId, null, 6, Arg.Any<CancellationToken>())
            .Returns([new AiChatMessage { Id = Guid.NewGuid(), Question = "Q", Answer = "A", CreatedAtUtc = Now }]);

        var page = (await Create().GetHistoryAsync(new AiChatHistoryQuery { Limit = 5 }, CancellationToken.None)).Data!;

        page.Items.Should().ContainSingle();
        page.HasMore.Should().BeFalse();
    }

    private AiAssistantService Create()
    {
        var options = Options.Create(_options);
        var tools = new AiToolExecutor(_services, Substitute.For<IPackageCatalogService>(), _availability, Substitute.For<IMyAppointmentService>(),
            Substitute.For<IPurchaseService>(), _currentUser, _clock, options);
        return new AiAssistantService(_model, tools, _messages, _unitOfWork, _currentUser, _clock, options,
            new AskAiAssistantRequestValidator(options), new AiChatHistoryQueryValidator(options));
    }

    private void SignIn(string? role)
    {
        _currentUser.IsAuthenticated.Returns(role is not null);
        _currentUser.UserId.Returns(role is null ? null : UserId);
        _currentUser.Roles.Returns(role is null ? [] : [role]);
    }

    private void Answer(string scope, string answer) =>
        _model.CompleteAsync(default!, default!, default).ReturnsForAnyArgs(new AiChatCompletion(Final(scope, answer), false));

    private void CallToolsThenAnswer(string scope, string answer) =>
        _model.CompleteAsync(Arg.Any<AiChatRequest>(), Arg.Any<IAiToolInvoker>(), Arg.Any<CancellationToken>())
            .Returns(async call =>
            {
                var tools = call.Arg<IAiToolInvoker>();
                await tools.InvokeAsync("suggest_products", Json($$"""{"items":[{"productType":"service","id":"{{ServiceId}}"}]}"""), CancellationToken.None);
                await tools.InvokeAsync("propose_booking", Json($$"""{"spaServiceId":"{{ServiceId}}","date":"2026-11-07","startTime":"09:00"}"""), CancellationToken.None);
                return new AiChatCompletion(Final(scope, answer), false);
            });

    private static AskAiAssistantRequest Ask(string question) => new() { Question = question };

    private static JsonElement Final(string scope, string answer) => Json(JsonSerializer.Serialize(new { scope, answer }));

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();
}
