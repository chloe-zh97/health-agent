import React, { useState, useEffect } from 'react';
import { Calendar, Activity, Utensils, Heart, TrendingUp, Plus, User, LogOut, Edit2, Save, X } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function HealthAIAgent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Auth state
  const [authMode, setAuthMode] = useState('login');
  const [loginUsername, setLoginUsername] = useState('');
  
  const [diaryForm, setDiaryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    meals: '',
    conditions: '',
    severity: 5,
    activities: '',
    notes: ''
  });

  const [profileForm, setProfileForm] = useState({
    user_id: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    allergies: '',
    medical_conditions: ''
  });

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      loadDiaryEntries();
    }
  }, [isLoggedIn, currentUser]);

  const loadDiaryEntries = async () => {
    try {
      const res = await fetch(`${API_BASE}/diary/${currentUser.user_id}`);
      if (res.ok) {
        const data = await res.json();
        setDiaryEntries(data);
      }
    } catch (err) {
      console.error('Error loading diary:', err);
    }
  };

  const handleLogin = async () => {
    if (!loginUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login?user_id=${loginUsername}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        setProfileForm({
          user_id: data.user.user_id,
          age: data.user.age.toString(),
          gender: data.user.gender,
          weight: data.user.weight?.toString() || '',
          height: data.user.height?.toString() || '',
          allergies: data.user.allergies?.join(', ') || '',
          medical_conditions: data.user.medical_conditions?.join(', ') || ''
        });
        setActiveTab('profile');
      } else {
        const error = await res.json();
        alert(error.detail || 'Login failed. User not found.');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!profileForm.user_id.trim() || !profileForm.age) {
      alert('Please fill in username and age');
      return;
    }

    setLoading(true);
    
    const profile = {
      user_id: profileForm.user_id,
      age: parseInt(profileForm.age),
      gender: profileForm.gender,
      weight: parseFloat(profileForm.weight) || null,
      height: parseFloat(profileForm.height) || null,
      allergies: profileForm.allergies.split(',').map(s => s.trim()).filter(Boolean),
      medical_conditions: profileForm.medical_conditions.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (res.ok) {
        alert('Registration successful! Please login.');
        setAuthMode('login');
        setLoginUsername(profile.user_id);
        setProfileForm({
          user_id: '',
          age: '',
          gender: 'male',
          weight: '',
          height: '',
          allergies: '',
          medical_conditions: ''
        });
      } else {
        const error = await res.json();
        alert(error.detail || 'Registration failed');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    
    const profile = {
      user_id: currentUser.user_id,
      age: parseInt(profileForm.age),
      gender: profileForm.gender,
      weight: parseFloat(profileForm.weight) || null,
      height: parseFloat(profileForm.height) || null,
      allergies: profileForm.allergies.split(',').map(s => s.trim()).filter(Boolean),
      medical_conditions: profileForm.medical_conditions.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (res.ok) {
        alert('Profile updated successfully!');
        setCurrentUser({...currentUser, ...profile});
        setEditingProfile(false);
      } else {
        const error = await res.json();
        alert(error.detail || 'Error updating profile');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setDiaryEntries([]);
    setRecommendation('');
    setLoginUsername('');
    setActiveTab('profile');
  };

  const handleAddDiary = async () => {
    setLoading(true);

    const entry = {
      date: diaryForm.date,
      meals: diaryForm.meals.split(',').map(s => s.trim()).filter(Boolean),
      conditions: diaryForm.conditions ? [{
        condition: diaryForm.conditions,
        severity: diaryForm.severity,
        notes: diaryForm.notes,
        timestamp: new Date().toISOString()
      }] : [],
      activities: diaryForm.activities.split(',').map(s => s.trim()).filter(Boolean),
      notes: diaryForm.notes
    };

    try {
      const res = await fetch(`${API_BASE}/diary/${currentUser.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      if (res.ok) {
        alert('Diary entry added!');
        setDiaryForm({
          date: new Date().toISOString().split('T')[0],
          meals: '',
          conditions: '',
          severity: 5,
          activities: '',
          notes: ''
        });
        loadDiaryEntries();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/recommendations/${currentUser.user_id}`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.recommendation);
        setActiveTab('recommendations');
      } else {
        alert('Error getting recommendations. Make sure you have diary entries.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Login/Register Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Heart className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-800">Health AI Agent</h1>
            <p className="text-gray-600 mt-2">Your Personal Health Companion</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                authMode === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                authMode === 'register'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Register
            </button>
          </div>

          {authMode === 'login' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Username *</label>
                  <input
                    type="text"
                    value={profileForm.user_id}
                    onChange={(e) => setProfileForm({...profileForm, user_id: e.target.value})}
                    placeholder="Choose a username"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Age *</label>
                  <input
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({...profileForm, age: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gender</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profileForm.weight}
                    onChange={(e) => setProfileForm({...profileForm, weight: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={profileForm.height}
                    onChange={(e) => setProfileForm({...profileForm, height: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Allergies (comma-separated)</label>
                <input
                  type="text"
                  value={profileForm.allergies}
                  onChange={(e) => setProfileForm({...profileForm, allergies: e.target.value})}
                  placeholder="e.g., peanuts, dairy, gluten"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Medical Conditions (comma-separated)</label>
                <input
                  type="text"
                  value={profileForm.medical_conditions}
                  onChange={(e) => setProfileForm({...profileForm, medical_conditions: e.target.value})}
                  placeholder="e.g., diabetes, hypertension"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main App Screen (after login)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-10 h-10 text-red-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Health AI Agent</h1>
                <p className="text-gray-600">Welcome, {currentUser.user_id}!</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow">
          {['profile', 'diary', 'recommendations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'profile' && <User className="inline w-5 h-5 mr-2" />}
              {tab === 'diary' && <Calendar className="inline w-5 h-5 mr-2" />}
              {tab === 'recommendations' && <TrendingUp className="inline w-5 h-5 mr-2" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Profile</h2>
              {editingProfile ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-600">Username</label>
                  <input
                    type="text"
                    value={profileForm.user_id}
                    disabled
                    className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-600">Age</label>
                  <input
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({...profileForm, age: e.target.value})}
                    disabled={!editingProfile}
                    className={`w-full px-4 py-2 border rounded-lg ${!editingProfile ? 'bg-gray-50' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-600">Gender</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                    disabled={!editingProfile}
                    className={`w-full px-4 py-2 border rounded-lg ${!editingProfile ? 'bg-gray-50' : ''}`}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-600">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profileForm.weight}
                    onChange={(e) => setProfileForm({...profileForm, weight: e.target.value})}
                    disabled={!editingProfile}
                    className={`w-full px-4 py-2 border rounded-lg ${!editingProfile ? 'bg-gray-50' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-600">Height (cm)</label>
                  <input
                    type="number"
                    value={profileForm.height}
                    onChange={(e) => setProfileForm({...profileForm, height: e.target.value})}
                    disabled={!editingProfile}
                    className={`w-full px-4 py-2 border rounded-lg ${!editingProfile ? 'bg-gray-50' : ''}`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Allergies</label>
                <input
                  type="text"
                  value={profileForm.allergies}
                  onChange={(e) => setProfileForm({...profileForm, allergies: e.target.value})}
                  disabled={!editingProfile}
                  placeholder="e.g., peanuts, dairy, gluten"
                  className={`w-full px-4 py-2 border rounded-lg ${!editingProfile ? 'bg-gray-50' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Medical Conditions</label>
                <input
                  type="text"
                  value={profileForm.medical_conditions}
                  onChange={(e) => setProfileForm({...profileForm, medical_conditions: e.target.value})}
                  disabled={!editingProfile}
                  placeholder="e.g., diabetes, hypertension"
                  className={`w-full px-4 py-2 border rounded-lg ${!editingProfile ? 'bg-gray-50' : ''}`}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Add Diary Entry
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={diaryForm.date}
                    onChange={(e) => setDiaryForm({...diaryForm, date: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Meals (comma-separated)</label>
                  <input
                    type="text"
                    value={diaryForm.meals}
                    onChange={(e) => setDiaryForm({...diaryForm, meals: e.target.value})}
                    placeholder="e.g., oatmeal, salad, chicken"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Health Condition</label>
                  <input
                    type="text"
                    value={diaryForm.conditions}
                    onChange={(e) => setDiaryForm({...diaryForm, conditions: e.target.value})}
                    placeholder="e.g., headache, stomachache"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Severity: {diaryForm.severity}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={diaryForm.severity}
                    onChange={(e) => setDiaryForm({...diaryForm, severity: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Activities (comma-separated)</label>
                  <input
                    type="text"
                    value={diaryForm.activities}
                    onChange={(e) => setDiaryForm({...diaryForm, activities: e.target.value})}
                    placeholder="e.g., running, yoga, walking"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={diaryForm.notes}
                    onChange={(e) => setDiaryForm({...diaryForm, notes: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows="3"
                  />
                </div>
                <button
                  onClick={handleAddDiary}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Recent Entries</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {diaryEntries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No diary entries yet</p>
                ) : (
                  diaryEntries.map((entry) => (
                    <div key={entry._id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-800">{entry.date}</span>
                        <Calendar className="w-5 h-5 text-indigo-600" />
                      </div>
                      {entry.meals && entry.meals.length > 0 && (
                        <div className="mb-2">
                          <Utensils className="w-4 h-4 inline mr-2 text-green-600" />
                          <span className="text-sm">{entry.meals.join(', ')}</span>
                        </div>
                      )}
                      {entry.conditions && entry.conditions.length > 0 && (
                        <div className="mb-2">
                          <Heart className="w-4 h-4 inline mr-2 text-red-600" />
                          {entry.conditions.map((c, i) => (
                            <span key={i} className="text-sm">
                              {c.condition} (Severity: {c.severity}/10)
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.activities && entry.activities.length > 0 && (
                        <div>
                          <Activity className="w-4 h-4 inline mr-2 text-blue-600" />
                          <span className="text-sm">{entry.activities.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">AI Health Recommendations</h2>
              <button
                onClick={getRecommendations}
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                {loading ? 'Generating...' : 'Get Recommendations'}
              </button>
            </div>
            
            {recommendation ? (
              <div className="bg-gray-50 rounded-lg p-6">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                  {recommendation}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Click "Get Recommendations" to generate personalized health advice</p>
                <p className="text-sm text-gray-400 mt-2">Make sure you have added diary entries first</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}