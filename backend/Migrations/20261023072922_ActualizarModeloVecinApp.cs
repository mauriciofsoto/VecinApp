using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class ActualizarModeloVecinApp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "codigo_invitacion",
                columns: table => new
                {
                    id_codigo_invitacion = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    codigo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    id_edificio = table.Column<int>(type: "integer", nullable: false),
                    id_rol = table.Column<int>(type: "integer", nullable: false),
                    fecha_expiracion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    usos_maximos = table.Column<int>(type: "integer", nullable: false),
                    usos_realizados = table.Column<int>(type: "integer", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_codigo_invitacion", x => x.id_codigo_invitacion);
                    table.ForeignKey(
                        name: "FK_codigo_invitacion_edificio_id_edificio",
                        column: x => x.id_edificio,
                        principalTable: "edificio",
                        principalColumn: "id_edificio",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_codigo_invitacion_rol_id_rol",
                        column: x => x.id_rol,
                        principalTable: "rol",
                        principalColumn: "id_rol",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_codigo_invitacion_codigo",
                table: "codigo_invitacion",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_codigo_invitacion_id_edificio",
                table: "codigo_invitacion",
                column: "id_edificio");

            migrationBuilder.CreateIndex(
                name: "IX_codigo_invitacion_id_rol",
                table: "codigo_invitacion",
                column: "id_rol");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "codigo_invitacion");
        }
    }
}
