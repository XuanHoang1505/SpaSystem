using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.AiAssistant;
using NhuNguyetSpa.Application.Interfaces.Ai;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.AiAssistant;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.UseCases.AiAssistant;

/// <summary>
/// UC-SPA-32. The model only proposes: this service decides the final text from the <c>final_answer</c> scope (BR-AI-01, 09),
/// keeps product and booking cards only for in-scope answers, and saves customers' turns (BR-AI-04).
/// </summary>
public sealed class AiAssistantService : IAiAssistantService
{
    private readonly IAiChatModel _model;
    private readonly AiToolExecutor _tools;
    private readonly IAiChatMessageRepository _messages;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly AiOptions _options;
    private readonly IValidator<AskAiAssistantRequest> _requestValidator;
    private readonly IValidator<AiChatHistoryQuery> _historyValidator;

    public AiAssistantService(
        IAiChatModel model,
        AiToolExecutor tools,
        IAiChatMessageRepository messages,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<AiOptions> options,
        IValidator<AskAiAssistantRequest> requestValidator,
        IValidator<AiChatHistoryQuery> historyValidator)
    {
        _model = model;
        _tools = tools;
        _messages = messages;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options.Value;
        _requestValidator = requestValidator;
        _historyValidator = historyValidator;
    }

    public async Task<OperationResult<AiChatReplyDto>> ChatAsync(AskAiAssistantRequest request, CancellationToken cancellationToken)
    {
        var customerId = CustomerIdOrNull();
        await _requestValidator.ValidateAndThrowAsync(request, cancellationToken);
        var question = request.Question!.Trim();

        IReadOnlyList<AiChatTurn> history = customerId is { } id
            ? (await _messages.GetRecentAsync(id, _options.HistoryTurnsInContext, cancellationToken))
                .Select(message => new AiChatTurn(message.Question, message.Answer)).ToList()
            : [];
        var chat = new AiChatRequest(AiAssistantPrompt.System, history, question, AiToolCatalog.For(customerId is not null),
            AiToolCatalog.FinalAnswer, _options.MaxToolRounds);

        var completion = await CompleteAsync(chat, cancellationToken);
        var (answer, keepCards) = Decide(completion);
        IReadOnlyList<AiProductSuggestionDto> suggestions = keepCards ? _tools.Suggestions.ToList() : [];
        IReadOnlyList<AiBookingProposalDto> proposals = keepCards ? _tools.BookingProposals.ToList() : [];

        if (customerId is not { } owner)
            return OperationResult<AiChatReplyDto>.Success(new AiChatReplyDto(answer, suggestions, proposals, false, null));

        var message = new AiChatMessage
        {
            Id = Guid.NewGuid(), CustomerId = owner, Question = question, Answer = answer, CreatedAtUtc = _clock.UtcNow,
        };
        await _messages.AddAsync(message, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<AiChatReplyDto>.Success(new AiChatReplyDto(answer, suggestions, proposals, true, message.Id));
    }

    public async Task<OperationResult<AiChatHistoryDto>> GetHistoryAsync(AiChatHistoryQuery query, CancellationToken cancellationToken)
    {
        await _historyValidator.ValidateAndThrowAsync(query, cancellationToken);
        var customerId = CustomerIdOrNull() ?? throw AiErrors.StaffNotAllowed();
        var limit = query.Limit ?? _options.History.DefaultLimit;
        var rows = await _messages.GetPageAsync(customerId, query.Before, limit + 1, cancellationToken);
        var items = rows.Take(limit).Select(row => new AiChatMessageDto(row.Id, row.Question, row.Answer, row.CreatedAtUtc)).ToList();
        return OperationResult<AiChatHistoryDto>.Success(new AiChatHistoryDto(items, rows.Count > limit));
    }

    /// <summary>The customer's id; null for a guest; staff and owners are refused (E3, Q-60).</summary>
    private Guid? CustomerIdOrNull()
    {
        if (!_currentUser.IsAuthenticated)
            return null;
        if (!_currentUser.Roles.Contains(Roles.Customer) || _currentUser.UserId is not { } userId)
            throw AiErrors.StaffNotAllowed();
        return userId;
    }

    private async Task<AiChatCompletion> CompleteAsync(AiChatRequest chat, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
        try
        {
            return await _model.CompleteAsync(chat, _tools, timeout.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw AiErrors.Unavailable();
        }
    }

    private static (string Answer, bool KeepCards) Decide(AiChatCompletion completion)
    {
        if (completion.Blocked)
            return (AiCannedAnswers.Blocked, false);
        var (scope, answer) = AiFinalAnswer.Parse(completion.FinalArguments);
        return scope switch
        {
            AiAnswerScope.Medical => (AiCannedAnswers.Medical, false),
            AiAnswerScope.OutOfScope => (AiCannedAnswers.OutOfScope, false),
            _ => (answer, true),
        };
    }
}
