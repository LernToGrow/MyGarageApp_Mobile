const ERROR_CODE_KEYS = {
  // Auth
  PHONE_REQUIRED:            'errors.phoneRequired',
  TOKEN_REQUIRED:            'errors.tokenRequired',
  TOKEN_INVALID:             'errors.tokenInvalid',
  TOKEN_NO_PHONE:            'errors.tokenNoPhone',
  REGISTRATION_INCOMPLETE:   'errors.registrationIncomplete',
  LANGUAGE_INVALID:          'errors.languageInvalid',
  NOTHING_TO_UPDATE:         'errors.nothingToUpdate',
  URL_REQUIRED:              'errors.urlRequired',

  // Customer
  NAME_PHONE_REQUIRED:       'errors.namePhoneRequired',
  CUSTOMER_PHONE_DUPLICATE:  'errors.customerPhoneDuplicate',
  CUSTOMER_NOT_FOUND:        'errors.customerNotFound',
  BIKE_FIELDS_REQUIRED:      'errors.bikeFieldsRequired',

  // Job
  JOB_IDS_REQUIRED:          'errors.jobIdsRequired',
  BIKE_NOT_FOUND:            'errors.bikeNotFound',
  JOB_NOT_FOUND:             'errors.jobNotFound',
  INSPECTION_NOTES_REQUIRED: 'errors.inspectionNotesRequired',
  INSPECTION_PHOTO_REQUIRED: 'errors.inspectionPhotoRequired',
  ESTIMATE_DATE_REQUIRED:    'errors.estimateDateRequired',
  SERVICES_ARRAY_REQUIRED:   'errors.servicesArrayRequired',
  SERVICE_NOT_FOUND:         'errors.serviceNotFound',
  PART_SOURCE_REQUIRED:      'errors.partSourceRequired',
  PART_NAME_QTY_REQUIRED:    'errors.partNameQtyRequired',
  PART_ID_REQUIRED:          'errors.partIdRequired',
  PART_NOT_IN_INVENTORY:     'errors.partNotInInventory',
  INSUFFICIENT_STOCK:        'errors.insufficientStock',
  PART_NOT_FOUND:            'errors.partNotFound',
  PAYMENT_MODE_INVALID:      'errors.paymentModeInvalid',
  AMOUNT_REQUIRED:           'errors.amountRequired',
  INVOICE_NOT_FOUND:         'errors.invoiceNotFound',

  // Employee
  PHONE_NAME_REQUIRED:          'errors.phoneNameRequired',
  EMPLOYEE_PHONE_DUPLICATE:     'errors.employeePhoneDuplicate',
  PERMISSIONS_ARRAY_REQUIRED:   'errors.permissionsArrayRequired',
  PERMISSIONS_INVALID:          'errors.permissionsInvalid',
  EMPLOYEE_NOT_FOUND:           'errors.employeeNotFound',

  // Part / Inventory
  PART_FIELDS_REQUIRED:      'errors.partFieldsRequired',
  ADJUSTMENT_REQUIRED:       'errors.adjustmentRequired',
  NEGATIVE_STOCK:            'errors.negativeStock',

  // Generic
  SERVER_ERROR:              'errors.serverError',
};

export default ERROR_CODE_KEYS;
