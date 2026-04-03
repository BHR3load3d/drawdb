/**
 * Hook para guardar diagramas al repositorio
 */

import { useState } from 'react';
import { Toast } from '@douyinfe/semi-ui';
import githubCommitService from '../services/githubCommit';
import { toDBML } from '../utils/exportAs/dbml';

export function useSaveToGitHub() {
  const [isSaving, setIsSaving] = useState(false);

  const saveToRepository = async (diagram, sourceInfo, token) => {
    if (!sourceInfo || !sourceInfo.repoId) {
      Toast.error({
        content: 'Este diagrama no fue importado desde un repositorio. Primero importa un DBML desde GitHub.',
        duration: 3
      });
      return false;
    }

    setIsSaving(true);
    try {
      console.log('[useSaveToGitHub] Iniciando guardado al repositorio...');
      
      const result = await githubCommitService.saveDiagramToRepo(
        diagram,
        sourceInfo,
        token
      );

      Toast.success({
        content: `Diagrama guardado en ${sourceInfo.repo}/${sourceInfo.filePath}`,
        duration: 3
      });

      console.log('[useSaveToGitHub] ✓ Diagrama guardado exitosamente');
      return true;
    } catch (error) {
      console.error('[useSaveToGitHub] Error:', error.message);
      Toast.error({
        content: `Error al guardar: ${error.message}`,
        duration: 3
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveToRepository, isSaving };
}
