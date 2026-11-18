using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarComentarioResolucionIncidencia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "comentario_resolucion",
                table: "incidencia",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "comentario_resolucion",
                table: "incidencia");
        }
    }
}
