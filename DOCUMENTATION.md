# Documentación del Proyecto: VIBRA Central

## 1. Descripción General

VIBRA Central es un sistema de gestión de operaciones y rendimiento (OS) diseñado para la cadena de gimnasios VIBRA. La plataforma permite a los líderes de sede y al CEO monitorear KPIs, gestionar equipos y centralizar la documentación operativa, todo en tiempo real.

## 2. Roles y Permisos

La aplicación define dos roles de usuario principales con capacidades distintas para asegurar una gestión eficiente y segura.

---

### Rol: CEO

El CEO tiene una visión global y estratégica de toda la operación. Su panel de control está diseñado para la toma de decisiones de alto nivel y la supervisión de todas las sedes.

#### Puede Hacer:
- **Ver Panel Global:** Acceder a un dashboard que consolida los KPIs más importantes (Ventas, Metas, Pronósticos, Retención, NPS) de todas las sedes.
- **Filtrar por Sede:** Navegar y visualizar los dashboards, historiales de reportes, sesiones 1-a-1 y evidencias documentales de cualquier sede de forma individual.
- **Editar KPIs Clave:** Modificar y establecer las "Ventas a la fecha" y la "Meta Mensual" para cada una de las sedes directamente desde el panel principal.
- **Consultar Historial de Reportes:** Revisar todos los reportes diarios enviados por cada Líder de Sede.
- **Consultar Sesiones 1-a-1:** Ver el registro de todas las sesiones de coaching y feedback que los líderes tienen con sus equipos.
- **Revisar Evidencias:** Acceder y visualizar toda la documentación subida por las sedes (actas, acciones preventivas/correctivas).

#### No Puede Hacer:
- **Enviar Reportes Diarios:** Esta es una tarea operativa exclusiva de los Líderes de Sede.
- **Registrar Sesiones 1-a-1:** La gestión del equipo directo es responsabilidad de cada líder.
- **Subir Evidencias Documentales:** La carga de documentos operativos corresponde a la sede que los genera.

---

### Rol: Líder de Sede (Site Leader)

El Líder de Sede es responsable de la operación diaria de su gimnasio. Su vista está enfocada en el rendimiento y la gestión de su propia sede.

#### Puede Hacer:
- **Ver Panel de Sede:** Acceder a un dashboard con los KPIs específicos de su sede (Ventas vs. Meta, Pronóstico, Retención, NPS, etc.).
- **Enviar Reporte Diario:** Completar y enviar un formulario con las métricas y novedades cualitativas del día.
- **Consultar Historial de su Sede:** Revisar todos los reportes diarios que ha enviado previamente.
- **Registrar Sesiones 1-a-1:** Documentar las sesiones de coaching y feedback con los miembros de su equipo (Entrenadores, Asesores).
- **Subir Evidencias:** Cargar documentos importantes como fotos o PDFs (actas de reunión, checklists de mantenimiento, etc.) en el gestor documental.

#### No Puede Hacer:
- **Ver Datos de Otras Sedes:** Su acceso está limitado a la información de su propio gimnasio.
- **Establecer o Editar Metas de Venta:** Las metas son definidas por el CEO.
- **Acceder al Panel Global:** No puede ver la vista consolidada de todas las sedes.

## 3. Especificaciones Generales de UX/UI

La interfaz está diseñada para ser moderna, limpia y funcional, priorizando la claridad de los datos y la facilidad de uso.

### Diseño y Layout
- **Estructura:** La aplicación utiliza un layout de dos columnas con una **barra lateral de navegación fija a la izquierda** y un área de contenido dinámico a la derecha.
- **Navegación Colapsable:** La barra lateral es colapsable para maximizar el espacio del contenido en pantallas de escritorio. En dispositivos móviles, se convierte en un menú off-canvas.
- **Responsividad:** El diseño está implementado con Tailwind CSS y es completamente responsivo, asegurando una experiencia óptima en escritorio, tablet y móvil.

### Paleta de Colores y Tipografía
- **Fuente Principal:** Se utiliza la fuente `Inter` (sans-serif) para todos los textos, titulares y cuerpo, por su excelente legibilidad en pantalla.
- **Colores Primarios:**
  - **Primario (Marca):** Azul VIBRA (`#3B82F6`) para botones principales, enlaces y elementos de enfoque.
  - **Fondo:** Gris claro (`#F9FAFB`) para crear un fondo limpio y profesional que no cansa la vista.
  - **Acento (Interactivo):** Teal (`#2DD4BF`) para elementos interactivos clave, como líneas en gráficos o indicadores que necesitan destacar.

### Componentes e Interacciones
- **Biblioteca de Componentes:** Se utiliza **ShadCN UI**, que proporciona un conjunto de componentes accesibles y estéticamente agradables (botones, tarjetas, tablas, modales, etc.).
- **Estilo de Componentes:** Los elementos tienen bordes redondeados (`rounded-md`), sombras sutiles (`shadow-sm`) para dar profundidad y una apariencia profesional.
- **Visualización de Datos:** Se emplean gráficos de la librería `Recharts` (integrados con ShadCN) para mostrar KPIs de forma clara y atractiva.
- **Feedback al Usuario:**
  - Se utilizan indicadores de carga (`Loader2`) durante las operaciones asíncronas.
  - Las notificaciones de éxito o error se muestran mediante componentes "Toast" no intrusivos.
- **Iconografía:** Se utiliza la librería `lucide-react` para iconos claros, consistentes y modernos en toda la aplicación.
