using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class AgregarModuloReservas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "espacio_comun",
                columns: table => new
                {
                    id_espacio_comun = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_edificio = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    hora_apertura = table.Column<TimeSpan>(type: "interval", nullable: false),
                    hora_cierre = table.Column<TimeSpan>(type: "interval", nullable: false),
                    capacidad_maxima = table.Column<int>(type: "integer", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_espacio_comun", x => x.id_espacio_comun);
                    table.ForeignKey(
                        name: "FK_espacio_comun_edificio_id_edificio",
                        column: x => x.id_edificio,
                        principalTable: "edificio",
                        principalColumn: "id_edificio",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reserva",
                columns: table => new
                {
                    id_reserva = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_edificio = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<string>(type: "text", nullable: false),
                    id_unidad = table.Column<int>(type: "integer", nullable: true),
                    id_espacio_comun = table.Column<int>(type: "integer", nullable: false),
                    titulo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    hora_inicio = table.Column<TimeSpan>(type: "interval", nullable: false),
                    hora_fin = table.Column<TimeSpan>(type: "interval", nullable: false),
                    cantidad_participantes = table.Column<int>(type: "integer", nullable: false),
                    estado = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    tipo_evento = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    categoria_evento = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    creada_por_administracion = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    fecha_creacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reserva", x => x.id_reserva);
                    table.ForeignKey(
                        name: "FK_reserva_edificio_id_edificio",
                        column: x => x.id_edificio,
                        principalTable: "edificio",
                        principalColumn: "id_edificio",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reserva_espacio_comun_id_espacio_comun",
                        column: x => x.id_espacio_comun,
                        principalTable: "espacio_comun",
                        principalColumn: "id_espacio_comun",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reserva_unidad_id_unidad",
                        column: x => x.id_unidad,
                        principalTable: "unidad",
                        principalColumn: "id_unidad",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reserva_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "invitacion_evento",
                columns: table => new
                {
                    id_invitacion_evento = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_reserva = table.Column<int>(type: "integer", nullable: false),
                    id_usuario = table.Column<string>(type: "text", nullable: false),
                    estado_respuesta = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    fecha_actualizacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invitacion_evento", x => x.id_invitacion_evento);
                    table.ForeignKey(
                        name: "FK_invitacion_evento_reserva_id_reserva",
                        column: x => x.id_reserva,
                        principalTable: "reserva",
                        principalColumn: "id_reserva",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_invitacion_evento_usuario_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "mensaje_reserva",
                columns: table => new
                {
                    id_mensaje_reserva = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_reserva = table.Column<int>(type: "integer", nullable: false),
                    id_usuario_emisor = table.Column<string>(type: "text", nullable: false),
                    contenido = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    fecha_creacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mensaje_reserva", x => x.id_mensaje_reserva);
                    table.ForeignKey(
                        name: "FK_mensaje_reserva_reserva_id_reserva",
                        column: x => x.id_reserva,
                        principalTable: "reserva",
                        principalColumn: "id_reserva",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_mensaje_reserva_usuario_id_usuario_emisor",
                        column: x => x.id_usuario_emisor,
                        principalTable: "usuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_espacio_comun_id_edificio",
                table: "espacio_comun",
                column: "id_edificio");

            migrationBuilder.CreateIndex(
                name: "IX_invitacion_evento_id_reserva_id_usuario",
                table: "invitacion_evento",
                columns: new[] { "id_reserva", "id_usuario" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invitacion_evento_id_usuario",
                table: "invitacion_evento",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_mensaje_reserva_id_reserva",
                table: "mensaje_reserva",
                column: "id_reserva");

            migrationBuilder.CreateIndex(
                name: "IX_mensaje_reserva_id_usuario_emisor",
                table: "mensaje_reserva",
                column: "id_usuario_emisor");

            migrationBuilder.CreateIndex(
                name: "IX_reserva_id_edificio_fecha_estado",
                table: "reserva",
                columns: new[] { "id_edificio", "fecha", "estado" });

            migrationBuilder.CreateIndex(
                name: "IX_reserva_id_espacio_comun",
                table: "reserva",
                column: "id_espacio_comun");

            migrationBuilder.CreateIndex(
                name: "IX_reserva_id_unidad",
                table: "reserva",
                column: "id_unidad");

            migrationBuilder.CreateIndex(
                name: "IX_reserva_id_usuario",
                table: "reserva",
                column: "id_usuario");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "invitacion_evento");

            migrationBuilder.DropTable(
                name: "mensaje_reserva");

            migrationBuilder.DropTable(
                name: "reserva");

            migrationBuilder.DropTable(
                name: "espacio_comun");
        }
    }
}
