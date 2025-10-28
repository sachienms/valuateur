
'use client';
import React,
{ Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RevenueChart, ROICChart } from '@/components/charts';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Autocomplete } from '@/components/ticker-autocomplete';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Info, ChevronDown, RotateCw, PlusCircle, Trash2 } from 'lucide-react';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError, useMemoFirebase, useDoc } from '@/firebase';
import { Stock } from '@/context/WatchlistContext';
import { nanoid } from 'nanoid';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Skeleton } from './ui/skeleton';
import {
  handleCalculateTrappedCash,
  handleCalculateConvDebt,
  handleCalculateRandDAdjustments,
  handleCalculateLeaseAdjustments,
  handleCalculateCostOfDebt,
  handleCalculateFinalFields,
} from '@/lib/dcf-calculations';
import { useToast } from '@/hooks/use-toast';

const valuationSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required'),
  country: z.string().min(1, 'Country is required'),
  primaryMarket: z.string().optional(),
  industry: z.string().min(1, 'Industry is required'),
  currency: z.string().min(1, 'Currency is required'),
  valuesIn: z.string().min(1, 'This field is required.'),
  description: z.string().optional(),
  riskFreeRate: z.coerce.number().optional(),
  inflation: z.coerce.number().optional(),
  marginalTaxRate: z.coerce.number().optional(),
  
  // New Financials
  revenueTTM: z.coerce.number().optional(),
  revenuePrevYear: z.coerce.number().optional(),
  ebitTTM: z.coerce.number().optional(),
  ebitPrevYear: z.coerce.number().optional(),
  interestExpenseTTM: z.coerce.number().optional(),
  interestExpensePrevYear: z.coerce.number().optional(),
  cashEquivalentTTM: z.coerce.number().optional(),
  cashEquivalentPrevYear: z.coerce.number().optional(),
  minorityInterestTTM: z.coerce.number().optional(),
  minorityInterestPrevYear: z.coerce.number().optional(),
  crossHoldingsTTM: z.coerce.number().optional(),
  crossHoldingsPrevYear: z.coerce.number().optional(),
  bvOfEquityTTM: z.coerce.number().optional(),
  bvOfEquityPrevYear: z.coerce.number().optional(),
  bvOfDebtTTM: z.coerce.number().optional(),
  bvOfDebtPrevYear: z.coerce.number().optional(),
  avgMaturityOfDebt: z.coerce.number().optional(),
  sharesOutstanding: z.coerce.number().optional(),
  currentRunningQuarter: z.string().optional(),
  cashIsTrapped: z.boolean().optional(),
  trappedCashAmount: z.coerce.number().optional(),
  foreignCountryTaxRate: z.coerce.number().optional(),
  trappedCashValue: z.coerce.number().optional(),

  // R&D Capitalization
  capitalizeRandD: z.boolean().optional(),
  randdExpenses: z.array(z.object({
    year: z.string(),
    expense: z.coerce.number().optional(),
  })).optional(),
  adjustedEbit: z.coerce.number().optional(),
  unamortizedAmount: z.coerce.number().optional(),
  
  // Lease Capitalization
  capitalizeLease: z.boolean().optional(),
  leaseExpenses: z.array(z.object({
    year: z.string(),
    expense: z.coerce.number().optional(),
  })).optional(),
  ebitAdjToLease: z.coerce.number().optional(),
  interestExpensesAdjToLease: z.coerce.number().optional(),
  debtAdjToLease: z.coerce.number().optional(),

  // Pre-tax Cost of Debt
  costOfDebtMethod: z.enum(['direct', 'rating', 'synthetic']).default('direct'),
  pretaxCodDirect: z.coerce.number().optional(),
  codRating: z.string().optional(),
  codCompanyType: z.string().optional(),
  pretaxCodCalculated: z.coerce.number().optional(),
  codCalculated: z.coerce.number().optional(),
  
  // Convertible Debt
  hasConvertibleDebt: z.boolean().optional(),
  bvConvDebt: z.coerce.number().optional(),
  interestConvDebt: z.coerce.number().optional(),
  convDebtMaturity: z.coerce.number().optional(),
  pvConvDebt: z.coerce.number().optional(),

  // Final Calculated Fields
  finalAdjustedEbit: z.coerce.number().optional(),
  adjustedCash: z.coerce.number().optional(),
  adjustedBvOfDebt: z.coerce.number().optional(),
  marketValueOfDebt: z.coerce.number().optional(),

  erp: z.coerce.number().optional(),
  beta: z.coerce.number().optional(),
  costDebt: z.coerce.number().optional(),
  taxRate: z.coerce.number().optional(),
  growth5y: z.coerce.number().optional(),
  growth10y: z.coerce.number().optional(),
  targetMargin: z.coerce.number().optional(),
  salesCapital: z.coerce.number().optional(),
});

type ValuationFormValues = z.infer<typeof valuationSchema>;

const ratingOptions = ["D2", "C", "Ca", "Caa3", "Caa2", "Caa1", "B3", "B2", "B1", "Ba3", "Ba2", "Ba1", "Baa3", "Baa2", "Baa1", "A3", "A2", "A1", "Aa3", "Aa2", "Aa1", "Aaa"];


function IndustryInfoDialog({ industries }: { industries: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Dialog onOpenChange={(open) => !open && setIsExpanded(false)}>
      <DialogTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
      </DialogTrigger>
      <DialogContent className={cn("max-w-md", isExpanded && "max-w-lg")}>
        <DialogHeader>
          <DialogTitle className="sr-only">Industry Information</DialogTitle>
          <DialogDescription>
            We have a list of 96 industry categories, the preloaded industry type is what we thought the best suited for this stock, however you can change it. To view all the categories click expand.
          </DialogDescription>
        </DialogHeader>
        {isExpanded && (
           <ScrollArea className="h-72 w-full rounded-md border p-4">
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {industries.map((industry) => (
                  <li key={industry} className="text-sm">{industry}</li>
                ))}
              </ul>
          </ScrollArea>
        )}
        <DialogFooter className="!justify-end">
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
            <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function DcfValuationFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [stockOptions, setStockOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [marketOptions, setMarketOptions] = useState<string[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<string[]>(['USD']);
  const [countrySpread, setCountrySpread] = useState<number>(0);
  const [isTrappedCashExpanded, setIsTrappedCashExpanded] = useState(false);
  const [isConvertibleDebtExpanded, setIsConvertibleDebtExpanded] = useState(false);
  
  const [isRandDExpanded, setIsRandDExpanded] = useState(false);
  const [randdYears, setRanddYears] = useState([{ id: 0, label: 'Current Year' }, { id: 1, label: '1 year(s) before' }]);

  const [isLeaseExpanded, setIsLeaseExpanded] = useState(false);
  const [leaseYears, setLeaseYears] = useState(['Next year', 'Year 2 & Above']);


  const editStockId = searchParams.get('edit');
  const fromWatchlistId = searchParams.get('watchlistId');

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentWatchlistId, setCurrentWatchlistId] = useState<string | null>(fromWatchlistId);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const form = useForm<ValuationFormValues>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      ticker: '',
      country: '',
      primaryMarket: '',
      industry: '',
      currency: 'USD',
      valuesIn: 'Million',
      description: '',
      riskFreeRate: undefined,
      inflation: undefined,
      marginalTaxRate: undefined,
      revenueTTM: undefined,
      revenuePrevYear: undefined,
      ebitTTM: undefined,
      ebitPrevYear: undefined,
      interestExpenseTTM: undefined,
      interestExpensePrevYear: undefined,
      cashEquivalentTTM: undefined,
      cashEquivalentPrevYear: undefined,
      minorityInterestTTM: undefined,
      minorityInterestPrevYear: undefined,
      crossHoldingsTTM: undefined,
      crossHoldingsPrevYear: undefined,
      bvOfEquityTTM: undefined,
      bvOfEquityPrevYear: undefined,
      bvOfDebtTTM: undefined,
      bvOfDebtPrevYear: undefined,
      avgMaturityOfDebt: undefined,
      sharesOutstanding: undefined,
      currentRunningQuarter: '1',
      cashIsTrapped: false,
      trappedCashAmount: undefined,
      foreignCountryTaxRate: undefined,
      trappedCashValue: undefined,
      capitalizeRandD: false,
      randdExpenses: [{ year: 'Current Year', expense: undefined }, { year: '1 year(s) before', expense: undefined }],
      adjustedEbit: undefined,
      unamortizedAmount: undefined,
      capitalizeLease: false,
      leaseExpenses: [{ year: 'Next year', expense: undefined }, { year: 'Year 2 & Above', expense: undefined }],
      ebitAdjToLease: undefined,
      interestExpensesAdjToLease: undefined,
      debtAdjToLease: undefined,
      costOfDebtMethod: 'direct',
      hasConvertibleDebt: false,
      bvConvDebt: undefined,
      interestConvDebt: undefined,
      convDebtMaturity: undefined,
      pvConvDebt: undefined,
      finalAdjustedEbit: undefined,
      adjustedCash: undefined,
      adjustedBvOfDebt: undefined,
      marketValueOfDebt: undefined,
      erp: undefined,
      beta: undefined,
      costDebt: undefined,
      taxRate: undefined,
      growth5y: undefined,
      growth10y: undefined,
      targetMargin: undefined,
      salesCapital: undefined,
    },
  });

  const selectedCountry = form.watch('country');
  const valuesIn = form.watch('valuesIn');
  
  const cashIsTrapped = form.watch('cashIsTrapped');
  const prevCashIsTrappedRef = useRef(cashIsTrapped);

  const hasConvertibleDebt = form.watch('hasConvertibleDebt');
  const prevHasConvertibleDebtRef = useRef(hasConvertibleDebt);

  const capitalizeRandD = form.watch('capitalizeRandD');
  const prevCapitalizeRandDRef = useRef(capitalizeRandD);

  const capitalizeLease = form.watch('capitalizeLease');
  const prevCapitalizeLeaseRef = useRef(capitalizeLease);

  const costOfDebtMethod = form.watch('costOfDebtMethod');

  const handleAddRandDYear = () => {
    const nextYear = randdYears.length;
    setRanddYears([...randdYears, { id: nextYear, label: `${nextYear} year(s) before` }]);
    const currentExpenses = form.getValues('randdExpenses') || [];
    form.setValue('randdExpenses', [...currentExpenses, { year: `${nextYear} year(s) before`, expense: undefined }]);
  };

  const handleRemoveRandDYear = (index: number) => {
    setRanddYears(randdYears.filter((_, i) => i !== index));
    const currentExpenses = form.getValues('randdExpenses') || [];
    form.setValue('randdExpenses', currentExpenses.filter((_, i) => i !== index));
  };
  
  const handleAddLeaseYear = () => {
    const nextYearIndex = leaseYears.length;
    const newYearLabel = `Year ${nextYearIndex + 1}`;
    const newLastYearLabel = `Year ${nextYearIndex + 2} & Above`;

    // Insert the new year before the last element
    const newYears = [...leaseYears.slice(0, -1), newYearLabel, newLastYearLabel];
    setLeaseYears(newYears);

    // Update form values
    const currentExpenses = form.getValues('leaseExpenses') || [];
    const newExpenses = [
        ...currentExpenses.slice(0, -1),
        { year: newYearLabel, expense: undefined },
        { year: newLastYearLabel, expense: currentExpenses.slice(-1)[0]?.expense }
    ];
    form.setValue('leaseExpenses', newExpenses);
    
    // Update the name of the last field in react-hook-form
    form.unregister(`leaseExpenses.${leaseYears.length -1}.year`);
    form.register(`leaseExpenses.${newYears.length - 1}.year`);
    form.setValue(`leaseExpenses.${newYears.length - 1}.year`, newLastYearLabel);
  };

  const handleRemoveLeaseYear = (indexToRemove: number) => {
    // Prevent removing the first or last item
    if (indexToRemove === 0 || indexToRemove === leaseYears.length - 1 || leaseYears.length <= 2) return;

    const newYears = leaseYears.filter((_, index) => index !== indexToRemove);
    const updatedYears = newYears.map((year, index) => {
        if (index > 0 && index < newYears.length - 1) {
            return `Year ${index + 1}`;
        }
        if (index === newYears.length - 1) {
            return `Year ${newYears.length} & Above`;
        }
        return year; // 'Next year'
    });
    setLeaseYears(updatedYears);
    
    const currentExpenses = form.getValues('leaseExpenses') || [];
    const newExpenses = currentExpenses.filter((_, i) => i !== indexToRemove).map((item, index) => ({
        ...item,
        year: updatedYears[index]
    }));
    form.setValue('leaseExpenses', newExpenses);
  };


  useEffect(() => {
    const wasToggledOn = !prevCashIsTrappedRef.current && cashIsTrapped;
    if (wasToggledOn) {
      setIsTrappedCashExpanded(true);
    }
    
    if (!cashIsTrapped) {
      setIsTrappedCashExpanded(false);
    }

    prevCashIsTrappedRef.current = cashIsTrapped;
  }, [cashIsTrapped]);
  
  useEffect(() => {
    const wasToggledOn = !prevHasConvertibleDebtRef.current && hasConvertibleDebt;
    if (wasToggledOn) {
      setIsConvertibleDebtExpanded(true);
    }
    if (!hasConvertibleDebt) {
      setIsConvertibleDebtExpanded(false);
    }
    prevHasConvertibleDebtRef.current = hasConvertibleDebt;
  }, [hasConvertibleDebt]);

  useEffect(() => {
    const wasToggledOn = !prevCapitalizeRandDRef.current && capitalizeRandD;
    if (wasToggledOn) {
      setIsRandDExpanded(true);
    }
    if (!capitalizeRandD) {
      setIsRandDExpanded(false);
    }
    prevCapitalizeRandDRef.current = capitalizeRandD;
  }, [capitalizeRandD]);

  useEffect(() => {
    const wasToggledOn = !prevCapitalizeLeaseRef.current && capitalizeLease;
    if (wasToggledOn) {
      setIsLeaseExpanded(true);
    }
    if (!capitalizeLease) {
      setIsLeaseExpanded(false);
    }
    prevCapitalizeLeaseRef.current = capitalizeLease;
  }, [capitalizeLease]);

  useEffect(() => {
    const fetchValuationDataForEdit = async () => {
        if (editStockId && userDocRef) {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userProfile = userDocSnap.data();
                const allStocks = userProfile.watchlists?.flatMap((w: any) => w.stocks || []) || [];
                const stockToEdit = allStocks.find((s: Stock) => s.id === editStockId);
                
                if (stockToEdit && stockToEdit.valuationData) {
                    setIsEditMode(true);
                    form.reset(stockToEdit.valuationData);
                     if (stockToEdit.valuationData.randdExpenses) {
                        const years = stockToEdit.valuationData.randdExpenses.map((exp: any, index: number) => ({
                            id: index,
                            label: exp.year
                        }));
                        setRanddYears(years);
                    }
                     if (stockToEdit.valuationData.leaseExpenses) {
                        const years = stockToEdit.valuationData.leaseExpenses.map((exp: any) => exp.year.replace(/(\d)(?=&amp;)/, '$1 '));
                        setLeaseYears(years);
                    }
                    const watchlist = userProfile.watchlists.find((w: any) => w.stocks?.some((s: Stock) => s.id === editStockId));
                    if (watchlist) {
                      setCurrentWatchlistId(watchlist.id);
                    }
                }
            }
        }
    };
    fetchValuationDataForEdit();
  }, [editStockId, userDocRef, form]);
  
  const fetchZList = useCallback(async (docId: string): Promise<string[]> => {
    try {
        const docRef = doc(db, 'parameters', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const zlist = data.zlist;
             if (zlist && typeof zlist === 'string') {
                try {
                    // Attempt to parse the string as JSON
                    const parsed = JSON.parse(zlist);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                } catch (e) {
                    // Fallback for incorrectly formatted strings
                    console.error(`Error parsing zlist for docId: ${docId}, falling back to string split.`, e);
                    return zlist.replace(/^\["|"\]$/g, '').split('","');
                }
            }
        }
        console.warn(`zlist not found or not a string for docId: ${docId}`);
        return [];
    } catch (error) {
        console.error(`Error fetching zlist for ${docId}:`, error);
        return [];
    }
  }, []);

  const fetchRiskFreeRate = useCallback(async (): Promise<number | null> => {
    try {
        const generalRef = doc(db, 'parameters', 'general');
        const generalSnap = await getDoc(generalRef);
        if (generalSnap.exists()) {
            const generalData = generalSnap.data();
            if (generalData.riskfreerate) {
                return parseFloat(generalData.riskfreerate);
            }
        }
    } catch (error) {
        console.error("Error fetching initial risk free rate:", error);
    }
    return null;
  }, []);


  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setInitialDataLoading(true);
        // Fetch all initial data in parallel to speed up loading
        const [stocks, countries, markets, riskFreeRate] = await Promise.all([
          fetchZList('stocks'),
          fetchZList('countries'),
          fetchZList('markets'),
          fetchRiskFreeRate()
        ]);

        setStockOptions(stocks);
        setCountryOptions(countries);
        setMarketOptions(["Global", ...markets]);
        
        if (riskFreeRate !== null && !form.getValues('riskFreeRate')) {
          form.setValue('riskFreeRate', riskFreeRate);
        }
      } catch (error) {
        console.error("Error fetching initial valuation data:", error);
      } finally {
        setInitialDataLoading(false);
      }
    };

    if (!isEditMode) {
      fetchInitialData();
    } else {
      // In edit mode, we still need to fetch options, but don't set loading to false until they're fetched
      // to avoid layout shifts. We also don't want to override form values being set.
      const fetchOptions = async () => {
         const [stocks, countries, markets] = await Promise.all([
            fetchZList('stocks'),
            fetchZList('countries'),
            fetchZList('markets'),
         ]);
         setStockOptions(stocks);
         setCountryOptions(countries);
         setMarketOptions(["Global", ...markets]);
         setInitialDataLoading(false); // Now we can show the form
      }
      fetchOptions();
    }
  }, [isEditMode, fetchZList, fetchRiskFreeRate, form]);


  const fetchCountryData = useCallback(async (country: string) => {
    const newOptions = ['USD']; 
    if (country) {
      form.setValue('primaryMarket', country, { shouldValidate: true, shouldDirty: true });
      try {
        const countryDocRef = doc(db, 'parameters/countries/countries', country);
        const countrySnap = await getDoc(countryDocRef);
        if (countrySnap.exists()) {
          const countryData = countrySnap.data();
          const localCurrency = countryData.currency;
          if (localCurrency && localCurrency !== 'USD' && !newOptions.includes(localCurrency)) {
            newOptions.push(localCurrency);
          }
           if (countryData.mtr) {
            form.setValue('marginalTaxRate', parseFloat(countryData.mtr), { shouldValidate: true, shouldDirty: true });
          }
          if (countryData.spread) {
            const spreadValue = parseFloat(countryData.spread);
            setCountrySpread(spreadValue);
          } else {
            setCountrySpread(0);
          }
        } else {
            setCountrySpread(0);
        }
      } catch (error) {
        console.error("Error fetching country data:", error);
        setCountrySpread(0);
      }
    }
    setCurrencyOptions(newOptions);
    if (!form.getValues('currency')) {
        form.setValue('currency', 'USD');
    }
  }, [form]);


  useEffect(() => {
    if (selectedCountry) {
        fetchCountryData(selectedCountry);
    }
  }, [selectedCountry, fetchCountryData]);


  const handleCompanySelect = useCallback(async (selectedCompany: string) => {
    form.setValue('ticker', selectedCompany, { shouldValidate: true, shouldDirty: true });
    
    if (!selectedCompany) return;
    
    const tickerMatch = selectedCompany.match(/\(([^)]+)\)/);
    const ticker = tickerMatch ? tickerMatch[1] : selectedCompany;
    if(!ticker) return;

    try {
        const stockDocRef = doc(db, 'parameters/stocks/stocks', ticker);
        const stockSnap = await getDoc(stockDocRef);

        if (stockSnap.exists()) {
            const stockData = stockSnap.data();
            if (stockData.country) {
                form.setValue('country', stockData.country, { shouldValidate: true, shouldDirty: true });
            }
            if (stockData.industry) {
                form.setValue('industry', stockData.industry, { shouldValidate: true, shouldDirty: true });
            }
        }
    } catch (error) {
        console.error("Error fetching stock details for autopopulate:", error);
    }
  }, [form]);

  const onSubmit = async (data: ValuationFormValues) => {
    if (!user || !userDocRef) return;
    
    const tickerMatch = data.ticker.match(/\(([^)]+)\)/);
    const tickerSymbol = tickerMatch ? tickerMatch[1] : data.ticker;
    const companyName = data.ticker.split('(')[0].trim();

    const newStock: Stock = {
        id: isEditMode && editStockId ? editStockId : nanoid(),
        name: companyName,
        ticker: tickerSymbol,
        description: data.description || '',
        valuation: 175.20, // Placeholder
        currentPrice: 169.30, // Placeholder
        status: 'green', // Placeholder
        valuationDate: new Date().toISOString().split('T')[0],
        method: 'DCF',
        country: data.country,
        industry: data.industry,
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        valuationData: data,
    };

    try {
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            console.error("User profile does not exist.");
            return;
        }
        let userProfile = userDocSnap.data();
        let watchlists = userProfile.watchlists || [];

        const targetWatchlistId = currentWatchlistId || watchlists.find((w: any) => w.isDefault)?.id || watchlists[0]?.id;

        if (!targetWatchlistId) {
            console.error("Could not determine which watchlist to add the stock to.");
            return;
        }

        let watchlistFound = false;
        const updatedWatchlists = watchlists.map((watchlist: any) => {
            if (watchlist.id === targetWatchlistId) {
                watchlistFound = true;
                const existingStockIndex = watchlist.stocks?.findIndex((s: Stock) => s.id === newStock.id) ?? -1;
                if (existingStockIndex > -1) {
                    // Update existing stock
                    watchlist.stocks[existingStockIndex] = newStock;
                } else {
                    // Add new stock
                    watchlist.stocks = [...(watchlist.stocks || []), newStock];
                }
            } else if (isEditMode) {
                 // Remove from old watchlist if it was moved
                watchlist.stocks = watchlist.stocks?.filter((s: Stock) => s.id !== newStock.id) || [];
            }
            return watchlist;
        });
        
        const updatePayload = { watchlists: updatedWatchlists };

        await updateDoc(userDocRef, updatePayload).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updatePayload
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });

        router.push(`/dashboard/watchlist/${targetWatchlistId}`);

    } catch (error) {
        console.error("Error saving stock valuation:", error);
    }
  };

  if (initialDataLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center">
            <Skeleton className="h-9 w-48" />
        </div>
        <Card className="mt-4">
            <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            </CardContent>
        </Card>
      </main>
    )
  }


  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">
          {isEditMode ? 'Edit' : 'New'} DCF Valuation
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">1. General</TabsTrigger>
              <TabsTrigger value="financials">2. Financials</TabsTrigger>
              <TabsTrigger value="capital">3. Cost of Capital</TabsTrigger>
              <TabsTrigger value="forecast">4. Forecast</TabsTrigger>
              <TabsTrigger value="output">5. Valuation</TabsTrigger>
            </TabsList>

            <Card className="mt-4">
              <TabsContent value="general" className="m-0">
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>
                    Enter the general details for the company and valuation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="ticker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="mb-2 block">Company</FormLabel>
                            <Autocomplete
                              options={stockOptions}
                              value={field.value}
                              onSelect={handleCompanySelect}
                              placeholder="Search company or ticker..."
                              emptyMessage="No results found."
                            />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="mb-2 block">Country</FormLabel>
                          <Autocomplete
                              options={countryOptions}
                              value={field.value}
                              onSelect={(value) => form.setValue('country', value, { shouldValidate: true, shouldDirty: true })}
                              placeholder="Select a country..."
                              emptyMessage="No countries found."
                            />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center gap-2 mb-2">
                                    <FormLabel>Industry</FormLabel>
                                    <IndustryInfoDialog industries={marketOptions} />
                                </div>
                                <Autocomplete
                                    options={marketOptions}
                                    value={field.value}
                                    onSelect={(value) => form.setValue('industry', value, { shouldValidate: true, shouldDirty: true })}
                                    placeholder="Select an industry..."
                                    emptyMessage="No industries found."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                  </div>
                  <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Narration</FormLabel>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="sr-only">Narration Information</DialogTitle>
                                  <DialogDescription>
                                    Type your own version of the story, what do you see in this company
                                  </DialogDescription>
                                </DialogHeader>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <FormControl>
                            <Textarea placeholder="A brief description for your valuation." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                     <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                         <FormItem>
                            <div className="flex items-center gap-2">
                                <FormLabel>Currency</FormLabel>
                                <Dialog>
                                  <DialogTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                  </DialogTrigger>
                                  <DialogContent>
                                      <DialogHeader>
                                          <DialogTitle className="sr-only">Currency Information</DialogTitle>
                                          <DialogDescription>
                                              Choose the currency in which you want to evaluate the company
                                          </DialogDescription>
                                      </DialogHeader>
                                  </DialogContent>
                                </Dialog>
                            </div>
                           <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a currency..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencyOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="riskFreeRate"
                      render={({ field }) => (
                        <FormItem>
                           <div className="flex items-center gap-2">
                               <FormLabel>Risk-Free Rate (%)</FormLabel>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="sr-only">Risk-Free Rate Information</DialogTitle>
                                            <DialogDescription>
                                               The risk-free rate is typically based on the 10-year government bond yield. To account for country-specific risk, add the country's risk premium (spread) to this yield. For {selectedCountry || 'the selected country'}, the spread is {(countrySpread * 100).toFixed(2)}%.
                                            </DialogDescription>
                                        </DialogHeader>
                                    </DialogContent>
                                </Dialog>
                           </div>
                           <FormControl>
                            <Input type="number" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marginalTaxRate"
                      render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center gap-2">
                                <FormLabel>Marginal tax rate (%)</FormLabel>
                                <Dialog>
                                  <DialogTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                  </DialogTrigger>
                                  <DialogContent>
                                      <DialogHeader>
                                          <DialogTitle className="sr-only">Marginal Tax Rate Information</DialogTitle>
                                          <DialogDescription>
                                              It is the corporate tax rate at {selectedCountry || 'the selected country'}.
                                          </DialogDescription>
                                      </DialogHeader>
                                  </DialogContent>
                                </Dialog>
                            </div>
                            <FormControl>
                            <Input 
                                type="number" 
                                {...field} 
                                value={field.value ? field.value * 100 : ''}
                                onChange={e => field.onChange(parseFloat(e.target.value) / 100)}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="inflation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inflation Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="valuesIn"
                      render={({ field }) => (
                         <FormItem>
                          <FormLabel>Values in</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a value type..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Trillion">Trillion</SelectItem>
                              <SelectItem value="Billion">Billion</SelectItem>
                              <SelectItem value="Million">Million</SelectItem>
                              <SelectItem value="Kilo">Kilo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="primaryMarket"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2 mb-2">
                            <FormLabel>Primary market</FormLabel>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="sr-only">Primary Market Information</DialogTitle>
                                        <DialogDescription>
                                            Choose the country at which the company's major revenue comes from (primary market), you can choose 'Global' for MNCs.
                                        </DialogDescription>
                                    </DialogHeader>
                                </DialogContent>
                            </Dialog>
                          </div>
                          <Autocomplete
                              options={marketOptions}
                              value={field.value || ''}
                              onSelect={(value) => form.setValue('primaryMarket', value, { shouldValidate: true, shouldDirty: true })}
                              placeholder="Select a market..."
                              emptyMessage="No markets found."
                            />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="financials" className="m-0">
                <CardHeader>
                  <CardTitle>Financials</CardTitle>
                  <CardDescription>
                    Input the latest financial data. All values in {valuesIn}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {(['revenue', 'ebit', 'interestExpense', 'cashEquivalent', 'minorityInterest', 'crossHoldings', 'bvOfEquity', 'bvOfDebt'] as const).map((item) => (
                            <div key={item} className="space-y-2">
                                <FormLabel>
                                    {item === 'ebit' ? 'EBIT' : item.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                    <FormField
                                        control={form.control}
                                        name={`${item}TTM`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input type="number" placeholder="TTM" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`${item}PrevYear`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input type="number" placeholder="Previous Year" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <FormField
                            control={form.control}
                            name="avgMaturityOfDebt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Average maturity of debt</FormLabel>
                                    <FormControl><Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sharesOutstanding"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Shares Outstanding</FormLabel>
                                    <FormControl><Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="currentRunningQuarter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Running Quarter</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select quarter" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="1">Quarter 1</SelectItem>
                                            <SelectItem value="2">Quarter 2</SelectItem>
                                            <SelectItem value="3">Quarter 3</SelectItem>
                                            <SelectItem value="4">Quarter 4</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                      <div className="rounded-lg border border-border/30 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <FormField
                                control={form.control}
                                name="cashIsTrapped"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center">
                                        <div className="flex items-center space-x-3">
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-base font-medium mb-0 mt-0">
                                                Is there cash trapped in any foreign country
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                             {cashIsTrapped && (
                                <Button variant="ghost" size="icon" onClick={() => setIsTrappedCashExpanded(!isTrappedCashExpanded)}>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isTrappedCashExpanded && "rotate-180")} />
                                    <span className="sr-only">{isTrappedCashExpanded ? 'Collapse' : 'Expand'}</span>
                                </Button>
                            )}
                        </div>
                        {cashIsTrapped && isTrappedCashExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
                              <FormField
                                control={form.control}
                                name="trappedCashAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Trapped cash Amount</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="foreignCountryTaxRate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Foreign country tax rate (%)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="%" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="trappedCashValue"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Trapped cash value</FormLabel>
                                    <div className="flex items-center">
                                        <FormControl>
                                        <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                        </FormControl>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateTrappedCash(form as any)}>
                                            <RotateCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border border-border/30 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <FormField
                                control={form.control}
                                name="capitalizeRandD"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center">
                                        <div className="flex items-center space-x-3">
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-base font-medium mb-0 mt-0">
                                                Do you want to capitalize R&D?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            {capitalizeRandD && (
                                <Button variant="ghost" size="icon" onClick={() => setIsRandDExpanded(!isRandDExpanded)}>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isRandDExpanded && "rotate-180")} />
                                    <span className="sr-only">{isRandDExpanded ? 'Collapse' : 'Expand'}</span>
                                </Button>
                            )}
                        </div>
                        {capitalizeRandD && isRandDExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pt-4 items-start">
                                <div className="space-y-4 md:col-span-3">
                                    <FormLabel>R&D Expense Table</FormLabel>
                                    <div className="rounded-md border border-border/30">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-border/30">
                                                <TableHead>Year</TableHead>
                                                <TableHead>R&D Expense</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {randdYears.map((year, index) => (
                                                <FormField
                                                    key={year.id}
                                                    control={form.control}
                                                    name={`randdExpenses.${index}.expense`}
                                                    render={({ field }) => (
                                                        <TableRow className="border-border/30">
                                                            <TableCell className="font-medium">{year.label}</TableCell>
                                                            <TableCell>
                                                                <FormControl>
                                                                    <Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                                </FormControl>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {index > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleRemoveRandDYear(index)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddRandDYear}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Previous Year
                                    </Button>
                                </div>
                                <div className="space-y-4 md:col-span-2">
                                     <FormField
                                        control={form.control}
                                        name="adjustedEbit"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>EBIT (Adj to R&D)</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl>
                                                <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                </FormControl>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateRandDAdjustments(form as any, toast)}>
                                                    <RotateCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name="unamortizedAmount"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Unamortized amount</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl>
                                                    <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                </FormControl>
                                                <div className="w-10" />
                                            </div>
                                          </FormItem>
                                        )}
                                      />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="rounded-lg border border-border/30 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                             <FormField
                                control={form.control}
                                name="capitalizeLease"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center">
                                        <div className="flex items-center space-x-3">
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-base font-medium mb-0 mt-0">
                                                Do you want to capitalize lease?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            {capitalizeLease && (
                                <Button variant="ghost" size="icon" onClick={() => setIsLeaseExpanded(!isLeaseExpanded)}>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isLeaseExpanded && "rotate-180")} />
                                    <span className="sr-only">{isLeaseExpanded ? 'Collapse' : 'Expand'}</span>
                                </Button>
                            )}
                        </div>
                         {capitalizeLease && isLeaseExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pt-4 items-start">
                                <div className="space-y-4 md:col-span-3">
                                    <FormLabel>Lease Expense Table</FormLabel>
                                     <div className="rounded-md border border-border/30">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-border/30">
                                                    <TableHead>Year</TableHead>
                                                    <TableHead>Lease Expense</TableHead>
                                                     <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {leaseYears.map((year, index) => (
                                                    <FormField
                                                        key={year}
                                                        control={form.control}
                                                        name={`leaseExpenses.${index}.expense`}
                                                        render={({ field }) => (
                                                            <TableRow className="border-border/30">
                                                                <TableCell className="font-medium">{year.replace(/(\d)(?=&)/, '$1 ')}</TableCell>
                                                                <TableCell>
                                                                    <FormControl>
                                                                        <Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                                    </FormControl>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {index > 0 && index < leaseYears.length - 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleRemoveLeaseYear(index)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    />
                                                ))}
                                            </TableBody>
                                        </Table>
                                     </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddLeaseYear}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Year
                                    </Button>
                                </div>
                                <div className="space-y-4 md:col-span-2">
                                     <FormField
                                        control={form.control}
                                        name="ebitAdjToLease"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>EBIT (Adj to lease)</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl>
                                                <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                </FormControl>
                                                <div className="w-10" />
                                            </div>
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name="interestExpensesAdjToLease"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Interest Expenses (Adj to lease)</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl>
                                                <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                </FormControl>
                                                <div className="w-10" />
                                            </div>
                                          </FormItem>
                                        )}
                                      />
                                       <FormField
                                        control={form.control}
                                        name="debtAdjToLease"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Debt (Adj to lease)</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl>
                                                <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                                </FormControl>
                                                <div className="w-10" />
                                            </div>
                                          </FormItem>
                                        )}
                                      />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-4 pt-6">
                        <FormField
                            control={form.control}
                            name="costOfDebtMethod"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel className="text-base font-medium">Pre tax Cost of Debt</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="direct" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Direct Input</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="rating" />
                                            </FormControl>
                                            <FormLabel className="font-normal">By S&P or Moody&apos;s rating</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="synthetic" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Synthetic calculation</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        {costOfDebtMethod === 'direct' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 pt-2">
                                <FormField
                                    control={form.control}
                                    name="pretaxCodDirect"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pre tax COD (%)</FormLabel>
                                            <FormControl><Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="codCalculated"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>COD (%)</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl><Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateCostOfDebt(form as any)}>
                                                    <RotateCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                        {costOfDebtMethod === 'rating' && (
                           <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 pt-2">
                                <FormField
                                    control={form.control}
                                    name="codRating"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rating</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a rating..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {ratingOptions.map(option => (
                                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="pretaxCodCalculated"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pre tax COD (%)</FormLabel>
                                                <div className="flex items-center">
                                                <FormControl><Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateCostOfDebt(form as any)}>
                                                    <RotateCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="codCalculated"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>COD (%)</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl><Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateCostOfDebt(form as any)}>
                                                    <RotateCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                         {costOfDebtMethod === 'synthetic' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 pt-2">
                                <FormField
                                    control={form.control}
                                    name="codCompanyType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select company type..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="large">Large-cap</SelectItem>
                                                    <SelectItem value="small">Small-cap</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="pretaxCodCalculated"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pre tax COD (%)</FormLabel>
                                                <div className="flex items-center">
                                                <FormControl><Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateCostOfDebt(form as any)}>
                                                    <RotateCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="codCalculated"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>COD (%)</FormLabel>
                                            <div className="flex items-center">
                                                <FormControl><Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} /></FormControl>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateCostOfDebt(form as any)}>
                                                    <RotateCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                     <div className="rounded-lg border border-border/30 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <FormField
                                control={form.control}
                                name="hasConvertibleDebt"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center">
                                        <div className="flex items-center space-x-3">
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-base font-medium mb-0 mt-0">
                                                Do the company has convertible debt?
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                             {hasConvertibleDebt && (
                                <Button variant="ghost" size="icon" onClick={() => setIsConvertibleDebtExpanded(!isConvertibleDebtExpanded)}>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isConvertibleDebtExpanded && "rotate-180")} />
                                    <span className="sr-only">{isConvertibleDebtExpanded ? 'Collapse' : 'Expand'}</span>
                                </Button>
                            )}
                        </div>
                        {hasConvertibleDebt && isConvertibleDebtExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 items-end">
                              <FormField
                                control={form.control}
                                name="bvConvDebt"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Book value of conv. debt</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="interestConvDebt"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Interest on conv. debt</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={form.control}
                                name="convDebtMaturity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Con debt maturity</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="pvConvDebt"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Present value of conv. debt</FormLabel>
                                    <div className="flex items-center">
                                        <FormControl>
                                        <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                        </FormControl>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateConvDebt(form as any)}>
                                            <RotateCw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                        )}
                    </div>
                    <Separator className="mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <FormField
                            control={form.control}
                            name="finalAdjustedEbit"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Adjusted EBIT</FormLabel>
                                <div className="flex items-center">
                                    <FormControl>
                                    <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateFinalFields(form as any, 'finalAdjustedEbit')}>
                                        <RotateCw className="h-4 w-4" />
                                    </Button>
                                </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="adjustedCash"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Adjusted Cash & Equivalent</FormLabel>
                                <div className="flex items-center">
                                    <FormControl>
                                    <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateFinalFields(form as any, 'adjustedCash')}>
                                        <RotateCw className="h-4 w-4" />
                                    </Button>
                                </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="adjustedBvOfDebt"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Adjusted BV of debt</FormLabel>
                                <div className="flex items-center">
                                    <FormControl>
                                    <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateFinalFields(form as any, 'adjustedBvOfDebt')}>
                                        <RotateCw className="h-4 w-4" />
                                    </Button>
                                </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="marketValueOfDebt"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Market value of debt</FormLabel>
                                <div className="flex items-center">
                                    <FormControl>
                                    <Input type="number" readOnly {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleCalculateFinalFields(form as any, 'marketValueOfDebt')}>
                                        <RotateCw className="h-4w-4" />
                                    </Button>
                                </div>
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="capital" className="m-0">
                <CardHeader>
                  <CardTitle>Cost of Capital</CardTitle>
                  <CardDescription>
                    Calculate the Weighted Average Cost of Capital (WACC).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-base font-medium">Cost of Equity</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border items-end">
                            <FormField
                            control={form.control}
                            name="erp"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Equity Risk Premium (%)</FormLabel>
                                <FormControl>
                                    <Input placeholder="5.96" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="beta"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Beta</FormLabel>
                                <FormControl>
                                    <Input placeholder="1.29" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-base font-medium">Pre tax cost of debt</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border items-end">
                            <FormField
                                control={form.control}
                                name="costDebt"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Pre-tax Cost of Debt (%)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="4.75" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-base font-medium">Tax Rate</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border items-end">
                            <FormField
                            control={form.control}
                            name="taxRate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Effective Tax Rate (%)</FormLabel>
                                <FormControl>
                                    <Input placeholder="16.2" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                                </FormControl>
                                </FormItem>
                            )}
                            />
                        </div>
                    </div>

                  <Separator className="my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <Label>Calculated Cost of Equity</Label>
                      <p className="text-2xl font-bold">11.91%</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <Label>Calculated WACC</Label>
                      <p className="text-2xl font-bold">9.85%</p>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="forecast" className="m-0">
                <CardHeader>
                  <CardTitle>Forecasting</CardTitle>
                  <CardDescription>
                    Set growth assumptions and see the 10-year forecast.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                     <FormField
                      control={form.control}
                      name="growth5y"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Growth Rate (Years 1-5) (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="8.0" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="growth10y"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Growth Rate (Years 6-10) (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="5.0" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="targetMargin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Operating Margin (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="25.0" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="salesCapital"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales to Capital Ratio</FormLabel>
                          <FormControl>
                            <Input placeholder="1.5" type="number" {...field} value={isNaN(field.value as number) ? '' : field.value ?? ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>10-Year Revenue & EBIT Forecast</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <RevenueChart />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>10-Year ROIC vs WACC</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ROICChart />
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="output" className="m-0">
                <CardHeader>
                  <CardTitle>Valuation Output</CardTitle>
                  <CardDescription>
                    Final valuation based on your inputs and forecasts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="p-6 bg-muted rounded-lg">
                      <Label className="text-muted-foreground">
                        Equity Value
                      </Label>
                      <p className="text-4xl font-bold">$2,715,432 M</p>
                    </div>
                    <div className="p-6 bg-primary/10 rounded-lg border border-primary">
                      <Label className="text-primary">
                        Estimated Value/Share
                      </Label>
                      <p className="text-4xl font-bold text-primary">$175.20</p>
                    </div>
                    <div className="p-6 bg-muted rounded-lg">
                      <Label className="text-muted-foreground">
                        Current Share Price
                      </Label>
                      <p className="text-4xl font-bold">$169.30</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg">
                      The stock is currently trading at a
                      <span className="font-bold text-green-400">
                        {' '}
                        3.38% discount{' '}
                      </span>
                      to its estimated value.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                     <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit">
                      {isEditMode ? 'Save and Finish' : 'Add to Watchlist'}
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
            </Card>
          </Tabs>
        </form>
      </Form>
    </main>
  );
}

export function DcfValuationForm() {
  // The DcfValuationFormContent will be rendered by the Suspense boundary in the page
  return <DcfValuationFormContent />;
}

