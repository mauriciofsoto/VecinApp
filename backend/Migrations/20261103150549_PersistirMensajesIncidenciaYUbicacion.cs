using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class PersistirMensajesIncidenciaYUbicacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ubicacion",
                table: "incidencia",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "mensaje_incidencia",
                columns: table => new
                {
                    id_mensaje_incidencia = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_incidencia = table.Column<int>(type: "integer", nullable: false),
                    id_usuario_emisor = table.Column<string>(type: "text", nullable: false),
                    contenido = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    fecha_creacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mensaje_incidencia", x => x.id_mensaje_incidencia);
                    table.ForeignKey(
                        name: "FK_mensaje_incidencia_incidencia_id_incidencia",
                        column: x => x.id_incidencia,
                        principalTable: "incidencia",
                        principalColumn: "id_incidencia",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_mensaje_incidencia_usuario_id_usuario_emisor",
                        column: x => x.id_usuario_emisor,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mensaje_incidencia_id_incidencia",
                table: "mensaje_incidencia",
                column: "id_incidencia");

            migrationBuilder.CreateIndex(
                name: "IX_mensaje_incidencia_id_usuario_emisor",
                table: "mensaje_incidencia",
                column: "id_usuario_emisor");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mensaje_incidencia");

            migrationBuilder.DropColumn(
                name: "ubicacion",
                table: "incidencia");
        }
    }
}
