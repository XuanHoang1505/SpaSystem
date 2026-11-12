using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.AiAssistant;
using NhuNguyetSpa.Application.Validators.AiAssistant;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.AiAssistant;

/// <summary>Question and history parameters (docs/specs/ai-assistant.md: E1, E5, BR-AI-03, AI-T01).</summary>
public sealed class AiAssistantValidatorTests
{
    private static readonly AskAiAssistantRequestValidator Question = new(Options.Create(new AiOptions()));
    private static readonly AiChatHistoryQueryValidator History = new(Options.Create(new AiOptions()));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void RejectsBlankQuestion(string? question)
    {
        Question.Validate(new AskAiAssistantRequest { Question = question }).Errors
            .Should().ContainSingle(error => error.PropertyName == nameof(AskAiAssistantRequest.Question)
                && error.ErrorMessage == "Vui lòng nhập câu hỏi.");
    }

    [Fact]
    public void RejectsTooLongQuestion()
    {
        Question.Validate(new AskAiAssistantRequest { Question = new string('a', 1001) }).Errors
            .Should().ContainSingle(error => error.ErrorMessage == "Câu hỏi tối đa 1000 ký tự.");
    }

    [Fact]
    public void RejectsControlCharacters()
    {
        Question.Validate(new AskAiAssistantRequest { Question = "a\u0007b" }).Errors
            .Should().ContainSingle(error => error.ErrorMessage == "Câu hỏi chứa ký tự không hợp lệ.");
    }

    [Fact]
    public void AcceptsLongVietnameseWithNewLines()
    {
        var body = string.Concat(Enumerable.Repeat("Đẹp\nda\t", 200))[..1000];

        Question.Validate(new AskAiAssistantRequest { Question = "  " + body + "\r\n " }).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(51)]
    public void RejectsLimitOutOfRange(int limit)
    {
        History.Validate(new AiChatHistoryQuery { Limit = limit }).Errors
            .Should().ContainSingle(error => error.PropertyName == nameof(AiChatHistoryQuery.Limit)
                && error.ErrorMessage == "Số lượt mỗi trang phải từ 1 đến 50.");
    }

    [Fact]
    public void MissingLimitIsValid()
    {
        History.Validate(new AiChatHistoryQuery()).IsValid.Should().BeTrue();
    }
}
