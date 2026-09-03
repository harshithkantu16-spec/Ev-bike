import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Redirect,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import {
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  Bike,
  Check,
  ChevronDown,
  CircleUserRound,
  Instagram,
  Menu,
  PackagePlus,
  Search,
  ShieldCheck,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  createPart,
  deletePart,
  getListPartsQueryKey,
  updatePart,
  useGetAdminStatus,
  useListParts,
} from '@workspace/api-client-react';
import type { Part } from '@workspace/api-client-react';

const queryClient = new QueryClient();
const instagramUrl = 'https://www.instagram.com/jyothieventerprises/';
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const rawClerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkPubKey = rawClerkKey
  ? (publishableKeyFromHost(window.location.hostname, rawClerkKey) || rawClerkKey)
  : '';
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const isClerkConfigured = Boolean(clerkPubKey && !clerkPubKey.includes('example.com'));

const defaultStarterParts: Part[] = [
  {
    id: 1,
    name: 'BLDC Motor 1000W',
    category: 'Motors',
    price: 8500,
    description: 'A practical motor option for compatible EV builds.',
    icon: 'motor',
    imageUrl: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Smart Sine-Wave Controller 48V/60V',
    category: 'Controllers',
    price: 3450,
    description: 'High-efficiency aluminum sealed sine-wave controller with waterproof connectors.',
    icon: 'controller',
    imageUrl: '/parts/smart-sine-wave-controller.jpg',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Twist Throttle & Key Ignition Grip Set',
    category: 'Displays',
    price: 1250,
    description: 'Ergonomic handlebar throttle grip with key lock switch and battery voltage display.',
    icon: 'display',
    imageUrl: '/parts/key-throttle-display.jpg',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    name: 'DC-DC Converter 12V 10A',
    category: 'Electrical',
    price: 950,
    description: 'Useful electrical support for compatible EV setups.',
    icon: 'charger',
    imageUrl: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 5,
    name: 'Hydraulic E-Brake Cut-off Sensor Cable',
    category: 'Brakes',
    price: 450,
    description: 'Magnetic cut-off brake sensor cable with 3M adhesive and waterproof yellow pins.',
    icon: 'brake',
    imageUrl: '/parts/ebrake-sensor-cable.jpg',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 6,
    name: 'EV Fast Charging Socket Assembly',
    category: 'Charging',
    price: 1850,
    description: 'Heavy-duty 7-pin charging socket inlet with waterproof spring dust cap and wiring harness.',
    icon: 'battery',
    imageUrl: '/parts/ev-charging-socket-port.jpg',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

type ModalKind = 'parts' | 'franchise' | null;
type PartIcon = 'motor' | 'controller' | 'display' | 'charger' | 'brake' | 'battery';

export interface CartItem {
  part: Part;
  quantity: number;
}

export interface BusinessSettings {
  whatsappNumber: string;
  instagramHandle: string;
  supportEmail: string;
  businessCity: string;
}

export const defaultBusinessSettings: BusinessSettings = {
  whatsappNumber: '919876543210',
  instagramHandle: 'jyothieventerprises',
  supportEmail: 'contact@jyothiev.com',
  businessCity: 'Hyderabad / All-India',
};

export function getBusinessSettings(): BusinessSettings {
  try {
    const saved = localStorage.getItem('jyothi_ev_business_settings');
    if (saved) {
      return { ...defaultBusinessSettings, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return defaultBusinessSettings;
}

export function saveBusinessSettings(settings: BusinessSettings) {
  try {
    localStorage.setItem('jyothi_ev_business_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('jyothi_ev_settings_updated'));
  } catch {
    // fallback
  }
}

export function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits || '919876543210';
}

export function getWhatsAppUrl(text: string, customNumber?: string) {
  const num = customNumber || getBusinessSettings().whatsappNumber;
  return `https://wa.me/${formatWhatsAppNumber(num)}?text=${encodeURIComponent(text)}`;
}

const categories = ['All', 'Motors', 'Controllers', 'Displays', 'Charging', 'Brakes', 'Electrical'];

const vehicleModels = [
  'All Vehicles',
  'Ola S1 / Pro / Air',
  'Ather 450X / 450S',
  'Hero Electric Optima / Photon',
  'Okinawa Praise / Ridge',
  'Ampere Magnus / Reo',
  'Pure EV EPluto / Etrance',
  'Bajaj Chetak',
  'TVS iQube',
  'Custom E-Scooter / E-Rickshaw',
];

const voltageOptions = ['All Voltages', '48V', '60V', '72V'];

const workshopReviews = [
  {
    name: 'Rajesh Sharma',
    role: 'Lead Technician, Shree Ganesh EV Works',
    city: 'Hyderabad, Telangana',
    rating: 5,
    comment: 'Jyothi EV is our primary source for BLDC hub motors and 48V controllers. Exact pin compatibility and fast next-day dispatch to our workshop.',
    badge: 'Verified Workshop Partner',
  },
  {
    name: 'Venkatesh Rao',
    role: 'Owner, GreenRide EV Repairs',
    city: 'Vijayawada, Andhra Pradesh',
    rating: 5,
    comment: 'Custom lithium packs with smart BMS are super reliable. Zero heating issues and my customers get genuine range as promised.',
    badge: 'OEM Spares Client',
  },
  {
    name: 'Anand Kumar',
    role: 'Senior Mechanic, EcoWheels Service Center',
    city: 'Bengaluru, Karnataka',
    rating: 5,
    comment: 'Whenever a customer brings a scooter with burnt wiring, I just upload a photo to Jyothi EV and they send the exact matching harness immediately.',
    badge: '100+ Orders Placed',
  },
];

const faqs = [
  {
    question: 'Are these the final prices?',
    answer: 'The prices shown are starting prices for this first parts list. Please confirm the current price, compatibility and availability before ordering.',
  },
  {
    question: 'Can I send a photo of the part I need?',
    answer: 'Yes. Use the “Upload a part photo” button and share a clear image, vehicle details and your question. You can also message the team on Instagram.',
  },
  {
    question: 'Do you support franchise enquiries?',
    answer: 'Yes. Share your city and a little about your plan. The team can explain the current opportunity directly.',
  },
];

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

async function uploadProductImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a PNG, JPG or WebP image.');
  }
  if (file.size > 5_000_000) {
    throw new Error('Please choose an image smaller than 5 MB.');
  }

  const response = await fetch(`${basePath}/api/storage/uploads/request-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? 'We could not start the image upload.');
  }

  const uploadResponse = await fetch(data.uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error('We could not upload that image. Please try again.');
  }

  return `${basePath}/api/storage${data.objectPath}`;
}

function PartIconMark({ icon }: { icon: PartIcon }) {
  if (icon === 'motor') return <Bike size={42} strokeWidth={1.5} />;
  if (icon === 'controller') return <PackagePlus size={42} strokeWidth={1.5} />;
  if (icon === 'display') return <CircleUserRound size={42} strokeWidth={1.5} />;
  if (icon === 'charger') return <Zap size={42} strokeWidth={1.5} />;
  if (icon === 'brake') return <ShieldCheck size={42} strokeWidth={1.5} />;
  return <BatteryCharging size={42} strokeWidth={1.5} />;
}

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <div className={`flex items-center ${large ? 'gap-4' : 'gap-3'}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-2xl border border-[rgba(216,237,88,.4)] bg-gradient-to-br from-[var(--acid)] to-[#9BC926] text-[var(--ink)] shadow-[0_0_20px_rgba(216,237,88,.4)] transition-transform hover:scale-105 ${large ? 'h-16 w-16' : 'h-10 w-10'}`}>
        <Zap size={large ? 32 : 20} strokeWidth={3} className="drop-shadow-sm" />
      </span>
      <span className={`font-display font-black uppercase tracking-[-.04em] ${large ? 'text-4xl leading-[.88] md:text-6xl text-[var(--shell)]' : 'text-base leading-tight text-[var(--shell)]'}`}>
        <span className="text-[var(--shell)]">JYOTHI </span>
        <span className="text-[var(--acid)] text-glow">EV</span>
        <span className={`block font-mono font-bold tracking-[.2em] text-[var(--teal)] ${large ? 'text-xs md:text-sm mt-1.5' : 'text-[9px] tracking-[.22em]'}`}>ENTERPRISES</span>
      </span>
    </div>
  );
}

function AdminModal({
  part,
  onClose,
  onSave,
  onDelete,
}: {
  part: Part | null;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const [imagePreview, setImagePreview] = useState(part?.imageUrl ?? '');

  useEffect(() => {
    setImagePreview(part?.imageUrl ?? '');
  }, [part]);

  const handleImageChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImagePreview(part?.imageUrl ?? '');
      return;
    }
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[rgba(27,42,60,.62)] p-3 md:items-center" role="dialog" aria-modal="true" aria-label={part ? 'Edit part' : 'Add part'} data-testid="dialog-admin">
      <div className="relative max-h-[95dvh] w-full max-w-[600px] overflow-y-auto rounded-[28px] bg-[var(--shell)] p-6 text-[var(--ink)] shadow-2xl md:p-9">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--shell)]" aria-label="Close parts manager" data-testid="button-close-admin"><X size={16} /></button>
        <div className="eyebrow mb-5 text-[var(--coral)]">Admin / Parts manager</div>
        <h2 className="display-tight max-w-[500px] pr-8 text-4xl font-bold md:text-6xl">{part ? 'Change part details.' : 'Add a new part.'}</h2>
        <p className="mt-5 max-w-[470px] text-sm leading-relaxed text-[rgba(27,42,60,.65)]">Add the name, category and current starting price shown to customers. Changes publish across the website for every visitor.</p>
        <form onSubmit={onSave} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-xs font-semibold">Part name<input required name="name" defaultValue={part?.name ?? ''} placeholder="Example: EV Charger 48V" className="rounded-xl border border-[var(--line)] bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-[rgba(27,42,60,.4)] focus:border-[var(--teal)]" data-testid="input-admin-name" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold">Category<select required name="category" defaultValue={part?.category ?? 'Electrical'} className="rounded-xl border border-[var(--line)] bg-[var(--shell)] px-4 py-3 text-sm outline-none focus:border-[var(--teal)]" data-testid="input-admin-category">{categories.filter((category) => category !== 'All').map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="grid gap-2 text-xs font-semibold">Starting price (₹)<input required min="0" step="1" type="number" name="price" defaultValue={part?.price ?? ''} placeholder="2500" className="rounded-xl border border-[var(--line)] bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-[rgba(27,42,60,.4)] focus:border-[var(--teal)]" data-testid="input-admin-price" /></label>
          </div>
          <label className="grid gap-2 text-xs font-semibold">Part visual<select required name="icon" defaultValue={part?.icon ?? 'controller'} className="rounded-xl border border-[var(--line)] bg-[var(--shell)] px-4 py-3 text-sm outline-none focus:border-[var(--teal)]" data-testid="input-admin-icon">{(['motor', 'controller', 'display', 'charger', 'brake', 'battery'] as PartIcon[]).map((icon) => <option key={icon} value={icon}>{icon.charAt(0).toUpperCase() + icon.slice(1)}</option>)}</select></label>
           <div className="grid gap-3">
             <label className="grid gap-2 text-xs font-semibold">Product image <input type="file" name="image" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleImageChange(event.target.files?.[0])} className="rounded-xl border border-dashed border-[var(--line)] bg-[rgba(255,255,255,.22)] px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--shell)]" data-testid="input-admin-image" /></label>
             {imagePreview ? <div className="relative h-32 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--ink)]"><img src={imagePreview} alt="Selected product preview" className="h-full w-full object-cover" /><button type="button" onClick={() => setImagePreview('')} className="absolute right-3 top-3 rounded-full bg-[var(--shell)] px-3 py-1.5 text-[11px] font-bold text-[var(--ink)]" data-testid="button-admin-clear-image">Remove image</button></div> : <p className="text-xs text-[rgba(27,42,60,.55)]">Optional. Use a clear JPG, PNG or WebP image up to 5 MB.</p>}
             <input type="hidden" name="imageUrl" value={imagePreview.startsWith('blob:') ? '' : imagePreview} readOnly />
           </div>
          <label className="grid gap-2 text-xs font-semibold">Short description<textarea required name="description" rows={3} defaultValue={part?.description ?? ''} placeholder="A short, helpful description customers can understand." className="resize-none rounded-xl border border-[var(--line)] bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-[rgba(27,42,60,.4)] focus:border-[var(--teal)]" data-testid="input-admin-description" /></label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {part ? <button type="button" onClick={() => onDelete(part.id)} className="text-sm font-semibold text-[var(--coral)] underline underline-offset-4" data-testid="button-admin-delete">Remove this part</button> : <span />}
            <button type="submit" className="flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-3.5 text-sm font-semibold text-[var(--shell)] transition-transform hover:-translate-y-0.5" data-testid="button-admin-save">{part ? 'Save changes' : 'Add part'} <Check size={15} /></button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const clerkUser = isClerkConfigured ? useUser() : null;
  const user = clerkUser?.user ?? { primaryEmailAddress: { emailAddress: 'admin@jyothiev.com' } };
  const clerk = isClerkConfigured ? useClerk() : null;
  const clerkStatusQuery = isClerkConfigured ? useGetAdminStatus() : null;
  const statusQuery = clerkStatusQuery ?? { isLoading: false, data: { isAdmin: true, email: 'admin@jyothiev.com' } };
  const partsQuery = useListParts();
  const [editorPart, setEditorPart] = useState<Part | null | undefined>(undefined);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Business / WhatsApp Settings Customizer
  const [settings, setSettings] = useState<BusinessSettings>(getBusinessSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSettingsSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveBusinessSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const handleSignOut = () => {
    if (clerk?.signOut) {
      clerk.signOut({ redirectUrl: basePath || '/' });
    } else {
      window.location.href = basePath || '/';
    }
  };

  const handleAdminSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const category = String(form.get('category') ?? 'Electrical');
    const price = Number(form.get('price') ?? 0);
    const description = String(form.get('description') ?? '').trim();
    const icon = String(form.get('icon') ?? 'controller') as PartIcon;
    const selectedImage = form.get('image');
    const imageFile = selectedImage instanceof File && selectedImage.size > 0 ? selectedImage : null;
    if (!name || !description || !Number.isInteger(price) || price < 0) {
      setFormError('Add a name, description and whole-number price.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const imageUrl = imageFile
        ? await uploadProductImage(imageFile)
        : String(form.get('imageUrl') ?? '') || null;
      const payload = { name, category, price, description, icon, imageUrl };
      if (editorPart) {
        await updatePart(editorPart.id, payload);
      } else {
        await createPart(payload);
      }
      await queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
      setEditorPart(undefined);
    } catch {
      setFormError('We could not save that change. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminDelete = async (id: number) => {
    if (!window.confirm('Remove this part from the public parts list?')) return;
    setSaving(true);
    setFormError('');
    try {
      await deletePart(id);
      await queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
      setEditorPart(undefined);
    } catch {
      setFormError('We could not remove that part. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (statusQuery.isLoading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ink)] text-[var(--shell)]">Loading your workspace…</div>;
  }

  if (!statusQuery.data?.isAdmin) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ink)] px-5 text-[var(--shell)]">
        <div className="w-full max-w-xl rounded-[30px] border border-[rgba(242,238,228,.18)] bg-[rgba(242,238,228,.07)] p-8 md:p-12">
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--acid)] text-[var(--ink)]"><ShieldCheck size={25} /></div>
          <div className="eyebrow mb-4 text-[var(--acid)]">Private workspace</div>
          <h1 className="display-tight text-5xl font-bold md:text-7xl">Admin access<br /><span className="text-[var(--coral)]">is restricted.</span></h1>
          <p className="mt-6 max-w-md leading-relaxed text-[rgba(242,238,228,.68)]">The signed-in account {user?.primaryEmailAddress?.emailAddress ?? 'you'} is not on Jyothi EV’s admin allow-list.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={basePath || '/'} className="rounded-full bg-[var(--acid)] px-5 py-3.5 text-sm font-bold text-[var(--ink)]">Back to website</a>
            <button type="button" onClick={handleSignOut} className="rounded-full border border-[rgba(242,238,228,.35)] px-5 py-3.5 text-sm font-semibold">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  const parts = Array.isArray(partsQuery.data) && partsQuery.data.length > 0
    ? partsQuery.data
    : defaultStarterParts;
  const categoriesCount = new Set(parts.map((part) => part.category)).size;

  return (
    <div className="min-h-[100dvh] bg-[var(--ink)] text-[var(--shell)]">
      <header className="border-b border-[rgba(242,238,228,.13)] px-5 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <a href={basePath || '/'} className="flex items-center gap-3"><BrandMark /></a>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-xs text-[rgba(242,238,228,.55)] sm:block">{statusQuery.data.email}<br /><strong className="text-[var(--acid)]">Admin workspace</strong></span>
            <button type="button" onClick={handleSignOut} className="rounded-full border border-[rgba(242,238,228,.24)] px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-[var(--shell)] hover:text-[var(--ink)]">Sign out</button>
          </div>
        </div>
      </header>
      <main className="px-5 py-12 md:px-10 md:py-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="eyebrow mb-5 text-[var(--acid)]">Jyothi EV / Control room</div>
              <h1 className="display-tight max-w-3xl text-5xl font-bold md:text-8xl">Manage Parts &<br /><span className="text-[var(--acid)]">Store Settings.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[rgba(242,238,228,.66)]">Update catalog parts, prices, and your official WhatsApp support number. Changes publish across the website immediately.</p>
            </div>
            <button type="button" onClick={() => setEditorPart(null)} className="flex items-center justify-center gap-2 rounded-full bg-[var(--acid)] px-5 py-3.5 text-sm font-bold text-[var(--ink)] transition-transform hover:-translate-y-1"><PackagePlus size={16} /> Add a part</button>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[rgba(242,238,228,.13)] bg-[rgba(242,238,228,.07)] p-5"><div className="eyebrow text-[rgba(242,238,228,.5)]">Live parts</div><div className="mt-4 text-4xl font-bold text-[var(--acid)]">{parts.length}</div></div>
            <div className="rounded-[24px] border border-[rgba(242,238,228,.13)] bg-[rgba(242,238,228,.07)] p-5"><div className="eyebrow text-[rgba(242,238,228,.5)]">Categories</div><div className="mt-4 text-4xl font-bold text-[var(--teal)]">{categoriesCount}</div></div>
            <div className="rounded-[24px] border border-[rgba(242,238,228,.13)] bg-[rgba(242,238,228,.07)] p-5"><div className="eyebrow text-[rgba(242,238,228,.5)]">Active WhatsApp</div><div className="mt-4 font-mono text-xl font-bold text-[#25D366]">+{formatWhatsAppNumber(settings.whatsappNumber)}</div></div>
          </div>

          {/* Web Owner WhatsApp & Business Settings Customizer */}
          <section className="mt-8 rounded-[28px] border border-[rgba(216,237,88,.3)] bg-[rgba(14,24,38,.85)] p-7 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col justify-between gap-3 border-b border-[rgba(242,238,228,.1)] pb-4 sm:flex-row sm:items-center">
              <div>
                <div className="eyebrow text-[var(--acid)]">Web Owner Contacts</div>
                <h2 className="mt-1 text-2xl font-bold text-[var(--shell)]">Customize Store WhatsApp & Instagram</h2>
              </div>
              <span className="font-mono text-xs text-[rgba(242,238,228,.6)]">Change anytime when numbers change</span>
            </div>

            <form onSubmit={handleSettingsSave} className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block font-mono text-xs font-semibold text-[var(--acid)]">
                  💬 Official WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="e.g. 9876543210 or 919876543210"
                  className="w-full rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.9)] px-4 py-3 font-mono text-sm font-bold text-[var(--shell)] outline-none transition-colors focus:border-[var(--acid)]"
                />
                <p className="mt-1 text-[10px] text-[rgba(242,238,228,.5)]">All 'Order on WhatsApp' buttons connect here</p>
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-xs font-semibold text-[var(--teal)]">
                  📸 Official Instagram Username
                </label>
                <input
                  type="text"
                  value={settings.instagramHandle}
                  onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })}
                  placeholder="e.g. jyothieventerprises"
                  className="w-full rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.9)] px-4 py-3 font-mono text-sm text-[var(--shell)] outline-none transition-colors focus:border-[var(--teal)]"
                />
                <p className="mt-1 text-[10px] text-[rgba(242,238,228,.5)]">Links to instagram.com/{settings.instagramHandle}</p>
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-xs font-semibold text-[var(--shell)]">
                  📍 Business Location / Headquarters
                </label>
                <input
                  type="text"
                  value={settings.businessCity}
                  onChange={(e) => setSettings({ ...settings, businessCity: e.target.value })}
                  placeholder="e.g. Hyderabad / Pan-India"
                  className="w-full rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.9)] px-4 py-3 text-sm text-[var(--shell)] outline-none transition-colors focus:border-[var(--shell)]"
                />
                <p className="mt-1 text-[10px] text-[rgba(242,238,228,.5)]">Shown on quotations and partner headers</p>
              </div>

              <div className="sm:col-span-3 mt-2 flex items-center justify-between">
                <div>
                  {settingsSaved && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#10B981]">
                      <Check size={16} /> Contact settings updated across entire website!
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-full bg-[var(--acid)] px-6 py-3 text-xs font-bold text-[var(--ink)] shadow-[0_0_20px_rgba(216,237,88,.4)] transition-transform hover:-translate-y-0.5"
                >
                  <Check size={14} /> Save Contact Settings
                </button>
              </div>
            </form>
          </section>

          <section className="mt-12 overflow-hidden rounded-[28px] border border-[rgba(242,238,228,.13)] bg-[var(--shell)] text-[var(--ink)]">
            <div className="flex flex-col justify-between gap-3 border-b border-[var(--line)] px-6 py-5 sm:flex-row sm:items-center md:px-8">
              <div><div className="eyebrow text-[var(--coral)]">Parts inventory</div><h2 className="mt-2 text-2xl font-bold">Public parts list</h2></div>
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-[rgba(27,42,60,.5)]">Prices are starting prices</span>
            </div>
            {partsQuery.isLoading ? <div className="px-6 py-12 text-center text-sm text-[rgba(27,42,60,.6)]">Loading parts…</div> : (
              <div className="divide-y divide-[var(--line)]">
                {parts.map((part) => (
                  <div key={part.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
                    <div className="flex items-center gap-4">
                       <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--acid)]">{part.imageUrl ? <img src={part.imageUrl} alt="" className="h-full w-full object-cover" /> : <PartIconMark icon={part.icon as PartIcon} />}</div>
                      <div><div className="font-bold">{part.name}</div><div className="mt-1 text-xs text-[rgba(27,42,60,.58)]">{part.category} · {part.description}</div></div>
                    </div>
                    <div className="flex items-center justify-between gap-5 sm:justify-end"><strong className="font-mono text-[var(--coral)]">{formatPrice(part.price)}</strong><button type="button" onClick={() => setEditorPart(part)} className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold transition-colors hover:bg-[var(--ink)] hover:text-[var(--shell)]">Edit</button></div>
                  </div>
                ))}
              </div>
            )}
          </section>
          {formError && <p className="mt-4 text-sm text-[var(--coral)]">{formError}</p>}
        </div>
      </main>
      {editorPart !== undefined && (
        <AdminModal part={editorPart} onClose={() => setEditorPart(undefined)} onSave={handleAdminSave} onDelete={handleAdminDelete} />
      )}
      {saving && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[var(--acid)] px-4 py-2 text-xs font-bold text-[var(--ink)] shadow-xl">Saving shared changes…</div>}
    </div>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedVehicle, setSelectedVehicle] = useState('All Vehicles');
  const [selectedVoltage, setSelectedVoltage] = useState('All Voltages');
  const [searchTerm, setSearchTerm] = useState('');
  const [inquiryPart, setInquiryPart] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState('');
  const [fileError, setFileError] = useState('');

  // Workshop Quote Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const partsQuery = useListParts();
  const catalogParts = Array.isArray(partsQuery.data) && partsQuery.data.length > 0
    ? partsQuery.data
    : defaultStarterParts;

  useEffect(() => {
    document.title = 'Jyothi EV Enterprises | Factory EV Spares, Battery Packs & Support';
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        'Find verified EV spare parts, custom lithium battery packs, 48V/60V controllers, BLDC motors, and instant WhatsApp ordering from Jyothi EV Enterprises.',
      );
    }
  }, []);

  const addToCart = (part: Part) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.part.id === part.id);
      if (existing) {
        return prev.map((item) =>
          item.part.id === part.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { part, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateCartQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.part.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.part.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.part.price * item.quantity, 0);

  const filteredParts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const voltageFilter = selectedVoltage === 'All Voltages' ? '' : selectedVoltage.toLowerCase();

    return catalogParts.filter((part) => {
      const matchesCategory = activeCategory === 'All' || part.category === activeCategory;
      const matchesSearch =
        !query ||
        part.name.toLowerCase().includes(query) ||
        part.category.toLowerCase().includes(query) ||
        part.description.toLowerCase().includes(query);
      const matchesVoltage =
        !voltageFilter ||
        part.name.toLowerCase().includes(voltageFilter) ||
        part.description.toLowerCase().includes(voltageFilter);

      return matchesCategory && matchesSearch && matchesVoltage;
    });
  }, [activeCategory, catalogParts, searchTerm, selectedVoltage]);

  const openModal = (kind: ModalKind, partName = '') => {
    setSubmitted(false);
    setModal(kind);
    setInquiryPart(partName);
    setMenuOpen(false);
    setSelectedFile(null);
    setFilePreview('');
    setFileError('');
  };

  const closeModal = () => {
    setModal(null);
    setSubmitted(false);
    setSelectedFile(null);
    setFilePreview('');
    setFileError('');
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('Please choose an image file.');
      return;
    }
    if (file.size > 1_500_000) {
      setFileError('Please choose an image smaller than 1.5 MB.');
      return;
    }
    setFileError('');
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="site-grain min-h-[100dvh] bg-[var(--ink)] text-[var(--shell)]">
      {/* Floating Cyber Glass Header */}
      <header className="fixed inset-x-0 top-0 z-30 px-4 pt-4 md:px-8">
        <nav
          className="mx-auto flex max-w-[1400px] items-center justify-between rounded-full border border-[rgba(216,237,88,.22)] bg-[rgba(11,19,30,.88)] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,.45)] backdrop-blur-xl md:px-6"
          aria-label="Main navigation"
        >
          <a href="#top" className="flex items-center gap-3" data-testid="link-home">
            <BrandMark />
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#parts" className="eyebrow text-[var(--shell)] transition-colors hover:text-[var(--acid)]" data-testid="link-parts">Parts</a>
            <a href="#calculator" className="eyebrow text-[var(--shell)] transition-colors hover:text-[var(--acid)]">Battery Calculator</a>
            <a href="#franchise" className="eyebrow text-[var(--shell)] transition-colors hover:text-[var(--acid)]" data-testid="link-franchise">Franchise</a>
            <a href="#reviews" className="eyebrow text-[var(--shell)] transition-colors hover:text-[var(--acid)]">Reviews</a>
            <a href="#contact" className="eyebrow text-[var(--shell)] transition-colors hover:text-[var(--acid)]" data-testid="link-contact">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {/* Cart Trigger */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 rounded-full border border-[rgba(216,237,88,.3)] bg-[rgba(18,30,46,.8)] px-3.5 py-2 text-xs font-bold text-[var(--acid)] transition-transform hover:scale-105"
            >
              <span>🛒</span>
              <span className="hidden sm:inline">Quote</span>
              {cartTotalCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--acid)] text-[10px] font-black text-[var(--ink)]">
                  {cartTotalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => openModal('parts')}
              className="hidden items-center gap-2 rounded-full bg-[var(--acid)] px-4 py-2.5 text-xs font-bold text-[var(--ink)] shadow-[0_0_20px_rgba(216,237,88,.3)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(216,237,88,.5)] md:flex"
              data-testid="button-nav-inquiry"
            >
              Send part photo <Upload size={14} />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(216,237,88,.3)] bg-[var(--ink)] text-[var(--shell)] md:hidden"
              aria-label="Toggle navigation"
              data-testid="button-mobile-menu"
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="mx-auto mt-2 max-w-[1400px] rounded-3xl border border-[rgba(216,237,88,.25)] bg-[rgba(11,19,30,.96)] p-5 shadow-2xl backdrop-blur-2xl md:hidden">
            <div className="flex flex-col gap-5">
              <a href="#parts" onClick={() => setMenuOpen(false)} className="flex items-center justify-between text-lg font-semibold text-[var(--shell)]" data-testid="link-mobile-parts">Browse parts <ArrowUpRight size={17} className="text-[var(--acid)]" /></a>
              <a href="#calculator" onClick={() => setMenuOpen(false)} className="flex items-center justify-between text-lg font-semibold text-[var(--shell)]">Battery Calculator <ArrowUpRight size={17} className="text-[var(--acid)]" /></a>
              <a href="#franchise" onClick={() => setMenuOpen(false)} className="flex items-center justify-between text-lg font-semibold text-[var(--shell)]" data-testid="link-mobile-franchise">Franchise with us <ArrowUpRight size={17} className="text-[var(--acid)]" /></a>
              <a href="#reviews" onClick={() => setMenuOpen(false)} className="flex items-center justify-between text-lg font-semibold text-[var(--shell)]">Workshop Reviews <ArrowUpRight size={17} className="text-[var(--acid)]" /></a>
              <a href="#contact" onClick={() => setMenuOpen(false)} className="flex items-center justify-between text-lg font-semibold text-[var(--shell)]" data-testid="link-mobile-contact">Contact Jyothi EV <ArrowUpRight size={17} className="text-[var(--acid)]" /></a>
              <button type="button" onClick={() => openModal('parts')} className="flex items-center justify-between border-t border-[rgba(242,238,228,.15)] pt-4 text-left font-mono text-[11px] uppercase tracking-[.13em] text-[var(--acid)]" data-testid="button-mobile-enquiry">
                Upload a part photo <Upload size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* Section 1: Full-Screen 3D Cinematic Animated Hero */}
        <Hero3DSection onOpenModal={openModal} />

        {/* Section 2: High-Voltage Feature Ticker Ribbon */}
        <section className="border-y border-[rgba(216,237,88,.28)] bg-[rgba(17,28,43,.92)] px-5 py-4 backdrop-blur-md md:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-4 text-xs font-semibold tracking-wide text-[var(--shell)] sm:text-sm md:grid-cols-3 md:gap-0">
            <div className="flex items-center gap-3 text-[var(--acid)] md:border-r md:border-[rgba(242,238,228,.1)]">
              <ShieldCheck size={18} /> Verified Fit Guarantee & Starting Prices
            </div>
            <div className="flex items-center gap-3 text-[var(--shell)] md:justify-center md:border-r md:border-[rgba(242,238,228,.1)]">
              <Upload size={18} className="text-[var(--teal)]" /> 1-Click WhatsApp Quick Order
            </div>
            <div className="flex items-center gap-3 text-[var(--coral)] md:justify-end">
              <Zap size={18} /> Same-Day Workshop Dispatch
            </div>
          </div>
        </section>

        {/* Section 3: "Will It Fit My EV?" + Parts Catalog Section */}
        <section id="parts" className="relative px-5 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="eyebrow mb-5 text-[var(--acid)]">01 / Live Parts Inventory</div>
                <h2 className="display-tight max-w-[760px] text-5xl font-bold md:text-8xl">Explore EV<br /><span className="text-[var(--teal)]">components.</span></h2>
                <p className="mt-5 max-w-[560px] text-base leading-relaxed text-[rgba(242,238,228,.75)]">
                  Browse authentic EV spare parts with starting prices. Select your scooter model for guaranteed compatibility or order instantly via WhatsApp.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => openModal('parts')}
                  className="flex items-center gap-2 rounded-full border border-[var(--acid)] bg-[rgba(216,237,88,.12)] px-5 py-3.5 text-sm font-semibold text-[var(--acid)] shadow-[0_0_20px_rgba(216,237,88,.15)] transition-transform hover:-translate-y-1 hover:bg-[var(--acid)] hover:text-[var(--ink)]"
                  data-testid="button-parts-upload"
                >
                  Upload part photo <Upload size={15} />
                </button>
              </div>
            </div>

            {/* Smart Vehicle Compatibility Matcher Bar */}
            <div className="mb-8 rounded-3xl border border-[rgba(216,237,88,.2)] bg-[rgba(14,24,38,.85)] p-5 backdrop-blur-xl shadow-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--acid)]">
                  <ShieldCheck size={16} /> "Will It Fit My EV?" Smart Matcher:
                </span>
                {selectedVehicle !== 'All Vehicles' && (
                  <span className="rounded-full bg-[rgba(56,178,172,.2)] px-3 py-1 font-mono text-[10px] text-[var(--teal)]">
                    Filtering for: {selectedVehicle} ({selectedVoltage})
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase text-[rgba(242,238,228,.6)]">Select Scooter / EV Model</label>
                  <select
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="w-full rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.9)] px-4 py-2.5 text-sm font-semibold text-[var(--shell)] outline-none transition-colors focus:border-[var(--acid)]"
                  >
                    {vehicleModels.map((model) => (
                      <option key={model} value={model} className="bg-[#0B131E] text-[#F2EEE4]">{model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase text-[rgba(242,238,228,.6)]">System Voltage</label>
                  <select
                    value={selectedVoltage}
                    onChange={(e) => setSelectedVoltage(e.target.value)}
                    className="w-full rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.9)] px-4 py-2.5 text-sm font-semibold text-[var(--shell)] outline-none transition-colors focus:border-[var(--acid)]"
                  >
                    {voltageOptions.map((v) => (
                      <option key={v} value={v} className="bg-[#0B131E] text-[#F2EEE4]">{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase text-[rgba(242,238,228,.6)]">Search Keyword</label>
                  <div className="relative">
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="e.g. 1000W, BLDC, Controller…"
                      className="w-full rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.9)] pl-9 pr-4 py-2.5 text-sm text-[var(--shell)] outline-none transition-colors placeholder:text-[rgba(242,238,228,.35)] focus:border-[var(--acid)]"
                      data-testid="input-search-parts"
                    />
                    <Search size={15} className="absolute left-3 top-3 text-[var(--teal)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all ${activeCategory === category ? 'border-[var(--acid)] bg-[var(--acid)] font-bold text-[var(--ink)] shadow-[0_0_18px_rgba(216,237,88,.35)]' : 'border-[rgba(242,238,228,.18)] bg-[rgba(242,238,228,.04)] text-[var(--shell)] hover:border-[var(--acid)] hover:text-[var(--acid)]'}`}
                  data-testid={`button-filter-${category.toLowerCase()}`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Parts Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {partsQuery.isLoading && (
                <div className="col-span-full rounded-[24px] border border-dashed border-[rgba(242,238,228,.2)] px-6 py-16 text-center text-[var(--shell)]">
                  <p className="text-lg font-semibold">Loading parts catalog…</p>
                </div>
              )}
              {filteredParts.map((part, index) => {
                const isCartAdded = cart.some((item) => item.part.id === part.id);
                const waMessage = `Hi Jyothi EV, I want to order/inquire about *${part.name}* (Price: ${formatPrice(part.price)}). ${selectedVehicle !== 'All Vehicles' ? `I need it for my ${selectedVehicle}.` : ''} Is this available for immediate dispatch?`;

                return (
                  <article
                    key={part.id}
                    className="hover-lift group flex flex-col justify-between overflow-hidden rounded-[24px] border border-[rgba(242,238,228,.14)] bg-[rgba(17,28,43,.65)] backdrop-blur-md transition-all hover:border-[var(--acid)] hover:shadow-[0_12px_36px_rgba(0,0,0,.5)]"
                    data-testid={`card-part-${part.id}`}
                  >
                    <div>
                      <div className={`relative flex h-[215px] items-center justify-center overflow-hidden ${index % 3 === 0 ? 'bg-gradient-to-br from-[#FF6542]/20 to-[#0B131E]' : index % 3 === 1 ? 'bg-gradient-to-br from-[#38B2AC]/20 to-[#0B131E]' : 'bg-gradient-to-br from-[#D8ED58]/15 to-[#0B131E]'}`}>
                        {part.imageUrl ? (
                          <img src={part.imageUrl} alt={part.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-32 w-44 rotate-[-6deg] items-center justify-center rounded-2xl border border-[rgba(216,237,88,.3)] bg-[rgba(11,19,30,.8)] text-[var(--acid)] shadow-[0_10px_25px_rgba(0,0,0,.5)] transition-transform group-hover:rotate-0">
                            <PartIconMark icon={part.icon as PartIcon} />
                          </div>
                        )}
                        <span className="absolute left-4 top-4 rounded-full border border-[rgba(242,238,228,.25)] bg-[rgba(11,19,30,.75)] px-3 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-[var(--shell)] backdrop-blur-md">
                          {part.category}
                        </span>

                        {selectedVehicle !== 'All Vehicles' && (
                          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-[#10B981] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-black shadow-lg">
                            ✓ Guaranteed Fit
                          </span>
                        )}
                      </div>

                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xl font-bold tracking-[-.03em] text-[var(--shell)]">{part.name}</h3>
                          <span className="whitespace-nowrap font-mono text-base font-bold text-[var(--acid)]">{formatPrice(part.price)}*</span>
                        </div>
                        <p className="mt-3 min-h-[48px] text-sm leading-relaxed text-[rgba(242,238,228,.7)]">{part.description}</p>
                      </div>
                    </div>

                    <div className="border-t border-[rgba(242,238,228,.1)] p-5 pt-4">
                      <div className="flex flex-col gap-2.5">
                        {/* 1-Click WhatsApp Quick Order */}
                        <a
                          href={getWhatsAppUrl(waMessage)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_15px_rgba(37,211,102,.3)] transition-transform hover:scale-[1.02]"
                        >
                          <span>💬 Order on WhatsApp</span>
                        </a>

                        <div className="flex items-center gap-2">
                          {/* Add to Workshop Quote Cart */}
                          <button
                            type="button"
                            onClick={() => addToCart(part)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${isCartAdded ? 'border-[var(--acid)] bg-[rgba(216,237,88,.15)] text-[var(--acid)]' : 'border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.6)] text-[var(--shell)] hover:border-[var(--acid)]'}`}
                          >
                            <span>🛒</span>
                            <span>{isCartAdded ? 'In Quote (Add +)' : '+ Add to Quote'}</span>
                          </button>

                          {/* Ask Details Modal */}
                          <button
                            type="button"
                            onClick={() => openModal('parts', part.name)}
                            className="flex items-center justify-center rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.6)] px-3 py-2 text-xs font-semibold text-[rgba(242,238,228,.8)] transition-colors hover:text-[var(--acid)]"
                            title="Ask about specs and compatibility"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredParts.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-[rgba(242,238,228,.2)] px-6 py-16 text-center text-[var(--shell)]">
                <p className="text-lg font-semibold">No matching parts for the selected criteria.</p>
                <button type="button" onClick={() => openModal('parts')} className="mt-4 text-sm font-bold text-[var(--acid)] underline underline-offset-4">Send a photo of what you need</button>
              </div>
            )}
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[.12em] text-[rgba(242,238,228,.45)]">* Starting prices for reference. Bulk workshop discounts apply automatically in quote cart.</p>
          </div>
        </section>

        {/* Section 4: 🔋 Interactive EV Battery & Range Calculator */}
        <BatteryCalculator onInquire={(cfg) => openModal('parts', `Custom Lithium Pack (${cfg})`)} />

        {/* Section 5: 🗺️ Franchise ROI & Territory Calculator */}
        <FranchiseCalculator onOpenModal={openModal} />

        {/* Section 6: ⭐ Verified Workshop Reviews & Mechanic Testimonials */}
        <WorkshopTestimonials />

        {/* Section 7: Contact Section */}
        <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-[#123136] via-[#0E202B] to-[#0B131E] px-5 py-20 md:px-10 md:py-28">
          <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <div className="eyebrow mb-5 text-[var(--acid)]">03 / Direct Technical Support</div>
              <h2 className="display-tight max-w-[680px] text-5xl font-bold md:text-8xl">Need help<br /><span className="text-[var(--teal)]">identifying?</span></h2>
            </div>
            <div className="max-w-[360px]">
              <p className="leading-relaxed text-[rgba(242,238,228,.82)]">Send a photo of the burnt, broken or replacement part. Our technical team will check compatibility and pin-outs with you.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openModal('parts')}
                  className="inline-flex items-center gap-3 rounded-full bg-[var(--acid)] px-6 py-3.5 text-sm font-bold text-[var(--ink)] shadow-[0_0_20px_rgba(216,237,88,.3)] transition-transform hover:-translate-y-1"
                  data-testid="button-contact-upload"
                >
                  <Upload size={17} /> Upload part photo
                </button>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 rounded-full border border-[rgba(242,238,228,.35)] px-6 py-3.5 text-sm font-bold text-[var(--shell)] transition-colors hover:border-[var(--acid)] hover:bg-[var(--acid)] hover:text-[var(--ink)]"
                  data-testid="link-instagram"
                >
                  <Instagram size={17} /> Instagram
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Questions FAQ */}
        <section className="px-5 py-20 md:px-10 md:py-28">
          <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <div className="eyebrow mb-5 text-[var(--coral)]">04 / Frequently Asked</div>
              <h2 className="display-tight text-5xl font-bold text-[var(--shell)] md:text-7xl">Simple<br />answers.</h2>
            </div>
            <div className="border-t border-[rgba(242,238,228,.15)]">
              {faqs.map((faq, index) => (
                <div key={faq.question} className="border-b border-[rgba(242,238,228,.15)]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between gap-5 py-6 text-left text-lg font-semibold text-[var(--shell)] transition-colors hover:text-[var(--acid)]"
                    aria-expanded={openFaq === index}
                    data-testid={`button-faq-${index}`}
                  >
                    <span>{faq.question}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(242,238,228,.2)] transition-transform ${openFaq === index ? 'rotate-180 border-[var(--acid)] bg-[var(--acid)] text-[var(--ink)]' : 'text-[var(--shell)]'}`}>
                      <ChevronDown size={15} />
                    </span>
                  </button>
                  {openFaq === index && (
                    <p className="max-w-[650px] pb-6 pr-10 text-sm leading-relaxed text-[rgba(242,238,228,.7)]">
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Cyberpunk Dark Footer */}
      <footer className="border-t border-[rgba(242,238,228,.12)] bg-[rgba(8,14,23,.95)] px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--acid)] text-[var(--ink)]">
              <Zap size={14} />
            </span>
            <div>
              <span className="text-sm font-bold text-[var(--shell)]">Jyothi EV Enterprises</span>
              <span className="ml-2 font-mono text-[10px] text-[#25D366]">● WhatsApp Connected</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[rgba(242,238,228,.55)]">
            <span className="font-mono text-[10px] uppercase tracking-[.1em]">Verified EV Spares</span>
            <a href={`${basePath}/admin`} className="flex items-center gap-1.5 rounded-full border border-[rgba(216,237,88,.3)] bg-[rgba(216,237,88,.1)] px-3 py-1 font-mono text-xs font-bold text-[var(--acid)] transition-transform hover:scale-105" data-testid="link-admin">
              <span>⚙️ Owner & WhatsApp Settings</span>
              <ArrowUpRight size={13} />
            </a>
            <a href="#top" className="flex items-center gap-1 text-xs font-semibold text-[var(--shell)] transition-opacity hover:opacity-80" data-testid="link-back-top">
              Back to top <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </footer>

      {/* Slide-Out Workshop Quotation Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemove={removeFromCart}
        onClear={clearCart}
      />

      {/* Floating WhatsApp Quick-Help Widget */}
      <FloatingWhatsAppWidget />

      {/* Interactive Modal Backdrop */}
      {modal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[rgba(0,0,0,.75)] p-3 backdrop-blur-md md:items-center" role="dialog" aria-modal="true" aria-label={modal === 'franchise' ? 'Franchise enquiry' : 'Parts enquiry'} data-testid="dialog-enquiry">
          <div className="relative max-h-[95dvh] w-full max-w-[570px] overflow-y-auto rounded-[28px] border border-[rgba(216,237,88,.25)] bg-[rgba(14,23,36,.96)] p-6 text-[var(--shell)] shadow-2xl backdrop-blur-2xl md:p-9">
            <button type="button" onClick={closeModal} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(242,238,228,.2)] text-[var(--shell)] transition-colors hover:border-[var(--acid)] hover:bg-[var(--acid)] hover:text-[var(--ink)]" aria-label="Close enquiry dialog" data-testid="button-close-dialog">
              <X size={16} />
            </button>
            {!submitted ? (
              <>
                <div className="eyebrow mb-5 text-[var(--acid)]">{modal === 'franchise' ? 'Franchise conversation' : 'Parts enquiry'}</div>
                <h2 className="display-tight max-w-[470px] pr-8 text-4xl font-bold md:text-6xl">{modal === 'franchise' ? 'Tell us your plan.' : 'Show us the part.'}</h2>
                <p className="mt-5 max-w-[450px] text-sm leading-relaxed text-[rgba(242,238,228,.7)]">Share your details. For immediate assistance, you can also DM <a href={instagramUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--acid)] underline" data-testid="link-modal-instagram">@jyothieventerprises</a> on Instagram.</p>
                <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
                  <label className="grid gap-2 text-xs font-semibold text-[rgba(242,238,228,.8)]">Your name<input required name="name" placeholder="How should we address you?" className="rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.8)] px-4 py-3 text-sm text-[var(--shell)] outline-none transition-colors placeholder:text-[rgba(242,238,228,.35)] focus:border-[var(--acid)]" data-testid="input-name" /></label>
                  <label className="grid gap-2 text-xs font-semibold text-[rgba(242,238,228,.8)]">Phone, email or WhatsApp number<input required name="contact" placeholder="A way to reach you" className="rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.8)] px-4 py-3 text-sm text-[var(--shell)] outline-none transition-colors placeholder:text-[rgba(242,238,228,.35)] focus:border-[var(--acid)]" data-testid="input-contact" /></label>
                  <label className="grid gap-2 text-xs font-semibold text-[rgba(242,238,228,.8)]">{modal === 'franchise' ? 'Where are you based?' : 'Which part do you need?'}<input required name="context" value={modal === 'parts' ? inquiryPart : undefined} onChange={(event) => modal === 'parts' && setInquiryPart(event.target.value)} placeholder={modal === 'franchise' ? 'City or region' : 'Part name, vehicle model or question'} className="rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.8)] px-4 py-3 text-sm text-[var(--shell)] outline-none transition-colors placeholder:text-[rgba(242,238,228,.35)] focus:border-[var(--acid)]" data-testid="input-context" /></label>
                  {modal === 'parts' && (
                    <label className="grid gap-2 text-xs font-semibold text-[rgba(242,238,228,.8)]">
                      Upload a part photo <span className="font-normal text-[rgba(242,238,228,.5)]">Optional, but speeds up finding the exact match.</span>
                      <span className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-[var(--teal)] bg-[rgba(56,178,172,.1)] px-4 py-3 text-sm text-[var(--shell)] transition-colors hover:bg-[rgba(56,178,172,.18)]">
                        <span className="flex items-center gap-2"><Upload size={16} className="text-[var(--acid)]" /> {selectedFile ? selectedFile.name : 'Choose an image'}</span>
                        <input type="file" accept="image/*" onChange={(event) => handleFileChange(event.target.files?.[0])} className="sr-only" data-testid="input-part-photo" />
                      </span>
                      {filePreview && <img src={filePreview} alt="Selected part preview" className="h-32 w-full rounded-xl border border-[rgba(216,237,88,.3)] object-cover" />}
                      {fileError && <span className="text-xs font-normal text-[var(--coral)]">{fileError}</span>}
                    </label>
                  )}
                  <label className="grid gap-2 text-xs font-semibold text-[rgba(242,238,228,.8)]">A little more detail <textarea name="message" rows={3} placeholder={modal === 'franchise' ? 'Tell us what you want to build' : 'Vehicle model, old part details or questions'} className="resize-none rounded-xl border border-[rgba(242,238,228,.2)] bg-[rgba(11,19,30,.8)] px-4 py-3 text-sm text-[var(--shell)] outline-none transition-colors placeholder:text-[rgba(242,238,228,.35)] focus:border-[var(--acid)]" data-testid="input-message" /></label>
                  <button type="submit" className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[var(--acid)] px-5 py-3.5 text-sm font-bold text-[var(--ink)] shadow-[0_0_20px_rgba(216,237,88,.3)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(216,237,88,.5)]" data-testid="button-submit-enquiry">{modal === 'parts' ? 'Send part details' : 'Send franchise enquiry'} <ArrowUpRight size={15} /></button>
                </form>
              </>
            ) : (
              <div className="flex min-h-[380px] flex-col items-start justify-center">
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--acid)] text-[var(--ink)]"><Check size={25} /></div>
                <div className="eyebrow mb-4 text-[var(--acid)]">Details ready</div>
                <h2 className="display-tight text-5xl font-bold">One more step<br /><span className="text-[var(--teal)]">on Instagram / WhatsApp.</span></h2>
                <p className="mt-5 max-w-[390px] leading-relaxed text-[rgba(242,238,228,.75)]">Your details are saved. Connect directly with Jyothi EV technical team for immediate stock dispatch.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href={getWhatsAppUrl(`Hi Jyothi EV, I have submitted an inquiry for: ${inquiryPart || 'EV Parts'}. Please assist me with stock and pricing.`)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(37,211,102,.4)]">
                    <span>Chat on WhatsApp</span> <ArrowUpRight size={15} />
                  </a>
                  <a href={instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-[rgba(242,238,228,.3)] px-5 py-3.5 text-sm font-bold text-[var(--shell)]" data-testid="link-success-instagram">
                    <Instagram size={15} /> Instagram
                  </a>
                </div>
                <button type="button" onClick={closeModal} className="mt-5 text-sm font-semibold text-[var(--shell)] underline underline-offset-4" data-testid="button-done-dialog">Close this window</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// FEATURE COMPONENTS
// ---------------------------------------------------------

function BatteryCalculator({ onInquire }: { onInquire: (config: string) => void }) {
  const [voltage, setVoltage] = useState(60);
  const [capacity, setCapacity] = useState(30);
  const [motorPower, setMotorPower] = useState(1200);
  const [ridingMode, setRidingMode] = useState<'eco' | 'city' | 'turbo'>('city');

  const totalEnergyWh = voltage * capacity;
  const totalEnergyKwh = (totalEnergyWh / 1000).toFixed(2);

  const modeFactor = ridingMode === 'eco' ? 0.78 : ridingMode === 'city' ? 1.0 : 1.35;
  const baseWhPerKm = (motorPower / 1000) * 20;
  const estRangeKm = Math.round(totalEnergyWh / (baseWhPerKm * modeFactor));
  const topSpeedKm = Math.round((voltage * 0.7) + (motorPower / 100) * 1.5);
  const estimatedPrice = Math.round(voltage * capacity * 9.6 + 2400);
  const chargeTimeHrs = (capacity / 6).toFixed(1);

  const configText = `${voltage}V ${capacity}Ah Lithium Pack (${totalEnergyKwh} kWh) with ${motorPower}W Motor in ${ridingMode.toUpperCase()} Mode (Est. Range: ${estRangeKm} km, Price: ₹${estimatedPrice.toLocaleString('en-IN')})`;

  return (
    <section id="calculator" className="relative overflow-hidden bg-[rgba(11,19,30,.98)] px-5 py-20 text-[var(--shell)] md:px-10 md:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="eyebrow mb-5 text-[var(--acid)]">Interactive Engineering Tool</div>
            <h2 className="display-tight max-w-[780px] text-5xl font-bold md:text-7xl">
              EV Battery & <span className="text-[var(--acid)]">Range Simulator.</span>
            </h2>
            <p className="mt-5 max-w-[560px] text-base leading-relaxed text-[rgba(242,238,228,.75)]">
              Calculate projected range, top speed, and pack pricing for custom lithium battery packs with smart BMS protection.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[rgba(216,237,88,.25)] bg-[rgba(18,30,46,.7)] px-4 py-2 font-mono text-xs text-[var(--acid)]">
            <Zap size={14} /> Smart Cell Balancing Included
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          {/* Controls */}
          <div className="rounded-3xl border border-[rgba(216,237,88,.2)] bg-[rgba(14,24,38,.85)] p-7 backdrop-blur-xl shadow-2xl">
            <h3 className="text-xl font-bold text-[var(--shell)]">Pack Configuration</h3>

            <div className="mt-6 grid gap-6">
              {/* Voltage Selector */}
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[rgba(242,238,228,.7)]">System Voltage</span>
                  <span className="font-mono font-bold text-[var(--acid)]">{voltage} Volts</span>
                </div>
                <div className="mt-2.5 flex gap-2">
                  {[48, 60, 72].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVoltage(v)}
                      className={`flex-1 rounded-xl border py-2.5 font-mono text-sm font-bold transition-all ${voltage === v ? 'border-[var(--acid)] bg-[var(--acid)] text-[var(--ink)] shadow-[0_0_15px_rgba(216,237,88,.4)]' : 'border-[rgba(242,238,228,.15)] bg-[rgba(11,19,30,.8)] text-[var(--shell)] hover:border-[var(--acid)]'}`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[rgba(242,238,228,.7)]">Pack Capacity (Amp-Hours)</span>
                  <span className="font-mono font-bold text-[var(--acid)]">{capacity} Ah ({totalEnergyKwh} kWh)</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={50}
                  step={2}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--acid)]"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-[rgba(242,238,228,.4)]">
                  <span>20 Ah</span>
                  <span>35 Ah</span>
                  <span>50 Ah</span>
                </div>
              </div>

              {/* Motor Power Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[rgba(242,238,228,.7)]">BLDC Hub Motor Rating</span>
                  <span className="font-mono font-bold text-[var(--teal)]">{motorPower} Watts</span>
                </div>
                <input
                  type="range"
                  min={800}
                  max={2000}
                  step={100}
                  value={motorPower}
                  onChange={(e) => setMotorPower(Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--teal)]"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-[rgba(242,238,228,.4)]">
                  <span>800W</span>
                  <span>1400W</span>
                  <span>2000W</span>
                </div>
              </div>

              {/* Riding Profile */}
              <div>
                <div className="mb-2 text-xs font-semibold text-[rgba(242,238,228,.7)]">Riding Profile</div>
                <div className="flex gap-2">
                  {[
                    { id: 'eco', label: 'Eco (Max Range)' },
                    { id: 'city', label: 'City (Balanced)' },
                    { id: 'turbo', label: 'Turbo (Max Speed)' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRidingMode(mode.id as 'eco' | 'city' | 'turbo')}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${ridingMode === mode.id ? 'border-[var(--teal)] bg-[rgba(56,178,172,.2)] text-[var(--shell)]' : 'border-[rgba(242,238,228,.15)] bg-[rgba(11,19,30,.8)] text-[rgba(242,238,228,.6)]'}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Display Gauge */}
          <div className="flex flex-col justify-between rounded-3xl border border-[rgba(216,237,88,.3)] bg-gradient-to-br from-[#122336] to-[#0A121E] p-8 shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--acid)]">Simulated Performance</span>
                <span className="rounded-full bg-[#25D366]/20 px-3 py-1 font-mono text-[10px] font-bold text-[#25D366]">BMS Protected</span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-6">
                <div className="rounded-2xl border border-[rgba(242,238,228,.12)] bg-[rgba(11,19,30,.6)] p-5">
                  <div className="text-xs text-[rgba(242,238,228,.6)]">Estimated Range</div>
                  <div className="mt-2 font-mono text-3xl font-black text-[var(--acid)] md:text-4xl">
                    ~{estRangeKm} <span className="text-lg font-normal text-[var(--shell)]">km</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[rgba(242,238,228,.5)]">per single charge</div>
                </div>

                <div className="rounded-2xl border border-[rgba(242,238,228,.12)] bg-[rgba(11,19,30,.6)] p-5">
                  <div className="text-xs text-[rgba(242,238,228,.6)]">Top Speed</div>
                  <div className="mt-2 font-mono text-3xl font-black text-[var(--teal)] md:text-4xl">
                    ~{topSpeedKm} <span className="text-lg font-normal text-[var(--shell)]">km/h</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[rgba(242,238,228,.5)]">under nominal load</div>
                </div>

                <div className="rounded-2xl border border-[rgba(242,238,228,.12)] bg-[rgba(11,19,30,.6)] p-5">
                  <div className="text-xs text-[rgba(242,238,228,.6)]">Charging Time</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-[var(--shell)]">
                    {chargeTimeHrs} <span className="text-sm font-normal text-[rgba(242,238,228,.6)]">hours</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[rgba(242,238,228,.5)]">with 6A fast charger</div>
                </div>

                <div className="rounded-2xl border border-[rgba(216,237,88,.25)] bg-[rgba(216,237,88,.08)] p-5">
                  <div className="text-xs text-[rgba(242,238,228,.6)]">Starting Pack Price</div>
                  <div className="mt-2 font-mono text-2xl font-black text-[var(--acid)]">
                    ₹{estimatedPrice.toLocaleString('en-IN')}*
                  </div>
                  <div className="mt-1 text-[10px] text-[rgba(242,238,228,.5)]">incl. smart BMS</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={getWhatsAppUrl(`Hi Jyothi EV, I ran the battery simulator for *${configText}*. Can you send me the detailed quotation and cell warranty details?`)}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-4 text-sm font-bold text-black shadow-[0_0_25px_rgba(37,211,102,.4)] transition-transform hover:scale-[1.02]"
              >
                <span>💬 Order this Pack on WhatsApp</span> <ArrowUpRight size={16} />
              </a>

              <button
                type="button"
                onClick={() => onInquire(configText)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[rgba(242,238,228,.25)] py-3 text-xs font-semibold text-[var(--shell)] transition-colors hover:bg-[rgba(242,238,228,.1)]"
              >
                Request Custom Cell Specs <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FranchiseCalculator({ onOpenModal }: { onOpenModal: (kind: ModalKind, tierName?: string) => void }) {
  const [tier, setTier] = useState<'starter' | 'pro' | 'stockist'>('pro');

  const tiers = {
    starter: {
      name: 'Starter Workshop Partner',
      investment: '₹1,50,000',
      margin: '₹35,000 - ₹55,000 / month',
      radius: '3 km Local Exclusivity',
      stock: '25+ Essential Fast-Moving Spares',
      breakeven: '2 - 3 Months',
      leads: 'Direct Local Repair Leads',
    },
    pro: {
      name: 'Authorized Spares Dealership',
      investment: '₹3,50,000',
      margin: '₹75,000 - ₹1,20,000 / month',
      radius: '8 km Sub-District Exclusivity',
      stock: '65+ Comprehensive Mechanical & Electrical Spares',
      breakeven: '3 - 4 Months',
      leads: 'Official Jyothi EV Branded Boarding + Priority Warranty Desk',
    },
    stockist: {
      name: 'Regional Super Stockist',
      investment: '₹8,00,000',
      margin: '₹1,80,000 - ₹3,00,000 / month',
      radius: 'Full District Exclusivity',
      stock: '160+ Full Catalog Inventory & Custom Lithium Assemblies',
      breakeven: '4 - 5 Months',
      leads: 'Exclusive Regional Workshop Supply Allocation + Highest Factory Margin',
    },
  };

  const active = tiers[tier];

  return (
    <section id="franchise" className="relative overflow-hidden bg-[rgba(8,14,23,.98)] px-5 py-20 text-[var(--shell)] md:px-10 md:py-28">
      <div className="absolute -right-20 top-20 h-[420px] w-[420px] rounded-full border border-[rgba(216,237,88,.15)] md:h-[620px] md:w-[620px]" />
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="eyebrow mb-5 text-[var(--acid)]">02 / Franchise & Business Expansion</div>
            <h2 className="display-tight max-w-[820px] text-5xl font-bold md:text-8xl">
              Build your <span className="text-[var(--acid)]">EV Enterprise.</span>
            </h2>
            <p className="mt-5 max-w-[560px] text-base leading-relaxed text-[rgba(242,238,228,.75)]">
              Bring authentic EV spare parts supply and battery servicing to your city. Select an investment tier below to view projected territorial returns.
            </p>
          </div>
          <div className="flex gap-2">
            {(['starter', 'pro', 'stockist'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`rounded-full border px-4 py-2 font-mono text-xs font-bold uppercase transition-all ${tier === t ? 'border-[var(--acid)] bg-[var(--acid)] text-[var(--ink)] shadow-[0_0_15px_rgba(216,237,88,.4)]' : 'border-[rgba(242,238,228,.2)] bg-[rgba(14,24,38,.8)] text-[var(--shell)] hover:border-[var(--acid)]'}`}
              >
                {t === 'starter' ? 'Tier 1: Starter' : t === 'pro' ? 'Tier 2: Dealer' : 'Tier 3: Stockist'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-[rgba(216,237,88,.25)] bg-[rgba(14,24,38,.85)] p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[var(--acid)]/15 px-3.5 py-1 font-mono text-xs font-bold text-[var(--acid)]">
                Selected Plan
              </span>
              <span className="font-mono text-xs text-[rgba(242,238,228,.5)]">Tier ROI Breakdown</span>
            </div>

            <h3 className="mt-4 text-3xl font-black text-[var(--shell)]">{active.name}</h3>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(242,238,228,.1)] bg-[rgba(11,19,30,.7)] p-4">
                <div className="text-xs text-[rgba(242,238,228,.6)]">Initial Inventory Investment</div>
                <div className="mt-1.5 font-mono text-2xl font-bold text-[var(--acid)]">{active.investment}</div>
              </div>

              <div className="rounded-2xl border border-[rgba(242,238,228,.1)] bg-[rgba(11,19,30,.7)] p-4">
                <div className="text-xs text-[rgba(242,238,228,.6)]">Projected Monthly Margin</div>
                <div className="mt-1.5 font-mono text-xl font-bold text-[#10B981]">{active.margin}</div>
              </div>

              <div className="rounded-2xl border border-[rgba(242,238,228,.1)] bg-[rgba(11,19,30,.7)] p-4">
                <div className="text-xs text-[rgba(242,238,228,.6)]">Territorial Protection</div>
                <div className="mt-1.5 font-mono text-sm font-semibold text-[var(--shell)]">{active.radius}</div>
              </div>

              <div className="rounded-2xl border border-[rgba(242,238,228,.1)] bg-[rgba(11,19,30,.7)] p-4">
                <div className="text-xs text-[rgba(242,238,228,.6)]">Breakeven Estimate</div>
                <div className="mt-1.5 font-mono text-sm font-semibold text-[var(--teal)]">{active.breakeven}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[rgba(56,178,172,.2)] bg-[rgba(56,178,172,.08)] p-4 text-xs leading-relaxed text-[rgba(242,238,228,.8)]">
              <strong className="text-[var(--teal)]">Included Support: </strong>{active.leads}. {active.stock}.
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-[rgba(216,237,88,.3)] bg-gradient-to-br from-[#122336] to-[#0A121E] p-8 shadow-2xl">
            <div>
              <PackagePlus size={32} className="text-[var(--acid)]" />
              <h4 className="mt-4 text-2xl font-bold text-[var(--shell)]">Secure Territory Exclusivity</h4>
              <p className="mt-2 text-sm leading-relaxed text-[rgba(242,238,228,.7)]">
                Territory rights are allocated on a first-come, verified basis per district. Speak directly with the expansion team.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={getWhatsAppUrl(`Hi Jyothi EV Expansion Team, I am interested in applying for *${active.name}* (Investment: ${active.investment}). Please share territory availability for my city.`)}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-4 text-sm font-bold text-black shadow-[0_0_20px_rgba(37,211,102,.4)] transition-transform hover:scale-[1.02]"
              >
                <span>💬 Discuss Franchise on WhatsApp</span> <ArrowUpRight size={16} />
              </a>

              <button
                type="button"
                onClick={() => onOpenModal('franchise', active.name)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--acid)] px-6 py-3.5 text-sm font-bold text-[var(--ink)] shadow-[0_0_20px_rgba(216,237,88,.3)]"
                data-testid="button-franchise-interest"
              >
                Submit Written Proposal <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkshopTestimonials() {
  return (
    <section id="reviews" className="relative px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 text-center">
          <div className="eyebrow mb-4 text-[var(--acid)]">Trusted by Technicians & Workshops</div>
          <h2 className="display-tight text-4xl font-bold md:text-6xl">
            Verified Workshop <span className="text-[var(--teal)]">Feedback.</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {workshopReviews.map((rev) => (
            <div
              key={rev.name}
              className="flex flex-col justify-between rounded-3xl border border-[rgba(242,238,228,.14)] bg-[rgba(17,28,43,.65)] p-7 backdrop-blur-md transition-all hover:border-[var(--acid)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex text-[var(--acid)]">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <span className="rounded-full bg-[rgba(216,237,88,.15)] px-2.5 py-0.5 font-mono text-[9px] font-bold text-[var(--acid)]">
                    {rev.badge}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[rgba(242,238,228,.85)]">
                  "{rev.comment}"
                </p>
              </div>

              <div className="mt-6 border-t border-[rgba(242,238,228,.1)] pt-4">
                <div className="font-bold text-[var(--shell)]">{rev.name}</div>
                <div className="text-xs text-[var(--teal)]">{rev.role}</div>
                <div className="mt-0.5 font-mono text-[10px] text-[rgba(242,238,228,.5)]">{rev.city}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemove,
  onClear,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}) {
  if (!isOpen) return null;

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.part.price * item.quantity, 0);
  const discountRate = itemCount >= 5 ? 0.10 : itemCount >= 3 ? 0.05 : 0;
  const discountAmount = Math.round(subtotal * discountRate);
  const netTotal = subtotal - discountAmount;

  const handleSendWhatsAppQuote = () => {
    let msg = `*JYOTHI EV ENTERPRISES - WORKSHOP SPARES QUOTATION REQUEST*\n\n`;
    cart.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.part.name}* (Qty: ${item.quantity}) - ₹${(item.part.price * item.quantity).toLocaleString('en-IN')}\n`;
    });
    msg += `\n*Subtotal:* ₹${subtotal.toLocaleString('en-IN')}`;
    if (discountAmount > 0) {
      msg += `\n*Workshop Bulk Tier Discount (${discountRate * 100}%):* -₹${discountAmount.toLocaleString('en-IN')}`;
    }
    msg += `\n*Net Estimated Total:* ₹${netTotal.toLocaleString('en-IN')}\n\n`;
    msg += `Please confirm stock availability and shipping charges for this order.`;
    window.open(getWhatsAppUrl(msg), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(0,0,0,.75)] backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[480px] flex-col justify-between border-l border-[rgba(216,237,88,.25)] bg-[rgba(14,23,36,.98)] p-6 text-[var(--shell)] shadow-2xl">
        <div>
          <div className="flex items-center justify-between border-b border-[rgba(242,238,228,.12)] pb-4">
            <div>
              <h3 className="text-xl font-black text-[var(--shell)]">Workshop Quote Cart</h3>
              <p className="font-mono text-xs text-[var(--acid)]">{itemCount} items selected</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(242,238,228,.2)] text-[var(--shell)] hover:bg-[var(--acid)] hover:text-[var(--ink)]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.part.id}
                className="flex items-center justify-between rounded-2xl border border-[rgba(242,238,228,.1)] bg-[rgba(11,19,30,.8)] p-3.5"
              >
                <div>
                  <div className="text-sm font-bold text-[var(--shell)]">{item.part.name}</div>
                  <div className="font-mono text-xs text-[var(--acid)]">{formatPrice(item.part.price)} each</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-[rgba(242,238,228,.2)] bg-[rgba(14,24,38,.8)] px-2 py-1 font-mono text-xs">
                    <button type="button" onClick={() => onUpdateQuantity(item.part.id, -1)} className="hover:text-[var(--acid)]">-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onUpdateQuantity(item.part.id, 1)} className="hover:text-[var(--acid)]">+</button>
                  </div>
                  <button type="button" onClick={() => onRemove(item.part.id)} className="text-xs text-[var(--coral)] hover:underline">✕</button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center font-mono text-xs text-[rgba(242,238,228,.5)]">
                Your quotation cart is empty. Click "+ Add to Quote" on any part in the catalog!
              </div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[rgba(242,238,228,.12)] pt-4">
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-[rgba(242,238,228,.7)]">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#10B981]">
                  <span>Bulk Discount ({discountRate * 100}%):</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[rgba(242,238,228,.15)] pt-2 text-base font-bold text-[var(--acid)]">
                <span>Estimated Total:</span>
                <span>₹{netTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSendWhatsAppQuote}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(37,211,102,.4)]"
              >
                <span>💬 Send Quotation on WhatsApp</span> <ArrowUpRight size={16} />
              </button>
              <button
                type="button"
                onClick={onClear}
                className="py-1 text-center font-mono text-[10px] text-[rgba(242,238,228,.5)] hover:text-[var(--coral)]"
              >
                Clear Cart Items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FloatingWhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const prompts = [
    { label: '⚡ Check Part Availability & Price', msg: 'Hi Jyothi EV, I want to check availability and current pricing for EV parts.' },
    { label: '📸 Send Photo of Burnt / Broken Part', msg: 'Hi Jyothi EV, I have a photo of a damaged EV spare part. Can you help me identify the replacement?' },
    { label: '🤝 Franchise & Dealership Inquiry', msg: 'Hi Jyothi EV, I want to explore a franchise / spares dealership in my region.' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen && (
        <div className="mb-3 w-[290px] rounded-2xl border border-[rgba(216,237,88,.25)] bg-[rgba(14,24,38,.98)] p-4 text-[var(--shell)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[rgba(242,238,228,.12)] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#25D366]" />
              <span className="text-xs font-bold">Jyothi EV WhatsApp Desk</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-[rgba(242,238,228,.6)] hover:text-white">✕</button>
          </div>

          <p className="mt-2 text-[11px] text-[rgba(242,238,228,.7)]">Choose a quick option to start chat:</p>

          <div className="mt-3 flex flex-col gap-2">
            {prompts.map((p) => (
              <a
                key={p.label}
                href={getWhatsAppUrl(p.msg)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[rgba(242,238,228,.12)] bg-[rgba(11,19,30,.8)] p-2.5 text-[11px] font-semibold text-[var(--shell)] transition-colors hover:border-[#25D366] hover:text-[#25D366]"
              >
                {p.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-black shadow-[0_0_25px_rgba(37,211,102,.5)] transition-transform hover:scale-110"
        title="Chat on WhatsApp"
      >
        <span className="text-2xl">💬</span>
      </button>
    </div>
  );
}

function Hero3DSection({ onOpenModal }: { onOpenModal: (kind: ModalKind, partName?: string) => void }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [activePart, setActivePart] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'exploded' | 'power' | 'matrix'>('exploded');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Camera preset rotations
  const getCameraTransform = () => {
    let baseRotateX = 7 - tilt.y * 12;
    let baseRotateY = -12 + tilt.x * 16;
    let baseScale = 1;

    if (cameraMode === 'power') {
      baseRotateX = 4 - tilt.y * 8;
      baseRotateY = -22 + tilt.x * 12;
      baseScale = 1.08;
    } else if (cameraMode === 'matrix') {
      baseRotateX = 14 - tilt.y * 8;
      baseRotateY = -4 + tilt.x * 12;
      baseScale = 1.05;
    }

    if (activePart === 'motor') {
      baseRotateX += 4;
      baseRotateY -= 8;
    } else if (activePart === 'controller') {
      baseRotateX -= 3;
      baseRotateY -= 6;
    } else if (activePart === 'battery') {
      baseRotateX += 6;
      baseRotateY += 4;
    }

    return `translate(-50%, -50%) rotateX(${baseRotateX}deg) rotateY(${baseRotateY}deg) rotateZ(-3deg) scale(${baseScale})`;
  };

  const componentsList = [
    { id: 'motor', name: 'BLDC 1000W Hub Motor', tag: 'High Torque · Waterproof', price: '₹8,500' },
    { id: 'controller', name: '48V Sine-Wave Controller', tag: 'Smooth Regen · Thermal Guard', price: '₹2,250' },
    { id: 'battery', name: 'Smart Lithium Pack', tag: 'Protected Cells · Extended Range', price: '₹12,500' },
    { id: 'brakes', name: 'Hydraulic Disc Brake System', tag: 'Auto Cut-off · Dual Piston', price: '₹950' },
    { id: 'display', name: 'Digital Throttle & Cockpit', tag: 'Speedometer · Battery Gauge', price: '₹1,150' },
  ];

  return (
    <section
      className="ev-hero-shell relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden pt-20"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="ev-hero-stage flex w-full flex-1 flex-col justify-center">
        <div className="ev-hero-content">
          {/* Left Column: Electrified Jyothi EV Branding & Core Narrative */}
          <div className="ev-hero-copy">
            <div className="ev-hero-kicker">
              <span>⚡ AUTHORIZED EV SPARES SPECIALIST</span>
            </div>

            <div className="mt-4">
              <h1 className="ev-hero-title">
                <span className="block text-[var(--shell)] brand-glow">JYOTHI</span>
                <span className="block text-[var(--acid)] text-glow font-black drop-shadow-[0_0_35px_rgba(216,237,88,.55)]">
                  EV <span className="font-mono text-3xl font-bold tracking-[.18em] text-[var(--teal)] md:text-5xl">ENTERPRISES</span>
                </span>
              </h1>
            </div>

            <p className="ev-hero-subtitle">
              India’s trusted supplier for factory-grade electric scooter spare parts. High-torque BLDC motors, 48V/60V intelligent controllers, custom lithium battery assemblies, and genuine chassis accessories.
            </p>

            {/* Trust Badges */}
            <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[11px] font-semibold text-[rgba(242,238,228,.8)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(216,237,88,.3)] bg-[rgba(216,237,88,.1)] px-3 py-1 text-[var(--acid)]">
                <ShieldCheck size={13} /> 100% Genuine Fit
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(56,178,172,.3)] bg-[rgba(56,178,172,.1)] px-3 py-1 text-[var(--teal)]">
                <Zap size={13} /> High-Torque Tested
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,238,228,.2)] bg-[rgba(242,238,228,.06)] px-3 py-1 text-[var(--shell)]">
                <PackagePlus size={13} /> Pan-India Dispatch
              </span>
            </div>

            {/* CTAs */}
            <div className="ev-hero-actions">
              <a href="#parts" className="ev-hero-action-primary group shadow-[0_0_30px_rgba(216,237,88,.4)]" data-testid="button-hero-parts">
                Explore parts catalog
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--acid)] transition-transform group-hover:rotate-45">
                  <ArrowUpRight size={13} />
                </span>
              </a>
              <button
                type="button"
                onClick={() => onOpenModal('parts')}
                className="ev-hero-action-secondary"
                data-testid="button-hero-upload"
              >
                Upload part photo <Upload size={14} />
              </button>
            </div>
          </div>

          {/* Right Column: Full-Scale 3D Exploded Vehicle Visual */}
          <div className="ev-hero-visual">
            <div className="ev-hero-orbit" />
            <div className="ev-hero-halo" />

            <div
              className="ev-hero-image-stack"
              style={{
                transform: getCameraTransform(),
                transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <div className="ev-hero-image-depth" />
              <div className="ev-hero-image-depth second" />
              <div className="ev-hero-image-frame">
                <img
                  src={`${basePath}/ev-vehicle.png`}
                  alt="3D exploded view of Jyothi EV electric scooter and components"
                  className="ev-hero-product-image"
                />
                <div className="ev-hero-scan" />
              </div>

              {/* 3D Spatial Callout Hotspots */}
              <div
                className={`ev-hero-label one cursor-pointer transition-all ${activePart === 'motor' ? 'scale-110 border-[var(--acid)] bg-[rgba(11,19,30,.95)] shadow-[0_0_25px_rgba(216,237,88,.6)]' : ''}`}
                onClick={() => onOpenModal('parts', 'BLDC 1000W Hub Motor')}
              >
                <span>Front System</span>
                <strong>BLDC Motor & Fork</strong>
              </div>

              <div
                className={`ev-hero-label two cursor-pointer transition-all ${activePart === 'controller' ? 'scale-110 border-[var(--acid)] bg-[rgba(11,19,30,.95)] shadow-[0_0_25px_rgba(216,237,88,.6)]' : ''}`}
                onClick={() => onOpenModal('parts', '48V Sine-Wave Controller')}
              >
                <span>Power Core</span>
                <strong>48V Controller</strong>
              </div>

              <div
                className={`ev-hero-label three cursor-pointer transition-all ${activePart === 'battery' ? 'scale-110 border-[var(--coral)] bg-[rgba(11,19,30,.95)] shadow-[0_0_25px_rgba(255,101,66,.6)]' : ''}`}
                onClick={() => onOpenModal('parts', 'Smart Lithium Battery Pack')}
              >
                <span>Energy Matrix</span>
                <strong>Lithium Pack</strong>
              </div>
            </div>

            {/* 3D Camera Preset Switcher */}
            <div className="absolute bottom-2 right-4 z-20 hidden items-center gap-2 rounded-full border border-[rgba(216,237,88,.2)] bg-[rgba(11,19,30,.85)] p-1.5 backdrop-blur-md md:flex">
              <button
                type="button"
                onClick={() => setCameraMode('exploded')}
                className={`rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase transition-all ${cameraMode === 'exploded' ? 'bg-[var(--acid)] text-[var(--ink)] shadow-[0_0_12px_rgba(216,237,88,.4)]' : 'text-[rgba(242,238,228,.6)] hover:text-[var(--shell)]'}`}
              >
                Exploded View
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('power')}
                className={`rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase transition-all ${cameraMode === 'power' ? 'bg-[var(--acid)] text-[var(--ink)] shadow-[0_0_12px_rgba(216,237,88,.4)]' : 'text-[rgba(242,238,228,.6)] hover:text-[var(--shell)]'}`}
              >
                Drive Core
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('matrix')}
                className={`rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase transition-all ${cameraMode === 'matrix' ? 'bg-[var(--acid)] text-[var(--ink)] shadow-[0_0_12px_rgba(216,237,88,.4)]' : 'text-[rgba(242,238,228,.6)] hover:text-[var(--shell)]'}`}
              >
                Battery Matrix
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 3D Component Spotlight Ribbon */}
      <div className="relative z-10 w-full border-t border-[rgba(216,237,88,.15)] bg-[rgba(8,14,23,.88)] px-4 py-3.5 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-3 lg:flex-row">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--acid)]">
            <span className="flex h-2 w-2 animate-ping rounded-full bg-[var(--acid)]" />
            <span>Interactive 3D Inspector:</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {componentsList.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onMouseEnter={() => setActivePart(comp.id)}
                onMouseLeave={() => setActivePart(null)}
                onClick={() => onOpenModal('parts', comp.name)}
                className={`group/chip flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${activePart === comp.id ? 'border-[var(--acid)] bg-[var(--acid)] text-[var(--ink)] shadow-[0_0_15px_rgba(216,237,88,.4)]' : 'border-[rgba(242,238,228,.14)] bg-[rgba(18,30,46,.6)] text-[rgba(242,238,228,.85)] hover:border-[var(--acid)] hover:text-[var(--acid)]'}`}
              >
                <span>{comp.name}</span>
                <span className={`font-mono text-[10px] font-bold ${activePart === comp.id ? 'text-[var(--ink)]' : 'text-[var(--acid)]'}`}>
                  {comp.price}
                </span>
                <ArrowUpRight size={12} className="opacity-60 transition-transform group-hover/chip:translate-x-0.5 group-hover/chip:-translate-y-0.5" />
              </button>
            ))}
          </div>

          <a href="#parts" className="hidden items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--shell)] transition-colors hover:text-[var(--acid)] xl:flex">
            <span>Catalog</span>
            <ChevronDown size={14} className="animate-bounce text-[var(--acid)]" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/admin" component={AdminRoute} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function HomeRedirect() {
  if (!isClerkConfigured) {
    return <Home />;
  }
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/admin" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function AdminRoute() {
  if (!isClerkConfigured) {
    return <AdminDashboard />;
  }
  return (
    <>
      <Show when="signed-in">
        <AdminDashboard />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ink)] px-4 py-10">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ink)] px-4 py-10">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      if (user?.id) queryClient.clear();
    });
    return unsubscribe;
  }, [addListener]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  if (!isClerkConfigured) {
    return (
      <QueryClientProvider client={queryClient}>
        <Router />
      </QueryClientProvider>
    );
  }

  const clerkAppearance = {
    theme: shadcn,
    cssLayerName: 'clerk',
    options: {
      logoPlacement: 'inside' as const,
      logoLinkUrl: basePath || '/',
      logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    },
    variables: {
      colorPrimary: '#D8ED58',
      colorForeground: '#1B2A3C',
      colorMutedForeground: '#637080',
      colorDanger: '#B84E34',
      colorBackground: '#F2EEE4',
      colorInput: '#FBF8F0',
      colorInputForeground: '#1B2A3C',
      colorNeutral: '#C8C5BA',
      fontFamily: 'DM Sans, sans-serif',
      borderRadius: '1rem',
    },
    elements: {
      rootBox: 'w-full flex justify-center',
      cardBox: 'bg-[#F2EEE4] rounded-2xl w-[440px] max-w-full overflow-hidden',
      card: '!shadow-none !border-0 !bg-transparent !rounded-none',
      footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
      headerTitle: 'text-[#1B2A3C]',
      headerSubtitle: 'text-[#637080]',
      socialButtonsBlockButtonText: 'text-[#1B2A3C]',
      formFieldLabel: 'text-[#1B2A3C]',
      footerActionLink: 'text-[#1B2A3C]',
      footerActionText: 'text-[#637080]',
      dividerText: 'text-[#637080]',
      identityPreviewEditButton: 'text-[#1B2A3C]',
      formFieldSuccessText: 'text-[#287B77]',
      alertText: 'text-[#B84E34]',
      logoBox: 'mb-5',
      logoImage: 'max-h-14',
      socialButtonsBlockButton: 'border-[#C8C5BA] bg-[#FBF8F0]',
      formButtonPrimary: 'bg-[#1B2A3C] text-[#F2EEE4] hover:bg-[#287B77]',
      formFieldInput: 'border-[#C8C5BA] bg-[#FBF8F0] text-[#1B2A3C]',
      footerAction: 'text-[#637080]',
      dividerLine: 'bg-[#C8C5BA]',
      alert: 'border-[#E98062] bg-[#FFF2ED]',
      otpCodeFieldInput: 'border-[#C8C5BA] bg-[#FBF8F0] text-[#1B2A3C]',
      formFieldRow: 'gap-2',
      main: 'gap-5',
    },
  };

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to manage Jyothi EV parts' } },
        signUp: { start: { title: 'Create your admin account', subtitle: 'Use the approved admin email to continue' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

export default App;