'use client';

import React, { useState } from 'react';
import { Database, User, CreditCard, MapPin, Copy, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { FIRST_NAMES, LAST_NAMES, DOMAINS, STREETS, CITIES, PROVINCES } from '@/lib/testData';
import { useRouter } from 'next/navigation';

type Category = 'identity' | 'finance' | 'location';

export const TestDataGenerator: React.FC = () => {
    const { toast } = useToast();
    const router = useRouter();
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
        toast({
            title: "Copied!",
            description: "JSON data copied to clipboard!",
            variant: "default",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Database className="text-primary" /> Test Data Generator
                        </h2>
                        <p className="text-muted-foreground mt-1">Generate random South African mock data for your test cases.</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-8 flex-1 min-h-0">
                {/* Left Side: Controls */}
                <div className="w-80 flex flex-col gap-6">
                    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                        <div className="p-4 bg-muted/50 border-b border-border font-bold text-foreground text-sm uppercase tracking-wider">
                            Categories
                        </div>
                        <div className="p-2">
                            <button
                                onClick={() => setActiveCategory('identity')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left mb-1 ${activeCategory === 'identity' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
                            >
                                <User size={18} /> Identity
                            </button>
                            <button
                                onClick={() => setActiveCategory('finance')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left mb-1 ${activeCategory === 'finance' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
                            >
                                <CreditCard size={18} /> Finance
                            </button>
                            <button
                                onClick={() => setActiveCategory('location')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeCategory === 'location' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
                            >
                                <MapPin size={18} /> Location
                            </button>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-sm border border-border p-5">
                        <h3 className="font-bold text-foreground text-sm mb-4">Configuration</h3>

                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Record Count: {count}</label>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={count}
                                onChange={(e) => setCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>1</span>
                                <span>50</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} /> Generate
                        </button>
                    </div>
                </div>

                {/* Right Side: Output */}
                <div className="flex-1 bg-card rounded-xl shadow-sm border border-border flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-muted/50">
                        <h3 className="font-bold text-foreground text-sm">Result (JSON)</h3>
                        <div className="flex gap-2">
                            {generatedData && (
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                >
                                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                    {copied ? 'Copied' : 'Copy JSON'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        {generatedData ? (
                            <pre className="w-full h-full p-6 overflow-auto text-sm font-mono text-foreground bg-card">
                                {generatedData}
                            </pre>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                                <Database size={48} className="text-muted-foreground/20 mb-4" />
                                <p>Select a category and click Generate</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
