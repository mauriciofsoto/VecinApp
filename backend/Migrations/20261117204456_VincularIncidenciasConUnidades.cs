using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class VincularIncidenciasConUnidades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_usuario_unidad_IdUsuario",
                table: "usuario_unidad");

            migrationBuilder.AlterColumn<string>(
                name: "tipo_relacion",
                table: "usuario_unidad",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<int>(
                name: "id_unidad",
                table: "incidencia",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_usuario_unidad_IdUsuario_id_unidad_tipo_relacion",
                table: "usuario_unidad",
                columns: new[] { "IdUsuario", "id_unidad", "tipo_relacion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_incidencia_id_unidad",
                table: "incidencia",
                column: "id_unidad");

            migrationBuilder.AddForeignKey(
                name: "FK_incidencia_unidad_id_unidad",
                table: "incidencia",
                column: "id_unidad",
                principalTable: "unidad",
                principalColumn: "id_unidad",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_incidencia_unidad_id_unidad",
                table: "incidencia");

            migrationBuilder.DropIndex(
                name: "IX_usuario_unidad_IdUsuario_id_unidad_tipo_relacion",
                table: "usuario_unidad");

            migrationBuilder.DropIndex(
                name: "IX_incidencia_id_unidad",
                table: "incidencia");

            migrationBuilder.DropColumn(
                name: "id_unidad",
                table: "incidencia");

            migrationBuilder.AlterColumn<string>(
                name: "tipo_relacion",
                table: "usuario_unidad",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.CreateIndex(
                name: "IX_usuario_unidad_IdUsuario",
                table: "usuario_unidad",
                column: "IdUsuario");
        }
    }
}
