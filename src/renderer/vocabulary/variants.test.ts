import { describe, expect, it } from 'vitest';
import { splitVariants } from './variants';

describe('常被识别成 field', () => {
  it('splits on commas, enumeration commas, semicolons and line breaks in either width', () => {
    expect(splitVariants('云, 克劳德，cloud、clawed;klod；x\ny\r\nz')).toEqual(['云', '克劳德', 'cloud', 'clawed', 'klod', 'x', 'y', 'z']);
  });

  it('trims each variant, keeps inner spaces and drops empty parts', () => {
    expect(splitVariants('  open ai ,, 、 ')).toEqual(['open ai']);
    expect(splitVariants(' ，；\n ')).toEqual([]);
    expect(splitVariants('')).toEqual([]);
  });
});
