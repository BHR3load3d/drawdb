# Implementación: Combo de Archivos DBML con Opción "Nuevo"

## Resumen de Cambios

Se ha implementado la funcionalidad solicitada para agregar un item "Nuevo" por defecto al combo de archivos DBML, con la siguiente lógica:

### 1. **Componente: RepositorySelector.jsx** ✅

#### Estados Agregados:
- `newFileName` - Almacena el nombre del archivo a crear
- `isNewFile` - Bandera para distinguir entre crear nuevo vs importar existente

#### Cambios en `handleRepoChange()`:
- Cuando se selecciona un repositorio, **"Nuevo" se elige automáticamente por defecto**
- Se establece `isNewFile = true`
- Se limpian los campos relacionados

#### Cambios en `handleFileSelect()`:
- Si se selecciona "Nuevo" → Entra en modo de creación
- Si se selecciona un archivo existente → Entra en modo de importación
- **El input de nombre es visible solo en modo Nuevo** (fondo amarillo)
- **El input manual es visible solo en modo Importación**

#### Cambios en `handleImport()`:
Ahora maneja dos flujos completamente diferentes:

**Flujo 1: Crear Nuevo Archivo (when `isNewFile === true`)**
```
1. Valida que se haya ingresado un nombre
2. Agrega extensión .dbml si no la tiene
3. Establece sourceInfo con isNew = true
4. Inicializa diagrama vacío
5. Usuario puede editar y luego guardar
```

**Flujo 2: Importar Archivo Existente (when `isNewFile === false`)**
```
1. Importa el DBML del repositorio
2. Carga la configuración (_config.json) si existe
3. Aplica posiciones y settings del config
```

#### Cambios en JSX:
- **Combo de archivos** ahora incluye opción "✨ Nuevo" como primer item
- **Input de nombre** (amarillo) - Visible solo cuando `isNewFile === true`
- **Input manual** - Visible solo cuando `isNewFile === false`
- **Botón de acción** - Cambia de ✏️ (Nuevo) a 📥 (Importar)

### 2. **Hook: useSaveToGitHub.js** ✅

#### Validaciones Agregadas:
```javascript
// Si es archivo nuevo, requiere filePath
if (sourceInfo?.isNew && !sourceInfo.filePath) {
  throw error("Por favor especifica el nombre del archivo")
}
```

#### Logs Mejorados:
- Se registra `isNew` cuando se guarda
- Se muestra el estado en la consola

### 3. **Servicio: githubCommit.js** ✓

**No requiere cambios** - El servicio ya maneja:
- Creación de archivos nuevos (sin SHA)
- Actualización de archivos existentes (con SHA)
- Generación automática de `_config.json`

---

## Flujo de Usuario

### Escenario 1: Crear Nuevo Diagrama

```
1. Usuario selecciona repositorio
   → "Nuevo" se elige automáticamente
   
2. Usuario ve input amarillo para nombre
   → Ingresa: "mi_tabla_usuarios" o "mi_tabla_usuarios.dbml"
   
3. Usuario hace click en ✏️
   → Se inicializa diagrama vacío
   → Se establece sourceInfo con isNew = true
   
4. Usuario edita el diagrama
   → Agrega tablas, relaciones, etc.
   
5. Usuario presiona "Guardar"
   → Se crean dos archivos en GitHub:
      - mi_tabla_usuarios.dbml (contenido DBML)
      - mi_tabla_usuarios_config.json (posiciones, zoom, etc.)
```

### Escenario 2: Importar Diagrama Existente

```
1. Usuario selecciona repositorio
   → "Nuevo" se elige automáticamente
   
2. Usuario selecciona archivo existente del combo
   → Input amarillo se oculta
   → Input manual aparece (opcional)
   
3. Usuario hace click en 📥
   → Se importa el DBML del repositorio
   → Se carga el _config.json si existe
   
4. Usuario edita el diagrama importado
   
5. Usuario presiona "Guardar"
   → Se actualiza el archivo DBML existente
   → Se actualiza la configuración
```

---

## Cambios de Comportamiento

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Selección Inicial** | Sin selección | "Nuevo" por defecto |
| **Crear nuevo archivo** | No posible en esta UI | ✅ Posible con input de nombre |
| **Visibilidad de inputs** | Input manual siempre visible | Según el modo (Nuevo/Existente) |
| **Validación de nombre** | N/A | Obligatorio si es "Nuevo" |
| **Archivos generados** | Solo .dbml importado | .dbml + _config.json creados |

---

## Validaciones Implementadas

1. **En RepositorySelector.jsx:**
   - ✅ Nombre de archivo no puede estar vacío (modo Nuevo)
   - ✅ Se agrega extensión .dbml automáticamente si falta
   - ✅ Se valida que exista repositorio seleccionado

2. **En useSaveToGitHub.js:**
   - ✅ Se valida filePath para archivos nuevos
   - ✅ Se valida repoId en ambos casos

3. **En githubCommit.js:**
   - ✅ Si no existe SHA → Crea archivo nuevo
   - ✅ Si existe SHA → Actualiza archivo existente

---

## Archivos Modificados

1. `src/components/RepositorySelector.jsx`
   - Estados: `+2` (newFileName, isNewFile)
   - Funciones: `+3 cambios` (handleRepoChange, handleFileSelect, handleImport)
   - JSX: `+visibilidad condicional`

2. `src/hooks/useSaveToGitHub.js`
   - Validación: `+para archivos nuevos`
   - Logs: `+mejorados`

---

## Testing Recomendado

Para verificar que todo funciona correctamente:

1. **Crear nuevo diagrama:**
   - Seleccionar repo → Ingresar nombre → Presionar ✏️ → Editar → Guardar
   - Verificar que se crean dos archivos en GitHub

2. **Importar existente:**
   - Seleccionar repo → Seleccionar archivo del combo → Presionar 📥
   - Verificar que se carga correctamente

3. **Cambiar entre modos:**
   - Seleccionar "Nuevo" → Input amarillo
   - Seleccionar archivo → Input amarillo desaparece
   - Input manual aparece solo cuando hay archivos

---

## Notas Técnicas

- La bandera `isNew` se propaga en `sourceInfo` para que el servicio de commit sepa el contexto
- El nombre del archivo se valida pero NO se restringe a solo caracteres alfanuméricos (permite rutas como `schemas/usuarios.dbml`)
- El archivo de configuración siempre se genera con patrón: `{nombre}_config.json`
- En modo Nuevo, el diagrama se inicializa vacío (las tablas/relaciones se establecen cuando el usuario edita)
