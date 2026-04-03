/**
 * Repository Management Hook
 * 
 * Hook de React para manejar operaciones CRUD de repositorios GitHub
 * 
 * @module hooks/useRepositoryManagement
 */

import { useState, useCallback, useEffect } from 'react';
import repositoryManagementService from '../services/repositoryManagement';

/**
 * Hook para gestionar repositorios GitHub
 * @returns {Object} Métodos y estado para gestionar repositorios
 */
export const useRepositoryManagement = () => {
  const [repositories, setRepositories] = useState(
    repositoryManagementService.getAllRepositories()
  );
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Suscribirse a cambios de repositorios
  useEffect(() => {
    const unsubscribe = repositoryManagementService.subscribe((updatedRepos) => {
      setRepositories(updatedRepos);
    });

    // Limpiar suscripción cuando se desmonta el componente
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /**
   * Obtiene todos los repositorios
   */
  const getAll = useCallback(() => {
    return repositoryManagementService.getAllRepositories();
  }, []);

  /**
   * Agrega un nuevo repositorio
   */
  const addRepository = useCallback((repoData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = repositoryManagementService.addRepository(repoData);

      if (result.success) {
        setRepositories(repositoryManagementService.getAllRepositories());
        setSuccess(`Repositorio "${repoData.name}" agregado correctamente`);
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualiza un repositorio
   */
  const updateRepository = useCallback((repoId, updates) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = repositoryManagementService.updateRepository(repoId, updates);

      if (result.success) {
        setRepositories(repositoryManagementService.getAllRepositories());
        setSuccess('Repositorio actualizado correctamente');
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Elimina un repositorio
   */
  const deleteRepository = useCallback((repoId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = repositoryManagementService.deleteRepository(repoId);

      if (result.success) {
        setRepositories(repositoryManagementService.getAllRepositories());
        setSuccess('Repositorio eliminado correctamente');
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Habilita/deshabilita un repositorio
   */
  const toggleRepository = useCallback((repoId, enabled) => {
    setLoading(true);
    setError(null);

    try {
      const result = repositoryManagementService.toggleRepository(repoId, enabled);

      if (result.success) {
        setRepositories(repositoryManagementService.getAllRepositories());
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Valida acceso a un repositorio
   */
  const validateRepositoryAccess = useCallback(async (owner, name, token) => {
    setLoading(true);
    setError(null);

    try {
      const result = await repositoryManagementService.validateRepositoryAccess(owner, name, token);
      return result;
    } catch (err) {
      setError(err.message);
      return { isValid: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Busca un archivo en un repositorio
   */
  const findFileInRepository = useCallback(async (repoId, filePath, token) => {
    setLoading(true);
    setError(null);

    try {
      const result = await repositoryManagementService.findFileInRepository(repoId, filePath, token);
      return result;
    } catch (err) {
      setError(err.message);
      return { found: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene estadísticas
   */
  const getStatistics = useCallback(() => {
    return repositoryManagementService.getStatistics();
  }, []);

  /**
   * Exporta la configuración como JSON
   */
  const exportConfiguration = useCallback(() => {
    return repositoryManagementService.exportAsJSON();
  }, []);

  /**
   * Limpia mensajes
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    // Estado
    repositories,
    error,
    success,
    loading,

    // Métodos
    getAll,
    addRepository,
    updateRepository,
    deleteRepository,
    toggleRepository,
    validateRepositoryAccess,
    findFileInRepository,
    getStatistics,
    exportConfiguration,
    clearMessages
  };
};

export default useRepositoryManagement;
