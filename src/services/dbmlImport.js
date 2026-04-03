/**
 * DBML Import Service
 * 
 * Servicio para importar archivos DBML desde repositorios GitHub
 * y convertirlos en diagramas de DrawDB
 * 
 * @module services/dbmlImport
 */

import { nanoid } from 'nanoid';
import repositoryManagementService from './repositoryManagement';
import { fromDBML } from '../utils/importFrom/dbml';

/**
 * Servicio para importar DBML desde GitHub
 */
class DBMLImportService {
  /**
   * Verifica la conexión con GitHub y obtiene información del repo
   * Útil para diagnosticar problemas de autenticación
   * @param {string} repoId - ID del repositorio
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} Info del repo de GitHub
   */
  async verifyRepositoryConnection(repoId, token) {
    try {
      const repo = repositoryManagementService.getRepository(repoId);
      if (!repo) {
        throw new Error('Repositorio no encontrado en la app');
      }

      console.log(`\n${'='.repeat(70)}`);
      console.log(`[verifyRepositoryConnection] DIAGNÓSTICO DE CONEXIÓN`);
      console.log(`${'='.repeat(70)}`);
      console.log(`Repo guardado: ${repo.owner}/${repo.name}`);
      console.log(`Rama guardada: ${repo.branch}`);
      console.log(`Token presente: ${!!token}`);

      // 1. Verificar que el repo existe
      const repoUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}`;
      console.log(`\n[1] Verificando existencia del repo...`);
      console.log(`    URL: ${repoUrl}`);

      const repoResponse = await fetch(repoUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DrawDB'
        }
      });

      console.log(`    Respuesta: ${repoResponse.status}`);

      if (!repoResponse.ok) {
        const errorData = await repoResponse.json();
        console.error(`    ✗ Error:`, errorData.message);
        throw new Error(`Repo no accessible: ${repoResponse.status} - ${errorData.message}`);
      }

      const repoData = await repoResponse.json();
      console.log(`    ✓ Repo encontrado`);
      console.log(`    Rama default en GitHub: ${repoData.default_branch}`);
      console.log(`    Es privado: ${repoData.private}`);
      console.log(`    Descripción: ${repoData.description}`);

      // 2. Verificar la rama específica
      const actualBranch = repoData.default_branch;
      console.log(`\n[2] Verificando rama...`);
      console.log(`    Rama guardada: ${repo.branch}`);
      console.log(`    Rama en GitHub: ${actualBranch}`);
      
      if (repo.branch.toLowerCase() !== actualBranch.toLowerCase()) {
        console.warn(`    ⚠ ALERTA: Las ramas no coinciden (case-sensitive)`);
      }

      // 3. Verificar acceso a tree API con la rama correcta
      const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/git/trees/${actualBranch}?recursive=1`;
      console.log(`\n[3] Probando Tree API con rama correcta...`);
      console.log(`    URL: ${treeUrl}`);

      const treeResponse = await fetch(treeUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DrawDB'
        }
      });

      console.log(`    Respuesta: ${treeResponse.status}`);

      if (treeResponse.ok) {
        const treeData = await treeResponse.json();
        console.log(`    ✓ Tree API funciona`);
        console.log(`    Total items: ${treeData.tree?.length || 0}`);

        // Buscar archivos DBML/SQL
        const dbmlFiles = treeData.tree.filter(item => 
          item.type === 'blob' && 
          (item.path.endsWith('.dbml') || item.path.endsWith('.sql'))
        );
        console.log(`    Archivos DBML/SQL encontrados: ${dbmlFiles.length}`);
        if (dbmlFiles.length > 0) {
          console.log(`    Primeros 5:`, dbmlFiles.slice(0, 5).map(f => f.path).join(', '));
        }
      } else {
        const errorData = await treeResponse.json().catch(() => ({}));
        console.error(`    ✗ Tree API error:`, errorData.message || treeResponse.statusText);
      }

      console.log(`${'='.repeat(70)}\n`);

      return {
        success: true,
        repoData,
        actualBranch,
        branchMismatch: repo.branch.toLowerCase() !== actualBranch.toLowerCase()
      };
    } catch (error) {
      console.error(`[verifyRepositoryConnection] Error:`, error.message);
      console.log(`${'='.repeat(70)}\n`);
      throw error;
    }
  }

  /**
   * Busca archivos DBML en un repositorio
   * @param {string} repoId - ID del repositorio
   * @param {string} token - Token de GitHub
   * @param {Array} patterns - Patrones de búsqueda (por defecto busca .dbml)
   * @returns {Promise<Array>} Lista de archivos encontrados
   */
  async findDBMLFiles(repoId, token, patterns = ['*.dbml', '**/*.dbml']) {
    try {
      const repo = repositoryManagementService.getRepository(repoId);
      if (!repo) {
        throw new Error('Repositorio no encontrado');
      }

      console.log(`[findDBMLFiles] Buscando archivos DBML en: ${repo.owner}/${repo.name} (rama: ${repo.branch})`);

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
          console.log(`[findDBMLFiles] Rama corregida: ${repo.branch} → ${actualBranch}`);
        }
      } catch (err) {
        console.warn(`[findDBMLFiles] No se pudo obtener rama correcta, usando: ${repo.branch}`);
      }

      const foundFiles = [];

      // Intentar usar GitHub Tree API para búsqueda más exhaustiva
      try {
        const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/git/trees/${actualBranch}?recursive=1`;
        console.log(`[findDBMLFiles] Llamando Tree API: ${treeUrl}`);
        
        const treeResponse = await fetch(treeUrl, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DrawDB'
          }
        });

        console.log(`[findDBMLFiles] Tree API responde: ${treeResponse.status}`);

        if (treeResponse.ok) {
          const treeData = await treeResponse.json();
          console.log(`[findDBMLFiles] Tree API retorna ${treeData.tree?.length || 0} items`);
          
          if (treeData.tree && Array.isArray(treeData.tree)) {
            treeData.tree.forEach(item => {
              if ((item.path.endsWith('.dbml') || item.path.endsWith('.sql')) && item.type === 'blob') {
                console.log(`[findDBMLFiles] Encontrado: ${item.path}`);
                foundFiles.push({
                  name: item.path.split('/').pop(),
                  path: item.path,
                  fullPath: item.path,
                  type: item.type,
                  url: `https://github.com/${repo.owner}/${repo.name}/blob/${repo.branch}/${item.path}`,
                  downloadUrl: `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.branch}/${item.path}`
                });
              }
            });
          }
        } else {
          console.warn(`[findDBMLFiles] Tree API falló con status ${treeResponse.status}`);
        }
      } catch (treeError) {
        // Si Tree API falla, usar búsqueda en directorios comunes como fallback
        console.warn('[findDBMLFiles] Tree API error, usando busqueda por directorio:', treeError);
        
        const searchPaths = [
          '.',
          'schemas',
          'database',
          'db',
          'models',
          'sql',
          'dbml',
          'src',
          'src/schemas',
          'src/database',
          'docs',
          'data',
          'config',
          'migrations',
          '.github'
        ];

        for (const path of searchPaths) {
          try {
            const contentsUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${path}?ref=${repo.branch}`;
            console.log(`[findDBMLFiles] Buscando en directorio: ${path}`);
            
            const response = await fetch(contentsUrl, {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'DrawDB'
              }
            });

            if (response.ok) {
              const contents = await response.json();
              console.log(`[findDBMLFiles] Directorio ${path} contiene ${Array.isArray(contents) ? contents.length : 0} items`);

              if (Array.isArray(contents)) {
                contents.forEach(item => {
                  if ((item.name.endsWith('.dbml') || item.name.endsWith('.sql')) && item.type === 'file') {
                    // Evitar duplicados
                    if (!foundFiles.find(f => f.path === item.path)) {
                      console.log(`[findDBMLFiles] Encontrado en ${path}: ${item.name}`);
                      foundFiles.push({
                        name: item.name,
                        path: item.path,
                        fullPath: item.path,
                        type: item.type,
                        url: item.html_url,
                        downloadUrl: item.download_url
                      });
                    }
                  }
                });
              }
            } else {
              console.log(`[findDBMLFiles] Directorio ${path} no existe o no accesible (${response.status})`);
            }
          } catch (error) {
            // Continuar buscando en otros directorios
            console.log(`[findDBMLFiles] Error buscando en ${path}: ${error.message}`);
            continue;
          }
        }
      }

      console.log(`[findDBMLFiles] Búsqueda completada. Total archivos encontrados: ${foundFiles.length}`);
      return foundFiles;
    } catch (error) {
      throw new Error(`Error buscando archivos DBML: ${error.message}`);
    }
  }

  /**
   * Descarga y parsea un archivo DBML desde GitHub
   * @param {string} repoId - ID del repositorio
   * @param {string} filePath - Ruta del archivo (puede ser solo el nombre)
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} { content: string, name: string, size: number }
   */
  async downloadDBMLFile(repoId, filePath, token) {
    try {
      const repo = repositoryManagementService.getRepository(repoId);
      if (!repo) {
        throw new Error('Repositorio no encontrado');
      }

      console.log(`[downloadDBMLFile] Descargando: repo=${repo.owner}/${repo.name}, rama=${repo.branch}, archivo=${filePath}`);

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
          console.log(`[downloadDBMLFile] Rama corregida: ${repo.branch} → ${actualBranch}`);
        }
      } catch (err) {
        console.warn(`[downloadDBMLFile] No se pudo obtener rama correcta, usando: ${repo.branch}`);
      }

      let content = null;
      let actualPath = filePath;

      // Si solo es un nombre de archivo (sin /), buscar en el árbol del repo
      if (!filePath.includes('/')) {
        console.log(`[downloadDBMLFile] Archivo sin ruta detectado. Buscando "${filePath}" en árbol del repo`);
        try {
          const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.name}/git/trees/${actualBranch}?recursive=1`;
          const treeResponse = await fetch(treeUrl, {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'DrawDB'
            }
          });

          console.log(`[downloadDBMLFile] Tree API responde: ${treeResponse.status}`);

          if (treeResponse.ok) {
            const treeData = await treeResponse.json();
            console.log(`[downloadDBMLFile] Árbol contiene ${treeData.tree?.length || 0} items`);
            
            if (treeData.tree && Array.isArray(treeData.tree)) {
              // Buscar exactamente o por coincidencia de nombre
              const foundFile = treeData.tree.find(item => 
                item.type === 'blob' && 
                (item.path === filePath || item.path.endsWith(`/${filePath}`))
              );

              if (foundFile) {
                actualPath = foundFile.path;
                console.log(`[downloadDBMLFile] ✓ Archivo encontrado en: ${actualPath}`);
              } else {
                console.log(`[downloadDBMLFile] ✗ No se encontró "${filePath}" en el árbol`);
                // Listar los 10 primeros archivos .dbml para ayudar al debug
                const dbmlFiles = treeData.tree.filter(item => item.path.endsWith('.dbml')).slice(0, 10);
                if (dbmlFiles.length > 0) {
                  console.log(`[downloadDBMLFile] Archivos .dbml disponibles:`, dbmlFiles.map(f => f.path).join(', '));
                }
              }
            }
          } else {
            console.warn(`[downloadDBMLFile] Tree API retorna error: ${treeResponse.status}`);
          }
        } catch (searchErr) {
          console.warn(`[downloadDBMLFile] Error buscando en árbol:`, searchErr);
        }
      }

      // Intentar descargar usando el servicio de repositoryManagement
      try {
        console.log(`[downloadDBMLFile] Intentando descargar via Contents API: ${actualPath}`);
        const result = await repositoryManagementService.findFileInRepository(repoId, actualPath, token);

        if (result.found) {
          console.log(`[downloadDBMLFile] ✓ Contenido descargado via Contents API`);
          content = result.content;
        } else {
          console.log(`[downloadDBMLFile] Contents API falló: ${result.error}`);
        }
      } catch (err) {
        console.warn(`[downloadDBMLFile] Error en Contents API:`, err.message);
      }

      // Si no pudo descargar con el método anterior, intentar directamente desde GitHub
      if (!content) {
        const downloadUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${actualBranch}/${actualPath}`;
        
        console.log(`[downloadDBMLFile] Intentando descarga directa (raw.githubusercontent.com): ${downloadUrl}`);
        
        const response = await fetch(downloadUrl, {
          headers: token ? { 'Authorization': `token ${token}` } : {}
        });

        console.log(`[downloadDBMLFile] Descarga directa responde: ${response.status}`);

        if (!response.ok) {
          throw new Error(`Archivo no encontrado en "${actualPath}" (${response.status} ${response.statusText}). Verificar que repo=${repo.owner}/${repo.name}, rama=${actualBranch}, ruta=${actualPath}`);
        }

        content = await response.text();
        console.log(`[downloadDBMLFile] ✓ Contenido descargado (${content.length} bytes)`);
      }

      if (!content) {
        throw new Error('No se pudo descargar el contenido del archivo');
      }

      console.log(`[downloadDBMLFile] ✓ Descarga completada exitosamente`);
      return {
        content: content,
        name: actualPath.split('/').pop(),
        path: actualPath,
        size: content.length
      };
    } catch (error) {
      console.error(`[downloadDBMLFile] ✗ Error fatal:`, error.message);
      throw new Error(`Error descargando archivo DBML: ${error.message}`);
    }
  }

  /**
   * Convierte DBML a esquema de DrawDB
   * Usa el parser oficial @dbml/core para máxima compatibilidad
   * 
   * @param {string} dbmlContent - Contenido DBML
   * @returns {Object} Esquema en formato DrawDB
   */
  parseDBML(dbmlContent) {
    try {
      const diagram = fromDBML(dbmlContent);
      return diagram;
    } catch (error) {
      console.error(`[parseDBML] Error:`, error.message);
      throw new Error(`Error parseando DBML: ${error.message}`);
    }
  }

  /**
   * Asegura que el diagrama tenga todos los campos requeridos por DrawDB
   * @param {Object} diagram - Diagrama parseado
   * @returns {Object} Diagrama con campos garantizados
   */
  ensureDiagramComplete(diagram) {
    // Garantizar que todas las tablas tengan los atributos requeridos
    const completeTables = (diagram.tables || []).map(table => ({
      id: table.id,
      name: table.name,
      x: table.x ?? 0,
      y: table.y ?? 0,
      locked: table.locked ?? false,
      fields: (table.fields || []).map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        default: field.default ?? '',
        check: field.check ?? '',
        primary: field.primary ?? false,
        unique: field.unique ?? false,
        unsigned: field.unsigned ?? false,
        notNull: field.notNull ?? false,
        increment: field.increment ?? false,
        comment: field.comment ?? ''
      })),
      comment: table.comment ?? '',
      indices: (table.indices || []).map(idx => ({
        id: idx.id,
        fields: idx.fields || [],
        name: idx.name || '',
        unique: idx.unique ?? false
      })),
      color: table.color ?? '#175e7a'
    }));
    
    return {
      tables: completeTables,
      relationships: diagram.relationships || [],
      areas: diagram.areas || [],
      notes: diagram.notes || [],
      types: diagram.types || [],
      enums: diagram.enums || []
    };
  }

  /**
   * Importa un archivo DBML completo desde GitHub
   * @param {string} repoId - ID del repositorio
   * @param {string} filePath - Ruta del archivo
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} Diagrama en formato DrawDB
   */
  async importDBMLFromRepo(repoId, filePath, token) {
    try {
      // Descargar archivo
      const file = await this.downloadDBMLFile(repoId, filePath, token);

      // Parsear DBML
      const diagram = this.parseDBML(file.content);

      // Garantizar estructura completa
      const completeDiagram = this.ensureDiagramComplete(diagram);

      // Obtener metadata del repo
      const repo = repositoryManagementService.getRepository(repoId);

      const result = {
        id: `dbml_${Date.now()}`,
        name: `${file.name.replace('.dbml', '')} (${repo.name})`,
        description: `Importado desde ${repo.url}`,
        source: {
          type: 'github',
          repoId,
          filePath,
          owner: repo.owner,
          repo: repo.name,
          branch: repo.branch,
          url: `${repo.url}/blob/${repo.branch}/${filePath}`
        },
        ...completeDiagram,
        importedAt: new Date().toISOString()
      };

      console.log(`[importDBMLFromRepo] ✓ Importado: ${result.tables.length} tablas, ${result.relationships.length} relaciones`);
      return result;
    } catch (error) {
      console.error(`[importDBMLFromRepo] ✗ Error:`, error.message);
      throw new Error(`Error importando DBML: ${error.message}`);
    }
  }

  /**
   * Lista todos los archivos DBML disponibles en un repo
   * @param {string} repoId - ID del repositorio
   * @param {string} token - Token de GitHub
   * @returns {Promise<Array>} Lista de archivos DBML
   */
  async listAvailableDBMLFiles(repoId, token) {
    try {
      const files = await this.findDBMLFiles(repoId, token);
      return files.filter(f => f.name.endsWith('.dbml') || f.name.endsWith('.sql'));
    } catch (error) {
      throw new Error(`Error listando archivos DBML: ${error.message}`);
    }
  }

  /**
   * Sincroniza archivos DBML desde un repositorio
   * Descarga todos los archivos DBML y los retorna
   * 
   * @param {string} repoId - ID del repositorio
   * @param {string} token - Token de GitHub
   * @returns {Promise<Array>} Array de diagramas importados
   */
  async syncDBMLFromRepository(repoId, token) {
    try {
      const files = await this.listAvailableDBMLFiles(repoId, token);
      const diagrams = [];

      for (const file of files) {
        try {
          const diagram = await this.importDBMLFromRepo(repoId, file.path, token);
          diagrams.push(diagram);
        } catch (error) {
          console.warn(`Error importando ${file.path}:`, error.message);
        }
      }

      return diagrams;
    } catch (error) {
      throw new Error(`Error sincronizando DBML: ${error.message}`);
    }
  }

  /**
   * Valida si un archivo es DBML válido
   * @param {string} content - Contenido del archivo
   * @returns {boolean} Si es DBML válido
   */
  isValidDBML(content) {
    try {
      // Validaciones básicas
      return (
        typeof content === 'string' &&
        (content.includes('Table') || content.includes('table')) &&
        content.includes('{') &&
        content.includes('}')
      );
    } catch {
      return false;
    }
  }

  /**
   * Valida si un archivo es SQL
   * @param {string} content - Contenido del archivo
   * @returns {boolean} Si es SQL válido
   */
  isValidSQL(content) {
    try {
      const upperContent = content.toUpperCase();
      return (
        typeof content === 'string' &&
        (upperContent.includes('CREATE TABLE') ||
         upperContent.includes('CREATE') ||
         upperContent.includes('TABLE') ||
         upperContent.includes('INSERT') ||
         upperContent.includes('SELECT'))
      );
    } catch {
      return false;
    }
  }

  /**
   * Obtiene los tipos MIME y extensiones soportadas
   * @returns {Object} Tipos soportados
   */
  getSupportedFormats() {
    return {
      dbml: {
        extensions: ['.dbml'],
        mimeTypes: ['text/plain', 'application/json'],
        description: 'DBML (Database Markup Language)'
      },
      sql: {
        extensions: ['.sql'],
        mimeTypes: ['text/plain', 'text/x-sql', 'application/sql'],
        description: 'SQL Scripts'
      }
    };
  }
}

// Crear instancia singleton
export const dbmlImportService = new DBMLImportService();

export default dbmlImportService;
