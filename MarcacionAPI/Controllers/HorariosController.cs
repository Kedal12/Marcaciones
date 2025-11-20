// ARCHIVO: MarcacionAPI/Controllers/HorariosController.cs
// (Corregido: endpoint móvil con JOIN explícito desde HorarioDetalles)

using MarcacionAPI.Data;
using MarcacionAPI.DTOs;
using MarcacionAPI.DTOs.Horarios;
using MarcacionAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

// --- Añadidos para Seguridad y Auditoría ---
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MarcacionAPI.Utils; // Para Roles y UserExtensions
using System.Text.Json;   // Para Auditoría

namespace MarcacionAPI.Controllers;

[Authorize] // <- cualquier usuario autenticado; roles específicos se aplican por acción
[ApiController]
[Route("api/[controller]")]
public class HorariosController : ControllerBase
{
    private readonly ApplicationDbContext _ctx;

    public HorariosController(ApplicationDbContext ctx) => _ctx = ctx;

    // ================== ACCIONES ADMIN / SUPERADMIN ==================

    // GET api/horarios
    [HttpGet]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> Get()
    {
        var query = _ctx.Horarios.AsNoTracking().Include(h => h.Sede).AsQueryable();

        if (!User.IsSuperAdmin())
        {
            var sedeIdAdmin = User.GetSedeId() ?? 0;
            // Admin de sede ve los Globales (null) y los de su propia sede
            query = query.Where(h => h.IdSede == null || h.IdSede == sedeIdAdmin);
        }

        var items = await query
            .Select(h => new
            {
                h.Id,
                h.Nombre,
                h.Activo,
                h.IdSede,
                SedeNombre = h.Sede != null ? h.Sede.Nombre : null
            })
            .OrderBy(h => h.Nombre)
            .ToListAsync();

        return Ok(items);
    }

    // GET api/horarios/{id}
    [HttpGet("{id:int}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> GetById(int id)
    {
        var h = await _ctx.Horarios.AsNoTracking()
            .Include(x => x.Detalles)
            .Include(x => x.Sede)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (h is null) return NotFound();

        if (!User.IsSuperAdmin())
        {
            var sedeIdAdmin = User.GetSedeId() ?? 0;
            if (h.IdSede.HasValue && h.IdSede.Value != sedeIdAdmin)
                return Forbid("No puedes ver detalles de horarios de otra sede.");
        }

        return Ok(new
        {
            h.Id,
            h.Nombre,
            h.Activo,
            h.IdSede,
            SedeNombre = h.Sede?.Nombre,
            Detalles = h.Detalles
                .OrderBy(d => d.DiaSemana)
                .Select(d => new
                {
                    d.Id,
                    d.DiaSemana,
                    d.Laborable,
                    d.HoraEntrada,
                    d.HoraSalida,
                    d.ToleranciaMin,
                    d.RedondeoMin,
                    d.DescansoMin
                })
        });
    }

    // POST api/horarios
    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> Create([FromBody] HorarioCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest("Nombre requerido.");

        var idAdmin = User.GetUserId();
        if (idAdmin is null) return Unauthorized();

        var h = new Horario { Nombre = dto.Nombre.Trim(), Activo = dto.Activo };

        if (User.IsSuperAdmin())
        {
            if (dto.IdSede.HasValue && dto.IdSede.Value > 0)
            {
                if (!await _ctx.Sedes.AnyAsync(s => s.Id == dto.IdSede.Value))
                    return BadRequest("La Sede especificada no existe.");
                h.IdSede = dto.IdSede.Value;
            }
        }
        else
        {
            var sedeIdAdmin = User.GetSedeId() ?? 0;
            if (sedeIdAdmin == 0) return Forbid("Tu cuenta de admin no está asignada a una sede.");
            h.IdSede = sedeIdAdmin;
        }

        _ctx.Horarios.Add(h);

        _ctx.Auditorias.Add(new Auditoria
        {
            IdUsuarioAdmin = idAdmin.Value,
            Accion = "horario.create",
            Entidad = "Horario",
            EntidadId = h.Id,
            DataJson = JsonSerializer.Serialize(new { h.Nombre, h.Activo, h.IdSede })
        });

        await _ctx.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = h.Id }, new { h.Id, h.Nombre, h.Activo, h.IdSede });
    }

    // PUT api/horarios/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> Update(int id, [FromBody] HorarioUpdateDto dto)
    {
        var h = await _ctx.Horarios.FirstOrDefaultAsync(x => x.Id == id);
        if (h is null) return NotFound();

        var idAdmin = User.GetUserId();
        if (idAdmin is null) return Unauthorized();

        if (!User.IsSuperAdmin())
        {
            var sedeIdAdmin = User.GetSedeId() ?? 0;
            if (h.IdSede != sedeIdAdmin)
                return Forbid("No puedes editar horarios globales o de otra sede.");
            if (dto.IdSede != sedeIdAdmin)
                return BadRequest("No puedes cambiar la asignación de sede del horario.");
        }

        if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest("Nombre requerido.");

        if (User.IsSuperAdmin())
        {
            if (dto.IdSede.HasValue && dto.IdSede.Value > 0)
            {
                if (!await _ctx.Sedes.AnyAsync(s => s.Id == dto.IdSede.Value))
                    return BadRequest("La Sede especificada no existe.");
                h.IdSede = dto.IdSede.Value;
            }
            else
            {
                h.IdSede = null;
            }
        }

        h.Nombre = dto.Nombre.Trim();
        h.Activo = dto.Activo;

        _ctx.Auditorias.Add(new Auditoria
        {
            IdUsuarioAdmin = idAdmin.Value,
            Accion = "horario.update",
            Entidad = "Horario",
            EntidadId = h.Id,
            DataJson = JsonSerializer.Serialize(dto)
        });

        await _ctx.SaveChangesAsync();
        return NoContent();
    }

    // PUT api/horarios/{id}/detalles
    [HttpPut("{id:int}/detalles")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> UpsertDetalles(int id, [FromBody] HorarioUpsertDetallesDto dto)
    {
        var h = await _ctx.Horarios.Include(x => x.Detalles).FirstOrDefaultAsync(x => x.Id == id);
        if (h is null) return NotFound();

        var idAdmin = User.GetUserId();
        if (idAdmin is null) return Unauthorized();

        if (!User.IsSuperAdmin())
        {
            var sedeIdAdmin = User.GetSedeId() ?? 0;
            if (h.IdSede != sedeIdAdmin)
                return Forbid("No puedes editar detalles de horarios globales o de otra sede.");
        }

        if (dto.Detalles.Any(d => d.DiaSemana < 1 || d.DiaSemana > 7))
            return BadRequest("DiaSemana inválido (1..7).");
        if (dto.Detalles.Select(d => d.DiaSemana).Distinct().Count() != dto.Detalles.Count)
            return BadRequest("Días repetidos en detalles.");

        _ctx.HorarioDetalles.RemoveRange(h.Detalles);
        foreach (var d in dto.Detalles)
        {
            if (d.Laborable && (d.HoraEntrada is null || d.HoraSalida is null))
                return BadRequest($"Día {d.DiaSemana}: falta HoraEntrada/HoraSalida.");
            if (d.Laborable && d.HoraEntrada >= d.HoraSalida)
                return BadRequest($"Día {d.DiaSemana}: HoraEntrada debe ser < HoraSalida.");

            h.Detalles.Add(new HorarioDetalle
            {
                DiaSemana = d.DiaSemana,
                Laborable = d.Laborable,
                HoraEntrada = d.HoraEntrada,
                HoraSalida = d.HoraSalida,
                ToleranciaMin = Math.Max(0, d.ToleranciaMin),
                RedondeoMin = Math.Max(0, d.RedondeoMin),
                DescansoMin = Math.Max(0, d.DescansoMin),
            });
        }

        _ctx.Auditorias.Add(new Auditoria
        {
            IdUsuarioAdmin = idAdmin.Value,
            Accion = "horario.update.detalles",
            Entidad = "Horario",
            EntidadId = h.Id,
            DataJson = JsonSerializer.Serialize(dto.Detalles)
        });

        await _ctx.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/horarios/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> Delete(int id)
    {
        var h = await _ctx.Horarios.FirstOrDefaultAsync(x => x.Id == id);
        if (h is null) return NotFound();

        var idAdmin = User.GetUserId();
        if (idAdmin is null) return Unauthorized();

        if (!User.IsSuperAdmin())
        {
            var sedeIdAdmin = User.GetSedeId() ?? 0;
            if (h.IdSede != sedeIdAdmin)
                return Forbid("No puedes eliminar horarios globales o de otra sede.");
        }

        var asignado = await _ctx.UsuarioHorarios.AnyAsync(uh => uh.IdHorario == id);
        if (asignado) return Conflict("No se puede eliminar: hay usuarios con este horario asignado.");

        _ctx.Horarios.Remove(h);

        _ctx.Auditorias.Add(new Auditoria
        {
            IdUsuarioAdmin = idAdmin.Value,
            Accion = "horario.delete",
            Entidad = "Horario",
            EntidadId = id,
            DataJson = JsonSerializer.Serialize(new { h.Nombre, h.IdSede })
        });

        await _ctx.SaveChangesAsync();
        return NoContent();
    }

    // ================== ENDPOINT PARA LA APP MÓVIL ==================

    // GET /api/horarios/mis-horarios-semana
    // JOIN EXPLÍCITO DESDE HorarioDetalles (sin Include de Horario)
    [HttpGet("mis-horarios-semana")]
    [Authorize] // <- cualquier usuario autenticado (empleado/admin)
    public async Task<IActionResult> GetMisHorariosSemana(
        [FromQuery] string desdeISO,
        [FromQuery] string hastaISO)
    {
        var idUsuario = User.GetUserId();
        if (idUsuario is null) return Unauthorized();

        if (!DateTimeOffset.TryParse(desdeISO, out var desde) ||
            !DateTimeOffset.TryParse(hastaISO, out var hasta))
        {
            return BadRequest("Formato de fecha inválido. Se espera ISO string (YYYY-MM-DDTHH:mm:ssZ).");
        }

        var diaInicio = DateOnly.FromDateTime(desde.Date);
        var diaFin = DateOnly.FromDateTime(hasta.Date);

        // Días del rango y su 1..7 (Lun..Dom)
        var diasRango = new List<DateOnly>();
        for (var d = diaInicio; d <= diaFin; d = d.AddDays(1))
            diasRango.Add(d);

        int Dow(DateOnly d) => ((int)d.DayOfWeek + 6) % 7 + 1; // L=1..D=7
        var diasSemana = diasRango.Select(Dow).Distinct().ToList();

        // 1) Asignaciones vigentes del usuario en el rango (no materializamos Horario)
        var asignaciones = await _ctx.UsuarioHorarios.AsNoTracking()
            .Where(uh => uh.IdUsuario == idUsuario.Value &&
                         uh.Desde <= diaFin &&
                         (uh.Hasta == null || uh.Hasta >= diaInicio))
            .Select(uh => new { uh.IdHorario, uh.Desde, uh.Hasta })
            .OrderBy(uh => uh.Desde)
            .ToListAsync();

        if (asignaciones.Count == 0)
            return Ok(new { items = new List<HorarioDetalleResponseDto>() });

        var horarioIds = asignaciones.Select(a => a.IdHorario).Distinct().ToList();

        // 2) Traer detalles por (HorarioId, DiaSemana) + nombre de horario + nombre de sede
        //    JOIN explícito desde Detalles, proyectando columnas necesarias (sin materializar Horario)
        var detalles = await (
            from d in _ctx.HorarioDetalles.AsNoTracking()
            join h in _ctx.Horarios.AsNoTracking() on d.IdHorario equals h.Id
            join s in _ctx.Sedes.AsNoTracking() on h.IdSede equals s.Id into sj
            from s in sj.DefaultIfEmpty()
            where horarioIds.Contains(d.IdHorario) && diasSemana.Contains(d.DiaSemana)
            select new
            {
                d.IdHorario,
                d.DiaSemana,
                d.Laborable,
                d.HoraEntrada,
                d.HoraSalida,
                d.ToleranciaMin,
                d.RedondeoMin,
                d.DescansoMin,
                HorarioNombre = h.Nombre,
                SedeNombre = (string?)s!.Nombre
            }
        ).ToListAsync();

        // Índice rápido por (HorarioId, DiaSemana)
        var detallesLookup = detalles
            .GroupBy(x => new { x.IdHorario, x.DiaSemana })
            .ToDictionary(g => (g.Key.IdHorario, g.Key.DiaSemana), g => g.First());

        // 3) Construcción de la respuesta día a día
        var resultados = new List<HorarioDetalleResponseDto>();

        foreach (var dia in diasRango)
        {
            var vigente = asignaciones.FirstOrDefault(a => a.Desde <= dia && (a.Hasta == null || a.Hasta >= dia));
            if (vigente is null) continue;

            var key = (vigente.IdHorario, Dow(dia));
            if (!detallesLookup.TryGetValue(key, out var det)) continue;

            if (det.Laborable && det.HoraEntrada.HasValue && det.HoraSalida.HasValue)
            {
                resultados.Add(new HorarioDetalleResponseDto
                {
                    Id = dia.DayNumber,
                    Dia = dia.ToString("yyyy-MM-dd"),
                    Desde = det.HoraEntrada.Value.ToString(@"hh\:mm\:ss"),
                    Hasta = det.HoraSalida.Value.ToString(@"hh\:mm\:ss"),
                    SedeNombre = det.SedeNombre,
                    Observacion = det.HorarioNombre
                });
            }
        }

        return Ok(new { items = resultados });
    }

    // ================== FIN ENDPOINT MÓVIL ==================
}