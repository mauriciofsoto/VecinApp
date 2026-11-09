using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VecinApp.Migrations
{
    /// <inheritdoc />
    public partial class EliminarRolResidente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                DECLARE
                    v_rol_residente integer;
                    v_rol_inquilino integer;
                BEGIN
                    SELECT id_rol INTO v_rol_residente
                    FROM rol
                    WHERE nombre = 'Residente'
                    LIMIT 1;

                    SELECT id_rol INTO v_rol_inquilino
                    FROM rol
                    WHERE nombre = 'Inquilino'
                    LIMIT 1;

                    IF v_rol_residente IS NOT NULL AND v_rol_inquilino IS NOT NULL THEN
                        UPDATE usuario
                        SET id_rol = v_rol_inquilino
                        WHERE id_rol = v_rol_residente;

                        UPDATE codigo_invitacion
                        SET id_rol = v_rol_inquilino
                        WHERE id_rol = v_rol_residente;

                        DELETE FROM rol
                        WHERE id_rol = v_rol_residente;
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
