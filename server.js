const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function cargarJSON(nombre) {
  if (!fs.existsSync(nombre)) return {};
  const contenido = fs.readFileSync(nombre, "utf8").trim();
  if (contenido === "") return {};
  return JSON.parse(contenido);
}

function guardarJSON(nombre, data) {
  fs.writeFileSync(nombre, JSON.stringify(data, null, 2));
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
app.get("/empleados", (req, res) => {
  const empleados = cargarJSON("empleados.json");
  res.json(empleados);
});

/* ============================================================
   TAREAS DEL DÍA (empleado)
============================================================ */
app.get("/tareas-del-dia/:id", (req, res) => {
  const id = req.params.id;
  const fecha = req.query.fecha || new Date().toISOString().split("T")[0];

  const rutina = cargarJSON("rutina.json");

  let tareas = rutina[fecha]?.[id] || [];

  tareas = tareas.map(t => {
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
  });

  if (!rutina[fecha]) rutina[fecha] = {};
  rutina[fecha][id] = tareas;
  guardarJSON("rutina.json", rutina);

  res.json({ empleado: id, fecha, tareas });
});

/* ============================================================
   EMPLEADO: ESTADOS
============================================================ */
app.post("/guardar-estado", (req, res) => {
  const { empleado, fecha, tarea, estado, motivoNoRealizada } = req.body;

  const rutina = cargarJSON("rutina.json");
  const pendientes = cargarJSON("PendientesAdmin.json");

  if (!rutina[fecha] || !rutina[fecha][empleado]) return res.json({ ok: false });

  // EN PROCESO → NO MOVER
  if (estado === "en_proceso") {
    rutina[fecha][empleado] = rutina[fecha][empleado].map(t => {
      if ((t.tarea || t) === tarea) {
        return {
          ...t,
          tarea: t.tarea || tarea,
          estado: "en_proceso"
        };
      }
      return t;
    });

    guardarJSON("rutina.json", rutina);
    return res.json({ ok: true });
  }

  // TERMINADA / NO REALIZADA → MOVER AL ADMIN
  let tareaObj = null;

  rutina[fecha][empleado] = rutina[fecha][empleado].filter(t => {
    if ((t.tarea || t) === tarea) {
      tareaObj = typeof t === "string" ? { tarea: t } : t;
      return false;
    }
    return true;
  });

  guardarJSON("rutina.json", rutina);

  if (!pendientes[fecha]) pendientes[fecha] = {};
  if (!pendientes[fecha][empleado]) pendientes[fecha][empleado] = [];

  pendientes[fecha][empleado].push({
    tarea,
    estado,
    obsEmpleado: tareaObj?.obsEmpleado || "",
    motivoNoRealizada: motivoNoRealizada || tareaObj?.motivoNoRealizada || ""
  });

  guardarJSON("PendientesAdmin.json", pendientes);

  res.json({ ok: true });
});

/* ============================================================
   EMPLEADO: OBSERVACIÓN
============================================================ */
app.post("/guardar-observacion", (req, res) => {
  const { empleado, fecha, tarea, observacion } = req.body;

  const rutina = cargarJSON("rutina.json");

  if (!rutina[fecha]) rutina[fecha] = {};
  if (!rutina[fecha][empleado]) rutina[fecha][empleado] = [];

  rutina[fecha][empleado] = rutina[fecha][empleado].map(t => {
    if ((t.tarea || t) === tarea) {
      return {
        ...t,
        tarea: t.tarea || tarea,
        obsEmpleado: observacion
      };
    }
    return t;
  });

  guardarJSON("rutina.json", rutina);
  res.json({ ok: true });
});

/* ============================================================
   ADMIN: GUARDAR OBSERVACIÓN EN RUTINA
============================================================ */
app.post("/guardar-observacion-admin", (req, res) => {
  const { id, fecha, tarea, observacionAdmin } = req.body;

  const rutina = cargarJSON("rutina.json");

  if (!rutina[fecha] || !rutina[fecha][id]) return res.json({ ok: false });

  rutina[fecha][id] = rutina[fecha][id].map(t => {
    if ((t.tarea || t) === tarea) {
      return {
        ...t,
        tarea: t.tarea || tarea,
        obsAdmin: observacionAdmin
      };
    }
    return t;
  });

  guardarJSON("rutina.json", rutina);
  res.json({ ok: true });
});

/* ============================================================
   ADMIN: AGREGAR TAREA
============================================================ */
app.post("/admin/agregar-tarea", (req, res) => {
  const { id, fecha, tarea } = req.body;

  const rutina = cargarJSON("rutina.json");

  if (!rutina[fecha]) rutina[fecha] = {};
  if (!rutina[fecha][id]) rutina[fecha][id] = [];

  rutina[fecha][id].push({
    tarea,
    estado: "pendiente",
    obsEmpleado: "",
    obsAdmin: "",
    motivoNoRealizada: ""
  });

  guardarJSON("rutina.json", rutina);

  res.json({ ok: true });
});

/* ============================================================
   ADMIN: TAREAS COMPLETAS (rutina + pendientes)
============================================================ */
app.get("/admin/tareas-completas", (req, res) => {
  const fecha = req.query.fecha;
  if (!fecha) return res.json([]);

  const rutina = cargarJSON("rutina.json");
  const pendientes = cargarJSON("PendientesAdmin.json");
  const empleados = cargarJSON("empleados.json");

  const resultado = [];

  // TAREAS ASIGNADAS
  if (rutina[fecha]) {
    Object.entries(rutina[fecha]).forEach(([id, tareas]) => {
      tareas.forEach(t => {
        resultado.push({
          id,
          nombre: empleados[id] || id,
          fecha,
          tarea: t.tarea,
          estado: t.estado || "pendiente",
          obsEmpleado: t.obsEmpleado || "",
          obsAdmin: t.obsAdmin || "",
          motivoNoRealizada: "",
          tipo: "asignada"
        });
      });
    });
  }

  // TAREAS PENDIENTES DE APROBACIÓN
  if (pendientes[fecha]) {
    Object.entries(pendientes[fecha]).forEach(([id, tareas]) => {
      tareas.forEach(t => {
        resultado.push({
          id,
          nombre: empleados[id] || id,
          fecha,
          tarea: t.tarea,
          estado: t.estado,
          obsEmpleado: t.obsEmpleado || "",
          obsAdmin: "",
          motivoNoRealizada: t.motivoNoRealizada || "",
          tipo: "pendiente_admin"
        });
      });
    });
  }

  res.json(resultado);
});

/* ============================================================
   ADMIN: APROBAR → HISTORIAL + BORRAR
============================================================ */
app.post("/admin/aprobar", (req, res) => {
  const { id, fecha, tarea, observacionAdmin } = req.body;

  const pendientes = cargarJSON("PendientesAdmin.json");
  const historial = cargarJSON("Historial.json");

  if (!pendientes[fecha] || !pendientes[fecha][id]) {
    return res.json({ ok: false, error: "No existe la tarea pendiente" });
  }

  let tareaObj = null;

  pendientes[fecha][id] = pendientes[fecha][id].filter(t => {
    if (t.tarea === tarea) {
      tareaObj = t;
      return false;
    }
    return true;
  });

  // limpiar empleado vacío
  if (pendientes[fecha][id].length === 0) delete pendientes[fecha][id];

  // limpiar fecha vacía
  if (Object.keys(pendientes[fecha]).length === 0) delete pendientes[fecha];

  // agregar al historial
  if (!historial[fecha]) historial[fecha] = {};
  if (!historial[fecha][id]) historial[fecha][id] = [];

  historial[fecha][id].push({
    tarea,
    estado: tareaObj.estado,
    obsEmpleado: tareaObj.obsEmpleado || "",
    obsAdmin: observacionAdmin || "",
    motivoNoRealizada: tareaObj.motivoNoRealizada || "",
    verificada: true
  });

  guardarJSON("PendientesAdmin.json", pendientes);
  guardarJSON("Historial.json", historial);

  res.json({ ok: true });
});

/* ============================================================
   ADMIN: REPROGRAMAR / DEVOLVER
============================================================ */
app.post("/admin/reprogramar", (req, res) => {
  const { id, fecha, tarea, nuevaFecha, observacionAdmin } = req.body;

  const pendientes = cargarJSON("PendientesAdmin.json");
  const rutina = cargarJSON("rutina.json");

  if (!pendientes[fecha] || !pendientes[fecha][id]) {
    return res.json({ ok: false, error: "No existe la tarea pendiente" });
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
    obsEmpleado: tareaObj?.obsEmpleado || "",
    obsAdmin: observacionAdmin || "",
    motivoNoRealizada: ""
  });

  guardarJSON("PendientesAdmin.json", pendientes);
  guardarJSON("rutina.json", rutina);

  res.json({ ok: true });
});

/* ============================================================
   HISTORIAL
============================================================ */
app.get("/admin/historial", (req, res) => {
  const historial = cargarJSON("Historial.json");
  const empleados = cargarJSON("empleados.json");

  const resultado = [];

  Object.entries(historial).forEach(([fecha, empleadosData]) => {
    Object.entries(empleadosData).forEach(([id, tareas]) => {
      tareas.forEach(t => {
        if (t.verificada === true) {
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
    });
  });

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
