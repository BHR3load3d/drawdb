/**
 * Repository ABM Component
 * 
 * Componente principal para gestionar (Alta, Baja, Modificación)
 * repositorios GitHub
 * 
 * @component
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Modal,
  Table,
  Popconfirm,
  Tag,
  Space,
  Empty,
  Banner,
  Badge,
  Tooltip
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconEdit,
  IconRefresh
} from '@douyinfe/semi-icons';
import useRepositoryManagement from '../hooks/useRepositoryManagement';
import repositoryManagementService from '../services/repositoryManagement';
import RepositoryForm from './RepositoryForm';
import './RepositoryABM.css';

/**
 * Componente principal ABM de repositorios
 */
export default function RepositoryABM() {
  const {
    repositories,
    error,
    success,
    loading,
    addRepository,
    updateRepository,
    deleteRepository,
    toggleRepository,
    validateRepositoryAccess,
    getStatistics,
    clearMessages
  } = useRepositoryManagement();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState(null);
  const [mode, setMode] = useState('list'); // 'list' | 'form'
  const [stats, setStats] = useState(getStatistics());

  // Mostrar formulario para agregar
  const handleAddNew = () => {
    setSelectedRepository(null);
    setMode('form');
  };

  // Mostrar formulario para editar
  const handleEdit = (repo) => {
    console.log('[RepositoryABM] handleEdit llamado con repo.id:', repo.id);
    // Obtener el repositorio completo del servicio en lugar de usar el record de la tabla
    const fullRepository = repositoryManagementService.getRepository(repo.id);
    console.log('[RepositoryABM] Repositorio completo recuperado:', fullRepository);
    setSelectedRepository(fullRepository);
    setMode('form');
  };

  // Eliminar repositorio
  const handleDelete = (repoId) => {
    const result = deleteRepository(repoId);
    if (result.success) {
      setStats(getStatistics());
    }
  };

  // Habilitar/deshabilitar
  const handleToggle = (repoId, currentState) => {
    toggleRepository(repoId, !currentState);
    setStats(getStatistics());
  };

  // Guardar formulario
  const handleFormSubmit = (formData) => {
    if (selectedRepository) {
      const result = updateRepository(selectedRepository.id, formData);
      if (result.success) {
        setMode('list');
        setStats(getStatistics());
        setTimeout(() => clearMessages(), 3000);
      }
    } else {
      const result = addRepository(formData);
      if (result.success) {
        setMode('list');
        setStats(getStatistics());
        setTimeout(() => clearMessages(), 3000);
      }
    }
  };

  // Cancelar formulario
  const handleFormCancel = () => {
    setMode('list');
    setSelectedRepository(null);
    clearMessages();
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.owner}/{record.name}</div>
        </div>
      )
    },
    {
      title: 'Rama',
      dataIndex: 'branch',
      key: 'branch',
      width: 100,
      render: (text) => (
        <Tag color="blue">{text}</Tag>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled) => (
        <Badge
          status={enabled ? 'success' : 'default'}
          text={enabled ? 'Habilitado' : 'Deshabilitado'}
        />
      )
    },
    {
      title: 'Sincronización',
      dataIndex: 'sync',
      key: 'sync',
      width: 130,
      render: (sync) => (
        sync?.enabled ? (
          <Tag color="green">{sync.frequency}</Tag>
        ) : (
          <Tag color="gray">Deshabilitada</Tag>
        )
      )
    },
    {
      title: 'Integraciones',
      dataIndex: 'integrations',
      key: 'integrations',
      width: 200,
      render: (integrations) => (
        <Space size="small">
          {integrations?.gists?.enabled && (
            <Tooltip content="Gists habilitados">
              <Tag size="small">Gists</Tag>
            </Tooltip>
          )}
          {integrations?.issues?.enabled && (
            <Tooltip content="Issues habilitados">
              <Tag size="small">Issues</Tag>
            </Tooltip>
          )}
          {integrations?.discussions?.enabled && (
            <Tooltip content="Discussions habilitadas">
              <Tag size="small">Discussions</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<IconEdit />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="¿Eliminar repositorio?"
            content={`¿Eliminar "${record.name}"? Esta acción no se puede deshacer.`}
            okText="Eliminar"
            cancelText="Cancelar"
            okType="danger"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              size="small"
              type="danger"
              icon={<IconDelete />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="repository-abm p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        📦 Administración de Repositorios GitHub
      </h1>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card title="Total" className="stats-card">
          <div className="text-3xl font-bold text-blue-600">{stats.totalRepositories}</div>
          <div className="text-sm text-gray-600">repositorios</div>
        </Card>
        <Card title="Habilitados" className="stats-card">
          <div className="text-3xl font-bold text-green-600">{stats.enabledRepositories}</div>
          <div className="text-sm text-gray-600">activos</div>
        </Card>
        <Card title="Con Sync" className="stats-card">
          <div className="text-3xl font-bold text-orange-600">{stats.syncEnabledRepositories}</div>
          <div className="text-sm text-gray-600">sincronizando</div>
        </Card>
        <Card title="Deshabilitados" className="stats-card">
          <div className="text-3xl font-bold text-gray-600">{stats.disabledRepositories}</div>
          <div className="text-sm text-gray-600">inactivos</div>
        </Card>
      </div>

      {/* Mensajes */}
      {error && (
        <Banner
          type="error"
          title="Error"
          description={error}
          closable
          onClose={clearMessages}
          className="mb-4"
        />
      )}

      {success && (
        <Banner
          type="success"
          title="Éxito"
          description={success}
          closable
          onClose={clearMessages}
          className="mb-4"
        />
      )}

      {/* Vista Lista */}
      {mode === 'list' && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Repositorios</h2>
            <Button
              type="primary"
              icon={<IconPlus />}
              onClick={handleAddNew}
            >
              Nuevo Repositorio
            </Button>
          </div>

          {repositories.length === 0 ? (
            <Empty description="No hay repositorios configurados">
              <Button type="primary" onClick={handleAddNew}>
                Crear el Primero
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={repositories}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              loading={loading}
              scroll={{ x: 1000 }}
            />
          )}
        </Card>
      )}

      {/* Vista Formulario */}
      {mode === 'form' && (
        <Card className="mb-6">
          <RepositoryForm
            repository={selectedRepository}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            validateAccess={validateRepositoryAccess}
            loading={loading}
          />
        </Card>
      )}

      {/* Info adicional */}
      <Card title="ℹ️ Información" className="info-card">
        <div className="space-y-2 text-sm">
          <p>
            <strong>Configuración:</strong> infrastructure/github-repos.config.json
          </p>
          <p>
            <strong>Servicio:</strong> src/services/repositoryManagement.js
          </p>
          <p>
            <strong>Hook:</strong> src/hooks/useRepositoryManagement.js
          </p>
          <p>
            <strong>Total de repositorios:</strong> {repositories.length}
          </p>
          <p>
            <strong>Última actualización:</strong> {new Date().toLocaleString()}
          </p>
        </div>
      </Card>
    </div>
  );
}
