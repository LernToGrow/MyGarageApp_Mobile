import useJobStore from '../../src/store/jobStore';

beforeEach(() => {
  useJobStore.getState().clearJob();
});

describe('jobStore', () => {
  describe('initial state', () => {
    it('has null activeJob', () => {
      expect(useJobStore.getState().activeJob).toBeNull();
    });
  });

  describe('setActiveJob', () => {
    it('sets the active job', () => {
      const job = { id: 'j1', status: 'open' };
      useJobStore.getState().setActiveJob(job);
      expect(useJobStore.getState().activeJob).toEqual(job);
    });

    it('replaces a previously set job', () => {
      useJobStore.getState().setActiveJob({ id: 'j1' });
      useJobStore.getState().setActiveJob({ id: 'j2' });
      expect(useJobStore.getState().activeJob).toEqual({ id: 'j2' });
    });
  });

  describe('updateActiveJob', () => {
    it('merges patch into activeJob', () => {
      useJobStore.getState().setActiveJob({ id: 'j1', status: 'open', note: 'test' });
      useJobStore.getState().updateActiveJob({ status: 'in_progress' });
      expect(useJobStore.getState().activeJob).toEqual({
        id: 'j1',
        status: 'in_progress',
        note: 'test',
      });
    });

    it('does nothing when activeJob is null', () => {
      useJobStore.getState().updateActiveJob({ status: 'in_progress' });
      expect(useJobStore.getState().activeJob).toBeNull();
    });

    it('adds new fields via patch', () => {
      useJobStore.getState().setActiveJob({ id: 'j1' });
      useJobStore.getState().updateActiveJob({ invoice: { total: 500 } });
      expect(useJobStore.getState().activeJob.invoice).toEqual({ total: 500 });
    });
  });

  describe('clearJob', () => {
    it('resets activeJob to null', () => {
      useJobStore.getState().setActiveJob({ id: 'j1' });
      useJobStore.getState().clearJob();
      expect(useJobStore.getState().activeJob).toBeNull();
    });
  });
});
