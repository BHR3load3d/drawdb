# Guía de Integración GitHub - DrawDB

## 📋 Descripción

Este documento describe cómo utilizar la configuración centralizada de repositorios GitHub (`infrastructure/github-repos.config.json`) dentro de la aplicación DrawDB.

---

## 📁 Estructura de Archivos

```
drawdb/
├── infrastructure/
│   └── github-repos.config.json      # Configuración centralizada
├── src/
│   └── utils/
│       └── githubConfig.js           # Gestor de configuración
└── analysis/
    └── revision_1.0.md
```

---

## 🔧 Archivo de Configuración

### `infrastructure/github-repos.config.json`

Archivo JSON que centraliza toda la configuración necesaria para integración con GitHub:

**Secciones principales:**

1. **repositories[]** - Array de repositorios configurados
   - `id`: Identificador único
   - `name`: Nombre del repositorio
   - `owner`: Propietario en GitHub
   - `url`: URL completa del repo
   - `enabled`: Si está activo
   - `api`: Configuración específica de API
   - `sync`: Configuración de sincronización
   - `authentication`: Autenticación requerida
   - `integrations`: Gists, issues, discussions
   - `storage`: Formato y configuración de almacenamiento

2. **globalSettings** - Configuración global de la aplicación

3. **apiConfiguration** - Configuración base para API de GitHub

4. **dataExport** - Configuración de exportación de datos

5. **webhooks[]** - Webhooks configurados

6. **environmentVariables** - Variables de entorno requeridas

7. **monitoring** - Configuración de monitoreo y logs

8. **security** - Configuración de seguridad

9. **dataMapping** - Mapeo de esquemas de datos

10. **templates[]** - Plantillas disponibles

---

## 💻 Uso en la Aplicación

### 1. Importar el Gestor

```javascript
import { useGitHubConfig, githubConfigManager } from '@/utils/githubConfig';
```

### 2. En Componentes React

```jsx
import { useGitHubConfig } from '@/utils/githubConfig';

function MyComponent() {
  const config = useGitHubConfig();
  
  // Obtener todos los repos habilitados
  const repos = config.getEnabledRepositories();
  
  // Obtener un repo específico
  const mainRepo = config.getRepositoryByName('drawdb-main');
  
  return (
    <div>
      {repos.map(repo => (
        <div key={repo.id}>{repo.name}</div>
      ))}
    </div>
  );
}
```

### 3. En Utilidades/Services

```javascript
import githubConfigManager from '@/utils/githubConfig';

// Obtener configuración de sincronización
const syncConfig = githubConfigManager.getSyncConfig('repo-001');

// Obtener configuración API
const apiConfig = githubConfigManager.getApiConfiguration();

// Validar variables de entorno
const envStatus = githubConfigManager.validateEnvironment();
if (!envStatus.isValid) {
  console.error('Falta configurar:', envStatus.missing);
}
```

### 4. Ejemplos Prácticos

#### Obtener Token de Autenticación

```javascript
const token = githubConfigManager.getAuthToken('GITHUB_TOKEN');
```

#### Sincronizar un Repositorio

```javascript
const repoId = 'repo-001';
const syncConfig = githubConfigManager.getSyncConfig(repoId);

if (syncConfig.enabled) {
  // Programa sincronización según 'frequency'
  scheduleSync(syncConfig.frequency, async () => {
    // Lógica de sincronización
  });
}
```

#### Exportar Datos

```javascript
const exportConfig = githubConfigManager.getDataExportConfig();

exportConfig.schedules.forEach(schedule => {
  // Configurar cada programa de exportación
  scheduleJob(schedule.id, schedule.frequency, () => {
    // Exportar en formato especificado
  });
});
```

#### Obtener Plantillas

```javascript
const templates = githubConfigManager.getTemplates();

templates.forEach(template => {
  addTemplateOption({
    name: template.name,
    description: template.description,
    data: loadTemplateFromRepo(template.repository, template.path)
  });
});
```

---

## 🔌 API del Gestor de Configuración

### Métodos Principales

| Método | Descripción | Retorna |
|--------|-------------|---------|
| `getAllRepositories()` | Obtiene todos los repos | Array |
| `getRepositoryById(id)` | Obtiene repo por ID | Object \| null |
| `getRepositoryByName(name)` | Obtiene repo por nombre | Object \| null |
| `getEnabledRepositories()` | Solo repos activos | Array |
| `getGlobalSettings()` | Configuración global | Object |
| `getApiConfiguration()` | Config API GitHub | Object |
| `getAuthToken(envVar)` | Obtiene token de env | String \| null |
| `getDataExportConfig()` | Config exportación | Object |
| `getTemplates()` | Obtiene plantillas | Array |
| `getTemplateById(id)` | Obtiene plantilla por ID | Object \| null |
| `getDataMapping()` | Mapeo de esquemas | Object |
| `getWebhooks()` | Obtiene webhooks | Array |
| `getRequiredEnvVars()` | Vars de env requeridas | Object |
| `getSyncConfig(repoId)` | Config sync de repo | Object \| null |
| `getRepoApiConfig(repoId)` | Config API de repo | Object \| null |
| `getStorageConfig(repoId)` | Config almacenamiento | Object \| null |
| `getIntegrations(repoId)` | Config integraciones | Object \| null |
| `getAuthConfig(repoId)` | Config auth de repo | Object \| null |
| `validateEnvironment()` | Valida vars de env | Object |
| `getVersion()` | Versión configuración | String |
| `getLastUpdated()` | Última actualización | String |
| `exportConfig()` | Exporta config completa | Object |
| `exportEnabledConfig()` | Exporta solo activos | Object |

---

## 🔐 Configuración de Variables de Entorno

### Variables Requeridas

#### `GITHUB_TOKEN`
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
```
- Token de acceso personal de GitHub
- Scopes: `repo`, `gist`, `user:email`
- Obtener en: https://github.com/settings/tokens

#### `GITHUB_TOKEN_SERVER` (Opcional)
```bash
GITHUB_TOKEN_SERVER=ghp_yyyyyyyyyyyyyyyyyyyyy
```
- Token alternativo para servidor backend

#### `WEBHOOK_SECRET`
```bash
WEBHOOK_SECRET=your_webhook_secret
```
- Secreto para validar webhooks de GitHub

#### `WEBHOOK_BASE_URL`
```bash
WEBHOOK_BASE_URL=https://drawdb-server.example.com/api
```
- URL base para recibir webhooks

---

## 📊 Ejemplo de Flujo Completo

```javascript
import githubConfigManager from '@/utils/githubConfig';
import axios from 'axios';

// 1. Validar configuración
const validation = githubConfigManager.validateEnvironment();
if (!validation.isValid) {
  throw new Error(`Variables faltantes: ${validation.missing.join(', ')}`);
}

// 2. Obtener repositorio
const repo = githubConfigManager.getRepositoryById('repo-001');
if (!repo || !repo.enabled) {
  throw new Error('Repositorio no disponible');
}

// 3. Obtener configuración API
const apiConfig = githubConfigManager.getApiConfiguration();
const token = githubConfigManager.getAuthToken('GITHUB_TOKEN');

// 4. Hacer llamada API
const response = await axios({
  method: 'GET',
  url: `${apiConfig.baseUrl}/repos/${repo.owner}/${repo.name}`,
  headers: {
    'Authorization': `token ${token}`,
    'User-Agent': apiConfig.userAgent
  },
  timeout: apiConfig.timeout
});

// 5. Procesar datos según dataMapping
const dataMapping = githubConfigManager.getDataMapping();
const processedData = mapData(response.data, dataMapping.tableSchema);

// 6. Exportar según configuración
const exportConfig = githubConfigManager.getDataExportConfig();
exportToFile(processedData, exportConfig.destination);
```

---

## 🔄 Sincronización Automática

La configuración incluye programas de sincronización:

```javascript
// Cada repositorio puede tener:
{
  "sync": {
    "enabled": true,
    "frequency": "hourly",        // hourly, daily, weekly, monthly
    "autoCommit": true,
    "commitMessage": "Auto-sync message"
  }
}
```

**Implementación sugerida:**

```javascript
import { CronJob } from 'cron';
import githubConfigManager from '@/utils/githubConfig';

function setupAutoSync() {
  const repos = githubConfigManager.getEnabledRepositories();
  
  repos.forEach(repo => {
    const syncConfig = githubConfigManager.getSyncConfig(repo.id);
    
    if (syncConfig.enabled) {
      scheduleSync(repo, syncConfig.frequency);
    }
  });
}

function scheduleSync(repo, frequency) {
  const cronExpression = frequencyToCron(frequency);
  
  new CronJob(cronExpression, async () => {
    console.log(`Sincronizando ${repo.name}...`);
    await performSync(repo);
  }, null, true);
}
```

---

## 📝 Migración de Configuración Futura

Si en el futuro necesitas actualizar la configuración:

1. Incrementa `version` en el JSON
2. Documenta cambios en `metadata.deprecatedFields`
3. Crea helper para migración de versiones

```javascript
export function migrateConfig(oldConfig, fromVersion, toVersion) {
  // Lógica de migración según versiones
  if (fromVersion === '1.0' && toVersion === '1.1') {
    // Migración específica
  }
  return migratedConfig;
}
```

---

## 🧪 Testing

```javascript
import { describe, it, expect } from 'vitest';
import githubConfigManager from '@/utils/githubConfig';

describe('GitHubConfigManager', () => {
  it('debería cargar configuración', () => {
    const config = githubConfigManager.exportConfig();
    expect(config.version).toBeDefined();
  });

  it('debería obtener repos habilitados', () => {
    const repos = githubConfigManager.getEnabledRepositories();
    expect(repos.length).toBeGreaterThan(0);
  });

  it('debería validar variables de entorno', () => {
    const validation = githubConfigManager.validateEnvironment();
    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('missing');
  });
});
```

---

## 📚 Recursos Adicionales

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [GitHub Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens)

---

## ✅ Checklist de Implementación

- [ ] Copiar `infrastructure/github-repos.config.json` a repositorio
- [ ] Instalar `githubConfig.js` en `src/utils/`
- [ ] Configurar variables de entorno en `.env`
- [ ] Validar variables de entorno al iniciar app
- [ ] Integrar en componentes relevantes
- [ ] Implementar sincronización automática
- [ ] Agregar tests unitarios
- [ ] Documentar en README del proyecto
- [ ] Configurar webhooks en GitHub (si aplica)
- [ ] Implementar monitoreo y logs

---

**Versión:** 1.0  
**Última actualización:** Abril 2026  
**Autor:** DrawDB Development Team
