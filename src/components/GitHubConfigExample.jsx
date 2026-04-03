/**
 * GitHub Configuration Example Component
 * 
 * Componente de ejemplo que demuestra cómo usar la configuración
 * de repositories de GitHub dentro de DrawDB
 * 
 * @component
 * @example
 * import GitHubConfigExample from '@/components/GitHubConfigExample';
 * 
 * export default function App() {
 *   return <GitHubConfigExample />;
 * }
 */

import { useState } from 'react';
import {
  useEnabledRepositories,
  useRepository,
  useTemplates,
  useEnvironmentValidation,
  useRepositorySyncConfig,
  useRepositoryComplete
} from '../hooks/useGithubConfiguration';
import { Card, Button, Select, Tag, Spin, Empty, Banner } from '@douyinfe/semi-ui';
import {
  IconLoading
} from '@douyinfe/semi-icons';

/**
 * Componente que muestra el listado de repositorios disponibles
 */
function RepositoriesList() {
  const { repositories, loading, error } = useEnabledRepositories();
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const { repository: selectedRepo } = useRepository(selectedRepoId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <Banner
        type="error"
        title="Error al cargar repositorios"
        description={error.message}
        closeIcon
      />
    );
  }

  return (
    <Card
      title="📦 Repositorios de GitHub"
      className="mb-4"
    >
      <div className="space-y-3">
        {repositories.length === 0 ? (
          <Empty description="No hay repositorios habilitados" />
        ) : (
          repositories.map(repo => (
            <div
              key={repo.id}
              className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
              onClick={() => setSelectedRepoId(repo.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold">{repo.name}</div>
                  <div className="text-sm text-gray-600">{repo.owner}/{repo.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{repo.description}</div>
                  <div className="flex gap-2 mt-2">
                    <Tag color="green" size="small">
                      {repo.type}
                    </Tag>
                    {repo.sync?.enabled && (
                      <Tag color="blue" size="small">
                        Sync: {repo.sync.frequency}
                      </Tag>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {repo.enabled ? (
                    <div className="text-green-600 flex items-center gap-1">
                      ✅ Activo
                    </div>
                  ) : (
                    <div className="text-gray-400 flex items-center gap-1">
                      ⚠️ Inactivo
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedRepoId && selectedRepo && (
        <RepositoryDetails repoId={selectedRepoId} />
      )}
    </Card>
  );
}

/**
 * Componente que muestra detalles de un repositorio seleccionado
 */
function RepositoryDetails({ repoId }) {
  const { repository, syncConfig, integrations, apiConfig, isReady } = useRepositoryComplete(repoId);

  if (!isReady) {
    return <Spin />;
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded">
      <h3 className="font-semibold mb-3">Detalles del Repositorio</h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">URL:</span>
          <div className="text-gray-600 break-all">{repository.url}</div>
        </div>
        <div>
          <span className="font-medium">Rama predeterminada:</span>
          <div className="text-gray-600">{repository.defaultBranch}</div>
        </div>
      </div>

      {syncConfig && (
        <div className="mt-3 p-2 bg-white rounded border border-blue-200">
          <div className="font-medium text-sm mb-2">Sincronización</div>
          <div className="text-xs space-y-1">
            <div>Estado: {syncConfig.enabled ? '✓ Habilitada' : '✗ Deshabilitada'}</div>
            {syncConfig.enabled && (
              <>
                <div>Frecuencia: {syncConfig.frequency}</div>
                <div>Auto-commit: {syncConfig.autoCommit ? 'Sí' : 'No'}</div>
                <div>Última sincronización: {syncConfig.lastSync}</div>
              </>
            )}
          </div>
        </div>
      )}

      {integrations && (
        <div className="mt-3 p-2 bg-white rounded border border-green-200">
          <div className="font-medium text-sm mb-2">Integraciones</div>
          <div className="text-xs space-y-1">
            {integrations.gists?.enabled && (
              <div>✓ Gists habilitados</div>
            )}
            {integrations.issues?.enabled && (
              <div>✓ Issues habilitados</div>
            )}
            {integrations.discussions?.enabled && (
              <div>✓ Discussions habilitadas</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente que valida y muestra el estado de las variables de entorno
 */
function EnvironmentStatus() {
  const { isValid, missing, configured } = useEnvironmentValidation();

  return (
    <Card title="🔐 Estado de Variables de Entorno" className="mb-4">
      {isValid ? (
        <Banner
          type="success"
          title="✓ Variables de entorno configuradas"
          description={`${configured.length} variable(s) configurada(s)`}
        />
      ) : (
        <Banner
          type="error"
          title="✗ Variables de entorno faltantes"
          description={`Falta configurar: ${missing.join(', ')}`}
        />
      )}

      <div className="mt-3">
        <div className="text-sm font-medium mb-2">Configuradas:</div>
        <div className="flex flex-wrap gap-2">
          {configured.map(v => (
            <Tag key={v} color="green">{v}</Tag>
          ))}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-medium mb-2">Faltantes:</div>
          <div className="flex flex-wrap gap-2">
            {missing.map(v => (
              <Tag key={v} color="red">{v}</Tag>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Componente que muestra las plantillas disponibles
 */
function TemplatesList() {
  const { templates, loading, error } = useTemplates();

  if (loading) {
    return <Spin />;
  }

  if (error) {
    return (
      <Banner
        type="error"
        title="Error al cargar plantillas"
        description={error.message}
      />
    );
  }

  return (
    <Card title="📋 Plantillas Disponibles" className="mb-4">
      {templates.length === 0 ? (
        <Empty description="No hay plantillas disponibles" />
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <div
              key={template.id}
              className="p-3 border rounded hover:bg-gray-50 transition"
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-sm text-gray-600">{template.description}</div>
              <div className="flex gap-2 mt-2">
                {template.tags?.map(tag => (
                  <Tag key={tag} size="small">{tag}</Tag>
                ))}
              </div>
              <Button size="small" theme="solid" type="primary" className="mt-2">
                Usar Plantilla
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * Componente principal que integra todos los anteriores
 */
export default function GitHubConfigExample() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        🔗 Configuración de GitHub - DrawDB
      </h1>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-gray-700">
          Este componente demuestra cómo integrar la configuración centralizada de
          repositorios GitHub en la aplicación DrawDB. Utiliza los hooks personalizados
          para cargar datos de manera eficiente.
        </p>
      </div>

      <EnvironmentStatus />
      <RepositoriesList />
      <TemplatesList />

      <div className="mt-6 p-4 bg-gray-50 border rounded text-xs text-gray-600">
        <div className="font-medium mb-2">ℹ️ Información Técnica</div>
        <div className="space-y-1">
          <div>• Archivo de configuración: <code>infrastructure/github-repos.config.json</code></div>
          <div>• Utilidad: <code>utils/githubConfig.js</code></div>
          <div>• Hooks: <code>hooks/useGithubConfiguration.js</code></div>
          <div>• Guía: Consulta <code>infrastructure/GITHUB_INTEGRATION_GUIDE.md</code></div>
        </div>
      </div>
    </div>
  );
}
