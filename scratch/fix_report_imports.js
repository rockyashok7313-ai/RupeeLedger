const fs = require('fs');
const path = require('path');

const filePath = path.resolve('C:/Users/AK/Downloads/KUNJU/PETTY/src/components/ReportPrint.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the FIRST 'export function ReportPrint'
const startIdx = content.indexOf('export function ReportPrint');
const validPrefix = `"use client";

import React, { useRef, useState } from 'react';
import { Transaction, Account, BusinessProfile } from '@/lib/types';
import { CurrencyDisplay } from './CurrencyDisplay';
import { format } from 'date-fns';
import { Printer, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { toast } from '@/hooks/use-toast';

`;

content = validPrefix + content.substring(startIdx);

// Ensure there are no duplicate 'export function ReportPrint' 
const parts = content.split('export function ReportPrint');
if (parts.length > 2) {
    console.log("WARNING: Multiple export functions found!");
}

// Make sure reportRef is defined
if (!content.includes('const reportRef = useRef<HTMLDivElement>(null);')) {
    content = content.replace('const [isExporting, setIsExporting] = useState(false);', 'const [isExporting, setIsExporting] = useState(false);\n  const reportRef = useRef<HTMLDivElement>(null);');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Fix completed successfully!");
