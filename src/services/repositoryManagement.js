/**
 * Repository Management Service
 * 
 * Servicio para gestionar operaciones CRUD en la configuración de repositorios GitHub.
 * Permite agregar, editar, eliminar y validar repositorios.
 * 
 * @module services/repositoryManagement
 */

import githubReposConfig from '../../infrastructure/github-repos.config.json';

/**
 * Clase para gestionar repositorios GitHub
 */
class RepositoryManagementService {
  constructor(config = githubReposConfig) {
    this.config = { ...config };
    this.storageKey = 'drawdb_repositories';
    this.listeners = [];
    
    // Cargar desde localStorage si existe, sino usar configuración por defecto
    this.repositories = this.loadFromStorage() || [...config.repositories];
  }

  /**
   * Carga repositorios desde localStorage
   * @returns {Array|null} Repositorios guardados o null
   */
  loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.error('Error cargando repositorios de localStorage:', error);
    }
    return null;
  }

  /**
   * Guarda repositorios en localStorage
   */
  saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.repositories));
        // Notificar a los listeners
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error guardando repositorios en localStorage:', error);
    }
  }

  /**
   * Suscribirse a cambios de repositorios
   * @param {Function} callback - Función a ejecutar cuando cambien los repositorios
   * @returns {Function} Función para desuscribirse
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notifica a todos los listeners que los repositorios han cambiado
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback([...this.repositories]);
      } catch (error) {
        console.error('Error en listener de repositorios:', error);
      }
    });
  }

  /**
   * Obtiene todos los repositorios
   * @returns {Array} Array de repositorios
   */
  getAllRepositories() {
    return [...this.repositories];
  }

  /**
   * Obtiene un repositorio por ID
   * @param {string} repoId - ID del repositorio
   * @returns {Object|null} Repositorio o null
   */
  getRepository(repoId) {
    return this.repositories.find(r => r.id === repoId) || null;
  }

  /**
   * Valida datos de un repositorio
   * @param {Object} repoData - Datos del repositorio
   * @returns {Object} { isValid: boolean, errors: Object }
   */
  validateRepository(repoData) {
    const errors = {};

    if (!repoData.id || repoData.id.trim() === '') {
      errors.id = 'El ID es requerido';
    }

    if (!repoData.name || repoData.name.trim() === '') {
      errors.name = 'El nombre es requerido';
    }

    if (!repoData.owner || repoData.owner.trim() === '') {
      errors.owner = 'El propietario es requerido';
    }

    if (!repoData.url || repoData.url.trim() === '') {
      errors.url = 'La URL es requerida';
    }

    if (!repoData.url.includes('github.com')) {
      errors.url = 'Debe ser una URL válida de GitHub';
    }

    if (!repoData.branch || repoData.branch.trim() === '') {
      errors.branch = 'La rama es requerida';
    }

    // Validar que ID sea único (excepto si es actualización)
    const existingRepo = this.repositories.find(r => r.id === repoData.id);
    if (existingRepo && (!repoData._existing || repoData._existing.id !== repoData.id)) {
      errors.id = 'El ID del repositorio ya existe';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Agrega un nuevo repositorio
   * @param {Object} repoData - Datos del repositorio
   * @returns {Object} { success: boolean, repository?: Object, error?: string }
   */
  addRepository(repoData) {
    try {
      // Validar
      const validation = this.validateRepository(repoData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Validación fallida',
          errors: validation.errors
        };
      }

      // Crear objeto repositorio
      const newRepository = {
        id: repoData.id,
        name: repoData.name,
        owner: repoData.owner,
        url: repoData.url,
        description: repoData.description || '',
        type: repoData.type || 'public',
        enabled: repoData.enabled !== false,
        branch: repoData.branch,
        defaultBranch: repoData.defaultBranch || repoData.branch,
        topics: repoData.topics || [],

        api: {
          endpoint: `https://api.github.com/repos/${repoData.owner}/${repoData.name}`,
          rate_limit: 60,
          rate_limit_reset: 3600
        },

        directories: {
          schemas: repoData.schemasPath || 'src/data/schemas.js',
          templates: repoData.templatesPath || 'src/templates/',
          exports: repoData.exportsPath || 'exports/',
          imports: repoData.importsPath || 'imports/'
        },

        integrations: {
          gists: {
            enabled: repoData.gistsEnabled !== false,
            prefix: repoData.gistsPrefix || 'drawdb-',
            description: 'DrawDB Diagram'
          },
          issues: {
            enabled: repoData.issuesEnabled !== false,
            labels: repoData.issuesLabels || ['bug', 'feature']
          },
          discussions: {
            enabled: repoData.discussionsEnabled !== false,
            category: 'General'
          }
        },

        sync: {
          enabled: repoData.syncEnabled !== false,
          frequency: repoData.syncFrequency || 'daily',
          lastSync: new Date().toISOString(),
          autoCommit: repoData.autoCommit !== false,
          commitMessage: repoData.commitMessage || '[DrawDB Auto-Sync] Database diagram update'
        },

        authentication: {
          type: 'token',
          tokenEnvVar: repoData.tokenEnvVar || 'GITHUB_TOKEN',
          scopes: repoData.scopes || ['repo', 'gist', 'user:email'],
          expiresAt: repoData.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },

        storage: {
          format: 'json',
          compression: repoData.compression || 'none',
          encryption: repoData.encryption === true,
          maxFileSize: repoData.maxFileSize || 10485760
        }
      };

      // Agregar al array
      this.repositories.push(newRepository);
      
      // Persistir cambios
      this.saveToStorage();

      return {
        success: true,
        repository: newRepository
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Actualiza un repositorio existente
   * @param {string} repoId - ID del repositorio
   * @param {Object} updates - Cambios a aplicar
   * @returns {Object} { success: boolean, repository?: Object, error?: string }
   */
  updateRepository(repoId, updates) {
    try {
      const repoIndex = this.repositories.findIndex(r => r.id === repoId);
      if (repoIndex === -1) {
        return {
          success: false,
          error: `Repositorio con ID "${repoId}" no encontrado`
        };
      }

      const existingRepo = this.repositories[repoIndex];
      const updatedData = { ...existingRepo, ...updates, _existing: existingRepo };

      // Validar
      const validation = this.validateRepository(updatedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Validación fallida',
          errors: validation.errors
        };
      }

      // Aplicar solo cambios permitidos
      const allowedFields = [
        'name', 'description', 'enabled', 'branch',
        'syncEnabled', 'syncFrequency', 'autoCommit',
        'gistsEnabled', 'issuesEnabled', 'discussionsEnabled',
        'schemasPath', 'templatesPath', 'exportsPath', 'importsPath'
      ];

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          if (field.includes('sync') || field.includes('Enabled')) {
            // Mapeo especial para campos anidados
            if (field === 'syncEnabled') {
              this.repositories[repoIndex].sync.enabled = updates[field];
            } else if (field === 'syncFrequency') {
              this.repositories[repoIndex].sync.frequency = updates[field];
            } else if (field === 'autoCommit') {
              this.repositories[repoIndex].sync.autoCommit = updates[field];
            } else if (field === 'gistsEnabled') {
              this.repositories[repoIndex].integrations.gists.enabled = updates[field];
            } else if (field === 'issuesEnabled') {
              this.repositories[repoIndex].integrations.issues.enabled = updates[field];
            } else if (field === 'discussionsEnabled') {
              this.repositories[repoIndex].integrations.discussions.enabled = updates[field];
            }
          } else if (field === 'schemasPath') {
            this.repositories[repoIndex].directories.schemas = updates[field];
          } else if (field === 'templatesPath') {
            this.repositories[repoIndex].directories.templates = updates[field];
          } else if (field === 'exportsPath') {
            this.repositories[repoIndex].directories.exports = updates[field];
          } else if (field === 'importsPath') {
            this.repositories[repoIndex].directories.imports = updates[field];
          } else {
            this.repositories[repoIndex][field] = updates[field];
          }
        }
      });

      // Actualizar timestamp
      this.repositories[repoIndex].sync.lastSync = new Date().toISOString();
      
      // Persistir cambios
      this.saveToStorage();

      return {
        success: true,
        repository: this.repositories[repoIndex]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Elimina un repositorio
   * @param {string} repoId - ID del repositorio
   * @returns {Object} { success: boolean, error?: string }
   */
  deleteRepository(repoId) {
    try {
      const index = this.repositories.findIndex(r => r.id === repoId);
      if (index === -1) {
        return {
          success: false,
          error: `Repositorio con ID "${repoId}" no encontrado`
        };
      }

      this.repositories.splice(index, 1);
      
      // Persistir cambios
      this.saveToStorage();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Habilita/deshabilita un repositorio
   * @param {string} repoId - ID del repositorio
   * @param {boolean} enabled - Si está habilitado
   * @returns {Object} { success: boolean, repository?: Object, error?: string }
   */
  toggleRepository(repoId, enabled) {
    return this.updateRepository(repoId, { enabled });
  }

  /**
   * Obtiene la configuración actualizada para exportar
   * @returns {Object} Configuración completa
   */
  getUpdatedConfiguration() {
    return {
      ...this.config,
      repositories: this.repositories,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Exporta la configuración como JSON
   * @returns {string} JSON stringificado
   */
  exportAsJSON() {
    return JSON.stringify(this.getUpdatedConfiguration(), null, 2);
  }

  /**
   * Valida que un repositorio sea accesible vía API GitHub
   * @param {string} owner - Propietario
   * @param {string} name - Nombre del repo
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} { isValid: boolean, data?: Object, error?: string }
   */
  async validateRepositoryAccess(owner, name, token) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${name}`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'DrawDB'
          }
        }
      );

      if (!response.ok) {
        return {
          isValid: false,
          error: `No se pudo acceder al repositorio: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();

      return {
        isValid: true,
        data: {
          name: data.name,
          owner: data.owner.login,
          url: data.html_url,
          description: data.description,
          defaultBranch: data.default_branch,
          private: data.private
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Error al validar repositorio: ${error.message}`
      };
    }
  }

  /**
   * Busca un archivo en el repositorio
   * @param {string} repoId - ID del repositorio
   * @param {string} filePath - Ruta del archivo
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} { found: boolean, content?: string, error?: string }
   */
  async findFileInRepository(repoId, filePath, token) {
    try {
      const repo = this.getRepository(repoId);
      if (!repo) {
        return {
          found: false,
          error: 'Repositorio no encontrado'
        };
      }

      // Obtener la rama correcta de GitHub (por si hay problemas de case-sensitivity)
      let actualBranch = repo.branch;
      try {
        const repoUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}`;
        const repoResponse = await fetch(repoUrl, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DrawDB'
          }
        });

        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          actualBranch = repoData.default_branch;
          console.log(`[findFileInRepository] Rama corregida: ${repo.branch} → ${actualBranch}`);
        }
      } catch (err) {
        console.warn(`[findFileInRepository] No se pudo obtener rama correcta, usando: ${repo.branch}`);
      }

      const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${filePath}?ref=${actualBranch}`;
      console.log(`[findFileInRepository] Buscando archivo via Contents API: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'DrawDB'
        }
      });

      console.log(`[findFileInRepository] Respuesta: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        return {
          found: false,
          error: `Archivo no encontrado: ${response.status} ${response.statusText}`
        };
      }

      const content = await response.text();

      console.log(`[findFileInRepository] ✓ Contenido obtenido (${content.length} bytes)`);

      return {
        found: true,
        content,
        filePath
      };
    } catch (error) {
      console.error(`[findFileInRepository] Error:`, error.message);
      return {
        found: false,
        error: `Error al buscar archivo: ${error.message}`
      };
    }
  }

  /**
   * Obtiene estadísticas de los repositorios
   * @returns {Object} Estadísticas
   */
  getStatistics() {
    return {
      totalRepositories: this.repositories.length,
      enabledRepositories: this.repositories.filter(r => r.enabled).length,
      disabledRepositories: this.repositories.filter(r => !r.enabled).length,
      syncEnabledRepositories: this.repositories.filter(r => r.sync?.enabled).length,
      byType: this.repositories.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Crear instancia singleton
export const repositoryManagementService = new RepositoryManagementService();

export default repositoryManagementService;
