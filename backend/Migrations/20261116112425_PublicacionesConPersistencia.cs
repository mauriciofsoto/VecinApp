using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class PublicacionesConPersistencia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ComentariosActivos",
                table: "publicacion",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "Prioritaria",
                table: "publicacion",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "fecha_limite",
                table: "publicacion",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "reaccion_publicacion",
                columns: table => new
                {
                    id_reaccion = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_publicacion = table.Column<int>(type: "integer", nullable: false),
                    IdUsuario = table.Column<string>(type: "text", nullable: false),
                    emoji = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reaccion_publicacion", x => x.id_reaccion);
                    table.ForeignKey(
                        name: "FK_reaccion_publicacion_publicacion_id_publicacion",
                        column: x => x.id_publicacion,
                        principalTable: "publicacion",
                        principalColumn: "id_publicacion",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reaccion_publicacion_usuario_IdUsuario",
                        column: x => x.IdUsuario,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_reaccion_publicacion_id_publicacion_IdUsuario_emoji",
                table: "reaccion_publicacion",
                columns: new[] { "id_publicacion", "IdUsuario", "emoji" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reaccion_publicacion_IdUsuario",
                table: "reaccion_publicacion",
                column: "IdUsuario");

            // El catálogo no tenía datos semilla en el proyecto principal.
            // Insertar solo los nombres faltantes permite crear publicaciones sin duplicarlos.
            migrationBuilder.Sql("""
                INSERT INTO categoria_publicacion (nombre)
                SELECT 'publicacion'
                WHERE NOT EXISTS (
                    SELECT 1 FROM categoria_publicacion WHERE lower(nombre) = 'publicacion'
                );

                INSERT INTO categoria_publicacion (nombre)
                SELECT 'aviso'
                WHERE NOT EXISTS (
                    SELECT 1 FROM categoria_publicacion WHERE lower(nombre) = 'aviso'
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reaccion_publicacion");

            migrationBuilder.DropColumn(
                name: "ComentariosActivos",
                table: "publicacion");

            migrationBuilder.DropColumn(
                name: "Prioritaria",
                table: "publicacion");

            migrationBuilder.DropColumn(
                name: "fecha_limite",
                table: "publicacion");
        }
    }
}
