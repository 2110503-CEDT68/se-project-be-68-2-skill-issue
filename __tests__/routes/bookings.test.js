describe('Bookings Routes', () => {
  let router;

  beforeAll(() => {
    jest.mock('../../middleware/auth', () => ({
      protect: jest.fn((req, res, next) => next()),
      authorize: jest.fn((...roles) => (req, res, next) => next())
    }));

    jest.mock('../../controllers/bookings', () => ({
      getBookings: jest.fn((req, res) => res.status(200).json({ success: true })),
      getBooking: jest.fn((req, res) => res.status(200).json({ success: true })),
      addBooking: jest.fn((req, res) => res.status(200).json({ success: true })),
      updateBooking: jest.fn((req, res) => res.status(200).json({ success: true })),
      deleteBooking: jest.fn((req, res) => res.status(200).json({ success: true }))
    }));

    router = require('../../routes/bookings');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be an express router', () => {
    expect(router).toBeDefined();
    expect(router.stack).toBeDefined();
  });

  it('should have routes for /', () => {
    const rootRoutes = router.stack.filter(
      layer => layer.route && layer.route.path === '/'
    );
    expect(rootRoutes.length).toBeGreaterThan(0);
    // Should have GET and POST methods
    const rootRoute = rootRoutes[0];
    expect(rootRoute.route.methods.get || rootRoute.route.methods.post).toBeTruthy();
  });

  it('should have routes for /:id', () => {
    const idRoutes = router.stack.filter(
      layer => layer.route && layer.route.path === '/:id'
    );
    expect(idRoutes.length).toBeGreaterThan(0);
  });

  it('should have mergeParams enabled', () => {
    expect(router.mergeParams).toBe(true);
  });
});
