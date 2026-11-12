using System.Text.Json;
using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.AiAssistant;
using NhuNguyetSpa.Domain.Exceptions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.AiAssistant;

/// <summary>The <c>final_answer</c> contract (docs/specs/ai-assistant.md: BR-AI-09, AI-T18).</summary>
public sealed class AiFinalAnswerTests
{
    [Theory]
    [InlineData("in_scope", AiAnswerScope.InScope)]
    [InlineData("out_of_scope", AiAnswerScope.OutOfScope)]
    [InlineData("medical", AiAnswerScope.Medical)]
    public void ParsesScope(string scope, AiAnswerScope expected)
    {
        var (parsed, answer) = AiFinalAnswer.Parse(Json($$"""{"scope":"{{scope}}","answer":"  Chào bạn "}"""));

        parsed.Should().Be(expected);
        answer.Should().Be("Chào bạn");
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"scope":"other","answer":"x"}""")]
    [InlineData("""{"scope":"in_scope","answer":"  "}""")]
    [InlineData("""{"scope":5,"answer":"x"}""")]
    [InlineData("""{"scope":"in_scope"}""")]
    [InlineData("[]")]
    public void RejectsInvalidArguments(string json)
    {
        var act = () => AiFinalAnswer.Parse(Json(json));

        act.Should().Throw<ServiceUnavailableException>().Which.Code.Should().Be("ai_unavailable");
    }

    [Fact]
    public void RejectsMissingArguments()
    {
        var act = () => AiFinalAnswer.Parse(null);

        act.Should().Throw<ServiceUnavailableException>().Which.Code.Should().Be("ai_unavailable");
    }

    [Fact]
    public void BlankAnswerIsAcceptedForCannedScopes()
    {
        AiFinalAnswer.Parse(Json("""{"scope":"medical","answer":""}""")).Scope.Should().Be(AiAnswerScope.Medical);
    }

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();
}
