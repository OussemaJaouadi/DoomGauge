import type { Visit } from './model';
/** Latest cumulative snapshot replaces older pending snapshots, never adds twice. */
export class Outbox {
  private pending=new Map<string,Visit>(); private running=false;
  constructor(private send:(visit:Visit)=>Promise<void>,private report:(failed:boolean)=>void) {}
  put(visit:Visit) {this.pending.set(visit.id,visit);void this.flush();}
  get size(){return this.pending.size;}
  async flush() {
    if(this.running)return;this.running=true;
    try {
      for(const [id,visit] of this.pending) {
        try {await this.send(visit);} catch {this.report(true);return;}
        if(this.pending.get(id)?.revision===visit.revision)this.pending.delete(id);
      }
      this.report(false);
    } finally {this.running=false;}
  }
}
