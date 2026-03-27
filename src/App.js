import { GoogleGenerativeAI } from "@google/generative-ai";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Loader2, ArrowRight, ArrowLeft, Plus, Minus, 
  Trash2, RotateCcw, PlusCircle, Share2, Check, ChevronDown, ChevronUp, Settings, X, Mail
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_ID = "gemini-3-flash-preview"; 

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const currencies = [
  { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' }, { code: 'AUD', symbol: 'A$' }, { code: 'CAD', symbol: 'C$' },
  { code: 'CHF', symbol: 'Fr' }, { code: 'CNY', symbol: '¥' }, { code: 'INR', symbol: '₹' },
  { code: 'AED', symbol: 'د.إ' }, { code: 'SAR', symbol: '﷼' }, { code: 'KWD', symbol: 'د.ك' },
  { code: 'EGP', symbol: '£' }, { code: 'JOD', symbol: 'د.ا' }, { code: 'QAR', symbol: '﷼' }
];

const translations = {
  en: {
    stage1: 'Stage 1', theSquad: 'The Squad', stage2: 'Stage 2', scanReceipt: 'Scan Receipt',
    stage3: 'Stage 3', reviewItems: 'Review Items', stage4: 'Stage 4', feesCharges: 'Fees & Charges',
    stage5: 'Stage 5', theSplit: 'The Split', next: 'Next', takePhoto: 'Take Photo',
    orEnterManually: 'Or Enter Manually', addManualItem: 'Add Manual Item', totalQty: 'Total Qty',
    egpPerUnit: 'EGP', fullyAssigned: 'Fully Assigned', unitsLeft: 'unit(s) left',
    autoSplit: 'Auto Split', tax: 'Tax', serviceCharge: 'Service Charge', extraFee: 'Extra Fee',
    discount: 'Discount (%)', splitTheBill: 'Split The Bill', totalBill: 'Total Bill',
    totalFor: 'Total for', details: 'Details', hideShow: 'Hide / Show', shareResults: 'Share Results',
    splitNewTab: 'Split New Tab', previousSplits: 'Previous Splits', items: 'items',
    subtotal: 'Subtotal', service: 'Service', total: 'Total', settings: 'Settings',
    tagline: '2asemha sa7.', currency: 'Currency', language: 'Language', contactUs: 'Contact Us',
    english: 'English', arabic: 'العربية'
  },
  ar: {
    stage1: 'المرحلة 1', theSquad: 'المجموعة', stage2: 'المرحلة 2', scanReceipt: 'مسح الإيصال',
    stage3: 'المرحلة 3', reviewItems: 'مراجعة البنود', stage4: 'المرحلة 4', feesCharges: 'الرسوم والتكاليف',
    stage5: 'المرحلة 5', theSplit: 'تقسيم الحساب', next: 'التالي', takePhoto: 'التقاط صورة',
    orEnterManually: 'أو أدخل يدويًا', addManualItem: 'إضافة بند يدويًا', totalQty: 'الكمية الإجمالية',
    egpPerUnit: 'جنيه مصري لكل وحدة', fullyAssigned: 'تم التعيين بالكامل', unitsLeft: 'وحدة متبقية',
    autoSplit: 'تقسيم تلقائي', tax: 'ضريبة', serviceCharge: 'رسم الخدمة', extraFee: 'رسم إضافي',
    discount: 'خصم (%)', splitTheBill: 'تقسيم الحساب', totalBill: 'إجمالي الحساب',
    totalFor: 'الإجمالي ل', details: 'التفاصيل', hideShow: 'إظهار / إخفاء', shareResults: 'مشاركة النتائج',
    splitNewTab: 'تقسيم عنصر جديد', previousSplits: 'التقسيمات السابقة', items: 'بنود',
    subtotal: 'المجموع الجزئي', service: 'الخدمة', total: 'الإجمالي', settings: 'الإعدادات',
    tagline: '2asemha sa7.', currency: 'العملة', language: 'اللغة', contactUs: 'اتصل بنا',
    english: 'English', arabic: 'العربية'
  }
};

const getCurrencySymbol = (code) => {
  const curr = currencies.find(c => c.code === code);
  return curr ? curr.symbol : code;
};

export default function TA2SEEMA() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [peopleCount, setPeopleCount] = useState(2);
  const [personNames, setPersonNames] = useState(['You', 'Friend 1']);
  const [receiptData, setReceiptData] = useState({ items: [], tax: 0, serviceCharge: 0, extraFee: 0, discount: 0, currency: 'EGP' });
  const [assignments, setAssignments] = useState({}); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTax, setShowTax] = useState(false);
  const [showServiceCharge, setShowServiceCharge] = useState(false);
  const [showExtraFee, setShowExtraFee] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [expandedTotal, setExpandedTotal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [assignmentError, setAssignmentError] = useState(false);
  const [history, setHistory] = useState([]);
  const [currency, setCurrency] = useState('EGP');
  const [language, setLanguage] = useState('en');
  const fileInputRef = useRef(null);
  const [base64Image, setBase64Image] = useState(null);

  useEffect(() => {
    const newNames = Array.from({ length: peopleCount }, (_, i) => personNames[i] || (i === 0 ? 'You' : `Friend ${i}`));
    setPersonNames(newNames);
  }, [peopleCount]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ta2seema_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const getAssignedQty = (itemIdx, pIdx) => assignments[`${itemIdx}_${pIdx}`] || 0;

  const areAllItemsAssigned = () => {
    for (let idx = 0; idx < receiptData.items.length; idx++) {
      const item = receiptData.items[idx];
      const assignedTotal = personNames.reduce((sum, _, pi) => sum + getAssignedQty(idx, pi), 0);
      if (assignedTotal !== item.qty) {
        return false;
      }
    }
    return true;
  };

  const handleAssignmentChange = (itemIdx, pIdx, delta) => {
    const item = receiptData.items[itemIdx];
    const currentVal = getAssignedQty(itemIdx, pIdx);
    const newVal = Math.max(0, currentVal + delta);
    const others = personNames.reduce((sum, _, i) => i !== pIdx ? sum + getAssignedQty(itemIdx, i) : sum, 0);
    
    if (others + newVal <= item.qty) {
      setAssignments(prev => ({ ...prev, [`${itemIdx}_${pIdx}`]: newVal }));
    }
  };

  const handleItemQtyChange = (idx, newVal) => {
    const updatedItems = [...receiptData.items];
    updatedItems[idx].qty = Math.max(1, newVal);
    setReceiptData({ ...receiptData, items: updatedItems });
  };

  const autoSplitItem = (itemIdx) => {
    const newAssignments = { ...assignments };
    const itemQty = receiptData.items[itemIdx].qty;
    const perPerson = Math.floor(itemQty / personNames.length);
    
    personNames.forEach((_, pIdx) => {
      newAssignments[`${itemIdx}_${pIdx}`] = perPerson;
    });
    
    setAssignments(newAssignments);
  };



  const getTotalBill = () => {
    const subtotal = receiptData.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = showTax ? receiptData.tax : 0;
    const serviceCharge = showServiceCharge ? receiptData.serviceCharge : 0;
    const extraFee = showExtraFee ? receiptData.extraFee : 0;
    const subtotalWithFees = subtotal + tax + serviceCharge + extraFee;
    const discountAmount = showDiscount ? (subtotalWithFees * (receiptData.discount / 100)) : 0;
    return subtotalWithFees - discountAmount;
  };

  const getPersonDetails = (pIdx) => {
    const assignedItems = receiptData.items.map((item, itemIdx) => {
      const qty = getAssignedQty(itemIdx, pIdx);
      return qty > 0 ? { name: item.name, qty, price: item.price * qty, unitPrice: item.price } : null;
    }).filter(Boolean);
    
    const subtotal = assignedItems.reduce((sum, i) => sum + i.price, 0);
    const totalBill = getTotalBill();
    const subtotalBill = receiptData.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const feesTotal = totalBill - subtotalBill;
    const feesShare = feesTotal / personNames.length;
    
    return { 
      assignedItems,
      subtotal, 
      feesShare, 
      total: Math.max(0, subtotal + feesShare) 
    };
  };

  const saveBillToHistory = () => {
    if (receiptData.items.length === 0) return;
    
    const billSummary = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      peopleCount: personNames.length,
      peopleNames: personNames,
      totalBill: getTotalBill(),
      itemsCount: receiptData.items.length,
    };
    
    const updatedHistory = [billSummary, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('ta2seema_history', JSON.stringify(updatedHistory));
  };

const processReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    
    try {
      const b64Data = await fileToBase64(file);
      setImagePreview(`data:${file.type};base64,${b64Data}`);
      
      const PREVIEW_MODEL = "gemini-3-flash-preview"; 
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${PREVIEW_MODEL}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Extract items, quantities, and prices from this receipt. Return ONLY JSON: {\"items\": [{\"name\": \"string\", \"price\": number, \"qty\": number}], \"tax\": number, \"service_charge\": number}" },
              { inline_data: { mime_type: file.type, data: b64Data } }
            ]
          }]
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "API Error");

      const rawText = result.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleanJson);

      setReceiptData({
        items: data.items.map(item => ({ id: Math.random(), ...item })),
        tax: data.tax || 0,
        serviceCharge: data.service_charge || 0,
        currency: 'EGP'
      });
      setCurrentStep(2);
    } catch (error) {
      console.error("Scan Error:", error);
      alert("Scan failed: " + error.message + ". Entering manual mode.");
      setCurrentStep(2);
    } finally { 
      setIsProcessing(false); 
      setImagePreview(null);
    }
  };
  const StageIndicator = () => (
    <div className="flex flex-col items-start gap-8 mb-6">
      <button 
        onClick={() => setCurrentStep(currentStep - 1)}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-xs uppercase italic"
      >
        <ArrowLeft size={16} /> Back
      </button>
      
      <div className="flex gap-4 items-center w-full">
        {[1, 2, 3, 4, 5].map((stage) => (
          <motion.div
            key={stage}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center font-black text-sm uppercase",
              currentStep >= stage - 1 
                ? "bg-orange-600 text-white" 
                : "bg-slate-100 text-slate-400"
            )}
          >
            {stage}
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FEFBF9] text-slate-900 pb-20 flex flex-col items-center font-sans">
      <header className="sticky top-0 z-50 w-full max-w-[480px] bg-[#FEFBF9]/90 backdrop-blur-md border-b border-orange-100 px-6 py-5 flex items-center justify-between">
        <span className="text-xl font-black uppercase italic tracking-tighter bg-orange-100 px-6 py-3 rounded-[20px]">TA2SEEMA</span>
        <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-orange-50 rounded-lg transition-colors"><Settings size={20} className="text-slate-900" /></button>
      </header>

      <main className="w-full max-w-[480px] px-6 pt-4">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center pt-8 mb-6">
                <p className="text-[10px] font-black uppercase text-orange-600 italic">Stage 1</p>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">The Squad</h2>
              </div>
              <div className="flex items-center justify-center gap-6 mb-8 bg-white p-6 rounded-[32px] shadow-lg border border-orange-50">
                <button onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))} className="p-3 bg-slate-50 rounded-2xl"><Minus/></button>
                <span className="text-6xl font-black italic text-orange-600">{peopleCount}</span>
                <button onClick={() => setPeopleCount(peopleCount + 1)} className="p-3 bg-slate-900 text-white rounded-2xl"><Plus/></button>
              </div>
              <div className="space-y-2 mb-8">
                {personNames.map((name, idx) => (
                  <input key={idx} className="w-full bg-white border border-slate-100 px-5 py-4 rounded-[18px] font-bold outline-none focus:border-orange-500" value={name} onChange={(e) => {
                    const updated = [...personNames]; updated[idx] = e.target.value; setPersonNames(updated);
                  }} />
                ))}
              </div>
              <button onClick={() => setCurrentStep(1)} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase italic flex justify-center items-center gap-3">Next <ArrowRight/></button>
              
              {history.length > 0 && (
                <div className="mt-10">
                  <p className="text-[10px] font-black uppercase text-slate-400 italic mb-3">Previous Splits</p>
                  <div className="space-y-2">
                    {history.map((bill) => (
                      <div key={bill.id} className="bg-white p-4 rounded-[18px] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-black text-sm uppercase italic text-slate-900">{bill.peopleNames.join(', ')}</p>
                            <p className="text-[9px] text-slate-400 italic mt-1">{bill.date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-lg text-orange-600">{bill.totalBill.toFixed(2)}</p>
                            <p className="text-[9px] text-slate-400 italic">{bill.itemsCount} items</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <StageIndicator />
              <div className="text-center flex flex-col items-center gap-10">
                <div>
                  <p className="text-[10px] font-black uppercase text-orange-600 italic mb-2">Stage 2</p>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">Scan Receipt</h2>
                </div>
                <input type="file" ref={fileInputRef} onChange={processReceipt} className="hidden" accept="image/*" />
                {!isProcessing ? (
                  <button onClick={() => fileInputRef.current.click()} className="w-full aspect-square border-2 border-dashed border-orange-200 rounded-[64px] flex flex-col items-center justify-center gap-8 bg-white group hover:border-orange-400 transition-colors">
                    <Camera size={72} className="text-orange-600 group-hover:scale-110 transition-transform" />
                    <span className="font-black uppercase tracking-widest italic">Take Photo</span>
                  </button>
                ) : (
                  <div className="w-full aspect-square border-2 border-dashed border-orange-200 rounded-[64px] flex flex-col items-center justify-center gap-6 bg-white overflow-hidden relative">
                    {imagePreview && (
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <img src={imagePreview} alt="Receipt Preview" className="w-full h-full object-cover rounded-[62px]" />
                        {/* Scanning animation */}
                        <motion.div
                          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-lg"
                          animate={{ y: ['0%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                        {/* Scanning glow effect */}
                        <motion.div
                          className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b from-orange-400/20 to-transparent opacity-50"
                          animate={{ y: ['0%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                        {/* Processing text */}
                        <motion.div
                          className="absolute bottom-6 bg-slate-900/80 backdrop-blur text-white px-6 py-2 rounded-full text-xs font-black uppercase italic"
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          Scanning Receipt...
                        </motion.div>
                      </motion.div>
                    )}
                    {!imagePreview && <Loader2 className="animate-spin text-orange-600 w-16 h-16" />}
                  </div>
                )}
                <button onClick={() => { setReceiptData({items: [{id: 1, name: "New Item", price: 0, qty: 1}], tax: 0, serviceCharge: 0}); setCurrentStep(2); setImagePreview(null); }} className="text-slate-400 font-black uppercase text-xs italic underline">Or Enter Manually</button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <StageIndicator />
              <div className="flex justify-between items-center mb-6 py-4 sticky top-[73px] bg-[#FEFBF9] z-10 border-b border-orange-100">
                <div>
                  <p className="text-[10px] font-black uppercase text-orange-600 italic">Stage 3</p>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Review Items</h2>
                </div>
                <button onClick={() => {
                  if (!areAllItemsAssigned()) {
                    setAssignmentError(true);
                    setTimeout(() => setAssignmentError(false), 3000);
                  } else {
                    setCurrentStep(3);
                  }
                }} className="bg-slate-900 text-white px-7 py-2.5 rounded-full font-black text-xs uppercase italic">Next</button>
              </div>

              {assignmentError && (
                <div className="fixed top-32 left-1/2 transform -translate-x-1/2 max-w-sm px-5 py-3 bg-red-50 border border-red-200 rounded-xl z-50 shadow-lg">
                  <p className="text-red-700 font-black text-xs text-center uppercase italic">⚠ Make sure all items are assigned first</p>
                </div>
              )}
              
              <div className="space-y-4">
                {receiptData.items.map((item, idx) => {
                  const assignedTotal = personNames.reduce((sum, _, pi) => sum + getAssignedQty(idx, pi), 0);
                  const remaining = item.qty - assignedTotal;

                  return (
                    <div key={item.id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-md">
                      <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-4">
                        <div className="w-1/2">
                          <input className="font-black text-slate-800 uppercase italic bg-transparent outline-none w-full" value={item.name} onChange={(e) => {
                            const upd = [...receiptData.items]; upd[idx].name = e.target.value; setReceiptData({...receiptData, items: upd});
                          }} />
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Total Qty:</span>
                            <button onClick={() => handleItemQtyChange(idx, item.qty - 1)} className="text-slate-300 hover:text-orange-600"><Minus size={12}/></button>
                            <input type="number" className="w-8 text-center font-black text-orange-600 text-xs bg-orange-50 rounded" value={item.qty} onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value) || 1)} />
                            <button onClick={() => handleItemQtyChange(idx, item.qty + 1)} className="text-slate-300 hover:text-orange-600"><Plus size={12}/></button>
                          </div>
                        </div>
                        <div className="text-right">
                          <input type="number" className="font-black text-slate-900 w-24 text-right outline-none text-xl italic" value={item.price} onChange={(e) => {
                            const upd = [...receiptData.items]; upd[idx].price = parseFloat(e.target.value) || 0; setReceiptData({...receiptData, items: upd});
                          }} />
                          <p className="text-[9px] font-black text-slate-300 uppercase">{currency} per unit</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-3">
                          <p className={`text-[9px] font-black uppercase ${remaining === 0 ? 'text-green-500' : 'text-orange-400'}`}>
                            {remaining === 0 ? '✓ Fully Assigned' : `⚠ ${remaining} unit(s) left`}
                          </p>
                          {item.qty >= personNames.length && (
                            <button 
                              onClick={() => autoSplitItem(idx)}
                              className="text-[9px] font-black bg-orange-100 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-200 transition-colors uppercase italic"
                            >
                              Auto Split
                            </button>
                          )}
                        </div>
                        {personNames.map((name, pIdx) => (
                          <div key={pIdx}>
                            <div className="flex justify-between items-center px-4 py-2 rounded-xl bg-slate-50/50 border border-slate-50">
                              <span className="font-bold text-[11px] uppercase italic text-slate-600">{name}</span>
                              <div className="flex items-center gap-2.5">
                                <button onClick={() => handleAssignmentChange(idx, pIdx, -1)} className="w-7 h-7 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-400 hover:text-orange-600"><Minus size={12}/></button>
                                <span className="w-8 text-center font-black text-xs text-orange-600">{getAssignedQty(idx, pIdx)}</span>
                                <button onClick={() => handleAssignmentChange(idx, pIdx, 1)} className={cn("w-7 h-7 bg-white rounded-lg shadow-sm border border-slate-200", remaining > 0 ? "text-orange-600" : "text-slate-200")}><Plus size={12}/></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setReceiptData({...receiptData, items: [...receiptData.items, {id: Math.random(), name: "New Item", price: 0, qty: 1}]})} className="w-full mt-6 py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black uppercase text-xs italic">
                <PlusCircle size={16}/> Add Manual Item
              </button>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <StageIndicator />
              <div className="mb-6 py-4">
                <p className="text-[10px] font-black uppercase text-orange-600 italic mb-2">Stage 4</p>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Fees & Charges</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <label className="font-black uppercase text-sm italic flex items-center gap-3">
                      <input type="checkbox" checked={showTax} onChange={(e) => setShowTax(e.target.checked)} className="w-5 h-5 rounded accent-orange-600" />
                      Tax (VAT)
                    </label>
                  </div>
                  {showTax && (
                    <input 
                      type="number" 
                      value={receiptData.tax} 
                      onChange={(e) => setReceiptData({...receiptData, tax: parseFloat(e.target.value) || 0})}
                      className="w-full bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg font-black text-lg text-right outline-none focus:border-orange-600"
                      placeholder="0"
                    />
                  )}
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <label className="font-black uppercase text-sm italic flex items-center gap-3">
                      <input type="checkbox" checked={showServiceCharge} onChange={(e) => setShowServiceCharge(e.target.checked)} className="w-5 h-5 rounded accent-orange-600" />
                      Service Charge
                    </label>
                  </div>
                  {showServiceCharge && (
                    <input 
                      type="number" 
                      value={receiptData.serviceCharge} 
                      onChange={(e) => setReceiptData({...receiptData, serviceCharge: parseFloat(e.target.value) || 0})}
                      className="w-full bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg font-black text-lg text-right outline-none focus:border-orange-600"
                      placeholder="0"
                    />
                  )}
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <label className="font-black uppercase text-sm italic flex items-center gap-3">
                      <input type="checkbox" checked={showExtraFee} onChange={(e) => setShowExtraFee(e.target.checked)} className="w-5 h-5 rounded accent-orange-600" />
                      Extra Fee
                    </label>
                  </div>
                  {showExtraFee && (
                    <input 
                      type="number" 
                      value={receiptData.extraFee} 
                      onChange={(e) => setReceiptData({...receiptData, extraFee: parseFloat(e.target.value) || 0})}
                      className="w-full bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg font-black text-lg text-right outline-none focus:border-orange-600"
                      placeholder="0"
                    />
                  )}
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <label className="font-black uppercase text-sm italic flex items-center gap-3">
                      <input type="checkbox" checked={showDiscount} onChange={(e) => setShowDiscount(e.target.checked)} className="w-5 h-5 rounded accent-orange-600" />
                      Discount (%)
                    </label>
                  </div>
                  {showDiscount && (
                    <div className="relative">
                      <input 
                        type="number" 
                        value={receiptData.discount} 
                        onChange={(e) => setReceiptData({...receiptData, discount: parseFloat(e.target.value) || 0})}
                        className="w-full bg-orange-50 border border-orange-200 px-4 py-3 pr-8 rounded-lg font-black text-lg text-right outline-none focus:border-orange-600"
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 font-black text-orange-600 text-lg">%</span>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => setCurrentStep(4)} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase italic flex justify-center items-center gap-3">
                Split The Bill <ArrowRight />
              </button>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <StageIndicator />
              <div className="mb-8">
                <p className="text-[10px] font-black uppercase text-orange-600 italic mb-2">Stage 5</p>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">The Split</h2>
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-100 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-orange-600 uppercase italic">Total Bill</p>
                  <button 
                    onClick={() => setExpandedTotal(!expandedTotal)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {expandedTotal ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-black italic tracking-tight">{getTotalBill().toFixed(2)}</span>
                  <p className="text-[9px] font-black text-slate-300 uppercase">{currency}</p>
                </div>

                {expandedTotal && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    {receiptData.items.length > 0 && (
                      <>
                        <div className="flex justify-between text-sm font-bold">
                          <span className="uppercase italic text-slate-600">Subtotal</span>
                          <span>{receiptData.items.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)} {currency}</span>
                        </div>
                        {showTax && receiptData.tax > 0 && (
                          <div className="flex justify-between text-sm font-bold">
                            <span className="uppercase italic text-slate-600">Tax</span>
                            <span>{receiptData.tax.toFixed(2)} {currency}</span>
                          </div>
                        )}
                        {showServiceCharge && receiptData.serviceCharge > 0 && (
                          <div className="flex justify-between text-sm font-bold">
                            <span className="uppercase italic text-slate-600">Service</span>
                            <span>{receiptData.serviceCharge.toFixed(2)} {currency}</span>
                          </div>
                        )}
                        {showExtraFee && receiptData.extraFee > 0 && (
                          <div className="flex justify-between text-sm font-bold">
                            <span className="uppercase italic text-slate-600">Extra Fee</span>
                            <span>{receiptData.extraFee.toFixed(2)} EGP</span>
                          </div>
                        )}
                        {showDiscount && receiptData.discount > 0 && (
                          <div className="flex justify-between text-sm font-bold text-red-600">
                            <span className="uppercase italic">Discount ({receiptData.discount}%)</span>
                            <span>-{(((receiptData.items.reduce((sum, item) => sum + (item.price * item.qty), 0) + (showTax ? receiptData.tax : 0) + (showServiceCharge ? receiptData.serviceCharge : 0) + (showExtraFee ? receiptData.extraFee : 0)) * (receiptData.discount / 100))).toFixed(2)} EGP</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold pt-3 border-t border-slate-100">
                          <span className="uppercase italic text-slate-900">Total</span>
                          <span className="text-orange-600">{getTotalBill().toFixed(2)} EGP</span>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {personNames.map((name, pIdx) => {
                  const details = getPersonDetails(pIdx);
                  const isExpanded = expandedItem === pIdx;

                  return (
                    <div key={pIdx} className="bg-white p-6 rounded-[40px] shadow-lg border border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-orange-600 uppercase italic mb-1">Total for</p>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter">{name}</h3>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-4xl font-black italic tracking-tight">{details.total.toFixed(2)}</span>
                          <p className="text-[9px] font-black text-slate-300 uppercase">EGP</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => setExpandedItem(isExpanded ? null : pIdx)}
                        className="w-full flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-100 text-slate-500 hover:text-slate-700"
                      >
                        <span className="text-xs font-black uppercase italic">{isExpanded ? 'Hide' : 'Show'} Details</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                          {details.assignedItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="font-bold italic text-slate-700">{item.qty}x {item.name}</span>
                              <span className="font-bold text-slate-700">{item.price.toFixed(2)} EGP</span>
                            </div>
                          ))}
                          <div className="border-t border-slate-100 pt-3 mt-3">
                            <div className="flex justify-between text-sm font-bold mb-2">
                              <span className="uppercase italic text-slate-600">Subtotal</span>
                              <span>{details.subtotal.toFixed(2)} EGP</span>
                            </div>
                            {(showTax || showServiceCharge) && details.feesShare > 0 && (
                              <div className="flex justify-between text-sm font-bold">
                                <span className="uppercase italic text-slate-600">Share of Fees</span>
                                <span>{details.feesShare.toFixed(2)} EGP</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => { navigator.clipboard.writeText("Shared from TA2SEEMA!"); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="w-full bg-orange-600 text-white px-8 py-4 rounded-full font-black uppercase italic flex justify-center items-center gap-3 shadow-xl mb-4">
                {copied ? <Check/> : <Share2/>} {copied ? "Copied!" : "Share Results"}
              </button>
              <button onClick={() => { saveBillToHistory(); setCurrentStep(0); setReceiptData({ items: [], tax: 0, serviceCharge: 0, extraFee: 0, discount: 0 }); setAssignments({}); setShowTax(false); setShowServiceCharge(false); setShowExtraFee(false); setShowDiscount(false); }} className="w-full font-black text-slate-400 uppercase text-[10px] italic py-4 flex items-center justify-center gap-2 border border-slate-200 rounded-full">
                <RotateCcw size={14}/> Split New Tab
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {(showSettings || showAbout) && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#FEFBF9] rounded-[40px] w-[90vw] max-w-[480px] h-[95vh] max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#FEFBF9] border-b border-slate-100 p-6 flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">TA2SEEMA</h2>
                <p className="text-xs text-slate-400 italic mt-1">2asemha sa7.</p>
              </div>
              <button onClick={() => { setShowSettings(false); setShowAbout(false); }} className="p-2 hover:bg-orange-50 rounded-lg transition-colors">
                <X size={24} className="text-slate-900" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 px-6 pt-4 border-b border-slate-100">
              <button
                onClick={() => setShowAbout(false)}
                className={`pb-3 font-black uppercase text-sm italic transition-colors ${!showAbout ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Settings
              </button>
              <button
                onClick={() => setShowAbout(true)}
                className={`pb-3 font-black uppercase text-sm italic transition-colors ${showAbout ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                About
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {!showAbout ? (
                // Settings Content
                <div className="space-y-6">
                  <div>
                    <label className="font-black uppercase text-sm italic mb-3 block text-slate-700">Currency</label>
                    <select 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-[18px] font-black uppercase outline-none focus:border-orange-600"
                    >
                      {currencies.map(curr => (
                        <option key={curr.code} value={curr.code}>{curr.code} ({curr.symbol})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-black uppercase text-sm italic mb-3 block text-slate-700">Language</label>
                    <select 
                      value={language} 
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-4 py-3 rounded-[18px] font-black outline-none focus:border-orange-600"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                    </select>
                  </div>

                  <a 
                    href="mailto:marwanhazem1772@gmail.com"
                    className="flex items-center justify-center gap-3 w-full bg-orange-600 text-white px-6 py-4 rounded-[18px] font-black uppercase italic hover:bg-orange-700 transition-colors"
                  >
                    <Mail size={20} /> Contact Us
                  </a>
                </div>
              ) : (
                // About Content
                <div className="space-y-4">
                  <div className="bg-white border border-slate-100 p-6 rounded-[28px]">
                    <div className="space-y-3">
                      <p className="text-sm leading-relaxed text-slate-700 italic">
                        TA2SEEMA is a smart, user-friendly app designed to make splitting bills simple, fast, and stress-free. Whether you're out with friends, traveling, or sharing expenses, TA2SEEMA helps you divide costs fairly in just a few taps.
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700 italic">
                        Built with everyday life in mind, the app allows users to scan receipts, add items manually, and assign them to different people. It automatically calculates who owes what, eliminating confusion and saving time.
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700 italic">
                        TA2SEEMA is all about convenience, accuracy, and fairness. No more awkward calculations or guessing. Just split, settle, and move on.
                      </p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 p-6 rounded-[28px]">
                    <p className="text-sm leading-relaxed text-slate-700 italic font-bold">
                      Perfect for students, friends, and families, TA2SEEMA brings a modern solution to a common problem.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}