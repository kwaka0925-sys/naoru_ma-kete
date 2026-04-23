export interface Prefecture {
  code: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export const PREFECTURES: Prefecture[] = [
  { code: "01", name: "北海道", region: "北海道", lat: 43.0642, lng: 141.3469 },
  { code: "02", name: "青森県", region: "東北", lat: 40.8244, lng: 140.7400 },
  { code: "03", name: "岩手県", region: "東北", lat: 39.7036, lng: 141.1527 },
  { code: "04", name: "宮城県", region: "東北", lat: 38.2688, lng: 140.8721 },
  { code: "05", name: "秋田県", region: "東北", lat: 39.7186, lng: 140.1023 },
  { code: "06", name: "山形県", region: "東北", lat: 38.2404, lng: 140.3633 },
  { code: "07", name: "福島県", region: "東北", lat: 37.7503, lng: 140.4676 },
  { code: "08", name: "茨城県", region: "関東", lat: 36.3418, lng: 140.4468 },
  { code: "09", name: "栃木県", region: "関東", lat: 36.5658, lng: 139.8836 },
  { code: "10", name: "群馬県", region: "関東", lat: 36.3911, lng: 139.0608 },
  { code: "11", name: "埼玉県", region: "関東", lat: 35.8572, lng: 139.6489 },
  { code: "12", name: "千葉県", region: "関東", lat: 35.6047, lng: 140.1233 },
  { code: "13", name: "東京都", region: "関東", lat: 35.6762, lng: 139.6503 },
  { code: "14", name: "神奈川県", region: "関東", lat: 35.4478, lng: 139.6425 },
  { code: "15", name: "新潟県", region: "中部", lat: 37.9161, lng: 139.0364 },
  { code: "16", name: "富山県", region: "中部", lat: 36.6953, lng: 137.2113 },
  { code: "17", name: "石川県", region: "中部", lat: 36.5947, lng: 136.6256 },
  { code: "18", name: "福井県", region: "中部", lat: 36.0652, lng: 136.2216 },
  { code: "19", name: "山梨県", region: "中部", lat: 35.6641, lng: 138.5684 },
  { code: "20", name: "長野県", region: "中部", lat: 36.6513, lng: 138.1810 },
  { code: "21", name: "岐阜県", region: "中部", lat: 35.3912, lng: 136.7223 },
  { code: "22", name: "静岡県", region: "中部", lat: 34.9769, lng: 138.3831 },
  { code: "23", name: "愛知県", region: "中部", lat: 35.1802, lng: 136.9066 },
  { code: "24", name: "三重県", region: "近畿", lat: 34.7303, lng: 136.5086 },
  { code: "25", name: "滋賀県", region: "近畿", lat: 35.0045, lng: 135.8686 },
  { code: "26", name: "京都府", region: "近畿", lat: 35.0214, lng: 135.7556 },
  { code: "27", name: "大阪府", region: "近畿", lat: 34.6937, lng: 135.5023 },
  { code: "28", name: "兵庫県", region: "近畿", lat: 34.6913, lng: 135.1830 },
  { code: "29", name: "奈良県", region: "近畿", lat: 34.6851, lng: 135.8329 },
  { code: "30", name: "和歌山県", region: "近畿", lat: 34.2260, lng: 135.1675 },
  { code: "31", name: "鳥取県", region: "中国", lat: 35.5039, lng: 134.2383 },
  { code: "32", name: "島根県", region: "中国", lat: 35.4723, lng: 133.0505 },
  { code: "33", name: "岡山県", region: "中国", lat: 34.6618, lng: 133.9344 },
  { code: "34", name: "広島県", region: "中国", lat: 34.3963, lng: 132.4596 },
  { code: "35", name: "山口県", region: "中国", lat: 34.1859, lng: 131.4706 },
  { code: "36", name: "徳島県", region: "四国", lat: 34.0659, lng: 134.5594 },
  { code: "37", name: "香川県", region: "四国", lat: 34.3401, lng: 134.0434 },
  { code: "38", name: "愛媛県", region: "四国", lat: 33.8417, lng: 132.7657 },
  { code: "39", name: "高知県", region: "四国", lat: 33.5597, lng: 133.5311 },
  { code: "40", name: "福岡県", region: "九州", lat: 33.6064, lng: 130.4183 },
  { code: "41", name: "佐賀県", region: "九州", lat: 33.2494, lng: 130.2988 },
  { code: "42", name: "長崎県", region: "九州", lat: 32.7503, lng: 129.8777 },
  { code: "43", name: "熊本県", region: "九州", lat: 32.7898, lng: 130.7417 },
  { code: "44", name: "大分県", region: "九州", lat: 33.2382, lng: 131.6126 },
  { code: "45", name: "宮崎県", region: "九州", lat: 31.9111, lng: 131.4239 },
  { code: "46", name: "鹿児島県", region: "九州", lat: 31.5602, lng: 130.5581 },
  { code: "47", name: "沖縄県", region: "沖縄", lat: 26.2124, lng: 127.6809 },
];

export const PREFECTURE_NAMES = PREFECTURES.map((p) => p.name);

export function getPrefecture(name: string): Prefecture | undefined {
  return PREFECTURES.find(
    (p) => p.name === name || p.name.replace(/[都道府県]$/, "") === name.replace(/[都道府県]$/, "")
  );
}

export const REGIONS = [
  "北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州", "沖縄",
] as const;
