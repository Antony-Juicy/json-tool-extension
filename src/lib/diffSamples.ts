const v1 = {
    code: 0,
    message: 'ok',
    data: {
        orderId: 'a3f1c2e4-7b8d-4e2a-9c1f-5d6e7f8a9b0c',
        status: 'paid',
        amount: 299.5,
        currency: 'CNY',
        buyer: { userId: 10086, nickname: '林小夏', vipLevel: 2 },
        items: [
            { skuId: 'SKU-2041', title: '降噪蓝牙耳机', price: 249.5, quantity: 1 },
            { skuId: 'SKU-0377', title: '耳机保护套', price: 25, quantity: 2 },
        ],
        coupon: null,
        remark: '请工作日配送',
        createdAt: '2026-11-20T14:32:10+08:00',
    },
};

const v2 = {
    code: 0,
    message: 'ok',
    data: {
        orderId: 'a3f1c2e4-7b8d-4e2a-9c1f-5d6e7f8a9b0c',
        status: 'shipped',
        amount: 274.5,
        currency: 'CNY',
        buyer: { userId: 10086, nickname: '林小夏', vipLevel: '2', avatar: 'https://cdn.example.com/avatar/10086.png' },
        items: [
            { skuId: 'SKU-0377', title: '耳机保护套', price: 25, quantity: 1 },
            { skuId: 'SKU-2041', title: '降噪蓝牙耳机', price: 249.5, quantity: 1 },
            { skuId: 'SKU-1188', title: 'Type-C 快充数据线', price: 109, quantity: 1 },
        ],
        coupon: { code: 'NEW20', discount: 25 },
        tracking: { carrier: '顺丰速运', number: 'SF1428803921' },
        createdAt: '2026-11-20T14:32:10+08:00',
        updatedAt: '2026-11-21T09:12:44+08:00',
    },
};

export const DIFF_SAMPLE = {
    a: JSON.stringify(v1, null, 2),
    b: JSON.stringify(v2, null, 2),
};

/** A patch for DIFF_SAMPLE.a that exercises every op, including test, copy and the "-" index. */
export const APPLY_SAMPLE = `[
  { "op": "test", "path": "/data/status", "value": "paid" },
  { "op": "replace", "path": "/data/status", "value": "shipped" },
  { "op": "replace", "path": "/data/amount", "value": 274.5 },
  {
    "op": "add",
    "path": "/data/items/-",
    "value": { "skuId": "SKU-1188", "title": "Type-C 快充数据线", "price": 109, "quantity": 1 }
  },
  { "op": "move", "from": "/data/remark", "path": "/data/deliveryNote" },
  { "op": "copy", "from": "/data/buyer/userId", "path": "/data/userId" },
  { "op": "replace", "path": "/data/coupon", "value": { "code": "NEW20", "discount": 25 } },
  { "op": "add", "path": "/data/tracking", "value": { "carrier": "顺丰速运", "number": "SF1428803921" } }
]`;
