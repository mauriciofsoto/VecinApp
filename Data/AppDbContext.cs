using Microsoft.EntityFrameworkCore;
using VecinApp.Models;

namespace VecinApp.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Rol> Roles { get; set; }
    public DbSet<Edificio> Edificios { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Unidad> Unidades { get; set; }
    public DbSet<UsuarioUnidad> UsuariosUnidades { get; set; }
    public DbSet<Aviso> Avisos { get; set; }
    public DbSet<Incidencia> Incidencias { get; set; }
    public DbSet<EstadoIncidencia> EstadosIncidencia { get; set; }
    public DbSet<CategoriaIncidencia> CategoriasIncidencia { get; set; }
    public DbSet<Publicacion> Publicaciones { get; set; }
    public DbSet<CategoriaPublicacion> CategoriasPublicacion { get; set; }
    public DbSet<Comentario> Comentarios { get; set; }
    public DbSet<Evento> Eventos { get; set; }
    public DbSet<Encuesta> Encuestas { get; set; }
    public DbSet<OpcionEncuesta> OpcionesEncuesta { get; set; }
    public DbSet<RespuestaEncuesta> RespuestasEncuesta { get; set; }
    public DbSet<Paquete> Paquetes { get; set; }
    public DbSet<Notificacion> Notificaciones { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =========================
        // ROL
        // =========================

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.ToTable("rol");

            entity.HasKey(e => e.IdRol);

            entity.Property(e => e.IdRol)
                .HasColumnName("id_rol");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .IsRequired();
        });


        // =========================
        // EDIFICIO
        // =========================

        modelBuilder.Entity<Edificio>(entity =>
        {
            entity.ToTable("edificio");

            entity.HasKey(e => e.IdEdificio);

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .IsRequired();

            entity.Property(e => e.Direccion)
                .HasColumnName("direccion")
                .IsRequired();

            entity.Property(e => e.Estado)
                .HasColumnName("estado")
                .IsRequired();
        });


        // =========================
        // USUARIO
        // =========================

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("usuario");

            entity.HasKey(e => e.IdUsuario);

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.IdRol)
                .HasColumnName("id_rol");

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .IsRequired();

            entity.Property(e => e.Apellido)
                .HasColumnName("apellido")
                .IsRequired();

            entity.Property(e => e.Email)
                .HasColumnName("email")
                .IsRequired();

            entity.Property(e => e.Estado)
                .HasColumnName("estado")
                .IsRequired();


            // Usuario → Rol
            entity.HasOne(e => e.Rol)
                .WithMany(e => e.Usuarios)
                .HasForeignKey(e => e.IdRol)
                .OnDelete(DeleteBehavior.Restrict);


            // Usuario → Edificio
            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Usuarios)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);
        });


        // =========================
        // UNIDAD
        // =========================

        modelBuilder.Entity<Unidad>(entity =>
        {
            entity.ToTable("unidad");

            entity.HasKey(e => e.IdUnidad);

            entity.Property(e => e.IdUnidad)
                .HasColumnName("id_unidad");

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.Property(e => e.Piso)
                .HasColumnName("piso")
                .IsRequired();

            entity.Property(e => e.Identificacion)
                .HasColumnName("identificacion")
                .IsRequired();


            // Unidad → Edificio
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

            entity.Property(e => e.IdUsuarioUnidad)
                .HasColumnName("id_usuario_unidad");

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.IdUnidad)
                .HasColumnName("id_unidad");

            entity.Property(e => e.TipoRelacion)
                .HasColumnName("tipo_relacion")
                .IsRequired();

            // Usuario → UsuarioUnidad
            entity.HasOne(e => e.Usuario)
                .WithMany(e => e.UsuariosUnidades)
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            // Unidad → UsuarioUnidad
            entity.HasOne(e => e.Unidad)
                .WithMany(e => e.UsuariosUnidades)
                .HasForeignKey(e => e.IdUnidad)
                .OnDelete(DeleteBehavior.Restrict);
        });


        // =========================
        // AVISO
        // =========================

        modelBuilder.Entity<Aviso>(entity =>
        {
            entity.ToTable("aviso");

            entity.HasKey(e => e.IdAviso);

            entity.Property(e => e.IdAviso)
                .HasColumnName("id_aviso");

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.Property(e => e.Titulo)
                .HasColumnName("titulo")
                .IsRequired();

            entity.Property(e => e.Descripcion)
                .HasColumnName("descripcion")
                .IsRequired();

            entity.Property(e => e.Prioridad)
                .HasColumnName("prioridad")
                .IsRequired();

            entity.Property(e => e.FechaPublicacion)
                .HasColumnName("fecha_publicacion")
                .IsRequired();

            entity.Property(e => e.FechaVencimiento)
                .HasColumnName("fecha_vencimiento");

            // Usuario → Aviso
            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            // Edificio → Aviso
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

            entity.Property(e => e.IdEstadoIncidencia)
                .HasColumnName("id_estado_incidencia");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .IsRequired();
        });


        // =========================
        // CATEGORIA_INCIDENCIA
        // =========================

        modelBuilder.Entity<CategoriaIncidencia>(entity =>
        {
            entity.ToTable("categoria_incidencia");

            entity.HasKey(e => e.IdCategoriaIncidencia);

            entity.Property(e => e.IdCategoriaIncidencia)
                .HasColumnName("id_categoria_incidencia");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .IsRequired();
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
                .HasColumnName("id_usuario_reportante");

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

            entity.Property(e => e.Prioridad)
                .HasColumnName("prioridad")
                .IsRequired();

            entity.Property(e => e.FechaCreacion)
                .HasColumnName("fecha_creacion")
                .IsRequired();


            // Edificio → Incidencia
            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Incidencias)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);


            // Usuario → Incidencia (REPORTANTE)
            entity.HasOne(e => e.UsuarioReportante)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioReportante)
                .OnDelete(DeleteBehavior.Restrict);


            // Usuario → Incidencia (RESPONSABLE)
            entity.HasOne(e => e.UsuarioResponsable)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioResponsable)
                .OnDelete(DeleteBehavior.Restrict);


            // Estado → Incidencia
            entity.HasOne(e => e.EstadoIncidencia)
                .WithMany(e => e.Incidencias)
                .HasForeignKey(e => e.IdEstadoIncidencia)
                .OnDelete(DeleteBehavior.Restrict);


            // Categoría → Incidencia
            entity.HasOne(e => e.CategoriaIncidencia)
                .WithMany(e => e.Incidencias)
                .HasForeignKey(e => e.IdCategoriaIncidencia)
                .OnDelete(DeleteBehavior.Restrict);
        });
        // =========================
        // CATEGORIA_PUBLICACION
        // =========================

        modelBuilder.Entity<CategoriaPublicacion>(entity =>
        {
            entity.ToTable("categoria_publicacion");

            entity.HasKey(e => e.IdCategoriaPublicacion);

            entity.Property(e => e.IdCategoriaPublicacion)
                .HasColumnName("id_categoria_publicacion");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .IsRequired();
        });


        // =========================
        // PUBLICACION
        // =========================

        modelBuilder.Entity<Publicacion>(entity =>
        {
            entity.ToTable("publicacion");

            entity.HasKey(e => e.IdPublicacion);

            entity.Property(e => e.IdPublicacion)
                .HasColumnName("id_publicacion");

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.Property(e => e.IdCategoriaPublicacion)
                .HasColumnName("id_categoria_publicacion");

            entity.Property(e => e.Titulo)
                .HasColumnName("titulo")
                .IsRequired();

            entity.Property(e => e.Contenido)
                .HasColumnName("contenido")
                .IsRequired();

            entity.Property(e => e.FechaPublicacion)
                .HasColumnName("fecha_publicacion")
                .IsRequired();

            entity.Property(e => e.Estado)
                .HasColumnName("estado")
                .IsRequired();


            // Usuario → Publicacion
            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);


            // Edificio → Publicacion
            entity.HasOne(e => e.Edificio)
                .WithMany(e => e.Publicaciones)
                .HasForeignKey(e => e.IdEdificio)
                .OnDelete(DeleteBehavior.Restrict);


            // Categoria → Publicacion
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

            entity.Property(e => e.IdComentario)
                .HasColumnName("id_comentario");

            entity.Property(e => e.IdPublicacion)
                .HasColumnName("id_publicacion");

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.Contenido)
                .HasColumnName("contenido")
                .IsRequired();

            entity.Property(e => e.Fecha)
                .HasColumnName("fecha")
                .IsRequired();


            // Publicacion → Comentario
            entity.HasOne(e => e.Publicacion)
                .WithMany(e => e.Comentarios)
                .HasForeignKey(e => e.IdPublicacion)
                .OnDelete(DeleteBehavior.Restrict);


            // Usuario → Comentario
            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);
        });


        // =========================
        // EVENTO
        // =========================

        modelBuilder.Entity<Evento>(entity =>
        {
            entity.ToTable("evento");

            entity.HasKey(e => e.IdEvento);

            entity.Property(e => e.IdEvento)
                .HasColumnName("id_evento");

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.IdEdificio)
                .HasColumnName("id_edificio");

            entity.Property(e => e.Nombre)
                .HasColumnName("nombre")
                .IsRequired();

            entity.Property(e => e.Descripcion)
                .HasColumnName("descripcion")
                .IsRequired();

            entity.Property(e => e.Fecha)
                .HasColumnName("fecha")
                .IsRequired();

            entity.Property(e => e.Hora)
                .HasColumnName("hora")
                .IsRequired();

            entity.Property(e => e.Ubicacion)
                .HasColumnName("ubicacion")
                .IsRequired();

            entity.Property(e => e.CantidadParticipantes)
                .HasColumnName("cantidad_participantes")
                .IsRequired();


            // Usuario → Evento
            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);


            // Edificio → Evento
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

            entity.Property(e => e.IdEncuesta)
                .HasColumnName("id_encuesta");

            entity.Property(e => e.IdPublicacion)
                .HasColumnName("id_publicacion");

            entity.Property(e => e.FechaInicio)
                .HasColumnName("fecha_inicio")
                .IsRequired();

            entity.Property(e => e.FechaFin)
                .HasColumnName("fecha_fin")
                .IsRequired();

            entity.Property(e => e.Estado)
                .HasColumnName("estado")
                .IsRequired();


            // Publicacion → Encuesta (1:1)
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

            entity.Property(e => e.IdOpcion)
                .HasColumnName("id_opcion");

            entity.Property(e => e.IdEncuesta)
                .HasColumnName("id_encuesta");

            entity.Property(e => e.Texto)
                .HasColumnName("texto")
                .IsRequired();


            // Encuesta → Opciones
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

            entity.Property(e => e.IdRespuesta)
                .HasColumnName("id_respuesta");

            entity.Property(e => e.IdEncuesta)
                .HasColumnName("id_encuesta");

            entity.Property(e => e.IdOpcion)
                .HasColumnName("id_opcion");

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.FechaRespuesta)
                .HasColumnName("fecha_respuesta")
                .IsRequired();


            // Encuesta → Respuesta
            entity.HasOne(e => e.Encuesta)
                .WithMany(e => e.Respuestas)
                .HasForeignKey(e => e.IdEncuesta)
                .OnDelete(DeleteBehavior.Restrict);


            // Opcion → Respuesta
            entity.HasOne(e => e.Opcion)
                .WithMany(e => e.Respuestas)
                .HasForeignKey(e => e.IdOpcion)
                .OnDelete(DeleteBehavior.Restrict);


            // Usuario → Respuesta
            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);
        });


        // =========================
        // PAQUETE
        // =========================

        modelBuilder.Entity<Paquete>(entity =>
        {
            entity.ToTable("paquete");

            entity.HasKey(e => e.IdPaquete);

            entity.Property(e => e.IdPaquete)
                .HasColumnName("id_paquete");

            entity.Property(e => e.IdUnidad)
                .HasColumnName("id_unidad");

            entity.Property(e => e.IdUsuarioRegistro)
                .HasColumnName("id_usuario_registro");

            entity.Property(e => e.Identificacion)
                .HasColumnName("identificacion")
                .IsRequired();

            entity.Property(e => e.FechaRecepcion)
                .HasColumnName("fecha_recepcion")
                .IsRequired();

            entity.Property(e => e.Observaciones)
                .HasColumnName("observaciones");

            entity.Property(e => e.Estado)
                .HasColumnName("estado")
                .IsRequired();


            // Unidad → Paquete
            entity.HasOne(e => e.Unidad)
                .WithMany(e => e.Paquetes)
                .HasForeignKey(e => e.IdUnidad)
                .OnDelete(DeleteBehavior.Restrict);


            // Usuario → Paquete (usuario que registra)
            entity.HasOne(e => e.UsuarioRegistro)
                .WithMany()
                .HasForeignKey(e => e.IdUsuarioRegistro)
                .OnDelete(DeleteBehavior.Restrict);
        });


        // =========================
        // NOTIFICACION
        // =========================

        modelBuilder.Entity<Notificacion>(entity =>
        {
            entity.ToTable("notificacion");

            entity.HasKey(e => e.IdNotificacion);

            entity.Property(e => e.IdNotificacion)
                .HasColumnName("id_notificacion");

            entity.Property(e => e.IdUsuario)
                .HasColumnName("id_usuario");

            entity.Property(e => e.Tipo)
                .HasColumnName("tipo")
                .IsRequired();

            entity.Property(e => e.Mensaje)
                .HasColumnName("mensaje")
                .IsRequired();

            entity.Property(e => e.Fecha)
                .HasColumnName("fecha")
                .IsRequired();

            entity.Property(e => e.Leida)
                .HasColumnName("leida")
                .IsRequired();


            // Usuario → Notificacion
            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}