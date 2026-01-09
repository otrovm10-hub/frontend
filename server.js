const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* ============================================================
   UTILIDADES JSON (async)
============================================================ */
async function cargarJSON(nombre) {
  try {
    const data = await fs.readFile(nombre, "utf8");
    return data.trim() === "" ? {} : JSON.parse(data);
  } catch {
    return {};
  }
}

async function guardarJSON(nombre, data) {
  await fs.writeFile(nombre, JSON.stringify(data, null, 2));
}

/* Normaliza una tarea */
function normalizarTarea(t) {
  if (typeof t === "string") {
    return {
      tarea: t,
      estado: "pendiente",
      obsEmpleado: "",
      obsAdmin: "",
      motivoNoRealizada: ""
    };
  }
  return {
    tarea: t.tarea,
    estado: t.estado || "pendiente",
    obsEmpleado: t.obsEmpleado || "",
    obsAdmin: t.obsAdmin || "",
    motivoNoRealizada: t.motivoNoRealizada || ""
  };
}

/* ============================================================
   CATALOGO
============================================================ */
app.get("/catalogo", (req, res) => {
  const catalogo = require("./catalogo_tareas.js");
  res.json(catalogo);
});

/* ============================================================
   EMPLEADOS
============================================================ */
app.get("/empleados", async (req, res) => {
  const empleados = await cargarJSON("empleados.json");
  res.json(empleados);
});

/* ============================================================
   TAREAS DEL DÍA (empleado)
============================================================ */
app.get("/tareas-del-dia/:id", async (req, res) => {
  const id = req.params.id;
  const fecha = req.query.fecha || new Date().toISOString().split("T")[0];

  const rutina = await cargarJSON("rutina.json");

  if (!rutina[fecha]) rutina[fecha] = {};
  if (!rutina[fecha][id]) rutina[fecha][id] = [];

  rutina[fecha][id] = rutina[fecha][id].map(normalizarTarea);

  await guardarJSON("rutina.json", rutina);

  res.json({ empleado: id, fecha, tareas: rutina[fecha][id] });
});

/* ============================================================
   EMPLEADO: ESTADOS
============================================================ */
app.post("/guardar-estado", async (req, res) => {
  const { empleado, fecha, tarea, estado, motivoNoRealizada } = req.body;

  const rutina = await cargarJSON("rutina.json");
  const pendientes = await cargarJSON("PendientesAdmin.json");

  if (!rutina[fecha] || !rutina[fecha][empleado]) {
    return res.json({ ok: false });
  }

  // EN PROCESO
  if (estado === "en_proceso") {
    rutina[fecha][empleado] = rutina[fecha][empleado].map(t =>
      (t.tarea === tarea)
        ? { ...t, estado: "en_proceso" }
        : t
    );

    await guardarJSON("rutina.json", rutina);
    return res.json({ ok: true });
  }

  // TERMINADA / NO REALIZADA → mover a pendientes
  let tareaObj = null;

  rutina[fecha][empleado] = rutina[fecha][empleado].filter(t => {
    if (t.tarea === tarea) {
      tareaObj = t;
      return false;
    }
    return true;
  });

  if (!pendientes[fecha]) pendientes[fecha] = {};
  if (!pendientes[fecha][empleado]) pendientes[fecha][empleado] = [];

  pendientes[fecha][empleado].push({
    tarea,
    estado,
    obsEmpleado: tareaObj.obsEmpleado || "",
    motivoNoRealizada: motivoNoRealizada || tareaObj.motivoNoRealizada || ""
  });

  await guardarJSON("rutina.json", rutina);
  await guardarJSON("PendientesAdmin.json", pendientes);

  res.json({ ok: true });
});

/* ============================================================
   EMPLEADO: OBSERVACIÓN
============================================================ */
app.post("/guardar-observacion", async (req, res) => {
  const { empleado, fecha, tarea, observacion } = req.body;

  const rutina = await cargarJSON("rutina.json");

  if (!rutina[fecha]) rutina[fecha] = {};
  if (!rutina[fecha][empleado]) rutina[fecha][empleado] = [];

  rutina[fecha][empleado] = rutina[fecha][empleado].map(t =>
    (t.tarea === tarea)
      ? { ...t, obsEmpleado: observacion }
      : t
  );

  await guardarJSON("rutina.json", rutina);
  res.json({ ok: true });
});

/* ============================================================
   ADMIN: OBSERVACIÓN
============================================================ */
app.post("/guardar-observacion-admin", async (req, res) => {
  const { id, fecha, tarea, observacionAdmin } = req.body;

  const rutina = await cargarJSON("rutina.json");

  if (!rutina[fecha] || !rutina[fecha][id]) {
    return res.json({ ok: false });
  }

  rutina[fecha][id] = rutina[fecha][id].map(t =>
    (t.tarea === tarea)
      ? { ...t, obsAdmin: observacionAdmin }
      : t
  );

  await guardarJSON("rutina.json", rutina);
  res.json({ ok: true });
});

/* ============================================================
   ADMIN: AGREGAR TAREA
============================================================ */
app.post("/admin/agregar-tarea", async (req, res) => {
  const { id, fecha, tarea } = req.body;

  const rutina = await cargarJSON("rutina.json");

  if (!rutina[fecha]) rutina[fecha] = {};
  if (!rutina[fecha][id]) rutina[fecha][id] = [];

  rutina[fecha][id].push(normalizarTarea(tarea));

  await guardarJSON("rutina.json", rutina);
  res.json({ ok: true });
});

/* ============================================================
   ADMIN: TAREAS COMPLETAS
============================================================ */
app.get("/admin/tareas-completas", async (req, res) => {
  const fecha = req.query.fecha;
  if (!fecha) return res.json([]);

  const rutina = await cargarJSON("rutina.json");
  const pendientes = await cargarJSON("PendientesAdmin.json");
  const empleados = await cargarJSON("empleados.json");

  const resultado = [];

  // Asignadas
  if (rutina[fecha]) {
    for (const [id, tareas] of Object.entries(rutina[fecha])) {
      tareas.forEach(t =>
        resultado.push({
          id,
          nombre: empleados[id] || id,
          fecha,
          tarea: t.tarea,
          estado: t.estado,
          obsEmpleado: t.obsEmpleado,
          obsAdmin: t.obsAdmin,
          motivoNoRealizada: "",
          tipo: "asignada"
        })
      );
    }
  }

  // Pendientes
  if (pendientes[fecha]) {
    for (const [id, tareas] of Object.entries(pendientes[fecha])) {
      tareas.forEach(t =>
        resultado.push({
          id,
          nombre: empleados[id] || id,
          fecha,
          tarea: t.tarea,
          estado: t.estado,
          obsEmpleado: t.obsEmpleado,
          obsAdmin: "",
          motivoNoRealizada: t.motivoNoRealizada,
          tipo: "pendiente_admin"
        })
      );
    }
  }

  res.json(resultado);
});

/* ============================================================
   ADMIN: APROBAR
============================================================ */
app.post("/admin/aprobar", async (req, res) => {
  const { id, fecha, tarea, observacionAdmin } = req.body;

  const pendientes = await cargarJSON("PendientesAdmin.json");
  const historial = await cargarJSON("Historial.json");

  if (!pendientes[fecha] || !pendientes[fecha][id]) {
    return res.json({ ok: false });
  }

  let tareaObj = null;

  pendientes[fecha][id] = pendientes[fecha][id].filter(t => {
    if (t.tarea === tarea) {
      tareaObj = t;
      return false;
    }
    return true;
  });

  if (pendientes[fecha][id].length === 0) delete pendientes[fecha][id];
  if (Object.keys(pendientes[fecha]).length === 0) delete pendientes[fecha];

  if (!historial[fecha]) historial[fecha] = {};
  if (!historial[fecha][id]) historial[fecha][id] = [];

  historial[fecha][id].push({
    tarea,
    estado: tareaObj.estado,
    obsEmpleado: tareaObj.obsEmpleado,
    obsAdmin: observacionAdmin || "",
    motivoNoRealizada: tareaObj.motivoNoRealizada,
    verificada: true
  });

  await guardarJSON("PendientesAdmin.json", pendientes);
  await guardarJSON("Historial.json", historial);

  res.json({ ok: true });
});

/* ============================================================
   ADMIN: REPROGRAMAR
============================================================ */
app.post("/admin/reprogramar", async (req, res) => {
  const { id, fecha, tarea, nuevaFecha, observacionAdmin } = req.body;

  const pendientes = await cargarJSON("PendientesAdmin.json");
  const rutina = await cargarJSON("rutina.json");

  if (!pendientes[fecha] || !pendientes[fecha][id]) {
    return res.json({ ok: false });
  }

  let tareaObj = null;

  pendientes[fecha][id] = pendientes[fecha][id].filter(t => {
    if (t.tarea === tarea) {
      tareaObj = t;
      return false;
    }
    return true;
  });

  if (pendientes[fecha][id].length === 0) delete pendientes[fecha][id];
  if (Object.keys(pendientes[fecha]).length === 0) delete pendientes[fecha];

  if (!rutina[nuevaFecha]) rutina[nuevaFecha] = {};
  if (!rutina[nuevaFecha][id]) rutina[nuevaFecha][id] = [];

  rutina[nuevaFecha][id].push({
    tarea,
    estado: "pendiente",
    obsEmpleado: tareaObj.obsEmpleado,
    obsAdmin: observacionAdmin || "",
    motivoNoRealizada: ""
  });

  await guardarJSON("PendientesAdmin.json", pendientes);
  await guardarJSON("rutina.json", rutina);

  res.json({ ok: true });
});

/* ============================================================
   HISTORIAL
============================================================ */
app.get("/admin/historial", async (req, res) => {
  const historial = await cargarJSON("Historial.json");
  const empleados = await cargarJSON("empleados.json");

  const resultado = [];

  for (const [fecha, empleadosData] of Object.entries(historial)) {
    for (const [id, tareas] of Object.entries(empleadosData)) {
      tareas.forEach(t => {
        if (t.verificada) {
          resultado.push({
            fecha,
            id,
            nombre: empleados[id],
            tarea: t.tarea,
            estado: t.estado,
            obsEmpleado: t.obsEmpleado,
            obsAdmin: t.obsAdmin,
            motivoNoRealizada: t.motivoNoRealizada
          });
        }
      });
    }
  }

  res.json(resultado);
});

/* ============================================================
   INICIO
============================================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "empleados.html"));
});

/* ============================================================
   INICIAR SERVIDOR
============================================================ */
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
