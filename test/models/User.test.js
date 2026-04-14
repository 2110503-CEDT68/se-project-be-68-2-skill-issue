const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('User Model', () => {
    it('should hash password before saving', async () => {
    bcrypt.genSalt.mockResolvedValue('mockSalt');
    bcrypt.hash.mockResolvedValue('hashedPassword');
    
    const user = new User({ name: 'Test', password: 'plainPassword' });
    
    // --- FIX: Find the specific hook that handles bcrypt ---
    const preSaveHooks = User.schema.s.hooks._pres.get('save');
    const bcryptHook = preSaveHooks.find(hook => hook.fn.toString().includes('bcrypt')).fn;
    
    await bcryptHook.call(user, jest.fn());
    
    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 'mockSalt');
    expect(user.password).toBe('hashedPassword');
    });

  it('should return a signed JWT token', () => {
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_EXPIRE = '30d';
    jwt.sign.mockReturnValue('mockToken');
    
    const user = new User({ _id: '123' });
    const token = user.getSignedJwtToken();
    
    expect(jwt.sign).toHaveBeenCalledWith({ id: user._id }, 'secret', { expiresIn: '30d' });
    expect(token).toBe('mockToken');
  });

  it('should compare entered password correctly', async () => {
    bcrypt.compare.mockResolvedValue(true);
    const user = new User({ password: 'hashed' });
    
    const isMatch = await user.matchPassword('plain');
    expect(bcrypt.compare).toHaveBeenCalledWith('plain', 'hashed');
    expect(isMatch).toBe(true);
  });
});