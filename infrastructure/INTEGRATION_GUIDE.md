# Guía de Integración del Módulo ABM

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Descripción:** Pasos para integrar el módulo ABM en la aplicación DrawDB principal.

---

## 📋 Índice

1. [Integración Básica](#integración-básica)
2. [Integración en Editor](#integración-en-editor)
3. [Estructura de Rutas](#estructura-de-rutas)
4. [Compartir Estado](#compartir-estado)
5. [Integración con Dexie](#integración-con-dexie)
6. [Ejemplos de Integración](#ejemplos-de-integración)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Integración Básica

### Opción 1: Página Separada (Recomendado)

Crear una nueva página para administrar repositorios.

#### Paso 1: Crear archivo de página

**Archivo:** `src/pages/RepositoryManager.jsx`

```javascript
import React from 'react';
import RepositoryABM from '@/components/RepositoryABM';
import DBMLImportComponent from '@/components/DBMLImportComponent';

export default function RepositoryManager() {
  return (
    <div className="repository-manager-page">
      <div className="header">
        <h1>Administración de Repositorios GitHub</h1>
        <p>Gestiona tus repositorios y importa esquemas DBML</p>
      </div>

      <div className="content">
        <section className="abm-section">
          <h2>Repositorios Configurados</h2>
          <RepositoryABM />
        </section>

        <section className="import-section">
          <h2>Importar Esquemas</h2>
          <DBMLImportComponent />
        </section>
      </div>

      <style>{`
        .repository-manager-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 2rem;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }

        .header p {
          margin: 0;
          color: var(--text-secondary);
        }

        .content {
          display: grid;
          gap: 2rem;
        }

        .abm-section,
        .import-section {
          background: var(--background-secondary);
          border-radius: 8px;
          padding: 1.5rem;
        }

        .abm-section h2,
        .import-section h2 {
          margin-top: 0;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .repository-manager-page {
            padding: 1rem;
          }

          .header h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
```

#### Paso 2: Agregar ruta en App.jsx

```javascript
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Editor from './pages/Editor';
import LandingPage from './pages/LandingPage';
import RepositoryManager from './pages/RepositoryManager';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/repositories" element={<RepositoryManager />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### Paso 3: Agregar navegación en Navbar

```javascript
// src/components/Navbar.jsx - agregar enlace
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      {/* ... otros elementos ... */}
      <Link to="/repositories" className="nav-link">
        <IconRepositories />
        Repositorios
      </Link>
    </nav>
  );
}
```

---

### Opción 2: Panel Lateral en Editor

Integrar como panel lateral en el editor existente.

**Archivo:** `src/components/Workspace.jsx` (modificar)

```javascript
import { useState } from 'react';
import EditorHeader from './EditorHeader';
import EditorCanvas from './EditorCanvas';
import EditorSidePanel from './EditorSidePanel';
import RepositoryPanel from './RepositoryPanel'; // Nuevo
import { Tabs } from 'semi-design';

export default function Workspace() {
  const [activeTab, setActiveTab] = useState('design');

  return (
    <div className="workspace">
      <EditorHeader />
      <div className="workspace-content">
        <EditorCanvas />
        
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Diseño" itemKey="design">
            <EditorSidePanel />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Repositorios" itemKey="repositories">
            <RepositoryPanel />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
}
```

El archivo `src/components/RepositoryPanel.jsx`:

```javascript
import RepositoryABM from './RepositoryABM';
import DBMLImportComponent from './DBMLImportComponent';

export default function RepositoryPanel() {
  return (
    <div className="repository-panel">
      <RepositoryABM />
      <DBMLImportComponent />
    </div>
  );
}
```

---

## 🗂️ Estructura de Rutas

La estructura de carpetas recomendada:

```
drawdb/
├── src/
│   ├── pages/
│   │   ├── Editor.jsx
│   │   ├── RepositoryManager.jsx      ← NUEVA
│   │   ├── LandingPage.jsx
│   │   └── NotFound.jsx
│   ├── components/
│   │   ├── RepositoryABM.jsx
│   │   ├── RepositoryForm.jsx
│   │   ├── DBMLImportComponent.jsx
│   │   ├── RepositoryPanel.jsx        ← NUEVA (si usas opción 2)
│   │   └── ... otros
│   ├── hooks/
│   │   ├── useRepositoryManagement.js
│   │   ├── useDBMLImport.js
│   │   ├── useGithubConfiguration.js
│   │   └── ... otros
│   ├── services/
│   │   ├── repositoryManagement.js
│   │   ├── dbmlImport.js
│   │   └── ... otros
│   ├── utils/
│   │   ├── githubConfig.js
│   │   └── ... otros
│   └── App.jsx
└── infrastructure/
    ├── github-repos.config.json
    ├── GITHUB_INTEGRATION_GUIDE.md
    ├── ABM_MODULE_GUIDE.md             ← NUEVA
    ├── INTEGRATION_GUIDE.md            ← ESTA GUÍA
    └── ... otros
```

---

## 💾 Compartir Estado

### Usar DiagramContext Existente

Integrar repositorios importados con el contexto de diagramas.

```javascript
// src/hooks/useDiagram.js - modificar para incluir importados
import { useContext } from 'react';
import { DiagramContext } from '@/context/DiagramContext';
import { useDBMLImport } from './useDBMLImport';

export function useDiagramWithImports() {
  const diagramContext = useContext(DiagramContext);
  const { importDBML } = useDBMLImport();

  const importDiagramFromGithub = async (repoId, filePath, token) => {
    try {
      const diagram = await importDBML(repoId, filePath, token);
      
      // Guardar en contexto de diagramas
      diagramContext.setDiagram({
        ...diagramContext.diagram,
        ...diagram
      });

      return { success: true, diagram };
    } catch (error) {
      return { success: false, error };
    }
  };

  return {
    ...diagramContext,
    importDiagramFromGithub
  };
}
```

### Compartir Repositorios Globalmente

```javascript
// src/context/RepositoriesContext.jsx - NUEVO
import { createContext } from 'react';

export const RepositoriesContext = createContext();

export function RepositoriesProvider({ children }) {
  // Implementar provider con useRepositoryManagement
  // ...
}
```

---

## 🗄️ Integración con Dexie

Persistir diagramas importados en IndexedDB.

```javascript
// src/data/db.js - agregar tabla de diagramas importados
import Dexie from 'dexie';

export const db = new Dexie('DrawDB');

db.version(1).stores({
  diagrams: '++id, name, createdAt',
  repositories: '++id, owner',
  importedDiagrams: '++id, repoId, importedAt',  // NUEVA
});

// Métodos para guardar diagramas importados
export const saveImportedDiagram = async (diagram) => {
  return await db.importedDiagrams.add({
    ...diagram,
    importedAt: new Date(),
    synced: false, // Aún no sincronizado con servidor
  });
};

export const getImportedDiagrams = async () => {
  return await db.importedDiagrams.toArray();
};

export const getImportedDiagramsByRepo = async (repoId) => {
  return await db.importedDiagrams
    .where('repoId')
    .equals(repoId)
    .toArray();
};
```

Luego en el componente de importación:

```javascript
// src/components/DBMLImportComponent.jsx - En handleImport
import { saveImportedDiagram } from '@/data/db';

const handleImport = async (repoId, filePath) => {
  try {
    const diagram = await importDBML(repoId, filePath, token);
    
    // Guardar en Dexie
    await saveImportedDiagram({
      ...diagram,
      repoId,
      sourcePath: filePath,
    });

    // Actualizar UI
    setImportedDiagrams([...importedDiagrams, diagram]);
    showSuccessMessage('Diagrama importado exitosamente');
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

---

## 💡 Ejemplos de Integración

### Ejemplo 1: Importar al abrir Editor

```javascript
// src/pages/Editor.jsx
import { useEffect } from 'react';
import { useDBMLImport } from '@/hooks/useDBMLImport';
import { useDiagram } from '@/hooks/useDiagram';

export default function Editor() {
  const { importDBML } = useDBMLImport();
  const { setDiagram } = useDiagram();

  // Si hay un parámetro de URL con repoId y filePath
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repoId = params.get('repoId');
    const filePath = params.get('filePath');

    if (repoId && filePath) {
      const token = localStorage.getItem('github_token');
      importDBML(repoId, filePath, token)
        .then(diagram => setDiagram(diagram))
        .catch(error => console.error('Error importing:', error));
    }
  }, []);

  return (
    // ... resto del editor ...
  );
}
```

Uso: `/editor?repoId=my-repo&filePath=schemas/main.dbml`

### Ejemplo 2: Botón de Importación Rápida

```javascript
// Agregar en EditorHeader.jsx
import { Button } from 'semi-design';
import DBMLImportModal from '@/components/DBMLImportModal';
import { useState } from 'react';

export default function EditorHeader() {
  const [importModalVisible, setImportModalVisible] = useState(false);

  return (
    <div className="editor-header">
      {/* ... otros botones ... */}
      <Button 
        onClick={() => setImportModalVisible(true)}
        icon={<IconImport />}
      >
        Importar DBML
      </Button>

      <DBMLImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
      />
    </div>
  );
}
```

### Ejemplo 3: Sincronización Automática

```javascript
// src/hooks/useAutoSync.js - NUEVO
import { useEffect, useRef } from 'react';
import { useRepositoryManagement } from './useRepositoryManagement';
import { useDBMLImport } from './useDBMLImport';
import { saveImportedDiagram } from '@/data/db';

export function useAutoSync() {
  const { repositories } = useRepositoryManagement();
  const { syncRepository } = useDBMLImport();
  const syncIntervalRef = useRef(null);

  useEffect(() => {
    const startAutoSync = async () => {
      const syncRepos = repositories.filter(r => 
        r.sync?.enabled && r.enabled
      );

      for (const repo of syncRepos) {
        try {
          const token = localStorage.getItem('github_token');
          const diagrams = await syncRepository(repo.id, token);
          
          // Guardar todos los diagramas
          for (const diagram of diagrams) {
            await saveImportedDiagram({
              ...diagram,
              repoId: repo.id,
              synced: true,
            });
          }
        } catch (error) {
          console.error(`Sync failed for ${repo.id}:`, error);
        }
      }
    };

    // Ejecutar cada hora
    startAutoSync();
    syncIntervalRef.current = setInterval(startAutoSync, 3600000);

    return () => clearInterval(syncIntervalRef.current);
  }, [repositories]);
}
```

---

## 🐛 Troubleshooting

### Problema: Token no Funciona

**Síntoma:** Error 401 al intentar importar

**Solución:**

```javascript
// Verificar token
const testToken = async (token) => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Si falla, pedir nuevo token
const handleInvalidToken = () => {
  localStorage.removeItem('github_token');
  showDialog('Token de GitHub inválido. Por favor, ingresa uno nuevo.');
};
```

### Problema: DBML no se Parsea Correctamente

**Síntoma:** Diagrama incompleto o campos faltantes

**Solución:**

```javascript
// Validar DBML antes de importar
const { validateDBML } = useDBMLImport();

const handleImport = async (filePath) => {
  const { downloadDBMLFile } = useDBMLImport();
  const content = await downloadDBMLFile(repoId, filePath, token);
  
  const validation = validateDBML(content);
  if (!validation.valid) {
    showWarning('DBML contiene algunos problemas detectados:');
    validation.errors.forEach(error => console.warn(error));
  }
  
  // Continuar con importación
};
```

### Problema: Repositorio no Encontrado

**Síntoma:** 404 al buscar repositorio

**Solución:**

```javascript
// Verificar acceso al repositorio
const { validateRepositoryAccess } = useRepositoryManagement();

const checkRepoAccess = async (owner, name, token) => {
  const result = await validateRepositoryAccess(owner, name, token);
  
  if (!result.isValid) {
    console.error('Acceso denegado:', result.error);
    
    if (result.error.includes('private')) {
      showError('El repositorio es privado. Verifica tu token.');
    } else if (result.error.includes('404')) {
      showError('Repositorio no encontrado. Verifica owner y name.');
    }
  }
};
```

### Problema: Rendimiento Lento al Listar Archivos

**Síntoma:** La búsqueda de archivos tarda mucho

**Solución:**

```javascript
// Implementar cacheo
const fileCacheRef = useRef(new Map());

const findDBMLFilesWithCache = async (repoId, token) => {
  const cacheKey = `${repoId}:files`;
  const cached = fileCacheRef.current.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 600000) { // 10 minutos
    return cached.data;
  }

  const files = await findDBMLFiles(repoId, token);
  
  fileCacheRef.current.set(cacheKey, {
    data: files,
    timestamp: Date.now(),
  });

  return files;
};
```

---

## ✅ Checklist de Integración

- [ ] Crear página `RepositoryManager.jsx`
- [ ] Agregar ruta en `App.jsx`
- [ ] Agregar enlace en `Navbar.jsx`
- [ ] Configurar variable de entorno `GITHUB_TOKEN`
- [ ] Probar agregar repositorio
- [ ] Probar búsqueda de archivos DBML
- [ ] Probar importación de archivo DBML
- [ ] Verificar diagrama importado se carga correctamente
- [ ] Agregar tabla en Dexie para diagramas importados
- [ ] Configurar sincronización automática
- [ ] Probar con repositorio público
- [ ] Probar con repositorio privado
- [ ] Verificar manejo de errores
- [ ] Validar en dispositivos móviles

---

**Siguiente paso:** Una vez integrado, consulta [ABM_MODULE_GUIDE.md](./ABM_MODULE_GUIDE.md) para casos de uso avanzados.
