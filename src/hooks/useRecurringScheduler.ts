import { useEffect } from 'react';
import { RecurringTemplate, Invoice } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export function useRecurringScheduler(
  recurringTemplates: RecurringTemplate[],
  setRecurringTemplates: (templates: RecurringTemplate[]) => void,
  invoices: Invoice[],
  setInvoices: (invoices: Invoice[]) => void,
  isLoaded: boolean
) {
  useEffect(() => {
    if (!isLoaded || recurringTemplates.length === 0) return;

    let templatesUpdated = false;
    let invoicesUpdated = false;
    const newInvoices: Invoice[] = [...invoices];
    const newTemplates = [...recurringTemplates];
    const now = Date.now();

    for (let i = 0; i < newTemplates.length; i++) {
      const template = newTemplates[i];
      if (template.active && template.nextRun <= now) {
        // Generate new invoice
        const invoiceData = template.templateData;
        if (!invoiceData) continue; // safety check

        const newInvoice: Invoice = {
          ...invoiceData,
          id: uuidv4(),
          invoiceNumber: `REC-${Date.now().toString().slice(-6)}`,
          date: template.nextRun, // Create invoice for the date it was supposed to run
          dueDate: template.nextRun + (15 * 24 * 60 * 60 * 1000), // Default 15 days due
          status: 'draft',
          createdAt: now,
        } as Invoice;
        
        newInvoices.push(newInvoice);
        invoicesUpdated = true;

        // Advance nextRun
        const nextDate = new Date(template.nextRun);
        if (template.interval === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (template.interval === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (template.interval === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        
        // Safety to avoid infinite loops if it missed a lot of runs
        if (nextDate.getTime() <= now) {
            const catchupDate = new Date(now);
            if (template.interval === 'weekly') catchupDate.setDate(catchupDate.getDate() + 7);
            else if (template.interval === 'monthly') catchupDate.setMonth(catchupDate.getMonth() + 1);
            else if (template.interval === 'yearly') catchupDate.setFullYear(catchupDate.getFullYear() + 1);
            nextDate.setTime(catchupDate.getTime());
        }

        newTemplates[i] = {
          ...template,
          nextRun: nextDate.getTime(),
        };
        templatesUpdated = true;
      }
    }

    if (invoicesUpdated) {
      setInvoices(newInvoices);
    }
    if (templatesUpdated) {
      setRecurringTemplates(newTemplates);
    }
  }, [isLoaded, recurringTemplates, invoices, setInvoices, setRecurringTemplates]);
}
