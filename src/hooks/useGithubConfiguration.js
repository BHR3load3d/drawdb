/**
 * GitHub Configuration React Hooks
 * 
 * Hooks personalizados para consumir configuración de GitHub
 * dentro de componentes React en DrawDB
 * 
 * @module hooks/useGithubConfiguration
 */

import { useState, useCallback, useEffect, useContext, createContext } from 'react';
import githubConfigManager from '../utils/githubConfig';

/**
 * Contexto para GitHub Configuration
 */
export const GitHubConfigContext = createContext(null);

/**
 * Hook para obtener un repositorio específico
 * @param {string} repoId - ID del repositorio
 * @returns {Object} { repository, loading, error }
 */
export const useRepository = (repoId) => {
  const [repository, setRepository] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setLoading(true);
      const repo = githubConfigManager.getRepositoryById(repoId);
      
      if (!repo) {
        setError(new Error(`Repositorio "${repoId}" no encontrado`));
        setRepository(null);
      } else {
        setRepository(repo);
        setError(null);
      }
    } catch (err) {
      setError(err);
      setRepository(null);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  return { repository, loading, error };
};

/**
 * Hook para obtener todos los repositorios habilitados
 * @returns {Object} { repositories, loading, error }
 */
export const useEnabledRepositories = () => {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setLoading(true);
      const repos = githubConfigManager.getEnabledRepositories();
      setRepositories(repos);
      setError(null);
    } catch (err) {
      setError(err);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { repositories, loading, error };
};

/**
 * Hook para obtener plantillas disponibles
 * @returns {Object} { templates, loading, error }
 */
export const useTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setLoading(true);
      const tmpl = githubConfigManager.getTemplates();
      setTemplates(tmpl);
      setError(null);
    } catch (err) {
      setError(err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { templates, loading, error };
};

/**
 * Hook para obtener una plantilla específica
 * @param {string} templateId - ID de la plantilla
 * @returns {Object} { template, loading, error }
 */
export const useTemplate = (templateId) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setLoading(true);
      const tmpl = githubConfigManager.getTemplateById(templateId);
      
      if (!tmpl) {
        setError(new Error(`Plantilla "${templateId}" no encontrada`));
        setTemplate(null);
      } else {
        setTemplate(tmpl);
        setError(null);
      }
    } catch (err) {
      setError(err);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  return { template, loading, error };
};

/**
 * Hook para validar configuración de entorno
 * @returns {Object} { isValid, missing, configured }
 */
export const useEnvironmentValidation = () => {
  const [validated, setValidated] = useState({
    isValid: false,
    missing: [],
    configured: []
  });

  useEffect(() => {
    const validation = githubConfigManager.validateEnvironment();
    const allVars = Object.keys(githubConfigManager.getRequiredEnvVars());
    const configured = allVars.filter(v => !validation.missing.includes(v));
    
    setValidated({
      isValid: validation.isValid,
      missing: validation.missing,
      configured
    });
  }, []);

  return validated;
};

/**
 * Hook para obtener configuración de sincronización
 * @param {string} repoId - ID del repositorio
 * @returns {Object} { syncConfig, isEnabled, frequency }
 */
export const useRepositorySyncConfig = (repoId) => {
  const [syncConfig, setSyncConfig] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [frequency, setFrequency] = useState(null);

  useEffect(() => {
    try {
      const config = githubConfigManager.getSyncConfig(repoId);
      setSyncConfig(config);
      setIsEnabled(config?.enabled || false);
      setFrequency(config?.frequency || null);
    } catch (err) {
      setSyncConfig(null);
      setIsEnabled(false);
      setFrequency(null);
    }
  }, [repoId]);

  return { syncConfig, isEnabled, frequency };
};

/**
 * Hook para obtener configuración de exportación de datos
 * @returns {Object} Configuración de exportación
 */
export const useDataExportConfig = () => {
  const [exportConfig, setExportConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setLoading(true);
      const config = githubConfigManager.getDataExportConfig();
      setExportConfig(config);
    } finally {
      setLoading(false);
    }
  }, []);

  return { exportConfig, loading };
};

/**
 * Hook para obtener token de autenticación de GitHub
 * @param {string} tokenEnvVar - Variable de entorno del token
 * @returns {Object} { token, isConfigured, scopes }
 */
export const useGitHubToken = (tokenEnvVar = 'GITHUB_TOKEN') => {
  const [token, setToken] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [scopes, setScopes] = useState([]);

  useEffect(() => {
    try {
      const tkn = githubConfigManager.getAuthToken(tokenEnvVar);
      setToken(tkn || null);
      setIsConfigured(!!tkn);

      // Obtener scopes del token
      const repos = githubConfigManager.getEnabledRepositories();
      if (repos.length > 0) {
        const repo = repos[0];
        const authConfig = githubConfigManager.getAuthConfig(repo.id);
        setScopes(authConfig?.scopes || []);
      }
    } catch (err) {
      setToken(null);
      setIsConfigured(false);
      setScopes([]);
    }
  }, [tokenEnvVar]);

  return { token, isConfigured, scopes };
};

/**
 * Hook para obtener configuración de integración de un repo
 * @param {string} repoId - ID del repositorio
 * @returns {Object} Configuración de integraciones
 */
export const useRepositoryIntegrations = (repoId) => {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setLoading(true);
      const integ = githubConfigManager.getIntegrations(repoId);
      setIntegrations(integ);
    } catch (err) {
      setIntegrations(null);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  return { integrations, loading };
};

/**
 * Hook para obtener configuración global
 * @returns {Object} Configuración global
 */
export const useGlobalSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setLoading(true);
      const stngs = githubConfigManager.getGlobalSettings();
      setSettings(stngs);
    } finally {
      setLoading(false);
    }
  }, []);

  return { settings, loading };
};

/**
 * Hook para obtener información de versión de configuración
 * @returns {Object} { version, lastUpdated }
 */
export const useConfigurationVersion = () => {
  const [version, setVersion] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    try {
      setVersion(githubConfigManager.getVersion());
      setLastUpdated(githubConfigManager.getLastUpdated());
    } catch (err) {
      setVersion(null);
      setLastUpdated(null);
    }
  }, []);

  return { version, lastUpdated };
};

/**
 * Hook para manejar cambios de repositorio con validación
 * @returns {Object} { selectRepository, selectedRepo, error }
 */
export const useRepositorySelector = () => {
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [error, setError] = useState(null);

  const selectRepository = useCallback((repoId) => {
    try {
      const repo = githubConfigManager.getRepositoryById(repoId);
      
      if (!repo) {
        setError(new Error(`Repositorio no encontrado: ${repoId}`));
        setSelectedRepo(null);
        return false;
      }

      if (!repo.enabled) {
        setError(new Error(`Repositorio deshabilitado: ${repo.name}`));
        setSelectedRepo(null);
        return false;
      }

      setSelectedRepo(repo);
      setError(null);
      return true;
    } catch (err) {
      setError(err);
      setSelectedRepo(null);
      return false;
    }
  }, []);

  return { selectRepository, selectedRepo, error };
};

/**
 * Hook para obtener configuración API
 * @returns {Object} Configuración API de GitHub
 */
export const useGitHubApiConfig = () => {
  const [apiConfig, setApiConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setLoading(true);
      const config = githubConfigManager.getApiConfiguration();
      setApiConfig(config);
    } finally {
      setLoading(false);
    }
  }, []);

  return { apiConfig, loading };
};

/**
 * Hook combinado para obtener toda la información necesaria para trabajar con un repo
 * @param {string} repoId - ID del repositorio
 * @returns {Object} Información completa del repositorio
 */
export const useRepositoryComplete = (repoId) => {
  const { repository, loading: repoLoading } = useRepository(repoId);
  const { syncConfig, isEnabled: syncEnabled } = useRepositorySyncConfig(repoId);
  const { integrations } = useRepositoryIntegrations(repoId);
  const { apiConfig } = useGitHubApiConfig();

  return {
    repository,
    syncConfig,
    integrations,
    apiConfig,
    isReady: !!repository && !!apiConfig,
    loading: repoLoading,
    isSyncEnabled: syncEnabled
  };
};

export default {
  useRepository,
  useEnabledRepositories,
  useTemplates,
  useTemplate,
  useEnvironmentValidation,
  useRepositorySyncConfig,
  useDataExportConfig,
  useGitHubToken,
  useRepositoryIntegrations,
  useGlobalSettings,
  useConfigurationVersion,
  useRepositorySelector,
  useGitHubApiConfig,
  useRepositoryComplete
};
