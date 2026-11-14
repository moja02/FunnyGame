/**
 * StorageService - LocalStorage abstraction for Settings and Records
 */
export class StorageService {
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`fg_${key}`);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(`fg_${key}`, JSON.stringify(value));
    } catch (e) {}
  }

  static getNumber(key, defaultValue = 0) {
    const val = localStorage.getItem(`fg_${key}`);
    return val !== null ? parseFloat(val) : defaultValue;
  }

  static setNumber(key, value) {
    try {
      localStorage.setItem(`fg_${key}`, value.toString());
    } catch (e) {}
  }

  static getBoolean(key, defaultValue = false) {
    const val = localStorage.getItem(`fg_${key}`);
    return val !== null ? val === 'true' : defaultValue;
  }

  static setBoolean(key, value) {
    try {
      localStorage.setItem(`fg_${key}`, value.toString());
    } catch (e) {}
  }
}
