jest.mock('../../src/models', () => ({
  Order: {
    create: jest.fn(),
  },
  OrderItem: {
    insertMany: jest.fn(),
  },
  Product: {
    find: jest.fn(),
    updateOne: jest.fn(),
    bulkWrite: jest.fn(),
  },
}));

jest.mock('../../src/services/CouponService', () => ({
  validateCouponForUser: jest.fn(),
}));

const { Order, OrderItem, Product } = require('../../src/models');
const CouponService = require('../../src/services/CouponService');
const OrderService = require('../../src/services/OrderService');

describe('OrderService.createOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('creates order with batched product reads and stock updates', async () => {
    Product.find.mockResolvedValue([
      {
        id: 'p1',
        name: 'Phone A',
        isActive: true,
        quantity: 10,
        price: 100,
        images: [{ url: 'img-a' }],
      },
      {
        id: 'p2',
        name: 'Phone B',
        isActive: true,
        quantity: 5,
        price: 200,
        images: [{ url: 'img-b' }],
      },
    ]);

    Order.create.mockResolvedValue({ id: 'o1' });
    OrderItem.insertMany.mockResolvedValue([]);
    Product.updateOne.mockResolvedValue({ modifiedCount: 1 });

    jest.spyOn(OrderService, 'getOrderById').mockResolvedValue({ id: 'o1' });

    const result = await OrderService.createOrder('u1', {
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
      shippingAddress: { name: 'N', phone: '0', address: 'A' },
      paymentMethod: 'cod',
      shippingFee: 10,
      tax: 5,
    });

    expect(Product.find).toHaveBeenCalledWith({ _id: { $in: ['p1', 'p2'] } });
    expect(Order.create).toHaveBeenCalledTimes(1);
    expect(OrderItem.insertMany).toHaveBeenCalledTimes(1);
    expect(Product.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: 'p1', quantity: { $gte: 3 } },
      { $inc: { quantity: -3 } }
    );
    expect(Product.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'p2', quantity: { $gte: 1 } },
      { $inc: { quantity: -1 } }
    );
    expect(result).toEqual({ id: 'o1' });
  });

  it('throws when duplicated line items exceed stock', async () => {
    Product.find.mockResolvedValue([
      {
        id: 'p1',
        name: 'Phone A',
        isActive: true,
        quantity: 2,
        price: 100,
        images: [],
      },
    ]);

    await expect(
      OrderService.createOrder('u1', {
        items: [
          { productId: 'p1', quantity: 2 },
          { productId: 'p1', quantity: 2 },
        ],
        shippingAddress: { name: 'N', phone: '0', address: 'A' },
      })
    ).rejects.toThrow('Insufficient stock for Phone A. Available: 2, Requested: 4');

    expect(Order.create).not.toHaveBeenCalled();
    expect(OrderItem.insertMany).not.toHaveBeenCalled();
    expect(Product.updateOne).not.toHaveBeenCalled();
  });

  it('applies coupon discount during order creation', async () => {
    Product.find.mockResolvedValue([
      {
        id: 'p1',
        name: 'Phone A',
        isActive: true,
        quantity: 10,
        price: 100,
        images: [],
      },
    ]);

    CouponService.validateCouponForUser.mockResolvedValue({
      discountAmount: 20,
      coupon: {
        id: 'c1',
        code: 'SALE20',
        discountType: 'fixed',
        discountValue: 20,
      },
    });

    Order.create.mockResolvedValue({ id: 'o2' });
    OrderItem.insertMany.mockResolvedValue([]);
    Product.updateOne.mockResolvedValue({ modifiedCount: 1 });

    jest.spyOn(OrderService, 'getOrderById').mockResolvedValue({ id: 'o2' });

    await OrderService.createOrder('u1', {
      items: [{ productId: 'p1', quantity: 1 }],
      shippingAddress: { name: 'N', phone: '0', address: 'A' },
      couponCode: 'sale20',
    });

    expect(CouponService.validateCouponForUser).toHaveBeenCalledWith('u1', 'sale20', 100);
    expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
      discount: 20,
      total: 80,
      coupon: expect.objectContaining({ code: 'SALE20' }),
    }));
  });
});
