describe('Database Config', () => {
  let connectDB;
  const originalEnv = process.env.MONGO_URI;

  beforeAll(() => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';
  });

  afterAll(() => {
    process.env.MONGO_URI = originalEnv;
  });

  beforeEach(() => {
    jest.resetModules();
    jest.mock('mongoose', () => ({
      set: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        connection: { host: 'localhost' }
      })
    }));
  });

  it('should connect to MongoDB', async () => {
    connectDB = require('../../config/db');
    const mongoose = require('mongoose');

    await connectDB();

    expect(mongoose.set).toHaveBeenCalledWith('strictQuery', true);
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
  });

  it('should set strictQuery to true', async () => {
    connectDB = require('../../config/db');
    const mongoose = require('mongoose');

    await connectDB();

    expect(mongoose.set).toHaveBeenCalledWith('strictQuery', true);
  });
});
