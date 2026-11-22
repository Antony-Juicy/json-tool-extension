export interface Sample {
    id: string;
    label: string;
    rootName: string;
    json: string;
}

const orders = {
    code: 0,
    message: 'ok',
    data: {
        page: 1,
        pageSize: 20,
        total: 128,
        hasMore: true,
        list: [
            {
                orderId: 'a3f1c2e4-7b8d-4e2a-9c1f-5d6e7f8a9b0c',
                status: 'paid',
                createdAt: '2026-11-20T14:32:10+08:00',
                amount: 299.5,
                currency: 'CNY',
                buyer: {
                    userId: 10086,
                    nickname: '林小夏',
                    avatar: 'https://cdn.example.com/avatar/10086.png',
                    vipLevel: 2,
                },
                items: [
                    { skuId: 'SKU-2041', title: '降噪蓝牙耳机', price: 249.5, quantity: 1 },
                    { skuId: 'SKU-0377', title: '耳机保护套', price: 25, quantity: 2 },
                ],
                coupon: null,
                remark: '请工作日配送',
            },
            {
                orderId: '5b2e9d71-0c4a-4f3e-8a6b-1d2c3e4f5a6b',
                status: 'shipped',
                createdAt: '2026-11-19T09:05:44+08:00',
                amount: 89,
                currency: 'CNY',
                buyer: {
                    userId: 20417,
                    nickname: '陈一鸣',
                    avatar: 'https://cdn.example.com/avatar/20417.png',
                    vipLevel: 0,
                },
                items: [{ skuId: 'SKU-1188', title: 'Type-C 快充数据线', price: 109, quantity: 1 }],
                coupon: { code: 'NEW20', discount: 20 },
                tracking: { carrier: '顺丰速运', number: 'SF1428803921' },
            },
        ],
    },
};

const profile = {
    id: 'u_83920',
    email: 'ruoxi.zhou@example.com',
    displayName: '周若溪',
    phone: '13912345678',
    birthday: '1996-04-12',
    emailVerified: true,
    roles: ['member', 'beta-tester'],
    settings: {
        theme: 'system',
        language: 'zh-CN',
        pushEnabled: true,
        quietHours: { start: '22:00', end: '07:30' },
    },
    addresses: [
        {
            label: '家',
            city: '上海',
            district: '徐汇区',
            detail: '漕溪北路 88 号 1203 室',
            isDefault: true,
            'postal-code': '200030',
        },
        { label: '公司', city: '上海', district: '浦东新区', detail: '世纪大道 100 号 25 层', isDefault: false },
    ],
    lastLoginAt: '2026-11-21T08:12:03Z',
};

const feed = [
    {
        id: 98231,
        type: 'post',
        author: { id: 3312, name: '王子豪', verified: true },
        text: '新版本的暗色模式终于上线了',
        images: [
            { url: 'https://cdn.example.com/feed/98231-1.jpg', width: 1080, height: 1440 },
            { url: 'https://cdn.example.com/feed/98231-2.jpg', width: 1080, height: 1080 },
        ],
        likeCount: 342,
        commentCount: 27,
        liked: false,
        publishedAt: '2026-11-21T10:20:00+08:00',
    },
    {
        id: 98230,
        type: 'video',
        author: { id: 5120, name: '赵可欣', verified: false },
        text: '30 秒看懂 iOS 26 的新手势',
        video: { url: 'https://cdn.example.com/feed/98230.mp4', duration: 31.5, cover: 'https://cdn.example.com/feed/98230.jpg' },
        likeCount: 1204,
        commentCount: 88,
        liked: true,
        publishedAt: '2026-11-21T09:47:12+08:00',
    },
];

export const SAMPLES: Sample[] = [
    { id: 'orders', label: '订单列表', rootName: 'OrderListResponse', json: JSON.stringify(orders, null, 2) },
    { id: 'profile', label: '用户资料', rootName: 'UserProfile', json: JSON.stringify(profile, null, 2) },
    { id: 'feed', label: '移动端 Feed', rootName: 'FeedResponse', json: JSON.stringify(feed, null, 2) },
];
