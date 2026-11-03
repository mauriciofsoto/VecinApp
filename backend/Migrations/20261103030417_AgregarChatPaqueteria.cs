using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarChatPaqueteria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_paquete_usuario_IdUsuarioRegistro",
                table: "paquete");

            migrationBuilder.RenameColumn(
                name: "IdUsuarioRegistro",
                table: "paquete",
                newName: "id_usuario_registro");

            migrationBuilder.RenameIndex(
                name: "IX_paquete_IdUsuarioRegistro",
                table: "paquete",
                newName: "IX_paquete_id_usuario_registro");

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_confirmacion",
                table: "paquete",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_eliminacion",
                table: "paquete",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "id_usuario_destinatario",
                table: "paquete",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "mensaje_paquete",
                columns: table => new
                {
                    id_mensaje_paquete = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_paquete = table.Column<int>(type: "integer", nullable: false),
                    id_usuario_emisor = table.Column<string>(type: "text", nullable: false),
                    contenido = table.Column<string>(type: "text", nullable: false),
                    fecha_envio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mensaje_paquete", x => x.id_mensaje_paquete);
                    table.ForeignKey(
                        name: "FK_mensaje_paquete_paquete_id_paquete",
                        column: x => x.id_paquete,
                        principalTable: "paquete",
                        principalColumn: "id_paquete",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_mensaje_paquete_usuario_id_usuario_emisor",
                        column: x => x.id_usuario_emisor,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_paquete_id_usuario_destinatario",
                table: "paquete",
                column: "id_usuario_destinatario");

            migrationBuilder.CreateIndex(
                name: "IX_mensaje_paquete_id_paquete",
                table: "mensaje_paquete",
                column: "id_paquete");

            migrationBuilder.CreateIndex(
                name: "IX_mensaje_paquete_id_usuario_emisor",
                table: "mensaje_paquete",
                column: "id_usuario_emisor");

            migrationBuilder.AddForeignKey(
                name: "FK_paquete_usuario_id_usuario_destinatario",
                table: "paquete",
                column: "id_usuario_destinatario",
                principalTable: "usuario",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_paquete_usuario_id_usuario_registro",
                table: "paquete",
                column: "id_usuario_registro",
                principalTable: "usuario",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_paquete_usuario_id_usuario_destinatario",
                table: "paquete");

            migrationBuilder.DropForeignKey(
                name: "FK_paquete_usuario_id_usuario_registro",
                table: "paquete");

            migrationBuilder.DropTable(
                name: "mensaje_paquete");

            migrationBuilder.DropIndex(
                name: "IX_paquete_id_usuario_destinatario",
                table: "paquete");

            migrationBuilder.DropColumn(
                name: "fecha_confirmacion",
                table: "paquete");

            migrationBuilder.DropColumn(
                name: "fecha_eliminacion",
                table: "paquete");

            migrationBuilder.DropColumn(
                name: "id_usuario_destinatario",
                table: "paquete");

            migrationBuilder.RenameColumn(
                name: "id_usuario_registro",
                table: "paquete",
                newName: "IdUsuarioRegistro");

            migrationBuilder.RenameIndex(
                name: "IX_paquete_id_usuario_registro",
                table: "paquete",
                newName: "IX_paquete_IdUsuarioRegistro");

            migrationBuilder.AddForeignKey(
                name: "FK_paquete_usuario_IdUsuarioRegistro",
                table: "paquete",
                column: "IdUsuarioRegistro",
                principalTable: "usuario",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
