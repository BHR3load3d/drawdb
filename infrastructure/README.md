# Infrastructure - GitHub Integration Configuration

Esta carpeta contiene toda la configuración centralizada necesaria para integrar DrawDB con repositorios de GitHub.

## 📁 Contenido

### 1. `github-repos.config.json`
**Archivo de configuración principal** que centraliza:
- 📦 Definición de repositorios de GitHub
- 🔌 Configuración de APIs y endpoints
- 🔐 Credenciales y autenticación
- 📤 Configuración de exportación de datos
- 🔄 Configuración de sincronización automática
- 🪝 Webhooks
- 📋 Plantillas disponibles
- 🗂️ Mapeo de esquemas de datos
- 🛡️ Seguridad y límites de velocidad

**Uso:**
```javascript
import githubReposConfig from '@/infrastructure/github-repos.config.json';
```

**Actualización:**
- Agregar/remover repositorios en el array `repositories[]`
- Modificar configuración global en `globalSettings`
- Mantener sincronizado con cambios de API de GitHub

---

### 2. `.env.sample`
**Plantilla de variables de entorno** que define:
- `GITHUB_TOKEN` - Token de acceso personal de GitHub (REQUERIDO)
- `GITHUB_TOKEN_SERVER` - Token alterno para servidor (opcional)
- `WEBHOOK_SECRET` - Secreto para webhooks (opcional)
- `WEBHOOK_BASE_URL` - URL base para webhooks (opcional)
- `SLACK_WEBHOOK_URL` - Integración con Slack (opcional)

**Uso:**
```bash
# Copiar archivo a .env.local
cp .env.sample .env.local

# Llenar valores reales
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

**Seguridad:**
- ⚠️ NUNCA comitear `.env` con valores reales
- Usa `.env.local` para desarrollo local
- Configurar en CI/CD (GitHub Actions, etc.)
- Rotar tokens mensualmente

---

### 3. `GITHUB_INTEGRATION_GUIDE.md`
**Guía completa de integración** que incluye:
- 📖 Descripción general
- 🔧 Estructura de archivos
- 💻 Ejemplos de uso
- 🔌 API completa del gestor
- 🔐 Configuración de variables de entorno
- 📊 Flujos de trabajo completos
- 🔄 Ejemplos de sincronización automática
- 🧪 Tests unitarios
- ✅ Checklist de implementación

**Referencia principal para desarrolladores.**

---

## 🚀 Quick Start

### 1. Configurar Variables de Entorno
```bash
cp infrastructure/.env.sample .env.local
# Editar .env.local con valores reales
```

### 2. Crear Token de GitHub
1. Ir a https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Seleccionar scopes: `repo`, `gist`, `user:email`
4. Copiar token a `GITHUB_TOKEN` en `.env.local`

### 3. Implementar en Componentes
```javascript
// En un componente React
import { useRepository, useEnabledRepositories } from '@/hooks/useGithubConfiguration';

function MyComponent() {
  const { repositories } = useEnabledRepositories();
  
  return (
    <div>
      {repositories.map(repo => <div key={repo.id}>{repo.name}</div>)}
    </div>
  );
}
```

### 4. Usar en Services/Utilities
```javascript
import githubConfigManager from '@/utils/githubConfig';

const repos = githubConfigManager.getEnabledRepositories();
const mainRepo = githubConfigManager.getRepositoryById('repo-001');
```

---

## 📚 Archivos Relacionados

### Utilidades
- `src/utils/githubConfig.js` - Gestor de configuración
- Proporciona métodos para acceder a la configuración
- Singleton pattern para evitar duplicados

### Hooks
- `src/hooks/useGithubConfiguration.js` - Hooks de React
- 14+ hooks personalizados para diferentes casos
- Manejo de carga, errores y validación

### Componentes
- `src/components/GitHubConfigExample.jsx` - Componente de ejemplo
- Demuestra cómo usar los hooks y utilidades
- Interfaz visual para explorar configuración

---

## 🔄 Estructura de Datos Principales

### Repositorio
```json
{
  "id": "repo-id",
  "name": "repo-name",
  "owner": "github-owner",
  "url": "https://github.com/...",
  "enabled": true,
  "branch": "main",
  "sync": { "enabled": true, "frequency": "daily" },
  "authentication": { "type": "token", "scopes": ["repo", "gist"] },
  "integrations": {
    "gists": { "enabled": true },
    "issues": { "enabled": true }
  }
}
```

### Plantilla
```json
{
  "id": "template-id",
  "name": "Template Name",
  "repository": "repo-id",
  "path": "path/to/template.js",
  "description": "Description",
  "tags": ["tag1", "tag2"]
}
```

### Configuración de Exportación
```json
{
  "format": "json",
  "schedule": {
    "frequency": "daily",
    "time": "00:00"
  },
  "destination": {
    "type": "local",
    "path": "./exports/"
  }
}
```

---

## 🔐 Variables de Entorno

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `GITHUB_TOKEN` | String | ✓ REQUERIDO - Token de GitHub |
| `GITHUB_TOKEN_SERVER` | String | Opcional - Token alterno |
| `WEBHOOK_SECRET` | String | Opcional - Secreto webhooks |
| `WEBHOOK_BASE_URL` | URL | Opcional - URL para webhooks |
| `SLACK_WEBHOOK_URL` | URL | Opcional - Integración Slack |
| `NODE_ENV` | Enum | development, staging, production |

**Obtener `GITHUB_TOKEN`:**
1. https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Scopes: `repo`, `gist`, `user:email`
4. Copiar valor generado

---

## 📊 Métodos Disponibles del Gestor

```javascript
import githubConfigManager from '@/utils/githubConfig';

// Repositorios
githubConfigManager.getAllRepositories()
githubConfigManager.getRepositoryById(id)
githubConfigManager.getRepositoryByName(name)
githubConfigManager.getEnabledRepositories()

// Configuración
githubConfigManager.getGlobalSettings()
githubConfigManager.getApiConfiguration()
githubConfigManager.getDataExportConfig()

// Autenticación
githubConfigManager.getAuthToken(envVar)
githubConfigManager.getAuthConfig(repoId)
githubConfigManager.validateEnvironment()

// Plantillas
githubConfigManager.getTemplates()
githubConfigManager.getTemplateById(id)

// Exportación
githubConfigManager.exportConfig()
githubConfigManager.exportEnabledConfig()
```

---

## 🎯 Casos de Uso

### 1. Cargar Plantillas en el Editor
```javascript
const templates = githubConfigManager.getTemplates();
// Mostrar en dropdown de plantillas
```

### 2. Sincronización Automática
```javascript
const syncConfig = githubConfigManager.getSyncConfig('repo-001');
if (syncConfig.enabled) {
  scheduleSync(syncConfig.frequency);
}
```

### 3. Exportación de Datos
```javascript
const exportConfig = githubConfigManager.getDataExportConfig();
exportConfig.schedules.forEach(schedule => {
  scheduleCron(schedule.frequency, () => {
    exportData(schedule.format);
  });
});
```

### 4. Validar Configuración
```javascript
const validation = githubConfigManager.validateEnvironment();
if (!validation.isValid) {
  throw new Error(`Falta: ${validation.missing.join(', ')}`);
}
```

---

## 🧪 Testing

```javascript
// test/githubConfig.test.js
import { describe, it, expect } from 'vitest';
import githubConfigManager from '@/utils/githubConfig';

describe('GitHub Config', () => {
  it('carga configuración correctamente', () => {
    const config = githubConfigManager.exportConfig();
    expect(config.version).toBeDefined();
  });

  it('obtiene repos habilitados', () => {
    const repos = githubConfigManager.getEnabledRepositories();
    expect(repos.length).toBeGreaterThan(0);
  });

  it('valida variables de entorno', () => {
    const validation = githubConfigManager.validateEnvironment();
    expect(validation).toHaveProperty('isValid');
  });
});
```

---

## 📝 Mantenimiento

### Actualizar Configuración
1. Editar `github-repos.config.json`
2. Incrementar `version`
3. Actualizar `lastUpdated`
4. Documentar cambios en `metadata.notes`

### Agregar Repositorio
1. Obtener datos del repo de GitHub API
2. Crear objeto en array `repositories[]`
3. Configurar `integrations` necesarias
4. Asignar `sync` y `storage` config

### Rotación de Tokens
1. Generar nuevo token en GitHub
2. Actualizar variable de entorno
3. Revocar token anterior en GitHub

---

## 🔗 Enlaces Útiles

- 📖 [GitHub API Documentation](https://docs.github.com/en/rest)
- 🔑 [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- 🪝 [GitHub Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- 📘 [GitHub GraphQL API](https://docs.github.com/en/graphql)

---

## ✅ Checklist de Implementación

- [ ] Copiar estructura a proyecto
- [ ] Configurar `.env.local` con tokens
- [ ] Validar `github-repos.config.json`
- [ ] Instalar `githubConfig.js` utility
- [ ] Agregar hooks en `useGithubConfiguration.js`
- [ ] Implementar en componentes principales
- [ ] Configurar sincronización automática
- [ ] Agregar tests
- [ ] Documentar en README principal
- [ ] Configurar en GitHub Actions (CI/CD)

---

## 🤝 Contribuciones

Para agregar nuevas configuraciones:
1. Editar `github-repos.config.json`
2. Actualizar métodos en `githubConfig.js` si es necesario
3. Agregar hooks si requiere nueva lógica
4. Documentar en guía de integración
5. Crear tests para nuevas funcionalidades

---

**Última actualización:** Abril 2026  
**Versión:** 1.0  
**Mantenedor:** DrawDB Development Team
