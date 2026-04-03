/**
 * Repository Selector Component
 * 
 * Componente para seleccionar un repositorio e importar DBML
 * desde la barra de herramientas del editor
 */

import React, { useState, useEffect } from 'react';
import { Select, Spin, Toast } from '@douyinfe/semi-ui';
import repositoryManagementService from '../services/repositoryManagement';
import dbmlImportService from '../services/dbmlImport';
import { useDBMLImport } from '../hooks/useDBMLImport';
import { useTranslation } from 'react-i18next';
import { useDiagram } from '../hooks';

export default function RepositorySelector() {
  const { t } = useTranslation();
  const { importDBML, findDBMLFiles } = useDBMLImport();
  const { setTables, setRelationships, setSourceInfo } = useDiagram();
  
  const [repositories, setRepositories] = useState(
    repositoryManagementService.getAllRepositories()
  );
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [dbmlFiles, setDbmlFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [manualFilePath, setManualFilePath] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Suscribirse a cambios de repositorios
  useEffect(() => {
    const unsubscribe = repositoryManagementService.subscribe((updatedRepos) => {
      setRepositories(updatedRepos);
      // Limpiar selección si el repositorio seleccionado ya no existe
      if (selectedRepo && !updatedRepos.find(r => r.id === selectedRepo)) {
        setSelectedRepo(null);
        setDbmlFiles([]);
        setSelectedFile(null);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Suscribirse una sola vez al montar

  // Obtener lista de repositorios habilitados
  const enabledRepos = repositories?.filter(r => r.enabled) || [];

  const repoOptions = enabledRepos.map(repo => ({
    label: `${repo.owner}/${repo.name}`,
    value: repo.id,
    data: repo
  }));

  // Buscar archivos DBML cuando se selecciona un repo
  const handleRepoChange = async (repoId) => {
    setSelectedRepo(repoId);
    setSelectedFile(null);
    setDbmlFiles([]);
    setManualFilePath('');

    if (!repoId) return;

    const repo = enabledRepos.find(r => r.id === repoId);
    if (!repo) return;

    console.log(`\n[RepositorySelector] Buscando archivos DBML en: ${repo.owner}/${repo.name}`);

    setLoadingFiles(true);
    try {
      const token = import.meta.env.VITE_GITHUB_TOKEN || '';
      
      // PRIMERO: Diagnosticar conexión
      console.log(`[RepositorySelector] Ejecutando diagnóstico de conexión...`);
      await dbmlImportService.verifyRepositoryConnection(repoId, token);
      
      // LUEGO: Buscar archivos
      const files = await findDBMLFiles(repoId, token);
      
      console.log(`[RepositorySelector] Búsqueda completada. Encontrados: ${files?.length || 0} archivos`);
      if (files?.length > 0) {
        console.log(`[RepositorySelector] Archivos encontrados:`, files.map(f => f.path).join(', '));
      }
      
      if (files && files.length > 0) {
        setDbmlFiles(files);
        // Si solo hay un archivo, seleccionarlo automáticamente
        if (files.length === 1) {
          handleFileSelect(files[0].path);
        }
        Toast.success({
          content: `${files.length} ${t('dbml_files_found')}`,
          duration: 2
        });
      } else {
        Toast.info({
          content: `${t('no_dbml_files_found')}. ${t('enter_file_path_manually')}`,
          duration: 3
        });
      }
    } catch (error) {
      console.error(`[RepositorySelector] Error buscando archivos:`, error);
      Toast.error({
        content: `${t('error')}: ${error.message}`,
        duration: 3
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = (filePath) => {
    setSelectedFile(filePath);
  };

  const handleImport = async () => {
    // Usar ruta manual si se proporciona, sino usar archivo seleccionado
    const filePathToImport = manualFilePath.trim() || selectedFile;
    
    if (!selectedRepo || !filePathToImport) {
      Toast.error({
        content: t('select_repo_and_file'),
        duration: 3
      });
      return;
    }

    setIsImporting(true);
    try {
      const repo = enabledRepos.find(r => r.id === selectedRepo);
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[RepositorySelector] INICIANDO IMPORTACIÓN DBML`);
      console.log(`  Repositorio: ${repo?.owner}/${repo?.name} (rama: ${repo?.branch})`);
      console.log(`  Archivo: ${filePathToImport}`);
      console.log(`  Token presente: ${!!import.meta.env.VITE_GITHUB_TOKEN}`);
      console.log(`${'='.repeat(60)}\n`);
      
      const token = import.meta.env.VITE_GITHUB_TOKEN || '';
      const diagram = await importDBML(selectedRepo, filePathToImport, token);
      
      console.log(`[RepositorySelector] DBML importado: ${diagram.tables?.length || 0} tablas, ${diagram.relationships?.length || 0} relaciones`);
      
      if (diagram) {
        // Cargar tablas y relaciones en el editor
        setTables(diagram.tables || []);
        setRelationships(diagram.relationships || []);
        
        // Guardar metadata del import para poder hacer commit después
        const repo = enabledRepos.find(r => r.id === selectedRepo);
        setSourceInfo({
          repoId: selectedRepo,
          filePath: filePathToImport,
          owner: repo?.owner,
          repo: repo?.name,
          branch: repo?.branch
        });
        
        Toast.success({
          content: t('dbml_imported_successfully'),
          duration: 3
        });
        
        // Limpiar selección
        setSelectedRepo(null);
        setSelectedFile(null);
        setDbmlFiles([]);
        setManualFilePath('');
      }
    } catch (error) {
      console.error(`[RepositorySelector] ✗ ERROR IMPORTANDO:`, error);
      console.error(`[RepositorySelector] Mensaje de error: ${error.message}`);
      Toast.error({
        content: `${t('error')}: ${error.message}`,
        duration: 3
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (enabledRepos.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2" style={{ minWidth: '300px', flexWrap: 'wrap' }}>
      <Select
        placeholder={t('select_repository') || 'Seleccionar repositorio'}
        value={selectedRepo}
        onChange={handleRepoChange}
        optionList={repoOptions}
        size="small"
        style={{ minWidth: '150px', flex: '0 1 auto' }}
        renderSelectedItem={(optionNode) => {
          if (!optionNode) return t('select_repository') || 'Repo';
          return optionNode.label || optionNode.children;
        }}
      />
      
      {loadingFiles && <Spin size="small" />}
      
      {selectedRepo && (
        <>
          {dbmlFiles.length > 0 && (
            <Select
              placeholder={t('select_dbml_file') || 'Seleccionar archivo'}
              value={selectedFile}
              onChange={handleFileSelect}
              optionList={dbmlFiles.map(f => ({
                label: f.name,
                value: f.path
              }))}
              size="small"
              style={{ minWidth: '120px', flex: '0 1 auto' }}
              renderSelectedItem={(optionNode) => {
                if (!optionNode) return t('select_dbml_file') || 'DBML';
                return optionNode.label || optionNode.children;
              }}
            />
          )}
          
          <input
            type="text"
            placeholder={dbmlFiles.length > 0 ? "archivo.dbml" : "prueba.dbml o ruta/archivo.dbml"}
            value={manualFilePath}
            onChange={(e) => setManualFilePath(e.target.value)}
            title={dbmlFiles.length === 0 ? "Ingresa el nombre del archivo o la ruta completa (ej: prueba.dbml o schemas/db.dbml)" : "Ingresa el nombre del archivo o la ruta"}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '12px',
              minWidth: '120px',
              flex: '0 1 auto'
            }}
            className="hover-2"
          />
          
          <button
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
            onClick={handleImport}
            disabled={isImporting || (!selectedFile && !manualFilePath.trim())}
            title={dbmlFiles.length === 0 ? "Ingresa la ruta manualmente para importar" : "Importar DBML"}
          >
            {isImporting ? <Spin size="small" /> : '📥'}
          </button>
        </>
      )}
    </div>
  );
}
