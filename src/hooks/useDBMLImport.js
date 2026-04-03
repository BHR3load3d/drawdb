/**
 * DBML Import Hook
 * 
 * Hook de React para importar archivos DBML desde repositorios GitHub
 * 
 * @module hooks/useDBMLImport
 */

import { useState, useCallback } from 'react';
import dbmlImportService from '../services/dbmlImport';

/**
 * Hook para importar DBML desde GitHub
 * @returns {Object} Métodos y estado para importación DBML
 */
export const useDBMLImport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importedDiagrams, setImportedDiagrams] = useState([]);
  const [foundFiles, setFoundFiles] = useState([]);

  /**
   * Busca archivos DBML en un repositorio
   */
  const findDBMLFiles = useCallback(async (repoId, token) => {
    setLoading(true);
    setError(null);

    try {
      const files = await dbmlImportService.findDBMLFiles(repoId, token);
      setFoundFiles(files);
      return files;
    } catch (err) {
      setError(err.message);
      setFoundFiles([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Descarga un archivo DBML
   */
  const downloadDBMLFile = useCallback(async (repoId, filePath, token) => {
    setLoading(true);
    setError(null);

    try {
      const file = await dbmlImportService.downloadDBMLFile(repoId, filePath, token);
      return file;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Importa un archivo DBML desde GitHub
   */
  const importDBML = useCallback(async (repoId, filePath, token) => {
    setLoading(true);
    setError(null);

    try {
      const diagram = await dbmlImportService.importDBMLFromRepo(repoId, filePath, token);
      setImportedDiagrams(prev => [...prev, diagram]);
      return diagram;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sincroniza todos los archivos DBML de un repo
   */
  const syncRepository = useCallback(async (repoId, token) => {
    setLoading(true);
    setError(null);

    try {
      const diagrams = await dbmlImportService.syncDBMLFromRepository(repoId, token);
      setImportedDiagrams(diagrams);
      return diagrams;
    } catch (err) {
      setError(err.message);
      setImportedDiagrams([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Valida si es DBML
   */
  const validateDBML = useCallback((content) => {
    return dbmlImportService.isValidDBML(content);
  }, []);

  /**
   * Valida si es SQL
   */
  const validateSQL = useCallback((content) => {
    return dbmlImportService.isValidSQL(content);
  }, []);

  /**
   * Parsea DBML a esquema DrawDB
   */
  const parseDBML = useCallback((content) => {
    try {
      const schema = dbmlImportService.parseDBML(content);
      return schema;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Obtiene formatos soportados
   */
  const getSupportedFormats = useCallback(() => {
    return dbmlImportService.getSupportedFormats();
  }, []);

  /**
   * Lista archivos DBML disponibles
   */
  const listAvailableFiles = useCallback(async (repoId, token) => {
    setLoading(true);
    setError(null);

    try {
      const files = await dbmlImportService.listAvailableDBMLFiles(repoId, token);
      setFoundFiles(files);
      return files;
    } catch (err) {
      setError(err.message);
      setFoundFiles([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Limpia el estado
   */
  const clearState = useCallback(() => {
    setError(null);
    setImportedDiagrams([]);
    setFoundFiles([]);
  }, []);

  return {
    // Estado
    loading,
    error,
    importedDiagrams,
    foundFiles,

    // Métodos
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
  };
};

export default useDBMLImport;
