using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class PaqueteConEdificio : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "id_unidad",
                table: "paquete",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "id_edificio",
                table: "paquete",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE paquete AS p
                SET id_edificio = u.id_edificio
                FROM unidad AS u
                WHERE p.id_unidad = u.id_unidad;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "id_edificio",
                table: "paquete",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_paquete_id_edificio",
                table: "paquete",
                column: "id_edificio");

            migrationBuilder.AddForeignKey(
                name: "FK_paquete_edificio_id_edificio",
                table: "paquete",
                column: "id_edificio",
                principalTable: "edificio",
                principalColumn: "id_edificio",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM paquete WHERE id_unidad IS NULL) THEN
                        RAISE EXCEPTION 'No se puede revertir PaqueteConEdificio: hay paquetes sin unidad.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_paquete_edificio_id_edificio",
                table: "paquete");

            migrationBuilder.DropIndex(
                name: "IX_paquete_id_edificio",
                table: "paquete");

            migrationBuilder.DropColumn(
                name: "id_edificio",
                table: "paquete");

            migrationBuilder.AlterColumn<int>(
                name: "id_unidad",
                table: "paquete",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
