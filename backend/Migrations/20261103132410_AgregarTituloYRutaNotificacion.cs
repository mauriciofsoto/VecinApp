using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarTituloYRutaNotificacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_notificacion_IdUsuario",
                table: "notificacion");

            migrationBuilder.AddColumn<string>(
                name: "ruta",
                table: "notificacion",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "titulo",
                table: "notificacion",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                "UPDATE notificacion SET titulo = tipo WHERE titulo = '';");

            migrationBuilder.CreateIndex(
                name: "IX_notificacion_IdUsuario_leida_fecha",
                table: "notificacion",
                columns: new[] { "IdUsuario", "leida", "fecha" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_notificacion_IdUsuario_leida_fecha",
                table: "notificacion");

            migrationBuilder.DropColumn(
                name: "ruta",
                table: "notificacion");

            migrationBuilder.DropColumn(
                name: "titulo",
                table: "notificacion");

            migrationBuilder.CreateIndex(
                name: "IX_notificacion_IdUsuario",
                table: "notificacion",
                column: "IdUsuario");
        }
    }
}
