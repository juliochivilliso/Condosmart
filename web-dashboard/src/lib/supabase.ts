import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Detectar si las credenciales son válidas antes de intentar crear el cliente
const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// Mock client para demo sin credenciales configuradas.
// Usa un Proxy universal: cualquier método/propiedad encadenable funciona sin crashear,
// y las promesas resuelven con error para que la UI muestre datos de demostración.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockClient = (): SupabaseClient<any> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: null, error: new Error('Supabase no configurado'), count: null }).then(resolve);
      }
      if (prop === 'channel') return () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) });
      if (prop === 'removeChannel') return () => {};
      if (prop === 'auth') return { signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase no configurado') }), resetPasswordForEmail: () => Promise.resolve({ error: new Error('Supabase no configurado') }), getSession: () => Promise.resolve({ data: { session: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), signOut: () => Promise.resolve({ error: null }) };
      if (prop === 'functions') return { invoke: () => Promise.resolve({ data: null, error: new Error('Supabase no configurado') }) };
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return () => [][Symbol.iterator]();

      // Cualquier otro método retorna una función que devuelve un nuevo Proxy encadenable.
      return (..._args: unknown[]) => new Proxy(() => {}, handler);
    },
    apply() {
      return new Promise((resolve) => resolve({ data: null, error: new Error('Supabase no configurado'), count: null }));
    },
  };
  return new Proxy(() => {}, handler) as unknown as SupabaseClient;
};

export const supabase: SupabaseClient =
  isValidUrl(supabaseUrl) && supabaseAnonKey && !supabaseAnonKey.startsWith('REPLACE')
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, storageKey: 'condosmart-auth', autoRefreshToken: true },
      })
    : createMockClient();

const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY ?? '';

export const supabaseAdmin: SupabaseClient | null =
  isValidUrl(supabaseUrl) && supabaseServiceKey && !supabaseServiceKey.startsWith('REPLACE')
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
