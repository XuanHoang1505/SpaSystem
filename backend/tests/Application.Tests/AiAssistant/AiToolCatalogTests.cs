using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.AiAssistant;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.AiAssistant;

/// <summary>Which tools the model gets (docs/specs/ai-assistant.md: BR-AI-02, A3).</summary>
public sealed class AiToolCatalogTests
{
    [Fact]
    public void CatalogForGuestHasNoPersonalTools()
    {
        AiToolCatalog.For(isCustomer: false).Select(tool => tool.Name).Should().BeEquivalentTo(
            "search_catalog", "get_product_detail", "find_available_slots", "suggest_products", "propose_booking", "final_answer");
    }

    [Fact]
    public void CatalogForCustomerHasAllTools()
    {
        AiToolCatalog.For(isCustomer: true).Select(tool => tool.Name).Should().BeEquivalentTo(
            "search_catalog", "get_product_detail", "find_available_slots", "list_my_appointments", "list_my_packages",
            "suggest_products", "propose_booking", "final_answer");
    }

    [Fact]
    public void EverySchemaIsAnObject()
    {
        AiToolCatalog.For(isCustomer: true).Should().OnlyContain(tool =>
            tool.Parameters.GetProperty("type").GetString() == "object" && tool.Description.Length > 0);
    }

    [Fact]
    public void FinalAnswerRequiresScopeAndAnswer()
    {
        var finalAnswer = AiToolCatalog.For(isCustomer: false).Single(tool => tool.Name == AiToolCatalog.FinalAnswer);

        finalAnswer.Parameters.GetProperty("required").EnumerateArray().Select(item => item.GetString())
            .Should().BeEquivalentTo("scope", "answer");
        finalAnswer.Parameters.GetProperty("properties").GetProperty("scope").GetProperty("enum").EnumerateArray()
            .Select(item => item.GetString()).Should().BeEquivalentTo("in_scope", "out_of_scope", "medical");
    }
}
