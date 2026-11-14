'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function EditProductV3Page() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [product, setProduct] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [markup, setMarkup] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('products')
        .select(`
          *, 
          base_plain_apparel(name, main_image_url), 
          sub_children_styles(style_title, preview_image_url)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        toast.error('Product not found');
        router.replace('/products');
        return;
      }

      setProduct(data);
      setTitle(data.name);
      setDescription(data.description || '');
      setMarkup(String(data.user_profit_markup || 0));
      setLoading(false);
    })();
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description || !markup) return toast.error('Fill all fields');

    setSubmitting(true);
    const supabase = createClient();
    const markupNum = Number(markup);

    const { error } = await supabase
      .from('products')
      .update({
        name: title,
        description: description,
        user_profit_markup: markupNum,
        total_retail_price: (product.base_cost_calculated || 0) + markupNum,
        bransion_commission_fee: markupNum * 0.30,
        creator_net_payout: markupNum * 0.70,
      })
      .eq('id', id);

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Product updated');
      router.push('/products');
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your product details and markup.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Locked Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 opacity-70">
            <div>
              <Label>Apparel</Label>
              <p className="text-sm font-medium">{product.base_plain_apparel?.name}</p>
            </div>
            <div>
              <Label>Style</Label>
              <p className="text-sm font-medium">{product.sub_children_styles?.style_title}</p>
            </div>
          </div>
          <div>
            <Label>Base Cost (M)</Label>
            <p className="text-sm font-medium">₦{product.base_cost_calculated?.toLocaleString()}</p>
          </div>
          <p className="text-xs text-muted-foreground">Images and base apparel are locked by Bransion. Contact support to request a re-render.</p>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Product Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} required />
          </div>
          <div className="space-y-1.5">
            <Label>Your Profit Markup (₦)</Label>
            <Input type="number" value={markup} onChange={e => setMarkup(e.target.value)} required />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push('/products')}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </div>
  );
}