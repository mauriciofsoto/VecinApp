using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations;

public partial class PersistirVotosEncuesta : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_respuesta_encuesta_id_encuesta_IdUsuario",
            table: "respuesta_encuesta",
            columns: new[] { "id_encuesta", "IdUsuario" },
            unique: true);

        migrationBuilder.Sql("""
            INSERT INTO categoria_publicacion (nombre)
            SELECT 'encuesta'
            WHERE NOT EXISTS (
                SELECT 1 FROM categoria_publicacion WHERE lower(nombre) = 'encuesta'
            );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_respuesta_encuesta_id_encuesta_IdUsuario",
            table: "respuesta_encuesta");
    }
}
