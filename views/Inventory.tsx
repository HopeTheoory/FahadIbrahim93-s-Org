import React, { useState, useRef, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, AlertTriangle, Save, X, Package, Check, Camera, Image as ImageIcon, TrendingUp, DollarSign, UploadCloud, Info, AlertCircle, FileWarning, RefreshCw, CloudLightning, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Product } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onActivity: (msg: string, type: any) => void;
}

type SortConfig = {
  // Fix: changed '' to null for better type safety and to avoid assignment errors on line 38 and 48
  key: keyof Product | null;
  direction: 'asc' | 'desc' | null;
};

const Inventory: React.FC<InventoryProps> = ({ products, setProducts, onActivity }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Fix: initial state now uses null for key
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestSort = (targetKey: keyof Product) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    let newKey: keyof Product | null = targetKey;

    if (sortConfig.key === targetKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === targetKey && sortConfig.direction === 'desc') {
      direction = null;
      newKey = null;
    }
    setSortConfig({ key: newKey, direction });
  };

  const sortedProducts = useMemo(() => {
    let items = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Fix: check for null instead of empty string
    if (sortConfig.key !== null && sortConfig.direction !== null) {
      items.sort((a, b) => {
        // Fix: non-null assertion as we've checked sortConfig.key is not null
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }
        return 0;
      });
    }
    return items;
  }, [products, searchTerm, sortConfig]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0];
    setFileError(null);
    
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError(`"${file.name}" is not a supported image format. Please use JPG, PNG, or WEBP.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(`"${file.name}" exceeds the 5MB limit. Please compress the image for faster loading.`);
      return;
    }

    setIsProcessingFile(true);

    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.05) {
            reject(new Error("Network handshake failed while uploading asset."));
          } else {
            resolve(true);
          }
        }, 1500);
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, image: reader.result as string }));
        setIsProcessingFile(false);
        onActivity(`Asset "${file.name}" processed successfully`, 'inventory');
      };
      reader.onerror = () => {
        setFileError("Memory allocation failed while reading the file. Try a smaller image.");
        setIsProcessingFile(false);
      };
      reader.readAsDataURL(file);

    } catch (err: any) {
      setFileError(err.message || "An unexpected error occurred during asset synchronization.");
      setIsProcessingFile(false);
    }
  };

  const validate = (form: Partial<Product>) => {
    const newErrors: Record<string, string> = {};
    if (!form.name || form.name.trim().length === 0) newErrors.name = "A descriptive name is required";
    if (form.stock === undefined || form.stock < 0) newErrors.stock = "Quantity must be 0 or more";
    if (form.price === undefined || form.price <= 0) newErrors.price = "Enter a valid market price";
    if (form.buyingCost === undefined || form.buyingCost < 0) newErrors.buyingCost = "Enter acquisition cost";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDelete = (id: string) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    setProducts(prev => prev.filter(prod => prod.id !== id));
    onActivity(`Purged asset: ${p.name}`, 'inventory');
    setConfirmDeleteId(null);
  };

  const handleEdit = (product: Product) => {
    setIsAdding(false);
    setConfirmDeleteId(null);
    setEditingId(product.id);
    setEditForm(product);
    setErrors({});
    setFileError(null);
  };

  const handleSaveEdit = () => {
    if (editingId && validate(editForm)) {
      setProducts(prev => prev.map(p => 
        p.id === editingId 
          ? { ...p, ...editForm as Product, name: editForm.name!.trim() } 
          : p
      ));
      onActivity(`Updated listing: ${editForm.name}`, 'inventory');
      setEditingId(null);
      setEditForm({});
      setFileError(null);
    }
  };

  const handleAddNew = () => {
    if (validate(editForm)) {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: editForm.name!.trim(),
        stock: Number(editForm.stock),
        price: Number(editForm.price),
        buyingCost: Number(editForm.buyingCost),
        image: editForm.image
      };
      setProducts(prev => [...prev, newProduct]);
      onActivity(`Indexed new listing: ${newProduct.name}`, 'inventory');
      setIsAdding(false);
      setEditForm({});
      setFileError(null);
    }
  };

  const totalInvestment = products.reduce((acc, p) => acc + (p.buyingCost * p.stock), 0);
  const potentialProfit = products.reduce((acc, p) => acc + ((p.price - p.buyingCost) * p.stock), 0);

  const SortIcon = ({ column }: { column: keyof Product }) => {
    if (sortConfig.key !== column) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600" /> 
      : <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/jpeg,image/png,image/webp,image/gif" 
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Warehouse Hub</h2>
          <p className="text-slate-500 text-lg font-medium italic">Track assets, monitor margins, and optimize your inventory.</p>
        </div>
        <button 
          onClick={() => { 
            setIsAdding(true);
            setEditingId(null);
            setConfirmDeleteId(null);
            setEditForm({ name: '', stock: 0, price: 0, buyingCost: 0 }); 
            setFileError(null);
            setErrors({});
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-[24px] font-black text-lg flex items-center shadow-2xl shadow-blue-100 transition-all transform hover:scale-105 active:scale-95"
        >
          <Plus className="mr-3 w-6 h-6" /> Create New Listing
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-8 h-8 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Quick search by name or SKU..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-20 pr-10 py-7 bg-white border-4 border-transparent rounded-[32px] text-2xl font-black text-slate-900 focus:border-blue-100 outline-none transition-all shadow-sm"
        />
      </div>

      {fileError && (
        <div className="bg-red-50 border-2 border-red-100 p-8 rounded-[40px] flex items-center space-x-6 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-red-100/50">
          <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 shrink-0">
            <CloudLightning className="w-8 h-8 animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-red-900 text-sm uppercase tracking-widest mb-1">Asset Sync Failed</h4>
            <p className="text-red-700 font-bold text-lg leading-tight">{fileError}</p>
          </div>
          <button onClick={() => setFileError(null)} className="p-4 hover:bg-red-200/50 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-red-400" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] border-b border-slate-100">
                <th className="px-10 py-8 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => requestSort('name')}>
                  <div className="flex items-center">Product Asset <SortIcon column="name" /></div>
                </th>
                <th className="px-10 py-8 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => requestSort('stock')}>
                  <div className="flex items-center">Units <SortIcon column="stock" /></div>
                </th>
                <th className="px-10 py-8 text-center cursor-pointer hover:text-blue-600 transition-colors" onClick={() => requestSort('buyingCost')}>
                  <div className="flex items-center justify-center">Cost Analysis <SortIcon column="buyingCost" /></div>
                </th>
                <th className="px-10 py-8 text-center cursor-pointer hover:text-blue-600 transition-colors" onClick={() => requestSort('price')}>
                  <div className="flex items-center justify-center">Selling Market <SortIcon column="price" /></div>
                </th>
                <th className="px-10 py-8 text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isAdding && (
                <tr className="bg-blue-50/50 animate-in slide-in-from-top-4">
                   <td className="px-10 py-8">
                     <div className="flex items-center space-x-6">
                       <button 
                         onClick={() => !isProcessingFile && fileInputRef.current?.click()}
                         onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                         onDragLeave={() => setIsDragging(false)}
                         onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileChange({ target: { files: e.dataTransfer.files } } as any); }}
                         disabled={isProcessingFile}
                         className={`w-24 h-24 rounded-3xl flex items-center justify-center border-4 border-dashed transition-all overflow-hidden shrink-0 group relative ${isDragging ? 'bg-blue-200 border-blue-600 scale-110' : fileError ? 'border-red-300 bg-red-50' : 'bg-white border-blue-100 hover:border-blue-400'}`}
                       >
                         {isProcessingFile ? (
                           <div className="flex flex-col items-center justify-center">
                             <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-1" />
                             <span className="text-[8px] font-black text-blue-400 uppercase">Syncing</span>
                           </div>
                         ) : editForm.image ? (
                           <>
                             <img src={editForm.image} className="w-full h-full object-cover" alt="Preview" />
                             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <RefreshCw className="text-white w-6 h-6" />
                             </div>
                           </>
                         ) : (
                           <UploadCloud className={`w-10 h-10 ${fileError ? 'text-red-300' : 'text-blue-300'}`} />
                         )}
                       </button>
                       <div className="flex-1 space-y-1">
                         <input 
                           className={`p-4 border-2 rounded-2xl w-full font-bold text-lg text-slate-900 outline-none focus:border-blue-500 ${errors.name ? 'border-red-300' : 'border-white'}`} 
                           placeholder="Listing Title" 
                           value={editForm.name ?? ''} 
                           onChange={e => setEditForm({...editForm, name: e.target.value})}
                         />
                         {errors.name && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">{errors.name}</p>}
                       </div>
                     </div>
                   </td>
                   <td className="px-10 py-8">
                      <input 
                        className={`p-4 border-2 rounded-2xl w-24 font-bold text-lg text-slate-900 outline-none focus:border-blue-500 ${errors.stock ? 'border-red-300' : 'border-white'}`} 
                        type="number" 
                        value={editForm.stock ?? 0} 
                        onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})}
                      />
                   </td>
                   <td className="px-10 py-8">
                      <input 
                        className={`p-4 border-2 rounded-2xl w-32 mx-auto block font-bold text-lg text-slate-900 outline-none focus:border-blue-500 text-center ${errors.buyingCost ? 'border-red-300' : 'border-white'}`} 
                        type="number" 
                        placeholder="Cost ৳" 
                        value={editForm.buyingCost ?? 0} 
                        onChange={e => setEditForm({...editForm, buyingCost: parseInt(e.target.value) || 0})}
                      />
                   </td>
                   <td className="px-10 py-8">
                      <input 
                        className={`p-4 border-2 rounded-2xl w-32 mx-auto block font-bold text-lg text-slate-900 outline-none focus:border-blue-500 text-center ${errors.price ? 'border-red-300' : 'border-white'}`} 
                        type="number" 
                        placeholder="Sell ৳" 
                        value={editForm.price ?? 0} 
                        onChange={e => setEditForm({...editForm, price: parseInt(e.target.value) || 0})}
                      />
                   </td>
                   <td className="px-10 py-8 text-right space-x-3">
                     <button onClick={handleAddNew} className="p-4 bg-green-500 text-white rounded-2xl shadow-lg hover:bg-green-600 transition-all"><Check className="w-6 h-6" /></button>
                     <button onClick={() => { setIsAdding(false); setFileError(null); setEditForm({}); }} className="p-4 bg-slate-400 text-white rounded-2xl shadow-lg hover:bg-slate-500 transition-all"><X className="w-6 h-6" /></button>
                   </td>
                </tr>
              )}
              {sortedProducts.map(product => (
                editingId === product.id ? (
                  <tr key={product.id} className="bg-blue-50/30 animate-in fade-in">
                    <td className="px-10 py-8">
                      <div className="flex items-center space-x-6">
                        <button 
                          onClick={() => !isProcessingFile && fileInputRef.current?.click()}
                          disabled={isProcessingFile}
                          className={`w-24 h-24 rounded-3xl flex items-center justify-center border-4 border-dashed transition-all overflow-hidden shrink-0 group relative ${fileError ? 'border-red-300 bg-red-50' : 'bg-white border-blue-200 hover:border-blue-500'}`}
                        >
                          {isProcessingFile ? (
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                          ) : editForm.image ? (
                            <>
                              <img src={editForm.image} className="w-full h-full object-cover" alt="Preview" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white w-6 h-6" />
                              </div>
                            </>
                          ) : (
                            <UploadCloud className="w-8 h-8 text-blue-300" />
                          )}
                        </button>
                        <div className="flex-1">
                           <input 
                            className={`p-4 border-2 rounded-2xl w-full font-bold text-lg text-slate-900 outline-none focus:border-blue-500 ${errors.name ? 'border-red-300' : 'border-slate-100'}`} 
                            value={editForm.name ?? ''} 
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <input 
                        className={`p-4 border-2 rounded-2xl w-24 font-bold text-lg text-slate-900 outline-none focus:border-blue-500 ${errors.stock ? 'border-red-300' : 'border-slate-100'}`} 
                        type="number" 
                        value={editForm.stock ?? 0} 
                        onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})}
                      />
                    </td>
                    <td className="px-10 py-8">
                       <input 
                        className={`p-4 border-2 rounded-2xl w-32 mx-auto block font-bold text-lg text-slate-900 outline-none focus:border-blue-500 text-center ${errors.buyingCost ? 'border-red-300' : 'border-slate-100'}`} 
                        type="number" 
                        value={editForm.buyingCost ?? 0} 
                        onChange={e => setEditForm({...editForm, buyingCost: parseInt(e.target.value) || 0})}
                      />
                    </td>
                    <td className="px-10 py-8">
                       <input 
                        className={`p-4 border-2 rounded-2xl w-32 mx-auto block font-bold text-lg text-slate-900 outline-none focus:border-blue-500 text-center ${errors.price ? 'border-red-300' : 'border-slate-100'}`} 
                        type="number" 
                        value={editForm.price ?? 0} 
                        onChange={e => setEditForm({...editForm, price: parseInt(e.target.value) || 0})}
                      />
                    </td>
                    <td className="px-10 py-8 text-right space-x-3">
                       <button onClick={handleSaveEdit} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-md"><Save className="w-5 h-5" /></button>
                       <button onClick={() => { setEditingId(null); setFileError(null); setEditForm({}); }} className="p-4 bg-slate-200 text-slate-600 rounded-2xl hover:bg-slate-300 transition-all"><X className="w-5 h-5" /></button>
                    </td>
                  </tr>
                ) : (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-8">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-black text-2xl border-4 border-white shadow-sm overflow-hidden shrink-0">
                          {product.image ? <img src={product.image} className="w-full h-full object-cover" alt={product.name} /> : product.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-2xl text-slate-800 tracking-tight">{product.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">SKU: SE-{product.id.slice(-4).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center">
                        <span className={`text-3xl font-black ${product.stock < 5 ? 'text-red-500' : 'text-slate-900'}`}>{product.stock}</span>
                        {product.stock < 5 && <AlertTriangle className="ml-2 w-4 h-4 text-red-500 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center text-slate-400 font-bold text-xl tracking-tighter">৳{product.buyingCost.toLocaleString()}</td>
                    <td className="px-10 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-blue-600 tracking-tighter">৳{product.price.toLocaleString()}</span>
                        <div className="flex items-center text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                          <TrendingUp className="w-2.5 h-2.5 mr-1" /> ৳{(product.price - product.buyingCost).toLocaleString()} profit
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      {confirmDeleteId === product.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => handleDelete(product.id)} className="px-4 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-3">
                          <button onClick={() => handleEdit(product)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 className="w-5 h-5" /></button>
                          <button onClick={() => setConfirmDeleteId(product.id)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 text-xs font-black text-slate-300 uppercase tracking-widest">
         <div className="flex items-center group cursor-help">
            <Info className="w-4 h-4 mr-2 group-hover:text-blue-500" /> Catalog: {products.length} Items
         </div>
         <div className="flex items-center">
            <DollarSign className="w-4 h-4 mr-2" /> Investment: <span className="text-slate-500 ml-1">৳{totalInvestment.toLocaleString()}</span>
         </div>
         <div className="flex items-center text-emerald-500">
            <TrendingUp className="w-4 h-4 mr-2" /> Projected Profit: ৳{potentialProfit.toLocaleString()}
         </div>
      </div>
    </div>
  );
};

export default Inventory;
