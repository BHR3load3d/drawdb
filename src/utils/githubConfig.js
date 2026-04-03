/**
 * GitHub Repository Configuration Loader
 * 
 * Utilidad para cargar y consumir la configuración de repositorios de GitHub
 * desde infrastructure/github-repos.config.json
 * 
 * @module utils/githubConfig
 */

import githubReposConfig from '../../infrastructure/github-repos.config.json';

/**
 * Clase para gestionar la configuración de repositorios de GitHub
 */
class GitHubConfigManager {
  constructor(config = githubReposConfig) {
    this.config = config;
    this.repositories = new Map();
    this._initializeRepositories();
  }

  /**
   * Inicializa el mapa de repositorios
   * @private
   */
  _initializeRepositories() {
    this.config.repositories.forEach(repo => {
      this.repositories.set(repo.id, repo);
    });
  }

  /**
   * Obtiene todos los repositorios configurados
   * @returns {Array} Array de repositorios
   */
  getAllRepositories() {
    return Array.from(this.repositories.values());
  }

  /**
   * Obtiene un repositorio específico por ID
   * @param {string} repoId - ID del repositorio
   * @returns {Object|null} Objeto repositorio o null
   */
  getRepositoryById(repoId) {
    return this.repositories.get(repoId) || null;
  }

  /**
   * Obtiene un repositorio por nombre
   * @param {string} name - Nombre del repositorio
   * @returns {Object|null} Objeto repositorio o null
   */
  getRepositoryByName(name) {
    return Array.from(this.repositories.values()).find(r => r.name === name) || null;
  }

  /**
   * Obtiene todos los repositorios habilitados
   * @returns {Array} Array de repositorios activos
   */
  getEnabledRepositories() {
    return Array.from(this.repositories.values()).filter(r => r.enabled);
  }

  /**
   * Obtiene la configuración global
   * @returns {Object} Configuración global
   */
  getGlobalSettings() {
    return this.config.globalSettings;
  }

  /**
   * Obtiene la configuración de API de GitHub
   * @returns {Object} Configuración API
   */
  getApiConfiguration() {
    return this.config.apiConfiguration;
  }

  /**
   * Obtiene un token de autenticación por nombre
   * @param {string} envVar - Variable de entorno
   * @returns {string|null} Token o null
   */
  getAuthToken(envVar = 'GITHUB_TOKEN') {
    return process.env[envVar] || null;
  }

  /**
   * Obtiene la configuración de exportación de datos
   * @returns {Object} Configuración de exportación
   */
  getDataExportConfig() {
    return this.config.dataExport;
  }

  /**
   * Obtiene las plantillas disponibles
   * @returns {Array} Array de plantillas
   */
  getTemplates() {
    return this.config.templates || [];
  }

  /**
   * Obtiene una plantilla específica por ID
   * @param {string} templateId - ID de la plantilla
   * @returns {Object|null} Objeto plantilla o null
   */
  getTemplateById(templateId) {
    return (this.config.templates || []).find(t => t.id === templateId) || null;
  }

  /**
   * Obtiene la configuración de mapeo de datos
   * @returns {Object} Mapeo de datos
   */
  getDataMapping() {
    return this.config.dataMapping;
  }

  /**
   * Obtiene los webhooks configurados
   * @returns {Array} Array de webhooks
   */
  getWebhooks() {
    return this.config.webhooks || [];
  }

  /**
   * Obtiene variables de entorno requeridas
   * @returns {Object} Variables de entorno
   */
  getRequiredEnvVars() {
    const envVars = this.config.environmentVariables;
    return Object.entries(envVars)
      .filter(([_, config]) => config.required)
      .reduce((acc, [key, config]) => {
        acc[key] = config;
        return acc;
      }, {});
  }

  /**
   * Obtiene la configuración de sincronización de un repositorio
   * @param {string} repoId - ID del repositorio
   * @returns {Object|null} Configuración sync o null
   */
  getSyncConfig(repoId) {
    const repo = this.getRepositoryById(repoId);
    return repo ? repo.sync : null;
  }

  /**
   * Obtiene la configuración API de un repositorio específico
   * @param {string} repoId - ID del repositorio
   * @returns {Object|null} Configuración API o null
   */
  getRepoApiConfig(repoId) {
    const repo = this.getRepositoryById(repoId);
    return repo ? repo.api : null;
  }

  /**
   * Obtiene la configuración de almacenamiento de un repositorio
   * @param {string} repoId - ID del repositorio
   * @returns {Object|null} Configuración almacenamiento o null
   */
  getStorageConfig(repoId) {
    const repo = this.getRepositoryById(repoId);
    return repo ? repo.storage : null;
  }

  /**
   * Obtiene la configuración de integración de un repositorio
   * @param {string} repoId - ID del repositorio
   * @returns {Object|null} Configuración integraciones o null
   */
  getIntegrations(repoId) {
    const repo = this.getRepositoryById(repoId);
    return repo ? repo.integrations : null;
  }

  /**
   * Obtiene la configuración de autenticación de un repositorio
   * @param {string} repoId - ID del repositorio
   * @returns {Object|null} Configuración autenticación o null
   */
  getAuthConfig(repoId) {
    const repo = this.getRepositoryById(repoId);
    return repo ? repo.authentication : null;
  }

  /**
   * Valida que todas las variables de entorno requeridas estén configuradas
   * @returns {Object} { isValid: boolean, missing: string[] }
   */
  validateEnvironment() {
    const required = this.getRequiredEnvVars();
    const missing = [];

    Object.keys(required).forEach(envVar => {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    });

    return {
      isValid: missing.length === 0,
      missing
    };
  }

  /**
   * Obtiene la versión de la configuración
   * @returns {string} Versión
   */
  getVersion() {
    return this.config.version;
  }

  /**
   * Obtiene la fecha de última actualización
   * @returns {string} Fecha ISO
   */
  getLastUpdated() {
    return this.config.lastUpdated;
  }

  /**
   * Exporta la configuración completa
   * @returns {Object} Configuración completa
   */
  exportConfig() {
    return this.config;
  }

  /**
   * Exporta solo repositorios habilitados
   * @returns {Object} Configuración con solo repos habilitados
   */
  exportEnabledConfig() {
    return {
      ...this.config,
      repositories: this.getEnabledRepositories()
    };
  }
}

// Crear instancia singleton
export const githubConfigManager = new GitHubConfigManager();

/**
 * Hook de React para usar la configuración github
 * @returns {GitHubConfigManager} Instancia del gestor de configuración
 */
export const useGitHubConfig = () => {
  return githubConfigManager;
};

export default githubConfigManager;
