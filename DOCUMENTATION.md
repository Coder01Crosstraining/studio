# Manual de Usuario: VIBRA Central

## 1. Introducción

Bienvenido a VIBRA Central, el sistema de gestión de operaciones y rendimiento (OS) diseñado exclusivamente para la cadena de gimnasios VIBRA. Esta plataforma es la herramienta central para monitorear indicadores de rendimiento (KPIs), gestionar equipos y centralizar la documentación operativa, todo en tiempo real y en un solo lugar.

## 2. Acceso y Primeros Pasos

### 2.1. Inicio de Sesión
Para acceder a la plataforma, dirígete a la página de inicio de sesión e ingresa las credenciales (correo electrónico y contraseña) que te han sido asignadas.

### 2.2. Interfaz Principal
Una vez dentro, te encontrarás con una interfaz limpia y moderna dividida en dos secciones principales:

- **Barra Lateral Izquierda**: Es tu centro de navegación. Aquí encontrarás los enlaces a todos los módulos de la aplicación. En computadoras de escritorio, la barra se expande al pasar el mouse sobre ella. En dispositivos móviles, se oculta y puedes acceder a ella a través del botón de menú (☰).
- **Área de Contenido Derecha**: Es el espacio dinámico donde se muestra la página o módulo que hayas seleccionado.

### 2.3. Menú de Usuario
En la parte inferior de la barra lateral, encontrarás tu perfil. Al hacer clic en el menú, podrás acceder a la **Configuración de Perfil** y a la opción de **Cerrar Sesión**.

## 3. Roles y Permisos

La aplicación define dos roles de usuario para asegurar una gestión eficiente y segura.

### Rol: CEO
El CEO tiene una visión global y estratégica de toda la operación.

- **Puede Hacer:**
  - Ver un panel global con los KPIs consolidados de todas las sedes.
  - Filtrar y ver los datos de cualquier sede de forma individual.
  - Editar las "Ventas a la fecha" y la "Meta Mensual" de cada sede.
  - Consultar el historial de reportes diarios, sesiones 1-a-1 y evidencias de todas las sedes.
  - Acceder al historial de KPIs mensuales para análisis de tendencias.
  - Gestionar usuarios (editar roles y asignaciones) y sedes (crear, editar, eliminar).

- **No Puede Hacer:**
  - Enviar reportes diarios, registrar sesiones 1-a-1 o subir evidencias (tareas operativas de los líderes).

### Rol: Líder de Sede (Site Leader)
El Líder de Sede es responsable de la operación diaria de su gimnasio.

- **Puede Hacer:**
  - Ver un panel con los KPIs exclusivos de su sede.
  - Enviar el reporte diario de rendimiento.
  - Registrar las sesiones 1-a-1 con los miembros de su equipo.
  - Subir documentos y evidencias.
  - Consultar el historial de reportes y sesiones de su propia sede.

- **No Puede Hacer:**
  - Ver datos de otras sedes.
  - Editar metas de venta.
  - Acceder a los módulos de gestión de usuarios y al historial de KPIs.

## 4. Módulos de la Aplicación

### 4.1. Panel Principal (`/`)
Es la primera pantalla que verás al iniciar sesión. Su contenido varía según tu rol.

- **Vista Global (CEO):**
  - **Tarjetas de KPIs Globales**: Muestran las ventas totales, la meta consolidada y el **NPS Promedio** de todas las sedes.
  - **Pronóstico de Ventas (IA)**: Una tarjeta especial que utiliza Inteligencia Artificial para proyectar las ventas totales del mes basándose en el rendimiento histórico y actual. Puedes recalcularlo en cualquier momento con el botón de refrescar.
  - **Tabla Comparativa de Sedes**: Un resumen del rendimiento de cada sede, permitiendo comparar KPIs clave de un vistazo.

- **Vista de Sede (CEO y Líder de Sede):**
  - **Tarjetas de KPIs de la Sede**: Muestra los indicadores clave: Ventas, Meta, Pronóstico, Retención, NPS y Ticket Promedio.
  - **Gráfico de Ventas Diarias**: Una visualización del rendimiento de los últimos 14 días, comparando las ventas diarias con la meta diaria.
  - **Editar KPIs (Solo CEO)**: El CEO puede hacer clic en el icono del lápiz (✏️) para ajustar manualmente las ventas acumuladas y la meta mensual de la sede.

### 4.2. Reporte Diario (`/weekly-report`) - Exclusivo para Líder de Sede
Este módulo es fundamental para el seguimiento diario.

- **Cómo funciona**: Completa los campos con la información del día: ventas, tasa de renovación y las secciones cualitativas (logro, desafío y lección aprendida).
- **NPS Promedio (Automático)**: Notarás que el campo "NPS Promedio" ya viene cargado con un valor y no es editable. Este dato se obtiene **automáticamente y una vez al día** desde una hoja de cálculo de Google Sheets, asegurando que la información sea siempre precisa y consistente.

### 4.3. Historial de Reportes (`/report-history`)
Aquí puedes consultar todos los reportes diarios que han sido enviados. El CEO puede filtrar los reportes por sede para revisar el desempeño de un gimnasio en particular.

### 4.4. Sesiones 1-a-1 (`/one-on-one`)
Un espacio para documentar el coaching y seguimiento del equipo.

- **Líder de Sede**: Puede registrar nuevas sesiones con los miembros de su equipo (Entrenadores, Asesores de Venta), detallando logros, oportunidades de mejora y planes de acción.
- **CEO**: Puede consultar todas las sesiones registradas en la compañía, filtrando por sede.

### 4.5. Gestión Documental (`/evidence`)
El repositorio central para todos los documentos importantes.

- **Líder de Sede**: Puede subir archivos (PDF, JPG, PNG) como actas de reunión, acciones correctivas/preventivas o material complementario. Opcionalmente, puede asociar un documento a una sesión 1-a-1 específica.
- **CEO**: Tiene acceso para visualizar todos los documentos subidos por todas las sedes.

## 5. Módulos Exclusivos para CEO

### 5.1. Historial de KPIs (`/history`)
Esta sección proporciona una vista histórica del rendimiento.

- **Cómo funciona**: Permite consultar los KPIs finales (cierre de mes) de todas las sedes para cualquier mes anterior. Es ideal para analizar tendencias a largo plazo.
- **Cierre Mensual Automático**: A principios de cada nuevo mes, el sistema automáticamente archiva los datos del mes anterior en esta sección y reinicia los contadores del panel principal a cero.

### 5.2. Gestión de Usuarios y Sedes (`/management`)

- **Gestionar Sedes**: Permite crear, editar o eliminar las sedes de la organización.
  - **Asignación Automática de Google Sheets**: Al crear una sede cuyo nombre incluya "Piedecuesta", "Floridablanca" o "Ciudadela", el sistema **automáticamente** asignará el ID de la hoja de cálculo de Google correspondiente para la carga del NPS, sin necesidad de configuración manual.
- **Gestionar Usuarios**: Permite editar el rol y la sede asignada de los usuarios existentes.
  - **Nota Importante**: Por seguridad, la creación y eliminación de cuentas de usuario debe realizarse directamente desde la Consola de Firebase.

## 6. Configuración de Perfil
Accede desde el menú de usuario en la barra lateral para:
- Cambiar tu nombre completo.
- Subir o cambiar tu foto de perfil.
- Activar o desactivar el **Modo Oscuro** para la interfaz.

## 7. Anexo: Procesos Automatizados e Integraciones

- **Firebase**: Es el corazón tecnológico de VIBRA Central. Gestiona la autenticación de usuarios, la base de datos en tiempo real (Firestore) y el almacenamiento de archivos.
- **Google Sheets**: Se utiliza como la fuente de verdad para el Net Promoter Score (NPS). El sistema se conecta una vez al día a las hojas de cálculo designadas para cada sede y actualiza el valor de NPS automáticamente.
- **Genkit (Inteligencia Artificial)**: Es el motor detrás del **Pronóstico de Ventas**. Esta tecnología analiza los datos históricos y actuales para generar una proyección inteligente del rendimiento del mes.
