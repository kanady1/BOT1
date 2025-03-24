import crypto from 'crypto';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { apiKey, apiSecret, symbol, side, quantity } = req.body;

  const timestamp = Date.now();
  const query = symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp};
  const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');

  const url = https://api.binance.com/api/v3/order?${query}&signature=${signature};

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
