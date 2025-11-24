import React, { useState } from 'react';
import { Database, User, CreditCard, MapPin, Copy, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/Toast';

type Category = 'identity' | 'finance' | 'location';

const FIRST_NAMES = ['Thabo', 'Johan', 'Lerato', 'Willem', 'Sipho', 'Jessica', 'Nkosi', 'Pieter', 'Fatima', 'Lungile', 'Keletso', 'Riaan'];
const LAST_NAMES = ['Dlamini', 'Van Der Merwe', 'Naidoo', 'Nkosi', 'Botha', 'Khumalo', 'Smith', 'Venter', 'Mokoena', 'Patel', 'Coetzee', 'Zulu'];
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.co.za', 'webmail.co.za'];
const STREETS = ['Nelson Mandela Dr', 'Church St', 'Voortrekker Rd', 'Main Rd', 'Long St', 'William Nicol Dr', 'Rivonia Rd', 'Oxford Rd', 'Strand St'];
const CITIES = ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Gqeberha', 'Bloemfontein', 'Nelspruit', 'Kimberley', 'Sandton', 'Stellenbosch'];
const PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Mpumalanga', 'Northern Cape', 'North West', 'Limpopo'];

interface TestDataGeneratorProps {
  onBack: () => void;
}

export const TestDataGenerator: React.FC<TestDataGeneratorProps> = ({ onBack }) => {
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<Category>('identity');
  const [count, setCount] = useState(1);
  const [generatedData, setGeneratedData] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  const getRandomNum = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const generateIdentity = () => {
    const first = getRandom(FIRST_NAMES);
    const last = getRandom(LAST_NAMES);
    // SA Mobile format: +27 82 123 4567
    const prefix = getRandom(['60', '61', '71', '72', '73', '74', '76', '78', '79', '81', '82', '83', '84']);
    return {
      firstName: first,
      lastName: last,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${getRandomNum(1, 99)}@${getRandom(DOMAINS)}`,
      phone: `+27 ${prefix} ${getRandomNum(100, 999)} ${getRandomNum(1000, 9999)}`,
      username: `${first.toLowerCase()}_${last.toLowerCase()}`,
      password: `Pass${getRandomNum(1000, 9999)}!`
    };
  };

  const generateFinance = () => {
    return {
      cardType: getRandom(['Visa', 'MasterCard', 'Amex']),
      cardNumber: `4${getRandomNum(100, 999)} ${getRandomNum(1000, 9999)} ${getRandomNum(1000, 9999)} ${getRandomNum(1000, 9999)}`,
      expiry: `${getRandomNum(1, 12).toString().padStart(2, '0')}/${getRandomNum(24, 29)}`,
      cvv: getRandomNum(100, 999).toString(),
      // Mock SA IBAN style
      iban: `ZA${getRandomNum(10, 99)}SBZA${getRandomNum(10000000, 99999999)}`,
      amount: 'R ' + getRandomNum(10, 5000) + '.00'
    };
  };

  const generateLocation = () => {
    const idx = Math.floor(Math.random() * CITIES.length);
    // Simple province mapping isn't strict here for mock data, just randomizing
    return {
      street: `${getRandomNum(1, 150)} ${getRandom(STREETS)}`,
      city: CITIES[idx],
      province: getRandom(PROVINCES),
      postalCode: getRandomNum(1000, 9999).toString(), // SA Postal codes are 4 digits
      country: 'South Africa'
    };
  };

  const handleGenerate = () => {
    const result = [];
    for (let i = 0; i < count; i++) {
      if (activeCategory === 'identity') result.push(generateIdentity());
      if (activeCategory === 'finance') result.push(generateFinance());
      if (activeCategory === 'location') result.push(generateLocation());
    }
    setGeneratedData(JSON.stringify(result, null, 2));
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedData);
    setCopied(true);
    addToast("JSON data copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-screen flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button 
              onClick={onBack}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              title="Back to Tools"
          >
              <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Database className="text-purple-600" /> Test Data Generator
            </h2>
            <p className="text-gray-500 mt-1">Generate random South African mock data for your test cases.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Left Side: Controls */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 text-sm uppercase tracking-wider">
               Categories
             </div>
             <div className="p-2">
               <button 
                 onClick={() => setActiveCategory('identity')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left mb-1 ${activeCategory === 'identity' ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
               >
                 <User size={18} /> Identity
               </button>
               <button 
                 onClick={() => setActiveCategory('finance')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left mb-1 ${activeCategory === 'finance' ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
               >
                 <CreditCard size={18} /> Finance
               </button>
               <button 
                 onClick={() => setActiveCategory('location')}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeCategory === 'location' ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
               >
                 <MapPin size={18} /> Location
               </button>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
             <h3 className="font-bold text-gray-800 text-sm mb-4">Configuration</h3>
             
             <div className="mb-6">
               <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Record Count: {count}</label>
               <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={count} 
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
               />
               <div className="flex justify-between text-xs text-gray-400 mt-1">
                 <span>1</span>
                 <span>50</span>
               </div>
             </div>

             <button 
               onClick={handleGenerate}
               className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
             >
               <RefreshCw size={18} /> Generate
             </button>
          </div>
        </div>

        {/* Right Side: Output */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
           <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
             <h3 className="font-bold text-gray-700 text-sm">Result (JSON)</h3>
             <div className="flex gap-2">
               {generatedData && (
                 <button 
                   onClick={handleCopy}
                   className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                 >
                   {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                   {copied ? 'Copied' : 'Copy JSON'}
                 </button>
               )}
             </div>
           </div>
           <div className="flex-1 overflow-hidden relative">
             {generatedData ? (
               <pre className="w-full h-full p-6 overflow-auto text-sm font-mono text-gray-800 bg-white">
                 {generatedData}
               </pre>
             ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                 <Database size={48} className="text-gray-200 mb-4" />
                 <p>Select a category and click Generate</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};