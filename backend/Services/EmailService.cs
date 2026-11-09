using System.Net;
using System.Net.Mail;

namespace VecinApp.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IConfiguration configuration,
        ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public bool EstaConfigurado =>
        !string.IsNullOrWhiteSpace(_configuration["SmtpSettings:Host"]) &&
        !string.IsNullOrWhiteSpace(_configuration["SmtpSettings:From"]);

    public async Task<bool> EnviarAsync(
        string destinatario,
        string asunto,
        string cuerpoHtml)
    {
        if (!EstaConfigurado)
        {
            _logger.LogWarning(
                "SMTP no está configurado. No se envió el correo a {Destinatario}.",
                destinatario);
            return false;
        }

        var host = _configuration["SmtpSettings:Host"]!;
        var from = _configuration["SmtpSettings:From"]!;
        var puerto = _configuration.GetValue("SmtpSettings:Port", 587);
        var habilitarSsl = _configuration.GetValue("SmtpSettings:EnableSsl", true);
        var usuario = _configuration["SmtpSettings:Username"];
        var password = _configuration["SmtpSettings:Password"];

        try
        {
            using var client = new SmtpClient(host, puerto)
            {
                EnableSsl = habilitarSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            if (!string.IsNullOrWhiteSpace(usuario))
            {
                client.Credentials = new NetworkCredential(usuario, password);
            }

            using var message = new MailMessage(from, destinatario, asunto, cuerpoHtml)
            {
                IsBodyHtml = true
            };

            await client.SendMailAsync(message);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "No se pudo enviar el correo a {Destinatario}.",
                destinatario);
            return false;
        }
    }
}
