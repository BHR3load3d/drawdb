import React, { useState, useEffect, useRef } from 'react';
import { Select, Spin, Toast } from '@douyinfe/semi-ui';
import repositoryManagementService from '../services/repositoryManagement';
import dbmlImportService from '../services/dbmlImport';
import { useDBMLImport } from '../hooks/useDBMLImport';
import { useTranslation } from 'react-i18next';
import { State } from '../data/constants';
import { 
  useDiagram,
  useTransform,
  useAreas,
  useNotes,
  useEnums,
  useTypes,
  useSaveState
} from '../hooks';

export default function RepositorySelector() {
  const { t } = useTranslation();
  const { importDBML, findDBMLFiles } = useDBMLImport();
  const { setTables, setRelationships, setSourceInfo, sourceInfo, setShouldAutoLoadDiagram } = useDiagram();
  const { setTransform } = useTransform();
  const { setAreas } = useAreas();
  const { setNotes } = useNotes();
  const { setEnums } = useEnums();
  const { setTypes } = useTypes();
  const { saveState } = useSaveState();
  
  const [repositories, setRepositories] = useState(
    repositoryManagementService.getAllRepositories()
  );
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [dbmlFiles, setDbmlFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [manualFilePath, setManualFilePath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const prevIsNewRef = useRef(sourceInfo?.isNew); // Rastrear cambios de isNew
  const confirmPendingRef = useRef(false); // Rastrear si ya confirmamos en este ciclo
  const currentRepoRef = useRef(null); // Cache del repositorio actual para evitar dependencias stale

  // Actualizar el cache del repositorio seleccionado
  useEffect(() => {
    if (selectedRepo) {
      const allRepos = repositories?.filter(r => r.enabled) || [];
      const repo = allRepos.find(r => r.id === selectedRepo);
      if (repo) {
        currentRepoRef.current = repo;
        console.log(`[RepositorySelector] Cache del repo actualizado: ${repo.owner}/${repo.name}`);
      }
    }
  }, [selectedRepo, repositories]);

  // Auto-confirmar nombre pendiente cuando el usuario intenta guardar
  useEffect(() => {
    if (saveState === State.SAVING && selectedFile === 'NEW' && newFileName.trim() && !sourceInfo?.isNew && !confirmPendingRef.current) {
      console.log(`[RepositorySelector] Confirmando nombre pendiente automáticamente para guardar...`);
      confirmPendingRef.current = true;
      // Ejecutar handleImport() será necesario, voy a usar setTimeout para asegurar que se ejecute
      // después del render actual
      setTimeout(() => {
        // El problema es que handleImport no está definido aún. Voy a hacer la lógica aquí.
        if (!selectedRepo) {
          Toast.error({
            content: 'Por favor selecciona un repositorio',
            duration: 3
          });
          confirmPendingRef.current = false;
          return;
        }

        const fileName = newFileName.trim();
        if (!fileName) {
          Toast.error({
            content: 'Por favor ingresa un nombre para el archivo',
            duration: 3
          });
          confirmPendingRef.current = false;
          return;
        }
        
        // Agregar extensión si no la tiene
        const dbmlFileName = fileName.endsWith('.dbml') ? fileName : fileName + '.dbml';
        const allRepos = repositories?.filter(r => r.enabled) || [];
        const repo = allRepos.find(r => r.id === selectedRepo);
        
        // Guardar información para el commit
        setSourceInfo({
          repoId: selectedRepo,
          filePath: dbmlFileName,
          owner: repo?.owner,
          repo: repo?.name,
          branch: repo?.branch,
          isNew: true
        });
        
        console.log(`[RepositorySelector] ✓ Nombre confirmado automáticamente: ${dbmlFileName}`);
      }, 0);
    }
  }, [saveState, selectedFile, newFileName, selectedRepo, repositories, sourceInfo?.isNew, setSourceInfo]);

  // Limpiar canvas cuando no hay repositorio seleccionado
  useEffect(() => {
    // Si hay repositorio seleccionado, desactivar el auto-load de Workspace (RepositorySelector controla)
    // Si NO hay repositorio, también desactivar auto-load pero además limpiar canvas
    if (!selectedRepo) {
      console.log(`[RepositorySelector] No hay repositorio - Limpiando canvas`);
      setShouldAutoLoadDiagram(false); // Desactivar auto-load del diagrama guardado
      setTables([]);
      setRelationships([]);
      setAreas([]);
      setNotes([]);
      setEnums([]);
      setTypes([]);
      setSourceInfo(null);
    } else {
      // Cuando hay repositorio, RepositorySelector controla qué se carga, no Workspace
      setShouldAutoLoadDiagram(false);
    }
  }, [selectedRepo, setShouldAutoLoadDiagram, setTables, setRelationships, setAreas, setNotes, setEnums, setTypes, setSourceInfo]);

  // Suscribirse a cambios de repositorios
  useEffect(() => {
    const unsubscribe = repositoryManagementService.subscribe((updatedRepos) => {
      setRepositories(updatedRepos);
      // Limpiar selección si el repositorio seleccionado ya no existe
      if (selectedRepo && !updatedRepos.find(r => r.id === selectedRepo)) {
        setSelectedRepo(null);
        setDbmlFiles([]);
        setSelectedFile(null);
        // Limpiar canvas también
        setTables([]);
        setRelationships([]);
        setAreas([]);
        setNotes([]);
        setEnums([]);
        setTypes([]);
        setSourceInfo(null);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Suscribirse una sola vez al montar

  // Auto-cargar archivo DBML cuando se selecciona uno del combo
  useEffect(() => {
    // Si se selecciona "Nuevo", limpiar el canvas completamente
    if (selectedFile === 'NEW') {
      console.log(`[RepositorySelector] Modo "Nuevo" seleccionado - Limpiando canvas`);
      setTables([]);
      setRelationships([]);
      setAreas([]);
      setNotes([]);
      setEnums([]);
      setTypes([]);
      setSourceInfo(null);
      return;
    }

    // Si se selecciona un archivo existente, cargarlo automáticamente
    if (!selectedFile || selectedFile === 'NEW' || !selectedRepo) {
      return; // No hacer nada si faltan datos
    }

    console.log(`[RepositorySelector] Auto-cargando archivo: ${selectedFile}`);
    
    // Disparar la carga automáticamente
    let isMounted = true; // Para evitar actualizar estado si el componente se desmonta
    
    (async () => {
      try {
        setIsImporting(true);
        
        // Usar repositories directamente para evitar problemas con closures
        const allRepos = repositories?.filter(r => r.enabled) || [];
        let repo = allRepos.find(r => r.id === selectedRepo);
        
        // Si no encuentra el repo en la lista actual, usar el cache
        if (!repo && currentRepoRef.current) {
          console.log(`[RepositorySelector] Usando repo en cache: ${currentRepoRef.current.owner}/${currentRepoRef.current.name}`);
          repo = currentRepoRef.current;
        }
        
        if (!repo) {
          console.error(`[RepositorySelector] Repositorio no encontrado: ${selectedRepo}`);
          Toast.error({
            content: `Repositorio no encontrado. Por favor, selecciona uno nuevamente.`,
            duration: 3
          });
          return;
        }

        const token = import.meta.env.VITE_GITHUB_TOKEN || '';
        console.log(`[RepositorySelector] Importando desde: ${repo.owner}/${repo.name}/${selectedFile}`);
        
        const diagram = await importDBML(selectedRepo, selectedFile, token);
        
        if (!isMounted) return;
        
        if (diagram) {
          console.log(`[RepositorySelector] DBML importado correctamente: ${diagram.tables?.length || 0} tablas`);
          
          let finalTables = diagram.tables || [];
          let finalRelationships = diagram.relationships || [];
          let finalAreas = null;
          let finalNotes = null;
          let finalEnums = null;
          let finalTypes = null;
          let finalTransform = null;
          
          // Cargar configuración si existe
          try {
            const configFileName = selectedFile.replace('.dbml', '') + '_config.json';
            console.log(`[RepositorySelector] Buscando configuración: ${configFileName}`);
            
            const config = await dbmlImportService.loadDiagramConfig(
              configFileName,
              {
                owner: repo?.owner,
                repo: repo?.name,
                branch: repo?.branch
              },
              token
            );
            
            if (!isMounted) return;
            
            if (config) {
              console.log(`[RepositorySelector] Configuración cargada. Preparando datos finales...`);
              finalTables = mergeTablesWithConfig(diagram.tables || [], config.tables || []);
              
              if (config.pan || typeof config.zoom === 'number') {
                finalTransform = {};
                if (config.pan) finalTransform.pan = config.pan;
                if (typeof config.zoom === 'number') finalTransform.zoom = config.zoom;
              }
              
              if (Array.isArray(config.areas) && config.areas.length > 0) finalAreas = config.areas;
              if (Array.isArray(config.notes) && config.notes.length > 0) finalNotes = config.notes;
              if (Array.isArray(config.enums) && config.enums.length > 0) finalEnums = config.enums;
              if (Array.isArray(config.types) && config.types.length > 0) finalTypes = config.types;
              
              console.log(`[RepositorySelector] ✓ Datos preparados con configuración`);
            } else {
              console.log(`[RepositorySelector] No hay configuración guardada, usando datos del DBML`);
            }
          } catch (error) {
            console.warn(`[RepositorySelector] Configuración no disponible: ${error.message}, usando datos del DBML`);
          }
          
          // Ahora hacer TODOS los setters de una sola vez
          console.log(`[RepositorySelector] Actualizando canvas con datos finales...`);
          setTables(finalTables);
          setRelationships(finalRelationships);
          
          if (finalTransform) setTransform(finalTransform);
          if (finalAreas) setAreas(finalAreas);
          if (finalNotes) setNotes(finalNotes);
          if (finalEnums) setEnums(finalEnums);
          if (finalTypes) setTypes(finalTypes);
          
          // Guardar sourceInfo al final
          setSourceInfo({
            repoId: selectedRepo,
            filePath: selectedFile,
            owner: repo?.owner,
            repo: repo?.name,
            branch: repo?.branch,
            isNew: false
          });
          
          console.log(`[RepositorySelector] ✓ Canvas actualizado completamente`);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error(`[RepositorySelector] Error auto-cargando archivo:`, error);
        Toast.error({
          content: `Error cargando ${selectedFile}: ${error.message}`,
          duration: 3
        });
      } finally {
        if (isMounted) {
          setIsImporting(false);
        }
      }
    })();
    
    return () => {
      isMounted = false; // Cleanup si el componente se desmonta
    };
  }, [selectedFile, selectedRepo, repositories, setTables, setRelationships, setSourceInfo, setTransform, setAreas, setNotes, setEnums, setTypes]);

  // Detectar cuando se GUARDA un nuevo archivo (isNew: true → false) y actualizar la lista automáticamente
  useEffect(() => {
    // Solo ejecutar si: 
    // 1. Hay sourceInfo
    // 2. isNew cambió de true a false (no solo que sea false)
    // 3. Hay un repositorio seleccionado
    const wasNew = prevIsNewRef.current;
    const isNowNew = sourceInfo?.isNew;
    const isNewJustSaved = wasNew === true && isNowNew === false;
    
    if (isNewJustSaved && selectedRepo) {
      console.log(`[RepositorySelector] Archivo nuevo fue guardado. Re-buscando archivos...`);
      
      // Esperar un poco para que GitHub actualice los índices
      const timer = setTimeout(async () => {
        try {
          setLoadingFiles(true);
          
          const token = import.meta.env.VITE_GITHUB_TOKEN || '';
          const files = await findDBMLFiles(selectedRepo, token);
          
          if (files && files.length > 0) {
            console.log(`[RepositorySelector] Archivos actualizados. Total: ${files.length}`);
            setDbmlFiles(files);
            
            // Seleccionar automáticamente el archivo que se acaba de guardar
            const newFile = files.find(f => f.path === sourceInfo.filePath);
            if (newFile) {
              console.log(`[RepositorySelector] ✓ Seleccionando nuevo archivo: ${newFile.path}`);
              setSelectedFile(newFile.path);
              Toast.success({
                content: `${newFile.name} agregado al combo y seleccionado automáticamente`,
                duration: 2
              });
            }
          }
        } catch (error) {
          console.error(`[RepositorySelector] Error re-buscando archivos:`, error);
        } finally {
          setLoadingFiles(false);
        }
      }, 1500); // Esperar 1.5 segundos a que GitHub actualice
      
      return () => clearTimeout(timer);
    }
    
    // Actualizar el valor anterior después de procesar
    prevIsNewRef.current = isNowNew;
  }, [sourceInfo?.isNew, sourceInfo?.filePath, selectedRepo]);

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
    setSelectedFile('NEW'); // Por defecto seleccionar "Nuevo"
    setNewFileName('');
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
    
    // Si selecciona "Nuevo", limpiar el canvas para comenzar nuevo esquema
    if (filePath === 'NEW') {
      setTables([]);
      setRelationships([]);
      setAreas([]);
      setNotes([]);
      setEnums([]);
      setTypes([]);
      setNewFileName('');
      setManualFilePath('');
      // Resetear la información del origen
      setSourceInfo(null);
    }
  };

  /**
   * Mergea las propiedades de posición del config con las tablas del DBML
   * @param {Array} dbmlTables - Tablas importadas del DBML
   * @param {Array} configTables - Tablas del config JSON con posición
   * @returns {Array} Tablas mergeadas
   */
  const mergeTablesWithConfig = (dbmlTables, configTables) => {
    if (!Array.isArray(configTables) || configTables.length === 0) {
      return dbmlTables;
    }

    console.log(`[RepositorySelector] Mergeando ${dbmlTables.length} tablas DBML con ${configTables.length} tablas del config`);
    
    return dbmlTables.map(dbmlTable => {
      // Buscar tabla correspondiente en el config por ID o nombre
      const configTable = configTables.find(ct => 
        ct.id === dbmlTable.id || ct.name === dbmlTable.name
      );

      if (configTable) {
        // Mergear propiedades de posición y visualización
        const mergedTable = {
          ...dbmlTable,
          // Aplicar propiedades de posición del config
          x: configTable.x !== undefined ? configTable.x : dbmlTable.x,
          y: configTable.y !== undefined ? configTable.y : dbmlTable.y,
          // Aplicar propiedades visuales si existen
          ...(configTable.color && { color: configTable.color }),
          ...(configTable.locked !== undefined && { locked: configTable.locked }),
          ...(configTable.comment && { comment: configTable.comment })
        };
        
        console.log(`[RepositorySelector]   ✓ Tabla "${dbmlTable.name}": x=${mergedTable.x}, y=${mergedTable.y}`);
        return mergedTable;
      } else {
        console.warn(`[RepositorySelector]   ⚠ Tabla "${dbmlTable.name}" no encontrada en config, mantiene posición por defecto`);
        return dbmlTable;
      }
    });
  };

  const handleImport = async () => {
    // Validar según el tipo de acción
    if (!selectedRepo) {
      Toast.error({
        content: 'Por favor selecciona un repositorio',
        duration: 3
      });
      return;
    }

    // Si es modo "Nuevo"
    if (selectedFile === 'NEW') {
      const fileName = newFileName.trim();
      if (!fileName) {
        Toast.error({
          content: 'Por favor ingresa un nombre para el archivo',
          duration: 3
        });
        return;
      }
      
      // Agregar extensión si no la tiene
      const dbmlFileName = fileName.endsWith('.dbml') ? fileName : fileName + '.dbml';
      const repo = enabledRepos.find(r => r.id === selectedRepo);
      
      // Guardar información para el commit
      console.log(`[RepositorySelector] Confirmando nombre para nuevo archivo: ${dbmlFileName}`);
      setSourceInfo({
        repoId: selectedRepo,
        filePath: dbmlFileName,
        owner: repo?.owner,
        repo: repo?.name,
        branch: repo?.branch,
        isNew: true
      });
      
      // NO limpiar canvas aquí - ya fue limpiado cuando se seleccionó "Nuevo"
      // El usuario ya debería haber dibujado las tablas en el canvas
      
      Toast.success({
        content: `Nuevo diagrama preparado: ${dbmlFileName}. Ahora puedes dibujar las tablas y guardar.`,
        duration: 3
      });
      return;
    }

    // Si es modo "Importar archivo existente"
    const filePathToImport = manualFilePath.trim() || selectedFile;
    if (!filePathToImport) {
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
          branch: repo?.branch,
          isNew: false
        });
        
        // Intentar cargar la configuración del repositorio
        try {
          const configFileName = filePathToImport.replace('.dbml', '') + '_config.json';
          console.log(`[RepositorySelector] Buscando configuración: ${configFileName}`);
          
          const config = await dbmlImportService.loadDiagramConfig(
            configFileName,
            {
              owner: repo?.owner,
              repo: repo?.name,
              branch: repo?.branch
            },
            import.meta.env.VITE_GITHUB_TOKEN || ''
          );
          
          if (config) {
            console.log(`[RepositorySelector] ✓ Configuración cargada del repositorio`);
            console.log(`[RepositorySelector] Datos del config:`, {
              tables: config.tables?.length || 0,
              pan: config.pan,
              zoom: config.zoom,
              areas: config.areas?.length || 0,
              notes: config.notes?.length || 0,
              enums: config.enums?.length || 0,
              types: config.types?.length || 0
            });

            // IMPORTANTE: Mergear las propiedades de posición del config con las tablas del DBML
            const tablesWithConfig = mergeTablesWithConfig(diagram.tables || [], config.tables || []);
            
            console.log(`[RepositorySelector] Aplicando configuración del repositorio...`);
            
            // Actualizar tablas con propiedades del config
            setTables(tablesWithConfig);
            
            // Aplicar pan y zoom si están disponibles
            if (config.pan || typeof config.zoom === 'number') {
              const transformUpdate = {};
              
              if (config.pan) {
                console.log(`[RepositorySelector]   Pan: {x: ${config.pan.x}, y: ${config.pan.y}}`);
                transformUpdate.pan = config.pan;
              }
              
              if (typeof config.zoom === 'number') {
                console.log(`[RepositorySelector]   Zoom: ${config.zoom}`);
                transformUpdate.zoom = config.zoom;
              }
              
              setTransform(transformUpdate);
            }
            
            // Aplicar áreas si existen
            if (Array.isArray(config.areas) && config.areas.length > 0) {
              console.log(`[RepositorySelector]   Áreas: ${config.areas.length}`);
              setAreas(config.areas);
            }
            
            // Aplicar notas si existen
            if (Array.isArray(config.notes) && config.notes.length > 0) {
              console.log(`[RepositorySelector]   Notas: ${config.notes.length}`);
              setNotes(config.notes);
            }
            
            // Aplicar enums si existen
            if (Array.isArray(config.enums) && config.enums.length > 0) {
              console.log(`[RepositorySelector]   Enums: ${config.enums.length}`);
              setEnums(config.enums);
            }
            
            // Aplicar tipos si existen
            if (Array.isArray(config.types) && config.types.length > 0) {
              console.log(`[RepositorySelector]   Tipos: ${config.types.length}`);
              setTypes(config.types);
            }
            
            console.log(`[RepositorySelector] ✓ Configuración aplicada completamente`);
          } else {
            console.log(`[RepositorySelector] No hay configuración guardada en el repositorio`);
          }
        } catch (error) {
          console.warn(`[RepositorySelector] Error cargando configuración:`, error.message);
          // Continuar incluso si no hay configuración
        }
        
        Toast.success({
          content: t('dbml_imported_successfully'),
          duration: 3
        });
        
        // No limpiar selección para que el usuario vea qué archivo acaba de importar
        // setSelectedRepo(null);
        // setSelectedFile(null);  ← Comentado: preservar selección
        // setDbmlFiles([]);
        // setManualFilePath('');
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
          {/* Combo de archivos DBML con opción "Nuevo" por defecto */}
          <Select
            placeholder="✨ Nuevo"
            value={selectedFile || 'NEW'}
            defaultValue="NEW"
            onChange={handleFileSelect}
            optionList={[
              { label: '✨ Nuevo', value: 'NEW' },
              ...dbmlFiles.map(f => ({ label: f.name, value: f.path }))
            ]}
            size="small"
            style={{ minWidth: '140px', flex: '0 1 auto' }}
            renderSelectedItem={(optionNode) => {
              if (!selectedFile || selectedFile === 'NEW') return '✨ Nuevo';
              if (!optionNode) return 'Archivo';
              return optionNode.label || optionNode.children;
            }}
          />
          
          {/* Input de nombre - Visible SOLO cuando selectedFile === 'NEW' */}
          {selectedFile === 'NEW' && (
            <>
              <input
                type="text"
                placeholder="nombre_archivo"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newFileName.trim()) {
                    handleImport();
                  }
                }}
                title="Ingresa el nombre sin extensión"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '2px solid #ffd700',
                  fontSize: '12px',
                  minWidth: '140px',
                  flex: '0 1 auto',
                  backgroundColor: '#fffacd'
                }}
              />
            </>
          )}
          
          {/* Input manual - Eliminado */}
          
          {/* Botón de importar - Eliminado (carga automática) */}
        </>
      )}
    </div>
  );
}
