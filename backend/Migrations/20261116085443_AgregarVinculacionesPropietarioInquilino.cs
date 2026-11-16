using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarVinculacionesPropietarioInquilino : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "identificacion_relacion",
                table: "declaracion_unidad_comunitaria",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "persona_relacion_apellido",
                table: "declaracion_unidad_comunitaria",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "persona_relacion_nombre",
                table: "declaracion_unidad_comunitaria",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "piso_relacion",
                table: "declaracion_unidad_comunitaria",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "solicitud_vinculacion",
                columns: table => new
                {
                    id_solicitud_vinculacion = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_propietario = table.Column<string>(type: "text", nullable: false),
                    id_inquilino = table.Column<string>(type: "text", nullable: false),
                    id_unidad = table.Column<int>(type: "integer", nullable: false),
                    id_declaracion_propietario = table.Column<int>(type: "integer", nullable: true),
                    id_declaracion_inquilino = table.Column<int>(type: "integer", nullable: true),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    propietario_acepto = table.Column<bool>(type: "boolean", nullable: false),
                    inquilino_acepto = table.Column<bool>(type: "boolean", nullable: false),
                    id_usuario_rechazo = table.Column<string>(type: "text", nullable: true),
                    motivo_rechazo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    fecha_creacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fecha_respuesta_propietario = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_respuesta_inquilino = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_rechazo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_confirmacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_solicitud_vinculacion", x => x.id_solicitud_vinculacion);
                    table.ForeignKey(
                        name: "FK_solicitud_vinculacion_declaracion_unidad_comunitaria_id_dec~",
                        column: x => x.id_declaracion_inquilino,
                        principalTable: "declaracion_unidad_comunitaria",
                        principalColumn: "id_declaracion_unidad",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitud_vinculacion_declaracion_unidad_comunitaria_id_de~1",
                        column: x => x.id_declaracion_propietario,
                        principalTable: "declaracion_unidad_comunitaria",
                        principalColumn: "id_declaracion_unidad",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitud_vinculacion_unidad_id_unidad",
                        column: x => x.id_unidad,
                        principalTable: "unidad",
                        principalColumn: "id_unidad",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitud_vinculacion_usuario_id_inquilino",
                        column: x => x.id_inquilino,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitud_vinculacion_usuario_id_propietario",
                        column: x => x.id_propietario,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitud_vinculacion_usuario_id_usuario_rechazo",
                        column: x => x.id_usuario_rechazo,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_vinculacion_id_declaracion_inquilino",
                table: "solicitud_vinculacion",
                column: "id_declaracion_inquilino");

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_vinculacion_id_declaracion_propietario",
                table: "solicitud_vinculacion",
                column: "id_declaracion_propietario");

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_vinculacion_id_inquilino_estado",
                table: "solicitud_vinculacion",
                columns: new[] { "id_inquilino", "estado" });

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_vinculacion_id_propietario_estado",
                table: "solicitud_vinculacion",
                columns: new[] { "id_propietario", "estado" });

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_vinculacion_id_propietario_id_inquilino_id_unidad",
                table: "solicitud_vinculacion",
                columns: new[] { "id_propietario", "id_inquilino", "id_unidad" },
                unique: true,
                filter: "estado <> 'Cancelada'");

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_vinculacion_id_unidad",
                table: "solicitud_vinculacion",
                column: "id_unidad");

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_vinculacion_id_usuario_rechazo",
                table: "solicitud_vinculacion",
                column: "id_usuario_rechazo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "solicitud_vinculacion");

            migrationBuilder.DropColumn(
                name: "identificacion_relacion",
                table: "declaracion_unidad_comunitaria");

            migrationBuilder.DropColumn(
                name: "persona_relacion_apellido",
                table: "declaracion_unidad_comunitaria");

            migrationBuilder.DropColumn(
                name: "persona_relacion_nombre",
                table: "declaracion_unidad_comunitaria");

            migrationBuilder.DropColumn(
                name: "piso_relacion",
                table: "declaracion_unidad_comunitaria");
        }
    }
}
