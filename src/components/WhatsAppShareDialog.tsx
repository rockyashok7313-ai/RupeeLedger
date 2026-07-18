import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface WhatsAppShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultText: string;
  documentUrl?: string;
  title?: string;
}

export function WhatsAppShareDialog({
  isOpen,
  onClose,
  defaultPhone = '',
  defaultText,
  documentUrl = '',
  title = 'Share via WhatsApp',
}: WhatsAppShareDialogProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [text, setText] = useState(defaultText);
  const [docUrl, setDocUrl] = useState(documentUrl);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPhone(defaultPhone);
      setText(defaultText);
      setDocUrl(documentUrl);
    }
  }, [isOpen, defaultPhone, defaultText, documentUrl]);

  // Clean phone number helper
  const getCleanPhone = (p: string) => {
    let clean = p.replace(/\D/g, '');
    if (clean.length === 10) {
      clean = '91' + clean; // India code by default
    }
    return clean;
  };

  // 1. Send via WASender API (authenticated server-side request)
  const handleApiSend = async () => {
    if (!phone.trim()) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a valid WhatsApp phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Get the auth token (supporting custom JWT or Supabase sessions)
      const token = localStorage.getItem("rupee_ledger_token") || 
                    (await supabase.auth.getSession()).data.session?.access_token || 
                    null;

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          to: phone,
          text: text,
          documentUrl: docUrl || undefined,
          wasenderApiKey: localStorage.getItem("rupee_ledger_wasender_api_key") || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send via WASender API');
      }

      toast({
        title: result.mock ? 'Message Simulated' : 'Message Sent!',
        description: result.mock
          ? 'WASender API key is not configured; simulated successfully.'
          : `Message successfully sent to ${phone} via WASender API.`,
        variant: 'default',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to Send',
        description: error.message || 'An unexpected error occurred while sending.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // 2. Fallback: Open WhatsApp Web link
  const handleWebShare = () => {
    let urlText = text;
    if (docUrl) {
      urlText += `\n\nDocument Link: ${docUrl}`;
    }
    
    const cleanPhone = getCleanPhone(phone);
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(urlText)}`
      : `https://wa.me/?text=${encodeURIComponent(urlText)}`;
      
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-md rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5 text-green-500" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Send directly via WASender API (server-side) or open standard WhatsApp Web.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm">
          {/* Phone Number Field */}
          <div className="space-y-1">
            <Label htmlFor="whatsapp-phone" className="text-xs font-semibold text-slate-300">
              Recipient WhatsApp Number
            </Label>
            <Input
              id="whatsapp-phone"
              type="tel"
              placeholder="e.g., +91 9876543210 or 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-slate-900 border-slate-800 text-white rounded-lg focus:ring-green-500 focus:border-green-500 focus-visible:ring-offset-0 focus-visible:ring-1"
            />
          </div>

          {/* Message Content Field */}
          <div className="space-y-1">
            <Label htmlFor="whatsapp-text" className="text-xs font-semibold text-slate-300">
              Message Content
            </Label>
            <Textarea
              id="whatsapp-text"
              rows={4}
              placeholder="Type your message here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-slate-900 border-slate-800 text-white rounded-lg focus:ring-green-500 focus:border-green-500 focus-visible:ring-offset-0 focus-visible:ring-1"
            />
          </div>

          {/* Optional Document URL Field */}
          <div className="space-y-1">
            <Label htmlFor="whatsapp-doc" className="text-xs font-semibold text-slate-300">
              Document / PDF Link (Optional)
            </Label>
            <Input
              id="whatsapp-doc"
              type="url"
              placeholder="https://example.com/invoice.pdf"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className="bg-slate-900 border-slate-800 text-white rounded-lg focus:ring-green-500 focus:border-green-500 focus-visible:ring-offset-0 focus-visible:ring-1 text-xs"
            />
            <p className="text-[10px] text-slate-500">
              Will send as an interactive document message if WASender API is used.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleWebShare}
            className="flex-1 sm:flex-none border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg"
          >
            <Globe className="mr-2 h-4 w-4 text-sky-400" />
            WhatsApp Web
          </Button>
          <Button
            type="button"
            disabled={isSending}
            onClick={handleApiSend}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-green-900/25"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send via WASender
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
