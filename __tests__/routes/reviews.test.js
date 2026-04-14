describe('Reviews Routes', () => {
  let router;

  beforeAll(() => {
    jest.mock('../../middleware/auth', () => ({
      protect: jest.fn((req, res, next) => next()),
      authorize: jest.fn((...roles) => (req, res, next) => next())
    }));

    jest.mock('../../controllers/reviews', () => ({
      getReviews: jest.fn((req, res) => res.status(200).json({ success: true })),
      getReview: jest.fn((req, res) => res.status(200).json({ success: true })),
      addReview: jest.fn((req, res) => res.status(201).json({ success: true })),
      updateReview: jest.fn((req, res) => res.status(200).json({ success: true })),
      deleteReview: jest.fn((req, res) => res.status(200).json({ success: true }))
    }));

    router = require('../../routes/reviews');
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
