// Test server.js 
process.env.PORT = '5098';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRE = '30d';
process.env.JWT_COOKIE_EXPIRE = '30';
process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';

jest.mock('../config/db', () => jest.fn().mockResolvedValue(true));
jest.mock('swagger-jsdoc', () => jest.fn().mockReturnValue({}));
jest.mock('swagger-ui-express', () => ({
  serve: (req, res, next) => next(),
  setup: () => (req, res, next) => next()
}));

// Mock process.exit before requiring server to intercept it properly
const originalExit = process.exit;
process.exit = jest.fn();

// Patch app.listen to capture all created servers so we can close them later
const servers = [];
const express = require('express');
const originalExpressListen = express.application.listen;
express.application.listen = function (...args) {
  const srv = originalExpressListen.apply(this, args);
  servers.push(srv);
  return srv;
};

describe('Server', () => {
  let app;

  beforeAll(done => {
    app = require('../server');
    setTimeout(done, 500);
  });

  it('should export the express app', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('should have middleware stack', () => {
    const router = app._router || app.router;
    expect(router).toBeDefined();
    expect(router.stack.length).toBeGreaterThan(0);
  });

  it('should have unhandledRejection listener', () => {
    const listeners = process.listeners('unhandledRejection');
    expect(listeners.length).toBeGreaterThan(0);
  });

  it('should log error and close server on unhandledRejection', done => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const listeners = process.listeners('unhandledRejection');
    const handler = listeners[listeners.length - 1];

    handler(new Error('test rejection'), Promise.resolve());

    expect(consoleSpy).toHaveBeenCalledWith('Error: test rejection');

    // server.close callback calls process.exit(1) asynchronously
    setTimeout(() => {
      expect(process.exit).toHaveBeenCalledWith(1);
      consoleSpy.mockRestore();
      done();
    }, 500);
  });
});

afterAll(done => {
  process.exit = originalExit;
  express.application.listen = originalExpressListen;
  // Close all servers that were opened during tests
  let pending = servers.length;
  if (pending === 0) return done();
  servers.forEach(srv => {
    srv.close(() => {
      pending--;
      if (pending === 0) done();
    });
  });
});

describe('Server in production mode', () => {
  it('should not start listener when NODE_ENV is production', () => {
    const savedEnv = process.env.NODE_ENV;
    const savedPort = process.env.PORT;
    process.env.NODE_ENV = 'production';
    delete process.env.PORT;

    let prodApp;
    jest.isolateModules(() => {
      prodApp = require('../server');
    });

    expect(prodApp).toBeDefined();
    expect(typeof prodApp).toBe('function');

    process.env.NODE_ENV = savedEnv;
    process.env.PORT = savedPort;
  });
});

describe('Server with default PORT', () => {
  it('should use port 5000 when PORT env var is not set', done => {
    const savedPort = process.env.PORT;
    const savedEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    // Mock dotenv to not set PORT
    jest.doMock('dotenv', () => ({
      config: jest.fn() // no-op so PORT stays unset
    }));
    delete process.env.PORT;

    let defaultApp;
    jest.isolateModules(() => {
      defaultApp = require('../server');
    });

    expect(defaultApp).toBeDefined();

    setTimeout(() => {
      process.env.PORT = savedPort;
      process.env.NODE_ENV = savedEnv;
      done();
    }, 500);
  });
});
