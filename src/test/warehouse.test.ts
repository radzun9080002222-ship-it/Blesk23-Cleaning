import { describe, expect, it } from 'vitest';
import { annotateCommand, deleteCommand, inRepair, quantity, rowStatuses, shortage, withRepairNote, type Item } from '@/features/warehouse/types';
const item: Item = {id:'1',name:'Ведро',category:'Инвентарь',unit:'шт',note:'',adler:3,sochi:null,targetAdler:7,targetSochi:4};
describe('warehouse quantities',()=>{
  it('keeps unknown stock distinct from zero',()=>{expect(shortage(item,'sochi')).toBeNull();expect(shortage({...item,sochi:0},'sochi')).toBe(4);});
  it('does not recommend purchases without a target',()=>{expect(shortage({...item,targetAdler:null},'adler')).toBeNull();});
  it('computes shortage and never treats surplus as negative demand',()=>{expect(shortage(item,'adler')).toBe(4);expect(shortage({...item,adler:10},'adler')).toBe(0);});
  it('accepts Russian decimals and explicit zero',()=>{expect(quantity(' 1,125 ')).toBe(1.125);expect(quantity('0')).toBe(0);});
  it.each(['','-1','Infinity','1e3','1.0001','1000001','1,2л'])('rejects malformed amount %s',v=>expect(()=>quantity(v)).toThrow());
  it('marks repair without hiding an uncounted or short quantity',()=>{
    expect(inRepair('В ремонте.')).toBe(true); expect(inRepair('после РЕМОНТА')).toBe(true); expect(inRepair('эталон 4')).toBe(false);
    expect(rowStatuses({...item,adler:null,note:'В ремонте.'},'adler')).toEqual(['не посчитано','В ремонте']);
    expect(rowStatuses(item,'adler')).toEqual(['ниже эталона']);
    expect(rowStatuses({...item,adler:7,targetAdler:7,note:''},'adler')).toEqual([]);
  });
  it('builds delete and annotate commands',()=>{
    expect(deleteCommand('1','  заглушка ')).toEqual({kind:'delete',id:'1',note:'заглушка'});
    expect(annotateCommand('1','отметка','  В ремонте. ')).toEqual({kind:'annotate',id:'1',note:'отметка',itemNote:'В ремонте.'});
    expect(withRepairNote('норма 2')).toBe('норма 2 В ремонте.');
    expect(withRepairNote('уже в ремонте')).toBe('уже в ремонте');
    expect(()=>deleteCommand('1','x')).toThrow();
    expect(()=>annotateCommand('1','ок','я'.repeat(1001))).toThrow();
  });
});
