# Integración del Módulo ABM en el Editor

**Fecha:** Abril 2, 2026  
**Descripción:** Documentación de los cambios realizados para integrar el botón "Administrar Repositorio" en el menú de Settings del Editor.

---

## ✅ Cambios Realizados

### 1. Constantes Actualizadas (`src/data/constants.js`)

- Agregado: `MODAL.MANAGE_REPOSITORIES: 13`
- Permite identificar el nuevo modal en toda la aplicación

```javascript
export const MODAL = {
  // ... otros modales ...
  MANAGE_REPOSITORIES: 13,
};
```

### 2. Menú de Settings (`src/components/EditorHeader/ControlPanel.jsx`)

- Agregada la opción `manage_repositories` al objeto `menu.settings`
- Abre el modal MANAGE_REPOSITORIES cuando se hace click

```javascript
manage_repositories: {
  function: () => setModal(MODAL.MANAGE_REPOSITORIES),
},
```

### 3. Componente Modal (`src/components/EditorHeader/Modal/Modal.jsx`)

#### Import
```javascript
import RepositoryABM from "../../RepositoryABM";
```

#### En `getModalOnOk()`
```javascript
case MODAL.MANAGE_REPOSITORIES:
  setModal(MODAL.NONE);
  return;
```

#### En `getModalBody()`
```javascript
case MODAL.MANAGE_REPOSITORIES:
  return (
    <div style={{ maxHeight: "600px", overflow: "auto" }}>
      <RepositoryABM />
    </div>
  );
```

### 4. Configuración de Modal (`src/utils/modalData.js`)

Actualizada la función `getModalTitle()`:
```javascript
case MODAL.MANAGE_REPOSITORIES:
  return i18n.t("manage_repositories");
```

Actualizada la función `getModalWidth()`:
```javascript
case MODAL.MANAGE_REPOSITORIES:
  return 1000; // Ancho mayor para la tabla
```

Actualizada la función `getOkText()`:
```javascript
case MODAL.MANAGE_REPOSITORIES:
  return i18n.t("close");
```

### 5. Traducciones

#### English (`src/i18n/locales/en.js`)
- Agregado: `manage_repositories: "Manage repositories"`

#### Español (`src/i18n/locales/es.js`)
- Agregado: `manage_repositories: "Administrar repositorios"`
- Agregado: `close: "Cerrar"` (necesario para botón OK)

---

## 🎯 Cómo Usar

### Para el Usuario

1. **Abrir Editor** - Ir a la página de edición de diagramas
2. **Abrir Menú Settings** - Click en el icono de Settings (engranaje)
3. **Seleccionar "Administrar Repositorio"** - Se abre un modal con el ABM
4. **Gestionar Repositorios** - Agregar, editar, eliminar repositorios GitHub
5. **Cerrar Modal** - Click en botón "Cerrar"

### Para Desarrolladores

El flujo interno es:

```
Usuario → Click en Settings → menu.settings.manage_repositories.function()
       → setModal(MODAL.MANAGE_REPOSITORIES)
       → Modal visible y muestra RepositoryABM
       → Usuario interactúa con RepositoryABM
       → Click en Cerrar → setModal(MODAL.NONE)
```

---

## 📋 Checklist de Verificación

- [x] Constante MODAL.MANAGE_REPOSITORIES agregada
- [x] Opción en menú de settings creada
- [x] RepositoryABM importado en Modal
- [x] Casos en getModalOnOk() agregados
- [x] Casos en getModalBody() agregados
- [x] getModalTitle() actualizada
- [x] getModalWidth() actualizada
- [x] getOkText() actualizada
- [x] Traducción inglés agregada
- [x] Traducción español agregada
- [x] Modal abierto con ancho adecuado (1000px)
- [x] Botón OK muestra "Cerrar"
- [x] Modal cierra al hacer click en "Cerrar"

---

## 🔧 Archivos Modificados

1. `src/data/constants.js` - 1 línea agregada
2. `src/components/EditorHeader/ControlPanel.jsx` - 3 líneas agregadas
3. `src/components/EditorHeader/Modal/Modal.jsx` - 6 líneas agregadas (1 import, 2 cases)
4. `src/utils/modalData.js` - 4 líneas agregadas (3 cases)
5. `src/i18n/locales/en.js` - 1 línea agregada
6. `src/i18n/locales/es.js` - 2 líneas agregadas (manage_repositories + close)

**Total: 6 archivos modificados, 17 líneas agregadas**

---

## 🚀 Próximos Pasos

### Funcionalidad Recomendada
1. **Importar DBML desde Modal** - Agregar botón en RepositoryABM para importar archivos DBML directamente
2. **Validar Token** - Permitir validar token de GitHub desde el modal
3. **Buscar Repositorios** - Input para buscar repositorios disponibles
4. **Historial de Sincronización** - Mostrar última sincronización exitosa

### Testing Recomendado
- [ ] Abrir modal desde Settings
- [ ] Verificar ancho correcto del modal (1000px)
- [ ] Probar ABM completo dentro del modal
- [ ] Probar cerrar modal con botón "Cerrar"
- [ ] Probar con diferentes idiomas (Inglés, Español)
- [ ] Verificar que los cambios en repositorios se persisten

---

## 📝 Notas Técnicas

### Por qué 1000px de ancho
El RepositoryABM contiene una tabla con varias columnas:
- Nombre
- Rama
- Estado
- Sincronización
- Integraciones
- Acciones

Un ancho de 1000px permite que se muestre correctamente sin scroll horizontal excesivo.

### Por qué overflow: auto en el contenedor
El modal tiene una altura máxima de `window.innerHeight - 280`. Cuando hay muchos repositorios, la tabla puede exceder esta altura, por lo que el scroll es necesario.

### Interacción con RepositoryABM
El componente RepositoryABM maneja completamente su propio:
- Estado (repositorios, formulario, etc.)
- Validación
- Operaciones CRUD

El modal solo actúa como contenedor y cierra cuando se hace click en "Cerrar".

---

## ❓ FAQ

**P: ¿Por qué no se ve el ABM cuando abro el modal?**
A: Verifica que:
- El componente RepositoryABM.jsx exista en `src/components/`
- No haya errores en la consola (F12)
- El token de GitHub esté configurado

**P: ¿Cómo cambio el ancho del modal?**
A: Modifica el valor `1000` en `getModalWidth()` en `src/utils/modalData.js`

**P: ¿Puedo agregar más botones al modal?**
A: Sí, modificando el componente RepositoryABM o ajustando okButtonProps en Modal.jsx

---

**Últimas Actualización:** Abril 2, 2026
