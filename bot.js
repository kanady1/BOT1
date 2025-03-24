async executeBuy(trade) {
    if (!this.isRunning) return;

    try {
        const response = await fetch('/api/placeOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: config.apiKey,
                apiSecret: config.apiSecret,
                symbol: trade.pair,
                side: 'BUY',
                quantity: trade.amount
            })
        });

        const data = await response.json();

        if (response.ok) {
            this.logTrade(تم تنفيذ أمر الشراء بنجاح: ${data.symbol} - ${data.executedQty} @ ${data.fills?.[0]?.price || 'N/A'});
        } else {
            this.logTrade(فشل في أمر الشراء: ${data.msg || JSON.stringify(data)}, 'error');
        }
    } catch (error) {
        this.logTrade(خطأ في أمر الشراء: ${error.message}, 'error');
    }
}

async executeSell(trade) {
    if (!this.isRunning) return;

    try {
        const response = await fetch('/api/placeOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: config.apiKey,
                apiSecret: config.apiSecret,
                symbol: trade.pair,
                side: 'SELL',
                quantity: trade.amount
            })
        });

        const data = await response.json();

        if (response.ok) {
            this.logTrade(تم تنفيذ أمر البيع بنجاح: ${data.symbol} - ${data.executedQty} @ ${data.fills?.[0]?.price || 'N/A'});
        } else {
            this.logTrade(فشل في أمر البيع: ${data.msg || JSON.stringify(data)}, 'error');
        }
    } catch (error) {
        this.logTrade(خطأ في أمر البيع: ${error.message}, 'error');
    }
}
