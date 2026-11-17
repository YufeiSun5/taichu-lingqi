import { createSave, validateSave } from '../core/game';
import type { Save } from '../core/game';

/** Inject Cocos sys.localStorage here; rules never depend on storage or engine. */
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type LoadResult = {status:'fresh'|'loaded';save:Save} | {status:'corrupt'|'unavailable';message:string};
export type WriteResult = {status:'saved'} | {status:'failed'|'blocked';message:string};
export type RecoveryResult = {status:'saved';save:Save;backupKey:string} | {status:'failed'|'blocked';message:string};

export class LocalSaveStore {
  private mode:'unloaded'|'ready'|'corrupt'|'unavailable'|'session'='unloaded';
  private baseline:string|null=null;
  private recoveryBackup:string|null=null;
  private storage:SaveStorage;
  private key:string;
  constructor(storage:SaveStorage, key='taichu-lingqi-v1') {this.storage=storage;this.key=key;}

  load():LoadResult {
    let raw:string|null;
    try { raw=this.storage.getItem(this.key); }
    catch { this.mode='unavailable';return {status:'unavailable',message:'无法读取存档。原进度尚未确认，请重试，或选择不保存的临时试玩。'}; }
    this.baseline=raw;this.recoveryBackup=null;
    if(raw===null){this.mode='ready';return {status:'fresh',save:createSave()};}
    try {const save=validateSave(JSON.parse(raw));this.mode='ready';return {status:'loaded',save};}
    catch {this.mode='corrupt';return {status:'corrupt',message:'已有存档无法解析或校验，原内容未更改。可重试读取、临时试玩，或备份原档后重新开始。'};}
  }

  /** Temporary play never receives write authority over unknown or corrupt data. */
  useSessionOnly():void {this.mode='session';}

  write(save:Save):WriteResult {
    if(this.mode!=='ready')return {status:'blocked',message:this.mode==='session'?'临时试玩：仅保留内存进度，不会写入或覆盖原存档。':'尚未恢复存档，禁止覆盖原内容。'};
    let raw:string;
    try { raw=JSON.stringify(validateSave(save)); }
    catch {return {status:'failed',message:'当前进度未通过校验，未保存。'};}
    return this.commit(raw);
  }

  private commit(raw:string):WriteResult {
    try {
      const current=this.storage.getItem(this.key);
      // Covers retry after a write succeeded but its read-back failed.
      if(current===raw){this.baseline=raw;return {status:'saved'};}
      if(current!==this.baseline)return {status:'blocked',message:'存档已被其他实例更改。本次未覆盖，请保留当前窗口并重新读取确认。'};
      this.storage.setItem(this.key,raw);
      if(this.storage.getItem(this.key)!==raw)return {status:'failed',message:'存档写入后校验失败。当前进度仅在内存，请重试保存。'};
      this.baseline=raw;return {status:'saved'};
    } catch {return {status:'failed',message:'保存失败，当前进度仅在内存。请保留窗口并重试保存，重开可能丢失本次进度。'};}
  }

  /** Explicit recovery only; never called automatically on a parse/read failure. */
  startNewWithBackup():RecoveryResult {
    if(this.mode!=='corrupt'||this.baseline===null)return {status:'blocked',message:'只有确认损坏且已读取的存档才可备份重建，请先重试读取。'};
    const raw=this.baseline;
    const save=createSave(), fresh=JSON.stringify(save);
    try {
      const current=this.storage.getItem(this.key);
      // A previous attempt may have committed successfully before verification failed.
      if(current===fresh&&this.recoveryBackup&&this.storage.getItem(this.recoveryBackup)===raw){this.mode='ready';this.baseline=fresh;return {status:'saved',save,backupKey:this.recoveryBackup};}
      if(current!==raw)return {status:'blocked',message:'原存档已变化，未重建。请重新读取确认。'};
      if(!this.recoveryBackup){
        // Never overwrite an existing backup, even with a fixed clock or another instance.
        const prefix=`${this.key}.recovery.${Date.now()}`;
        for(let i=0;i<100;i++){const candidate=`${prefix}.${i}`;if(this.storage.getItem(candidate)===null){this.recoveryBackup=candidate;break;}}
        if(!this.recoveryBackup)return {status:'failed',message:'无法分配独立备份位置，原档未更改。'};
      }
      const prior=this.storage.getItem(this.recoveryBackup);
      if(prior!==null&&prior!==raw){this.recoveryBackup=null;return {status:'blocked',message:'备份位置发生变化，原档未更改。请重试。'};}
      if(prior!==raw)this.storage.setItem(this.recoveryBackup,raw);
      if(this.storage.getItem(this.recoveryBackup)!==raw)return {status:'failed',message:'原档备份校验失败，未覆盖原档。'};
      // Recheck immediately before replacing the primary key.
      if(this.storage.getItem(this.key)!==raw)return {status:'blocked',message:'备份期间原档发生变化，未覆盖原档。请重新读取。'};
      const result=this.commit(fresh);
      if(result.status!=='saved')return result;
      this.mode='ready';return {status:'saved',save,backupKey:this.recoveryBackup};
    } catch {return {status:'failed',message:'备份或重建失败。未删除原档或备份，请保留窗口并重试。'};}
  }
}
