# Guía del Módulo ABM - Administración de Repositorios GitHub

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Descripción:** Módulo completo de Alta, Baja y Modificación (ABM) de repositorios GitHub con importación de archivos DBML.

---

## 📋 Descripción General

El módulo ABM proporciona una interfaz completa para:

1. **Administrar repositorios GitHub** - Agregar, editar, eliminar
2. **Importar archivos DBML** - Desde repositorios GitHub directamente
3. **Sincronizar diagramas** - Actualización automática de esquemas
4. **Gestionar credenciales** - Configuración segura de tokens

---

## 📁 Archivos Incluidos

### Servicios

#### `src/services/repositoryManagement.js`
Servicio para CRUD de repositorios.

**Métodos principales:**
- `addRepository(repoData)` - Agregar nuevo repositorio
- `updateRepository(repoId, updates)` - Actualizar existente
- `deleteRepository(repoId)` - Eliminar repositorio
- `getAllRepositories()` - Listar todos
- `validateRepository(repoData)` - Validar datos
- `validateRepositoryAccess(owner, name, token)` - Validar acceso en GitHub
- `findFileInRepository(repoId, filePath, token)` - Buscar archivo

#### `src/services/dbmlImport.js`
Servicio para importar archivos DBML desde GitHub.

**Métodos principales:**
- `findDBMLFiles(repoId, token)` - Buscar archivos DBML
- `downloadDBMLFile(repoId, filePath, token)` - Descargar archivo
- `parseDBML(content)` - Parsear DBML a esquema DrawDB
- `importDBMLFromRepo(repoId, filePath, token)` - Importar completo
- `syncDBMLFromRepository(repoId, token)` - Sincronizar todo el repo
- `listAvailableDBMLFiles(repoId, token)` - Listar DBML disponibles

### Hooks

#### `src/hooks/useRepositoryManagement.js`
Hook para gestionar repositorios en React.

```javascript
const {
  repositories,
  error,
  success,
  loading,
  addRepository,
  updateRepository,
  deleteRepository,
  toggleRepository,
  validateRepositoryAccess,
  findFileInRepository,
  getStatistics,
  exportConfiguration,
  clearMessages
} = useRepositoryManagement();
```

#### `src/hooks/useDBMLImport.js`
Hook para importar DBML en React.

```javascript
const {
  loading,
  error,
  importedDiagrams,
  foundFiles,
  findDBMLFiles,
  downloadDBMLFile,
  importDBML,
  syncRepository,
  validateDBML,
  validateSQL,
  parseDBML,
  getSupportedFormats,
  listAvailableFiles,
  clearState
} = useDBMLImport();
```

### Componentes

#### `src/components/RepositoryABM.jsx`
Componente principal de administración de repositorios.

**Características:**
- Listado de repositorios con tabla
- Estadísticas de repositorios
- Formulario de agregar/editar
- Eliminación con confirmación
- Habilitar/deshabilitar repositorios
- Búsqueda y ordenamiento

#### `src/components/RepositoryForm.jsx`
Formulario para agregar/editar repositorios.

**Secciones:**
- Información Básica (ID, nombre, owner, URL, rama, descripción)
- Sincronización (frecuencia, auto-commit)
- Integraciones (Gists, Issues, Discussions)
- Directorios (paths personalizados)
- Validación de repositorio en GitHub

#### `src/components/DBMLImportComponent.jsx`
Componente para importar archivos DBML.

**Flujo:**
1. Seleccionar repositorio habilitado
2. Buscar archivos DBML
3. Seleccionar y importar archivo
4. Revisar diagramas importados
5. Configurar token de GitHub

---

## 🚀 Uso Rápido

### 1. Importar en tu Aplicación

```javascript
// En App.jsx o página principal
import RepositoryABM from '@/components/RepositoryABM';
import DBMLImportComponent from '@/components/DBMLImportComponent';

export default function App() {
  return (
    <div>
      <RepositoryABM />
      <DBMLImportComponent />
    </div>
  );
}
```

### 2. Usar Hooks en Componentes

```javascript
import useRepositoryManagement from '@/hooks/useRepositoryManagement';
import useDBMLImport from '@/hooks/useDBMLImport';

function MyComponent() {
  const { repositories, addRepository } = useRepositoryManagement();
  const { importDBML, foundFiles } = useDBMLImport();

  return (
    // Tu componente
  );
}
```

### 3. Agregar Repositorio Programáticamente

```javascript
const { addRepository } = useRepositoryManagement();

const newRepo = {
  id: 'my-repo-001',
  name: 'My Database Repo',
  owner: 'my-org',
  url: 'https://github.com/my-org/my-database-repo',
  branch: 'main',
  description: 'Base de datos del proyecto'
};

const result = addRepository(newRepo);
if (result.success) {
  console.log('Repositorio agregado:', result.repository);
}
```

### 4. Importar DBML desde Repositorio

```javascript
const { importDBML } = useDBMLImport();

// Importar un archivo específico
const diagram = await importDBML(
  'my-repo-001',           // repoId
  'schemas/main.dbml',     // filePath
  'ghp_xxxxx...'          // token
);

console.log('Diagrama importado:', diagram);
// Diagrama contiene: id, name, tables[], relationships[], source, etc.
```

### 5. Sincronizar Todo un Repositorio

```javascript
const { syncRepository } = useDBMLImport();

const diagrams = await syncRepository('my-repo-001', token);
console.log(`${diagrams.length} diagrama(s) importados`);
```

---

## 🔄 Flujo Completo de Ejemplo

```javascript
// 1. Crear manage hook
const repositoryManager = useRepositoryManagement();
const dbmlImporter = useDBMLImport();

// 2. Agregar repositorio
const addResult = repositoryManager.addRepository({
  id: 'ecommerce-db',
  name: 'E-Commerce Database',
  owner: 'acme-corp',
  url: 'https://github.com/acme-corp/ecommerce-db',
  branch: 'main',
  description: 'Base de datos del sitio de e-commerce'
});

// 3. Buscar archivos DBML
const files = await dbmlImporter.findDBMLFiles('ecommerce-db', token);
console.log('Archivos encontrados:', files);

// 4. Importar archivo específico
const diagram = await dbmlImporter.importDBML(
  'ecommerce-db',
  'schemas/ecommerce.dbml',
  token
);

// 5. Usar diagrama importado
// - Renderizar en canvas
// - Guardar en base de datos local (Dexie)
// - Sincronizar con servidor

onImport(diagram);
```

---

## 🔐 Configuración de Seguridad

### Variables de Entorno Requeridas

```bash
# .env.local
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Crear Token en GitHub

1. Ir a https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Nombre: DrawDB
4. Scopes: `repo`, `gist`, `user:email`
5. Copiar token y guardar en `.env.local`

### Validación de Token

```javascript
const { validateRepositoryAccess } = useRepositoryManagement();

const result = await validateRepositoryAccess(
  'acme-corp',        // owner
  'ecommerce-db',     // name
  'ghp_xxxxx...'     // token
);

if (result.isValid) {
  console.log('Token válido y repositorio accesible');
}
```

---

## 📊 Casos de Uso

### 1. Sincronización Inicial de Proyecto

```javascript
// Usuario abre la aplicación por primera vez
// 1. Configura repositorio
// 2. Busca archivos DBML
// 3. Importa todos los diagramas
// 4. Los guarda localmente en Dexie

const diagrams = await syncRepository(repoId, token);
diagrams.forEach(diagram => {
  // Guardar en IndexedDB local
  saveToLocalDatabase(diagram);
});
```

### 2. Mantener Sincronización Automática

```javascript
// Cada cierto tiempo, sincronizar repositorio
setInterval(async () => {
  const repo = repositoryManager.getRepository(repoId);
  
  if (repo.sync?.enabled) {
    const diagrams = await syncRepository(repoId, token);
    updateLocalDiagrams(diagrams);
  }
}, 3600000); // Cada hora
```

### 3. Importar desde URL de Usuario

```javascript
// Usuario paste una URL de GitHub
const parseGithubUrl = (url) => {
  // https://github.com/user/repo → { owner: 'user', name: 'repo' }
  const parts = url.replace('https://github.com/', '').split('/');
  return { owner: parts[0], name: parts[1] };
};

const { owner, name } = parseGithubUrl(userInputUrl);
const result = await validateRepositoryAccess(owner, name, token);

if (result.isValid) {
  addRepository({
    id: `${owner}-${name}`,
    name: name,
    owner: owner,
    url: userInputUrl,
    branch: result.data.defaultBranch
  });
}
```

### 4. Exportar Diagramas a GitHub

```javascript
// Después de editar en DrawDB, exportar cambios a GitHub
const exportToGithub = async (diagram, repoId, token) => {
  const repo = repositoryManager.getRepository(repoId);
  
  // Convertir diagrama a DBML
  const dbmlContent = convertDiagramToDBML(diagram);
  
  // Subir archivo a GitHub (requiere API de contenidos)
  await uploadFileToGithub(
    repo.owner,
    repo.name,
    `schemas/${diagram.name}.dbml`,
    dbmlContent,
    token
  );
};
```

---

## 🛠️ API Completa

### RepositoryManagementService

```javascript
// Crear instancia
import repositoryManagementService from '@/services/repositoryManagement';

// Métodos disponibles
repositoryManagementService.getAllRepositories()
repositoryManagementService.getRepository(id)
repositoryManagementService.addRepository(data)
repositoryManagementService.updateRepository(id, updates)
repositoryManagementService.deleteRepository(id)
repositoryManagementService.toggleRepository(id, enabled)
repositoryManagementService.validateRepository(data)
repositoryManagementService.validateRepositoryAccess(owner, name, token)
repositoryManagementService.findFileInRepository(id, path, token)
repositoryManagementService.getStatistics()
repositoryManagementService.exportAsJSON()
```

### DBMLImportService

```javascript
import dbmlImportService from '@/services/dbmlImport';

// Métodos disponibles
dbmlImportService.findDBMLFiles(repoId, token)
dbmlImportService.downloadDBMLFile(repoId, filePath, token)
dbmlImportService.parseDBML(content)
dbmlImportService.importDBMLFromRepo(repoId, filePath, token)
dbmlImportService.syncDBMLFromRepository(repoId, token)
dbmlImportService.listAvailableDBMLFiles(repoId, token)
dbmlImportService.isValidDBML(content)
dbmlImportService.isValidSQL(content)
dbmlImportService.getSupportedFormats()
```

---

## 📈 Características Avanzadas

### Validación Automática

```javascript
const { validateRepository } = repositoryManagementService;

const validation = validateRepository({
  id: 'test',
  name: 'Test',
  owner: 'test',
  url: 'not-a-url',
  branch: 'main'
});

// validation.isValid === false
// validation.errors = { url: 'Debe ser una URL válida de GitHub' }
```

### Estadísticas de Repositorios

```javascript
const stats = repositoryManager.getStatistics();
// {
//   totalRepositories: 5,
//   enabledRepositories: 4,
//   disabledRepositories: 1,
//   syncEnabledRepositories: 3,
//   byType: { public: 4, private: 1 }
// }
```

### Exportar Configuración

```javascript
const jsonConfig = repositoryManager.exportConfiguration();
// Descarga archivo JSON actualizado
const blob = new Blob([jsonConfig], { type: 'application/json' });
downloadFile(blob, 'repositories.json');
```

---

## ⚠️ Consideraciones Importantes

### Rate Limiting de GitHub

- API REST: 60 requests/hora (sin autenticación), 5000/hora (autenticado)
- Implementar retry logic y cacheo

```javascript
const cacheResults = (key, data, ttl = 3600) => {
  localStorage.setItem(key, JSON.stringify({
    data,
    expires: Date.now() + ttl * 1000
  }));
};

const getCachedResult = (key) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    const { data, expires } = JSON.parse(cached);
    if (expires > Date.now()) {
      return data;
    }
  }
  return null;
};
```

### Privacidad de Datos

- Los archivos DBML se descargan en memoria, no se almacenan en servidor
- Los diagramas se guardan localmente en IndexedDB
- Los tokens nunca se envían a servidor (solo a API de GitHub)

### Manejo de Errores

```javascript
try {
  const diagram = await importDBML(repoId, filePath, token);
} catch (error) {
  if (error.message.includes('401')) {
    // Token inválido o expirado
    promptForNewToken();
  } else if (error.message.includes('404')) {
    // Archivo no encontrado
    showErrorMessage('Archivo no encontrado en el repositorio');
  } else {
    // Error genérico
    showErrorMessage(error.message);
  }
}
```

---

## 🧪 Testing

```javascript
// test/repositoryManagement.test.js
import { describe, it, expect } from 'vitest';
import repositoryManagementService from '@/services/repositoryManagement';

describe('RepositoryManagementService', () => {
  it('debería agregar un repositorio', () => {
    const result = repositoryManagementService.addRepository({
      id: 'test-repo',
      name: 'Test',
      owner: 'testuser',
      url: 'https://github.com/testuser/test',
      branch: 'main'
    });

    expect(result.success).toBe(true);
    expect(result.repository.id).toBe('test-repo');
  });

  it('debería validar repositorio correctamente', () => {
    const validation = repositoryManagementService.validateRepository({
      id: 'test',
      name: 'Test',
      owner: 'testuser',
      url: 'invalid-url',
      branch: 'main'
    });

    expect(validation.isValid).toBe(false);
    expect(validation.errors.url).toBeDefined();
  });
});
```

---

## 📚 Recursos Adicionales

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [DBML Documentation](https://www.dbml.org/)
- [DrawDB Documentation](https://drawdb.app/)

---

**Fin de la Guía ABM**  
Para preguntas o problemas, consulta la documentación de GitHub Integration.
