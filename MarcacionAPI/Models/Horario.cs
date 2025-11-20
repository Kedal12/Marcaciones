using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MarcacionAPI.Models;

public class Horario
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nombre { get; set; } = string.Empty;

    // --- NUEVOS CAMPOS (de tu primer archivo) ---
    // Valores por defecto para el horario

    public TimeSpan HoraEntrada { get; set; }

    public TimeSpan HoraSalida { get; set; }

    public int? MinutosTolerancia { get; set; }

    public bool PermitirCompensacion { get; set; } = true;

    // --- FIN DE NUEVOS CAMPOS ---

    public bool Activo { get; set; } = true;

    // --- Clave foránea a Sede (Ya estaba) ---
    public int? IdSede { get; set; } // Nullable: si es null, es "Global"

    [ForeignKey(nameof(IdSede))]
    public virtual Sede? Sede { get; set; }

    // --- Relaciones ---

    // Relación a los detalles (Ya estaba)
    public virtual ICollection<HorarioDetalle> Detalles { get; set; } = new List<HorarioDetalle>();

    // NUEVA Relación a Usuarios (de tu primer archivo)
    // Asegúrate de tener un modelo 'Usuario' definido
    public virtual ICollection<UsuarioHorario> Asignaciones { get; set; } = new List<UsuarioHorario>();
}