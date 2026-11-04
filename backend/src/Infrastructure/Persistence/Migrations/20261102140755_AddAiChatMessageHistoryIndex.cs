using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NhuNguyetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAiChatMessageHistoryIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_ai_chat_messages_customer_id",
                table: "ai_chat_messages");

            migrationBuilder.CreateIndex(
                name: "ix_ai_chat_messages_customer_id_created_at_utc",
                table: "ai_chat_messages",
                columns: new[] { "customer_id", "created_at_utc" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_ai_chat_messages_customer_id_created_at_utc",
                table: "ai_chat_messages");

            migrationBuilder.CreateIndex(
                name: "ix_ai_chat_messages_customer_id",
                table: "ai_chat_messages",
                column: "customer_id");
        }
    }
}
