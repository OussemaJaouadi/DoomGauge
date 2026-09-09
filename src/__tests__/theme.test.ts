import { ThemeController } from '../theme/controller';
import { resolveTheme, isThemePreference, themePalettes } from '../theme/palette';
import { handleThemeRequest, isThemeRequest, type ThemeResponse } from '../theme/protocol';
import { readTheme, writeTheme, openThemeDatabase } from '../theme/storage';
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };
const luminance = (hex: string) => hex.slice(1).match(/../g)!.map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i]!,0);
const contrast = (a: string,b: string) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
for (const [mode, palette] of Object.entries(themePalettes)) {
  test(`${mode}: readable text and essential graphics on every surface`, () => {
    for (const bg of [palette['bg-root'],palette['bg-surface'],palette['bg-surface-raised']]) {
      for (const key of ['text-primary','text-secondary','text-muted','platform-yt','platform-ig','platform-fb','usage-increased','usage-decreased','chart-previous','threat-red','accent-blue'] as const) {
        if (contrast(palette[key],bg) < 4.5) throw new Error(`${mode} ${key}: ${contrast(palette[key],bg)}`);
      }
      for (const key of ['border-control','accent-blue','duration-short','duration-medium','duration-long'] as const) {
        if (contrast(palette[key],bg) < 3) throw new Error(`${mode} ${key}: ${contrast(palette[key],bg)}`);
      }
    }
  });
}
test('System follows OS; explicit choices override it; malformed preferences rejected', () => {
  expect(resolveTheme('system',true)).toBe('dark'); expect(resolveTheme('system',false)).toBe('light');
  expect(resolveTheme('light',true)).toBe('light'); expect(resolveTheme('dark',false)).toBe('dark');
  expect(isThemePreference('auto')).toBe(false); expect(isThemeRequest({type:'theme:set',preference:'auto'})).toBe(false);
});
test('startup failure retains System; saved preference loads', async () => {
  const applied: string[]=[]; const c=new ThemeController(async()=>{throw Error();},p=>applied.push(p));
  await c.initialize(); expect(applied).toEqual(['system']);
  const saved=new ThemeController(async()=>({ok:true,preference:'dark'}),p=>applied.push(p));
  await saved.initialize(); expect(saved.getSnapshot().preference).toBe('dark');
});
test('failed save keeps local choice; retry saves it; OS refresh preserves errors', async () => {
  let ok=false; const c=new ThemeController(async()=>ok?{ok:true,preference:'light'}:{ok:false},()=>{});
  await c.choose('light'); expect(c.getSnapshot()).toEqual({preference:'light',saving:false,error:true});
  c.refresh(); expect(c.getSnapshot().error).toBe(true);
  ok=true; await c.choose('light'); expect(c.getSnapshot().error).toBe(false);
});
test('late initialization cannot overwrite a user choice', async () => {
  let resolve!: (v:ThemeResponse)=>void;
  const c=new ThemeController(m=>m.type==='theme:get'?new Promise(r=>resolve=r):Promise.resolve({ok:true,preference:m.preference}),()=>{});
  const init=c.initialize(); await c.choose('light'); resolve({ok:true,preference:'dark'}); await init;
  expect(c.getSnapshot().preference).toBe('light');
});
test('rapid saves serialize and open surfaces accept committed changes', async () => {
  const writes:string[]=[]; const c=new ThemeController(async m=>{if(m.type==='theme:set'){writes.push(m.preference);return {ok:true,preference:m.preference};}return {ok:false};},()=>{});
  const first=c.choose('light'); const second=c.choose('dark'); await Promise.all([first,second]);
  expect(writes).toEqual(['light','dark']); expect(c.getSnapshot().preference).toBe('dark');
  c.receive('system'); expect(c.getSnapshot().preference).toBe('system');
});
test('a committed external change during save is not lost', async () => {
  const c=new ThemeController(async()=>{c.receive('dark');return {ok:true,preference:'light'};},()=>{});
  await c.choose('light'); expect(c.getSnapshot().preference).toBe('dark');
});
test('broadcast happens after commit and never on failed storage', async () => {
  const events:string[]=[];
  const store={read:async()=>'system' as const,write:async()=>{events.push('commit');}};
  await handleThemeRequest({type:'theme:set',preference:'dark'},store,()=>events.push('notify'));
  expect(events).toEqual(['commit','notify']);
  store.write=async()=>{throw Error();};
  expect(await handleThemeRequest({type:'theme:set',preference:'light'},store,()=>events.push('bad'))).toEqual({ok:false});
  expect(events).toEqual(['commit','notify']);
});
test('storage waits for transaction completion and closes on abort', async () => {
  let closed=0; let committed=false;
  const tx={oncomplete:null as null|(()=>void),onabort:null as null|(()=>void),onerror:null,error:null,objectStore:()=>({put:()=>{},get:()=>({result:'unknown'})})};
  const open=async()=>({transaction:()=>tx,close:()=>closed++}) as unknown as IDBDatabase;
  const write=writeTheme('dark',open).then(()=>{committed=true;}); await Promise.resolve();
  expect(committed).toBe(false); tx.oncomplete!(); await write; expect(closed).toBe(1);
  const read=readTheme(open); await Promise.resolve(); tx.oncomplete!(); expect(await read).toBe('system');
  const failed=writeTheme('light',open).then(()=>false,()=>true); await Promise.resolve(); tx.onabort!();
  expect(await failed).toBe(true); expect(closed).toBe(3);
});
test('additive migration preserves existing stores and closes stale connections', async () => {
  const stores=new Set(['events','rollups']); const versions:(number|undefined)[]=[]; let closes=0;
  const db={version:4,objectStoreNames:{contains:(s:string)=>stores.has(s)},createObjectStore:(s:string)=>stores.add(s),close:()=>closes++,onversionchange:null as null|(()=>void)};
  const factory={open:(_name:string,version?:number)=>{versions.push(version); const req={result:db,onupgradeneeded:null as null|(()=>void),onsuccess:null as null|(()=>void)};queueMicrotask(()=>{if(version)req.onupgradeneeded!();req.onsuccess!();});return req;}};
  await openThemeDatabase(factory as unknown as IDBFactory);
  expect(versions).toEqual([undefined,5]); expect([...stores]).toEqual(['events','rollups','preferences']);
  db.onversionchange!(); expect(closes).toBe(2);
});
