/**
 * GitHub Commit Service
 * 
 * Servicio para hacer commit de diagramas DBML a repositorios GitHub
 * 
 * @module services/githubCommit
 */

import repositoryManagementService from './repositoryManagement';
import { toDBML } from '../utils/exportAs/dbml';

/**
 * Servicio para hacer commits a GitHub
 */
class GitHubCommitService {
  /**
   * Obtiene el SHA del archivo si existe en GitHub
   * @param {string} owner - Dueño del repo
   * @param {string} repo - Nombre del repo
   * @param {string} filePath - Ruta del archivo
   * @param {string} branch - Rama del repo
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} {sha, exists}
   */
  async getFileInfo(owner, repo, filePath, branch, token) {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DrawDB'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[getFileInfo] Archivo encontrado. SHA: ${data.sha.substring(0, 8)}...`);
        return { sha: data.sha, exists: true };
      } else if (response.status === 404) {
        console.log(`[getFileInfo] Archivo no existe, será creado`);
        return { exists: false };
      } else {
        const error = await response.json();
        throw new Error(`Error obteniendo info del archivo: ${error.message || response.statusText}`);
      }
    } catch (error) {
      console.error('[getFileInfo] Error:', error.message);
      throw error;
    }
  }

  /**
   * Hace commit de un archivo a GitHub
   * @param {Object} options - Opciones del commit
   * @param {string} options.owner - Dueño del repo
   * @param {string} options.repo - Nombre del repo
   * @param {string} options.filePath - Ruta del archivo (ej: diagram.dbml)
   * @param {string} options.branch - Rama destino
   * @param {string} options.content - Contenido del archivo
   * @param {string} options.message - Mensaje de commit
   * @param {string} options.token - Token de GitHub
   * @returns {Promise<Object>} Respuesta del commit
   */
  async commitFile(options) {
    const { owner, repo, filePath, branch, content, message, token } = options;

    try {
      console.log(`[commitFile] Preparando commit...`);
      console.log(`  Repo: ${owner}/${repo}`);
      console.log(`  Rama: ${branch}`);
      console.log(`  Archivo: ${filePath}`);

      // Obtener SHA del archivo actual (si existe)
      const fileInfo = await this.getFileInfo(owner, repo, filePath, branch, token);
      
      const encodedContent = btoa(content); // Base64 encode
      
      const commitData = {
        message,
        content: encodedContent,
        branch
      };

      // Si el archivo existe, incluir su SHA (requerido para actualizar)
      if (fileInfo.exists) {
        commitData.sha = fileInfo.sha;
        console.log(`[commitFile] Archivo existente encontrado. SHA: ${fileInfo.sha.substring(0, 8)}...`);
      } else {
        console.log(`[commitFile] Archivo nuevo, será creado`);
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      console.log(`[commitFile] Enviando request a GitHub API...`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DrawDB',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitData)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[commitFile] Error en respuesta GitHub API:', error);
        throw new Error(`GitHub API error: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      console.log(`[commitFile] ✓ Commit completado`);
      console.log(`  Commit SHA: ${result.commit.sha}`);
      console.log(`  URL: ${result.commit.html_url}`);

      return {
        success: true,
        sha: result.commit.sha,
        url: result.commit.html_url,
        message: result.commit.message
      };
    } catch (error) {
      console.error(`[commitFile] ✗ Error:`, error.message);
      throw new Error(`Error haciendo commit: ${error.message}`);
    }
  }

  /**
   * Guarda el diagrama actual al repositorio desde el que fue importado
   * @param {Object} diagram - Objeto con tablas y relaciones
   * @param {Object} sourceInfo - {repoId, filePath, owner, repo, branch}
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} Resultado del commit
   */
  async saveDiagramToRepo(diagram, sourceInfo, token) {
    try {
      if (!sourceInfo || !sourceInfo.repoId) {
        throw new Error('Diagrama no fue importado desde un repositorio. Primero importa un DBML desde GitHub.');
      }

      console.log(`[saveDiagramToRepo] Guardando diagrama a repositorio...`);
      
      // Convertir diagrama a DBML
      const dbmlContent = toDBML(diagram);
      
      // Hacer commit
      const result = await this.commitFile({
        owner: sourceInfo.owner,
        repo: sourceInfo.repo,
        filePath: sourceInfo.filePath,
        branch: sourceInfo.branch,
        content: dbmlContent,
        message: `[DrawDB] Updated diagram - ${new Date().toLocaleString()}`,
        token
      });

      return result;
    } catch (error) {
      console.error(`[saveDiagramToRepo] ✗ Error:`, error.message);
      throw error;
    }
  }
}

export default new GitHubCommitService();
