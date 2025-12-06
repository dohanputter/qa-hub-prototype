'use client';

import React, { useState } from 'react';
import { Database, User, CreditCard, MapPin, Copy, Check, RefreshCw, ArrowLeft, AlertCircle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/useToast';
import { FIRST_NAMES, LAST_NAMES, DOMAINS, STREETS, CITIES, PROVINCES } from '@/lib/testData';
import { useRouter } from 'next/navigation';

type Category = 'identity' | 'finance' | 'location';
type PaymentProvider = 'stripe' | 'paypal' | 'generic';
type CardScenario = 'success' | 'declined' | 'insufficient_funds' | 'expired' | '3ds_required' | 'fraud';

// Real test card numbers for payment provider testing
const TEST_CARDS = {
    stripe: {
        success: [
            { brand: 'Visa', number: '4242 4242 4242 4242', description: 'Succeeds and immediately processes the payment' },
            { brand: 'Visa (Debit)', number: '4000 0566 5566 5556', description: 'Debit card - succeeds' },
            { brand: 'Mastercard', number: '5555 5555 5555 4444', description: 'Succeeds and immediately processes the payment' },
            { brand: 'Mastercard (2-series)', number: '2223 0031 2200 3222', description: 'Mastercard 2-series succeeds' },
            { brand: 'American Express', number: '3782 822463 10005', description: 'Succeeds (4-digit CVC required)' },
            { brand: 'Discover', number: '6011 1111 1111 1117', description: 'Succeeds and immediately processes the payment' },
            { brand: 'Diners Club', number: '3056 9300 0902 0004', description: 'Succeeds and immediately processes the payment' },
            { brand: 'JCB', number: '3566 0020 2036 0505', description: 'Succeeds and immediately processes the payment' },
            { brand: 'UnionPay', number: '6200 0000 0000 0005', description: 'Succeeds and immediately processes the payment' },
        ],
        declined: [
            { brand: 'Visa', number: '4000 0000 0000 0002', description: 'Card declined' },
            { brand: 'Visa', number: '4000 0000 0000 9995', description: 'Declined - insufficient funds' },
            { brand: 'Visa', number: '4000 0000 0000 9987', description: 'Declined - lost card' },
            { brand: 'Visa', number: '4000 0000 0000 9979', description: 'Declined - stolen card' },
        ],
        insufficient_funds: [
            { brand: 'Visa', number: '4000 0000 0000 9995', description: 'Declined - insufficient funds' },
        ],
        expired: [
            { brand: 'Visa', number: '4000 0000 0000 0069', description: 'Declined - expired card' },
        ],
        '3ds_required': [
            { brand: 'Visa', number: '4000 0027 6000 3184', description: '3D Secure 2 authentication required' },
            { brand: 'Visa', number: '4000 0025 0000 3155', description: '3D Secure authentication required (will fail)' },
            { brand: 'Visa', number: '4000 0000 0000 3220', description: '3D Secure 2 - requires authentication on all transactions' },
        ],
        fraud: [
            { brand: 'Visa', number: '4100 0000 0000 0019', description: 'Always blocked by Radar as highest risk' },
            { brand: 'Visa', number: '4000 0000 0000 0101', description: 'CVC check will fail' },
            { brand: 'Visa', number: '4000 0000 0000 0036', description: 'Address line check (ZIP) will fail' },
        ],
    },
    paypal: {
        success: [
            { brand: 'Visa', number: '4111 1111 1111 1111', description: 'PayPal Sandbox - successful payment' },
            { brand: 'Visa', number: '4012 8888 8888 1881', description: 'PayPal Sandbox - successful payment (alt)' },
            { brand: 'Mastercard', number: '5500 0000 0000 0004', description: 'PayPal Sandbox - successful payment' },
            { brand: 'American Express', number: '3400 0000 0000 009', description: 'PayPal Sandbox - successful payment' },
            { brand: 'Discover', number: '6011 0000 0000 0004', description: 'PayPal Sandbox - successful payment' },
        ],
        declined: [
            { brand: 'Visa', number: '4000 0000 0000 0002', description: 'PayPal Sandbox - declined' },
        ],
        insufficient_funds: [
            { brand: 'Visa', number: '4000 0000 0000 9995', description: 'PayPal Sandbox - insufficient funds' },
        ],
        expired: [
            { brand: 'Visa', number: '4000 0000 0000 0069', description: 'PayPal Sandbox - expired card' },
        ],
        '3ds_required': [
            { brand: 'Visa', number: '4000 0027 6000 3184', description: 'PayPal Sandbox - 3DS required' },
        ],
        fraud: [
            { brand: 'Visa', number: '4100 0000 0000 0019', description: 'PayPal Sandbox - fraud detection triggered' },
        ],
    },
    generic: {
        success: [
            { brand: 'Visa', number: '4111 1111 1111 1111', description: 'Generic test card - works with most sandboxes' },
            { brand: 'Mastercard', number: '5500 0000 0000 0004', description: 'Generic test card - works with most sandboxes' },
            { brand: 'American Express', number: '3400 0000 0000 009', description: 'Generic test card - works with most sandboxes' },
            { brand: 'Discover', number: '6011 0000 0000 0004', description: 'Generic test card - works with most sandboxes' },
        ],
        declined: [
            { brand: 'Visa', number: '4000 0000 0000 0002', description: 'Generic declined card' },
        ],
        insufficient_funds: [
            { brand: 'Visa', number: '4000 0000 0000 9995', description: 'Generic insufficient funds' },
        ],
        expired: [
            { brand: 'Visa', number: '4000 0000 0000 0069', description: 'Generic expired card' },
        ],
        '3ds_required': [
            { brand: 'Visa', number: '4000 0027 6000 3184', description: 'Generic 3DS required' },
        ],
        fraud: [
            { brand: 'Visa', number: '4100 0000 0000 0019', description: 'Generic fraud trigger' },
        ],
    },
};

const SCENARIO_LABELS: Record<CardScenario, { label: string; icon: React.ReactNode; color: string }> = {
    success: { label: 'Successful Payment', icon: <CheckCircle size={14} />, color: 'text-green-500' },
    declined: { label: 'Card Declined', icon: <XCircle size={14} />, color: 'text-red-500' },
    insufficient_funds: { label: 'Insufficient Funds', icon: <AlertCircle size={14} />, color: 'text-orange-500' },
    expired: { label: 'Expired Card', icon: <AlertCircle size={14} />, color: 'text-yellow-500' },
    '3ds_required': { label: '3D Secure Required', icon: <Shield size={14} />, color: 'text-blue-500' },
    fraud: { label: 'Fraud Detection', icon: <AlertCircle size={14} />, color: 'text-purple-500' },
};

export const TestDataGenerator: React.FC = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [activeCategory, setActiveCategory] = useState<Category>('identity');
    const [count, setCount] = useState(1);
    const [generatedData, setGeneratedData] = useState<string>('');
    const [copied, setCopied] = useState(false);
    // Finance-specific state
    const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('stripe');
    const [cardScenario, setCardScenario] = useState<CardScenario>('success');

    const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
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
        const cards = TEST_CARDS[paymentProvider][cardScenario];
        const selectedCard = getRandom(cards);

        // Generate a future expiry date (between 1-5 years from now)
        const currentYear = new Date().getFullYear() % 100;
        const expiryMonth = getRandomNum(1, 12).toString().padStart(2, '0');
        const expiryYear = (currentYear + getRandomNum(1, 5)).toString();

        // CVV is 4 digits for Amex, 3 for others
        const isAmex = selectedCard.brand.toLowerCase().includes('amex') || selectedCard.brand.toLowerCase().includes('american express');
        const cvv = isAmex ? getRandomNum(1000, 9999).toString() : getRandomNum(100, 999).toString();

        return {
            provider: paymentProvider.charAt(0).toUpperCase() + paymentProvider.slice(1),
            scenario: SCENARIO_LABELS[cardScenario].label,
            cardBrand: selectedCard.brand,
            cardNumber: selectedCard.number,
            expiry: `${expiryMonth}/${expiryYear}`,
            cvv: cvv,
            description: selectedCard.description,
            // Additional test data
            cardholderName: `${getRandom(FIRST_NAMES)} ${getRandom(LAST_NAMES)}`,
            billingZip: getRandomNum(10000, 99999).toString(),
            // Mock SA IBAN style (for bank transfer tests)
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

                        {/* Payment Provider Selector - Only shown for Finance category */}
                        {activeCategory === 'finance' && (
                            <>
                                <button
                                    onClick={() => setActiveCategory('identity')}
                                    className="w-full flex items-center gap-2 px-3 py-2 mb-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border"
                                >
                                    <ArrowLeft size={16} />
                                    Back to Categories
                                </button>
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Payment Provider</label>
                                    <select
                                        value={paymentProvider}
                                        onChange={(e) => setPaymentProvider(e.target.value as PaymentProvider)}
                                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="stripe">Stripe</option>
                                        <option value="paypal">PayPal</option>
                                        <option value="generic">Generic (Most Sandboxes)</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Test Scenario</label>
                                    <div className="space-y-1">
                                        {(Object.keys(SCENARIO_LABELS) as CardScenario[]).map((scenario) => (
                                            <button
                                                key={scenario}
                                                onClick={() => setCardScenario(scenario)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left text-sm ${cardScenario === scenario
                                                    ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                                                    : 'hover:bg-muted/50 text-muted-foreground border border-transparent'
                                                    }`}
                                            >
                                                <span className={SCENARIO_LABELS[scenario].color}>
                                                    {SCENARIO_LABELS[scenario].icon}
                                                </span>
                                                {SCENARIO_LABELS[scenario].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <p className="text-xs text-blue-400">
                                        <strong>Note:</strong> These test cards only work when your payment provider is in <strong>test/sandbox mode</strong>.
                                    </p>
                                </div>
                            </>
                        )}

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
