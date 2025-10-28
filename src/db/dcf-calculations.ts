
'use client';

import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { toast as sonnerToast } from 'sonner';
import { type useToast } from '@/hooks/use-toast';

// Assuming the schema is defined and exported from the form component file
// For this example, I'll redefine a minimal version.
const valuationSchema = z.object({
  ebitTTM: z.coerce.number().optional(),
  trappedCashAmount: z.coerce.number().optional(),
  marginalTaxRate: z.coerce.number().optional(),
  foreignCountryTaxRate: z.coerce.number().optional(),
  trappedCashValue: z.coerce.number().optional(),
  randdExpenses: z.array(z.object({
    year: z.string(),
    expense: z.coerce.number().optional(),
  })).optional(),
  pvConvDebt: z.coerce.number().optional(),
  adjustedEbit: z.coerce.number().optional(),
  unamortizedAmount: z.coerce.number().optional(),
  ebitAdjToLease: z.coerce.number().optional(),
  interestExpensesAdjToLease: z.coerce.number().optional(),
  debtAdjToLease: z.coerce.number().optional(),
  pretaxCodCalculated: z.coerce.number().optional(),
  codCalculated: z.coerce.number().optional(),
  finalAdjustedEbit: z.coerce.number().optional(),
  adjustedCash: z.coerce.number().optional(),
  adjustedBvOfDebt: z.coerce.number().optional(),
  marketValueOfDebt: z.coerce.number().optional(),
});

type ValuationFormValues = z.infer<typeof valuationSchema>;

// The form type needs to be passed to the functions
type FormType = UseFormReturn<ValuationFormValues>;
type ToastType = ReturnType<typeof useToast>['toast'];

export const handleCalculateTrappedCash = (form: FormType) => {
  const amount = Number(form.getValues('trappedCashAmount'));
  const marginalTaxRate = Number(form.getValues('marginalTaxRate'));
  const foreignTaxRate = Number(form.getValues('foreignCountryTaxRate'));
  const foreignRateDecimal = foreignTaxRate / 100;
  const calculatedValue = amount * (marginalTaxRate - foreignRateDecimal);
  form.setValue('trappedCashValue', parseFloat(calculatedValue.toFixed(2)), { shouldValidate: true, shouldDirty: true });
};

export const handleCalculateRandDAdjustments = (form: FormType) => {

  const rndExpenses = form.getValues('randdExpenses')
    ?.map(e => Number(e.expense) || 0)
    .filter(e => e > 0) || [];
  
  if (rndExpenses.length < 2) {
    // Not enough data to calculate
    form.setValue('adjustedEbit', 0);
    form.setValue('unamortizedAmount', 0);
    return;
  }

  const currentYearExpense = rndExpenses[0]; //[230, 45, 900, 599]
  const historicalExpenses = rndExpenses.slice(1);
  console.log(historicalExpenses);

  const amortization = historicalExpenses.reduce((a, b) => a + b, 0) / historicalExpenses.length;
  console.log(historicalExpenses.reduce((a, b) => a + b, 0));
  const adjustedEbit = currentYearExpense - amortization;

  const fraction = 1 / historicalExpenses.length;
  const unamortizedAmount: number = parseFloat(rndExpenses.reduce((acc, val, i) => acc + (val * (1 - i * fraction)), 0).toFixed(2));


  form.setValue('adjustedEbit', parseFloat(adjustedEbit.toFixed(2)), { shouldValidate: true, shouldDirty: true });
  form.setValue('unamortizedAmount', parseFloat(unamortizedAmount.toFixed(2)), { shouldValidate: true, shouldDirty: true });
};

export const handleCalculateConvDebt = (form: FormType) => {
  // Placeholder logic
  form.setValue('pvConvDebt', 987.65, { shouldValidate: true, shouldDirty: true });
};

export const handleCalculateLeaseAdjustments = (form: FormType, field: 'ebit' | 'interest' | 'debt') => {
  // Placeholder for Lease Adjustment calculations
  if (field === 'ebit') {
      form.setValue('ebitAdjToLease', 123.45, { shouldValidate: true, shouldDirty: true });
  } else if (field === 'interest') {
      form.setValue('interestExpensesAdjToLease', 67.89, { shouldValidate: true, shouldDirty: true });
  } else {
      form.setValue('debtAdjToLease', 1011.12, { shouldValidate: true, shouldDirty: true });
  }
};

export const handleCalculateCostOfDebt = (form: FormType) => {
  // Placeholder
  form.setValue('pretaxCodCalculated', 5.5, { shouldValidate: true, shouldDirty: true });
  form.setValue('codCalculated', 4.5, { shouldValidate: true, shouldDirty: true });
};

export const handleCalculateFinalFields = (form: FormType, field: 'finalAdjustedEbit' | 'adjustedCash' | 'adjustedBvOfDebt' | 'marketValueOfDebt') => {
  // Placeholder for final calculations
  switch (field) {
    case 'finalAdjustedEbit':
      form.setValue('finalAdjustedEbit', 13000, { shouldValidate: true, shouldDirty: true });
      break;
    case 'adjustedCash':
      form.setValue('adjustedCash', 25000, { shouldValidate: true, shouldDirty: true });
      break;
    case 'adjustedBvOfDebt':
      form.setValue('adjustedBvOfDebt', 55000, { shouldValidate: true, shouldDirty: true });
      break;
    case 'marketValueOfDebt':
      form.setValue('marketValueOfDebt', 58000, { shouldValidate: true, shouldDirty: true });
      break;
  }
};

/**
 * Calculates the present value of a series of future cash flows.
 * @param cashFlowList An array of cash flow amounts for each period.
 * @param rate The discount rate per period.
 * @returns The total present value of the cash flows.
 */
export const presentValueOfCashFlows = (cashFlowList: number[], rate: number): number => {
  return cashFlowList.reduce((total, payment, index) => {
    return total + payment / Math.pow(1 + rate, index + 1);
  }, 0);
};
