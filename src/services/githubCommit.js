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
   * Obtiene el SHA de un blob usando la API Git de GitHub
   * Esto es más confiable que intentar calcularlo
   * @param {string} owner - Dueño del repo
   * @param {string} repo - Nombre del repo
   * @param {string} filePath - Ruta del archivo
   * @param {string} branch - Rama del repo
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object|null>} {sha, source: 'git-api'} o null si no existe
   */
  async getSHAFromGitAPI(owner, repo, filePath, branch, token) {
    try {
      console.log(`[getSHAFromGitAPI] Buscando SHA para: ${filePath}`);
      
      // Primero obtener la rama para obtener el commit HEAD
      const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
      console.log(`[getSHAFromGitAPI] Obteniendo HEAD de rama...`);
      
      const branchResponse = await fetch(branchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'DrawDB'
        }
      });

      if (!branchResponse.ok) {
        console.warn(`[getSHAFromGitAPI] No se pudo obtener info de rama: ${branchResponse.status}`);
        return null;
      }

      const branchData = await branchResponse.json();
      const commitSha = branchData.commit?.sha;

      if (!commitSha) {
        console.warn(`[getSHAFromGitAPI] No hay commit SHA en rama`);
        return null;
      }

      console.log(`[getSHAFromGitAPI] Commit HEAD: ${commitSha.substring(0, 8)}...`);

      // Obtener el árbol del commit para encontrar el archivo
      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`;
      console.log(`[getSHAFromGitAPI] Obteniendo árbol recursivamente...`);
      
      const treeResponse = await fetch(treeUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'DrawDB'
        }
      });

      if (!treeResponse.ok) {
        console.warn(`[getSHAFromGitAPI] No se pudo obtener árbol: ${treeResponse.status}`);
        return null;
      }

      const treeData = await treeResponse.json();
      console.log(`[getSHAFromGitAPI] Árbol contiene ${treeData.tree?.length || 0} entradas`);
      
      // Buscar el archivo en el árbol
      // El filePath podría venir con diferentes formatos, intentar varias variaciones
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      console.log(`[getSHAFromGitAPI] Buscando archivo: "${normalizedPath}"`);
      
      let fileEntry = treeData.tree?.find(entry => 
        entry.path === normalizedPath && entry.type === 'blob'
      );

      if (!fileEntry) {
        // Si no encontró, listar los primeros 10 archivos para debugging
        console.warn(`[getSHAFromGitAPI] No se encontró "${normalizedPath}"`);
        console.warn(`[getSHAFromGitAPI] Primeros archivos en árbol:`, 
          treeData.tree?.slice(0, 10).map(e => e.path).join(', ')
        );
        
        // Intentar búsqueda parcial (contiene el nombre del archivo)
        const fileName = normalizedPath.split('/').pop();
        const partialMatch = treeData.tree?.find(entry => 
          entry.path.endsWith(fileName) && entry.type === 'blob'
        );
        
        if (partialMatch) {
          console.warn(`[getSHAFromGitAPI] Encontré similar: "${partialMatch.path}"`);
          console.warn(`[getSHAFromGitAPI] Usando ese en lugar del esperado`);
          fileEntry = partialMatch;
        }
      }

      if (fileEntry?.sha) {
        console.log(`[getSHAFromGitAPI] ✓ SHA encontrado vía Git API: ${fileEntry.sha.substring(0, 8)}... (archivo: ${fileEntry.path})`);
        return { sha: fileEntry.sha, source: 'git-api' };
      }

      console.warn(`[getSHAFromGitAPI] Archivo no encontrado en árbol`);
      return null;
    } catch (error) {
      console.error(`[getSHAFromGitAPI] Error:`, error.message);
      return null;
    }
  }

  /**
   * GitHub usa SHA-1 para los blobs
   * @param {string} content - Contenido del archivo
   * @returns {Promise<string>} SHA-1 hash en hexadecimal
   */
  async calculateSHA1(content) {
    try {
      // Verificar que crypto.subtle esté disponible
      if (!globalThis.crypto || !globalThis.crypto.subtle) {
        throw new Error('crypto.subtle no disponible en este navegador');
      }

      // GitHub calcula SHA-1 del contenido del blob
      // Formato: "blob" + length + null byte + content
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(content);
      const length = contentBytes.length;
      const blobHeader = encoder.encode(`blob ${length}\0`);
      
      // Combinar header + contenido
      const data = new Uint8Array(blobHeader.length + contentBytes.length);
      data.set(blobHeader, 0);
      data.set(contentBytes, blobHeader.length);
      
      // Calcular SHA-1 usando cryptographic hashing
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-1', data);
      
      // Convertir ArrayBuffer a hexadecimal
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log(`[calculateSHA1] Contenido: ${length} bytes → SHA-1: ${hashHex.substring(0, 8)}...`);
      return hashHex;
    } catch (error) {
      console.error('[calculateSHA1] Error:', error.message);
      throw new Error(`No se pudo calcular SHA-1: ${error.message}`);
    }
  }

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
      // Agregar ref=branch como parámetro query
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
      
      console.log(`[getFileInfo] Buscando archivo: ${filePath} en rama ${branch}`);
      console.log(`[getFileInfo] URL: ${url}`);
      console.log(`[getFileInfo] Token disponible: ${!!token}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/json',  // Genérico en lugar de vnd.github.v3+json
          'User-Agent': 'DrawDB'
        }
      });

      // IMPORTANTE: Leer el body UNA SOLA VEZ
      let responseText = '';
      try {
        responseText = await response.text();
        console.log(`[getFileInfo] Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}, Body length: ${responseText.length}`);
      } catch (readError) {
        console.error('[getFileInfo] Error leyendo response body:', readError.message);
        throw new Error(`Error leyendo respuesta de GitHub: ${readError.message}`);
      }

      if (response.ok) {
        let data;
        try {
          // Verificar que el Content-Type indica JSON
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('application/json') && responseText.startsWith('{')) {
            console.log(`[getFileInfo] Content-Type no es JSON pero el body parece serlo, intentando parsear`);
          } else if (!contentType.includes('application/json')) {
            console.error(`[getFileInfo] GitHub devolvió ${contentType} en lugar de JSON`);
            console.warn(`[getFileInfo] Intentando request alternativa para obtener metadatos...`);
            
            // GitHub está devolviendo RAW, hacer una request alternativa para obtener JSON
            // Intentar sin el Accept header que causa RAW, o cambiar a uno diferente
            try {
              const metaUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;
              console.log(`[getFileInfo] Haciendo request alternativa...`);
              
              const metaResponse = await fetch(metaUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `token ${token}`,
                  'Accept': 'application/json',
                  'User-Agent': 'DrawDB'
                }
              });

              if (metaResponse.ok) {
                const metaText = await metaResponse.text();
                const metaData = JSON.parse(metaText);
                if (metaData.sha) {
                  console.log(`[getFileInfo] SHA obtenido de request alternativa: ${metaData.sha.substring(0, 8)}...`);
                  return { sha: metaData.sha, exists: true };
                }
              }
              
              // Si tampoco funciona la request alternativa, intentar obtener SHA del Git API
              console.warn(`[getFileInfo] Request alternativa falló, intentando Git API...`);
              try {
                const gitResult = await this.getSHAFromGitAPI(owner, repo, filePath, branch, token);
                if (gitResult?.sha) {
                  console.log(`[getFileInfo] SHA obtenido del Git API: ${gitResult.sha.substring(0, 8)}...`);
                  return { sha: gitResult.sha, exists: true, source: 'git-api' };
                }
              } catch (gitError) {
                console.error(`[getFileInfo] Error obteniendo SHA del Git API: ${gitError.message}`);
              }
              
              // Si todo falló, reportar como archivo nuevo
              console.warn(`[getFileInfo] No se pudo obtener SHA confiable de ninguna fuente, reportando como archivo nuevo`);
              return { exists: false };
            } catch (error) {
              console.error(`[getFileInfo] Error en request alternativa: ${error.message}`);
              
              // Intentar Git API como último recurso
              try {
                const gitResult = await this.getSHAFromGitAPI(owner, repo, filePath, branch, token);
                if (gitResult?.sha) {
                  console.log(`[getFileInfo] SHA obtenido del Git API (a través de catch): ${gitResult.sha.substring(0, 8)}...`);
                  return { sha: gitResult.sha, exists: true, source: 'git-api' };
                }
              } catch (gitError) {
                console.error(`[getFileInfo] Error obteniendo SHA del Git API: ${gitError.message}`);
              }
              
              return { exists: false };
            }
          }
          
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[getFileInfo] Error parseando respuesta JSON:', parseError.message);
          console.error('[getFileInfo] Response text preview:', responseText.substring(0, 300));
          // Si no podemos parsear, asumir que el archivo NO existe para poder crearlo
          console.warn('[getFileInfo] No se pudo parsear respuesta, asumiendo archivo no existe');
          return { exists: false };
        }
        console.log(`[getFileInfo] Archivo encontrado. SHA: ${data.sha?.substring(0, 8)}...`);
        return { sha: data.sha, exists: true };
      } else if (response.status === 404) {
        console.log(`[getFileInfo] Archivo no existe en rama ${branch}, será creado`);
        return { exists: false };
      } else {
        let errorMessage = response.statusText;
        if (responseText) {
          console.log(`[getFileInfo] Response error (${response.status}): ${responseText.substring(0, 200)}`);
          try {
            const error = JSON.parse(responseText);
            errorMessage = error.message || response.statusText;
          } catch {
            // Si no es JSON, usar el texto directamente
            errorMessage = responseText.substring(0, 100);
          }
        }
        throw new Error(`GitHub API error (${response.status}): ${errorMessage}`);
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
      
      // Encodificar contenido a base64 (compatible con UTF-8)
      let encodedContent;
      try {
        // Usar TextEncoder para soportar UTF-8 correctamente
        const encoded = new TextEncoder().encode(content);
        const binaryString = Array.from(encoded).map(byte => String.fromCharCode(byte)).join('');
        encodedContent = btoa(binaryString);
        console.log(`[commitFile] Contenido encodificado. Tamaño original: ${content.length}, base64: ${encodedContent.length}`);
      } catch (error) {
        console.error(`[commitFile] Error codificando contenido:`, error.message);
        throw new Error(`Error codificando contenido: ${error.message}`);
      }
      
      const commitData = {
        message,
        content: encodedContent,
        branch
      };

      // Si el archivo existe, incluir su SHA (requerido para actualizar)
      // Siempre confiar en SHA del Git API o del GitHub API (200 OK)
      if (fileInfo.exists && fileInfo.sha) {
        commitData.sha = fileInfo.sha;
        const source = fileInfo.source || 'desconocida';
        console.log(`[commitFile] Archivo existente encontrado (origen SHA: ${source}). SHA: ${fileInfo.sha.substring(0, 8)}...`);
      } else if (fileInfo.exists) {
        // Existe pero no hay SHA - esto es un problema
        console.warn(`[commitFile] ⚠️ ADVERTENCIA: Archivo existe pero sin SHA disponible`);
        console.warn(`[commitFile] GitHub probablemente rechazará este commit con error 422`);
      } else {
        console.log(`[commitFile] Archivo nuevo, será creado`);
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      
      console.log(`[commitFile] Enviando request a GitHub API...`);
      console.log(`[commitFile] URL: ${url}`);
      console.log(`[commitFile] Token disponible: ${!!token}`);
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

      // IMPORTANTE: Leer el body UNA SOLA VEZ antes de todo lo demás
      let responseText = '';
      try {
        responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';
        console.log(`[commitFile] Response status: ${response.status}, Content-Type: ${contentType}, body length: ${responseText.length}`);
      } catch (readError) {
        console.error('[commitFile] Error leyendo response body:', readError.message);
        throw new Error(`Error leyendo respuesta de GitHub: ${readError.message}`);
      }

      // Ahora procesar según el status
      if (!response.ok) {
        let errorMessage = response.statusText;
        
        if (responseText) {
          console.log(`[commitFile] Response error (status ${response.status}): ${responseText.substring(0, 200)}`);
          // Intentar parsear como JSON
          try {
            const error = JSON.parse(responseText);
            errorMessage = error.message || error.errors?.[0]?.message || response.statusText;
          } catch {
            // No es JSON, usar el texto directamente
            errorMessage = responseText.substring(0, 100);
          }
        }
        
        console.error('[commitFile] Error en respuesta GitHub API:', errorMessage);
        
        // Manejar errores específicos
        if (response.status === 409) {
          // Conflict - el SHA no coincide o el archivo ya existe
          console.error('[commitFile] Error 409: Conflicto al actualizar archivo');
          console.error('[commitFile] El SHA está desactualizado. Obteniendo SHA actual y reintentando...');
          
          try {
            // Intentar obtener el SHA actual directamente de GitHub API (no usar Git API que puede estar desactualizada)
            console.log('[commitFile] Obteniendo SHA actual del archivo...');
            const freshUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
            const freshResponse = await fetch(freshUrl, {
              method: 'GET',
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'DrawDB'
              }
            });

            if (freshResponse.ok) {
              const freshText = await freshResponse.text();
              const freshData = JSON.parse(freshText);
              
              if (freshData.sha) {
                console.log(`[commitFile] ✓ SHA actual obtenido: ${freshData.sha.substring(0, 8)}...`);
                console.log(`[commitFile] Reintentando commit con SHA actualizado...`);
                
                // Reintentar con el nuevo SHA
                const retryData = {
                  message,
                  content: encodedContent,
                  branch,
                  sha: freshData.sha  // SHA actualizado
                };

                const retryResponse = await fetch(freshUrl, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'DrawDB',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(retryData)
                });

                if (retryResponse.ok) {
                  console.log(`[commitFile] ✓ Reintento exitoso tras 409`);
                  const retryText = await retryResponse.text();
                  const retryResult = JSON.parse(retryText);
                  
                  return {
                    success: true,
                    sha: retryResult.commit?.sha || freshData.sha,
                    url: retryResult.commit?.html_url || 'unknown',
                    message: 'Reintento exitoso después de conflicto'
                  };
                } else {
                  console.error(`[commitFile] Reintento falló con status ${retryResponse.status}`);
                  const retryText = await retryResponse.text();
                  try {
                    const retryError = JSON.parse(retryText);
                    throw new Error(retryError.message || retryText);
                  } catch {
                    throw new Error(retryText);
                  }
                }
              }
            }
          } catch (retryError) {
            console.error(`[commitFile] No se pudo resolver el conflicto: ${retryError.message}`);
          }
          
          // Si el reintento falló, lanzar el error original
          throw new Error(`Conflicto en GitHub (409): ${errorMessage}. Intenta recargar la página y vuelve a intentar.`);
        } else if (response.status === 422) {
          // Unprocessable Entity - típicamente falta el SHA o es inválido
          console.error('[commitFile] Error 422: Parámetros inválidos');
          throw new Error(`Error en GitHub (422): ${errorMessage}`);
        }
        
        throw new Error(`GitHub API error (${response.status}): ${errorMessage}`);
      }

      // Procesar respuesta exitosa
      let result;
      try {
        if (!responseText) {
          console.warn('[commitFile] Respuesta vacía de GitHub, pero status OK');
          return {
            success: true,
            sha: 'unknown',
            url: 'unknown',
            message: 'Commit completado pero GitHub devolvió respuesta vacía'
          };
        }
        
        // Verificar que es JSON antes de parsear
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json') && !responseText.startsWith('{')) {
          console.error('[commitFile] GitHub devolvió contenido no-JSON:', responseText.substring(0, 200));
          throw new Error(`GitHub devolvió ${contentType} en lugar de JSON. Posible error: archivo muy grande o rama no encontrada`);
        }
        
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[commitFile] Error parseando respuesta JSON:', parseError.message);
        console.error('[commitFile] Response text:', responseText.substring(0, 300));
        throw new Error(`Error parseando respuesta de GitHub: ${parseError.message}`);
      }

      console.log(`[commitFile] ✓ Commit completado`);
      if (result.commit?.sha) {
        console.log(`  Commit SHA: ${result.commit.sha}`);
      }
      if (result.commit?.html_url) {
        console.log(`  URL: ${result.commit.html_url}`);
      }

      return {
        success: true,
        sha: result.commit?.sha || 'unknown',
        url: result.commit?.html_url || 'unknown',
        message: result.commit?.message || 'Commit completado'
      };
    } catch (error) {
      console.error(`[commitFile] ✗ Error:`, error.message);
      throw new Error(`Error haciendo commit: ${error.message}`);
    }
  }

  /**
   * Descarga la configuración del diagrama desde el repositorio
   * @param {string} configFileName - Nombre del archivo config (ej: prueba_config.json)
   * @param {Object} sourceInfo - {owner, repo, branch}
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object|null>} Configuración del diagrama o null si no existe
   */
  async loadConfigFromRepo(configFileName, sourceInfo, token) {
    try {
      const url = `https://api.github.com/repos/${sourceInfo.owner}/${sourceInfo.repo}/contents/${configFileName}`;
      
      console.log(`[loadConfigFromRepo] Cargando: ${configFileName}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'DrawDB'
        }
      });

      if (response.ok) {
        const content = await response.text();
        const config = JSON.parse(content);
        console.log(`[loadConfigFromRepo] ✓ Configuración cargada`);
        return config;
      } else if (response.status === 404) {
        console.log(`[loadConfigFromRepo] Archivo de configuración no existe`);
        return null;
      } else {
        throw new Error(`Error: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[loadConfigFromRepo] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Guarda el diagrama actual al repositorio desde el que fue importado
   * @param {Object} diagram - Objeto con tablas y relaciones
   * @param {Object} diagramConfig - Configuración completa del diagrama desde IndexedDB
   * @param {Object} sourceInfo - {repoId, filePath, owner, repo, branch}
   * @param {string} token - Token de GitHub
   * @returns {Promise<Object>} Resultado del commit
   */
  async saveDiagramToRepo(diagram, diagramConfig, sourceInfo, token) {
    try {
      if (!sourceInfo || !sourceInfo.repoId) {
        throw new Error('Diagrama no fue importado desde un repositorio. Primero importa un DBML desde GitHub.');
      }

      console.log(`[saveDiagramToRepo] Guardando diagrama y configuración a repositorio...`);
      console.log(`[saveDiagramToRepo] sourceInfo:`, {
        repoId: sourceInfo.repoId,
        filePath: sourceInfo.filePath,
        owner: sourceInfo.owner,
        repo: sourceInfo.repo,
        branch: sourceInfo.branch
      });
      
      // Convertir diagrama a DBML
      console.log(`[saveDiagramToRepo] Convirtiendo diagrama a DBML...`);
      let dbmlContent;
      try {
        dbmlContent = toDBML(diagram);
        console.log(`[saveDiagramToRepo] DBML generado. Tamaño: ${dbmlContent.length} bytes`);
        
        // Validar que es string válido
        if (typeof dbmlContent !== 'string' || dbmlContent.length === 0) {
          throw new Error(`DBML generado no válido: tipo=${typeof dbmlContent}, longitud=${dbmlContent?.length}`);
        }
      } catch (error) {
        console.error(`[saveDiagramToRepo] Error generando DBML:`, error.message);
        throw error;
      }
      
      // Guardar DBML
      console.log(`[saveDiagramToRepo] Guardando DBML a ${sourceInfo.filePath}...`);
      let result;
      try {
        result = await this.commitFile({
          owner: sourceInfo.owner,
          repo: sourceInfo.repo,
          filePath: sourceInfo.filePath,
          branch: sourceInfo.branch,
          content: dbmlContent,
          message: `[DrawDB] Updated diagram - ${new Date().toLocaleString()}`,
          token
        });
        console.log(`[saveDiagramToRepo] ✓ DBML guardado`);
      } catch (error) {
        console.error(`[saveDiagramToRepo] ✗ Error guardando DBML:`, error.message);
        throw error;
      }

      // Pequeño delay para evitar rate limiting de GitHub
      console.log(`[saveDiagramToRepo] Esperando antes de guardar configuración...`);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Guardar configuración
      console.log(`[saveDiagramToRepo] Guardando configuración...`);
      const configFileName = sourceInfo.filePath.replace('.dbml', '') + '_config.json';
      
      // Sanitizar la configuración para asegurar que es JSON-serializable
      const cleanConfig = {
        database: diagramConfig.database,
        name: diagramConfig.name,
        tables: Array.isArray(diagramConfig.tables) ? diagramConfig.tables : [],
        relationships: Array.isArray(diagramConfig.relationships) ? diagramConfig.relationships : [],
        notes: Array.isArray(diagramConfig.notes) ? diagramConfig.notes : [],
        areas: Array.isArray(diagramConfig.areas) ? diagramConfig.areas : [],
        pan: diagramConfig.pan || { x: 0, y: 0 },
        zoom: typeof diagramConfig.zoom === 'number' ? diagramConfig.zoom : 1,
        enums: Array.isArray(diagramConfig.enums) ? diagramConfig.enums : [],
        types: Array.isArray(diagramConfig.types) ? diagramConfig.types : []
      };
      
      let configContent;
      try {
        configContent = JSON.stringify(cleanConfig, null, 2);
        console.log(`[saveDiagramToRepo] Configuración serializada. Tamaño: ${configContent.length} bytes`);
      } catch (error) {
        console.error(`[saveDiagramToRepo] Error serializando config:`, error.message);
        throw error;
      }
      
      try {
        await this.commitFile({
          owner: sourceInfo.owner,
          repo: sourceInfo.repo,
          filePath: configFileName,
          branch: sourceInfo.branch,
          content: configContent,
          message: `[DrawDB] Updated diagram config - ${new Date().toLocaleString()}`,
          token
        });
        console.log(`[saveDiagramToRepo] ✓ Configuración guardada`);
      } catch (error) {
        console.error(`[saveDiagramToRepo] ✗ Error guardando configuración:`, error.message);
        throw error;
      }

      console.log(`[saveDiagramToRepo] ✓ Diagrama y configuración guardados exitosamente`);
      return result;
    } catch (error) {
      console.error(`[saveDiagramToRepo] ✗ Error final:`, error.message);
      throw error;
    }
  }
}

export default new GitHubCommitService();
