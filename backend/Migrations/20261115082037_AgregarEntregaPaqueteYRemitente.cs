using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarEntregaPaqueteYRemitente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_entrega",
                table: "paquete",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "id_usuario_entrega",
                table: "paquete",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "remitente",
                table: "paquete",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_paquete_id_usuario_entrega",
                table: "paquete",
                column: "id_usuario_entrega");

            migrationBuilder.AddForeignKey(
                name: "FK_paquete_usuario_id_usuario_entrega",
                table: "paquete",
                column: "id_usuario_entrega",
                principalTable: "usuario",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_paquete_usuario_id_usuario_entrega",
                table: "paquete");

            migrationBuilder.DropIndex(
                name: "IX_paquete_id_usuario_entrega",
                table: "paquete");

            migrationBuilder.DropColumn(
                name: "fecha_entrega",
                table: "paquete");

            migrationBuilder.DropColumn(
                name: "id_usuario_entrega",
                table: "paquete");

            migrationBuilder.DropColumn(
                name: "remitente",
                table: "paquete");
        }
    }
}
