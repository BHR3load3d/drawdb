/**
 * DBML Import Component
 * 
 * Componente para importar archivos DBML desde repositorios GitHub
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Select,
  List,
  Empty,
  Banner,
  Spin,
  Modal,
  Space,
  Tag,
  Progress,
  Tooltip
} from '@douyinfe/semi-ui';
import {
  IconDownload,
  IconRefresh,
  IconDelete
} from '@douyinfe/semi-icons';
import useDBMLImport from '../hooks/useDBMLImport';
import useRepositoryManagement from '../hooks/useRepositoryManagement';

/**
 * Componente para importar DBML desde GitHub
 */
export default function DBMLImportComponent({ onImport = null }) {
  const {
    loading,
    error,
    importedDiagrams,
    foundFiles,
    findDBMLFiles,
    importDBML,
    syncRepository,
    clearState
  } = useDBMLImport();

  const {
    repositories
  } = useRepositoryManagement();

  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [token, setToken] = useState(import.meta.env.VITE_GITHUB_TOKEN || '');
  const [importProgress, setImportProgress] = useState(0);
  const [step, setStep] = useState('select'); // 'select' | 'search' | 'import' | 'review'

  // Habilitar repos con sincronización
  const enabledRepos = repositories.filter(r => r.enabled);

  const handleSelectRepository = (value) => {
    setSelectedRepoId(value);
    setSelectedFile(null);
    setFoundFiles([]);
    setStep('select');
  };

  const handleSearchFiles = async () => {
    if (!selectedRepoId) {
      Modal.error({
        title: 'Repositorio requerido',
        content: 'Por favor selecciona un repositorio'
      });
      return;
    }

    if (!token) {
      Modal.error({
        title: 'Token requerido',
        content: 'Por favor configura tu token de GitHub'
      });
      return;
    }

    setStep('search');
    await findDBMLFiles(selectedRepoId, token);
  };

  const handleImportFile = async (filePath) => {
    setSelectedFile(filePath);
    setStep('import');
    setImportProgress(0);

    try {
      const diagram = await importDBML(selectedRepoId, filePath, token);

      if (diagram && onImport) {
        onImport(diagram);
      }

      setImportProgress(100);
      setStep('review');

      Modal.success({
        title: 'Importación exitosa',
        content: `Diagrama "${diagram.name}" importado correctamente`
      });
    } catch (err) {
      Modal.error({
        title: 'Error en importación',
        content: err.message
      });
    }
  };

  const handleSyncAll = async () => {
    if (!selectedRepoId) {
      Modal.error({
        title: 'Repositorio requerido',
        content: 'Por favor selecciona un repositorio'
      });
      return;
    }

    setStep('import');
    setImportProgress(33);

    try {
      const diagrams = await syncRepository(selectedRepoId, token);
      setImportProgress(100);
      setStep('review');

      Modal.success({
        title: 'Sincronización completa',
        content: `Se importaron ${diagrams.length} diagrama(s) correctamente`
      });
    } catch (err) {
      Modal.error({
        title: 'Error en sincronización',
        content: err.message
      });
    }
  };

  const handleClearImported = () => {
    clearState();
    setStep('select');
    setSelectedFile(null);
  };

  return (
    <div className="dbml-import-container space-y-4">
      <Card title="📥 Importar Archivos DBML desde GitHub">
        {error && (
          <Banner
            type="error"
            title="Error"
            description={error}
            closeIcon
            className="mb-4"
          />
        )}

        {/* Paso 1: Seleccionar Repositorio */}
        {(step === 'select' || step === 'search') && (
          <div className="space-y-4">
            <h3 className="font-semibold">1. Selecciona un repositorio</h3>

            {enabledRepos.length === 0 ? (
              <Empty description="No hay repositorios habilitados">
                <p className="text-sm text-gray-600 mt-2">
                  Por favor agrega y habilita repositorios en la administración de repositorios
                </p>
              </Empty>
            ) : (
              <>
                <Select
                  label="Repositorio"
                  placeholder="Selecciona un repositorio"
                  value={selectedRepoId}
                  onChange={handleSelectRepository}
                  optionList={enabledRepos.map(repo => ({
                    label: `${repo.name} (${repo.owner})`,
                    value: repo.id
                  }))}
                  style={{ width: '100%' }}
                />

                {selectedRepoId && (
                  <div className="p-4 bg-blue-50 rounded">
                    <div className="text-sm space-y-2">
                      {(() => {
                        const selected = enabledRepos.find(r => r.id === selectedRepoId);
                        return selected ? (
                          <>
                            <div><strong>URL:</strong> {selected.url}</div>
                            <div><strong>Rama:</strong> {selected.branch}</div>
                            <div><strong>Sincronización:</strong> {selected.sync?.enabled ? '✓ Habilitada' : '✗ Deshabilitada'}</div>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}

                {selectedRepoId && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                      type="primary"
                      icon={<IconRefresh />}
                      onClick={handleSearchFiles}
                      disabled={!selectedRepoId || !token}
                    >
                      Buscar Archivos DBML
                    </Button>
                    <Button
                      type="secondary"
                      onClick={handleSyncAll}
                      disabled={!selectedRepoId || !token}
                    >
                      Sincronizar Todo
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Paso 2: Buscar y seleccionar archivo */}
        {step === 'search' && (
          <div className="space-y-4">
            <h3 className="font-semibold">2. Archivos DBML encontrados</h3>

            {loading ? (
              <Spin />
            ) : foundFiles.length === 0 ? (
              <Empty description="No se encontraron archivos DBML">
                <p className="text-sm text-gray-600 mt-2">
                  Asegúrate de que el repositorio tenga archivos .dbml o .sql
                </p>
              </Empty>
            ) : (
              <List
                dataSource={foundFiles}
                renderItem={(file) => (
                  <List.Item
                    key={file.path}
                    header={<span>✅</span>}
                    main={
                      <div className="flex-1">
                        <div className="font-medium">{file.name}</div>
                        <div className="text-sm text-gray-600">{file.path}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Tamaño: {(file.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                    }
                    extra={
                      <Button
                        size="small"
                        type="primary"
                        icon={<IconDownload />}
                        onClick={() => handleImportFile(file.path)}
                        loading={loading && selectedFile === file.path}
                      >
                        Importar
                      </Button>
                    }
                  />
                )}
              />
            )}
          </div>
        )}

        {/* Paso 3: Importando */}
        {step === 'import' && (
          <div className="space-y-4">
            <h3 className="font-semibold">3. Importando archivo...</h3>
            <Spin />
            <Progress percent={importProgress} />
            <p className="text-sm text-gray-600">
              Descargando y procesando archivo DBML...
            </p>
          </div>
        )}

        {/* Paso 4: Revisión */}
        {step === 'review' && importedDiagrams.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">4. Diagramas importados</h3>

            <List
              dataSource={importedDiagrams}
              renderItem={(diagram) => (
                <List.Item
                  key={diagram.id}
                  header={<span>✅</span>}
                  main={
                    <div className="flex-1">
                      <div className="font-medium">{diagram.name}</div>
                      {diagram.description && (
                        <div className="text-sm text-gray-600">{diagram.description}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1 space-x-2">
                        <span>📊 {diagram.tables?.length || 0} tablas</span>
                        <span>🔗 {diagram.relationships?.length || 0} relaciones</span>
                      </div>
                      {diagram.source && (
                        <div className="text-xs text-blue-600 mt-2">
                          <a href={diagram.source.url} target="_blank" rel="noopener noreferrer">
                            Ver en GitHub →
                          </a>
                        </div>
                      )}
                    </div>
                  }
                />
              )}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <Button onClick={handleClearImported}>
                Importar otro
              </Button>
              <Button type="primary">
                Continuar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Configuración de Token */}
      <Card title="🔐 Configuración">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Token de GitHub</label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Token requerido para acceder a repositorios. 
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-1">
                Crear token →
              </a>
            </p>
          </div>
        </div>
      </Card>

      {/* Información */}
      <Card title="ℹ️ Información">
        <div className="text-sm space-y-2">
          <p><strong>Formatos soportados:</strong> .dbml, .sql</p>
          <p><strong>Ubicaciones buscadas:</strong> schemas/, database/, db/, models/, sql/, dbml/</p>
          <p><strong>Diagramas importados:</strong> {importedDiagrams.length}</p>
          <p><strong>Archivos encontrados:</strong> {foundFiles.length}</p>
        </div>
      </Card>
    </div>
  );
}
