import { useState } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { useUser } from '../context/UserContext';
import { dbAddUser } from '../services/supabaseService';
import { FolderTree, Trash2, Plus, ArrowRight, Edit, X, UserPlus, Check, Clock } from 'lucide-react';
import AdminHomeworkTracker from '../components/AdminHomeworkTracker';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' or 'users'

  return (
    <div className="container dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Admin Paneli 🛠️</h2>
          <p className="text-muted">Sistemi ve kullanıcıları yönetin</p>
        </div>
      </header>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'curriculum' ? 'active' : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          Müfredat Yönetimi
        </button>
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Kullanıcı Yönetimi & Onaylar
        </button>
        <button 
          className={`admin-tab ${activeTab === 'homeworks' ? 'active' : ''}`}
          onClick={() => setActiveTab('homeworks')}
        >
          Ödev Takip
        </button>
      </div>

      {activeTab === 'curriculum' && <CurriculumManager />}
      {activeTab === 'users' && <UserManager />}
      {activeTab === 'homeworks' && <AdminHomeworkTracker />}

    </div>
  );
}

function CurriculumManager() {
  const { data, addGrade, addSubject, addUnit, addTopic, deleteItem } = useCurriculum();
  
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [newItemName, setNewItemName] = useState('');

  const handleAdd = (type, parentId) => {
    if (!newItemName.trim()) return;
    
    const names = newItemName.split(',').map(n => n.trim()).filter(n => n);
    
    names.forEach(name => {
      switch(type) {
        case 'grade': addGrade(name); break;
        case 'subject': addSubject(parentId, name); break;
        case 'unit': addUnit(parentId, name); break;
        case 'topic': addTopic(parentId, name); break;
        default: break;
      }
    });
    setNewItemName('');
  };

  const filteredSubjects = data.subjects.filter(s => s.gradeId === selectedGrade);
  const filteredUnits = data.units.filter(u => u.subjectId === selectedSubject);
  const filteredTopics = data.topics.filter(t => t.unitId === selectedUnit);

  return (
    <div className="admin-grid">
      {/* GRADES */}
      <div className="admin-column card glass">
        <h3 className="column-title"><FolderTree size={18} /> Sınıflar</h3>
        <ul className="item-list">
          {data.grades.map(grade => (
            <li 
              key={grade.id} 
              className={`list-item ${selectedGrade === grade.id ? 'active' : ''}`}
              onClick={() => { setSelectedGrade(grade.id); setSelectedSubject(null); setSelectedUnit(null); }}
            >
              <span>{grade.name}</span>
              <div className="item-actions">
                <ArrowRight size={16} className="text-muted" />
                <button className="btn-icon text-error" onClick={(e) => { e.stopPropagation(); deleteItem('grades', grade.id); }}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
        <div className="add-form">
          <input type="text" placeholder="Yeni (virgülle toplu)" value={selectedGrade ? '' : newItemName} onChange={(e) => !selectedGrade && setNewItemName(e.target.value)} onFocus={() => { setSelectedGrade(null); setSelectedSubject(null); setSelectedUnit(null); }} />
          <button className="btn btn-primary" onClick={() => handleAdd('grade')}><Plus size={16} /></button>
        </div>
      </div>

      {/* SUBJECTS */}
      <div className="admin-column card glass">
        <h3 className="column-title">Dersler</h3>
        {selectedGrade ? (
          <>
            <ul className="item-list">
              {filteredSubjects.map(subject => (
                <li 
                  key={subject.id} 
                  className={`list-item ${selectedSubject === subject.id ? 'active' : ''}`}
                  onClick={() => { setSelectedSubject(subject.id); setSelectedUnit(null); }}
                >
                  <span>{subject.name}</span>
                  <div className="item-actions">
                    <ArrowRight size={16} className="text-muted" />
                    <button className="btn-icon text-error" onClick={(e) => { e.stopPropagation(); deleteItem('subjects', subject.id); }}><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="add-form">
              <input type="text" placeholder="Yeni (virgülle toplu)" value={selectedSubject ? '' : newItemName} onChange={(e) => !selectedSubject && setNewItemName(e.target.value)} onFocus={() => { setSelectedSubject(null); setSelectedUnit(null); }} />
              <button className="btn btn-primary" onClick={() => handleAdd('subject', selectedGrade)}><Plus size={16} /></button>
            </div>
          </>
        ) : (
          <p className="text-muted text-center p-3">Lütfen önce bir sınıf seçin.</p>
        )}
      </div>

      {/* UNITS */}
      <div className="admin-column card glass">
        <h3 className="column-title">Üniteler</h3>
        {selectedSubject ? (
          <>
            <ul className="item-list">
              {filteredUnits.map(unit => (
                <li 
                  key={unit.id} 
                  className={`list-item ${selectedUnit === unit.id ? 'active' : ''}`}
                  onClick={() => setSelectedUnit(unit.id)}
                >
                  <span>{unit.name}</span>
                  <div className="item-actions">
                    <ArrowRight size={16} className="text-muted" />
                    <button className="btn-icon text-error" onClick={(e) => { e.stopPropagation(); deleteItem('units', unit.id); }}><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="add-form">
              <input type="text" placeholder="Yeni (virgülle toplu)" value={selectedUnit ? '' : newItemName} onChange={(e) => !selectedUnit && setNewItemName(e.target.value)} onFocus={() => setSelectedUnit(null)} />
              <button className="btn btn-primary" onClick={() => handleAdd('unit', selectedSubject)}><Plus size={16} /></button>
            </div>
          </>
        ) : (
          <p className="text-muted text-center p-3">Lütfen önce bir ders seçin.</p>
        )}
      </div>

      {/* TOPICS */}
      <div className="admin-column card glass">
        <h3 className="column-title">Konular</h3>
        {selectedUnit ? (
          <>
            <ul className="item-list">
              {filteredTopics.map(topic => (
                <li key={topic.id} className="list-item">
                  <span>{topic.name}</span>
                  <div className="item-actions">
                    <button className="btn-icon text-error" onClick={() => deleteItem('topics', topic.id)}><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="add-form">
              <input type="text" placeholder="Yeni (virgülle toplu)" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
              <button className="btn btn-primary" onClick={() => handleAdd('topic', selectedUnit)} disabled={!selectedUnit}><Plus size={16} /></button>
            </div>
          </>
        ) : (
          <p className="text-muted text-center p-3">Lütfen önce bir ünite seçin.</p>
        )}
      </div>
    </div>
  );
}

function UserManager() {
  const { users, addUser, updateUser, deleteUser } = useUser();
  const { data: curData } = useCurriculum();
  
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', role: 'student', gradeId: '', isApproved: true });

  const pendingTeachers = users.filter(u => u.role === 'teacher' && u.isApproved === false);

  const handleApproveTeacher = async (user) => {
    const updated = { ...user, isApproved: true };
    updateUser(user.id, updated);
    await dbAddUser(updated);
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUserId(user.id);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        gradeId: user.gradeId || '',
        isApproved: user.isApproved !== undefined ? user.isApproved : true
      });
    } else {
      setEditingUserId(null);
      setFormData({ name: '', email: '', role: 'student', gradeId: '', isApproved: true });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingUserId) {
      updateUser(editingUserId, formData);
      await dbAddUser({ id: editingUserId, ...formData });
    } else {
      const newUser = await addUser(formData);
      if (newUser) await dbAddUser(newUser);
    }
    setShowModal(false);
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Yönetici';
    if (role === 'teacher') return 'Öğretmen';
    return 'Öğrenci';
  };
  
  const getGradeName = (gradeId) => {
    const grade = curData.grades.find(g => g.id === gradeId);
    return grade ? grade.name : '-';
  };

  return (
    <div className="space-y-6">
      {/* PENDING TEACHER APPROVALS BANNER */}
      {pendingTeachers.length > 0 && (
        <div className="card glass" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.08)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock className="text-warning" size={20} />
            <h3 style={{ margin: 0, color: '#f59e0b', fontWeight: 800 }}>Onay Bekleyen Öğretmen Kayıtları ({pendingTeachers.length})</h3>
          </div>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>E-posta</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>Onay İşlemi</th>
                </tr>
              </thead>
              <tbody>
                {pendingTeachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td style={{ fontWeight: 600 }}>{teacher.name}</td>
                    <td>{teacher.email}</td>
                    <td>
                      <span className="role-badge" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b55' }}>⏳ Onay Bekliyor</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary"
                          style={{ background: '#10b981', borderColor: '#10b981', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleApproveTeacher(teacher)}
                        >
                          <Check size={14} /> Onayla
                        </button>
                        <button
                          className="btn-icon text-error"
                          onClick={() => deleteUser(teacher.id)}
                          title="Talebi Reddet ve Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem' }}>
          <h3>Kullanıcı Listesi</h3>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}><UserPlus size={18} /> Yeni Kullanıcı</button>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Sınıf (Öğrenci)</th>
                <th>Onay Durumu</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>{getRoleLabel(user.role)}</span>
                  </td>
                  <td>{user.role === 'student' ? getGradeName(user.gradeId) : '-'}</td>
                  <td>
                    {user.role === 'teacher' ? (
                      user.isApproved !== false ? (
                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>✅ Onaylı</span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>⏳ Bekliyor</span>
                      )
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn-icon" onClick={() => handleOpenModal(user)}><Edit size={16} /></button>
                      <button className="btn-icon text-error" onClick={() => deleteUser(user.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Kayıtlı kullanıcı yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card glass" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>{editingUserId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X /></button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="Ad Soyad" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.1)', fontFamily: 'inherit' }}
                required
              />
              <input 
                type="email" 
                placeholder="E-posta" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.1)', fontFamily: 'inherit' }}
                required
              />
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value, gradeId: e.target.value === 'student' ? formData.gradeId : ''})}
                style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.1)', fontFamily: 'inherit' }}
              >
                <option value="student">Öğrenci</option>
                <option value="teacher">Öğretmen</option>
                <option value="admin">Yönetici (Admin)</option>
              </select>

              {formData.role === 'student' && (
                <select 
                  value={formData.gradeId} 
                  onChange={e => setFormData({...formData, gradeId: e.target.value})}
                  style={{ padding: '0.75rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(0,0,0,0.1)', fontFamily: 'inherit' }}
                  required
                >
                  <option value="">Sınıf Seçiniz</option>
                  {curData.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
