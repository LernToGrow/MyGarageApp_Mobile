jest.mock('../../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import client from '../../src/api/client';
import {
  getJobs,
  getJob,
  createJob,
  updateInspection,
  setEstimate,
  startJob,
  addService,
  markServiceDone,
  removeService,
  removePart,
  addPart,
  completeJob,
  recordPayment,
  getInvoice,
  deleteJob,
} from '../../src/api/job.api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('job.api', () => {
  describe('getJobs', () => {
    it('GETs /jobs with no params by default', () => {
      getJobs();
      expect(client.get).toHaveBeenCalledWith('/jobs', { params: {} });
    });

    it('GETs /jobs with provided params', () => {
      getJobs({ status: 'open' });
      expect(client.get).toHaveBeenCalledWith('/jobs', { params: { status: 'open' } });
    });
  });

  describe('getJob', () => {
    it('GETs /jobs/:id', () => {
      getJob('j1');
      expect(client.get).toHaveBeenCalledWith('/jobs/j1');
    });
  });

  describe('createJob', () => {
    it('POSTs to /jobs with data', () => {
      const data = { customer_id: 'c1', bike_id: 'b1' };
      createJob(data);
      expect(client.post).toHaveBeenCalledWith('/jobs', data);
    });
  });

  describe('updateInspection', () => {
    it('PATCHes /jobs/:id/inspection', () => {
      updateInspection('j1', { inspection_notes: 'Looks good' });
      expect(client.patch).toHaveBeenCalledWith('/jobs/j1/inspection', { inspection_notes: 'Looks good' });
    });
  });

  describe('setEstimate', () => {
    it('PATCHes /jobs/:id/estimate with estimated_ready_at', () => {
      const data = { estimated_ready_at: '2026-05-25T17:00:00.000Z' };
      setEstimate('j1', data);
      expect(client.patch).toHaveBeenCalledWith('/jobs/j1/estimate', data);
    });
  });

  describe('startJob', () => {
    it('PATCHes /jobs/:id/start', () => {
      startJob('j1');
      expect(client.patch).toHaveBeenCalledWith('/jobs/j1/start');
    });
  });

  describe('addService', () => {
    it('POSTs to /jobs/:id/services', () => {
      const data = { services: [{ name: 'Oil Change', labour_charge: 200 }] };
      addService('j1', data);
      expect(client.post).toHaveBeenCalledWith('/jobs/j1/services', data);
    });
  });

  describe('markServiceDone', () => {
    it('PATCHes /jobs/:id/services/:serviceId', () => {
      markServiceDone('j1', 's1');
      expect(client.patch).toHaveBeenCalledWith('/jobs/j1/services/s1');
    });
  });

  describe('removeService', () => {
    it('DELETEs /jobs/:id/services/:serviceId', () => {
      removeService('j1', 's1');
      expect(client.delete).toHaveBeenCalledWith('/jobs/j1/services/s1');
    });
  });

  describe('removePart', () => {
    it('DELETEs /jobs/:id/parts/:partIndex', () => {
      removePart('j1', 0);
      expect(client.delete).toHaveBeenCalledWith('/jobs/j1/parts/0');
    });
  });

  describe('addPart', () => {
    it('POSTs to /jobs/:id/parts', () => {
      const data = { source_type: 'inventory', part_id: 'p1', name: 'Brake Pad', quantity: 2, unit_price: 150 };
      addPart('j1', data);
      expect(client.post).toHaveBeenCalledWith('/jobs/j1/parts', data);
    });
  });

  describe('completeJob', () => {
    it('PATCHes /jobs/:id/complete', () => {
      completeJob('j1');
      expect(client.patch).toHaveBeenCalledWith('/jobs/j1/complete');
    });
  });

  describe('recordPayment', () => {
    it('POSTs to /jobs/:id/payment', () => {
      const data = { payment_mode: 'cash', amount_paid: 500 };
      recordPayment('j1', data);
      expect(client.post).toHaveBeenCalledWith('/jobs/j1/payment', data);
    });
  });

  describe('getInvoice', () => {
    it('GETs /jobs/:id/invoice', () => {
      getInvoice('j1');
      expect(client.get).toHaveBeenCalledWith('/jobs/j1/invoice');
    });
  });

  describe('deleteJob', () => {
    it('DELETEs /jobs/:id', () => {
      deleteJob('j1');
      expect(client.delete).toHaveBeenCalledWith('/jobs/j1');
    });
  });
});
