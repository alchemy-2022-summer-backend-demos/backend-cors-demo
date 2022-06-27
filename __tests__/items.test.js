const pool = require('../lib/utils/pool');
const setup = require('../data/setup');
const request = require('supertest');
const app = require('../lib/app');
const UserService = require('../lib/services/UserService');
const Item = require('../lib/models/Item');

const mockUser = {
  email: 'benny@example.com',
  password: '123456',
};

const mockUser2 = {
  email: 'julie@example.com',
  password: '123456',
};

const registerAndLogin = async (userProps = {}) => {
  const password = userProps.password ?? mockUser.password;

  // Create an "agent" that gives us the ability
  // to store cookies between requests in a test
  const agent = request.agent(app);

  // Create a user to sign in with
  const user = await UserService.create({ ...mockUser, ...userProps });

  // ...then sign in
  const { email } = user;
  await agent.post('/api/v1/users/sessions').send({ email, password });
  return [agent, user];
};

describe('users', () => {
  beforeEach(() => {
    return setup(pool);
  });

  afterAll(() => {
    pool.end();
  });

  it('POST /api/v1/items should create a new item for authed user', async () => {
    const [agent, user] = await registerAndLogin();
    const resp = await agent
      .post('/api/v1/items')
      .send({ description: 'eggs', qty: 12 });
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      id: expect.any(String),
      user_id: user.id,
      description: 'eggs',
      qty: 12,
    });
  });

  it('PUT /api/v1/items/:id should update an item', async () => {
    // create a user
    const [agent, user] = await registerAndLogin();
    const item = await Item.insert({
      description: 'apples',
      qty: 6,
      user_id: user.id,
    });
    const resp = await agent
      .put(`/api/v1/items/${item.id}`)
      .send({ bought: true });
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({ ...item, bought: true });
  });

  it('PUT /api/v1/items/:id should 403 for invalid users', async () => {
    // create a user
    const [agent] = await registerAndLogin();
    // create a second user
    const user2 = await UserService.create(mockUser2);
    const item = await Item.insert({
      description: 'apples',
      qty: 6,
      user_id: user2.id,
    });
    const resp = await agent
      .put(`/api/v1/items/${item.id}`)
      .send({ bought: true });
    expect(resp.status).toBe(403);
  });
});
