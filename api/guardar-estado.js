import { supabase } from "./supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { id_tarea, nuevo_estado, obs_empleado, obs_admin, motivo_no_realizada } = req.body;

  if (!id_tarea) {
    return res.status(400).json({ error: "Falta id_tarea" });
  }

  // 1. Actualizar la tarea en Supabase
  const { error: updateError } = await supabase
    .from("tareas")
    .update({
      estado: nuevo_estado,
      obs_empleado,
      obs_admin,
      motivo_no_realizada
    })
    .eq("id", id_tarea);

  if (updateError) {
    console.error("Error actualizando tarea:", updateError);
    return res.status(500).json({ error: "Error al actualizar tarea" });
  }

  // 2. Obtener la tarea actualizada para registrar historial
  const { data: tareaData, error: tareaError } = await supabase
    .from("tareas")
    .select("*")
    .eq("id", id_tarea)
    .single();

  if (tareaError) {
    console.error("Error obteniendo tarea:", tareaError);
    return res.status(500).json({ error: "Error al obtener tarea actualizada" });
  }

  // 3. Registrar historial
  const accion = `Estado cambiado a: ${nuevo_estado}`;
  const detalle = `Empleado: ${tareaData.empleado_id} | Obs empleado: ${obs_empleado || ""} | Obs admin: ${obs_admin || ""} | Motivo: ${motivo_no_realizada || ""}`;

  const { error: historialError } = await supabase
    .from("historial")
    .insert({
      empleado_id: tareaData.empleado_id,
      fecha: tareaData.fecha,
      tarea: tareaData.tarea,
      accion,
      detalle
    });

  if (historialError) {
    console.error("Error guardando historial:", historialError);
    return res.status(500).json({ error: "Error al guardar historial" });
  }

  return res.status(200).json({ success: true });
}
