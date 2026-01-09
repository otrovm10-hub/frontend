import { supabase } from "./supabase";

export default async function handler(req, res) {
  const { id, fecha } = req.query;

  if (!id || !fecha) {
    return res.status(400).json({ error: "Faltan parámetros id o fecha" });
  }

  const { data, error } = await supabase
    .from("tareas")
    .select("*")
    .eq("empleado_id", id)
    .eq("fecha", fecha)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error consultando tareas:", error);
    return res.status(500).json({ error: "Error al obtener tareas" });
  }

  return res.status(200).json({
    empleado: id,
    fecha,
    tareas: data || []
  });
}
