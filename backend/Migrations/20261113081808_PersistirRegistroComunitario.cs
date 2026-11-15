using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class PersistirRegistroComunitario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_unidad_id_edificio",
                table: "unidad");

            migrationBuilder.CreateTable(
                name: "declaracion_unidad_comunitaria",
                columns: table => new
                {
                    id_declaracion_unidad = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_usuario = table.Column<string>(type: "text", nullable: false),
                    id_edificio = table.Column<int>(type: "integer", nullable: false),
                    id_unidad = table.Column<int>(type: "integer", nullable: true),
                    tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    piso_declarado = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    identificacion_declarada = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    es_principal = table.Column<bool>(type: "boolean", nullable: false),
                    esta_alquilada = table.Column<bool>(type: "boolean", nullable: true),
                    estado_confirmacion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    fecha_declaracion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_declaracion_unidad_comunitaria", x => x.id_declaracion_unidad);
                    table.ForeignKey(
                        name: "FK_declaracion_unidad_comunitaria_edificio_id_edificio",
                        column: x => x.id_edificio,
                        principalTable: "edificio",
                        principalColumn: "id_edificio",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_declaracion_unidad_comunitaria_unidad_id_unidad",
                        column: x => x.id_unidad,
                        principalTable: "unidad",
                        principalColumn: "id_unidad",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_declaracion_unidad_comunitaria_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "registro_comunitario",
                columns: table => new
                {
                    id_usuario = table.Column<string>(type: "text", nullable: false),
                    perfil = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    origen_declaracion = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    vive_en_edificio = table.Column<bool>(type: "boolean", nullable: true),
                    tiene_otras_unidades = table.Column<bool>(type: "boolean", nullable: true),
                    declara_unidades_alquiladas = table.Column<bool>(type: "boolean", nullable: true),
                    modalidad_alquiler = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    propietario_declarado_vive_en_edificio = table.Column<bool>(type: "boolean", nullable: true),
                    propietario_declarado_nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    propietario_declarado_apellido = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    propietario_declarado_piso = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    propietario_declarado_unidad = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    funcion_personal = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    funcion_personal_otra = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    horario_personal = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    fecha_registro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registro_comunitario", x => x.id_usuario);
                    table.ForeignKey(
                        name: "FK_registro_comunitario_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_unidad_id_edificio_piso_identificacion",
                table: "unidad",
                columns: new[] { "id_edificio", "piso", "identificacion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_declaracion_unidad_comunitaria_id_edificio",
                table: "declaracion_unidad_comunitaria",
                column: "id_edificio");

            migrationBuilder.CreateIndex(
                name: "IX_declaracion_unidad_comunitaria_id_unidad",
                table: "declaracion_unidad_comunitaria",
                column: "id_unidad");

            migrationBuilder.CreateIndex(
                name: "IX_declaracion_unidad_comunitaria_id_usuario_id_edificio",
                table: "declaracion_unidad_comunitaria",
                columns: new[] { "id_usuario", "id_edificio" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "declaracion_unidad_comunitaria");

            migrationBuilder.DropTable(
                name: "registro_comunitario");

            migrationBuilder.DropIndex(
                name: "IX_unidad_id_edificio_piso_identificacion",
                table: "unidad");

            migrationBuilder.CreateIndex(
                name: "IX_unidad_id_edificio",
                table: "unidad",
                column: "id_edificio");
        }
    }
}
