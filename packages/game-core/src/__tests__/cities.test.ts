import { describe, it, expect } from 'vitest';
import {
  LIBYA_CITIES,
  searchLibyaCities,
  getCityById,
  normalizeLibyaSearchText
} from '../index.js';

describe('Libyan Cities & Wadi Al-Shati Dataset', () => {
  const wadiAlShatiIds = [
    'ly_brak_alshati',
    'ly_alqarada_alshati',
    'ly_idri_alshati',
    'ly_qira',
    'ly_ishkada',
    'ly_aqar_alshati',
    'ly_mahruqah',
    'ly_alzawiya_alshati',
    'ly_tarut',
    'ly_quttah',
    'ly_barqan',
    'ly_wanzarik',
    'ly_tamaskat',
    'ly_zalwaz',
    'ly_alhatiyah',
    'ly_qaqam',
    'ly_tamzawah',
    'ly_tamsan',
    'ly_aldabdeb',
  ];

  it('guarantees strictly unique IDs across the entire Libyan cities dataset', () => {
    const ids = LIBYA_CITIES.map((c) => c.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(LIBYA_CITIES.length).toBe(89);
  });

  it('includes all 19 Wadi Al-Shati locations under region: "south"', () => {
    const southCities = LIBYA_CITIES.filter((c) => c.region === 'south');
    expect(southCities.length).toBe(32);

    for (const shatiId of wadiAlShatiIds) {
      const city = southCities.find((c) => c.id === shatiId);
      expect(city).toBeDefined();
      expect(city?.region).toBe('south');
    }
  });

  it('clearly distinguishes Al-Zawiya Al-Shati from Zawiya in the West', () => {
    const shatiZawiya = getCityById('ly_alzawiya_alshati');
    const westZawiya = getCityById('ly_zawiya');

    expect(shatiZawiya).toBeDefined();
    expect(westZawiya).toBeDefined();
    expect(shatiZawiya?.id).not.toBe(westZawiya?.id);
    expect(shatiZawiya?.region).toBe('south');
    expect(westZawiya?.region).toBe('west');
    expect(shatiZawiya?.name_ar).toBe('الزوية الشاطئ');
    expect(westZawiya?.name_ar).toBe('الزاوية');
  });

  it('searching "وادي الشاطئ" returns all 19 locations', () => {
    const results = searchLibyaCities('وادي الشاطئ');
    const returnedIds = results.map((c) => c.id);

    expect(results.length).toBeGreaterThanOrEqual(19);
    for (const id of wadiAlShatiIds) {
      expect(returnedIds).toContain(id);
    }
  });

  it('normalizes Arabic characters with diacritics, alef, and taa marbuta', () => {
    expect(normalizeLibyaSearchText('أدري')).toBe('ادري');
    expect(normalizeLibyaSearchText('آقار')).toBe('اقار');
    expect(normalizeLibyaSearchText('وادي الشاطئ')).toBe('وادي الشاطي');
    expect(normalizeLibyaSearchText('محروقة')).toBe('محروقه');
  });

  it('normalization supports "وادي الشاطي" (with yaa) and "الشاطئ"', () => {
    const resultsYaa = searchLibyaCities('وادي الشاطي');
    const returnedIdsYaa = resultsYaa.map((c) => c.id);

    for (const id of wadiAlShatiIds) {
      expect(returnedIdsYaa).toContain(id);
    }

    const resultsShati = searchLibyaCities('الشاطئ');
    const returnedIdsShati = resultsShati.map((c) => c.id);
    for (const id of wadiAlShatiIds) {
      expect(returnedIdsShati).toContain(id);
    }
  });

  it('typing any specific area name places that area at the very top of search results', () => {
    // 1. Mahruqah
    const mahruqahRes = searchLibyaCities('محروقة');
    expect(mahruqahRes[0]?.id).toBe('ly_mahruqah');
    expect(mahruqahRes[0]?.name_ar).toBe('محروقة');

    // 2. Tarut
    const tarutRes = searchLibyaCities('تاروت');
    expect(tarutRes[0]?.id).toBe('ly_tarut');
    expect(tarutRes[0]?.name_ar).toBe('تاروت');

    // 3. Brak Al-Shati
    const brakRes = searchLibyaCities('براك الشاطئ');
    expect(brakRes[0]?.id).toBe('ly_brak_alshati');

    // 4. Qira
    const qiraRes = searchLibyaCities('قيرة');
    expect(qiraRes[0]?.id).toBe('ly_qira');

    // 5. Tamsan
    const tamsanRes = searchLibyaCities('تمسان');
    expect(tamsanRes[0]?.id).toBe('ly_tamsan');

    // 6. Wanzarik
    const wanzarikRes = searchLibyaCities('ونزريك');
    expect(wanzarikRes[0]?.id).toBe('ly_wanzarik');

    // 7. Qaqam
    const qaqamRes = searchLibyaCities('ققم');
    expect(qaqamRes[0]?.id).toBe('ly_qaqam');
  });

  it('backward-compatibility: getCityById resolves legacy ly_brak_shati to ly_brak_alshati', () => {
    const legacyCity = getCityById('ly_brak_shati');
    const newCity = getCityById('ly_brak_alshati');

    expect(legacyCity).toBeDefined();
    expect(legacyCity?.id).toBe('ly_brak_alshati');
    expect(legacyCity?.name_ar).toBe('براك الشاطئ');
    expect(legacyCity).toEqual(newCity);
  });
});
