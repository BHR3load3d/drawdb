/**
 * Hook para guardar diagramas al repositorio
 */

import { useState } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import githubCommitService from '../services/githubCommit';
import { toDBML } from '../utils/exportAs/dbml';

export function useSaveToGitHub() {
  const [isSaving, setIsSaving] = useState(false);

  const saveToRepository = async (diagram, diagramConfig, sourceInfo, token, setSourceInfo = null) => {
    // Validación: si es un archivo nuevo, debe tener un filePath válido
    if (sourceInfo?.isNew && !sourceInfo.filePath) {
      Toast.error({
        content: 'Por favor especifica el nombre del archivo para el nuevo diagrama.',
        duration: 3
      });
      return { success: false, isNew: false };
    }

    if (!sourceInfo || !sourceInfo.repoId) {
      Toast.error({
        content: 'Este diagrama no fue importado desde un repositorio. Primero importa un DBML desde GitHub.',
        duration: 3
      });
      return { success: false, isNew: false };
    }

    setIsSaving(true);
    const wasNew = sourceInfo.isNew || false;
    
    try {
      console.log('[useSaveToGitHub] Iniciando guardado al repositorio...');
      console.log(`[useSaveToGitHub] isNew: ${sourceInfo.isNew || false}`);
      
      const result = await githubCommitService.saveDiagramToRepo(
        diagram,
        diagramConfig,
        sourceInfo,
        token
      );

      const displayPath = sourceInfo.filePath || 'diagrama.dbml';
      Toast.success({
        content: `Diagrama guardado en ${sourceInfo.repo}/${displayPath}`,
        duration: 3
      });

      // Si era un nuevo archivo, actualizar sourceInfo.isNew a false
      if (wasNew && setSourceInfo) {
        setSourceInfo({
          ...sourceInfo,
          isNew: false
        });
      }

      console.log('[useSaveToGitHub] ✓ Diagrama guardado exitosamente');
      return { success: true, isNew: wasNew, filePath: sourceInfo.filePath };
    } catch (error) {
      console.error('[useSaveToGitHub] Error:', error.message);
      Toast.error({
        content: `Error al guardar: ${error.message}`,
        duration: 3
      });
      return { success: false, isNew: false };
    } finally {
      setIsSaving(false);
    }
  };

  return { saveToRepository, isSaving };
}
