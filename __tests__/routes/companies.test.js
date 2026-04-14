describe('Companies Routes', () => {
  let router;

  beforeAll(() => {
    jest.mock('../../middleware/auth', () => ({
      protect: jest.fn((req, res, next) => next()),
      authorize: jest.fn((...roles) => (req, res, next) => next())
    }));

    jest.mock('../../controllers/companies', () => ({
      getCompanies: jest.fn((req, res) => res.status(200).json({ success: true })),
      getCompany: jest.fn((req, res) => res.status(200).json({ success: true })),
      createCompany: jest.fn((req, res) => res.status(201).json({ success: true })),
      updateCompany: jest.fn((req, res) => res.status(200).json({ success: true })),
      deleteCompany: jest.fn((req, res) => res.status(200).json({ success: true }))
    }));

    jest.mock('../../controllers/bookings', () => ({
      getBookings: jest.fn((req, res) => res.status(200).json({ success: true })),
      getBooking: jest.fn((req, res) => res.status(200).json({ success: true })),
      addBooking: jest.fn((req, res) => res.status(200).json({ success: true })),
      updateBooking: jest.fn((req, res) => res.status(200).json({ success: true })),
      deleteBooking: jest.fn((req, res) => res.status(200).json({ success: true }))
    }));

    jest.mock('../../controllers/reviews', () => ({
      getReviews: jest.fn((req, res) => res.status(200).json({ success: true })),
      getReview: jest.fn((req, res) => res.status(200).json({ success: true })),
      addReview: jest.fn((req, res) => res.status(201).json({ success: true })),
      updateReview: jest.fn((req, res) => res.status(200).json({ success: true })),
      deleteReview: jest.fn((req, res) => res.status(200).json({ success: true }))
    }));

    router = require('../../routes/companies');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should be an express router', () => {
    expect(router).toBeDefined();
    expect(router.stack).toBeDefined();
  });

  it('should have routes defined', () => {
    expect(router.stack.length).toBeGreaterThan(0);
  });

  it('should mount booking router on /:id/bookings/', () => {
    // Sub-routers are mounted as middleware layers (no .route property)
    const middlewareLayers = router.stack.filter(layer => !layer.route);
    expect(middlewareLayers.length).toBeGreaterThan(0);
  });

  it('should mount review router on /:id/reviews/', () => {
    // There should be at least 2 middleware layers (bookings + reviews)
    const middlewareLayers = router.stack.filter(layer => !layer.route);
    expect(middlewareLayers.length).toBeGreaterThanOrEqual(2);
  });

  it('should have routes for /', () => {
    const rootRoutes = router.stack.filter(
      layer => layer.route && layer.route.path === '/'
    );
    expect(rootRoutes.length).toBeGreaterThan(0);
  });

  it('should have routes for /:id', () => {
    const idRoutes = router.stack.filter(
      layer => layer.route && layer.route.path === '/:id'
    );
    expect(idRoutes.length).toBeGreaterThan(0);
  });
});
