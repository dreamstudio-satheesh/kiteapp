# ticker_service.py

import os
import time
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

def main():
    logging.info("Ticker service started")
    interval = int(os.getenv("TICKER_HELLO_INTERVAL", 10))
    while True:
        logging.info("Hello, World!")
        time.sleep(interval)

if __name__ == "__main__":
    main()