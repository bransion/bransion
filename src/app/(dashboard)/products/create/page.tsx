'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ApparelPicker } from '@/components/products/ApparelPicker';
import { StylePicker } from '@/components/products/StylePicker';
import { ProfitCalculatorV3 } from '@/components/products/ProfitCalculatorV3';
import { DesignUpload } from '@/components/products/DesignUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createProductV3, listActiveApparels, listStylesForApparel } from '@/app/actions/products-v3';

export default function CreateProductV3Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [brands, setBrands] = useState<any[]>([]);
  const [apparels, setApparels] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);

  const [brandId, setBrandId] = useState('');
  const [apparel, setApparel] = useState<any>(null);
  const [style, setStyle] = useState<any>(null);
  
  const [artworkUrl, setArtworkUrl] = useState('');
  const [markup, setMarkup] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/sign-in');

      const [brandsRes, apparelsRes] = await Promise.all([
        supabase.from('brands').select('*').eq('creator_id', user.id).eq('is_active', true),
        listActiveApparels(),
      ]);

      setBrands(brandsRes.data || []);
      if (brandsRes.data && brandsRes.data.length > 0) setBrandId(brandsRes.data[0].id);
      setApparels(apparelsRes);
      setLoading(false);
    })();
  }, [router]);

  async function handleApparelSelect(a: any) {
    setApparel(a);
    setStyle(null); // Reset style when apparel changes
    const s = await listStylesForApparel(a.id);
    setStyles(s);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandId || !apparel || !style || !artworkUrl || !markup || !title || !description) {
      return toast.error('Please fill out all steps');
    }

    setSubmitting(true);
    const res = await createProductV3({
      brand_id: brandId,
      plain_apparel_id: apparel.id,
      selected_style_id: style.id,
      selected_size: 'M',
      user_profit_markup: Number(markup),
      raw_creator_artwork_url: artworkUrl,
      title,
      description,
    });
    setSubmitting(false);

    if (res.ok) {
      setShowSuccess(true);
    } else {
      toast.error(res.error);
    }
  }

  function handleCloseModal(open: boolean) {
    setShowSuccess(open);
    if (!open) {
      // Peaceful close: Reset form and redirect
      setTimeout(() => {
        router.push('/products');
        router.refresh();
      }, 100);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You need an active brand first. Please create a brand and complete your tier payment.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Product</h1>
        <p className="text-sm text-muted-foreground mt-1">Follow the steps to build your product.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Brand */}
        <section className="space-y-3 rounded-lg border bg-card p-6">
          <h2 className="font-semibold text-lg">1. Which brand is this for?</h2>
          <Select value={brandId} onValueChange={v => v && setBrandId(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </section>

        {/* Step 2: Apparel */}
        <ApparelPicker apparels={apparels} selectedId={apparel?.id || null} onSelect={handleApparelSelect} />

        {/* Step 3: Style */}
        {apparel && (
          <StylePicker styles={styles} selectedId={style?.id || null} onSelect={setStyle} apparelName={apparel.name} />
        )}

        {/* Step 4: Artwork */}
        {style && (
          <DesignUpload value={artworkUrl} onChange={setArtworkUrl} purpose="raw_asset" />
        )}

        {/* Step 5: Pricing & Details */}
        {style && (
          <>
            <ProfitCalculatorV3 apparel={apparel} style={style} markup={markup} setMarkup={setMarkup} />
            
            <section className="space-y-4 rounded-lg border bg-card p-6">
              <h2 className="font-semibold text-lg">6. Product Details</h2>
              <div className="space-y-1.5">
                <Label>Product Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lagos Street Hoodie" required />
              </div>
              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Tell buyers the story behind this design..." required />
              </div>
            </section>
          </>
        )}

        {/* Submit */}
        <Button type="submit" size="lg" className="w-full" disabled={submitting || !description || !title || !markup || !artworkUrl}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Product for Review'}
        </Button>
      </form>

      {/* Success Modal - FIXED CLOSING LOGIC */}
      <Dialog open={showSuccess} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product submitted successfully!</DialogTitle>
            <DialogDescription>
              Your raw asset and style markup have been routed to the Bransion Synthesis Team. Your product will reflect on the global marketplace within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => handleCloseModal(false)}>
              View my products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}