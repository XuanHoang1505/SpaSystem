namespace NhuNguyetSpa.Application.UseCases.AiAssistant;

/// <summary>How the model labelled its answer in <c>final_answer</c> (BR-AI-09).</summary>
public enum AiAnswerScope
{
    InScope,
    OutOfScope,
    Medical,
}
