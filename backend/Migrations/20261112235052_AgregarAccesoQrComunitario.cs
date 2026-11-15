using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarAccesoQrComunitario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "acceso_publico_id",
                table: "edificio",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.CreateTable(
                name: "token_acceso_edificio",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_edificio = table.Column<int>(type: "integer", nullable: false),
                    hash_token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    fecha_creacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fecha_expiracion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_token_acceso_edificio", x => x.id);
                    table.ForeignKey(
                        name: "FK_token_acceso_edificio_edificio_id_edificio",
                        column: x => x.id_edificio,
                        principalTable: "edificio",
                        principalColumn: "id_edificio",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_edificio_acceso_publico_id",
                table: "edificio",
                column: "acceso_publico_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_token_acceso_edificio_hash_token",
                table: "token_acceso_edificio",
                column: "hash_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_token_acceso_edificio_id_edificio_fecha_expiracion",
                table: "token_acceso_edificio",
                columns: new[] { "id_edificio", "fecha_expiracion" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "token_acceso_edificio");

            migrationBuilder.DropIndex(
                name: "IX_edificio_acceso_publico_id",
                table: "edificio");

            migrationBuilder.DropColumn(
                name: "acceso_publico_id",
                table: "edificio");
        }
    }
}
