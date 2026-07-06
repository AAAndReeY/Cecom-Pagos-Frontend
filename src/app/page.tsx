'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, FileText, Search, LogOut, Building2, UserPlus, Download, Trash2, CheckCircle, X, Edit2, Users, Database, Landmark } from 'lucide-react';

const API_URL = 'http://localhost:3001';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [personas, setPersonas] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDnis, setSelectedDnis] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Nuevos estados para CRUD y Vistas
  const [activeTab, setActiveTab] = useState<'habilitados' | 'general' | 'bancos'>('habilitados');
  const [showModal, setShowModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingDni, setEditingDni] = useState<string | null>(null);
  const [editingBancoId, setEditingBancoId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    dni: '', nombre: '', ruc: '', direccion: '', banco: '', cci: '', colegio: '', anio: '', fecha_dj: ''
  });
  const [bancoData, setBancoData] = useState({ nombre: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (savedToken) {
      setToken(savedToken);
      if (savedUsername) setUsername(savedUsername);
      fetchPersonas(savedToken);
      fetchBancos(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { access_token } = res.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      localStorage.setItem('username', username);
      toast.success('Sesión iniciada correctamente');
      fetchPersonas(access_token);
      fetchBancos(access_token);
    } catch (error) {
      toast.error('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUsername('');
    setPassword('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setPersonas([]);
  };

  const fetchPersonas = async (authToken: string) => {
    try {
      const res = await axios.get(`${API_URL}/pagos/personas`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setPersonas(res.data);
      setSelectedDnis(new Set()); // Reset selections when data reloads
    } catch (error) {
      toast.error('Error al cargar datos');
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchBancos = async (authToken: string) => {
    try {
      const res = await axios.get(`${API_URL}/bancos`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setBancos(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    toast.loading('Procesando archivo...', { id: 'upload' });
    try {
      const res = await axios.post(`${API_URL}/pagos/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(res.data.message, { id: 'upload' });
      fetchPersonas(token!);
    } catch (error) {
      toast.error('Error al subir archivo', { id: 'upload' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (selectedDnis.size === 0) {
      toast.error('Seleccione al menos una persona');
      return;
    }

    setIsGenerating(true);
    toast.loading('Generando documentos...', { id: 'generate' });
    try {
      const res = await axios.post(`${API_URL}/pagos/generar`, {
        dnis: Array.from(selectedDnis)
      }, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: res.headers['content-type'] as string });
      
      const contentDisposition = res.headers['content-disposition'] as string | undefined;
      let filename = 'documentos.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Documentos descargados con éxito', { id: 'generate' });
    } catch (error) {
      toast.error('Error al generar documentos', { id: 'generate' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    toast.loading('Exportando Excel...', { id: 'export' });
    try {
      const res = await axios.get(`${API_URL}/pagos/exportar`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] as string });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Personas_General.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel exportado con éxito', { id: 'export' });
    } catch (error) {
      toast.error('Error al exportar Excel', { id: 'export' });
    }
  };

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.loading('Guardando...', { id: 'save' });
    try {
      if (editingDni) {
        await axios.patch(`${API_URL}/pagos/persona/${editingDni}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Persona actualizada', { id: 'save' });
      } else {
        await axios.post(`${API_URL}/pagos/persona`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Persona agregada', { id: 'save' });
      }
      await fetchPersonas(token!);
      setShowModal(false);
      setEditingDni(null);
      setFormData({ dni: '', nombre: '', ruc: '', direccion: '', banco: '', cci: '', colegio: '', anio: '', fecha_dj: '' });
      setModalError(null);
    } catch (error: any) {
      console.error(error);
      const apiMessage = error.response?.data?.message;
      if (typeof apiMessage === 'string') {
        setModalError(apiMessage);
      } else if (Array.isArray(apiMessage)) {
        setModalError(apiMessage[0]);
      } else {
        setModalError('Error al guardar persona');
      }
      toast.error('Error al guardar persona');
    }
  };

  const handleSaveBanco = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBancoId) {
        await axios.patch(`${API_URL}/bancos/${editingBancoId}`, bancoData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Banco actualizado');
      } else {
        await axios.post(`${API_URL}/bancos`, bancoData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Banco agregado');
      }
      await fetchBancos(token!);
      setShowBancoModal(false);
      setEditingBancoId(null);
      setBancoData({ nombre: '' });
      setModalError(null);
    } catch (error: any) {
      const apiMessage = error.response?.data?.message;
      if (typeof apiMessage === 'string') {
        setModalError(apiMessage);
      } else {
        setModalError('Error al guardar banco');
      }
    }
  };

  const handleToggleBanco = async (id: number, activo: boolean) => {
    try {
      await axios.patch(`${API_URL}/bancos/${id}/status`, { activo }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Estado del banco actualizado');
      fetchBancos(token!);
    } catch (error) {
      toast.error('Error al actualizar banco');
    }
  };

  const togglePersonaStatus = async (dni: string, activo: boolean) => {
    toast.loading('Actualizando estado...', { id: 'status' });
    try {
      await axios.patch(`${API_URL}/pagos/persona/${dni}/status`, { activo }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Estado actualizado', { id: 'status' });
      fetchPersonas(token!);
    } catch (error) {
      toast.error('Error al actualizar estado', { id: 'status' });
    }
  };

  const toggleSelection = (dni: string) => {
    const newSelection = new Set(selectedDnis);
    if (newSelection.has(dni)) {
      newSelection.delete(dni);
    } else {
      newSelection.add(dni);
    }
    setSelectedDnis(newSelection);
  };

  // Filtrado principal por estado y busqueda
  const filteredPersonas = personas.filter(p => {
    if (activeTab === 'habilitados' && !p.activo) return false;
    
    const search = searchTerm.toLowerCase();
    return p.nombre.toLowerCase().includes(search) || p.dni.includes(search);
  });

  if (!token) {
    return (
      <div className="login-wrapper">
        <Toaster position="top-center" />
        <div className="panel login-box animate-fade">
          <div className="login-logo">
            <Building2 size={40} />
          </div>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            CECOM Pagos
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Sistema de Pagos y DJ
          </p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Usuario
              </label>
              <input className="input" type="text" placeholder="Ingrese su usuario" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Contraseña
              </label>
              <input className="input" type="password" placeholder="Ingrese su contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn" style={{ justifyContent: 'center', marginTop: '1rem', padding: '0.85rem' }} type="submit">
              Ingresar al Sistema
            </button>
          </form>
          <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#999' }}>
            © {new Date().getFullYear()} Municipalidad. Todos los derechos reservados.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      {/* Modal para Agregar/Editar Persona */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="panel animate-fade" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{editingDni ? 'Editar Persona' : 'Agregar Persona Manualmente'}</h3>
              <button onClick={() => { setShowModal(false); setEditingDni(null); setFormData({ dni: '', nombre: '', ruc: '', direccion: '', banco: '', cci: '', colegio: '', anio: '', fecha_dj: '' }); setModalError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#666" /></button>
            </div>

            {modalError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #f87171', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 'bold' }}>⚠️ Error:</span> {modalError}
              </div>
            )}

            <form onSubmit={handleSavePersona} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>DNI</label><input required className="input" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>RUC</label><input required className="input" value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value})} /></div>
              </div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Nombre Completo</label><input required className="input" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Dirección</label><input required className="input" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Banco</label>
                  <select required className="input" value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})} style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', textOverflow: 'ellipsis' }}>
                    <option value="">Seleccione un banco...</option>
                    {bancos.filter(b => b.activo).map(b => (
                      <option key={b.id} value={b.nombre}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 2 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>CCI</label><input required className="input" value={formData.cci} onChange={e => setFormData({...formData, cci: e.target.value})} /></div>
              </div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Colegio</label><input required className="input" value={formData.colegio} onChange={e => setFormData({...formData, colegio: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Año</label><input required className="input" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Fecha DJ</label><input required type="date" className="input" value={formData.fecha_dj} onChange={e => setFormData({...formData, fecha_dj: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingDni(null); setFormData({ dni: '', nombre: '', ruc: '', direccion: '', banco: '', cci: '', colegio: '', anio: '', fecha_dj: '' }); setModalError(null); }}>Cancelar</button>
                <button type="submit" className="btn"><UserPlus size={18} /> {editingDni ? 'Guardar Cambios' : 'Guardar Persona'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menú Lateral (Sidebar) */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Building2 size={28} color="var(--secondary)" />
          <span className="muni-title">CECOM Pagos</span>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeTab === 'habilitados' ? 'active' : ''}`}
            onClick={() => { setActiveTab('habilitados'); setSelectedDnis(new Set()); }}
          >
            <Users size={18} /> Lista de Habilitados
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => { setActiveTab('general'); setSelectedDnis(new Set()); }}
          >
            <Database size={18} /> Lista General
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'bancos' ? 'active' : ''}`}
            onClick={() => { setActiveTab('bancos'); setSelectedDnis(new Set()); }}
          >
            <Landmark size={18} /> Gestión de Bancos
          </button>
        </nav>
        
        <div className="sidebar-footer" style={{ padding: '1rem' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            borderRadius: '12px', 
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f8fafc', letterSpacing: '0.3px' }}>
                  {username || 'Usuario'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Administrador</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout} 
              className="sidebar-item" 
              style={{ color: '#f87171', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="main-content">
        {activeTab !== 'bancos' && (
        <div className="panel animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="input" 
                style={{ paddingLeft: '2.5rem' }} 
                placeholder="Buscar por DNI o Nombre..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {activeTab === 'habilitados' && (
                <button className="btn" style={{ backgroundColor: '#10b981' }} onClick={() => {
                  setEditingDni(null);
                  setFormData({ dni: '', nombre: '', ruc: '', direccion: '', banco: '', cci: '', colegio: '', anio: '', fecha_dj: '' });
                  setShowModal(true);
                }}>
                  <UserPlus size={18} /> Agregar Persona
                </button>
              )}
              
              {activeTab === 'general' && (
                <button className="btn" style={{ backgroundColor: '#1565c0' }} onClick={handleExportExcel}>
                  <Download size={18} /> Exportar Excel
                </button>
              )}

              <label className="btn btn-outline" style={{ cursor: isUploading ? 'wait' : 'pointer' }}>
                <Upload size={18} />
                {isUploading ? 'Procesando...' : 'Cargar Excel Base'}
                <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileUpload} disabled={isUploading} />
              </label>
              
              {activeTab === 'habilitados' && (
                <button className="btn" onClick={handleGenerate} disabled={isGenerating || selectedDnis.size === 0}>
                  <FileText size={18} />
                  {isGenerating ? 'Generando PDF...' : `Generar Docs (${selectedDnis.size})`}
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {activeTab === 'habilitados' && (
                    <th style={{ width: '50px' }}>
                      <input 
                        type="checkbox" 
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDnis(new Set(filteredPersonas.map(p => p.dni)));
                          else setSelectedDnis(new Set());
                        }}
                        checked={selectedDnis.size > 0 && selectedDnis.size === filteredPersonas.length}
                      />
                    </th>
                  )}
                  <th>Ítem</th>
                  <th>Nombre Completo</th>
                  <th>DNI</th>
                  <th>Colegio / Entidad</th>
                  {activeTab === 'general' && <th>Estado</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonas.map((p) => (
                  <tr key={p.dni} style={{ opacity: p.activo ? 1 : 0.5 }}>
                    {activeTab === 'habilitados' && (
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedDnis.has(p.dni)}
                          onChange={() => toggleSelection(p.dni)}
                        />
                      </td>
                    )}
                    <td>{p.item}</td>
                    <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                    <td>{p.dni}</td>
                    <td>{p.colegio}</td>
                    {activeTab === 'general' && (
                      <td>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                          backgroundColor: p.activo ? '#e8f5e9' : '#ffebee',
                          color: p.activo ? '#2e7d32' : '#c62828'
                        }}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    )}
                    <td style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', height: '100%' }}>
                      <button 
                        onClick={() => {
                          setEditingDni(p.dni);
                          setFormData({ 
                            dni: p.dni, nombre: p.nombre || '', ruc: p.ruc || '', direccion: p.direccion || '', 
                            banco: p.banco || '', cci: p.cci || '', colegio: p.colegio || '', anio: p.anio || '', fecha_dj: p.fecha_dj || '' 
                          });
                          setShowModal(true);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                      >
                        <Edit2 size={16} /> Editar
                      </button>

                      {p.activo ? (
                        <button 
                          onClick={() => {
                            if(window.confirm('¿Desea deshabilitar esta persona?')) {
                              togglePersonaStatus(p.dni, false);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                          <Trash2 size={16} /> Deshabilitar
                        </button>
                      ) : (
                        <button 
                          onClick={() => togglePersonaStatus(p.dni, true)}
                          style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                          onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                          <CheckCircle size={16} /> Habilitar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPersonas.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'habilitados' ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto', display: 'block' }} />
                      No hay registros disponibles.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Panel de Gestión de Bancos */}
        {activeTab === 'bancos' && (
        <div className="panel animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Gestión de Bancos</h3>
            <button className="btn" style={{ backgroundColor: '#10b981' }} onClick={() => {
              setEditingBancoId(null);
              setBancoData({ nombre: '' });
              setShowBancoModal(true);
            }}>
              <Landmark size={18} /> Agregar Banco
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre del Banco</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bancos.map((b) => (
                  <tr key={b.id} style={{ opacity: b.activo ? 1 : 0.5 }}>
                    <td>{b.id}</td>
                    <td style={{ fontWeight: 600 }}>{b.nombre}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                        backgroundColor: b.activo ? '#e8f5e9' : '#ffebee',
                        color: b.activo ? '#2e7d32' : '#c62828'
                      }}>
                        {b.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button 
                        onClick={() => {
                          setEditingBancoId(b.id);
                          setBancoData({ nombre: b.nombre });
                          setShowBancoModal(true);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                      >
                        <Edit2 size={16} /> Editar
                      </button>

                      {b.activo ? (
                        <button 
                          onClick={() => {
                            if(window.confirm('¿Desea deshabilitar este banco?')) {
                              handleToggleBanco(b.id, false);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                          <Trash2 size={16} /> Deshabilitar
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleToggleBanco(b.id, true)}
                          style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                          onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                          <CheckCircle size={16} /> Habilitar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {bancos.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <Landmark size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto', display: 'block' }} />
                      No hay bancos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </main>

      {/* Modal Bancos */}
      {showBancoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel animate-fade" style={{ width: '90%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{editingBancoId ? 'Editar Banco' : 'Agregar Banco'}</h3>
              <button onClick={() => { setShowBancoModal(false); setEditingBancoId(null); setBancoData({ nombre: '' }); setModalError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#666" /></button>
            </div>

            {modalError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #f87171', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 'bold' }}>⚠️ Error:</span> {modalError}
              </div>
            )}

            <form onSubmit={handleSaveBanco} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Nombre del Banco</label>
                <input required className="input" value={bancoData.nombre} onChange={e => setBancoData({ nombre: e.target.value.toUpperCase() })} placeholder="Ej: BANCO DE LA NACION" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowBancoModal(false); setEditingBancoId(null); setBancoData({ nombre: '' }); setModalError(null); }}>Cancelar</button>
                <button type="submit" className="btn"><Landmark size={18} /> {editingBancoId ? 'Guardar Cambios' : 'Guardar Banco'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
