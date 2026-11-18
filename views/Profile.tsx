
import React, { useState } from 'react';
import { MapPin, Mail, ShoppingBag, Save, Globe, Smartphone, Camera, Facebook, Instagram, Music, CheckCircle2, ShieldAlert, Bell, AlertTriangle, MessageSquare, Check } from 'lucide-react';
import { authService } from '../services/authService';
import { User, LinkedAccounts, NotificationSettings } from '../types';

interface ProfileProps {
  user: User | null;
  onUpdateUser: (updated: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    shopName: user?.shopName || '',
    email: user?.email || '',
    location: user?.location || 'Dhaka, Bangladesh',
    bio: user?.bio || 'Handmade crafts with love.',
    phone: user?.phone || '+880 1XXX-XXXXXX'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(user?.notificationSettings || {
    lowStockAlerts: true,
    lowStockThreshold: 5,
    newOrderAlerts: true,
    marketingEmails: false
  });

  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<keyof LinkedAccounts | null>(null);

  const handleSave = () => {
    if (!user) return;
    onUpdateUser({ ...user, ...formData, notificationSettings });
    setStatusMessage({ type: 'success', text: 'Store preferences updated successfully!' });
  };

  const handleToggleLink = async (platform: keyof LinkedAccounts) => {
    if (!user) return;
    setStatusMessage(null);

    if (user.linkedAccounts[platform]) {
      if (pendingUnlink !== platform) {
        setPendingUnlink(platform);
        return;
      }
      setPendingUnlink(null);
      onUpdateUser({
        ...user,
        linkedAccounts: { ...user.linkedAccounts, [platform]: false }
      });
      setStatusMessage({ type: 'success', text: `${platform} disconnected.` });
      return;
    }

    setIsLinking(platform);
    try {
      if (platform === 'facebook' || platform === 'instagram') {
        await authService.socialLogin('facebook', true, formData.shopName);
      } else if (platform === 'google') {
        await authService.socialLogin('google', true, formData.shopName);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      onUpdateUser({
        ...user,
        linkedAccounts: { ...user.linkedAccounts, [platform]: true }
      });
      setStatusMessage({ type: 'success', text: `${platform} connected successfully.` });
    } catch {
      setStatusMessage({ type: 'error', text: 'Authentication failed. Please try again.' });
    } finally {
      setIsLinking(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Store Settings</h2>
        <p className="text-slate-600 text-lg font-medium">Configure your presence across the digital ecosystem.</p>
      </header>

      {statusMessage && (
        <div className={`p-5 rounded-3xl border flex items-center justify-between ${statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span className="font-bold text-sm">{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-black uppercase tracking-widest opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-[48px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-64 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 relative">
           <div className="absolute -bottom-16 left-16">
              <div className="w-40 h-40 rounded-[40px] bg-white border-8 border-white shadow-2xl flex items-center justify-center overflow-hidden relative group">
                 {user?.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />
                 ) : (
                    <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 text-6xl font-black">
                      {formData.shopName.charAt(0)}
                    </div>
                 )}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Camera className="text-white w-10 h-10" />
                 </div>
              </div>
           </div>
        </div>

        <div className="pt-24 px-16 pb-16 space-y-16">
           {/* Basic Info */}
           <section className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <ProfileInput 
                    label="Registered Shop Name" 
                    value={formData.shopName} 
                    onChange={v => setFormData({...formData, shopName: v})} 
                    icon={<ShoppingBag className="w-5 h-5" />} 
                  />
                  <ProfileInput 
                    label="Store Location" 
                    value={formData.location} 
                    onChange={v => setFormData({...formData, location: v})} 
                    icon={<MapPin className="w-5 h-5" />} 
                  />
                  <ProfileInput 
                    label="Admin Email" 
                    value={formData.email} 
                    onChange={v => setFormData({...formData, email: v})} 
                    icon={<Mail className="w-5 h-5" />} 
                  />
                  <ProfileInput 
                    label="Support Mobile" 
                    value={formData.phone} 
                    onChange={v => setFormData({...formData, phone: v})} 
                    icon={<Smartphone className="w-5 h-5" />} 
                  />
              </div>

              <div className="space-y-4">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] ml-2">Brand Story (Bio)</label>
                  <textarea 
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    className="w-full h-40 p-8 bg-slate-50 border-2 border-slate-100 rounded-[32px] text-xl font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all resize-none shadow-inner"
                    placeholder="What makes your items unique?"
                  />
              </div>
           </section>

           {/* Notification Preferences */}
           <section className="space-y-8">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-2xl font-black text-slate-900 flex items-center">
                    <Bell className="mr-3 text-amber-500" /> Notification Preferences
                 </h3>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manage System Alerts</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className={`p-8 rounded-[32px] border-2 transition-all flex flex-col justify-between ${notificationSettings.lowStockAlerts ? 'bg-white border-amber-100' : 'bg-slate-50 border-transparent grayscale'}`}>
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center">
                          <div className={`p-4 rounded-2xl bg-white shadow-sm mr-4 ${!notificationSettings.lowStockAlerts && 'opacity-50'}`}>
                             <AlertTriangle className="text-amber-500 w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-slate-900">Low Stock Alerts</h4>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Safeguard</p>
                          </div>
                       </div>
                       <Toggle 
                          active={notificationSettings.lowStockAlerts} 
                          onClick={() => setNotificationSettings({...notificationSettings, lowStockAlerts: !notificationSettings.lowStockAlerts})} 
                       />
                    </div>
                    {notificationSettings.lowStockAlerts && (
                      <div className="pt-4 mt-4 border-t border-amber-50 animate-in slide-in-from-top-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Alert Threshold (Units)</label>
                         <div className="flex items-center space-x-4">
                            <input 
                               type="range" 
                               min="1" 
                               max="20" 
                               value={notificationSettings.lowStockThreshold} 
                               onChange={(e) => setNotificationSettings({...notificationSettings, lowStockThreshold: parseInt(e.target.value)})}
                               className="flex-1 accent-amber-500"
                            />
                            <span className="text-xl font-black text-slate-900 w-12 text-center">{notificationSettings.lowStockThreshold}</span>
                         </div>
                      </div>
                    )}
                 </div>

                 <div className={`p-8 rounded-[32px] border-2 transition-all flex items-center justify-between ${notificationSettings.newOrderAlerts ? 'bg-white border-blue-100' : 'bg-slate-50 border-transparent grayscale'}`}>
                    <div className="flex items-center">
                       <div className={`p-4 rounded-2xl bg-white shadow-sm mr-4 ${!notificationSettings.newOrderAlerts && 'opacity-50'}`}>
                          <MessageSquare className="text-blue-500 w-6 h-6" />
                       </div>
                       <div>
                          <h4 className="text-lg font-black text-slate-900">New Order Alerts</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sales Real-time Notification</p>
                       </div>
                    </div>
                    <Toggle 
                       active={notificationSettings.newOrderAlerts} 
                       onClick={() => setNotificationSettings({...notificationSettings, newOrderAlerts: !notificationSettings.newOrderAlerts})} 
                    />
                 </div>
              </div>
           </section>

           {/* API Connections */}
           <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-2xl font-black text-slate-900 flex items-center">
                    <Globe className="mr-3 text-blue-600" /> API Connections
                 </h3>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secured via Social Auth</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <AccountLinkCard 
                    name="Facebook Business" 
                    icon={<Facebook className="text-blue-600" />} 
                    connected={user?.linkedAccounts.facebook || false} 
                    loading={isLinking === 'facebook'}
                    confirmingUnlink={pendingUnlink === 'facebook'}
                    onCancelUnlink={() => setPendingUnlink(null)}
                    onToggle={() => handleToggleLink('facebook')}
                 />
                 <AccountLinkCard 
                    name="Instagram Creator" 
                    icon={<Instagram className="text-pink-500" />} 
                    connected={user?.linkedAccounts.instagram || false} 
                    loading={isLinking === 'instagram'}
                    confirmingUnlink={pendingUnlink === 'instagram'}
                    onCancelUnlink={() => setPendingUnlink(null)}
                    onToggle={() => handleToggleLink('instagram')}
                 />
                 <AccountLinkCard 
                    name="TikTok for Business" 
                    icon={<Music className="text-black" />} 
                    connected={user?.linkedAccounts.tiktok || false} 
                    loading={isLinking === 'tiktok'}
                    confirmingUnlink={pendingUnlink === 'tiktok'}
                    onCancelUnlink={() => setPendingUnlink(null)}
                    onToggle={() => handleToggleLink('tiktok')}
                 />
                 <AccountLinkCard 
                    name="Google Identity" 
                    icon={<Globe className="text-red-500" />} 
                    connected={user?.linkedAccounts.google || false} 
                    loading={isLinking === 'google'}
                    confirmingUnlink={pendingUnlink === 'google'}
                    onCancelUnlink={() => setPendingUnlink(null)}
                    onToggle={() => handleToggleLink('google')}
                 />
              </div>
           </section>

           <div className="pt-8">
              <button 
                onClick={handleSave}
                className="w-full bg-slate-900 text-white py-8 rounded-[40px] text-3xl font-black shadow-3xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center transform active:scale-[0.98] group"
              >
                <Save className="mr-4 w-8 h-8 group-hover:scale-110 transition-transform" /> Commit Secure Updates
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const ProfileInput: React.FC<{ label: string, value: string, onChange: (v: string) => void, icon: React.ReactNode }> = ({ label, value, onChange, icon }) => (
  <div className="space-y-3">
    <label className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] ml-2">{label}</label>
    <div className="relative group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-600 transition-colors">
        {icon}
      </div>
      <input 
        type="text" 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[24px] text-xl font-black text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
      />
    </div>
  </div>
);

const AccountLinkCard: React.FC<{
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  onToggle: () => void;
  loading: boolean;
  confirmingUnlink: boolean;
  onCancelUnlink: () => void;
}> = ({ name, icon, connected, onToggle, loading, confirmingUnlink, onCancelUnlink }) => (
  <div className={`p-8 rounded-[32px] border-2 flex items-center justify-between transition-all ${connected ? 'bg-white border-blue-100' : 'bg-slate-50 border-transparent grayscale'}`}>
    <div className="flex items-center">
       <div className={`p-4 rounded-2xl bg-white shadow-sm mr-6 ${!connected && 'opacity-50'}`}>
         {icon}
       </div>
       <div>
          <h4 className="text-lg font-black text-slate-900">{name}</h4>
          <p className={`text-[10px] font-black uppercase tracking-widest ${connected ? 'text-blue-600' : 'text-slate-500'}`}>
            {connected ? 'Active Handshake' : 'Offline'}
          </p>
       </div>
    </div>
    {confirmingUnlink ? (
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggle}
          className="px-4 py-2 rounded-xl font-black text-xs bg-red-600 text-white hover:bg-red-700 transition-all"
        >
          Confirm
        </button>
        <button
          onClick={onCancelUnlink}
          className="px-4 py-2 rounded-xl font-black text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
      </div>
    ) : (
      <button 
        onClick={onToggle}
        disabled={loading}
        className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center ${connected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
      >
        {loading ? 'Processing...' : connected ? 'Unlink' : 'Link API'}
        {connected && !loading && <ShieldAlert className="ml-2 w-4 h-4" />}
        {!connected && !loading && <CheckCircle2 className="ml-2 w-4 h-4" />}
      </button>
    )}
  </div>
);

const Toggle: React.FC<{ active: boolean, onClick: () => void }> = ({ active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-14 h-8 rounded-full relative transition-all flex items-center p-1 shadow-inner ${active ? 'bg-blue-600' : 'bg-slate-200'}`}
  >
    <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center ${active ? 'translate-x-6' : 'translate-x-0'}`}>
      {active && <Check className="w-3 h-3 text-blue-600 stroke-[4]" />}
    </div>
  </button>
);

export default Profile;
