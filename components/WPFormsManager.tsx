import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Plus, Edit, Trash2, Eye, Save, Settings, 
  Check, FileText, Layout, X, PlusCircle, ArrowUp, ArrowDown,
  Inbox, HelpCircle, RefreshCw, Send, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface CustomForm {
  id: string;
  name: string;
  description: string;
  status: 'Published' | 'Draft';
  fields: FormField[];
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  submittedAt: string;
  data: Record<string, any>;
}

interface WPFormsManagerProps {
  onClose: () => void;
  isDarkMode?: boolean;
}

const DEFAULT_FORMS: CustomForm[] = [
  {
    id: 'default-feedback',
    name: 'Customer Feedback Survey',
    description: 'Gather insights regarding premium apparel drops, fitment accuracy, and overall satisfaction.',
    status: 'Published',
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'f1', label: 'Full Name', type: 'text', required: true, placeholder: 'ENTER YOUR DESIGNATION' },
      { id: 'f2', label: 'Email Protocol', type: 'email', required: true, placeholder: 'NAME@DOMAIN.COM' },
      { id: 'f3', label: 'Preferred Fit', type: 'select', required: true, options: ['Over-sized Tech', 'Slim Modern', 'Standard Traditional'], placeholder: 'SELECT FITMENT' },
      { id: 'f4', label: 'Evaluation Details', type: 'textarea', required: false, placeholder: 'SHARE YOUR DISCIPLINE FEEDBACK HERE' },
      { id: 'f5', label: 'Opt-in for Exclusive Droplists', type: 'checkbox', required: false }
    ]
  },
  {
    id: 'default-preorder',
    name: 'VIP Capsule Pre-Order',
    description: 'Collect configuration guidelines from elite streetwear selectors for upcoming limited drops.',
    status: 'Draft',
    createdAt: new Date().toISOString(),
    fields: [
      { id: 'p1', label: 'Membership Level', type: 'select', required: true, options: ['Tier-1 Stylist', 'Tier-2 Collector', 'General Public'] },
      { id: 'p2', label: 'Street Weight (kg)', type: 'number', required: true, placeholder: 'ENTER MASS IN KG' },
      { id: 'p3', label: 'Direct Shipping Corridor', type: 'textarea', required: true, placeholder: 'COMPLETE DISPATCH ACCORD' }
    ]
  }
];

export default function WPFormsManager({ onClose, isDarkMode = true }: WPFormsManagerProps) {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation states: 'list' | 'create' | 'edit' | 'preview' | 'submissions'
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'preview' | 'submissions'>('list');
  
  // Selected Form for Edit/Preview/Submissions
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  
  // Form Builder state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<'Published' | 'Draft'>('Published');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  
  // Preview State (Input logs)
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFormsAndSubmissions();
  }, []);

  const fetchFormsAndSubmissions = async () => {
    setLoading(true);
    try {
      // 1. Fetch Forms
      const formsCol = collection(db, 'custom_forms');
      const formsSnapshot = await getDocs(formsCol);
      let formsList: CustomForm[] = [];
      
      if (formsSnapshot.empty) {
        // Hydrate with default forms first time
        for (const f of DEFAULT_FORMS) {
          await setDoc(doc(db, 'custom_forms', f.id), f);
          formsList.push(f);
        }
      } else {
        formsSnapshot.forEach(docSnap => {
          formsList.push(docSnap.data() as CustomForm);
        });
      }
      
      // Sort items
      formsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setForms(formsList);

      // 2. Fetch Submissions
      const subsCol = collection(db, 'custom_form_submissions');
      const subsSnapshot = await getDocs(subsCol);
      const subsList: FormSubmission[] = [];
      subsSnapshot.forEach(docSnap => {
        subsList.push(docSnap.data() as FormSubmission);
      });
      subsList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setSubmissions(subsList);
      
    } catch (error) {
      console.error("Error fetching form infrastructure:", error);
      // Fallback local memory state
      setForms(DEFAULT_FORMS);
    } finally {
      setLoading(false);
    }
  };

  // Start building new Form
  const triggerCreateNewForm = () => {
    setFormName('');
    setFormDesc('');
    setFormStatus('Published');
    setFormFields([
      { id: 'f_init_1', label: 'Full Name', type: 'text', required: true, placeholder: 'ENTER FULL NAME' },
      { id: 'f_init_2', label: 'Email Address', type: 'email', required: true, placeholder: 'SECURE_REACH_PROTOCOL' }
    ]);
    setSelectedForm(null);
    setCurrentView('create');
  };

  // Start Editing existing form
  const triggerEditForm = (form: CustomForm) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormDesc(form.description);
    setFormStatus(form.status);
    setFormFields([...form.fields]);
    setCurrentView('edit');
  };

  // Save / Update Form Action
  const handleSaveForm = async () => {
    if (!formName.trim()) return;

    const finalId = selectedForm ? selectedForm.id : 'form_' + Math.random().toString(36).substring(2, 11);
    const newFormObj: CustomForm = {
      id: finalId,
      name: formName,
      description: formDesc,
      status: formStatus,
      fields: formFields.map(f => ({
        ...f,
        id: f.id || 'field_' + Math.random().toString(36).substring(2, 9)
      })),
      createdAt: selectedForm ? selectedForm.createdAt : new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'custom_forms', finalId), newFormObj);
      
      // Re-fetch
      await fetchFormsAndSubmissions();
      setCurrentView('list');
    } catch (e) {
      console.error("Save Form Error:", e);
      // Local state fallback
      setForms(prev => {
        const other = prev.filter(f => f.id !== finalId);
        return [newFormObj, ...other];
      });
      setCurrentView('list');
    }
  };

  // Delete Form Action
  const handleDeleteForm = async (id: string) => {
    if (!window.confirm("ARE YOU ABSOLUTELY RESOLVED TO DELETE THIS FORM SPECIFICATION?")) return;
    try {
      await deleteDoc(doc(db, 'custom_forms', id));
      await fetchFormsAndSubmissions();
    } catch (e) {
      console.error(e);
      setForms(prev => prev.filter(f => f.id !== id));
    }
  };

  // Form Fields modifications
  const addFieldToForm = () => {
    const newF: FormField = {
      id: 'field_' + Math.random().toString(36).substring(2, 9),
      label: 'New Variable Header',
      type: 'text',
      required: false,
      placeholder: 'VARIABLE DESCRIPTION'
    };
    setFormFields([...formFields, newF]);
  };

  const removeFieldFromForm = (idx: number) => {
    const backup = [...formFields];
    backup.splice(idx, 1);
    setFormFields(backup);
  };

  const updateFieldDetails = (idx: number, updated: Partial<FormField>) => {
    const backup = [...formFields];
    backup[idx] = { ...backup[idx], ...updated };
    setFormFields(backup);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formFields.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...formFields];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setFormFields(copy);
  };

  // Triggering the Previewer
  const triggerPreviewForm = (form: CustomForm) => {
    setSelectedForm(form);
    setPreviewValues({});
    setPreviewErrors({});
    setSubmissionSuccess(false);
    setCurrentView('preview');
  };

  // Handle Form field inputs during preview
  const handlePreviewInputChange = (fieldId: string, value: any) => {
    setPreviewValues(prev => ({ ...prev, [fieldId]: value }));
    if (previewErrors[fieldId]) {
      setPreviewErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  // Handle simulated form submissions
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    let errors: Record<string, string> = {};
    selectedForm.fields.forEach(field => {
      const val = previewValues[field.id];
      if (field.required) {
        if (field.type === 'checkbox') {
          if (!val) errors[field.id] = `Validation error: ${field.label} is required.`;
        } else {
          if (!val || !val.toString().trim()) {
            errors[field.id] = `Validation error: ${field.label} is required.`;
          }
        }
      }
      if (val && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[field.id] = 'Must enter a valid email format.';
      }
    });

    if (Object.keys(errors).length > 0) {
      setPreviewErrors(errors);
      return;
    }

    setLoading(true);
    // Write submission to Firestore
    const newSubmissionId = 'sub_' + Math.random().toString(36).substring(2, 11);
    const mockSubmission: FormSubmission = {
      id: newSubmissionId,
      formId: selectedForm.id,
      formName: selectedForm.name,
      submittedAt: new Date().toISOString(),
      data: previewValues
    };

    try {
      await setDoc(doc(db, 'custom_form_submissions', newSubmissionId), mockSubmission);
      setSubmissions(prev => [mockSubmission, ...prev]);
      setSubmissionSuccess(true);
      setPreviewValues({});
    } catch (err) {
      console.error(err);
      // Local fallback
      setSubmissions(prev => [mockSubmission, ...prev]);
      setSubmissionSuccess(true);
      setPreviewValues({});
    } finally {
      setLoading(false);
    }
  };

  // Filter forms based on search query
  const filteredForms = forms.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-300 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
      {/* Upper Navigation Row */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div>
          <div className="flex items-center gap-3">
            <button 
              onClick={currentView === 'list' ? onClose : () => setCurrentView('list')}
              className={`p-2 rounded-none transition-colors border ${isDarkMode ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950'}`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#0055ff]" />
                WP_Forms_Engine
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase mt-0.5 tracking-wider font-mono">
                {currentView === 'list' && 'EMULATOR PROTOCOL v4.2.0-STABLE'}
                {currentView === 'create' && 'INITIALIZING NEW SPECIFICATION ARCHIVE'}
                {currentView === 'edit' && `RECONFIGURING STRUCTURAL GRID: ${selectedForm?.name.toUpperCase()}`}
                {currentView === 'preview' && `INTERACTIVE SIMULATOR HUB: ${selectedForm?.name.toUpperCase()}`}
                {currentView === 'submissions' && 'SUBMITTED FORM RECORDS & AUDITING'}
              </p>
            </div>
          </div>
        </div>

        {/* View Switches */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {currentView === 'list' && (
            <>
              <button 
                onClick={() => setCurrentView('submissions')}
                className={`flex-1 md:flex-initial px-5 py-3 border font-mono text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isDarkMode 
                    ? 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40 text-zinc-300' 
                    : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 text-zinc-400" />
                Audited_Inbox ({submissions.length})
              </button>
              
              <button 
                onClick={triggerCreateNewForm}
                className="flex-1 md:flex-initial px-6 py-3 bg-[#0055ff] hover:brightness-110 text-white font-mono text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,85,255,0.2)]"
              >
                <Plus className="w-3.5 h-3.5" />
                Compose_New_Form
              </button>
            </>
          )}

          {currentView !== 'list' && (
            <button 
              onClick={() => setCurrentView('list')}
              className={`px-5 py-3 border font-mono text-[9px] font-black uppercase tracking-wider transition-all ${
                isDarkMode 
                  ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white' 
                  : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Exile_to_Index
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* VIEW 1: FORMS LIST */}
        {currentView === 'list' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Search Filter Banner */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="FILTER SPECIFICATION CODES..."
                  className={`w-full pl-11 pr-4 py-3.5 text-xs font-mono font-bold tracking-wider rounded-none uppercase transition-all ${
                    isDarkMode 
                      ? 'bg-zinc-950 border border-zinc-800 text-white focus:border-[#0055ff]' 
                      : 'bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                  }`}
                />
              </div>
              <button 
                onClick={fetchFormsAndSubmissions}
                className={`p-3.5 border transition-all ${
                  isDarkMode 
                    ? 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400' 
                    : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600'
                }`}
                title="Refresh from cloud repository"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 font-mono">
                <RefreshCw className="w-8 h-8 text-[#0055ff] animate-spin" />
                <p className="text-[10px] uppercase text-zinc-500 tracking-widest">Awaiting central directory syncing...</p>
              </div>
            ) : filteredForms.length === 0 ? (
              <div className={`p-12 border border-dashed rounded-none text-center ${isDarkMode ? 'border-zinc-800 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/50'}`}>
                <HelpCircle className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                <p className="font-mono text-xs font-black uppercase text-zinc-400">Zero matching form specifications isolated.</p>
                <p className="font-mono text-[9px] text-zinc-500 mt-1 uppercase">Click 'Compose New Form' to write customized directives.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredForms.map(form => (
                  <div 
                    key={form.id} 
                    className={`border p-6 flex flex-col justify-between transition-all group ${
                      isDarkMode 
                        ? 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700' 
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2 border border-blue-500/10 bg-[#0055ff]/5 text-[#0055ff]">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className={`text-[8.5px] font-mono font-black uppercase tracking-wider px-2 py-0.5 ${
                          form.status === 'Published' 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {form.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-tight">{form.name}</h4>
                      <p className={`text-xs mt-2 line-clamp-2 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{form.description}</p>
                      
                      <div className={`border-t my-4 pt-4 space-y-1.5 font-mono text-[9px] ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-100'}`}>
                        <div className="flex justify-between opacity-65">
                          <span>REGULAR_FIELDS:</span>
                          <span className="font-bold text-[#0055ff]">{form.fields.length} VARIABLES</span>
                        </div>
                        <div className="flex justify-between opacity-65">
                          <span>REQUIRED_RELAIS:</span>
                          <span className="font-bold text-rose-400">{form.fields.filter(f => f.required).length} COMPULSORY</span>
                        </div>
                      </div>
                    </div>

                    <div className={`flex gap-2 border-t pt-4 ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-100'}`}>
                      <button 
                        onClick={() => triggerPreviewForm(form)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 border font-mono text-[8px] font-black uppercase tracking-wider transition-all ${
                          isDarkMode 
                            ? 'border-[#0055ff]/20 bg-[#0055ff]/5 hover:bg-[#0055ff]/15 text-[#0055ff]' 
                            : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
                        }`}
                        title="Simulate / Run Form"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                      <button 
                        onClick={() => triggerEditForm(form)}
                        className={`p-2 border font-mono text-[8.5px] font-black uppercase transition-all ${
                          isDarkMode 
                            ? 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/30 text-zinc-300' 
                            : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'
                        }`}
                        title="Edit logic fields"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Only protect defaults from hard deletion if needed, but allow deleting */}
                      <button 
                        onClick={() => handleDeleteForm(form.id)}
                        className={`p-2 border font-mono transition-all ${
                          isDarkMode 
                            ? 'border-zinc-800 hover:border-rose-950/50 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400' 
                            : 'border-zinc-200 hover:bg-rose-50 text-zinc-400 hover:text-rose-600'
                        }`}
                        title="Permanently remove form"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: FORM COMPOSING / EDITING (VISUAL BUILDER) */}
        {(currentView === 'create' || currentView === 'edit') && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Structural Fields List (Left & Middle Columns) */}
            <div className="lg:col-span-2 space-y-6">
              <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#0055ff]">
                    Field_Registry_Mapping
                  </h3>
                  <button 
                    onClick={addFieldToForm}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0055ff] hover:brightness-110 text-white font-mono text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    <PlusCircle className="w-3 h-3" /> Add_Custom_Variable
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                  {formFields.length === 0 ? (
                    <div className="py-10 text-center opacity-40 uppercase font-mono text-[10px]">
                      No custom logic variables defined. Click "Add Custom Variable" to expand.
                    </div>
                  ) : (
                    formFields.map((field, idx) => (
                      <div 
                        key={field.id} 
                        className={`p-4 border transition-all ${
                          isDarkMode 
                            ? 'bg-zinc-900/30 border-zinc-800/80 focus-within:border-zinc-700' 
                            : 'bg-zinc-50 border-zinc-200 focus-within:border-zinc-300'
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          {/* Label input */}
                          <div className="md:col-span-4 space-y-1">
                            <span className="text-[8px] font-mono font-black uppercase opacity-50">Variable_Label</span>
                            <input 
                              type="text"
                              value={field.label}
                              onChange={(e) => updateFieldDetails(idx, { label: e.target.value })}
                              className={`w-full p-2 text-xs font-bold uppercase rounded-none border ${
                                isDarkMode 
                                  ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                                  : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                              }`}
                            />
                          </div>

                          {/* Variable Type dropdown */}
                          <div className="md:col-span-3 space-y-1">
                            <span className="text-[8px] font-mono font-black uppercase opacity-50">Validation_Schema</span>
                            <select 
                              value={field.type}
                              onChange={(e) => updateFieldDetails(idx, { type: e.target.value as any })}
                              className={`w-full p-2 text-xs font-bold uppercase rounded-none border ${
                                isDarkMode 
                                  ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                                  : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                              }`}
                            >
                              <option value="text">Text Protocol</option>
                              <option value="email">Email Secure</option>
                              <option value="number">Numeric mass</option>
                              <option value="textarea">Extended Textarea</option>
                              <option value="select">Dropdown Choice</option>
                              <option value="checkbox">Binary Checkbox</option>
                            </select>
                          </div>

                          {/* Placeholder/Options depending on type */}
                          <div className="md:col-span-3 space-y-1">
                            {field.type === 'select' ? (
                              <>
                                <span className="text-[8px] font-mono font-black uppercase opacity-50">CSV Choices (Comma separated)</span>
                                <input 
                                  type="text"
                                  value={field.options?.join(', ') || ''}
                                  onChange={(e) => updateFieldDetails(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                  placeholder="Choice A, Choice B"
                                  className={`w-full p-2 text-xs font-bold uppercase rounded-none border ${
                                    isDarkMode 
                                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                                      : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                                  }`}
                                />
                              </>
                            ) : field.type === 'checkbox' ? (
                              <div className="pt-4 flex items-center gap-2">
                                <span className="text-[8px] font-mono font-black uppercase opacity-50">No properties</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-[8px] font-mono font-black uppercase opacity-50">Placeholder hints</span>
                                <input 
                                  type="text"
                                  value={field.placeholder || ''}
                                  onChange={(e) => updateFieldDetails(idx, { placeholder: e.target.value })}
                                  placeholder="VAL INT HINT"
                                  className={`w-full p-2 text-xs font-bold uppercase rounded-none border ${
                                    isDarkMode 
                                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                                      : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                                  }`}
                                />
                              </>
                            )}
                          </div>

                          {/* Controls (Required toggle, Move, Delete) */}
                          <div className="md:col-span-2 flex items-center justify-end gap-1 px-1 py-1">
                            <button 
                              onClick={() => updateFieldDetails(idx, { required: !field.required })}
                              className={`px-1.5 py-2 font-mono text-[8px] font-black uppercase border transition-colors ${
                                field.required 
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                              }`}
                              title="Toggle Required status"
                            >
                              REQ
                            </button>

                            <button 
                              onClick={() => moveField(idx, 'up')}
                              disabled={idx === 0}
                              className={`p-1.5 border border-zinc-800/80 bg-zinc-950 text-zinc-400 hover:text-white disabled:opacity-20`}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => moveField(idx, 'down')}
                              disabled={idx === formFields.length - 1}
                              className={`p-1.5 border border-zinc-800/80 bg-zinc-950 text-zinc-400 hover:text-white disabled:opacity-20`}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>

                            <button 
                              onClick={() => removeFieldFromForm(idx)}
                              className={`p-1.5 border border-zinc-800/80 bg-zinc-950 text-zinc-400 hover:text-rose-500 hover:border-rose-950/50 transition-colors`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Form General Settings Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'} space-y-5`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0055ff] border-b border-zinc-800 pb-3">
                  Directive_MetaData
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Form_Subject_Name</label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="E.G. CUSTOM CAPELLA INTAKE"
                    className={`w-full p-3 text-xs font-bold uppercase rounded-none border focus:outline-none ${
                      isDarkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                        : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Operational_Description</label>
                  <textarea 
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="DEFINE RECIPIENTS TARGET DISCIPLINE..."
                    rows={4}
                    className={`w-full p-3 text-xs font-bold uppercase rounded-none border focus:outline-none ${
                      isDarkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                        : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Release_Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setFormStatus('Published')}
                      className={`py-3.5 text-center font-mono text-[9px] font-black uppercase tracking-widest border transition-all ${
                        formStatus === 'Published'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                          : 'border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      PUBLISHED
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormStatus('Draft')}
                      className={`py-3.5 text-center font-mono text-[9px] font-black uppercase tracking-widest border transition-all ${
                        formStatus === 'Draft'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : 'border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      DRAFT_MODE
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleSaveForm}
                  disabled={!formName.trim()}
                  className="w-full py-4 bg-[#0055ff] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_8px_20px_rgba(0,85,255,0.3)] flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save_Form_Directive
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: SIMULATED FORM RUNTIME (PREVIEW) */}
        {currentView === 'preview' && selectedForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Real Rendered Form Canvas (Left & Middle Columns) */}
            <div className="lg:col-span-2 space-y-6">
              <div className={`p-6 md:p-8 border ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                
                {submissionSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-16 text-center space-y-4 max-w-md mx-auto"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
                      <Check className="w-8 h-8" strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">SUBMISSION_TRANSMITTED</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Your form parameters have been packaged successfully and synchronized into the secure Cloud Relais directory. Custom action hooks successfully resolved.
                    </p>
                    <button 
                      onClick={() => setSubmissionSuccess(false)}
                      className="px-6 py-3 border border-zinc-800 bg-zinc-950 font-mono text-[8px] font-black uppercase tracking-widest text-[#0055ff] hover:text-white hover:bg-[#0055ff] transition-all"
                    >
                      Trigger_Another_Input
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handlePreviewSubmit} className="space-y-6">
                    <div className="border-b pb-4 mb-4 border-zinc-800/50">
                      <h3 className="text-lg font-black uppercase tracking-tight text-[#0055ff]">{selectedForm.name}</h3>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{selectedForm.description}</p>
                    </div>

                    <div className="space-y-5">
                      {selectedForm.fields.map(field => {
                        const hasErr = previewErrors[field.id];
                        return (
                          <div key={field.id} className="space-y-1.5">
                            <label className="text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1">
                              {field.label}
                              {field.required && <span className="text-rose-500 text-xs">*</span>}
                            </label>

                            {field.type === 'textarea' ? (
                              <textarea 
                                value={previewValues[field.id] || ''}
                                onChange={(e) => handlePreviewInputChange(field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                                rows={3}
                                className={`w-full p-3 text-xs font-bold uppercase rounded-none border focus:outline-none ${
                                  hasErr 
                                    ? 'border-rose-500 bg-rose-950/5' 
                                    : isDarkMode 
                                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                                }`}
                              />
                            ) : field.type === 'select' ? (
                              <select 
                                value={previewValues[field.id] || ''}
                                onChange={(e) => handlePreviewInputChange(field.id, e.target.value)}
                                className={`w-full p-3 text-xs font-bold uppercase rounded-none border focus:outline-none ${
                                  hasErr 
                                    ? 'border-rose-500 bg-rose-950/5' 
                                    : isDarkMode 
                                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                                }`}
                              >
                                <option value="">{field.placeholder || 'SELECT CHOICE'}</option>
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                                ))}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-3 py-1">
                                <button 
                                  type="button"
                                  onClick={() => handlePreviewInputChange(field.id, !previewValues[field.id])}
                                  className={`w-5 h-5 rounded-none border flex items-center justify-center transition-all ${
                                    previewValues[field.id] 
                                      ? 'bg-[#0055ff] border-[#0055ff]' 
                                      : 'bg-zinc-950 border-zinc-800'
                                  }`}
                                >
                                  {previewValues[field.id] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                </button>
                                <span className={`text-[10px] font-mono select-none ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>I authorize this binary toggle data parameter.</span>
                              </div>
                            ) : (
                              <input 
                                type={field.type} 
                                value={previewValues[field.id] || ''}
                                onChange={(e) => handlePreviewInputChange(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                                placeholder={field.placeholder || ''}
                                className={`w-full p-3 text-xs font-bold uppercase rounded-none border focus:outline-none ${
                                  hasErr 
                                    ? 'border-rose-500 bg-rose-950/5' 
                                    : isDarkMode 
                                      ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#0055ff]' 
                                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#0055ff]'
                                }`}
                              />
                            )}

                            {hasErr && (
                              <p className="text-[8px] text-rose-500 font-mono uppercase font-black flex items-center gap-1 mt-1 justify-end">
                                <AlertCircle className="w-3 h-3" /> {hasErr}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-4 bg-[#0055ff] hover:brightness-110 text-white font-mono text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_8px_20px_rgba(0,85,255,0.3)] flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit_Interactive_Form_Log
                    </button>
                  </form>
                )}

              </div>
            </div>

            {/* Simulated Live Form Analytics / Parameters debugger (Right Column) */}
            <div className="lg:col-span-1 space-y-6">
              <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'} space-y-4`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0055ff] border-b border-zinc-800 pb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 animate-spin" />
                  Terminal_Inspector
                </h3>
                <p className="text-[9px] leading-relaxed uppercase opacity-65 font-mono">
                  Observing variable configurations live payload stream during input validation checks:
                </p>

                <div className="bg-black text-emerald-500 p-4 font-mono text-[10px] space-y-2 rounded-none overflow-x-auto select-all max-h-[40vh] border border-zinc-800/80">
                  <div className="text-zinc-500">// CURRENT OBJECT STATE:</div>
                  <pre>{JSON.stringify(previewValues, null, 2)}</pre>
                  {Object.keys(previewErrors).length > 0 && (
                    <div className="text-rose-500 pt-2 border-t border-zinc-900">
                      <div className="font-bold">// RUNTIME EXCEPTIONS:</div>
                      <pre>{JSON.stringify(previewErrors, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 4: SUBMITTED FORM RECORDS */}
        {currentView === 'submissions' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className={`p-6 border ${isDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'} space-y-6`}>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0055ff]">
                  Inbox_Stream
                </h3>
                <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 px-3 py-1 uppercase opacity-60">
                  Total Payload Records: {submissions.length}
                </span>
              </div>

              {submissions.length === 0 ? (
                <div className="py-16 text-center opacity-40 uppercase font-mono text-[10px] space-y-2">
                  <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p>Zero active records synced inside this environment.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[65vh] overflow-y-auto no-scrollbar">
                  {submissions.map(sub => (
                    <div 
                      key={sub.id} 
                      className={`p-4 border font-mono transition-all ${
                        isDarkMode 
                          ? 'bg-zinc-900/30 border-zinc-800/70 hover:border-zinc-700' 
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3 border-b border-zinc-800/40 pb-2">
                        <div>
                          <span className="text-[10px] font-black uppercase text-zinc-400">{sub.formName}</span>
                          <span className="text-[8px] italic text-[#0055ff] uppercase ml-2 select-all font-mono">[{sub.id}]</span>
                        </div>
                        <span className="text-[8.5px] text-zinc-500 uppercase">{new Date(sub.submittedAt).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        {Object.entries(sub.data).map(([fieldId, val]) => {
                          // Find field label in default or existing forms
                          const matchingForm = forms.find(f => f.id === sub.formId) || DEFAULT_FORMS.find(f => f.id === sub.formId);
                          const matchingField = matchingForm?.fields.find(f => f.id === fieldId);
                          const label = matchingField ? matchingField.label : fieldId;
                          
                          return (
                            <div key={fieldId} className="space-y-0.5">
                              <span className="text-[8.5px] uppercase text-zinc-500 tracking-wider block font-bold">{label}:</span>
                              <span className={`font-bold select-all ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{val === true ? 'AUTHORIZED' : val === false ? 'DECLINED' : String(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      {...props}
    >
      <circle cx={11} cy={11} r={8} />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
