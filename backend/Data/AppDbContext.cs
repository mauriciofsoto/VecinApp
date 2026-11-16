using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VecinApp.Models;

namespace VecinApp.Data;

public class AppDbContext : IdentityDbContext<Usuario, IdentityRole, string>
// Se especifican los tres tipos genéricos para evitar que EF intente mapear IdentityUser y Usuario por duplicado en el modelo

{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    

    // Tablas de negocio
    public DbSet<Rol> RolesAplicacion { get; set; }
    public DbSet<Edificio> Edificios { get; set; }
    public DbSet<TokenAccesoEdificio> TokensAccesoEdificio { get; set; }
    public DbSet<CodigoInvitacion> CodigosInvitacion { get; set; }
    //public DbSet<Usuario> Usuarios { get; set; } -- lo maneja Identity
    public DbSet<Unidad> Unidades { get; set; }
    public DbSet<UsuarioUnidad> UsuariosUnidades { get; set; }
    public DbSet<RegistroComunitario> RegistrosComunitarios { get; set; }
    public DbSet<DeclaracionUnidadComunitaria> DeclaracionesUnidadesComunitarias { get; set; }
    public DbSet<SolicitudVinculacion> SolicitudesVinculacion => Set<SolicitudVinculacion>();
    public DbSet<Aviso> Avisos { get; set; }
    public DbSet<Incidencia> Incidencias { get; set; }
    public DbSet<EstadoIncidencia> EstadosIncidencia { get; set; }
    public DbSet<CategoriaIncidencia> CategoriasIncidencia { get; set; }
    public DbSet<MensajeIncidencia> MensajesIncidencia { get; set; }
    public DbSet<DerivacionIncidencia> DerivacionesIncidencia { get; set; }
    public DbSet<Publicacion> Publicaciones { get; set; }
    public DbSet<CategoriaPublicacion> CategoriasPublicacion { get; set; }
    public DbSet<Comentario> Comentarios { get; set; }
    public DbSet<ReaccionPublicacion> ReaccionesPublicacion { get; set; }
    public DbSet<Evento> Eventos { get; set; }
    public DbSet<Encuesta> Encuestas { get; set; }
    public DbSet<OpcionEncuesta> OpcionesEncuesta { get; set; }
    public DbSet<RespuestaEncuesta> RespuestasEncuesta { get; set; }
    public DbSet<MensajePaquete> MensajesPaquete { get; set; }
    public DbSet<Paquete> Paquetes { get; set; }
    public DbSet<Notificacion> Notificaciones { get; set; }
    public DbSet<EspacioComun> EspaciosComunes { get; set; }
    public DbSet<Reserva> Reservas { get; set; }
    public DbSet<MensajeReserva> MensajesReserva { get; set; }
    public DbSet<InvitacionEvento> InvitacionesEvento { get; set; }

    // Tabla de autenticación
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =========================
        // TABLA BASE IDENTITY
        // =========================
        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("usuario");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.Apellido)
                .HasColumnName("apellido")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.Estado)
                .HasColumnName("estado")
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(e => e.FechaRegistro)
                .HasColumnName("fecha_registro")
                .IsRequired();

            entity.Property(e => e.IdRol)
                .HasColumnName("id_rol");

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.HasOne(e => e.Rol)
                .WithMany(e => e.Usuarios)
                .HasForeignKey(e => e.IdRol)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Usuarios)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // ROL
        // =========================
        modelBuilder.Entity<Rol>(entity =>
        {
            entity.ToTable("rol");
            entity.HasKey(e => e.IdRol);
            entity.Property(e => e.IdRol).HasColumnName("id_rol");
            entity.Property(e => e.Nombre).HasColumnName("nombre").IsRequired();
        });

        // =========================
        // EDIFICIO
        // =========================
        modelBuilder.Entity<Edificio>(entity =>
        {
            entity.ToTable("edificio");
            entity.HasKey(e => e.IdEdificio);
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio");
            entity.Property(e => e.AccesoPublicoId)
                .HasColumnName("acceso_publico_id")
                .HasDefaultValueSql("gen_random_uuid()")
                .ValueGeneratedOnAdd();
            entity.HasIndex(e => e.AccesoPublicoId).IsUnique();
            entity.Property(e => e.Nombre).HasColumnName("nombre").IsRequired();
            entity.Property(e => e.Direccion).HasColumnName("direccion").IsRequired();
            entity.Property(e => e.Localidad).HasColumnName("localidad").HasMaxLength(120).IsRequired();
            entity.Property(e => e.Provincia).HasColumnName("provincia").HasMaxLength(120).IsRequired();
            entity.Property(e => e.Estado).HasColumnName("estado").IsRequired();
        });
        // =========================
        // CODIGO_INVITACION
        // =========================
        modelBuilder.Entity<CodigoInvitacion>(entity =>
        {
            entity.ToTable("codigo_invitacion");

            entity.HasKey(e => e.IdCodigoInvitacion);

            entity.Property(e => e.IdCodigoInvitacion)
                .HasColumnName("id_codigo_invitacion");

            entity.Property(e => e.Codigo)
                .HasColumnName("codigo")
                .HasMaxLength(30)
                .IsRequired();

            entity.HasIndex(e => e.Codigo).IsUnique();

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio")
                .IsRequired();

            entity.Property(e => e.IdRol)
                .HasColumnName("id_rol")
                .IsRequired();

            entity.Property(e => e.FechaExpiracion)
                .HasColumnName("fecha_expiracion")
                .IsRequired();

            entity.Property(e => e.UsosMaximos)
                .HasColumnName("usos_maximos")
                .IsRequired();

            entity.Property(e => e.UsosRealizados)
                .HasColumnName("usos_realizados")
                .IsRequired();

            entity.Property(e => e.Activo)
                .HasColumnName("activo")
                .IsRequired();

            entity.HasOne(e => e.Edificio)
                .WithMany()
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Rol)
                .WithMany()
                .HasForeignKey(e => e.IdRol)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TokenAccesoEdificio>(entity =>
        {
            entity.ToTable("token_acceso_edificio");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio").IsRequired();
            entity.Property(e => e.HashToken).HasColumnName("hash_token").HasMaxLength(64).IsRequired();
            entity.Property(e => e.FechaCreacion).HasColumnName("fecha_creacion").IsRequired();
            entity.Property(e => e.FechaExpiracion).HasColumnName("fecha_expiracion").IsRequired();
            entity.HasIndex(e => e.HashToken).IsUnique();
            entity.HasIndex(e => new { e.IdEdificio, e.FechaExpiracion });
            entity.HasOne(e => e.Edificio)
                .WithMany()
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // USUARIO (Identity + Relaciones)
        // =========================

        // =========================
        // UNIDAD
        // =========================
        modelBuilder.Entity<Unidad>(entity =>
        {
            entity.ToTable("unidad");
            entity.HasKey(e => e.IdUnidad);
            entity.Property(e => e.IdUnidad).HasColumnName("id_unidad");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio");
            entity.Property(e => e.Piso).HasColumnName("piso").IsRequired();
            entity.Property(e => e.Identificacion).HasColumnName("identificacion").IsRequired();
            entity.HasIndex(e => new { e.IdEdificio, e.Piso, e.Identificacion }).IsUnique();

            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Unidades)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // USUARIO_UNIDAD
        // =========================
        modelBuilder.Entity<UsuarioUnidad>(entity =>
        {
            entity.ToTable("usuario_unidad");
            entity.HasKey(e => e.IdUsuarioUnidad);
            entity.Property(e => e.IdUsuarioUnidad).HasColumnName("id_usuario_unidad");
            entity.Property(e => e.IdUnidad).HasColumnName("id_unidad");
            entity.Property(e => e.TipoRelacion).HasColumnName("tipo_relacion").IsRequired();

            entity.HasOne(e => e.Usuario)
                .WithMany(e => e.UsuariosUnidades)
                 .HasForeignKey(e => e.IdUsuario)   
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Unidad)
                .WithMany(e => e.UsuariosUnidades)
                .HasForeignKey(e => e.IdUnidad)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RegistroComunitario>(entity =>
        {
            entity.ToTable("registro_comunitario");
            entity.HasKey(e => e.IdUsuario);
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.Perfil).HasColumnName("perfil").HasMaxLength(20).IsRequired();
            entity.Property(e => e.OrigenDeclaracion).HasColumnName("origen_declaracion").HasMaxLength(30).IsRequired();
            entity.Property(e => e.ViveEnEdificio).HasColumnName("vive_en_edificio");
            entity.Property(e => e.TieneOtrasUnidades).HasColumnName("tiene_otras_unidades");
            entity.Property(e => e.DeclaraUnidadesAlquiladas).HasColumnName("declara_unidades_alquiladas");
            entity.Property(e => e.ModalidadAlquiler).HasColumnName("modalidad_alquiler").HasMaxLength(40);
            entity.Property(e => e.PropietarioDeclaradoViveEnEdificio).HasColumnName("propietario_declarado_vive_en_edificio");
            entity.Property(e => e.PropietarioDeclaradoNombre).HasColumnName("propietario_declarado_nombre").HasMaxLength(100);
            entity.Property(e => e.PropietarioDeclaradoApellido).HasColumnName("propietario_declarado_apellido").HasMaxLength(100);
            entity.Property(e => e.PropietarioDeclaradoPiso).HasColumnName("propietario_declarado_piso").HasMaxLength(100);
            entity.Property(e => e.PropietarioDeclaradoUnidad).HasColumnName("propietario_declarado_unidad").HasMaxLength(100);
            entity.Property(e => e.FuncionPersonal).HasColumnName("funcion_personal").HasMaxLength(80);
            entity.Property(e => e.FuncionPersonalOtra).HasColumnName("funcion_personal_otra").HasMaxLength(120);
            entity.Property(e => e.HorarioPersonal).HasColumnName("horario_personal").HasMaxLength(200);
            entity.Property(e => e.FechaRegistro).HasColumnName("fecha_registro").IsRequired();
            entity.HasOne(e => e.Usuario).WithOne().HasForeignKey<RegistroComunitario>(e => e.IdUsuario).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DeclaracionUnidadComunitaria>(entity =>
        {
            entity.ToTable("declaracion_unidad_comunitaria");
            entity.HasKey(e => e.IdDeclaracionUnidad);
            entity.Property(e => e.IdDeclaracionUnidad).HasColumnName("id_declaracion_unidad");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario").IsRequired();
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio").IsRequired();
            entity.Property(e => e.IdUnidad).HasColumnName("id_unidad");
            entity.Property(e => e.Tipo).HasColumnName("tipo").HasMaxLength(20).IsRequired();
            entity.Property(e => e.PisoDeclarado).HasColumnName("piso_declarado").HasMaxLength(100);
            entity.Property(e => e.IdentificacionDeclarada).HasColumnName("identificacion_declarada").HasMaxLength(100);
            entity.Property(e => e.EsPrincipal).HasColumnName("es_principal").IsRequired();
            entity.Property(e => e.EstaAlquilada).HasColumnName("esta_alquilada");
            entity.Property(e => e.PersonaRelacionNombre).HasColumnName("persona_relacion_nombre").HasMaxLength(100);
            entity.Property(e => e.PersonaRelacionApellido).HasColumnName("persona_relacion_apellido").HasMaxLength(100);
            entity.Property(e => e.PisoRelacion).HasColumnName("piso_relacion").HasMaxLength(100);
            entity.Property(e => e.IdentificacionRelacion).HasColumnName("identificacion_relacion").HasMaxLength(100);
            entity.Property(e => e.EstadoConfirmacion).HasColumnName("estado_confirmacion").HasMaxLength(20).IsRequired();
            entity.Property(e => e.FechaDeclaracion).HasColumnName("fecha_declaracion").IsRequired();
            entity.HasIndex(e => new { e.IdUsuario, e.IdEdificio });
            entity.HasIndex(e => e.IdUnidad);
            entity.HasOne(e => e.Usuario).WithMany().HasForeignKey(e => e.IdUsuario).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Edificio).WithMany().HasForeignKey(e => e.IdEdificio).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Unidad).WithMany().HasForeignKey(e => e.IdUnidad).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SolicitudVinculacion>(entity =>
        {
            entity.ToTable("solicitud_vinculacion");
            entity.HasKey(e => e.IdSolicitudVinculacion);
            entity.Property(e => e.IdSolicitudVinculacion).HasColumnName("id_solicitud_vinculacion");
            entity.Property(e => e.IdPropietario).HasColumnName("id_propietario").IsRequired();
            entity.Property(e => e.IdInquilino).HasColumnName("id_inquilino").IsRequired();
            entity.Property(e => e.IdUnidad).HasColumnName("id_unidad").IsRequired();
            entity.Property(e => e.IdDeclaracionPropietario).HasColumnName("id_declaracion_propietario");
            entity.Property(e => e.IdDeclaracionInquilino).HasColumnName("id_declaracion_inquilino");
            entity.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();
            entity.Property(e => e.PropietarioAcepto).HasColumnName("propietario_acepto").IsRequired();
            entity.Property(e => e.InquilinoAcepto).HasColumnName("inquilino_acepto").IsRequired();
            entity.Property(e => e.IdUsuarioRechazo).HasColumnName("id_usuario_rechazo");
            entity.Property(e => e.MotivoRechazo).HasColumnName("motivo_rechazo").HasMaxLength(500);
            entity.Property(e => e.FechaCreacion).HasColumnName("fecha_creacion").IsRequired();
            entity.Property(e => e.FechaRespuestaPropietario).HasColumnName("fecha_respuesta_propietario");
            entity.Property(e => e.FechaRespuestaInquilino).HasColumnName("fecha_respuesta_inquilino");
            entity.Property(e => e.FechaRechazo).HasColumnName("fecha_rechazo");
            entity.Property(e => e.FechaConfirmacion).HasColumnName("fecha_confirmacion");
            entity.Property(e => e.Version).HasColumnName("version").IsConcurrencyToken();
            entity.HasIndex(e => new { e.IdPropietario, e.IdInquilino, e.IdUnidad }).IsUnique()
                .HasFilter("estado <> 'Cancelada'");
            entity.HasIndex(e => new { e.IdInquilino, e.Estado });
            entity.HasIndex(e => new { e.IdPropietario, e.Estado });
            entity.HasOne(e => e.Propietario).WithMany().HasForeignKey(e => e.IdPropietario).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Inquilino).WithMany().HasForeignKey(e => e.IdInquilino).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.UsuarioRechazo).WithMany().HasForeignKey(e => e.IdUsuarioRechazo).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Unidad).WithMany().HasForeignKey(e => e.IdUnidad).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.DeclaracionPropietario).WithMany().HasForeignKey(e => e.IdDeclaracionPropietario).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.DeclaracionInquilino).WithMany().HasForeignKey(e => e.IdDeclaracionInquilino).OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // AVISO
        // =========================
        modelBuilder.Entity<Aviso>(entity =>
        {
            entity.ToTable("aviso");
            entity.HasKey(e => e.IdAviso);
            entity.Property(e => e.IdAviso).HasColumnName("id_aviso");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio");
            entity.Property(e => e.Titulo).HasColumnName("titulo").IsRequired();
            entity.Property(e => e.Descripcion).HasColumnName("descripcion").IsRequired();
            entity.Property(e => e.Prioridad).HasColumnName("prioridad").IsRequired();
            entity.Property(e => e.FechaPublicacion).HasColumnName("fecha_publicacion").IsRequired();
            entity.Property(e => e.FechaVencimiento).HasColumnName("fecha_vencimiento");

            entity.HasOne(e => e.Usuario)
                .WithMany()
                 .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Avisos)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // ESTADO_INCIDENCIA
        // =========================
        modelBuilder.Entity<EstadoIncidencia>(entity =>
        {
            entity.ToTable("estado_incidencia");
            entity.HasKey(e => e.IdEstadoIncidencia);
            entity.Property(e => e.IdEstadoIncidencia).HasColumnName("id_estado_incidencia");
            entity.Property(e => e.Nombre).HasColumnName("nombre").IsRequired();
        });

        // =========================
        // CATEGORIA_INCIDENCIA
        // =========================
        modelBuilder.Entity<CategoriaIncidencia>(entity =>
        {
            entity.ToTable("categoria_incidencia");
            entity.HasKey(e => e.IdCategoriaIncidencia);
            entity.Property(e => e.IdCategoriaIncidencia).HasColumnName("id_categoria_incidencia");
            entity.Property(e => e.Nombre).HasColumnName("nombre").IsRequired();
        });

        // =========================
        // INCIDENCIA
        // =========================
        modelBuilder.Entity<Incidencia>(entity =>
        {
            entity.ToTable("incidencia");

            entity.HasKey(e => e.IdIncidencia);

            entity.Property(e => e.IdIncidencia)
                .HasColumnName("id_incidencia");

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.Property(e => e.IdUsuarioReportante)
                .HasColumnName("id_usuario_reportante")
                .IsRequired();

            entity.Property(e => e.IdUsuarioResponsable)
                .HasColumnName("id_usuario_responsable");

            entity.Property(e => e.IdEstadoIncidencia)
                .HasColumnName("id_estado_incidencia");

            entity.Property(e => e.IdCategoriaIncidencia)
                .HasColumnName("id_categoria_incidencia");

            entity.Property(e => e.Titulo)
                .HasColumnName("titulo")
                .IsRequired();

            entity.Property(e => e.Descripcion)
                .HasColumnName("descripcion")
                .IsRequired();

            entity.Property(e => e.Ubicacion)
                .HasColumnName("ubicacion")
                .HasMaxLength(150);

            entity.Property(e => e.Prioridad)
                .HasColumnName("prioridad")
                .IsRequired();

            entity.Property(e => e.FechaCreacion)
                .HasColumnName("fecha_creacion")
                .IsRequired();

            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Incidencias)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UsuarioReportante)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioReportante)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UsuarioResponsable)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioResponsable)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.EstadoIncidencia)
                .WithMany(e => e.Incidencias)
                .HasForeignKey(e => e.IdEstadoIncidencia)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CategoriaIncidencia)
                .WithMany(e => e.Incidencias)
                .HasForeignKey(e => e.IdCategoriaIncidencia)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // MENSAJE INCIDENCIA
        // =========================
        modelBuilder.Entity<MensajeIncidencia>(entity =>
        {
            entity.ToTable("mensaje_incidencia");
            entity.HasKey(e => e.IdMensajeIncidencia);
            entity.Property(e => e.IdMensajeIncidencia).HasColumnName("id_mensaje_incidencia");
            entity.Property(e => e.IdIncidencia).HasColumnName("id_incidencia");
            entity.Property(e => e.IdUsuarioEmisor).HasColumnName("id_usuario_emisor").IsRequired();
            entity.Property(e => e.Contenido).HasColumnName("contenido").HasMaxLength(2000).IsRequired();
            entity.Property(e => e.FechaCreacion).HasColumnName("fecha_creacion").IsRequired();

            entity.HasOne(e => e.Incidencia)
                .WithMany(e => e.Mensajes)
                .HasForeignKey(e => e.IdIncidencia)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UsuarioEmisor)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioEmisor)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // DERIVACION INCIDENCIA
        // =========================
        modelBuilder.Entity<DerivacionIncidencia>(entity =>
        {
            entity.ToTable("derivacion_incidencia");
            entity.HasKey(e => e.IdDerivacionIncidencia);
            entity.Property(e => e.IdDerivacionIncidencia).HasColumnName("id_derivacion_incidencia");
            entity.Property(e => e.IdIncidencia).HasColumnName("id_incidencia").IsRequired();
            entity.Property(e => e.IdUsuarioAdministrador).HasColumnName("id_usuario_administrador").IsRequired();
            entity.Property(e => e.IdUsuarioDestinatario).HasColumnName("id_usuario_destinatario").IsRequired();
            entity.Property(e => e.TipoDestinatario).HasColumnName("tipo_destinatario").HasMaxLength(20).IsRequired();
            entity.Property(e => e.IdUnidad).HasColumnName("id_unidad");
            entity.Property(e => e.FechaDerivacion).HasColumnName("fecha_derivacion").IsRequired();

            entity.HasIndex(e => new { e.IdIncidencia, e.IdUsuarioDestinatario, e.TipoDestinatario }).IsUnique();

            entity.HasOne(e => e.Incidencia)
                .WithMany()
                .HasForeignKey(e => e.IdIncidencia)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UsuarioAdministrador)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioAdministrador)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UsuarioDestinatario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioDestinatario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Unidad)
                .WithMany()
                .HasForeignKey(e => e.IdUnidad)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // CATEGORIA_PUBLICACION
        // =========================
        modelBuilder.Entity<CategoriaPublicacion>(entity =>
        {
            entity.ToTable("categoria_publicacion");
            entity.HasKey(e => e.IdCategoriaPublicacion);
            entity.Property(e => e.IdCategoriaPublicacion).HasColumnName("id_categoria_publicacion");
            entity.Property(e => e.Nombre).HasColumnName("nombre").IsRequired();
        });

        // =========================
        // PUBLICACION
        // =========================
        modelBuilder.Entity<Publicacion>(entity =>
        {
            entity.ToTable("publicacion");
            entity.HasKey(e => e.IdPublicacion);
            entity.Property(e => e.IdPublicacion).HasColumnName("id_publicacion");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio");
            entity.Property(e => e.IdCategoriaPublicacion).HasColumnName("id_categoria_publicacion");
            entity.Property(e => e.Titulo).HasColumnName("titulo").IsRequired();
            entity.Property(e => e.Contenido).HasColumnName("contenido").IsRequired();
            entity.Property(e => e.FechaPublicacion).HasColumnName("fecha_publicacion").IsRequired();
            entity.Property(e => e.FechaLimite).HasColumnName("fecha_limite");
            entity.Property(e => e.Estado).HasColumnName("estado").IsRequired();
            entity.Property(e => e.Prioritaria).HasColumnName("Prioritaria").HasDefaultValue(false);
            entity.Property(e => e.ComentariosActivos).HasColumnName("ComentariosActivos").HasDefaultValue(true);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                 .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Publicaciones)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CategoriaPublicacion)
                .WithMany(e => e.Publicaciones)
                .HasForeignKey(e => e.IdCategoriaPublicacion)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // COMENTARIO
        // =========================
        modelBuilder.Entity<Comentario>(entity =>
        {
            entity.ToTable("comentario");
            entity.HasKey(e => e.IdComentario);
            entity.Property(e => e.IdComentario).HasColumnName("id_comentario");
            entity.Property(e => e.IdPublicacion).HasColumnName("id_publicacion");
            entity.Property(e => e.Contenido).HasColumnName("contenido").IsRequired();
            entity.Property(e => e.Fecha).HasColumnName("fecha").IsRequired();

            entity.HasOne(e => e.Publicacion)
                .WithMany(e => e.Comentarios)
                .HasForeignKey(e => e.IdPublicacion)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                 .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ReaccionPublicacion>(entity =>
        {
            entity.ToTable("reaccion_publicacion");
            entity.HasKey(e => e.IdReaccion);
            entity.Property(e => e.IdReaccion).HasColumnName("id_reaccion");
            entity.Property(e => e.IdPublicacion).HasColumnName("id_publicacion").IsRequired();
            entity.Property(e => e.IdUsuario).HasColumnName("IdUsuario").IsRequired();
            entity.Property(e => e.Emoji).HasColumnName("emoji").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Fecha).HasColumnName("fecha").IsRequired();

            entity.HasOne(e => e.Publicacion)
                .WithMany(e => e.Reacciones)
                .HasForeignKey(e => e.IdPublicacion)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.IdPublicacion, e.IdUsuario, e.Emoji }).IsUnique();
        });

        // =========================
        // EVENTO
        // =========================
        modelBuilder.Entity<Evento>(entity =>
        {
            entity.ToTable("evento");
            entity.HasKey(e => e.IdEvento);
            entity.Property(e => e.IdEvento).HasColumnName("id_evento");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio");
            entity.Property(e => e.Nombre).HasColumnName("nombre").IsRequired();
            entity.Property(e => e.Descripcion).HasColumnName("descripcion").IsRequired();
            entity.Property(e => e.Fecha).HasColumnName("fecha").IsRequired();
            entity.Property(e => e.Hora).HasColumnName("hora").IsRequired();
            entity.Property(e => e.Ubicacion).HasColumnName("ubicacion").IsRequired();
            entity.Property(e => e.CantidadParticipantes).HasColumnName("cantidad_participantes").IsRequired();

            entity.HasOne(e => e.Usuario)
                .WithMany()
                 .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Eventos)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // ENCUESTA
        // =========================
        modelBuilder.Entity<Encuesta>(entity =>
        {
            entity.ToTable("encuesta");
            entity.HasKey(e => e.IdEncuesta);
            entity.Property(e => e.IdEncuesta).HasColumnName("id_encuesta");
            entity.Property(e => e.IdPublicacion).HasColumnName("id_publicacion");
            entity.Property(e => e.FechaInicio).HasColumnName("fecha_inicio").IsRequired();
            entity.Property(e => e.FechaFin).HasColumnName("fecha_fin").IsRequired();
            entity.Property(e => e.Estado).HasColumnName("estado").IsRequired();

            entity.HasOne(e => e.Publicacion)
                .WithOne(e => e.Encuesta)
                .HasForeignKey<Encuesta>(e => e.IdPublicacion)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // OPCION_ENCUESTA
        // =========================
        modelBuilder.Entity<OpcionEncuesta>(entity =>
        {
            entity.ToTable("opcion_encuesta");
            entity.HasKey(e => e.IdOpcion);
            entity.Property(e => e.IdOpcion).HasColumnName("id_opcion");
            entity.Property(e => e.IdEncuesta).HasColumnName("id_encuesta");
            entity.Property(e => e.Texto).HasColumnName("texto").IsRequired();

            entity.HasOne(e => e.Encuesta)
                .WithMany(e => e.Opciones)
                .HasForeignKey(e => e.IdEncuesta)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // RESPUESTA_ENCUESTA
        // =========================
        modelBuilder.Entity<RespuestaEncuesta>(entity =>
        {
            entity.ToTable("respuesta_encuesta");
            entity.HasKey(e => e.IdRespuesta);
            entity.Property(e => e.IdRespuesta).HasColumnName("id_respuesta");
            entity.Property(e => e.IdEncuesta).HasColumnName("id_encuesta");
            entity.Property(e => e.IdOpcion).HasColumnName("id_opcion");
            entity.Property(e => e.FechaRespuesta).HasColumnName("fecha_respuesta").IsRequired();

            entity.HasOne(e => e.Encuesta)
                .WithMany(e => e.Respuestas)
                .HasForeignKey(e => e.IdEncuesta)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Opcion)
                .WithMany(e => e.Respuestas)
                .HasForeignKey(e => e.IdOpcion)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                 .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.IdEncuesta, e.IdUsuario }).IsUnique();
        });

        // =========================
        // PAQUETE
        // =========================
        modelBuilder.Entity<Paquete>(entity =>
        {
            entity.ToTable("paquete");
            entity.HasKey(e => e.IdPaquete);
            entity.Property(e => e.IdPaquete).HasColumnName("id_paquete");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio").IsRequired();
            entity.Property(e => e.IdUnidad).HasColumnName("id_unidad");
            entity.Property(e => e.Remitente).HasColumnName("remitente").IsRequired();
            entity.Property(e => e.Identificacion).HasColumnName("identificacion").IsRequired();
            entity.Property(e => e.FechaRecepcion).HasColumnName("fecha_recepcion").IsRequired();
            entity.Property(e => e.Observaciones).HasColumnName("observaciones");
            entity.Property(e => e.Estado).HasColumnName("estado").IsRequired();
            entity.Property(e => e.IdUsuarioRegistro).HasColumnName("id_usuario_registro").IsRequired();
            
            entity.Property(e => e.IdUsuarioDestinatario).HasColumnName("id_usuario_destinatario").IsRequired();
            entity.Property(e => e.FechaConfirmacion).HasColumnName("fecha_confirmacion");
            entity.Property(e => e.FechaEntrega).HasColumnName("fecha_entrega");
            entity.Property(e => e.IdUsuarioEntrega).HasColumnName("id_usuario_entrega");
            entity.Property(e => e.FechaEliminacion).HasColumnName("fecha_eliminacion");

            entity.HasOne(e => e.Edificio)
                .WithMany()
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Unidad)
                .WithMany(e => e.Paquetes)
                .HasForeignKey(e => e.IdUnidad)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            entity.HasOne(e => e.UsuarioRegistro)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioRegistro)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Mensajes)
                .WithOne(e => e.Paquete)
                .HasForeignKey(e => e.IdPaquete)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.UsuarioDestinatario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioDestinatario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UsuarioEntrega)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioEntrega)
                .OnDelete(DeleteBehavior.Restrict);
        });


                // =========================
        // MENSAJE PAQUETE
        // =========================
        modelBuilder.Entity<MensajePaquete>(entity =>
        {
            entity.ToTable("mensaje_paquete");

            entity.HasKey(e => e.IdMensajePaquete);

            entity.Property(e => e.IdMensajePaquete)
                .HasColumnName("id_mensaje_paquete");

            entity.Property(e => e.IdPaquete)
                .HasColumnName("id_paquete");

            entity.Property(e => e.IdUsuarioEmisor)
                .HasColumnName("id_usuario_emisor")
                .IsRequired();

            entity.Property(e => e.Contenido)
                .HasColumnName("contenido")
                .IsRequired();

            entity.Property(e => e.FechaEnvio)
                .HasColumnName("fecha_envio")
                .IsRequired();

            entity.HasOne(e => e.UsuarioEmisor)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioEmisor)
                .OnDelete(DeleteBehavior.Restrict);
        });




        // =========================
        // NOTIFICACION
        // =========================
        modelBuilder.Entity<Notificacion>(entity =>
        {
            entity.ToTable("notificacion");
            entity.HasKey(e => e.IdNotificacion);
            entity.Property(e => e.IdNotificacion).HasColumnName("id_notificacion");
            entity.Property(e => e.Tipo).HasColumnName("tipo").IsRequired();
            entity.Property(e => e.Titulo).HasColumnName("titulo").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Mensaje).HasColumnName("mensaje").IsRequired();
            entity.Property(e => e.Fecha).HasColumnName("fecha").IsRequired();
            entity.Property(e => e.Leida).HasColumnName("leida").IsRequired();
            entity.Property(e => e.Ruta).HasColumnName("ruta").HasMaxLength(500);
            entity.HasIndex(e => new { e.IdUsuario, e.Leida, e.Fecha });

            entity.HasOne(e => e.Usuario)
                .WithMany()
                 .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // ESPACIO COMUN
        // =========================
        modelBuilder.Entity<EspacioComun>(entity =>
        {
            entity.ToTable("espacio_comun");
            entity.HasKey(e => e.IdEspacioComun);
            entity.Property(e => e.IdEspacioComun).HasColumnName("id_espacio_comun");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio").IsRequired();
            entity.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Descripcion).HasColumnName("descripcion").HasMaxLength(500).IsRequired();
            entity.Property(e => e.HoraApertura).HasColumnName("hora_apertura").IsRequired();
            entity.Property(e => e.HoraCierre).HasColumnName("hora_cierre").IsRequired();
            entity.Property(e => e.CapacidadMaxima).HasColumnName("capacidad_maxima").IsRequired();
            entity.Property(e => e.Activo).HasColumnName("activo").HasDefaultValue(true).IsRequired();

            entity.HasOne(e => e.Edificio)
                .WithMany()
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // RESERVA
        // =========================
        modelBuilder.Entity<Reserva>(entity =>
        {
            entity.ToTable("reserva");
            entity.HasKey(e => e.IdReserva);
            entity.Property(e => e.IdReserva).HasColumnName("id_reserva");
            entity.Property(e => e.IdEdificio).HasColumnName("id_edificio").IsRequired();
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario").IsRequired();
            entity.Property(e => e.IdUnidad).HasColumnName("id_unidad");
            entity.Property(e => e.IdEspacioComun).HasColumnName("id_espacio_comun").IsRequired();
            entity.Property(e => e.Titulo).HasColumnName("titulo").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Descripcion).HasColumnName("descripcion").HasMaxLength(1000).IsRequired();
            entity.Property(e => e.Fecha).HasColumnName("fecha").IsRequired();
            entity.Property(e => e.HoraInicio).HasColumnName("hora_inicio").IsRequired();
            entity.Property(e => e.HoraFin).HasColumnName("hora_fin").IsRequired();
            entity.Property(e => e.CantidadParticipantes).HasColumnName("cantidad_participantes").IsRequired();
            entity.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(50).IsRequired();
            entity.Property(e => e.TipoEvento).HasColumnName("tipo_evento").HasMaxLength(50);
            entity.Property(e => e.CategoriaEvento).HasColumnName("categoria_evento").HasMaxLength(50);
            entity.Property(e => e.CreadaPorAdministracion).HasColumnName("creada_por_administracion").HasDefaultValue(false).IsRequired();
            entity.Property(e => e.FechaCreacion).HasColumnName("fecha_creacion").IsRequired();

            entity.HasIndex(e => new { e.IdEdificio, e.Fecha, e.Estado });

            entity.HasOne(e => e.Edificio)
                .WithMany()
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Unidad)
                .WithMany()
                .HasForeignKey(e => e.IdUnidad)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.EspacioComun)
                .WithMany(e => e.Reservas)
                .HasForeignKey(e => e.IdEspacioComun)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // MENSAJE RESERVA
        // =========================
        modelBuilder.Entity<MensajeReserva>(entity =>
        {
            entity.ToTable("mensaje_reserva");
            entity.HasKey(e => e.IdMensajeReserva);
            entity.Property(e => e.IdMensajeReserva).HasColumnName("id_mensaje_reserva");
            entity.Property(e => e.IdReserva).HasColumnName("id_reserva").IsRequired();
            entity.Property(e => e.IdUsuarioEmisor).HasColumnName("id_usuario_emisor").IsRequired();
            entity.Property(e => e.Contenido).HasColumnName("contenido").HasMaxLength(1000).IsRequired();
            entity.Property(e => e.FechaCreacion).HasColumnName("fecha_creacion").IsRequired();

            entity.HasIndex(e => e.IdReserva);

            entity.HasOne(e => e.Reserva)
                .WithMany(r => r.Mensajes)
                .HasForeignKey(e => e.IdReserva)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.UsuarioEmisor)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioEmisor)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // INVITACION EVENTO
        // =========================
        modelBuilder.Entity<InvitacionEvento>(entity =>
        {
            entity.ToTable("invitacion_evento");
            entity.HasKey(e => e.IdInvitacionEvento);
            entity.Property(e => e.IdInvitacionEvento).HasColumnName("id_invitacion_evento");
            entity.Property(e => e.IdReserva).HasColumnName("id_reserva").IsRequired();
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario").IsRequired();
            entity.Property(e => e.EstadoRespuesta).HasColumnName("estado_respuesta").HasMaxLength(50).IsRequired();
            entity.Property(e => e.FechaActualizacion).HasColumnName("fecha_actualizacion").IsRequired();

            entity.HasIndex(e => new { e.IdReserva, e.IdUsuario }).IsUnique();

            entity.HasOne(e => e.Reserva)
                .WithMany(r => r.Invitaciones)
                .HasForeignKey(e => e.IdReserva)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
