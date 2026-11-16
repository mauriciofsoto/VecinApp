using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VecinApp.Data;

#nullable disable

namespace VecinApp.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261115150000_AgregarDerivacionesIncidencia")]
public partial class AgregarDerivacionesIncidencia : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "derivacion_incidencia",
            columns: table => new
            {
                id_derivacion_incidencia = table.Column<int>(type: "integer", nullable: false).Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                id_incidencia = table.Column<int>(type: "integer", nullable: false),
                id_usuario_administrador = table.Column<string>(type: "text", nullable: false),
                id_usuario_destinatario = table.Column<string>(type: "text", nullable: false),
                tipo_destinatario = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                id_unidad = table.Column<int>(type: "integer", nullable: true),
                fecha_derivacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_derivacion_incidencia", x => x.id_derivacion_incidencia);
                table.ForeignKey("fk_derivacion_incidencia_incidencia_id_incidencia", x => x.id_incidencia, "incidencia", "id_incidencia", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("fk_derivacion_incidencia_usuario_id_usuario_administrador", x => x.id_usuario_administrador, "usuario", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("fk_derivacion_incidencia_usuario_id_usuario_destinatario", x => x.id_usuario_destinatario, "usuario", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("fk_derivacion_incidencia_unidad_id_unidad", x => x.id_unidad, "unidad", "id_unidad", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex("ix_derivacion_incidencia_id_incidencia_id_usuario_destinatario_tipo_destinatario", "derivacion_incidencia", new[] { "id_incidencia", "id_usuario_destinatario", "tipo_destinatario" }, unique: true);
        migrationBuilder.CreateIndex("ix_derivacion_incidencia_id_usuario_administrador", "derivacion_incidencia", "id_usuario_administrador");
        migrationBuilder.CreateIndex("ix_derivacion_incidencia_id_usuario_destinatario", "derivacion_incidencia", "id_usuario_destinatario");
        migrationBuilder.CreateIndex("ix_derivacion_incidencia_id_unidad", "derivacion_incidencia", "id_unidad");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("derivacion_incidencia");
}
