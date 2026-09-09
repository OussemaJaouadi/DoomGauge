import { MAX_SAMPLE_GAP_MS, type Visit } from './model';
/** Pure state machine. DOM adapters provide eligibility; clocks are injectable. */
export class VisitTracker {
  private value: Visit | undefined;
  private lastMono=0; private lastWall=0; private active=false;
  constructor(private collectorId: string, private emit: (visit: Visit)=>void, private id:()=>string=()=>crypto.randomUUID()) {}
  get current() { return this.value; }
  begin(platform: Visit['platform'], reelId: string|undefined, wall:number, mono:number) {
    this.finish(wall,mono);
    this.value={id:this.id(),collectorId:this.collectorId,platform,reelId,startedAt:wall,observedAt:wall,activeMs:0,intervals:[],revision:0,status:'open'};
    this.lastWall=wall;this.lastMono=mono;this.active=false;this.checkpoint();
  }
  sample(eligible:boolean,wall:number,mono:number,videoDurationMs?:number) {
    const v=this.value;if(!v)return;
    const elapsed=mono-this.lastMono, wallElapsed=wall-this.lastWall;
    if(this.active && elapsed>0 && elapsed<=MAX_SAMPLE_GAP_MS && wallElapsed>0 && Math.abs(wallElapsed-elapsed)<250) {
      const end=Math.max(v.observedAt,wall), start=Math.max(v.observedAt,end-elapsed);
      const previous=v.intervals.at(-1);
      if(previous && Math.abs(previous.end-start)<1) previous.end=end; else v.intervals.push({start,end});
      v.activeMs+=end-start;
    }
    v.observedAt=Math.max(v.observedAt,wall);
    if(videoDurationMs && Number.isFinite(videoDurationMs))v.videoDurationMs=videoDurationMs;
    this.lastMono=mono;this.lastWall=wall;this.active=eligible;
  }
  checkpoint() { if(this.value){this.value.revision++;this.emit(structuredClone(this.value));} }
  finish(wall:number,mono:number,status:Visit['status']='completed') {
    if(!this.value)return;
    this.sample(false,wall,mono);this.value.status=status;this.checkpoint();this.value=undefined;this.active=false;
  }
}
