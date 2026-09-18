import { describe, expect, it } from 'vitest';
import { quantity, shortage, type Item } from '@/features/warehouse/types';
const item: Item = {id:'1',name:'Ведро',category:'Инвентарь',unit:'шт',note:'',adler:3,sochi:null,targetAdler:7,targetSochi:4};
describe('warehouse quantities',()=>{
  it('keeps unknown stock distinct from zero',()=>{expect(shortage(item,'sochi')).toBeNull();expect(shortage({...item,sochi:0},'sochi')).toBe(4);});
  it('does not recommend purchases without a target',()=>{expect(shortage({...item,targetAdler:null},'adler')).toBeNull();});
  it('computes shortage and never treats surplus as negative demand',()=>{expect(shortage(item,'adler')).toBe(4);expect(shortage({...item,adler:10},'adler')).toBe(0);});
  it('accepts Russian decimals and explicit zero',()=>{expect(quantity(' 1,125 ')).toBe(1.125);expect(quantity('0')).toBe(0);});
  it.each(['','-1','Infinity','1e3','1.0001','1000001','1,2л'])('rejects malformed amount %s',v=>expect(()=>quantity(v)).toThrow());
});
