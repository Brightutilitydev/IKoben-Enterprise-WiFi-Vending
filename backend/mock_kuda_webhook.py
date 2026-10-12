import sys
import httpx
import asyncio
import sqlite3

async def trigger_webhook(reference: str = None):
    if not reference:
        # Find the latest pending transaction from the DB
        conn = sqlite3.connect('ikoben.db')
        cursor = conn.cursor()
        cursor.execute("SELECT kuda_reference FROM transactions WHERE status='PENDING' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            print("No PENDING transactions found in the database. Please click 'Buy Plan' on the website first!")
            return
            
        reference = row[0]
        print(f"Auto-detected latest pending transaction: {reference}")

    payload = {
        "reference": reference,
        "status": "success"
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.post("http://127.0.0.1:8000/api/payments/webhook", json=payload)
        print(f"Response: {res.status_code}")
        print(res.json())

if __name__ == "__main__":
    ref = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(trigger_webhook(ref))
