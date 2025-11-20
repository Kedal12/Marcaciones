using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MarcacionAPI.DTOs.Horarios;

public class HorarioCreateDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    public bool Activo { get; set; } = true;

    // --- AÑADIDO: IdSede opcional ---
    // Si es null, el horario es Global (solo SuperAdmin puede crear/editar)
    // Si tiene valor, pertenece a una Sede (SuperAdmin o Admin de esa Sede)
    public int? IdSede { get; set; }

    // --- FIN AÑADIDO ---
}

public class HorarioUpdateDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    public bool Activo { get; set; } = true;

    // --- AÑADIDO: IdSede opcional ---
    public int? IdSede { get; set; }

    // --- FIN AÑADIDO ---
}

public class HorarioDetalleDto
{
    /// 1=Lunes ... 7=Domingo
    public int DiaSemana { get; set; }

    public bool Laborable { get; set; } = true;
    public TimeSpan? HoraEntrada { get; set; }
    public TimeSpan? HoraSalida { get; set; }
    public int ToleranciaMin { get; set; } = 0;
    public int RedondeoMin { get; set; } = 0;
    public int DescansoMin { get; set; } = 0;
}

public class HorarioUpsertDetallesDto
{
    public List<HorarioDetalleDto> Detalles { get; set; } = new();
}

public class AsignarHorarioDto
{
    public int IdUsuario { get; set; }
    public int IdHorario { get; set; }
    public DateOnly Desde { get; set; }
    public DateOnly? Hasta { get; set; }
}

public class HorarioDetalleResponseDto
{
    public int Id { get; set; }
    public string Dia { get; set; } = string.Empty; // "YYYY-MM-DD"
    public string Desde { get; set; } = string.Empty; // "HH:mm:ss"
    public string Hasta { get; set; } = string.Empty; // "HH:mm:ss"
    public string? SedeNombre { get; set; }
    public string? Observacion { get; set; } // Ej. Nombre del Horario
}