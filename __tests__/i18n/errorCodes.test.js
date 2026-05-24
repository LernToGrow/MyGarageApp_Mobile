import ERROR_CODE_KEYS from '../../src/i18n/errorCodes';

describe('i18n/errorCodes', () => {
  it('exports an object', () => {
    expect(typeof ERROR_CODE_KEYS).toBe('object');
    expect(ERROR_CODE_KEYS).not.toBeNull();
  });

  it('all values are dot-separated i18n translation key strings', () => {
    Object.values(ERROR_CODE_KEYS).forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\w+\.\w+/);
    });
  });

  describe('Auth error codes', () => {
    it.each([
      ['PHONE_REQUIRED', 'errors.phoneRequired'],
      ['TOKEN_REQUIRED', 'errors.tokenRequired'],
      ['TOKEN_INVALID', 'errors.tokenInvalid'],
      ['TOKEN_NO_PHONE', 'errors.tokenNoPhone'],
      ['REGISTRATION_INCOMPLETE', 'errors.registrationIncomplete'],
      ['LANGUAGE_INVALID', 'errors.languageInvalid'],
      ['NOTHING_TO_UPDATE', 'errors.nothingToUpdate'],
      ['URL_REQUIRED', 'errors.urlRequired'],
    ])('maps %s → %s', (code, key) => {
      expect(ERROR_CODE_KEYS[code]).toBe(key);
    });
  });

  describe('Customer error codes', () => {
    it.each([
      ['NAME_PHONE_REQUIRED', 'errors.namePhoneRequired'],
      ['CUSTOMER_PHONE_DUPLICATE', 'errors.customerPhoneDuplicate'],
      ['CUSTOMER_NOT_FOUND', 'errors.customerNotFound'],
      ['BIKE_FIELDS_REQUIRED', 'errors.bikeFieldsRequired'],
    ])('maps %s → %s', (code, key) => {
      expect(ERROR_CODE_KEYS[code]).toBe(key);
    });
  });

  describe('Job error codes', () => {
    it.each([
      ['JOB_NOT_FOUND', 'errors.jobNotFound'],
      ['BIKE_NOT_FOUND', 'errors.bikeNotFound'],
      ['INSPECTION_NOTES_REQUIRED', 'errors.inspectionNotesRequired'],
      ['INSUFFICIENT_STOCK', 'errors.insufficientStock'],
      ['PAYMENT_MODE_INVALID', 'errors.paymentModeInvalid'],
      ['INVOICE_NOT_FOUND', 'errors.invoiceNotFound'],
    ])('maps %s → %s', (code, key) => {
      expect(ERROR_CODE_KEYS[code]).toBe(key);
    });
  });

  describe('Employee error codes', () => {
    it.each([
      ['PHONE_NAME_REQUIRED', 'errors.phoneNameRequired'],
      ['EMPLOYEE_PHONE_DUPLICATE', 'errors.employeePhoneDuplicate'],
      ['PERMISSIONS_ARRAY_REQUIRED', 'errors.permissionsArrayRequired'],
      ['PERMISSIONS_INVALID', 'errors.permissionsInvalid'],
      ['EMPLOYEE_NOT_FOUND', 'errors.employeeNotFound'],
    ])('maps %s → %s', (code, key) => {
      expect(ERROR_CODE_KEYS[code]).toBe(key);
    });
  });

  describe('Part/Inventory error codes', () => {
    it.each([
      ['PART_FIELDS_REQUIRED', 'errors.partFieldsRequired'],
      ['ADJUSTMENT_REQUIRED', 'errors.adjustmentRequired'],
      ['NEGATIVE_STOCK', 'errors.negativeStock'],
    ])('maps %s → %s', (code, key) => {
      expect(ERROR_CODE_KEYS[code]).toBe(key);
    });
  });

  describe('Generic error codes', () => {
    it('maps SERVER_ERROR', () => {
      expect(ERROR_CODE_KEYS['SERVER_ERROR']).toBe('errors.serverError');
    });
  });

  it('returns undefined for unknown error codes', () => {
    expect(ERROR_CODE_KEYS['UNKNOWN_CODE']).toBeUndefined();
  });
});
