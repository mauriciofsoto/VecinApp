using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class EliminarIndiceRespuestaEncuestaRedundante : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_respuesta_encuesta_id_encuesta",
                table: "respuesta_encuesta");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_respuesta_encuesta_id_encuesta",
                table: "respuesta_encuesta",
                column: "id_encuesta");
        }
    }
}
