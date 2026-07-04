'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, FileText, Search, LogOut, Building2, UserPlus, Download, Trash2, CheckCircle, X } from 'lucide-react';

const API_URL = 'http://localhost:3001';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [personas, setPersonas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDnis, setSelectedDnis] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Nuevos estados para CRUD y Vistas
  const [activeTab, setActiveTab] = useState<'habilitados' | 'general'>('habilitados');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    dni: '', nombre: '', ruc: '', direccion: '', banco: '', cci: '', colegio: '', anio: '', fecha_dj: ''
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchPersonas(savedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { access_token } = res.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      toast.success('Sesión iniciada correctamente');
      fetchPersonas(access_token);
    } catch (error) {
      toast.error('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
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

  const handleAddPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.loading('Guardando...', { id: 'save' });
    try {
      await axios.post(`${API_URL}/pagos/persona`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Persona agregada', { id: 'save' });
      setShowModal(false);
      setFormData({ dni: '', nombre: '', ruc: '', direccion: '', banco: '', cci: '', colegio: '', anio: '', fecha_dj: '' });
      fetchPersonas(token!);
    } catch (error) {
      toast.error('Error al agregar persona', { id: 'save' });
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
    <div>
      <Toaster position="top-right" />
      
      {/* Modal para Agregar Persona */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="panel animate-fade" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Agregar Persona Manualmente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#666" /></button>
            </div>
            <form onSubmit={handleAddPersona} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>DNI</label><input required className="input" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>RUC</label><input className="input" value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value})} /></div>
              </div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Nombre Completo</label><input required className="input" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Dirección</label><input className="input" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Banco</label><input className="input" value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})} /></div>
                <div style={{ flex: 2 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>CCI</label><input className="input" value={formData.cci} onChange={e => setFormData({...formData, cci: e.target.value})} /></div>
              </div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Colegio</label><input className="input" value={formData.colegio} onChange={e => setFormData({...formData, colegio: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Año</label><input className="input" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Fecha DJ</label><input className="input" value={formData.fecha_dj} onChange={e => setFormData({...formData, fecha_dj: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn"><UserPlus size={18} /> Guardar Persona</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="muni-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Building2 size={28} color="var(--secondary)" />
          <span className="muni-title">CECOM Pagos</span>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            className={`btn ${activeTab === 'habilitados' ? '' : 'btn-outline'}`}
            onClick={() => { setActiveTab('habilitados'); setSelectedDnis(new Set()); }}
          >
            Lista de Habilitados
          </button>
          <button 
            className={`btn ${activeTab === 'general' ? '' : 'btn-outline'}`}
            onClick={() => { setActiveTab('general'); setSelectedDnis(new Set()); }}
          >
            Lista General
          </button>
        </div>

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
                <button className="btn" style={{ backgroundColor: '#2e7d32' }} onClick={() => setShowModal(true)}>
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
                    <td>
                      {p.activo ? (
                        <button 
                          onClick={() => {
                            if(window.confirm('¿Desea deshabilitar esta persona?')) {
                              togglePersonaStatus(p.dni, false);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                          <Trash2 size={16} /> Deshabilitar
                        </button>
                      ) : (
                        <button 
                          onClick={() => togglePersonaStatus(p.dni, true)}
                          style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}
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
      </main>
    </div>
  );
}
