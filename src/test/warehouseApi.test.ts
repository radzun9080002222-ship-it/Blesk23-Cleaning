import { afterEach, expect, it, vi } from 'vitest';
import { rpc } from '@/features/warehouse/api';
afterEach(()=>vi.unstubAllGlobals());
it('accepts the empty 204 response returned by logout',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:204})));
  await expect(rpc('logout',{p_token:'test'})).resolves.toBeUndefined();
});
