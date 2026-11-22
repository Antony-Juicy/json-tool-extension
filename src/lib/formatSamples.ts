export interface FormatSample {
    id: string;
    label: string;
    text: string;
}

const minified =
    '{"code":0,"message":"success","traceId":"7f3a9c1e2b84","data":{"user":{"id":1844674407370955161,"nickname":"林小夏","avatar":"https://cdn.example.com/avatar/10086.png","tags":["vip","early-adopter"]},"device":{"platform":"iOS","osVersion":"18.1","appVersion":"5.12.0","build":51203},"features":{"darkMode":true,"newCheckout":false,"feedVideoAutoplay":true},"banners":[{"id":301,"title":"双 11 返场","image":"https://cdn.example.com/banner/301.jpg","link":"app://promo/301","weight":0.85},{"id":302,"title":"新人专享券","image":"https://cdn.example.com/banner/302.jpg","link":"app://coupon/new","weight":0.6}],"serverTime":"2026-11-21T23:58:12+08:00"}}';

const escaped = String.raw`"{\"event\":\"page_view\",\"page\":\"/order/detail\",\"params\":{\"orderId\":\"a3f1c2e4\",\"from\":\"push\",\"abTest\":[\"checkout_v2\"]},\"ts\":1763740692000}"`;

const broken = `// 从日志里复制的移动端 SDK 配置，格式有好几处问题
{
  name: 'checkout-sdk',
  "version": "2.3.1",
  "platforms": ["ios", "android" "web",],
  "minSdk": 24,
  "debug": True,
  "lastError": None,
  "retry": { "max": 3, "backoffMs": 500, }},
  "owner": 'mobile-team',
  "endpoints": [
    { "env": "prod", "url": "https://api.example.com" },
    { "env": "staging", "url": "https://staging.example.com" }
  /* 这里少了 ] 和 } */
`;

/** Copied from a chat log viewer: line-number gutter, Markdown escapes (\_ \]) and only the tail of the document. */
const fragment = String.raw`324

325

326

327

328

"icon": "https://cdn.example.com/icon/17.png",

"title": "语言类专业报考参考｜Mock资料17",

"url": "https://news.example.com/guancha/202509/t20250908\_2688519.shtml",

"type": "ICON\_PICTURE",

"source\_group": "other"

},

{

"icon": "https://cdn.example.com/icon/18.png",

"title": "语言类专业未来走向何方？｜Mock资料18",

"url": "https://gaokao.example.com/news/202311/t20231122\_2534338.shtml",

"type": "ICON\_PICTURE",

"source\_group": "other"

}

\],

"status": "complete"

},

"source\_seq": "bar\_ref\_source\_inline\_1"

},

{

"type": "bar\_think\_finish",

"content": {

"title": "已完成思考，参考了 36 篇材料"

},

"source\_seq": "bar\_think\_finish\_1"

}

\],

"eventType": "complete"

}

\],

"finalEventType": "complete",

"meta": {

"source": "chatlog",

"scene": "gaokao",

"messageCount": 2

}

}`;

export const FORMAT_SAMPLES: FormatSample[] = [
    { id: 'minified', label: '压缩的接口返回', text: minified },
    { id: 'escaped', label: '日志里转义的 JSON', text: escaped },
    { id: 'broken', label: '格式有问题的 JSON（自动修复）', text: broken },
    { id: 'fragment', label: '从日志复制的片段（带行号、Markdown 转义）', text: fragment },
];
