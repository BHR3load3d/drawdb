/**
 * Repository Form Component
 * 
 * Formulario para agregar y editar repositorios GitHub
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  Switch,
  Modal,
  Spin,
  Banner,
  TextArea
} from '@douyinfe/semi-ui';

/**
 * Componente de formulario para repositorios
 */
export default function RepositoryForm({
  repository = null,
  onSubmit,
  onCancel,
  validateAccess = null,
  loading = false
}) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    owner: '',
    url: '',
    branch: 'main',
    description: '',
    type: 'public',
    enabled: true,
    syncEnabled: true,
    syncFrequency: 'daily',
    autoCommit: true,
    gistsEnabled: true,
    issuesEnabled: true,
    discussionsEnabled: true,
    schemasPath: 'src/data/schemas.js',
    templatesPath: 'src/templates/',
    exportsPath: 'exports/',
    importsPath: 'imports/'
  });

  const [errors, setErrors] = useState({});
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    console.log('[RepositoryForm] useEffect ejecutado. repository:', repository);
    if (repository) {
      const newFormData = {
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
        url: repository.url,
        branch: repository.branch,
        description: repository.description,
        type: repository.type,
        enabled: repository.enabled,
        syncEnabled: repository.sync?.enabled || true,
        syncFrequency: repository.sync?.frequency || 'daily',
        autoCommit: repository.sync?.autoCommit !== false,
        gistsEnabled: repository.integrations?.gists?.enabled !== false,
        issuesEnabled: repository.integrations?.issues?.enabled !== false,
        discussionsEnabled: repository.integrations?.discussions?.enabled !== false,
        schemasPath: repository.directories?.schemas || 'src/data/schemas.js',
        templatesPath: repository.directories?.templates || 'src/templates/',
        exportsPath: repository.directories?.exports || 'exports/',
        importsPath: repository.directories?.imports || 'imports/'
      };
      console.log('[RepositoryForm] Datos a rellenar:', newFormData);
      setFormData(newFormData);
    } else {
      console.log('[RepositoryForm] Sin repositorio, reset a valores por defecto');
      // Reset a valores por defecto
      setFormData({
        id: '',
        name: '',
        owner: '',
        url: '',
        branch: 'main',
        description: '',
        type: 'public',
        enabled: true,
        syncEnabled: true,
        syncFrequency: 'daily',
        autoCommit: true,
        gistsEnabled: true,
        issuesEnabled: true,
        discussionsEnabled: true,
        schemasPath: 'src/data/schemas.js',
        templatesPath: 'src/templates/',
        exportsPath: 'exports/',
        importsPath: 'imports/'
      });
    }
  }, [repository]);

  const handleInputChange = (value, fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Limpiar error al editar
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: null
      }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSwitchChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleValidateAccess = async () => {
    if (!validateAccess) {
      Modal.error({
        title: 'Validación no disponible',
        content: 'El método de validación no está configurado'
      });
      return;
    }

    if (!formData.owner || !formData.name) {
      Modal.error({
        title: 'Campos requeridos',
        content: 'Por favor completa owner y name'
      });
      return;
    }

    setValidating(true);
    try {
      const token = import.meta.env.VITE_GITHUB_TOKEN || '';
      const result = await validateAccess(formData.owner, formData.name, token);
      setValidationResult(result);

      if (result.isValid) {
        Modal.success({
          title: 'Repositorio válido',
          content: `Se encontró el repositorio: ${result.data.name}`
        });
        // Actualizar campos con datos del repositorio
        setFormData(prev => ({
          ...prev,
          url: result.data.url,
          description: result.data.description || prev.description,
          branch: result.data.defaultBranch || prev.branch
        }));
      } else {
        Modal.error({
          title: 'Error en validación',
          content: result.error
        });
      }
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = () => {
    // Validaciones básicas
    const newErrors = {};

    if (!formData.id?.trim()) newErrors.id = 'ID requerido';
    if (!formData.name?.trim()) newErrors.name = 'Nombre requerido';
    if (!formData.owner?.trim()) newErrors.owner = 'Owner requerido';
    if (!formData.url?.trim()) newErrors.url = 'URL requerida';
    if (!formData.branch?.trim()) newErrors.branch = 'Rama requerida';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold mb-6">
        {repository ? 'Editar Repositorio' : 'Nuevo Repositorio'}
      </h2>

      {validationResult && !validationResult.isValid && (
        <Banner
          type="error"
          title="Error de validación"
          description={validationResult.error}
          closeIcon
          className="mb-4"
        />
      )}

      <div key={repository?.id || 'new'}>
        {/* Información Básica */}
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-4">Información Básica</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>ID del Repositorio</label>
            <Input
              placeholder="repo-001"
              value={formData.id}
              onChange={(value) => handleInputChange(value, 'id')}
              disabled={!!repository}
            />
            {errors.id && <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{errors.id}</div>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Nombre</label>
            <Input
              placeholder="drawdb-main"
              value={formData.name}
              onChange={(value) => handleInputChange(value, 'name')}
            />
            {errors.name && <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Propietario (Owner)</label>
            <Input
              placeholder="drawdb-io"
              value={formData.owner}
              onChange={(value) => handleInputChange(value, 'owner')}
            />
            {errors.owner && <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{errors.owner}</div>}
          </div>

          <Button
            onClick={handleValidateAccess}
            loading={validating}
            style={{ marginBottom: 12 }}
          >
            {validating ? 'Validando...' : 'Validar Repositorio'}
          </Button>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>URL del Repositorio</label>
            <Input
              placeholder="https://github.com/drawdb-io/drawdb"
              value={formData.url}
              onChange={(value) => handleInputChange(value, 'url')}
            />
            {errors.url && <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{errors.url}</div>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Rama (Branch)</label>
            <Input
              placeholder="main"
              value={formData.branch}
              onChange={(value) => handleInputChange(value, 'branch')}
            />
            {errors.branch && <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{errors.branch}</div>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Descripción</label>
            <TextArea
              placeholder="Descripción del repositorio"
              value={formData.description}
              onChange={(value) => handleInputChange(value, 'description')}
              rows={3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Tipo</label>
              <Select
                value={formData.type}
                onChange={(value) => handleSelectChange('type', value)}
                optionList={[
                  { label: 'Público', value: 'public' },
                  { label: 'Privado', value: 'private' }
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Estado</label>
              <Switch
                checkedText="Habilitado"
                uncheckedText="Deshabilitado"
                checked={formData.enabled}
                onChange={(value) => handleSwitchChange('enabled', value)}
              />
            </div>
          </div>
        </div>

        {/* Sincronización */}
        <div className="mb-6 p-4 bg-green-50 rounded">
          <h3 className="font-semibold mb-4">Sincronización</h3>

          <div style={{ marginBottom: 12 }}>
            <Switch
              checkedText="Sincronización habilitada"
              uncheckedText="Sincronización deshabilitada"
              checked={formData.syncEnabled}
              onChange={(value) => handleSwitchChange('syncEnabled', value)}
            />
          </div>

          {formData.syncEnabled && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Frecuencia de Sync</label>
                <Select
                  value={formData.syncFrequency}
                  onChange={(value) => handleSelectChange('syncFrequency', value)}
                  optionList={[
                    { label: 'Cada hora', value: 'hourly' },
                    { label: 'Diario', value: 'daily' },
                    { label: 'Semanal', value: 'weekly' },
                    { label: 'Mensual', value: 'monthly' }
                  ]}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <Switch
                  checkedText="Auto-commit habilitado"
                  uncheckedText="Auto-commit deshabilitado"
                  checked={formData.autoCommit}
                  onChange={(value) => handleSwitchChange('autoCommit', value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Integraciones */}
        <div className="mb-6 p-4 bg-purple-50 rounded">
          <h3 className="font-semibold mb-4">Integraciones</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <Switch
                checkedText="Gists"
                uncheckedText="Sin Gists"
                checked={formData.gistsEnabled}
                onChange={(value) => handleSwitchChange('gistsEnabled', value)}
              />
            </div>
            <div>
              <Switch
                checkedText="Issues"
                uncheckedText="Sin Issues"
                checked={formData.issuesEnabled}
                onChange={(value) => handleSwitchChange('issuesEnabled', value)}
              />
            </div>
            <div>
              <Switch
                checkedText="Discussions"
                uncheckedText="Sin Discussions"
                checked={formData.discussionsEnabled}
                onChange={(value) => handleSwitchChange('discussionsEnabled', value)}
              />
            </div>
          </div>
        </div>

        {/* Directorios */}
        <div className="mb-6 p-4 bg-yellow-50 rounded">
          <h3 className="font-semibold mb-4">Directorios</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Path de Schemas</label>
            <Input
              placeholder="src/data/schemas.js"
              value={formData.schemasPath}
              onChange={(value) => handleInputChange(value, 'schemasPath')}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Path de Templates</label>
            <Input
              placeholder="src/templates/"
              value={formData.templatesPath}
              onChange={(value) => handleInputChange(value, 'templatesPath')}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Path de Exports</label>
            <Input
              placeholder="exports/"
              value={formData.exportsPath}
              onChange={(value) => handleInputChange(value, 'exportsPath')}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Path de Imports</label>
            <Input
              placeholder="imports/"
              value={formData.importsPath}
              onChange={(value) => handleInputChange(value, 'importsPath')}
            />
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
          >
            {repository ? 'Actualizar' : 'Crear'} Repositorio
          </Button>
        </div>
      </div>
    </div>
  );
}
