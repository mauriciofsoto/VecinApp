# VecinApp - Backend

Backend de VecinApp realizado con .NET, Entity Framework Core y PostgreSQL.

## Tecnologías

* .NET 10
* ASP.NET Core Web API
* Entity Framework Core
* PostgreSQL
* Npgsql

## Estructura

```text
VecinApp/
├── Controllers/
├── Data/
├── Repositories/
├── Services/
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
└── VecinApp.csproj
```

## Requisitos

Tener instalado:

* .NET 10
* PostgreSQL
* Git

Podemos comprobar la versión de .NET con:

```powershell
dotnet --version
```

## Configuración de la base de datos

Para trabajar localmente usamos PostgreSQL.

Crear una base de datos llamada:

```text
vecinapp_dev
```

La conexión utiliza:

```text
Host: localhost
Port: 5432
Database: vecinapp_dev
Username: postgres
```

La contraseña no se guarda en el repositorio. Para eso usamos **User Secrets**.

Desde la carpeta del proyecto:

```powershell
dotnet user-secrets init
```

Después configurar la conexión:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" 'Host=localhost;Port=5432;Database=vecinapp_dev;Username=postgres;Password=TU_CONTRASEÑA'
```

Reemplazar `TU_CONTRASEÑA` por la contraseña del usuario `postgres`.

Para ver los secretos configurados:

```powershell
dotnet user-secrets list
```

> Si la contraseña tiene caracteres especiales como `$`, usar comillas simples `' '` en el comando.

## Instalar dependencias

Desde la carpeta del proyecto:

```powershell
dotnet restore
```

## Migraciones

Para aplicar las migraciones a la base de datos:

```powershell
dotnet ef database update
```

La primera migración del proyecto es:

```text
InitialCreate
```

Si la base ya está actualizada, aparecerá:

```text
No migrations were applied. The database is already up to date.
```

Para crear una nueva migración:

```powershell
dotnet ef migrations add NombreDeLaMigracion
```

## Ejecutar el proyecto

Ejecutar:

```powershell
dotnet run
```

La consola va a mostrar la dirección donde está corriendo la API.

## Health Check

Tenemos un endpoint para comprobar que la API funciona y que puede conectarse a la base de datos:

```text
GET /health
```

Por ejemplo:

```text
https://localhost:XXXX/health
```

Si todo funciona correctamente:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Si no puede conectarse a PostgreSQL:

```json
{
  "status": "error",
  "database": "disconnected"
}
```

## Desarrollo

Para levantar el proyecto normalmente:

```powershell
dotnet restore
dotnet ef database update
dotnet run
```

Después podemos probar:

```text
GET /health
```

## Base de datos

Por ahora usamos PostgreSQL de forma local.

Más adelante se va a configurar **AWS RDS** para el ambiente correspondiente. La idea es cambiar solamente la configuración de conexión y mantener el resto del backend igual.

## Importante

No subir al repositorio:

* Contraseñas
* Connection strings con contraseñas
* User Secrets
* Otras credenciales

Las credenciales locales se manejan mediante **User Secrets**.
